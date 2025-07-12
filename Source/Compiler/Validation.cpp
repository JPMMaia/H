module;

#include <cstddef>
#include <filesystem>
#include <format>
#include <memory_resource>
#include <optional>
#include <span>
#include <variant>
#include <vector>

module h.compiler.validation;

import h.compiler.analysis;
import h.compiler.diagnostic;
import h.core;
import h.core.declarations;
import h.core.types;
import h.parser.formatter;

namespace h::compiler
{
    h::compiler::Diagnostic create_error_diagnostic(
        std::optional<std::filesystem::path> const source_file_path,
        std::optional<Source_range> const range,
        std::string_view const message
    )
    {
        return h::compiler::Diagnostic
        {
            .file_path = source_file_path,
            .range = range.has_value() ? range.value() : Source_range{},
            .source = Diagnostic_source::Compiler,
            .severity = Diagnostic_severity::Error,
            .message = std::pmr::string{message},
            .related_information = {},
        };
    }

    bool are_compatible_types(
        std::optional<h::Type_reference> const& first,
        std::optional<h::Type_reference> const& second
    )
    {
        if (!first.has_value() || !second.has_value())
            return false;
        
        if (is_pointer(first.value()) && is_null_pointer_type(second.value()))
            return true;

        if (is_null_pointer_type(first.value()) && is_pointer(second.value()))
            return true;

        return first == second;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_statement(
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        std::optional<h::Type_reference> const& expected_statement_type,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<std::optional<h::Type_reference>> expression_types{temporaries_allocator};
        expression_types.resize(statement.expressions.size(), std::nullopt);

        for (std::size_t expression_index = 0; expression_index < statement.expressions.size(); ++expression_index)
        {
            h::Expression const& expression = statement.expressions[expression_index];
            
            expression_types[expression_index] = get_expression_type(
                core_module,
                scope,
                statement,
                expression,
                declaration_database
            );
        }

        Validate_expression_parameters parameters
        {
            .core_module = core_module,
            .scope = scope,
            .statement = statement,
            .expected_statement_type = expected_statement_type,
            .expression_types = expression_types,
            .expression_index = 0,
            .declaration_database = declaration_database,
            .temporaries_allocator = temporaries_allocator
        };

        for (std::size_t index = 0; index < statement.expressions.size(); ++index)
        {
            std::size_t const expression_index = statement.expressions.size() - 1 - index;
            parameters.expression_index = expression_index;

            std::pmr::vector<h::compiler::Diagnostic> diagnostics = validate_expression(
                parameters
            );

            if (!diagnostics.empty())
                return diagnostics;
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_expression(
        Validate_expression_parameters const& parameters
    )
    {
        h::Expression const& expression = parameters.statement.expressions[parameters.expression_index];

        if (std::holds_alternative<h::Access_expression>(expression.data))
        {
            h::Access_expression const& value = std::get<h::Access_expression>(expression.data);
            return validate_access_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Binary_expression>(expression.data))
        {
            h::Binary_expression const& value = std::get<h::Binary_expression>(expression.data);
            return validate_binary_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Call_expression>(expression.data))
        {
            h::Call_expression const& value = std::get<h::Call_expression>(expression.data);
            return validate_call_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Instantiate_expression>(expression.data))
        {
            h::Instantiate_expression const& value = std::get<h::Instantiate_expression>(expression.data);
            return validate_instantiate_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Unary_expression>(expression.data))
        {
            h::Unary_expression const& value = std::get<h::Unary_expression>(expression.data);
            return validate_unary_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Variable_declaration_expression>(expression.data))
        {
            h::Variable_declaration_expression const& value = std::get<h::Variable_declaration_expression>(expression.data);
            return validate_variable_declaration_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Variable_declaration_with_type_expression>(expression.data))
        {
            h::Variable_declaration_with_type_expression const& value = std::get<h::Variable_declaration_with_type_expression>(expression.data);
            return validate_variable_declaration_with_type_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Variable_expression>(expression.data))
        {
            h::Variable_expression const& value = std::get<h::Variable_expression>(expression.data);
            return validate_variable_expression(parameters, value, expression.source_range);
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_access_expression(
        Validate_expression_parameters const& parameters,
        h::Access_expression const& access_expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& left_hand_side_type = parameters.expression_types[access_expression.expression.expression_index];

        if (left_hand_side_type.has_value())
        {
            std::optional<Declaration> const declaration_optional = h::find_underlying_declaration(
                parameters.declaration_database,
                left_hand_side_type.value()
            );
            if (declaration_optional.has_value())
            {
                Declaration const& declaration = declaration_optional.value();

                if (std::holds_alternative<h::Enum_declaration const*>(declaration.data))
                {
                    h::Enum_declaration const& enum_declaration = *std::get<h::Enum_declaration const*>(declaration.data);

                    auto const location = std::find_if(
                        enum_declaration.values.begin(),
                        enum_declaration.values.end(),
                        [&](h::Enum_value const& enum_value) -> bool { return enum_value.name == access_expression.member_name; }
                    );
                    if (location == enum_declaration.values.end())
                    {
                        std::pmr::string const enum_full_name = h::parser::format_type_reference(parameters.core_module, left_hand_side_type.value(), parameters.temporaries_allocator, parameters.temporaries_allocator);

                        return
                        {
                            create_error_diagnostic(
                                parameters.core_module.source_file_path,
                                source_range,
                                std::format(
                                    "Member '{}' does not exist in the type '{}'.",
                                    access_expression.member_name,
                                    enum_full_name
                                )
                            )
                        };
                    }
                }
                else if (std::holds_alternative<h::Struct_declaration const*>(declaration.data))
                {
                    h::Struct_declaration const& struct_declaration = *std::get<h::Struct_declaration const*>(declaration.data);
                    
                    auto const location = std::find(
                        struct_declaration.member_names.begin(),
                        struct_declaration.member_names.end(),
                        access_expression.member_name
                    );
                    if (location == struct_declaration.member_names.end())
                    {
                        std::pmr::string const struct_full_name = h::parser::format_type_reference(parameters.core_module, left_hand_side_type.value(), parameters.temporaries_allocator, parameters.temporaries_allocator);

                        return
                        {
                            create_error_diagnostic(
                                parameters.core_module.source_file_path,
                                source_range,
                                std::format(
                                    "Member '{}' does not exist in the type '{}'.",
                                    access_expression.member_name,
                                    struct_full_name
                                )
                            )
                        };
                    }
                }
                else if (std::holds_alternative<h::Union_declaration const*>(declaration.data))
                {
                    h::Union_declaration const& union_declaration = *std::get<h::Union_declaration const*>(declaration.data);
                    
                    auto const location = std::find(
                        union_declaration.member_names.begin(),
                        union_declaration.member_names.end(),
                        access_expression.member_name
                    );
                    if (location == union_declaration.member_names.end())
                    {
                        std::pmr::string const union_full_name = h::parser::format_type_reference(parameters.core_module, left_hand_side_type.value(), parameters.temporaries_allocator, parameters.temporaries_allocator);

                        return
                        {
                            create_error_diagnostic(
                                parameters.core_module.source_file_path,
                                source_range,
                                std::format(
                                    "Member '{}' does not exist in the type '{}'.",
                                    access_expression.member_name,
                                    union_full_name
                                )
                            )
                        };
                    }
                }
                else
                {
                    // TODO error
                    // TODO what about function constructors and struct constructors?
                }
            }
        }
        else
        {
            h::Expression const& left_hand_side_expression = parameters.statement.expressions[access_expression.expression.expression_index];

            if (std::holds_alternative<h::Variable_expression>(left_hand_side_expression.data))
            {
                h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(left_hand_side_expression.data);

                // Try enum:
                {
                    std::optional<Declaration> const declaration_optional = find_underlying_declaration(
                        parameters.declaration_database,
                        parameters.core_module.name,
                        variable_expression.name
                    );
                    if (declaration_optional.has_value())
                    {
                        if (std::holds_alternative<h::Enum_declaration const*>(declaration_optional->data))
                        {
                            h::Enum_declaration const& enum_declaration = *std::get<h::Enum_declaration const*>(declaration_optional->data);

                            auto const location = std::find_if(
                                enum_declaration.values.begin(),
                                enum_declaration.values.end(),
                                [&](h::Enum_value const& enum_value) -> bool { return enum_value.name == access_expression.member_name; }
                            );
                            if (location == enum_declaration.values.end())
                            {
                                return
                                {
                                    create_error_diagnostic(
                                        parameters.core_module.source_file_path,
                                        source_range,
                                        std::format(
                                            "Member '{}' does not exist in the type '{}'.",
                                            access_expression.member_name,
                                            enum_declaration.name
                                        )
                                    )
                                };
                            }
                        }
                    }
                }

                // Check declaration inside imported module:
                {
                    Import_module_with_alias const* const import_alias = find_import_module_with_alias(
                        parameters.core_module,
                        variable_expression.name
                    );
                    if (import_alias != nullptr)
                    {
                        std::optional<Declaration> const declaration_optional = find_underlying_declaration(
                            parameters.declaration_database,
                            import_alias->module_name,
                            access_expression.member_name
                        );

                        if (!declaration_optional.has_value())
                        {
                            return
                            {
                                create_error_diagnostic(
                                    parameters.core_module.source_file_path,
                                    source_range,
                                    std::format(
                                        "Declaration '{}' does not exist in the module '{}' (alias '{}').",
                                        access_expression.member_name,
                                        import_alias->module_name,
                                        variable_expression.name
                                    )
                                )
                            };
                        }
                    }
                }
            }
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_binary_expression(
        Validate_expression_parameters const& parameters,
        h::Binary_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& left_hand_side_type_optional = parameters.expression_types[expression.left_hand_side.expression_index];
        std::optional<h::Type_reference> const& right_hand_side_type_optional = parameters.expression_types[expression.right_hand_side.expression_index];
        
        if (!are_compatible_types(left_hand_side_type_optional, right_hand_side_type_optional))
        {
            std::pmr::string const left_hand_side_type_name = h::parser::format_type_reference(parameters.core_module, left_hand_side_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);
            std::pmr::string const right_hand_side_type_name = h::parser::format_type_reference(parameters.core_module, right_hand_side_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    std::format(
                        "Binary expression requires both operands to be of the same type. Left side type '{}' does not match right hand side type '{}'.",
                        left_hand_side_type_name,
                        right_hand_side_type_name
                    )
                )
            };
        }

        if (!left_hand_side_type_optional.has_value() || !right_hand_side_type_optional.has_value())
            return {};

        std::optional<h::Type_reference> const type_optional = get_underlying_type(parameters.declaration_database, left_hand_side_type_optional.value());
        if (!type_optional.has_value())
            return {};
        
        h::Type_reference const& type = type_optional.value();

        if (is_bitwise_binary_operation(expression.operation))
        {
            if (!is_integer(type) && !is_byte(type))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Binary operation '{}' can only be applied to integers or bytes.",
                            h::parser::binary_operation_symbol_to_string(expression.operation)
                        )
                    )
                };
            }
        }
        else if (is_equality_binary_operation(expression.operation))
        {
            if (is_pointer(type) || is_null_pointer_type(type))
            {
                h::Type_reference const& right_hand_side_type = right_hand_side_type_optional.value();

                if (!is_pointer(right_hand_side_type) && !is_null_pointer_type(right_hand_side_type))
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            source_range,
                            std::format(
                                "Binary operation '{}' can only be applied to numbers, bytes or booleans.",
                                h::parser::binary_operation_symbol_to_string(expression.operation)
                            )
                        )
                    };
                }
            }
            else if (!is_integer(type) && !is_floating_point(type) && !is_byte(type) && !is_bool(type) && !is_c_bool(type))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Binary operation '{}' can only be applied to numbers, bytes or booleans.",
                            h::parser::binary_operation_symbol_to_string(expression.operation)
                        )
                    )
                };
            }
        }
        else if (is_comparison_binary_operation(expression.operation))
        {
            if (!is_integer(type) && !is_floating_point(type))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Binary operation '{}' can only be applied to numeric types.",
                            h::parser::binary_operation_symbol_to_string(expression.operation)
                        )
                    )
                };
            }
        }
        else if (is_logical_binary_operation(expression.operation))
        {
            if (!is_bool(type) && !is_c_bool(type))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Binary operation '{}' can only be applied to a boolean value.",
                            h::parser::binary_operation_symbol_to_string(expression.operation)
                        )
                    )
                };
            }
        }
        else if (is_numeric_binary_operation(expression.operation))
        {
            if (!is_integer(type) && !is_floating_point(type))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Binary operation '{}' can only be applied to numeric types.",
                            h::parser::binary_operation_symbol_to_string(expression.operation)
                        )
                    )
                };
            }
        }
        else if (expression.operation == h::Binary_operation::Has)
        {
            if (!is_enum_type(parameters.declaration_database, type))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Binary operation 'has' can only be applied to enum values.",
                            h::parser::binary_operation_symbol_to_string(expression.operation)
                        )
                    )
                };
            }
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_call_expression(
        Validate_expression_parameters const& parameters,
        h::Call_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& callable_type_optional = parameters.expression_types[expression.expression.expression_index];

        if (!callable_type_optional.has_value() || !is_function_pointer(callable_type_optional.value()))
        {
            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    "Expression does not evaluate to a callable expression."
                )
            };
        }

        h::Function_pointer_type const& function_pointer_type = std::get<h::Function_pointer_type>(callable_type_optional->data);

        if (function_pointer_type.type.is_variadic)
        {
            if (expression.arguments.size() < function_pointer_type.type.input_parameter_types.size())
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Function expects at least {} arguments, but {} were provided.",
                            function_pointer_type.type.input_parameter_types.size(),
                            expression.arguments.size()
                        )
                    )
                };  
            }
        }
        else if (expression.arguments.size() != function_pointer_type.type.input_parameter_types.size())
        {
            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    std::format(
                        "Function expects {} arguments, but {} were provided.",
                        function_pointer_type.type.input_parameter_types.size(),
                        expression.arguments.size()
                    )
                )
            };
        }

        std::pmr::vector<Diagnostic> diagnostics{parameters.temporaries_allocator};

        for (std::size_t argument_index = 0; argument_index < function_pointer_type.type.input_parameter_types.size(); ++argument_index)
        {
            std::uint64_t const expression_index = expression.arguments[argument_index].expression_index;
            std::optional<h::Type_reference> const& argument_type_optional = parameters.expression_types[expression_index];
            
            h::Type_reference const& parameter_type = function_pointer_type.type.input_parameter_types[argument_index];

            if (!are_compatible_types(argument_type_optional, parameter_type))
            {
                std::optional<Source_range> const argument_source_range = parameters.statement.expressions[expression_index].source_range;
                std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, argument_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);
                std::pmr::string const expected_type_name = h::parser::format_type_reference(parameters.core_module, parameter_type, parameters.temporaries_allocator, parameters.temporaries_allocator);

                diagnostics.push_back(
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            argument_source_range,
                            std::format(
                                "Argument {} type is '{}' but '{}' was provided.",
                                argument_index,
                                expected_type_name,
                                provided_type_name
                            )
                        )
                    }
                );
            }
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_instantiate_expression(
        Validate_expression_parameters const& parameters,
        h::Instantiate_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        for (std::size_t member_index = 1; member_index < expression.members.size(); ++member_index)
        {
            h::Instantiate_member_value_pair const& pair = expression.members[member_index];

            auto const duplicate_location = std::find_if(
                expression.members.begin(),
                expression.members.begin() + member_index,
                [&](h::Instantiate_member_value_pair const& other_pair) -> bool
                {
                    return pair.member_name == other_pair.member_name;
                }
            );

            if (duplicate_location != expression.members.begin() + member_index)
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        create_sub_source_range(pair.source_range, 0, pair.member_name.size()),
                        std::format(
                            "Duplicate instantiate member '{}'.",
                            pair.member_name
                        )
                    )
                };
            }
        }

        std::optional<h::Type_reference> const type_to_instantiate = get_type_to_instantiate(parameters, expression);
        if (!type_to_instantiate.has_value())
        {
            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    "Could not deduce type to instantiate."
                )
            };
        }

        std::optional<Declaration> const declaration_optional = find_underlying_declaration(
            parameters.declaration_database,
            type_to_instantiate.value()
        );
        if (!declaration_optional.has_value())
        {
            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    "Could not find declaration of type to instantiate."
                )
            };
        }

        Declaration const& declaration = declaration_optional.value();

        std::pmr::vector<Declaration_member_info> const member_infos = get_declaration_member_infos(declaration, parameters.temporaries_allocator);

        std::size_t previous_original_index = 0;

        for (std::size_t member_index = 0; member_index < expression.members.size(); ++member_index)
        {
            h::Instantiate_member_value_pair const& pair = expression.members[member_index];

            auto const location = std::find_if(
                member_infos.begin(),
                member_infos.end(),
                [&](Declaration_member_info const& member_info) -> bool
                {
                    return pair.member_name == member_info.member_name;
                }
            );

            if (location == member_infos.end())
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        create_sub_source_range(pair.source_range, 0, pair.member_name.size()),
                        std::format(
                            "'{}.{}' does not exist.",
                            h::parser::format_type_reference(parameters.core_module, type_to_instantiate, parameters.temporaries_allocator, parameters.temporaries_allocator),
                            pair.member_name
                        )
                    )
                };
            }

            h::Type_reference const& member_type = location->member_type;

            std::optional<h::Type_reference> const assigned_value_type = get_expression_type(
                parameters.core_module,
                parameters.scope,
                pair.value,
                parameters.declaration_database
            );

            if (!are_compatible_types(member_type, assigned_value_type))
            {
                std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, assigned_value_type, parameters.temporaries_allocator, parameters.temporaries_allocator);
                std::pmr::string const expected_type_name = h::parser::format_type_reference(parameters.core_module, member_type, parameters.temporaries_allocator, parameters.temporaries_allocator);

                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        get_statement_source_range(pair.value),
                        std::format(
                            "Cannot assign value of type '{}' to member '{}.{}' of type '{}'.",
                            provided_type_name,
                            h::parser::format_type_reference(parameters.core_module, type_to_instantiate, parameters.temporaries_allocator, parameters.temporaries_allocator),
                            pair.member_name,
                            expected_type_name
                        )
                    )
                };
            }

            std::size_t const original_index = std::distance(member_infos.begin(), location);
            if (member_index > 0)
            {
                if (original_index < previous_original_index)
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            source_range,
                            "Instantiate members are not sorted. They must appear in the order they were declarated in the struct declaration."
                        )
                    };
                }
            }
            previous_original_index = original_index;
        }

        if (expression.type == Instantiate_expression_type::Explicit)
        {
            if (expression.members.size() != member_infos.size())
            {
                std::pmr::vector<h::compiler::Diagnostic> diagnostics{parameters.temporaries_allocator};

                for (std::size_t member_index = 0; member_index < member_infos.size(); ++member_index)
                {
                    Declaration_member_info const& member_info = member_infos[member_index];

                    auto const location = std::find_if(
                        expression.members.begin(),
                        expression.members.end(),
                        [&](h::Instantiate_member_value_pair const& pair) -> bool
                        {
                            return pair.member_name == member_info.member_name;
                        }
                    );

                    if (location == expression.members.end())
                    {
                        diagnostics.push_back(
                            create_error_diagnostic(
                                parameters.core_module.source_file_path,
                                source_range,
                                std::format(
                                    "'{}.{}' is not set. Explicit instantiate expression requires all members to be set.",
                                    h::parser::format_type_reference(parameters.core_module, type_to_instantiate, parameters.temporaries_allocator, parameters.temporaries_allocator),
                                    member_info.member_name
                                )
                            )
                        );
                    }
                }

                return diagnostics;
            }
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_unary_expression(
        Validate_expression_parameters const& parameters,
        h::Unary_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& operand_type_optional = parameters.expression_types[expression.expression.expression_index];

        if (!operand_type_optional.has_value())
            return {}; // TODO error

        std::optional<h::Type_reference> const type_optional = get_underlying_type(parameters.declaration_database, operand_type_optional.value());
        if (!type_optional.has_value())
            return {}; // TODO error
        
        h::Type_reference const& type = type_optional.value();

        switch (expression.operation)
        {
            case Unary_operation::Not:
            {
                if (!is_bool(type))
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            create_sub_source_range(source_range, 0, 1),
                            std::format(
                                "Cannot apply unary operation '{}' to expression.",
                                h::parser::unary_operation_symbol_to_string(expression.operation)
                            )
                        )
                    };
                }
                break;
            }
            case Unary_operation::Bitwise_not:
            {
                if (!is_integer(type) && !is_byte(type))
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            create_sub_source_range(source_range, 0, 1),
                            std::format(
                                "Cannot apply unary operation '{}' to expression.",
                                h::parser::unary_operation_symbol_to_string(expression.operation)
                            )
                        )
                    };
                }
                break;
            }
            case Unary_operation::Minus:
            {
                if (!is_integer(type) && !is_floating_point(type))
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            create_sub_source_range(source_range, 0, 1),
                            std::format(
                                "Cannot apply unary operation '{}' to expression.",
                                h::parser::unary_operation_symbol_to_string(expression.operation)
                            )
                        )
                    };
                }
                break;
            }
            case Unary_operation::Indirection:
            {
                if (!is_non_void_pointer(type))
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            create_sub_source_range(source_range, 0, 1),
                            std::format(
                                "Cannot apply unary operation '{}' to expression.",
                                h::parser::unary_operation_symbol_to_string(expression.operation)
                            )
                        )
                    };
                }
                break;
            }
            case Unary_operation::Address_of:
            {
                Expression const& operand_expression = parameters.statement.expressions[expression.expression.expression_index];
                bool const is_temporary = !std::holds_alternative<h::Variable_expression>(operand_expression.data);
                if (is_temporary)
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            create_sub_source_range(source_range, 0, 1),
                            std::format(
                                "Cannot apply unary operation '{}' to expression.",
                                h::parser::unary_operation_symbol_to_string(expression.operation)
                            )
                        )
                    };
                }
                break;
            }
            default:
                break;
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_variable_declaration_expression(
        Validate_expression_parameters const& parameters,
        h::Variable_declaration_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        Variable const* const variable = find_variable_from_scope(
            parameters.scope,
            expression.name
        );
        if (variable != nullptr)
        {
            std::optional<h::Source_range> const& name_source_range = create_sub_source_range(
                source_range,
                expression.is_mutable ? 8 : 4,
                expression.name.size()
            );

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    name_source_range,
                    std::format("Duplicate variable name '{}'.", expression.name)
                )
            };
        }

        std::optional<h::Type_reference> const& type_optional = parameters.expression_types[expression.right_hand_side.expression_index];
        if (!type_optional.has_value())
        {
            h::Expression const& right_hand_side = parameters.statement.expressions[expression.right_hand_side.expression_index];

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    right_hand_side.source_range,
                    std::format("Cannot assign expression of type 'void' to variable '{}'.", expression.name)
                )
            };
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_variable_declaration_with_type_expression(
        Validate_expression_parameters const& parameters,
        h::Variable_declaration_with_type_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_variable_expression(
        Validate_expression_parameters const& parameters,
        h::Variable_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        Variable const* const variable = find_variable_from_scope(
            parameters.scope,
            expression.name
        );
        if (variable != nullptr)
            return {};

        std::optional<Declaration> const declaration_optional = find_declaration(
            parameters.declaration_database,
            parameters.core_module.name,
            expression.name
        );
        if (declaration_optional.has_value())
            return {};

        Import_module_with_alias const* const import_alias = find_import_module_with_alias(
            parameters.core_module,
            expression.name
        );
        if (import_alias != nullptr)
            return {};

        return
        {
            create_error_diagnostic(
                parameters.core_module.source_file_path,
                source_range,
                std::format("Variable '{}' does not exist.", expression.name)
            )
        };
    }

    bool is_enum_type(
        Declaration_database const& declaration_database,
        Type_reference const& type
    )
    {
        std::optional<Declaration> const declaration = find_underlying_declaration(
            declaration_database,
            type
        );
        if (!declaration.has_value())
            return false;
        
        return std::holds_alternative<Enum_declaration const*>(declaration->data);
    }

    std::optional<h::Source_range> get_statement_source_range(
        h::Statement const& statement
    )
    {
        if (statement.expressions.empty())
            return std::nullopt;

        h::Expression const& first_expression = statement.expressions.front();
        return first_expression.source_range;
    }

    std::optional<h::Source_range> create_sub_source_range(
        std::optional<h::Source_range> const& source_range,
        std::uint32_t const start_index,
        std::uint32_t const count
    )
    {
        if (!source_range.has_value())
            return std::nullopt;

        h::Source_range const& original_source_range = source_range.value();

        return h::Source_range
        {
            .start = {
                .line = original_source_range.start.line,
                .column = original_source_range.start.column + start_index
            },
            .end = {
                .line = original_source_range.start.line,
                .column = original_source_range.start.column + start_index + count
            }
        };
    }

    std::optional<h::Type_reference> get_type_to_instantiate(
        Validate_expression_parameters const& parameters,
        h::Instantiate_expression const& expression
    )
    {
        if (parameters.statement.expressions.size() <= 1 && parameters.expected_statement_type.has_value())
            return parameters.expected_statement_type;

        // TODO search expressions: return, call

        return std::nullopt;
    }

    std::pmr::vector<Declaration_member_info> get_declaration_member_infos(
        Declaration const& declaration,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<Declaration_member_info> members{output_allocator};

        if (std::holds_alternative<Struct_declaration const*>(declaration.data))
        {
            Struct_declaration const& struct_declaration = *std::get<Struct_declaration const*>(declaration.data);

            members.reserve(struct_declaration.member_types.size());

            for (std::size_t member_index = 0; member_index < struct_declaration.member_types.size(); ++member_index)
            {
                Declaration_member_info member_info =
                {
                    .member_name = struct_declaration.member_names[member_index],
                    .member_type = struct_declaration.member_types[member_index],
                };

                members.push_back(std::move(member_info));
            }
        }
        else if (std::holds_alternative<Union_declaration const*>(declaration.data))
        {
            Union_declaration const& union_declaration = *std::get<Union_declaration const*>(declaration.data);

            members.reserve(union_declaration.member_types.size());

            for (std::size_t member_index = 0; member_index < union_declaration.member_types.size(); ++member_index)
            {
                Declaration_member_info member_info =
                {
                    .member_name = union_declaration.member_names[member_index],
                    .member_type = union_declaration.member_types[member_index],
                };

                members.push_back(std::move(member_info));
            }
        }

        return members;
    }

    Variable const* find_variable_from_scope(
        Scope const& scope,
        std::string_view const name
    )
    {
        auto const location = std::find_if(
            scope.variables.begin(),
            scope.variables.end(),
            [&](Variable const& variable) -> bool { return variable.name == name; }
        );
        if (location == scope.variables.end())
            return nullptr;

        return &(*location);
    }
}
