module;

#include <llvm/ExecutionEngine/JITSymbol.h>
#include <llvm/ExecutionEngine/SectionMemoryManager.h>
#include <llvm/ExecutionEngine/Orc/Core.h>
#include <llvm/ExecutionEngine/Orc/EPCIndirectionUtils.h>
#include <llvm/ExecutionEngine/Orc/ExecutorProcessControl.h>
#include <llvm/ExecutionEngine/Orc/IndirectionUtils.h>
#include <llvm/ExecutionEngine/Orc/IRCompileLayer.h>
#include <llvm/ExecutionEngine/Orc/LazyReexports.h>
#include <llvm/ExecutionEngine/Orc/LLJIT.h>
#include <llvm/ExecutionEngine/Orc/RTDyldObjectLinkingLayer.h>
#include <llvm/ExecutionEngine/Orc/ThreadSafeModule.h>
#include <llvm/IR/DataLayout.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/ValueSymbolTable.h>
#include <llvm/Support/Error.h>
#include <llvm/TargetParser/Host.h>

#include <future>
#include <memory>
#include <span>
#include <string>
#include <string_view>
#include <thread>

module h.compiler.just_in_time_compiler;

import h.common;
import h.compiler;
import h.compiler.core_module_layer;
import h.compiler.recompile_module_layer;

namespace h::compiler
{
    std::unique_ptr<JIT_data> create_jit_data(
        llvm::DataLayout& llvm_data_layout
    )
    {
        llvm::orc::LLJITBuilder builder;
        builder.setDataLayout(llvm_data_layout);

        llvm::Expected<std::unique_ptr<llvm::orc::LLJIT>> llvm_jit_result = builder.create();

        if (llvm::Error error = llvm_jit_result.takeError())
            h::common::print_message_and_exit(std::format("Error while creating LLJIT: {}", llvm::toString(std::move(error))));

        std::unique_ptr<llvm::orc::LLJIT> llvm_jit = std::move(*llvm_jit_result);

        llvm::Expected<std::unique_ptr<llvm::orc::EPCIndirectionUtils>> epc_indirection_utils = llvm::orc::EPCIndirectionUtils::Create(llvm_jit->getExecutionSession());
        if (!epc_indirection_utils)
            h::common::print_message_and_exit(std::format("Could not create EPC indirection utils: {}", llvm::toString(epc_indirection_utils.takeError())));

        std::unique_ptr<llvm::orc::IndirectStubsManager> indirect_stubs_manager = epc_indirection_utils.get()->createIndirectStubsManager();

        llvm::Expected<std::unique_ptr<llvm::orc::LazyCallThroughManager>> local_lazy_call_through_manager = llvm::orc::createLocalLazyCallThroughManager(
            llvm_jit->getTargetTriple(),
            llvm_jit->getExecutionSession(),
            llvm::orc::ExecutorAddr()
        );
        if (!local_lazy_call_through_manager)
            h::common::print_message_and_exit(std::format("Could not create local lazy call through manager: {}", llvm::toString(local_lazy_call_through_manager.takeError())));

        std::unique_ptr<llvm::orc::MangleAndInterner> mangle = std::make_unique<llvm::orc::MangleAndInterner>(llvm_jit->getExecutionSession(), llvm_jit->getDataLayout());

        std::unique_ptr<Core_module_layer> core_module_layer = std::make_unique<Core_module_layer>(
            llvm_jit->getIRCompileLayer(),
            *mangle
        );

        std::unique_ptr<Recompile_module_layer> recompile_module_layer = std::make_unique<Recompile_module_layer>(
            llvm_jit->getExecutionSession(),
            *core_module_layer,
            *local_lazy_call_through_manager->get(),
            *indirect_stubs_manager,
            *mangle
        );

        std::unique_ptr<JIT_data> jit_data = std::make_unique<JIT_data>(
            JIT_data
            {
                .llvm_jit = std::move(llvm_jit),
                .epc_indirection_utils = std::move(*epc_indirection_utils),
                .indirect_stubs_manager = std::move(indirect_stubs_manager),
                .lazy_call_through_manager = std::move(*local_lazy_call_through_manager),
                .mangle = std::move(mangle),
                .core_module_layer = std::move(core_module_layer),
                .recompile_module_layer = std::move(recompile_module_layer)
            }
        );

        // TODO link libLLVMOrcDebugging.a
        // TODO enable llvm::orc::enableDebuggerSupport(*llvm_jit);

        return jit_data;
    }

    void add_core_module(
        JIT_data& jit_data,
        Core_module_compilation_data const& core_compilation_data
    )
    {
        llvm::orc::JITDylib& library = jit_data.llvm_jit->getMainJITDylib();

        llvm::Error error = jit_data.recompile_module_layer->add(
            library.createResourceTracker(),
            core_compilation_data
        );
        if (error)
            h::common::print_message_and_exit(std::format("Error while linking static library: {}", llvm::toString(std::move(error))));
    }

    void link_static_library(
        JIT_data& jit_data,
        char const* const static_library_path
    )
    {
        llvm::Error error = jit_data.llvm_jit->linkStaticLibraryInto(jit_data.llvm_jit->getMainJITDylib(), static_library_path);
        if (error)
            h::common::print_message_and_exit(std::format("Error while linking static library: {}", llvm::toString(std::move(error))));
    }

    void load_platform_dynamic_library(
        JIT_data& jit_data,
        char const* const dynamic_library_path
    )
    {
        llvm::Expected<llvm::orc::JITDylib&> jit_dynamic_library = jit_data.llvm_jit->loadPlatformDynamicLibrary(dynamic_library_path);
        if (!jit_dynamic_library)
            h::common::print_message_and_exit(std::format("Link error while loading dynamic library: {}", llvm::toString(jit_dynamic_library.takeError())));
    }

    std::future<int> call_as_main_without_arguments(
        JIT_data& jit_data,
        std::string_view const function_name
    )
    {
        llvm::Expected<llvm::orc::ExecutorAddr> function_address = jit_data.llvm_jit->lookup({ function_name.data(), function_name.size() });
        if (!function_address)
            h::common::print_message_and_exit(std::format("Error while looking up function '{}': {}", function_name, llvm::toString(std::move(function_address.takeError()))));

        int(*function_pointer)() = function_address->toPtr<int(*)()>();

        std::future<int> future = std::async(std::launch::async, function_pointer);
        return future;
    }

    void run_jit(
        JIT_data& jit_data,
        LLVM_data& llvm_data,
        std::span<h::Module> const core_modules,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        std::span<std::pmr::string const> const dynamic_libraries,
        std::span<std::pmr::string const> const static_libraries,
        std::string_view const entry_point
    )
    {
        // Print internal LLVM messages:
        //llvm::DebugFlag = true;

        for (std::size_t index = 0; index < core_modules.size(); ++index)
        {
            if (index == 1)
                continue;

            add_core_module(jit_data, { llvm_data, std::move(core_modules[index]), module_name_to_file_path_map });
        }

        for (std::pmr::string const& dynamic_library : dynamic_libraries)
        {
            load_platform_dynamic_library(jit_data, dynamic_library.c_str());
        }

        for (std::pmr::string const& static_library : static_libraries)
        {
            link_static_library(jit_data, static_library.c_str());
        }

        std::future<int> result = call_as_main_without_arguments(jit_data, entry_point);

        {
            using namespace std::chrono_literals;
            std::this_thread::sleep_for(5s);
        }

        add_core_module(jit_data, { llvm_data, std::move(core_modules[1]), module_name_to_file_path_map });

        {
            using namespace std::chrono_literals;
            std::this_thread::sleep_for(500s);
        }
    }
}
