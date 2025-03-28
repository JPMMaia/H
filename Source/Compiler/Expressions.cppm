module;

#include <llvm/IR/BasicBlock.h>
#include <llvm/IR/DataLayout.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/IRBuilder.h>
#include <llvm/IR/LLVMContext.h>

#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <unordered_map>
#include <vector>

export module h.compiler.expressions;

import h.core;
import h.core.declarations;
import h.compiler.clang_data;
import h.compiler.debug_info;
import h.compiler.instructions;
import h.compiler.types;

namespace h::compiler
{
    export enum class Block_type
    {
        None,
        For_loop,
        If,
        Switch,
        While_loop
    };

    export struct Block_info
    {
        Block_type block_type = {};
        llvm::BasicBlock* repeat_block = nullptr;
        llvm::BasicBlock* after_block = nullptr;
    };

    using Enum_constants = std::pmr::vector<llvm::Constant*>;

    export struct Enum_value_constants
    {
        std::pmr::unordered_map<std::pmr::string, Enum_constants> map;
    };

    export enum class Contract_options
    {
        Disabled,
        Log_error_and_abort,
    };

    export struct Expression_parameters
    {
        llvm::LLVMContext& llvm_context;
        llvm::DataLayout const& llvm_data_layout;
        llvm::IRBuilder<>& llvm_builder;
        llvm::Function* const llvm_parent_function;
        llvm::Module& llvm_module;
        Clang_module_data& clang_module_data;
        Module const& core_module;
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies;
        Declaration_database& declaration_database;
        Type_database& type_database;
        Enum_value_constants const& enum_value_constants;
        std::span<Block_info const> blocks;
        std::span<std::pmr::vector<Statement>> defer_expressions_per_block;
        std::optional<Function_declaration const*> function_declaration;
        std::span<Value_and_type const> function_arguments;
        std::span<Value_and_type const> local_variables;
        std::optional<Type_reference> expression_type;
        Debug_info* debug_info;
        Contract_options contract_options; 
        std::optional<Source_position> source_position;
        std::pmr::polymorphic_allocator<> const& temporaries_allocator;
    };

    export llvm::Constant* fold_constant(
        llvm::Value* value,
        llvm::DataLayout const& llvm_data_layout
    );

    export llvm::Constant* fold_statement_constant(
        Statement const& statement,
        Expression_parameters const& parameters
    );


    export Value_and_type create_expression_value(
        std::size_t expression_index,
        Statement const& statement,
        Expression_parameters const& parameters
    );

    export Value_and_type create_loaded_expression_value(
        std::size_t expression_index,
        Statement const& statement,
        Expression_parameters const& parameters
    );

    export Value_and_type create_statement_value(
        Statement const& statement,
        Expression_parameters const& parameters
    );

    export Value_and_type create_loaded_statement_value(
        Statement const& statement,
        Expression_parameters const& parameters
    );

    export void create_statement_values(
        std::span<Statement const> statements,
        Expression_parameters const& parameters,
        bool const execute_defer_expressions_at_end
    );

    export void create_defer_instructions_at_end_of_block(
        Expression_parameters const& parameters
    );

    export void create_defer_instructions_pop_blocks(
        Expression_parameters const& parameters,
        std::size_t const blocks_to_pop_count
    );

    export void create_defer_instructions_at_return(
        Expression_parameters const& parameters
    );

    export void create_function_preconditions(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        llvm::Function& llvm_function,
        llvm::IRBuilder<>& llvm_builder,
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        Expression_parameters const& expression_parameters
    );

    export void create_function_postconditions(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        llvm::Function& llvm_function,
        llvm::IRBuilder<>& llvm_builder,
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        Expression_parameters const& expression_parameters
    );
}
