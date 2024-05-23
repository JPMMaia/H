module;

#include <llvm/IR/DataLayout.h>
#include <llvm/IR/DebugInfoMetadata.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/DIBuilder.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Type.h>

#include <memory_resource>
#include <span>
#include <string>
#include <unordered_map>
#include <vector>
#include <variant>

export module h.compiler.types;

import h.core;

namespace h::compiler
{
    export bool is_enum_type(Type_reference const& type, llvm::Value* value);

    export struct Builtin_types
    {
        llvm::StructType* string;
    };

    export struct Debug_builtin_types
    {
        llvm::DIType* string;
    };

    using LLVM_type_map = std::pmr::unordered_map<std::pmr::string, llvm::Type*>;
    using LLVM_debug_type_map = std::pmr::unordered_map<std::pmr::string, llvm::DIType*>;
    using Module_name = std::pmr::string;

    export struct Type_database
    {
        Builtin_types builtin;
        std::pmr::unordered_map<Module_name, LLVM_type_map> name_to_llvm_type;
    };

    export struct Debug_type_database
    {
        Debug_builtin_types builtin;
        std::pmr::unordered_map<Module_name, LLVM_debug_type_map> name_to_llvm_debug_type;
    };

    export Type_database create_type_database(
        llvm::LLVMContext& llvm_context
    );

    export Debug_type_database create_debug_type_database(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_scope,
        llvm::DataLayout const& llvm_data_layout
    );

    export void add_module_types(
        Type_database& type_database,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module
    );

    export void add_module_debug_types(
        Debug_type_database& debug_type_database,
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::pmr::vector<llvm::Constant*>> const& enum_value_constants,
        Type_database const& type_database
    );

    export llvm::Type* type_reference_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        Type_reference const& type_reference,
        Type_database const& type_database
    );

    export llvm::Type* type_reference_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        std::span<Type_reference const> type_reference,
        Type_database const& type_database
    );

    export std::pmr::vector<llvm::Type*> type_references_to_llvm_types(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        std::span<Type_reference const> const type_references,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    export llvm::DIType* type_reference_to_llvm_debug_type(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        Type_reference const& type_reference,
        Debug_type_database const& debug_type_database
    );

    export llvm::DIType* type_reference_to_llvm_debug_type(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        std::span<Type_reference const> const type_reference,
        Debug_type_database const& debug_type_database
    );

    export std::pmr::vector<llvm::DIType*> type_references_to_llvm_debug_types(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        std::span<Type_reference const> const type_references,
        Debug_type_database const& debug_type_database,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );
}
