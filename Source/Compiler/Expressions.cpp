module;

#include <llvm/IR/BasicBlock.h>
#include <llvm/IR/DataLayout.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/IRBuilder.h>
#include <llvm/IR/LLVMContext.h>

#include <functional>
#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

module h.compiler.expressions;

import h.core;
import h.compiler.common;
import h.compiler.types;

namespace h::compiler
{
    std::optional<Module const*> get_module(std::span<Module const> const core_modules, std::string_view const name)
    {
        auto const location = std::find_if(core_modules.begin(), core_modules.end(), [name](Module const& module) { return module.name == name; });
        if (location == core_modules.end())
            return std::nullopt;

        return &(*location);
    }

    std::optional<std::string_view> get_module_name_from_alias(Module const& module, std::string_view const alias_name)
    {
        auto const location = std::find_if(module.dependencies.alias_imports.begin(), module.dependencies.alias_imports.end(), [alias_name](Import_module_with_alias const& import) { return import.alias == alias_name; });
        if (location == module.dependencies.alias_imports.end())
            return std::nullopt;

        return location->module_name;
    }

    bool ends_with_terminator_statement(std::span<Statement const> const statements)
    {
        if (statements.empty())
            return false;

        Statement const& last_statement = statements.back();

        if (last_statement.expressions.empty())
            return false;

        Expression const& first_expression = last_statement.expressions[0];
        return std::holds_alternative<Break_expression>(first_expression.data) || std::holds_alternative<Continue_expression>(first_expression.data) || std::holds_alternative<Return_expression>(first_expression.data);
    }

    std::pmr::vector<Statement> skip_block(Statement const& statement)
    {
        if (statement.expressions.empty())
            return {};

        Expression const& first_expression = statement.expressions[0];
        if (std::holds_alternative<Block_expression>(first_expression.data))
        {
            Block_expression const& block_expression = std::get<Block_expression>(first_expression.data);
            return block_expression.statements;
        }

        return { {statement} };
    }

    std::optional<Value_and_type> search_in_function_scope(
        std::string_view const variable_name,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables
    )
    {
        auto const is_variable = [variable_name](Value_and_type const& element) -> bool
        {
            return element.name == variable_name;
        };

        // Search in local variables:
        {
            auto const location = std::find_if(local_variables.rbegin(), local_variables.rend(), is_variable);
            if (location != local_variables.rend())
                return *location;
        }

        // Search in function arguments:
        {
            auto const location = std::find_if(function_arguments.begin(), function_arguments.end(), is_variable);
            if (location != function_arguments.end())
                return *location;
        }

        return {};
    }

    Value_and_type create_access_expression_value(
        Access_expression const& expression,
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        Statement const& statement,
        llvm::Module& llvm_module,
        std::span<Value_and_type const> const temporaries
    )
    {
        Value_and_type const& left_hand_side = temporaries[expression.expression.expression_index];

        // Check if left hand side corresponds to a module name:
        if (left_hand_side.value == nullptr)
        {
            Expression const& left_hand_side_expression = statement.expressions[expression.expression.expression_index];

            if (std::holds_alternative<Variable_expression>(left_hand_side_expression.data))
            {
                Variable_expression const& variable_expression = std::get<Variable_expression>(left_hand_side_expression.data);
                std::string_view const module_alias_name = variable_expression.name;

                std::optional<std::string_view> const external_module_name = get_module_name_from_alias(core_module, module_alias_name);
                if (!external_module_name.has_value())
                    throw std::runtime_error{ std::format("Undefined variable '{}'", module_alias_name) };

                Module const& external_module = *get_module(core_module_dependencies, external_module_name.value()).value();
                std::string const mangled_name = mangle_name(external_module, expression.member_name);

                // TODO try to find alias/enum/struct:
                llvm::Function* const llvm_function = llvm_module.getFunction(mangled_name);
                if (!llvm_function)
                    throw std::runtime_error{ std::format("Unknown function '{}.{}' referenced. Mangled name is '{}'.", external_module_name.value(), expression.member_name, mangled_name) };

                std::optional<Function_declaration const*> function_declaration = find_function_declaration(external_module, expression.member_name.c_str());
                Type_reference function_type = create_function_type_type_reference(function_declaration.value()->type);

                return Value_and_type
                {
                    .name = std::pmr::string{ mangled_name.begin(), mangled_name.end()},
                    .value = llvm_function,
                    .type = std::move(function_type)
                };
            }
        }

        // TODO enum / struct access
        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_binary_operation_instruction(
        llvm::IRBuilder<>& llvm_builder,
        Value_and_type const& left_hand_side,
        Value_and_type const& right_hand_side,
        Binary_operation operation
    );

    Value_and_type create_assignment_operation_instruction(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        Value_and_type const& left_hand_side,
        Value_and_type const& right_hand_side,
        std::optional<Binary_operation> const additional_operation,
        Type_database const& type_database
    )
    {
        if (additional_operation.has_value())
        {
            Binary_operation const operation = additional_operation.value();

            Type_reference const left_hand_side_type = left_hand_side.type.value();
            llvm::Type* llvm_element_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, left_hand_side_type, type_database);
            llvm::Value* const loaded_value_value = llvm_builder.CreateLoad(llvm_element_type, left_hand_side.value);

            Value_and_type const loaded_value
            {
                .name = "",
                .value = loaded_value_value,
                .type = left_hand_side_type
            };

            Value_and_type const result = create_binary_operation_instruction(llvm_builder, loaded_value, right_hand_side, operation);

            llvm::Value* store_instruction = llvm_builder.CreateStore(result.value, left_hand_side.value);

            return
            {
                .name = "",
                .value = store_instruction,
                .type = std::nullopt
            };
        }
        else
        {
            llvm::Value* store_instruction = llvm_builder.CreateStore(right_hand_side.value, left_hand_side.value);

            return
            {
                .name = "",
                .value = store_instruction,
                .type = std::nullopt
            };
        }
    }

