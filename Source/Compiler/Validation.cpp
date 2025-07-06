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

                if (std::holds_alternative<h::Struct_declaration const*>(declaration.data))
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
            else
            {
                h::Expression const& left_hand_side_expression = parameters.statement.expressions[access_expression.expression.expression_index];
                
                if (std::holds_alternative<h::Access_expression>(left_hand_side_expression.data))
                {
                    h::Access_expression const& access_module_expression = std::get<h::Access_expression>(left_hand_side_expression.data);

                    h::Expression const& module_expression = parameters.statement.expressions[access_module_expression.expression.expression_index];

                    if (std::holds_alternative<h::Variable_expression>(module_expression.data))
                    {
                        h::Variable_expression const& module_name_expression = std::get<h::Variable_expression>(module_expression.data);

                        std::optional<Declaration> const declaration_optional = find_underlying_declaration_using_import_alias(
                            parameters.declaration_database,
                            parameters.core_module,
                            module_name_expression.name,
                            access_module_expression.member_name
                        );
                        if (!declaration_optional.has_value())
                        {
                            // TODO error
                            return {};
                        }

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
                                return
                                {
                                    create_error_diagnostic(
                                        parameters.core_module.source_file_path,
                                        source_range,
                                        std::format(
                                            "Member '{}' does not exist in the type '{}.{}'.",
                                            access_expression.member_name,
                                            module_name_expression.name,
                                            enum_declaration.name
                                        )
                                    )
                                };
                            }
                        }
                    }
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
        std::optional<h::Type_reference> const& left_hand_side_type = parameters.expression_types[expression.left_hand_side.expression_index];
        std::optional<h::Type_reference> const& right_hand_side_type = parameters.expression_types[expression.right_hand_side.expression_index];
        
        if (!are_compatible_types(left_hand_side_type, right_hand_side_type))
        {
            std::pmr::string const left_hand_side_type_name = h::parser::format_type_reference(parameters.core_module, left_hand_side_type, parameters.temporaries_allocator, parameters.temporaries_allocator);
            std::pmr::string const right_hand_side_type_name = h::parser::format_type_reference(parameters.core_module, right_hand_side_type, parameters.temporaries_allocator, parameters.temporaries_allocator);

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

    Import_module_with_alias const* find_import_module_with_alias(
        h::Module const& core_module,
        std::string_view const alias_name
    )
    {
        auto const location = std::find_if(
            core_module.dependencies.alias_imports.begin(),
            core_module.dependencies.alias_imports.end(),
            [&](Import_module_with_alias const& import_alias) -> bool { return import_alias.alias == alias_name; }
        );
        if (location == core_module.dependencies.alias_imports.end())
            return nullptr;

        return &(*location);
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
