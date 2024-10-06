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
import h.compiler.debug_info;
import h.compiler.instructions;
import h.compiler.types;

namespace h::compiler
{
    export struct Clang_data
    {
        std::unique_ptr<clang::CompilerInstance> compiler_instance;
    };

    export Clang_data create_clang_data(
        llvm::LLVMContext& llvm_context,
        llvm::Triple const& llvm_triple,
        unsigned int const optimization_level
    );

    struct Clang_module_declarations
    {
        std::pmr::unordered_map<std::pmr::string, clang::FunctionDecl*> function_declarations;
        std::pmr::unordered_map<std::pmr::string, clang::EnumDecl*> enum_declarations;
        std::pmr::unordered_map<std::pmr::string, clang::RecordDecl*> struct_declarations;
    };

    struct Clang_declaration_database
    {
        std::pmr::unordered_map<std::pmr::string, Clang_module_declarations> map;
    };

    export struct Clang_module_data
    {
        clang::ASTContext& ast_context;
        std::unique_ptr<clang::CodeGenerator> code_generator;
        Clang_declaration_database declaration_database;
    };

    export Clang_module_data create_clang_module_data(
        llvm::LLVMContext& llvm_context,
        Clang_data const& clang_data,
        h::Module const& core_module,
        std::span<h::Module const* const> const sorted_core_module_dependencies,
        Declaration_database const& declaration_database
    );

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

    std::pmr::vector<llvm::Value*> transform_arguments(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data& clang_module_data,
        h::Module const& core_module,
        h::Function_type const& function_type,
        std::span<llvm::Value* const> const arguments,
        Declaration_database const& declaration_database,
        Type_database const& type_database
    );

    export llvm::Value* generate_function_call(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
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

    clang::QualType create_type(
        clang::ASTContext& clang_ast_context,
        std::span<h::Type_reference const> const type_reference,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    );

    clang::QualType create_type(
        clang::ASTContext& clang_ast_context,
        h::Type_reference const& type_reference,
        Declaration_database const& declaration_database,
        Clang_declaration_database const& clang_declaration_database
    );
}