    Value_and_type create_assignment_expression_value(
        Assignment_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database
    )
    {
        Value_and_type const left_hand_side = temporaries[expression.left_hand_side.expression_index];
        Value_and_type const right_hand_side = temporaries[expression.right_hand_side.expression_index];

        return create_assignment_operation_instruction(llvm_context, llvm_data_layout, llvm_builder, left_hand_side, right_hand_side, expression.additional_operation, type_database);
    }

    Value_and_type create_binary_operation_instruction(
        llvm::IRBuilder<>& llvm_builder,
        Value_and_type const& left_hand_side,
        Value_and_type const& right_hand_side,
        Binary_operation const operation
    )
    {
        if (!left_hand_side.type.has_value() || !right_hand_side.type.has_value())
            throw std::runtime_error{ "Left or right side type is null!" };

        if (left_hand_side.type.value() != right_hand_side.type.value())
            throw std::runtime_error{ "Left and right side types do not match!" };

        Type_reference const& type = left_hand_side.type.value();

        switch (operation)
        {
        case Binary_operation::Add: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateAdd(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFAdd(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Subtract: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateSub(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFSub(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Multiply: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateMul(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFMul(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Divide: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateSDiv(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateUDiv(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFDiv(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Modulus: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateSRem(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateURem(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFRem(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Equal: {
            if (is_bool(type) || is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateICmpEQ(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOEQ(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Binary_operation::Not_equal: {
            if (is_bool(type) || is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateICmpNE(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpONE(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Binary_operation::Less_than: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpSLT(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpULT(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOLT(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Binary_operation::Less_than_or_equal_to: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpSLE(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpULE(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOLE(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Binary_operation::Greater_than: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpSGT(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpUGT(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOGT(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Binary_operation::Greater_than_or_equal_to: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpSGE(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpUGE(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOGE(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Binary_operation::Logical_and: {
            return Value_and_type
            {
                .name = "",
                .value = llvm_builder.CreateAnd(left_hand_side.value, right_hand_side.value),
                .type = create_bool_type_reference()
            };
        }
        case Binary_operation::Logical_or: {
            return Value_and_type
            {
                .name = "",
                .value = llvm_builder.CreateOr(left_hand_side.value, right_hand_side.value),
                .type = create_bool_type_reference()
            };
        }
        case Binary_operation::Bitwise_and: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateAnd(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Bitwise_or: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateOr(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Bitwise_xor: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateXor(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Bit_shift_left: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateShl(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Bit_shift_right: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateAShr(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateLShr(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            break;
        }
        }

        throw std::runtime_error{ std::format("Binary operation '{}' not implemented!", static_cast<std::uint32_t>(operation)) };
    }

    Value_and_type create_binary_expression_value(
        Binary_expression const& expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries
    )
    {
        Value_and_type const& left_hand_side = temporaries[expression.left_hand_side.expression_index];
        Value_and_type const& right_hand_side = temporaries[expression.right_hand_side.expression_index];
        Binary_operation const operation = expression.operation;

        Value_and_type value = create_binary_operation_instruction(llvm_builder, left_hand_side, right_hand_side, operation);
        return value;
    }

    Value_and_type create_block_expression_value(
        Block_expression const& block_expression,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const blocks,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::span<Statement const> statements = block_expression.statements;

        create_statement_values(
            statements,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            blocks,
            function_arguments,
            local_variables,
            type_database,
            temporaries_allocator
        );

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_break_expression_value(
        Break_expression const& break_expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Block_info const> const blocks
    )
    {
        auto const find_target_block = [&]() -> llvm::BasicBlock*
        {
            std::uint64_t target_break_count = break_expression.loop_count <= 1 ? 1 : break_expression.loop_count;
            std::uint64_t found_break_blocks = 0;

            for (std::size_t index = 0; index < blocks.size(); ++index)
            {
                std::size_t const block_index = blocks.size() - index - 1;
                Block_info const& block_info = blocks[block_index];

                if (block_info.block_type == Block_type::For_loop || block_info.block_type == Block_type::Switch || block_info.block_type == Block_type::While_loop)
                {
                    found_break_blocks += 1;

                    if (found_break_blocks == target_break_count)
                    {
                        return block_info.after_block;
                    }
                }
            }

            throw std::runtime_error{ std::format("Could not find block to break!") };
        };

        llvm::BasicBlock* const target_block = find_target_block();
        llvm_builder.CreateBr(target_block);

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_call_expression_value(
        Call_expression const& expression,
        Module const& core_module,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Value_and_type const& left_hand_side = temporaries[expression.expression.expression_index];

        if (!llvm::Function::classof(left_hand_side.value))
            throw std::runtime_error{ std::format("Left hand side of call expression is not a function!") };

        llvm::Function* const llvm_function = static_cast<llvm::Function*>(left_hand_side.value);

        if (expression.arguments.size() != llvm_function->arg_size() && !llvm_function->isVarArg())
        {
            throw std::runtime_error{ "Incorrect # arguments passed." };
        }

        std::pmr::vector<llvm::Value*> llvm_arguments{ temporaries_allocator };
        llvm_arguments.resize(expression.arguments.size());

        for (unsigned i = 0; i < expression.arguments.size(); ++i)
        {
            std::uint64_t const expression_index = expression.arguments[i].expression_index;
            Value_and_type const temporary = temporaries[expression_index];

            llvm_arguments[i] = temporary.value;
        }

        llvm::Value* call_instruction = llvm_builder.CreateCall(llvm_function, llvm_arguments);

        std::optional<Type_reference> function_output_type_reference = get_function_output_type_reference(left_hand_side.type.value());

        return
        {
            .name = "",
            .value = call_instruction,
            .type = std::move(function_output_type_reference)
        };
    }

    llvm::Instruction::CastOps get_cast_type(
        Type_reference const& source_core_type,
        llvm::Type const& source_llvm_type,
        Type_reference const& destination_core_type,
        llvm::Type const& destination_llvm_type
    )
    {
        if (source_llvm_type.isIntegerTy())
        {
            if (destination_llvm_type.isIntegerTy())
            {
                // Both are integers

                bool const is_source_larger = source_llvm_type.getIntegerBitWidth() > destination_llvm_type.getIntegerBitWidth();

                if (is_source_larger)
                {
                    return llvm::Instruction::CastOps::Trunc;
                }
                else
                {
                    Integer_type const& source_integer_type = std::get<Integer_type>(source_core_type.data);
                    Integer_type const& destination_integer_type = std::get<Integer_type>(destination_core_type.data);

                    if (source_integer_type.is_signed && destination_integer_type.is_signed)
                        return llvm::Instruction::CastOps::SExt;
                    else
                        return llvm::Instruction::CastOps::ZExt;
                }
            }
            else if (destination_llvm_type.isHalfTy() || destination_llvm_type.isFloatTy() || destination_llvm_type.isDoubleTy())
            {
                // Source is integer, destination is floating point

                Integer_type const& source_integer_type = std::get<Integer_type>(source_core_type.data);

                if (source_integer_type.is_signed)
                    return llvm::Instruction::CastOps::SIToFP;
                else
                    return llvm::Instruction::CastOps::UIToFP;
            }
        }
        else if (source_llvm_type.isHalfTy() || source_llvm_type.isFloatTy() || source_llvm_type.isDoubleTy())
        {
            if (destination_llvm_type.isIntegerTy())
            {
                // Source is floating point, destination is integer

                Integer_type const& destination_integer_type = std::get<Integer_type>(destination_core_type.data);

                if (destination_integer_type.is_signed)
                    return llvm::Instruction::CastOps::FPToSI;
                else
                    return llvm::Instruction::CastOps::FPToUI;
            }
            else if (destination_llvm_type.isHalfTy() || destination_llvm_type.isFloatTy() || destination_llvm_type.isDoubleTy())
            {
                // Both are floating point

                bool const is_source_larger = source_llvm_type.getFPMantissaWidth() > destination_llvm_type.getFPMantissaWidth();

                if (is_source_larger)
                    return llvm::Instruction::CastOps::FPTrunc;
                else
                    return llvm::Instruction::CastOps::FPExt;
            }
        }

        throw std::runtime_error{ std::format("Invalid cast!") };
    }

    Value_and_type create_cast_expression_value(
        Cast_expression const& expression,
        Module const& core_module,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database
    )
    {
        Value_and_type const source = temporaries[expression.source.expression_index];

        llvm::Type* const source_llvm_type = source.value->getType();
        llvm::Type* const destination_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, expression.destination_type, type_database);

        // If types are equal, then ignore the cast:
        if (source_llvm_type == destination_llvm_type)
            return source;

        llvm::Instruction::CastOps const cast_type = get_cast_type(source.type.value(), *source_llvm_type, expression.destination_type, *destination_llvm_type);

        llvm::Value* const cast_instruction = llvm_builder.CreateCast(cast_type, source.value, destination_llvm_type);

        return
        {
            .name = "",
            .value = cast_instruction,
            .type = expression.destination_type
        };
    }

    Value_and_type create_constant_expression_value(
        Constant_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Type_database const& type_database
    )
    {
        if (std::holds_alternative<Fundamental_type>(expression.type.data))
        {
            Fundamental_type const fundamental_type = std::get<Fundamental_type>(expression.type.data);

            switch (fundamental_type)
            {
            case Fundamental_type::Bool: {
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, expression.type, type_database);

                std::uint8_t const data = expression.data == "true" ? 1 : 0;
                llvm::APInt const value{ 1, data, false };

                llvm::Value* const instruction = llvm::ConstantInt::get(llvm_type, value);

                return
                {
                    .name = "",
                    .value = instruction,
                    .type = expression.type
                };
            }
            case Fundamental_type::Float16: {
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, expression.type, type_database);

                char* end;
                float const value = std::strtof(expression.data.c_str(), &end);

                llvm::Value* const instruction = llvm::ConstantFP::get(llvm_type, value);

                return
                {
                    .name = "",
                    .value = instruction,
                    .type = expression.type
                };
            }
            case Fundamental_type::Float32: {
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, expression.type, type_database);

                char* end;
                float const value = std::strtof(expression.data.c_str(), &end);

                llvm::Value* const instruction = llvm::ConstantFP::get(llvm_type, value);

                return
                {
                    .name = "",
                    .value = instruction,
                    .type = expression.type
                };
            }
            case Fundamental_type::Float64: {
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, expression.type, type_database);

                char* end;
                double const value = std::strtod(expression.data.c_str(), &end);

                llvm::Value* const instruction = llvm::ConstantFP::get(llvm_type, value);

                return
                {
                    .name = "",
                    .value = instruction,
                    .type = expression.type
                };
            }
            default:
                break;
            }
        }
        else if (std::holds_alternative<Integer_type>(expression.type.data))
        {
            Integer_type const& integer_type = std::get<Integer_type>(expression.type.data);

            llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, expression.type, type_database);

            char* end;
            std::uint64_t const data = std::strtoull(expression.data.c_str(), &end, 10);
            llvm::APInt const value{ integer_type.number_of_bits, data, integer_type.is_signed };

            llvm::Value* const instruction = llvm::ConstantInt::get(llvm_type, value);

            return
            {
                .name = "",
                .value = instruction,
                .type = expression.type
            };
        }
        else if (is_c_string(expression.type))
        {
            std::pmr::string const& string_data = expression.data;

            std::uint64_t const null_terminator_size = 1;
            std::uint64_t const array_size = string_data.size() + null_terminator_size;
            llvm::ArrayType* const array_type = llvm::ArrayType::get(llvm::IntegerType::get(llvm_context, 8), array_size);

            bool const is_constant = true;
            std::string const global_variable_name = std::format("global_{}", llvm_module.global_size());
            llvm::GlobalVariable* const global_variable = new llvm::GlobalVariable(
                llvm_module,
                array_type,
                is_constant,
                llvm::GlobalValue::InternalLinkage,
                llvm::ConstantDataArray::getString(llvm_context, string_data.c_str()),
                global_variable_name
            );

            llvm::Value* const instruction = global_variable;

            return
            {
                .name = "",
                .value = instruction,
                .type = expression.type
            };
        }

        throw std::runtime_error{ "Constant expression not handled!" };
    }

    Value_and_type create_continue_expression_value(
        Continue_expression const& continue_expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Block_info const> const block_infos
    )
    {
        auto const find_target_block = [&]() -> llvm::BasicBlock*
        {
            for (std::size_t index = 0; index < block_infos.size(); ++index)
            {
                std::size_t const block_index = block_infos.size() - index - 1;
                Block_info const& block_info = block_infos[block_index];

                if (block_info.block_type == Block_type::For_loop || block_info.block_type == Block_type::While_loop)
                {
                    return block_info.repeat_block;
                }
            }

            throw std::runtime_error{ std::format("Could not find loop block to continue!") };
        };

        llvm::BasicBlock* const target_block = find_target_block();
        llvm_builder.CreateBr(target_block);

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_for_loop_expression_value(
        For_loop_expression const& expression,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Value_and_type const& range_begin_temporary = temporaries[expression.range_begin.expression_index];

        // Loop variable declaration:
        Type_reference const& variable_type = range_begin_temporary.type.value();
        llvm::Type* const variable_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, variable_type, type_database);
        llvm::Value* const variable_alloca = llvm_builder.CreateAlloca(variable_llvm_type, nullptr, expression.variable_name.c_str());
        llvm_builder.CreateStore(range_begin_temporary.value, variable_alloca);
        Value_and_type const variable_value = { .name = expression.variable_name, .value = variable_alloca, .type = variable_type };

        llvm::BasicBlock* const condition_block = llvm::BasicBlock::Create(llvm_context, "for_loop_condition", llvm_parent_function);
        llvm::BasicBlock* const then_block = llvm::BasicBlock::Create(llvm_context, "for_loop_then", llvm_parent_function);
        llvm::BasicBlock* const update_index_block = llvm::BasicBlock::Create(llvm_context, "for_loop_update_index", llvm_parent_function);
        llvm::BasicBlock* const after_block = llvm::BasicBlock::Create(llvm_context, "for_loop_after", llvm_parent_function);

        llvm_builder.CreateBr(condition_block);

        // Loop condition:
        {
            llvm_builder.SetInsertPoint(condition_block);

            Value_and_type const& range_end_value = create_statement_value(
                expression.range_end,
                core_module,
                core_module_dependencies,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                block_infos,
                function_arguments,
                local_variables,
                type_database,
                temporaries_allocator
            );

            Value_and_type const loaded_variable_value
            {
                .name = expression.variable_name,
                .value = llvm_builder.CreateLoad(variable_llvm_type, variable_alloca),
                .type = variable_type,
            };

            Binary_operation const compare_operation = expression.range_comparison_operation;
            Value_and_type const condition_value = create_binary_operation_instruction(llvm_builder, loaded_variable_value, range_end_value, compare_operation);

            llvm_builder.CreateCondBr(condition_value.value, then_block, after_block);
        }

        // Loop body:
        {
            llvm_builder.SetInsertPoint(then_block);

            std::pmr::vector<Value_and_type> all_local_variables{ local_variables.begin(), local_variables.end() };
            all_local_variables.push_back(variable_value);

            std::pmr::vector<Block_info> all_block_infos{ block_infos.begin(), block_infos.end() };
            all_block_infos.push_back(Block_info{ .block_type = Block_type::For_loop, .repeat_block = update_index_block, .after_block = after_block });

            std::pmr::vector<Statement> const then_statements = skip_block(expression.then_statement);
            create_statement_values(
                then_statements,
                core_module,
                core_module_dependencies,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                all_block_infos,
                function_arguments,
                all_local_variables,
                type_database,
                temporaries_allocator
            );

            if (!ends_with_terminator_statement(then_statements))
                llvm_builder.CreateBr(update_index_block);
        }

        // Update loop variable:
        {
            llvm_builder.SetInsertPoint(update_index_block);

            Constant_expression const default_step_constant
            {
                .type = variable_type,
                .data =
                    (expression.range_comparison_operation == Binary_operation::Less_than) || (expression.range_comparison_operation == Binary_operation::Less_than_or_equal_to) ?
                    "1" :
                    "-1"
            };

            Value_and_type const step_by_value =
                expression.step_by.has_value() ?
                temporaries[expression.step_by.value().expression_index] :
                create_constant_expression_value(default_step_constant, llvm_context, llvm_data_layout, llvm_module, type_database);

            create_assignment_operation_instruction(
                llvm_context,
                llvm_data_layout,
                llvm_builder,
                variable_value,
                step_by_value,
                Binary_operation::Add,
                type_database
            );

            llvm_builder.CreateBr(condition_block);
        }

        // After the loop:
        llvm_builder.SetInsertPoint(after_block);

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_if_expression_value(
        If_expression const& expression,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        auto const calculate_number_of_blocks = [](std::span<Condition_statement_pair const> const series) -> std::uint32_t
        {
            if (series.size() == 1)
                return 2;

            Condition_statement_pair const& last_serie = series.back();
            bool const is_else_if = last_serie.condition.has_value();

            std::uint32_t const blocks_except_last = 2 * (series.size() - 1);
            std::uint32_t const last = is_else_if ? 2 : 1;
            std::uint32_t const total = blocks_except_last + last;
            return total;
        };

        auto get_block_name = [](std::size_t const index, std::size_t const last_index) -> std::string
        {
            if (index == 0)
                return std::format("if_s{}_then", index);
            else if (index == last_index)
                return std::format("if_s{}_after", index);
            else if (index % 2 != 0)
                return std::format("if_s{}_else", index);
            else
                return std::format("if_s{}_then", index);
        };

        std::uint32_t const number_of_blocks = calculate_number_of_blocks(expression.series);

        std::pmr::vector<llvm::BasicBlock*> blocks;
        blocks.resize(number_of_blocks);

        for (std::size_t index = 0; index < blocks.size(); ++index)
        {
            std::string const block_name = get_block_name(index, blocks.size() - 1);
            blocks[index] = llvm::BasicBlock::Create(llvm_context, block_name, llvm_parent_function);
        }

        llvm::BasicBlock* const end_if_block = blocks.back();

        for (std::size_t serie_index = 0; serie_index < expression.series.size(); ++serie_index)
        {
            Condition_statement_pair const& serie = expression.series[serie_index];

            // if: current, then, end_if
            // if,else_if: current, then, else, then, end_if
            // if,else: current, then, else, end_if
            // if,else_if,else: current, then, else, then, else, end_if

            if (serie.condition.has_value())
            {
                Value_and_type const& condition_value = create_statement_value(
                    serie.condition.value(),
                    core_module,
                    core_module_dependencies,
                    llvm_context,
                    llvm_data_layout,
                    llvm_module,
                    llvm_builder,
                    llvm_parent_function,
                    block_infos,
                    function_arguments,
                    local_variables,
                    type_database,
                    temporaries_allocator
                );

                std::size_t const block_index = 2 * serie_index;
                llvm::BasicBlock* const then_block = blocks[block_index];
                llvm::BasicBlock* const else_block = blocks[block_index + 1];

                llvm_builder.CreateCondBr(condition_value.value, then_block, else_block);

                llvm_builder.SetInsertPoint(then_block);
                std::pmr::vector<Statement> const statements = skip_block(serie.statement);
                create_statement_values(
                    statements,
                    core_module,
                    core_module_dependencies,
                    llvm_context,
                    llvm_data_layout,
                    llvm_module,
                    llvm_builder,
                    llvm_parent_function,
                    block_infos,
                    function_arguments,
                    local_variables,
                    type_database,
                    temporaries_allocator
                );

                if (!ends_with_terminator_statement(statements))
                    llvm_builder.CreateBr(end_if_block);

                llvm_builder.SetInsertPoint(else_block);
            }
            else
            {
                std::pmr::vector<Statement> const statements = skip_block(serie.statement);
                create_statement_values(
                    statements,
                    core_module,
                    core_module_dependencies,
                    llvm_context,
                    llvm_data_layout,
                    llvm_module,
                    llvm_builder,
                    llvm_parent_function,
                    block_infos,
                    function_arguments,
                    local_variables,
                    type_database,
                    temporaries_allocator
                );

                if (!ends_with_terminator_statement(statements))
                    llvm_builder.CreateBr(end_if_block);

                llvm_builder.SetInsertPoint(end_if_block);
            }
        }

        return Value_and_type
        {
            .name = "",
            .value = end_if_block,
            .type = std::nullopt
        };
    }

    Value_and_type create_parenthesis_expression_value(
        Parenthesis_expression const& expression,
        std::span<Value_and_type const> const temporaries
    )
    {
        Value_and_type temporary = temporaries[expression.expression.expression_index];
        return temporary;
    }

    Value_and_type create_return_expression_value(
        Return_expression const& expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries
    )
    {
        Value_and_type const temporary = temporaries[expression.expression.expression_index];

        llvm::Value* const instruction = llvm_builder.CreateRet(temporary.value);

        return
        {
            .name = "",
            .value = instruction,
            .type = std::nullopt
        };
    }

    Value_and_type create_switch_expression_value(
        Switch_expression const& expression,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<llvm::BasicBlock*> case_blocks;
        case_blocks.resize(expression.cases.size());

        llvm::BasicBlock* const after_block = llvm::BasicBlock::Create(llvm_context, "switch_after", llvm_parent_function);
        llvm::BasicBlock* default_case_block = nullptr;

        for (std::size_t case_index = 0; case_index < expression.cases.size(); ++case_index)
        {
            Switch_case_expression_pair const& switch_case = expression.cases[case_index];

            std::string const block_name = switch_case.case_value.has_value() ? std::format("switch_case_i{}_", case_index) : "switch_case_default";

            llvm::BasicBlock* case_block = llvm::BasicBlock::Create(llvm_context, block_name, llvm_parent_function);

            if (!switch_case.case_value.has_value())
                default_case_block = case_block;

            case_blocks[case_index] = case_block;
        }

        if (default_case_block == nullptr)
            default_case_block = after_block;

        std::uint64_t const number_of_cases = static_cast<std::uint64_t>(expression.cases.size());

        Value_and_type const& switch_value = temporaries[expression.value.expression_index];

        llvm::SwitchInst* switch_instruction = llvm_builder.CreateSwitch(switch_value.value, default_case_block, number_of_cases);

        for (std::size_t case_index = 0; case_index < expression.cases.size(); ++case_index)
        {
            Switch_case_expression_pair const& switch_case = expression.cases[case_index];

            if (switch_case.case_value.has_value())
            {
                llvm::BasicBlock* const case_block = case_blocks[case_index];
                Value_and_type const& case_value = temporaries[switch_case.case_value.value().expression_index];

                if (!llvm::ConstantInt::classof(case_value.value))
                    throw std::runtime_error("Swith case value is not a ConstantInt!");

                llvm::ConstantInt* const case_value_constant = static_cast<llvm::ConstantInt*>(case_value.value);

                switch_instruction->addCase(case_value_constant, case_block);
            }
        }

        std::pmr::vector<Block_info> all_block_infos{ block_infos.begin(), block_infos.end() };
        all_block_infos.push_back({ .block_type = Block_type::Switch, .repeat_block = nullptr, .after_block = after_block });

        for (std::size_t case_index = 0; case_index < expression.cases.size(); ++case_index)
        {
            Switch_case_expression_pair const& switch_case = expression.cases[case_index];
            llvm::BasicBlock* const case_block = case_blocks[case_index];

            llvm_builder.SetInsertPoint(case_block);

            create_statement_values(
                switch_case.statements,
                core_module,
                core_module_dependencies,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                all_block_infos,
                function_arguments,
                local_variables,
                type_database,
                temporaries_allocator
            );

            if (!ends_with_terminator_statement(switch_case.statements))
            {
                // If there is a next case:
                if ((case_index + 1) < expression.cases.size())
                {
                    llvm::BasicBlock* const next_case_block = case_blocks[case_index + 1];
                    llvm_builder.CreateBr(next_case_block);
                }
                else
                {
                    llvm_builder.CreateBr(after_block);
                }
            }
        }

        llvm_builder.SetInsertPoint(after_block);

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_ternary_condition_expression_value(
        Ternary_condition_expression const& expression,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::BasicBlock* const then_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_then", llvm_parent_function);
        llvm::BasicBlock* const else_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_else", llvm_parent_function);
        llvm::BasicBlock* const end_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_end", llvm_parent_function);

        // Condition:
        Value_and_type const& condition_value = temporaries[expression.condition.expression_index];
        llvm_builder.CreateCondBr(condition_value.value, then_block, else_block);

        // Then:
        llvm_builder.SetInsertPoint(then_block);
        Value_and_type const& then_value = create_statement_value(
            expression.then_statement,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            block_infos,
            function_arguments,
            local_variables,
            type_database,
            temporaries_allocator
        );
        llvm_builder.CreateBr(end_block);
        llvm::BasicBlock* const then_end_block = llvm_builder.GetInsertBlock();

        // Else:
        llvm_builder.SetInsertPoint(else_block);
        Value_and_type const& else_value = create_statement_value(
            expression.else_statement,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            block_infos,
            function_arguments,
            local_variables,
            type_database,
            temporaries_allocator
        );
        llvm_builder.CreateBr(end_block);
        llvm::BasicBlock* const else_end_block = llvm_builder.GetInsertBlock();

        if (then_value.type.has_value() && else_value.type.has_value() && then_value.type.value() != else_value.type.value())
            throw std::runtime_error{ "Ternary condition then and else statements must have the same type!" };

        // End:
        llvm_builder.SetInsertPoint(end_block);
        llvm::PHINode* const phi_node = llvm_builder.CreatePHI(then_value.value->getType(), 2);
        phi_node->addIncoming(then_value.value, then_end_block);
        phi_node->addIncoming(else_value.value, else_end_block);

        return Value_and_type
        {
            .name = "",
            .value = phi_node,
            .type = then_value.type
        };
    }

    Value_and_type create_unary_expression_value(
        Unary_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const local_variables,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database
    )
    {
        Value_and_type const& value_expression = temporaries[expression.expression.expression_index];
        Unary_operation const operation = expression.operation;

        Type_reference const& type = value_expression.type.value();

        switch (operation)
        {
        case Unary_operation::Not: {
            if (is_bool(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNot(value_expression.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Unary_operation::Bitwise_not: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNot(value_expression.value),
                    .type = type
                };
            }
            break;
        }
        case Unary_operation::Minus: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNeg(value_expression.value),
                    .type = type
                };
            }
            break;
        }
        case Unary_operation::Pre_decrement:
        case Unary_operation::Pre_increment:
        case Unary_operation::Post_decrement:
        case Unary_operation::Post_increment: {
            if (is_integer(type))
            {
                llvm::Type* llvm_value_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, type, type_database);

                bool const is_increment = (operation == Unary_operation::Pre_increment) || (operation == Unary_operation::Post_increment);
                bool const is_post = (operation == Unary_operation::Post_decrement) || (operation == Unary_operation::Post_increment);

                llvm::Value* const current_value = llvm_builder.CreateLoad(llvm_value_type, value_expression.value);

                llvm::Value* const new_value = is_increment ?
                    llvm_builder.CreateAdd(current_value, llvm::ConstantInt::get(current_value->getType(), 1)) :
                    llvm_builder.CreateSub(current_value, llvm::ConstantInt::get(current_value->getType(), 1));

                llvm_builder.CreateStore(new_value, value_expression.value);

                llvm::Value* const returned_value = is_post ? current_value : new_value;

                return Value_and_type
                {
                    .name = "",
                    .value = returned_value,
                    .type = type
                };
            }
            break;
        }
        case Unary_operation::Indirection: {
            if (is_non_void_pointer(type))
            {
                Type_reference const core_pointee_type = remove_pointer(type).value();
                llvm::Type* const llvm_pointee_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_pointee_type, type_database);

                llvm::Value* const load_address = llvm_builder.CreateLoad(value_expression.value->getType(), value_expression.value);
                llvm::Value* const load_value = llvm_builder.CreateLoad(llvm_pointee_type, load_address);

                return Value_and_type
                {
                    .name = "",
                    .value = load_value,
                    .type = core_pointee_type
                };
            }
            break;
        }
        case Unary_operation::Address_of: {
            std::string_view const variable_name = value_expression.name;

            std::optional<Value_and_type> location = search_in_function_scope(variable_name, {}, local_variables);
            if (location.has_value())
            {
                Value_and_type const& variable_declaration = location.value();
                return Value_and_type
                {
                    .name = "",
                    .value = variable_declaration.value,
                    .type = create_pointer_type_type_reference({ variable_declaration.type.value() }, false)
                };
            }
        }
        }

        throw std::runtime_error{ std::format("Unary operation '{}' not implemented!", static_cast<std::uint32_t>(operation)) };
    }

    Value_and_type create_variable_declaration_expression_value(
        Variable_declaration_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database
    )
    {
        Value_and_type const& right_hand_side = temporaries[expression.right_hand_side.expression_index];

        llvm::Value* const alloca = llvm_builder.CreateAlloca(right_hand_side.value->getType(), nullptr, expression.name.c_str());

        llvm_builder.CreateStore(right_hand_side.value, alloca);

        return Value_and_type
        {
            .name = expression.name,
            .value = alloca,
            .type = right_hand_side.type
        };
    }

    Value_and_type create_variable_expression_value(
        Variable_expression const& expression,
        Module const& core_module,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables,
        Type_database const& type_database
    )
    {
        char const* const variable_name = expression.name.c_str();

        auto const is_variable = [variable_name](Value_and_type const& element) -> bool
        {
            return element.name == variable_name;
        };

        // Search in local variables:
        {
            auto const location = std::find_if(local_variables.rbegin(), local_variables.rend(), is_variable);
            if (location != local_variables.rend())
            {
                if (expression.access_type == Access_type::Read)
                {
                    Type_reference const& type = location->type.value();
                    llvm::Type* const llvm_pointee_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, type, type_database);
                    llvm::Value* const loaded_value = llvm_builder.CreateLoad(llvm_pointee_type, location->value);

                    return Value_and_type
                    {
                        .name = expression.name,
                        .value = loaded_value,
                        .type = type
                    };
                }
                else
                {
                    return *location;
                }
            }
        }

        // Search in function arguments:
        {
            auto const location = std::find_if(function_arguments.begin(), function_arguments.end(), is_variable);
            if (location != function_arguments.end())
                return *location;
        }

        // Search for functions in this module:
        {
            llvm::Function* const llvm_function = get_llvm_function(core_module, llvm_module, variable_name);
            if (llvm_function != nullptr)
            {
                std::optional<Function_declaration const*> const function_declaration = find_function_declaration(core_module, variable_name);

                Type_reference type = create_function_type_type_reference(function_declaration.value()->type);

                return Value_and_type
                {
                    .name = expression.name,
                    .value = llvm_function,
                    .type = std::move(type)
                };
            }
        }

        // TODO search for alias or enums

        // Search for module dependencies:
        {
            std::optional<std::string_view> const module_name = get_module_name_from_alias(core_module, variable_name);
            if (module_name.has_value())
            {
                return Value_and_type
                {
                    .name = expression.name,
                    .value = nullptr,
                    .type = std::nullopt
                };
            }
        }

        throw std::runtime_error{ std::format("Undefined variable '{}'", variable_name) };
    }


    Value_and_type create_while_loop_expression_value(
        While_loop_expression const& expression,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::BasicBlock* const condition_block = llvm::BasicBlock::Create(llvm_context, "while_loop_condition", llvm_parent_function);
        llvm::BasicBlock* const then_block = llvm::BasicBlock::Create(llvm_context, "while_loop_then", llvm_parent_function);
        llvm::BasicBlock* const after_block = llvm::BasicBlock::Create(llvm_context, "while_loop_after", llvm_parent_function);

        std::pmr::vector<Block_info> all_block_infos{ block_infos.begin(), block_infos.end() };
        all_block_infos.push_back(
            Block_info
            {
                .block_type = Block_type::While_loop,
                .repeat_block = condition_block,
                .after_block = after_block,
            }
        );

        llvm_builder.CreateBr(condition_block);
        llvm_builder.SetInsertPoint(condition_block);
        Value_and_type const& condition_value = create_statement_value(
            expression.condition,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            block_infos,
            function_arguments,
            local_variables,
            type_database,
            temporaries_allocator
        );
        llvm_builder.CreateCondBr(condition_value.value, then_block, after_block);

        llvm_builder.SetInsertPoint(then_block);
        std::pmr::vector<Statement> const then_block_statements = skip_block(expression.then_statement);
        create_statement_values(
            then_block_statements,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            all_block_infos,
            function_arguments,
            local_variables,
            type_database,
            temporaries_allocator
        );
        if (!ends_with_terminator_statement(then_block_statements))
            llvm_builder.CreateBr(condition_block);

        llvm_builder.SetInsertPoint(after_block);

        return Value_and_type
        {
            .name = "",
            .value = after_block,
            .type = std::nullopt
        };
    }

    Value_and_type create_expression_value(
        Expression const& expression,
        Module const& core_module,
        Statement const& statement,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables,
        std::span<Value_and_type const> const temporaries,
        std::span<Module const> const core_module_dependencies,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        if (std::holds_alternative<Access_expression>(expression.data))
        {
            Access_expression const& data = std::get<Access_expression>(expression.data);
            return create_access_expression_value(data, core_module, core_module_dependencies, statement, llvm_module, temporaries);
        }
        else if (std::holds_alternative<Assignment_expression>(expression.data))
        {
            Assignment_expression const& data = std::get<Assignment_expression>(expression.data);
            return create_assignment_expression_value(data, llvm_context, llvm_data_layout, llvm_builder, temporaries, type_database);
        }
        else if (std::holds_alternative<Binary_expression>(expression.data))
        {
            Binary_expression const& data = std::get<Binary_expression>(expression.data);
            return create_binary_expression_value(data, llvm_builder, temporaries);
        }
        else if (std::holds_alternative<Block_expression>(expression.data))
        {
            Block_expression const& data = std::get<Block_expression>(expression.data);
            return create_block_expression_value(data, core_module, core_module_dependencies, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, type_database, temporaries_allocator);
        }
        else if (std::holds_alternative<Break_expression>(expression.data))
        {
            Break_expression const& data = std::get<Break_expression>(expression.data);
            return create_break_expression_value(data, llvm_builder, block_infos);
        }
        else if (std::holds_alternative<Call_expression>(expression.data))
        {
            Call_expression const& data = std::get<Call_expression>(expression.data);
            return create_call_expression_value(data, core_module, llvm_builder, temporaries, temporaries_allocator);
        }
        else if (std::holds_alternative<Cast_expression>(expression.data))
        {
            Cast_expression const& data = std::get<Cast_expression>(expression.data);
            return create_cast_expression_value(data, core_module, llvm_context, llvm_data_layout, llvm_builder, temporaries, type_database);
        }
        else if (std::holds_alternative<Constant_expression>(expression.data))
        {
            Constant_expression const& data = std::get<Constant_expression>(expression.data);
            return create_constant_expression_value(data, llvm_context, llvm_data_layout, llvm_module, type_database);
        }
        else if (std::holds_alternative<Continue_expression>(expression.data))
        {
            Continue_expression const& data = std::get<Continue_expression>(expression.data);
            return create_continue_expression_value(data, llvm_builder, block_infos);
        }
        else if (std::holds_alternative<For_loop_expression>(expression.data))
        {
            For_loop_expression const& data = std::get<For_loop_expression>(expression.data);
            return create_for_loop_expression_value(data, core_module, core_module_dependencies, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, type_database, temporaries_allocator);
        }
        else if (std::holds_alternative<If_expression>(expression.data))
        {
            If_expression const& data = std::get<If_expression>(expression.data);
            return create_if_expression_value(data, core_module, core_module_dependencies, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, type_database, temporaries_allocator);
        }
        else if (std::holds_alternative<Parenthesis_expression>(expression.data))
        {
            Parenthesis_expression const& data = std::get<Parenthesis_expression>(expression.data);
            return create_parenthesis_expression_value(data, temporaries);
        }
        else if (std::holds_alternative<Return_expression>(expression.data))
        {
            Return_expression const& data = std::get<Return_expression>(expression.data);
            return create_return_expression_value(data, llvm_builder, temporaries);
        }
        else if (std::holds_alternative<Ternary_condition_expression>(expression.data))
        {
            Ternary_condition_expression const& data = std::get<Ternary_condition_expression>(expression.data);
            return create_ternary_condition_expression_value(data, core_module, core_module_dependencies, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, type_database, temporaries_allocator);
        }
        else if (std::holds_alternative<Switch_expression>(expression.data))
        {
            Switch_expression const& data = std::get<Switch_expression>(expression.data);
            return create_switch_expression_value(data, core_module, core_module_dependencies, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, type_database, temporaries_allocator);
        }
        else if (std::holds_alternative<Unary_expression>(expression.data))
        {
            Unary_expression const& data = std::get<Unary_expression>(expression.data);
            return create_unary_expression_value(data, llvm_context, llvm_data_layout, llvm_builder, local_variables, temporaries, type_database);
        }
        else if (std::holds_alternative<Variable_declaration_expression>(expression.data))
        {
            Variable_declaration_expression const& data = std::get<Variable_declaration_expression>(expression.data);
            return create_variable_declaration_expression_value(data, llvm_context, llvm_data_layout, llvm_builder, temporaries, type_database);
        }
        else if (std::holds_alternative<Variable_expression>(expression.data))
        {
            Variable_expression const& data = std::get<Variable_expression>(expression.data);
            return create_variable_expression_value(data, core_module, llvm_context, llvm_data_layout, llvm_module, llvm_builder, function_arguments, local_variables, type_database);
        }
        else if (std::holds_alternative<While_loop_expression>(expression.data))
        {
            While_loop_expression const& data = std::get<While_loop_expression>(expression.data);
            return create_while_loop_expression_value(data, core_module, core_module_dependencies, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, type_database, temporaries_allocator);
        }
        else
        {
            //static_assert(always_false_v<Expression_type>, "non-exhaustive visitor!");
            throw std::runtime_error{ "Did not handle expression type!" };
        }
    }

    Value_and_type create_statement_value(
        Statement const& statement,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const blocks,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<Value_and_type> temporaries;
        temporaries.resize(statement.expressions.size());

        for (std::size_t index = 0; index < statement.expressions.size(); ++index)
        {
            std::size_t const expression_index = statement.expressions.size() - 1 - index;
            Expression const& current_expression = statement.expressions[expression_index];

            Value_and_type const instruction = create_expression_value(
                current_expression,
                core_module,
                statement,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                blocks,
                function_arguments,
                local_variables,
                temporaries,
                core_module_dependencies,
                type_database,
                temporaries_allocator
            );

            temporaries[expression_index] = instruction;
        }

        return temporaries.front();
    }

    void create_statement_values(
        std::span<Statement const> const statements,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const blocks,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<Value_and_type> all_local_variables;
        all_local_variables.reserve(local_variables.size() + statements.size());
        all_local_variables.insert(all_local_variables.begin(), local_variables.begin(), local_variables.end());

        for (Statement const statement : statements)
        {
            Value_and_type statement_value = create_statement_value(
                statement,
                core_module,
                core_module_dependencies,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                blocks,
                function_arguments,
                all_local_variables,
                type_database,
                temporaries_allocator
            );

            all_local_variables.push_back(statement_value);
        }
    }
}
