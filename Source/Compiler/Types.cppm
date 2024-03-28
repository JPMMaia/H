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

export module h.compiler.types;

import h.core;

namespace h::compiler
{
    export Type_reference create_bool_type_reference();
    export bool is_bool(Type_reference const& type);

    export Type_reference create_function_type_type_reference(Function_type const& function_type);
    export std::optional<Type_reference> get_function_output_type_reference(Type_reference const& type);

    export Type_reference create_fundamental_type_type_reference(Fundamental_type const value);
    export bool is_c_string(Type_reference const& type_reference);
    export bool is_floating_point(Type_reference const& type);

    export bool is_integer(Type_reference const& type);
    export bool is_signed_integer(Type_reference const& type);
    export bool is_unsigned_integer(Type_reference const& type);

    export Type_reference create_pointer_type_type_reference(std::pmr::vector<Type_reference> element_type, bool const is_mutable);
    export std::optional<Type_reference> remove_pointer(Type_reference const& type);
    export bool is_pointer(Type_reference const& type);
    export bool is_non_void_pointer(Type_reference const& type);

    export struct Builtin_types
    {
        llvm::StructType* string;
    };

    export struct Type_database
    {
        Builtin_types builtin;
        std::pmr::unordered_map<std::pmr::string, llvm::Type*> name_to_llvm_type;
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
        Type_reference const& type_reference,
        Type_database const& type_database
    );

    export llvm::Type* type_reference_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::span<Type_reference const> type_reference,
        Type_database const& type_database
    );

    export std::pmr::vector<llvm::Type*> type_references_to_llvm_types(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::span<Type_reference const> const type_references,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );
}
