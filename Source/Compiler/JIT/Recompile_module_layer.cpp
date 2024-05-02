module;

#include <llvm/ExecutionEngine/Orc/Core.h>
#include <llvm/ExecutionEngine/Orc/LazyReexports.h>
#include <llvm/ExecutionEngine/Orc/Mangling.h>

#include <filesystem>
#include <memory>
#include <memory_resource>
#include <string>
#include <unordered_map>

module h.compiler.recompile_module_layer;

import h.common;
import h.core;
import h.compiler;

namespace h::compiler
{
    static bool symbol_exists(
        llvm::orc::IndirectStubsManager& indirect_stubs_manager,
        llvm::orc::SymbolStringPtr const symbol
    )
    {
        llvm::orc::ExecutorSymbolDef found_address = indirect_stubs_manager.findStub(*symbol, true);
        return found_address != llvm::orc::ExecutorSymbolDef();
    }

    struct Recompile_data
    {
        llvm::orc::SymbolAliasMap new_aliases;
        llvm::orc::SymbolAliasMap replace_aliases;
    };

    static Recompile_data modify_function_names_and_create_recompile_data(
        h::Module& core_module,
        llvm::orc::IndirectStubsManager& indirect_stubs_manager,
        llvm::orc::MangleAndInterner& mangle
    )
    {
        static int id = 0;

        Recompile_data recompile_data;

        auto const process_function_declaration = [&](h::Function_declaration& declaration)
        {
            std::pmr::string stub_name = declaration.name;

            std::string new_name = std::format("{}_body_{}", stub_name, id);
            declaration.name = new_name;

            llvm::orc::SymbolStringPtr const stub_symbol = mangle(stub_name.c_str());
            bool const stub_exists = symbol_exists(indirect_stubs_manager, stub_symbol);

            if (stub_exists)
            {
                recompile_data.replace_aliases.insert(
                    { stub_symbol, {mangle(new_name), llvm::JITSymbolFlags::Weak | llvm::JITSymbolFlags::Exported | llvm::JITSymbolFlags::Callable} }
                );
            }
            else
            {
                recompile_data.new_aliases.insert(
                    { stub_symbol, {mangle(new_name), llvm::JITSymbolFlags::Weak | llvm::JITSymbolFlags::Exported | llvm::JITSymbolFlags::Callable} }
                );
            }
        };

        for (h::Function_declaration& declaration : core_module.export_declarations.function_declarations)
        {
            process_function_declaration(declaration);
        }

        for (h::Function_declaration& declaration : core_module.internal_declarations.function_declarations)
        {
            process_function_declaration(declaration);
        }

        for (h::Function_definition& definition : core_module.definitions.function_definitions)
        {
            std::string new_name = std::format("{}_body_{}", definition.name, id);
            definition.name = new_name;
        }

        id += 1;

        return recompile_data;
    }

    static llvm::Error recompile_module(
        std::unique_ptr<llvm::orc::MaterializationResponsibility> materialization_responsibility,
        Core_module_compilation_data core_module_compilation_data,
        llvm::orc::LazyCallThroughManager& lazy_call_through_manager,
        llvm::orc::IndirectStubsManager& indirect_stubs_manager,
        llvm::orc::JITDylib& source_library,
        llvm::orc::MangleAndInterner& mangle,
        h::compiler::Core_module_layer& next_layer
    )
    {
        Recompile_data recompile_data = modify_function_names_and_create_recompile_data(
            core_module_compilation_data.core_module,
            indirect_stubs_manager,
            mangle
        );

        // Add module to the next layer for compilation:
        {
            llvm::Error error = next_layer.add(source_library.createResourceTracker(), std::move(core_module_compilation_data));
            if (error)
                return error;
        }

        // Lazy reexport functions so that they are compiled when the symbol is looked up:
        if (!recompile_data.new_aliases.empty())
        {
            std::unique_ptr<llvm::orc::LazyReexportsMaterializationUnit> lazy_reexports = llvm::orc::lazyReexports(
                lazy_call_through_manager,
                indirect_stubs_manager,
                source_library,
                recompile_data.new_aliases
            );

            llvm::orc::SymbolNameSet symbols_to_delegate;
            for (auto const& pair : recompile_data.new_aliases)
            {
                symbols_to_delegate.insert(pair.first);
            }

            if (materialization_responsibility != nullptr)
            {
                llvm::Expected<std::unique_ptr<llvm::orc::MaterializationResponsibility>> lazy_reexports_materialization_responsibility =
                    materialization_responsibility->delegate(symbols_to_delegate);
                if (!lazy_reexports_materialization_responsibility)
                    return lazy_reexports_materialization_responsibility.takeError();

                static_cast<llvm::orc::MaterializationUnit*>(lazy_reexports.get())->materialize(std::move(*lazy_reexports_materialization_responsibility));
            }
            else
            {
                llvm::Error error = source_library.define(std::move(lazy_reexports));
                if (error)
                    return error;
            }
        }

        // Update existing stubs to use the new compiled functions:
        {
            llvm::orc::ExecutionSession& execution_session = source_library.getExecutionSession();

            for (auto& symbol_alias_pair : recompile_data.replace_aliases)
            {
                llvm::orc::SymbolStringPtr const& stub_symbol = symbol_alias_pair.first;
                llvm::orc::SymbolStringPtr const& aliasee_symbol = symbol_alias_pair.second.Aliasee;

                llvm::Expected<llvm::orc::ExecutorSymbolDef> function_address = execution_session.lookup(
                    llvm::orc::makeJITDylibSearchOrder({ &source_library }),
                    aliasee_symbol,
                    llvm::orc::SymbolState::Resolved
                );

                if (!function_address)
                    return function_address.takeError();

                if (llvm::Error error = indirect_stubs_manager.updatePointer(*stub_symbol, function_address->getAddress()))
                    return error;
            }
        }

        return llvm::Error::success();
    }


    Recompile_module_layer::Recompile_module_layer(
        llvm::orc::ExecutionSession& execution_session,
        h::compiler::Core_module_layer& base_layer,
        llvm::orc::LazyCallThroughManager& lazy_call_through_manager,
        llvm::orc::IndirectStubsManager& indirect_stubs_manager,
        llvm::orc::MangleAndInterner& mangle
    ) :
        m_base_layer{ base_layer },
        m_lazy_call_through_manager{ lazy_call_through_manager },
        m_indirect_stubs_manager{ indirect_stubs_manager },
        m_mangle{ mangle }
    {
    }

    llvm::Error Recompile_module_layer::add(
        llvm::orc::ResourceTrackerSP resource_tracker,
        Core_module_compilation_data core_module_compilation_data
    )
    {
        llvm::orc::JITDylib& library = resource_tracker->getJITDylib();

        return recompile_module(
            nullptr,
            std::move(core_module_compilation_data),
            m_lazy_call_through_manager,
            m_indirect_stubs_manager,
            library,
            m_mangle,
            m_base_layer
        );
    }

    void Recompile_module_layer::emit(
        std::unique_ptr<llvm::orc::MaterializationResponsibility> materialization_responsibility,
        Core_module_compilation_data core_module_compilation_data
    )
    {
        llvm::orc::JITDylib& library = materialization_responsibility->getTargetJITDylib();

        llvm::Error error = recompile_module(
            std::move(materialization_responsibility),
            std::move(core_module_compilation_data),
            m_lazy_call_through_manager,
            m_indirect_stubs_manager,
            library,
            m_mangle,
            m_base_layer
        );
        if (error)
            h::common::print_message_and_exit(std::format("Failed to recompile module: {}", llvm::toString(std::move(error))));
    }
}
