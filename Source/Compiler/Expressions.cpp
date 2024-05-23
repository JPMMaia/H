module;

#include <llvm/Analysis/ConstantFolding.h>
#include <llvm/IR/BasicBlock.h>
#include <llvm/IR/DataLayout.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/DIBuilder.h>
#include <llvm/IR/IRBuilder.h>
#include <llvm/IR/LLVMContext.h>

#include <array>
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
import h.core.declarations;
import h.core.types;
import h.compiler.common;
import h.compiler.debug_info;
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

    static void create_local_variable_debug_description(
        Debug_info& debug_info,
        Expression_parameters const& parameters,
        std::string_view const name,
        llvm::Value* const alloca,
        Type_reference const& type_reference
    )
    {
        Source_location const source_location = parameters.source_location.value_or(Source_location{});

        llvm::DIType* const llvm_argument_debug_type = type_reference_to_llvm_debug_type(
            *debug_info.llvm_builder,
            parameters.llvm_data_layout,
            parameters.core_module.name,
            type_reference,
            debug_info.type_database
        );

        llvm::DIScope* const debug_scope = get_debug_scope(debug_info);

        llvm::DILocalVariable* debug_parameter_variable = debug_info.llvm_builder->createAutoVariable(
            debug_scope,
            name.data(),
            debug_scope->getFile(),
            source_location.line,
            llvm_argument_debug_type
        );

        llvm::DILocation* const debug_location = llvm::DILocation::get(
            parameters.llvm_context,
            source_location.line,
            source_location.column,
            debug_scope
        );

        debug_info.llvm_builder->insertDeclare(
            alloca,
            debug_parameter_variable,
            debug_info.llvm_builder->createExpression(),
            debug_location,
            parameters.llvm_builder.GetInsertBlock()
        );
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

    llvm::Value* load_if_needed(
        llvm::IRBuilder<>& llvm_builder,
        llvm::Value* const value,
        llvm::Type* const type
    )
    {
        if (value->getType() == type)
        {
            return value;
        }

        if (value->getType()->isPointerTy())
        {
            return llvm_builder.CreateLoad(type, value);
        }

        throw std::runtime_error{ "Could not load variable!" };
    }

    llvm::Constant* fold_constant(
        llvm::Value* const value,
        llvm::DataLayout const& llvm_data_layout
    )
    {
        if (llvm::BinaryOperator::classof(value))
        {
            llvm::BinaryOperator* const binary_operator = static_cast<llvm::BinaryOperator*>(value);

            llvm::Constant* const left_hand_side = fold_constant(binary_operator->getOperand(0), llvm_data_layout);
            llvm::Constant* const right_hand_side = fold_constant(binary_operator->getOperand(1), llvm_data_layout);

            llvm::Constant* const folded_constant = llvm::ConstantFoldBinaryOpOperands(
                binary_operator->getOpcode(),
                left_hand_side,
                right_hand_side,
                llvm_data_layout
            );

            if (folded_constant == nullptr)
                throw std::runtime_error{ "Could not unfold binary operation constant!" };

            return folded_constant;
        }
        else if (llvm::Constant::classof(value))
        {
            return static_cast<llvm::Constant*>(value);
        }
        else
        {
            throw std::runtime_error{ "Could not unfold constant!" };
        }
    }

    llvm::Constant* fold_statement_constant(
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        Value_and_type const statement_value = create_statement_value(
            statement,
            parameters
        );

        if (statement_value.value == nullptr)
            throw std::runtime_error{ "Could not fold constant!" };

        return fold_constant(statement_value.value, parameters.llvm_data_layout);
    }

    Value_and_type access_enum_value(
        std::string_view const module_name,
        Enum_declaration const& declaration,
        std::string_view const enum_value_name,
        Enum_value_constants const& enum_value_constants
    )
    {
        auto const is_enum_value = [enum_value_name](Enum_value const& value) -> bool { return value.name == enum_value_name; };

        auto const enum_value_location = std::find_if(declaration.values.begin(), declaration.values.end(), is_enum_value);
        if (enum_value_location == declaration.values.end())
            throw std::runtime_error{ std::format("Unknown enum value '{}.{}' referenced.", declaration.name, enum_value_name) };

        auto const enum_value_index = std::distance(declaration.values.begin(), enum_value_location);

        // TODO mangle name
        Enum_constants const& constants = enum_value_constants.map.at(declaration.name);
        llvm::Constant* const constant = constants[enum_value_index];

        return Value_and_type
        {
            .name = "",
            .value = constant,
            .type = create_custom_type_reference(module_name, declaration.name)
        };
    }

    std::optional<Module const*> get_module_from_access_expression(
        Access_expression const& expression,
        Value_and_type const& left_hand_side,
        Statement const& statement,
        Module const& core_module,
        std::span<Module const> const core_module_dependencies
    )
    {
        if (left_hand_side.value == nullptr)
        {
            Expression const& left_hand_side_expression = statement.expressions[expression.expression.expression_index];

            if (std::holds_alternative<Variable_expression>(left_hand_side_expression.data))
            {
                Variable_expression const& variable_expression = std::get<Variable_expression>(left_hand_side_expression.data);

                std::string_view const module_alias_name = variable_expression.name;
                std::optional<std::string_view> const external_module_name = get_module_name_from_alias(core_module, module_alias_name);

                if (external_module_name.has_value())
                {
                    return get_module(core_module_dependencies, external_module_name.value()).value();
                }
            }
        }

        return std::nullopt;
    }

    std::optional<Custom_type_reference> get_custom_type_reference_from_access_expression(
        Access_expression const& expression,
        Value_and_type const& left_hand_side,
        Statement const& statement,
        std::string_view const current_module_name
    )
    {
        if (left_hand_side.value == nullptr)
        {
            Expression const& left_hand_side_expression = statement.expressions[expression.expression.expression_index];

            if (std::holds_alternative<Access_expression>(left_hand_side_expression.data))
            {
                if (left_hand_side.type.has_value() && std::holds_alternative<Custom_type_reference>(left_hand_side.type.value().data))
                {
                    return std::get<Custom_type_reference>(left_hand_side.type.value().data);
                }
            }
            else if (std::holds_alternative<Variable_expression>(left_hand_side_expression.data))
            {
                Variable_expression const& variable_expression = std::get<Variable_expression>(left_hand_side_expression.data);
                return Custom_type_reference
                {
                    .module_reference =
                    {
                        .name = std::pmr::string{ current_module_name },
                    },
                    .name = variable_expression.name
                };
            }
        }
        else if (left_hand_side.value != nullptr)
        {
            if (left_hand_side.type.has_value() && std::holds_alternative<Custom_type_reference>(left_hand_side.type.value().data))
            {
                Custom_type_reference const& type_reference = std::get<Custom_type_reference>(left_hand_side.type.value().data);
                return type_reference;
            }
        }

        return std::nullopt;
    }

    Value_and_type create_access_expression_value(
        Access_expression const& expression,
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        Module const& core_module = parameters.core_module;
        std::span<Module const> const core_module_dependencies = parameters.core_module_dependencies;
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::Module& llvm_module = parameters.llvm_module;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        Declaration_database const& declaration_database = parameters.declaration_database;
        Enum_value_constants const& enum_value_constants = parameters.enum_value_constants;

        Value_and_type const left_hand_side = create_expression_value(expression.expression.expression_index, statement, parameters);

        // Check if left hand side corresponds to a module name:
        {
            std::optional<Module const*> const external_module_optional = get_module_from_access_expression(expression, left_hand_side, statement, core_module, core_module_dependencies);
            if (external_module_optional.has_value())
            {
                Module const& external_module = *external_module_optional.value();

                std::string_view const declaration_name = expression.member_name;
                std::optional<Declaration> const declaration_optional = find_declaration(declaration_database, external_module.name, declaration_name);
                if (!declaration_optional.has_value())
                    throw std::runtime_error{ std::format("Could not find declaration '{}.{}' referenced.", external_module.name, declaration_name) };

                Declaration const& declaration = declaration_optional.value();

                if (std::holds_alternative<Alias_type_declaration const*>(declaration.data))
                {
                    Alias_type_declaration const& alias_type_declaration = *std::get<Alias_type_declaration const*>(declaration.data);
                    Type_reference type = create_custom_type_reference(external_module.name, alias_type_declaration.name);

                    return Value_and_type
                    {
                        .name = expression.member_name,
                        .value = nullptr,
                        .type = std::move(type)
                    };
                }
                else if (std::holds_alternative<Enum_declaration const*>(declaration.data))
                {
                    Enum_declaration const& enum_declaration = *std::get<Enum_declaration const*>(declaration.data);
                    Type_reference type = create_custom_type_reference(external_module.name, enum_declaration.name);

                    return Value_and_type
                    {
                        .name = expression.member_name,
                        .value = nullptr,
                        .type = std::move(type)
                    };
                }
                else if (std::holds_alternative<Function_declaration const*>(declaration.data))
                {
                    Function_declaration const& function_declaration = *std::get<Function_declaration const*>(declaration.data);
                    Type_reference function_type = create_function_type_type_reference(function_declaration.type);

                    llvm::Function* const llvm_function = get_llvm_function(
                        external_module,
                        llvm_module,
                        expression.member_name
                    );
                    if (!llvm_function)
                        throw std::runtime_error{ std::format("Unknown function '{}.{}' referenced. Mangled name is '{}'.", external_module.name, expression.member_name, llvm_function->getName().str()) };

                    return Value_and_type
                    {
                        .name = std::pmr::string{ llvm_function->getName().str() },
                        .value = llvm_function,
                        .type = std::move(function_type)
                    };
                }
            }
        }

        {
            std::optional<Custom_type_reference> custom_type_reference = get_custom_type_reference_from_access_expression(expression, left_hand_side, statement, core_module.name);

            if (custom_type_reference.has_value())
            {
                std::string_view const module_name = custom_type_reference.value().module_reference.name;
                std::string_view const declaration_name = custom_type_reference.value().name;

                std::optional<Declaration> const declaration = find_declaration(declaration_database, module_name, declaration_name);
                if (declaration.has_value())
                {
                    Declaration const& declaration_value = declaration.value();
                    if (std::holds_alternative<Alias_type_declaration const*>(declaration_value.data))
                    {
                        Alias_type_declaration const* data = std::get<Alias_type_declaration const*>(declaration_value.data);
                        std::optional<Declaration> const underlying_declaration = get_underlying_declaration(declaration_database, module_name, *data);
                        if (underlying_declaration.has_value())
                        {
                            if (std::holds_alternative<Enum_declaration const*>(underlying_declaration.value().data))
                            {
                                Enum_declaration const& enum_declaration = *std::get<Enum_declaration const*>(underlying_declaration.value().data);

                                return access_enum_value(
                                    module_name,
                                    enum_declaration,
                                    expression.member_name,
                                    enum_value_constants
                                );
                            }
                        }
                    }
                    else if (std::holds_alternative<Enum_declaration const*>(declaration_value.data))
                    {
                        Enum_declaration const& enum_declaration = *std::get<Enum_declaration const*>(declaration_value.data);

                        return access_enum_value(
                            module_name,
                            enum_declaration,
                            expression.member_name,
                            enum_value_constants
                        );
                    }
                    else if (std::holds_alternative<Struct_declaration const*>(declaration_value.data))
                    {
                        Struct_declaration const& struct_declaration = *std::get<Struct_declaration const*>(declaration_value.data);

                        if (left_hand_side.value != nullptr)
                        {
                            llvm::Type* const struct_llvm_type = type_reference_to_llvm_type(
                                parameters.llvm_context,
                                parameters.llvm_data_layout,
                                parameters.core_module.name,
                                create_custom_type_reference(module_name, struct_declaration.name),
                                parameters.type_database
                            );

                            auto const member_location = std::find(struct_declaration.member_names.begin(), struct_declaration.member_names.end(), expression.member_name);
                            if (member_location == struct_declaration.member_names.end())
                                throw std::runtime_error{ std::format("'{}' does not exist in struct type '{}'.", expression.member_name, struct_declaration.name) };

                            unsigned const member_index = static_cast<unsigned>(std::distance(struct_declaration.member_names.begin(), member_location));

                            Type_reference member_type = fix_custom_type_reference(struct_declaration.member_types[member_index], module_name);

                            std::array<llvm::Value*, 2> const indices
                            {
                                llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), 0),
                                llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), member_index),
                            };

                            llvm::Value* const get_element_pointer_instruction = llvm_builder.CreateGEP(struct_llvm_type, left_hand_side.value, indices, "", true);

                            return
                            {
                                .name = "",
                                .value = get_element_pointer_instruction,
                                .type = std::move(member_type)
                            };
                        }
                    }
                    else if (std::holds_alternative<Union_declaration const*>(declaration_value.data))
                    {
                        Union_declaration const& union_declaration = *std::get<Union_declaration const*>(declaration_value.data);

                        if (left_hand_side.value != nullptr)
                        {
                            llvm::Type* const union_llvm_type = type_reference_to_llvm_type(
                                parameters.llvm_context,
                                parameters.llvm_data_layout,
                                parameters.core_module.name,
                                create_custom_type_reference(module_name, union_declaration.name),
                                parameters.type_database
                            );

                            auto const member_location = std::find(union_declaration.member_names.begin(), union_declaration.member_names.end(), expression.member_name);
                            if (member_location == union_declaration.member_names.end())
                                throw std::runtime_error{ std::format("'{}' does not exist in union type '{}'.", expression.member_name, union_declaration.name) };

                            unsigned const member_index = static_cast<unsigned>(std::distance(union_declaration.member_names.begin(), member_location));

                            Type_reference member_type = fix_custom_type_reference(union_declaration.member_types[member_index], module_name);

                            llvm::Type* const llvm_member_type = type_reference_to_llvm_type(
                                parameters.llvm_context,
                                parameters.llvm_data_layout,
                                parameters.core_module.name,
                                member_type,
                                parameters.type_database
                            );

                            std::array<llvm::Value*, 2> const indices
                            {
                                llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), 0),
                                llvm::ConstantInt::get(llvm::Type::getInt32Ty(llvm_context), 0),
                            };
                            llvm::Value* const get_element_pointer_instruction = llvm_builder.CreateGEP(union_llvm_type, left_hand_side.value, indices, "", true);

                            llvm::Value* const bitcast_instruction = llvm_builder.CreateBitCast(get_element_pointer_instruction, llvm_member_type->getPointerTo());

                            return
                            {
                                .name = "",
                                .value = bitcast_instruction,
                                .type = std::move(member_type)
                            };
                        }
                    }
                }
            }
        }

        throw std::runtime_error{ "Could not process access expression!" };
    }

    Value_and_type create_binary_operation_instruction(
        llvm::IRBuilder<>& llvm_builder,
        Value_and_type const& left_hand_side,
        Value_and_type const& right_hand_side,
        Binary_operation operation
    );

    Value_and_type create_assignment_additional_operation_instruction(
        Expression_index const left_hand_side,
        Expression_index const right_hand_side,
        Type_reference const& expression_type,
        std::optional<Binary_operation> const additional_operation,
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        if (additional_operation.has_value())
        {
            llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
            std::string_view const current_module_name = parameters.core_module.name;

            Binary_operation const operation = additional_operation.value();

            Value_and_type const left_hand_side_value = create_loaded_expression_value(left_hand_side.expression_index, statement, parameters);

            Expression_parameters right_hand_side_parameters = parameters;
            right_hand_side_parameters.expression_type = left_hand_side_value.type;
            Value_and_type const right_hand_side_value = create_loaded_expression_value(right_hand_side.expression_index, statement, right_hand_side_parameters);

            Value_and_type const result = create_binary_operation_instruction(llvm_builder, left_hand_side_value, right_hand_side_value, operation);

            return result;
        }
        else
        {
            Expression_parameters right_hand_side_parameters = parameters;
            right_hand_side_parameters.expression_type = expression_type;
            Value_and_type const right_hand_side_value = create_loaded_expression_value(right_hand_side.expression_index, statement, right_hand_side_parameters);
            return right_hand_side_value;
        }
    }

    Value_and_type create_assignment_expression_value(
        Assignment_expression const& expression,
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;

        Value_and_type const left_hand_side = create_expression_value(expression.left_hand_side.expression_index, statement, parameters);

        Value_and_type const result = create_assignment_additional_operation_instruction(
            expression.left_hand_side,
            expression.right_hand_side,
            left_hand_side.type.value(),
            expression.additional_operation,
            statement,
            parameters
        );

        llvm::Value* store_instruction = llvm_builder.CreateStore(result.value, left_hand_side.value);

        return
        {
            .name = "",
            .value = store_instruction,
            .type = std::nullopt
        };
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
            if (is_bool(type) || is_integer(type) || is_enum_type(type, left_hand_side.value))
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
            if (is_bool(type) || is_integer(type) || is_enum_type(type, left_hand_side.value))
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
            if (is_integer(type) || is_enum_type(type, left_hand_side.value))
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
            if (is_integer(type) || is_enum_type(type, left_hand_side.value))
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
            if (is_integer(type) || is_enum_type(type, left_hand_side.value))
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
        case Binary_operation::Has: {
            if (is_enum_type(type, left_hand_side.value))
            {
                llvm::Value* const and_value = llvm_builder.CreateAnd(left_hand_side.value, right_hand_side.value);

                unsigned const integer_bit_width = left_hand_side.value->getType()->getIntegerBitWidth();
                llvm::Value* const zero_value = llvm_builder.getIntN(integer_bit_width, 0);

                llvm::Value* const compare_value = llvm_builder.CreateICmpUGT(and_value, zero_value);

                return Value_and_type
                {
                    .name = "",
                    .value = compare_value,
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        }

        throw std::runtime_error{ std::format("Binary operation '{}' not implemented!", static_cast<std::uint32_t>(operation)) };
    }

    Value_and_type create_binary_expression_value(
        Binary_expression const& expression,
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;

        Value_and_type const& left_hand_side = create_loaded_expression_value(expression.left_hand_side.expression_index, statement, parameters);
        Value_and_type const& right_hand_side = create_loaded_expression_value(expression.right_hand_side.expression_index, statement, parameters);
        Binary_operation const operation = expression.operation;

        Value_and_type value = create_binary_operation_instruction(llvm_builder, left_hand_side, right_hand_side, operation);
        return value;
    }

    Value_and_type create_block_expression_value(
        Block_expression const& block_expression,
        Expression_parameters const& parameters
    )
    {
        std::span<Statement const> statements = block_expression.statements;

        if (parameters.debug_info != nullptr)
            push_debug_lexical_block_scope(*parameters.debug_info, *parameters.source_location);

        create_statement_values(
            statements,
            parameters
        );

        if (parameters.debug_info != nullptr)
            pop_debug_scope(*parameters.debug_info);

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
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        Module const& core_module = parameters.core_module;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        std::pmr::polymorphic_allocator<> const& temporaries_allocator = parameters.temporaries_allocator;

        Value_and_type const left_hand_side = create_expression_value(expression.expression.expression_index, statement, parameters);

        if (!llvm::Function::classof(left_hand_side.value))
            throw std::runtime_error{ std::format("Left hand side of call expression is not a function!") };

        llvm::Function* const llvm_function = static_cast<llvm::Function*>(left_hand_side.value);

        if (expression.arguments.size() != llvm_function->arg_size() && !llvm_function->isVarArg())
        {
            throw std::runtime_error{ "Incorrect # arguments passed." };
        }

        std::pmr::vector<llvm::Value*> llvm_arguments{ temporaries_allocator };
        llvm_arguments.resize(expression.arguments.size());

        Function_type const& function_type = std::get<Function_type>(left_hand_side.type.value().data);

        for (unsigned i = 0; i < expression.arguments.size(); ++i)
        {
            std::uint64_t const expression_index = expression.arguments[i].expression_index;

            Expression_parameters new_parameters = parameters;
            new_parameters.expression_type = i < function_type.input_parameter_types.size() ? fix_custom_type_reference(function_type.input_parameter_types[i], core_module.name) : std::optional<Type_reference>{};
            Value_and_type const temporary = create_loaded_expression_value(expression_index, statement, new_parameters);

            llvm_arguments[i] = temporary.value;
        }

        llvm::Value* call_instruction = llvm_builder.CreateCall(llvm_function, llvm_arguments);

        std::optional<Type_reference> function_output_type_reference = get_function_output_type_reference(function_type);
        if (function_output_type_reference.has_value())
            set_custom_type_reference_module_name_if_empty(function_output_type_reference.value(), core_module.name);

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
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        Module const& core_module = parameters.core_module;
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::DataLayout const& llvm_data_layout = parameters.llvm_data_layout;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        Type_database const& type_database = parameters.type_database;

        Value_and_type const source = create_loaded_expression_value(expression.source.expression_index, statement, parameters);

        Type_reference destination_type = expression.destination_type;
        set_custom_type_reference_module_name_if_empty(destination_type, core_module.name);

        llvm::Type* const source_llvm_type = source.value->getType();
        llvm::Type* const destination_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module.name, destination_type, type_database);

        // If types are equal, then ignore the cast:
        if (source_llvm_type == destination_llvm_type)
            return source;

        llvm::Instruction::CastOps const cast_type = get_cast_type(source.type.value(), *source_llvm_type, destination_type, *destination_llvm_type);

        llvm::Value* const cast_instruction = llvm_builder.CreateCast(cast_type, source.value, destination_llvm_type);

        return
        {
            .name = "",
            .value = cast_instruction,
            .type = destination_type
        };
    }

    Value_and_type create_constant_expression_value(
        Constant_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        std::string_view const current_module_name,
        Type_database const& type_database
    )
    {
        if (std::holds_alternative<Fundamental_type>(expression.type.data))
        {
            Fundamental_type const fundamental_type = std::get<Fundamental_type>(expression.type.data);

            switch (fundamental_type)
            {
            case Fundamental_type::Bool: {
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, expression.type, type_database);

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
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, expression.type, type_database);

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
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, expression.type, type_database);

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
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, expression.type, type_database);

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

            llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, expression.type, type_database);

            char* end;
            std::uint64_t const data = std::strtoull(expression.data.c_str(), &end, 0);
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
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::DataLayout const& llvm_data_layout = parameters.llvm_data_layout;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        llvm::Module& llvm_module = parameters.llvm_module;
        llvm::Function* const llvm_parent_function = parameters.llvm_parent_function;
        Module const& core_module = parameters.core_module;
        Type_database const& type_database = parameters.type_database;
        std::span<Block_info const> block_infos = parameters.blocks;
        std::span<Value_and_type const> const local_variables = parameters.local_variables;

        Value_and_type const& range_begin_temporary = create_loaded_expression_value(expression.range_begin.expression_index, statement, parameters);

        // Loop variable declaration:
        Type_reference const& variable_type = range_begin_temporary.type.value();
        llvm::Type* const variable_llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module.name, variable_type, type_database);
        llvm::Value* const variable_alloca = llvm_builder.CreateAlloca(variable_llvm_type, nullptr, expression.variable_name.c_str());
        if (parameters.debug_info != nullptr)
            create_local_variable_debug_description(*parameters.debug_info, parameters, expression.variable_name.c_str(), variable_alloca, variable_type);
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

            if (parameters.debug_info != nullptr)
                push_debug_lexical_block_scope(*parameters.debug_info, *parameters.source_location);

            Value_and_type const& range_end_value = create_loaded_statement_value(
                expression.range_end,
                parameters
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

            Expression_parameters new_parameters = parameters;
            new_parameters.local_variables = all_local_variables;
            new_parameters.blocks = all_block_infos;

            create_statement_values(
                expression.then_statements,
                new_parameters
            );

            if (!ends_with_terminator_statement(expression.then_statements))
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
                create_loaded_expression_value(expression.step_by.value().expression_index, statement, parameters) :
                create_constant_expression_value(default_step_constant, llvm_context, llvm_data_layout, llvm_module, core_module.name, type_database);

            llvm::Value* const loaded_value_value = llvm_builder.CreateLoad(variable_llvm_type, variable_value.value);
            llvm::Value* new_variable_value = llvm_builder.CreateAdd(loaded_value_value, step_by_value.value);
            llvm_builder.CreateStore(new_variable_value, variable_value.value);

            llvm_builder.CreateBr(condition_block);
        }

        if (parameters.debug_info != nullptr)
            pop_debug_scope(*parameters.debug_info);

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
        Expression_parameters const& parameters
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        llvm::Function* const llvm_parent_function = parameters.llvm_parent_function;
        std::span<Block_info const> block_infos = parameters.blocks;
        std::span<Value_and_type const> const local_variables = parameters.local_variables;

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
                Value_and_type const& condition_value = create_loaded_statement_value(
                    serie.condition.value(),
                    parameters
                );

                std::size_t const block_index = 2 * serie_index;
                llvm::BasicBlock* const then_block = blocks[block_index];
                llvm::BasicBlock* const else_block = blocks[block_index + 1];

                llvm_builder.CreateCondBr(condition_value.value, then_block, else_block);

                llvm_builder.SetInsertPoint(then_block);

                if (parameters.debug_info != nullptr)
                    push_debug_lexical_block_scope(*parameters.debug_info, *serie.block_source_location);

                create_statement_values(
                    serie.then_statements,
                    parameters
                );

                if (!ends_with_terminator_statement(serie.then_statements))
                    llvm_builder.CreateBr(end_if_block);

                if (parameters.debug_info != nullptr)
                    pop_debug_scope(*parameters.debug_info);

                llvm_builder.SetInsertPoint(else_block);
            }
            else
            {
                if (parameters.debug_info != nullptr)
                    push_debug_lexical_block_scope(*parameters.debug_info, *serie.block_source_location);

                create_statement_values(
                    serie.then_statements,
                    parameters
                );

                if (!ends_with_terminator_statement(serie.then_statements))
                    llvm_builder.CreateBr(end_if_block);

                if (parameters.debug_info != nullptr)
                    pop_debug_scope(*parameters.debug_info);

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

    Value_and_type create_instantiate_struct_expression_value(
        Instantiate_expression const& expression,
        Expression_parameters const& parameters,
        std::string_view const module_name,
        Struct_declaration const& struct_declaration,
        Type_reference const& struct_type_reference
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::DataLayout const& llvm_data_layout = parameters.llvm_data_layout;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        Module const& core_module = parameters.core_module;
        Type_database const& type_database = parameters.type_database;

        llvm::Type* const llvm_struct_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module.name, struct_type_reference, type_database);

        llvm::Value* struct_instance_value = llvm::UndefValue::get(llvm_struct_type);

        if (expression.type == Instantiate_expression_type::Default)
        {
            for (std::size_t member_index = 0; member_index < struct_declaration.member_names.size(); ++member_index)
            {
                std::string_view const member_name = struct_declaration.member_names[member_index];
                Type_reference const member_type = fix_custom_type_reference(struct_declaration.member_types[member_index], core_module.name);

                auto const expression_pair_location = std::find_if(expression.members.begin(), expression.members.end(), [member_name](Instantiate_member_value_pair const& pair) { return pair.member_name == member_name; });
                Statement const& member_value_statement = expression_pair_location != expression.members.end() ? expression_pair_location->value : struct_declaration.member_default_values[member_index];

                Expression_parameters new_parameters = parameters;
                new_parameters.expression_type = member_type;
                Value_and_type const member_value = create_loaded_statement_value(member_value_statement, new_parameters);

                struct_instance_value = llvm_builder.CreateInsertValue(struct_instance_value, member_value.value, { static_cast<unsigned>(member_index) });
            }

            return Value_and_type
            {
                .name = "",
                .value = struct_instance_value,
                .type = struct_type_reference
            };
        }
        else if (expression.type == Instantiate_expression_type::Explicit)
        {
            for (std::size_t member_index = 0; member_index < struct_declaration.member_names.size(); ++member_index)
            {
                std::string_view const member_name = struct_declaration.member_names[member_index];
                Type_reference const member_type = fix_custom_type_reference(struct_declaration.member_types[member_index], core_module.name);

                if (member_index >= expression.members.size())
                    throw std::runtime_error{ std::format("The struct member '{}' of struct '{}.{}' is not explicitly initialized!", member_name, module_name, struct_declaration.name) };

                Instantiate_member_value_pair const& pair = expression.members[member_index];

                if (pair.member_name != member_name)
                    throw std::runtime_error{ std::format("Expected struct member '{}' of struct '{}.{}' instead of '{}' while instantiating struct!", member_name, module_name, struct_declaration.name, pair.member_name) };

                Statement const& member_value_statement = pair.value;

                Expression_parameters new_parameters = parameters;
                new_parameters.expression_type = member_type;
                Value_and_type const member_value = create_loaded_statement_value(member_value_statement, new_parameters);

                struct_instance_value = llvm_builder.CreateInsertValue(struct_instance_value, member_value.value, { static_cast<unsigned>(member_index) });
            }

            return Value_and_type
            {
                .name = "",
                .value = struct_instance_value,
                .type = struct_type_reference
            };
        }
        else
        {
            throw std::runtime_error{ "Instantiate_expression_type not handled!" };
        }
    }

    Value_and_type create_instantiate_union_expression_value(
        Instantiate_expression const& expression,
        Expression_parameters const& parameters,
        std::string_view const module_name,
        Union_declaration const& union_declaration,
        Type_reference const& union_type_reference
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::DataLayout const& llvm_data_layout = parameters.llvm_data_layout;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        Module const& core_module = parameters.core_module;
        Type_database const& type_database = parameters.type_database;

        llvm::Type* const llvm_union_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module.name, union_type_reference, type_database);
        if (!llvm::StructType::classof(llvm_union_type))
            throw std::runtime_error{ "llvm_union_type must be a StructType!" };

        if (expression.type != Instantiate_expression_type::Default)
            throw std::runtime_error{ "Unions only support default Instantiate_expression_type!" };

        if (expression.members.size() != 1)
            throw std::runtime_error{ "Instantiating a union requires specifying one and only one member!" };

        Instantiate_member_value_pair const& member_value_pair = expression.members[0];

        auto const member_name_location = std::find_if(union_declaration.member_names.begin(), union_declaration.member_names.end(), [&member_value_pair](std::pmr::string const& member_name) { return member_name == member_value_pair.member_name; });
        if (member_name_location == union_declaration.member_names.end())
            throw std::runtime_error{ std::format("Could not find member '{}' while instantiating union ''!", member_value_pair.member_name, union_declaration.name) };

        auto const member_index = std::distance(union_declaration.member_names.begin(), member_name_location);
        Type_reference const member_type = fix_custom_type_reference(union_declaration.member_types[member_index], core_module.name);

        Expression_parameters new_parameters = parameters;
        new_parameters.expression_type = member_type;
        Value_and_type const member_value = create_loaded_statement_value(member_value_pair.value, new_parameters);

        llvm::Value* const union_instance = llvm_builder.CreateAlloca(llvm_union_type);
        llvm::Value* const bitcast_instruction = llvm_builder.CreateBitCast(union_instance, member_value.value->getType()->getPointerTo());
        llvm_builder.CreateStore(member_value.value, bitcast_instruction);

        return Value_and_type
        {
            .name = "",
            .value = union_instance,
            .type = union_type_reference
        };
    }

    Value_and_type create_instantiate_expression_value(
        Instantiate_expression const& expression,
        Expression_parameters const& parameters
    )
    {
        Declaration_database const& declaration_database = parameters.declaration_database;

        if (!parameters.expression_type.has_value())
            throw std::runtime_error{ "Could not infer struct type while trying to instantiate!" };

        Type_reference const& type_reference = parameters.expression_type.value();
        if (!std::holds_alternative<Custom_type_reference>(type_reference.data))
            throw std::runtime_error{ "Could not instantiate struct because the type is not a struct!" };

        Custom_type_reference const& custom_type_reference = std::get<Custom_type_reference>(type_reference.data);
        std::optional<Declaration> const declaration = find_declaration(declaration_database, custom_type_reference.module_reference.name, custom_type_reference.name);

        if (!declaration.has_value())
            throw std::runtime_error{ std::format("Could not find struct type declaration '{}.{}' while trying to instantiate struct!", custom_type_reference.module_reference.name, custom_type_reference.name) };

        if (std::holds_alternative<Struct_declaration const*>(declaration.value().data))
        {
            Struct_declaration const& struct_declaration = *std::get<Struct_declaration const*>(declaration.value().data);
            return create_instantiate_struct_expression_value(expression, parameters, custom_type_reference.module_reference.name, struct_declaration, type_reference);
        }
        else if (std::holds_alternative<Union_declaration const*>(declaration.value().data))
        {
            Union_declaration const& union_declaration = *std::get<Union_declaration const*>(declaration.value().data);
            return create_instantiate_union_expression_value(expression, parameters, custom_type_reference.module_reference.name, union_declaration, type_reference);
        }

        throw std::runtime_error{ std::format("Instantiate_expression can only be used to instantiate either structs or unions! Tried to instantiate '{}.{}'", custom_type_reference.module_reference.name, custom_type_reference.name) };
    }

    Value_and_type create_parenthesis_expression_value(
        Parenthesis_expression const& expression,
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        return create_expression_value(expression.expression.expression_index, statement, parameters);
    }

    Value_and_type create_return_expression_value(
        Return_expression const& expression,
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;

        Function_type const& function_type = parameters.function_declaration.value()->type;
        std::optional<Type_reference> const function_output_type = get_function_output_type_reference(function_type);

        Expression_parameters new_parameters = parameters;
        new_parameters.expression_type = function_output_type.has_value() ? fix_custom_type_reference(function_output_type.value(), parameters.core_module.name) : std::optional<Type_reference>{};
        Value_and_type const temporary = create_loaded_expression_value(expression.expression.expression_index, statement, new_parameters);

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
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        llvm::Function* const llvm_parent_function = parameters.llvm_parent_function;
        std::span<Block_info const> block_infos = parameters.blocks;
        std::span<Value_and_type const> const local_variables = parameters.local_variables;

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

        Value_and_type const& switch_value = create_loaded_expression_value(expression.value.expression_index, statement, parameters);

        llvm::SwitchInst* switch_instruction = llvm_builder.CreateSwitch(switch_value.value, default_case_block, number_of_cases);

        for (std::size_t case_index = 0; case_index < expression.cases.size(); ++case_index)
        {
            Switch_case_expression_pair const& switch_case = expression.cases[case_index];

            if (switch_case.case_value.has_value())
            {
                llvm::BasicBlock* const case_block = case_blocks[case_index];
                Value_and_type const& case_value = create_loaded_expression_value(switch_case.case_value.value().expression_index, statement, parameters);

                if (!llvm::ConstantInt::classof(case_value.value))
                    throw std::runtime_error("Swith case value is not a ConstantInt!");

                llvm::ConstantInt* const case_value_constant = static_cast<llvm::ConstantInt*>(case_value.value);

                switch_instruction->addCase(case_value_constant, case_block);
            }
        }

        std::pmr::vector<Block_info> all_block_infos{ block_infos.begin(), block_infos.end() };
        all_block_infos.push_back({ .block_type = Block_type::Switch, .repeat_block = nullptr, .after_block = after_block });

        Expression_parameters new_parameters = parameters;
        new_parameters.blocks = all_block_infos;

        for (std::size_t case_index = 0; case_index < expression.cases.size(); ++case_index)
        {
            Switch_case_expression_pair const& switch_case = expression.cases[case_index];
            llvm::BasicBlock* const case_block = case_blocks[case_index];

            llvm_builder.SetInsertPoint(case_block);

            create_statement_values(
                switch_case.statements,
                new_parameters
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
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        llvm::Function* const llvm_parent_function = parameters.llvm_parent_function;
        std::span<Block_info const> block_infos = parameters.blocks;
        std::span<Value_and_type const> const local_variables = parameters.local_variables;

        llvm::BasicBlock* const then_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_then", llvm_parent_function);
        llvm::BasicBlock* const else_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_else", llvm_parent_function);
        llvm::BasicBlock* const end_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_end", llvm_parent_function);

        // Condition:
        Value_and_type const& condition_value = create_loaded_expression_value(expression.condition.expression_index, statement, parameters);
        llvm_builder.CreateCondBr(condition_value.value, then_block, else_block);

        // Then:
        llvm_builder.SetInsertPoint(then_block);
        Value_and_type const& then_value = create_loaded_statement_value(
            expression.then_statement,
            parameters
        );
        llvm_builder.CreateBr(end_block);
        llvm::BasicBlock* const then_end_block = llvm_builder.GetInsertBlock();

        // Else:
        llvm_builder.SetInsertPoint(else_block);
        Value_and_type const& else_value = create_loaded_statement_value(
            expression.else_statement,
            parameters
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
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::DataLayout const& llvm_data_layout = parameters.llvm_data_layout;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        std::string_view const current_module_name = parameters.core_module.name;
        std::span<Value_and_type const> const local_variables = parameters.local_variables;
        Type_database const& type_database = parameters.type_database;

        Value_and_type const value_expression = create_expression_value(expression.expression.expression_index, statement, parameters);
        Unary_operation const operation = expression.operation;

        Type_reference const& type = value_expression.type.value();

        switch (operation)
        {
        case Unary_operation::Not: {
            if (is_bool(type))
            {
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, value_expression.type.value(), type_database);
                llvm::Value* const loaded_value = load_if_needed(llvm_builder, value_expression.value, llvm_type);
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNot(loaded_value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Unary_operation::Bitwise_not: {
            if (is_integer(type))
            {
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, value_expression.type.value(), type_database);
                llvm::Value* const loaded_value = load_if_needed(llvm_builder, value_expression.value, llvm_type);
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNot(loaded_value),
                    .type = type
                };
            }
            break;
        }
        case Unary_operation::Minus: {
            if (is_integer(type))
            {
                llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, value_expression.type.value(), type_database);
                llvm::Value* const loaded_value = load_if_needed(llvm_builder, value_expression.value, llvm_type);
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNeg(loaded_value),
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
                llvm::Type* llvm_value_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, type, type_database);

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
                llvm::Type* const llvm_pointee_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, core_pointee_type, type_database);

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
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;

        Value_and_type const& right_hand_side = create_loaded_expression_value(expression.right_hand_side.expression_index, statement, parameters);

        llvm::Value* const alloca = llvm_builder.CreateAlloca(right_hand_side.value->getType(), nullptr, expression.name.c_str());

        if (parameters.debug_info != nullptr)
            create_local_variable_debug_description(*parameters.debug_info, parameters, expression.name, alloca, *right_hand_side.type);

        llvm_builder.CreateStore(right_hand_side.value, alloca);

        return Value_and_type
        {
            .name = expression.name,
            .value = alloca,
            .type = right_hand_side.type
        };
    }

    Value_and_type create_variable_declaration_with_type_expression_value(
        Variable_declaration_with_type_expression const& expression,
        Expression_parameters const& parameters
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::DataLayout const& llvm_data_layout = parameters.llvm_data_layout;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        Module const& core_module = parameters.core_module;
        Type_database const& type_database = parameters.type_database;

        Type_reference core_type = fix_custom_type_reference(expression.type, core_module.name);

        llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module.name, core_type, type_database);

        Expression_parameters new_parameters = parameters;
        new_parameters.expression_type = core_type;
        Value_and_type const right_hand_side = create_loaded_statement_value(
            expression.right_hand_side,
            new_parameters
        );

        llvm::Value* const alloca = llvm_builder.CreateAlloca(llvm_type, nullptr, expression.name.c_str());

        if (parameters.debug_info != nullptr)
            create_local_variable_debug_description(*parameters.debug_info, parameters, expression.name, alloca, core_type);

        llvm_builder.CreateStore(right_hand_side.value, alloca);

        return Value_and_type
        {
            .name = expression.name,
            .value = alloca,
            .type = std::move(core_type)
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
        Declaration_database const& declaration_database,
        Type_database const& type_database
    )
    {
        char const* const variable_name = expression.name.c_str();

        auto const is_variable = [variable_name](Value_and_type const& element) -> bool
        {
            return element.name == variable_name;
        };

        // Search in local variables and function arguments:
        {
            std::optional<Value_and_type> location = search_in_function_scope(variable_name, function_arguments, local_variables);

            if (location.has_value())
            {
                return location.value();
            }
        }

        // Search in function arguments:
        {
            auto const location = std::find_if(function_arguments.begin(), function_arguments.end(), is_variable);
            if (location != function_arguments.end())
            {
                return *location;
            }
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

        // Search for alias in this module:
        {
            std::optional<Alias_type_declaration const*> const declaration = find_alias_type_declaration(core_module, variable_name);
            if (declaration.has_value())
            {
                std::optional<Type_reference> type = get_underlying_type(declaration_database, core_module.name, *declaration.value());

                return Value_and_type
                {
                    .name = expression.name,
                    .value = nullptr,
                    .type = std::move(type)
                };
            }
        }

        // Search for enums in this module:
        {
            std::optional<Enum_declaration const*> const declaration = find_enum_declaration(core_module, variable_name);
            if (declaration.has_value())
            {
                Enum_declaration const& enum_declaration = *declaration.value();
                Type_reference type = create_custom_type_reference(core_module.name, enum_declaration.name);

                return Value_and_type
                {
                    .name = expression.name,
                    .value = nullptr,
                    .type = std::move(type)
                };
            }
        }

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
        Expression_parameters const& parameters
    )
    {
        llvm::LLVMContext& llvm_context = parameters.llvm_context;
        llvm::IRBuilder<>& llvm_builder = parameters.llvm_builder;
        llvm::Function* const llvm_parent_function = parameters.llvm_parent_function;
        std::span<Block_info const> block_infos = parameters.blocks;
        std::span<Value_and_type const> const local_variables = parameters.local_variables;

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
        Value_and_type const& condition_value = create_loaded_statement_value(
            expression.condition,
            parameters
        );
        llvm_builder.CreateCondBr(condition_value.value, then_block, after_block);

        Expression_parameters new_parameters = parameters;
        new_parameters.blocks = all_block_infos;

        llvm_builder.SetInsertPoint(then_block);

        if (parameters.debug_info != nullptr)
            push_debug_lexical_block_scope(*parameters.debug_info, *parameters.source_location);

        create_statement_values(
            expression.then_statements,
            new_parameters
        );
        if (!ends_with_terminator_statement(expression.then_statements))
            llvm_builder.CreateBr(condition_block);

        if (parameters.debug_info != nullptr)
            pop_debug_scope(*parameters.debug_info);

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
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        Expression_parameters new_parameters = parameters;

        if (parameters.debug_info != nullptr && expression.source_location.has_value())
        {
            Source_location const source_location = *expression.source_location;
            new_parameters.source_location = source_location;

            set_debug_location(
                parameters.llvm_builder,
                *parameters.debug_info,
                source_location.line,
                source_location.column
            );
        }

        if (std::holds_alternative<Access_expression>(expression.data))
        {
            Access_expression const& data = std::get<Access_expression>(expression.data);
            return create_access_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Assignment_expression>(expression.data))
        {
            Assignment_expression const& data = std::get<Assignment_expression>(expression.data);
            return create_assignment_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Binary_expression>(expression.data))
        {
            Binary_expression const& data = std::get<Binary_expression>(expression.data);
            return create_binary_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Block_expression>(expression.data))
        {
            Block_expression const& data = std::get<Block_expression>(expression.data);
            return create_block_expression_value(data, new_parameters);
        }
        else if (std::holds_alternative<Break_expression>(expression.data))
        {
            Break_expression const& data = std::get<Break_expression>(expression.data);
            return create_break_expression_value(data, new_parameters.llvm_builder, new_parameters.blocks);
        }
        else if (std::holds_alternative<Call_expression>(expression.data))
        {
            Call_expression const& data = std::get<Call_expression>(expression.data);
            return create_call_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Cast_expression>(expression.data))
        {
            Cast_expression const& data = std::get<Cast_expression>(expression.data);
            return create_cast_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Constant_expression>(expression.data))
        {
            Constant_expression const& data = std::get<Constant_expression>(expression.data);
            return create_constant_expression_value(data, new_parameters.llvm_context, new_parameters.llvm_data_layout, new_parameters.llvm_module, new_parameters.core_module.name, new_parameters.type_database);
        }
        else if (std::holds_alternative<Continue_expression>(expression.data))
        {
            Continue_expression const& data = std::get<Continue_expression>(expression.data);
            return create_continue_expression_value(data, new_parameters.llvm_builder, new_parameters.blocks);
        }
        else if (std::holds_alternative<For_loop_expression>(expression.data))
        {
            For_loop_expression const& data = std::get<For_loop_expression>(expression.data);
            return create_for_loop_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<If_expression>(expression.data))
        {
            If_expression const& data = std::get<If_expression>(expression.data);
            return create_if_expression_value(data, new_parameters);
        }
        else if (std::holds_alternative<Instantiate_expression>(expression.data))
        {
            Instantiate_expression const& data = std::get<Instantiate_expression>(expression.data);
            return create_instantiate_expression_value(data, new_parameters);
        }
        else if (std::holds_alternative<Parenthesis_expression>(expression.data))
        {
            Parenthesis_expression const& data = std::get<Parenthesis_expression>(expression.data);
            return create_parenthesis_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Return_expression>(expression.data))
        {
            Return_expression const& data = std::get<Return_expression>(expression.data);
            return create_return_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Ternary_condition_expression>(expression.data))
        {
            Ternary_condition_expression const& data = std::get<Ternary_condition_expression>(expression.data);
            return create_ternary_condition_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Switch_expression>(expression.data))
        {
            Switch_expression const& data = std::get<Switch_expression>(expression.data);
            return create_switch_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Unary_expression>(expression.data))
        {
            Unary_expression const& data = std::get<Unary_expression>(expression.data);
            return create_unary_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Variable_declaration_expression>(expression.data))
        {
            Variable_declaration_expression const& data = std::get<Variable_declaration_expression>(expression.data);
            return create_variable_declaration_expression_value(data, statement, new_parameters);
        }
        else if (std::holds_alternative<Variable_declaration_with_type_expression>(expression.data))
        {
            Variable_declaration_with_type_expression const& data = std::get<Variable_declaration_with_type_expression>(expression.data);
            return create_variable_declaration_with_type_expression_value(data, new_parameters);
        }
        else if (std::holds_alternative<Variable_expression>(expression.data))
        {
            Variable_expression const& data = std::get<Variable_expression>(expression.data);
            return create_variable_expression_value(data, new_parameters.core_module, new_parameters.llvm_context, new_parameters.llvm_data_layout, new_parameters.llvm_module, new_parameters.llvm_builder, new_parameters.function_arguments, new_parameters.local_variables, new_parameters.declaration_database, new_parameters.type_database);
        }
        else if (std::holds_alternative<While_loop_expression>(expression.data))
        {
            While_loop_expression const& data = std::get<While_loop_expression>(expression.data);
            return create_while_loop_expression_value(data, new_parameters);
        }
        else
        {
            //static_assert(always_false_v<Expression_type>, "non-exhaustive visitor!");
            throw std::runtime_error{ "Did not handle expression type!" };
        }
    }

    bool is_comment(
        Statement const& statement
    )
    {
        if (statement.expressions.size() == 1)
        {
            return std::holds_alternative<Comment_expression>(statement.expressions[0].data);
        }

        return false;
    }

    Value_and_type create_loaded_expression_value(
        std::size_t const expression_index,
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        Value_and_type value = create_expression_value(expression_index, statement, parameters);

        if (value.value != nullptr && value.type.has_value() && value.value->getType()->isPointerTy())
        {
            llvm::Type* const llvm_type = type_reference_to_llvm_type(parameters.llvm_context, parameters.llvm_data_layout, parameters.core_module.name, value.type.value(), parameters.type_database);
            if (llvm_type == value.value->getType())
            {
                return value;
            }

            llvm::Value* const loaded_value = parameters.llvm_builder.CreateLoad(llvm_type, value.value);
            return Value_and_type
            {
                .name = value.name,
                .value = loaded_value,
                .type = value.type
            };
        }
        else
        {
            return value;
        }
    }

    Value_and_type create_expression_value(
        std::size_t const expression_index,
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        return create_expression_value(statement.expressions[expression_index], statement, parameters);
    }

    Value_and_type create_statement_value(
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        return create_expression_value(0, statement, parameters);
    }

    Value_and_type create_loaded_statement_value(
        Statement const& statement,
        Expression_parameters const& parameters
    )
    {
        return create_loaded_expression_value(0, statement, parameters);
    }

    void create_statement_values(
        std::span<Statement const> const statements,
        Expression_parameters const& parameters
    )
    {
        std::pmr::vector<Value_and_type> all_local_variables;
        all_local_variables.reserve(parameters.local_variables.size() + statements.size());
        all_local_variables.insert(all_local_variables.begin(), parameters.local_variables.begin(), parameters.local_variables.end());

        Expression_parameters new_parameters = parameters;

        for (Statement const statement : statements)
        {
            if (!is_comment(statement))
            {
                new_parameters.local_variables = all_local_variables;

                Value_and_type statement_value = create_statement_value(
                    statement,
                    new_parameters
                );

                all_local_variables.push_back(statement_value);
            }
        }
    }
}
