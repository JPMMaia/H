module;

#include <llvm/ExecutionEngine/Orc/Core.h>
#include <llvm/ExecutionEngine/Orc/Layer.h>

#include <filesystem>
#include <memory>
#include <memory_resource>
#include <string>
#include <unordered_map>

module h.compiler.core_module_layer;

import h.core;
import h.common;
import h.compiler;
import h.compiler.common;

namespace h::compiler
{
    static llvm::orc::MaterializationUnit::Interface get_interface(
        h::Module const& core_module,
        llvm::orc::MangleAndInterner& mangle
    )
    {
        llvm::orc::SymbolFlagsMap symbols;

        for (h::Function_definition const& function_definition : core_module.definitions.function_definitions)
        {
            if (function_definition.name.ends_with("$body"))
            {
                std::string const mangled_name = mangle_name(core_module, function_definition.name, std::nullopt);

                symbols.insert(
                    { mangle(mangled_name.c_str()), llvm::JITSymbolFlags::Exported | llvm::JITSymbolFlags::Callable }
                );
            }
        }

        return llvm::orc::MaterializationUnit::Interface{ std::move(symbols), nullptr };
    }

    Core_module_materialization_unit::Core_module_materialization_unit(
        Core_module_compilation_data core_module_compilation_data,
        llvm::orc::MangleAndInterner& mangle,
        llvm::orc::IRLayer& base_layer
    ) :
        llvm::orc::MaterializationUnit(get_interface(core_module_compilation_data.core_module, mangle)),
        m_core_module_compilation_data{ std::move(core_module_compilation_data) },
        m_mangle{ mangle },
        m_base_layer{ base_layer }
    {
    }

    void Core_module_materialization_unit::materialize(
        std::unique_ptr<llvm::orc::MaterializationResponsibility> materialization_responsibility
    )
    {
        llvm::orc::MangleAndInterner& mangle = m_mangle;

        llvm::orc::SymbolNameSet const requested_symbols = materialization_responsibility->getRequestedSymbols();

        auto const is_requested_symbol = [&](h::Function_definition const& definition) -> bool
        {
            std::string const mangled_name = mangle_name(m_core_module_compilation_data.core_module, definition.name, std::nullopt);
            return requested_symbols.contains(mangle(mangled_name.c_str()));
        };

        std::pmr::vector<std::string_view> functions_to_compile;

        for (h::Function_definition const& definition : m_core_module_compilation_data.core_module.definitions.function_definitions)
        {
            if (is_requested_symbol(definition))
                functions_to_compile.push_back(definition.name);
        }

        std::unique_ptr<llvm::Module> llvm_module = h::compiler::create_llvm_module(
            m_core_module_compilation_data.llvm_data,
            m_core_module_compilation_data.core_module,
            m_core_module_compilation_data.core_module_dependencies,
            functions_to_compile
        );

        {
            std::pmr::vector<h::Function_definition>& function_definitions = m_core_module_compilation_data.core_module.definitions.function_definitions;
            function_definitions.erase(
                std::remove_if(function_definitions.begin(), function_definitions.end(), is_requested_symbol),
                function_definitions.end()
            );

            if (!function_definitions.empty())
            {
                std::unique_ptr<Core_module_materialization_unit> new_materialization_unit = std::make_unique<Core_module_materialization_unit>(
                    std::move(m_core_module_compilation_data),
                    m_mangle,
                    m_base_layer
                );

                llvm::Error error = materialization_responsibility->replace(std::move(new_materialization_unit));
                if (error)
                    h::common::print_message_and_exit(std::format("Error while creating a new materialization unit to replace unrequested symbols to target library: {}", llvm::toString(std::move(error))));
            }
        }

        llvm::orc::ThreadSafeContext thread_safe_context{ std::make_unique<llvm::LLVMContext>() };
        llvm::orc::ThreadSafeModule thread_safe_module{ std::move(llvm_module), std::move(thread_safe_context) };
        m_base_layer.emit(std::move(materialization_responsibility), std::move(thread_safe_module));
    }

    void Core_module_materialization_unit::discard(const llvm::orc::JITDylib& library, const llvm::orc::SymbolStringPtr& symbol_name)
    {
        // TODO
    }


    Core_module_layer::Core_module_layer(
        llvm::orc::IRLayer& base_layer,
        llvm::orc::MangleAndInterner& mangle
    ) :
        m_base_layer{ base_layer },
        m_mangle{ mangle }
    {
    }

    llvm::Error Core_module_layer::add(
        llvm::orc::ResourceTrackerSP resource_tracker,
        Core_module_compilation_data core_module_compilation_data
    )
    {
        llvm::orc::JITDylib& library = resource_tracker->getJITDylib();

        std::unique_ptr<Core_module_materialization_unit> materialization_unit = std::make_unique<Core_module_materialization_unit>(
            std::move(core_module_compilation_data),
            m_mangle,
            m_base_layer
        );

        return library.define(std::move(materialization_unit), resource_tracker);
    }

    void Core_module_layer::emit(
        std::unique_ptr<llvm::orc::MaterializationResponsibility> materialization_responsibility,
        Core_module_compilation_data core_module_compilation_data
    )
    {
        std::unique_ptr<Core_module_materialization_unit> materialization_unit = std::make_unique<Core_module_materialization_unit>(
            std::move(core_module_compilation_data),
            m_mangle,
            m_base_layer
        );

        materialization_unit->materialize(std::move(materialization_responsibility));
    }
}
