module;

#include <llvm/ExecutionEngine/Orc/CompileOnDemandLayer.h>
#include <llvm/ExecutionEngine/Orc/EPCIndirectionUtils.h>
#include <llvm/ExecutionEngine/Orc/IndirectionUtils.h>
#include <llvm/ExecutionEngine/Orc/LazyReexports.h>
#include <llvm/ExecutionEngine/Orc/LLJIT.h>
#include <llvm/ExecutionEngine/Orc/Shared/ExecutorSymbolDef.h>
#include <llvm/IR/DataLayout.h>
#include <llvm/IR/Module.h>

#include <memory>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

export module h.compiler.jit_compiler;

import h.core;
import h.compiler;
import h.compiler.core_module_layer;
import h.compiler.recompile_module_layer;

namespace h::compiler
{
    export struct JIT_data
    {
        ~JIT_data();

        std::unique_ptr<llvm::orc::LLJIT> llvm_jit;
        std::unique_ptr<llvm::orc::EPCIndirectionUtils> epc_indirection_utils;
        std::unique_ptr<llvm::orc::IndirectStubsManager> indirect_stubs_manager;
        std::unique_ptr<llvm::orc::LazyCallThroughManager> lazy_call_through_manager;
        std::unique_ptr<llvm::orc::MangleAndInterner> mangle;
        std::unique_ptr<llvm::orc::CompileOnDemandLayer> compile_on_demand_layer;
        std::unique_ptr<Core_module_layer> core_module_layer;
        std::unique_ptr<Recompile_module_layer> recompile_module_layer;
        std::pmr::vector<std::filesystem::path> search_library_paths;
    };

    export std::unique_ptr<JIT_data> create_jit_data(
        llvm::DataLayout& llvm_data_layout,
        std::pmr::vector<std::filesystem::path> search_library_paths,
        bool const debug
    );

    export bool add_core_module(
        JIT_data& jit_data,
        llvm::orc::JITDylib& library,
        Core_module_compilation_data core_compilation_data
    );

    export bool add_core_module(
        JIT_data& jit_data,
        Core_module_compilation_data core_compilation_data
    );

    export template <typename GeneratorT>
        GeneratorT& add_generator(
            JIT_data& jit_data,
            std::unique_ptr<GeneratorT> definitions_generator
        )
    {
        llvm::orc::JITDylib& library = jit_data.llvm_jit->getMainJITDylib();
        return library.addGenerator(std::move(definitions_generator));
    }

    export llvm::orc::JITDylib& get_main_library(
        JIT_data& jit_data
    );

    export void link_static_library(
        JIT_data& jit_data,
        char const* static_library_path
    );

    export void load_platform_dynamic_library(
        JIT_data& jit_data,
        char const* dynamic_library_path
    );

    std::optional<llvm::orc::ExecutorSymbolDef> get_function(
        JIT_data& jit_data,
        std::string_view const mangled_function_name
    );

    export
        template <typename Function_type>
    Function_type get_function(
        JIT_data& jit_data,
        std::string_view const mangled_function_name
    )
    {
        std::optional<llvm::orc::ExecutorSymbolDef> function_address = get_function(jit_data, mangled_function_name);
        if (!function_address)
            return nullptr;

        return function_address->getAddress().toPtr<Function_type>();
    }

    export std::future<int> call_as_main_without_arguments(
        JIT_data& jit_data,
        std::string_view function_name
    );

    export void run_jit(
        JIT_data& jit_data,
        LLVM_data& llvm_data,
        std::span<h::Module> core_modules,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        std::span<std::pmr::string const> const dynamic_libraries,
        std::span<std::pmr::string const> const static_libraries,
        std::string_view const entry_point
    );
}
