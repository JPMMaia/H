module;

#include <llvm/ExecutionEngine/Orc/Core.h>
#include <llvm/ExecutionEngine/Orc/Layer.h>
#include <llvm/ExecutionEngine/Orc/Mangling.h>

#include <filesystem>
#include <memory>
#include <memory_resource>
#include <string>
#include <unordered_map>

module h.compiler.core_module_layer;

import h.core;
import h.compiler;

namespace h::compiler
{
    static llvm::orc::MaterializationUnit::Interface get_interface(
        h::Module const& core_module,
        llvm::orc::MangleAndInterner& mangle
    )
    {
        llvm::orc::SymbolFlagsMap symbols;

        for (h::Function_declaration const& function_declaration : core_module.export_declarations.function_declarations)
        {
            symbols.insert(
                { mangle(function_declaration.name.c_str()), llvm::JITSymbolFlags::Exported | llvm::JITSymbolFlags::Callable }
            );
        }

        for (h::Function_declaration const& function_declaration : core_module.internal_declarations.function_declarations)
        {
            symbols.insert(
                { mangle(function_declaration.name.c_str()), llvm::JITSymbolFlags::Exported | llvm::JITSymbolFlags::Callable }
            );
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
        m_base_layer{ base_layer }
    {
    }

    void Core_module_materialization_unit::materialize(
        std::unique_ptr<llvm::orc::MaterializationResponsibility> materialization_responsibility
    )
    {
        h::compiler::LLVM_module_data llvm_module_data = h::compiler::create_llvm_module(
            m_core_module_compilation_data.llvm_data,
            m_core_module_compilation_data.core_module,
            m_core_module_compilation_data.module_name_to_file_path_map
        );

        llvm::orc::ThreadSafeContext thread_safe_context{ std::make_unique<llvm::LLVMContext>() };
        llvm::orc::ThreadSafeModule thread_safe_module{ std::move(llvm_module_data.module), std::move(thread_safe_context) };
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
