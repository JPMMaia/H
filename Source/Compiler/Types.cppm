module;

#include <llvm/IR/DataLayout.h>
#include <llvm/IR/DerivedTypes.h>
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

    using LLVM_type_map = std::pmr::unordered_map<std::pmr::string, llvm::Type*>;
    using Module_name = std::pmr::string;

    export struct Type_database
    {
        Builtin_types builtin;
        std::pmr::unordered_map<Module_name, LLVM_type_map> name_to_llvm_type;
    };

    export Type_database create_type_database(
        llvm::LLVMContext& llvm_context
    );

    export void add_module_types(
        Type_database& type_database,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module
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
}
