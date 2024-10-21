module;

#include <clang/AST/ASTContext.h>
#include <clang/AST/Decl.h>
#include <clang/AST/DeclBase.h>
#include <clang/AST/Type.h>
#include <clang/Basic/Builtins.h>
#include <clang/Basic/CodeGenOptions.h>
#include <clang/Basic/Diagnostic.h>
#include <clang/Basic/FileManager.h>
#include <clang/Basic/IdentifierTable.h>
#include <clang/Basic/SourceLocation.h>
#include <clang/Basic/SourceManager.h>
#include <clang/CodeGen/CodeGenABITypes.h>
#include <clang/CodeGen/CGFunctionInfo.h>
#include <clang/CodeGen/ModuleBuilder.h>
#include "clang/Frontend/CompilerInstance.h"
#include <clang/Lex/HeaderSearchOptions.h>
#include <clang/Lex/PreprocessorOptions.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/IRBuilder.h>
#include <llvm/Support/VirtualFileSystem.h>

#include <memory>
#include <memory_resource>
#include <string>
#include <string_view>
#include <unordered_map>
#include <variant>
#include <vector>

export module h.compiler.clang_code_generation;

import h.core;
import h.core.declarations;
import h.compiler.clang_data;
import h.compiler.debug_info;
import h.compiler.instructions;
import h.compiler.types;

namespace h::compiler
{
    export llvm::FunctionType* create_llvm_function_type(
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        std::string_view const function_name
    );

    export void set_llvm_function_argument_names(
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        llvm::Function& llvm_function,
        Declaration_database const& declaration_database
    );

    struct Transformed_arguments
    {
        std::pmr::vector<llvm::Value*> values;
        std::pmr::vector<std::pmr::vector<llvm::Attribute>> attributes;
        bool is_return_value_passed_as_first_argument = false;
    };

    Transformed_arguments transform_arguments(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data& clang_module_data,
        llvm::Module& llvm_module,
        h::Module const& core_module,
        h::Function_type const& function_type,
        std::span<llvm::Value* const> const arguments,
        Declaration_database const& declaration_database,
        Type_database const& type_database
    );

    llvm::Value* read_function_return_instruction(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        h::Module const& core_module,
        h::Function_type const& function_type,
        clang::CodeGen::CGFunctionInfo const& function_info,
        Type_database const& type_database,
        llvm::Value* const call_instruction
    );

    llvm::Value* read_from_type(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Value* const source_llvm_value,
        llvm::Type* const source_llvm_type,
        llvm::Type* const destination_llvm_type
    );

    export llvm::Value* generate_function_call(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_type const& function_type,
        llvm::Function& llvm_function,
        std::span<llvm::Value* const> const arguments,
        Declaration_database const& declaration_database,
        Type_database const& type_database
    );

    export std::pmr::vector<Value_and_type> generate_function_arguments(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        llvm::Function& llvm_function,
        llvm::BasicBlock& llvm_block,
        Declaration_database const& declaration_database,
        Type_database const& type_database,
        Debug_info* debug_info
    );

    export llvm::Value* generate_function_return_instruction(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_type const& function_type,
        llvm::Function& llvm_function,
        Declaration_database const& declaration_database,
        Type_database const& type_database,
        Value_and_type const& value_to_return
    );

    export llvm::Type* convert_type(
        Clang_module_data const& clang_module_data,
        std::string_view const module_name,
        std::string_view const declaration_name
    );

    std::optional<clang::QualType> create_type(
        clang::ASTContext& clang_ast_context,
        std::span<h::Type_reference const> const type_reference,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    );

    std::optional<clang::QualType> create_type(
        clang::ASTContext& clang_ast_context,
        h::Type_reference const& type_reference,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    );

    llvm::Value* read_from_different_type(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Value* const source_llvm_value,
        llvm::Type* const source_llvm_type,
        llvm::Type* const destination_llvm_type
    );
}
