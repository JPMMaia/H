module;

#include <array>
#include <cstddef>
#include <filesystem>
#include <format>
#include <memory_resource>
#include <optional>
#include <span>
#include <unordered_set>
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

    h::compiler::Diagnostic create_warning_diagnostic(
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
            .severity = Diagnostic_severity::Warning,
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

        if (is_function_pointer(first.value()) && is_null_pointer_type(second.value()))
            return true;

        if (is_null_pointer_type(first.value()) && is_function_pointer(second.value()))
            return true;

        return first == second;
    }

    std::array<std::string_view, 14> get_reserved_keywords()
    {
        return
        {
            "Byte",
            "Int8",
            "Int16",
            "Int32",
            "Int64",
            "Uint8",
            "Uint16",
            "Uint32",
            "Uint64",
            "Float16",
            "Float32",
            "Float64",
            "true",
            "false",
        };
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_module(
        h::Module const& core_module,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        // TODO validate module name

        {
            std::pmr::vector<h::compiler::Diagnostic> const diagnostics = validate_imports(
                core_module,
                declaration_database,
                temporaries_allocator
            );
            if (!diagnostics.empty())
                return diagnostics;
        }

        {
            std::pmr::vector<h::compiler::Diagnostic> const diagnostics = validate_type_references(
                core_module,
                declaration_database,
                temporaries_allocator
            );
            if (!diagnostics.empty())
                return diagnostics;
        }

        {
            std::pmr::vector<h::compiler::Diagnostic> const diagnostics = validate_declarations(
                core_module,
                declaration_database,
                temporaries_allocator
            );
            if (!diagnostics.empty())
                return diagnostics;
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_imports(
        h::Module const& core_module,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        std::pmr::unordered_set<std::string_view> all_names{temporaries_allocator};

        for (Import_module_with_alias const& import_module : core_module.dependencies.alias_imports)
        {
            if (all_names.contains(import_module.alias))
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        create_sub_source_range(
                            import_module.source_range,
                            11 + import_module.module_name.size(),
                            import_module.alias.size()
                        ),
                        std::format("Duplicate import alias '{}'.", import_module.alias)
                    )
                );
            }
            else
            {
                all_names.insert(import_module.alias);
            }

            auto const location = declaration_database.map.find(import_module.module_name);
            if (location == declaration_database.map.end())
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        create_sub_source_range(
                            import_module.source_range,
                            7,
                            import_module.module_name.size()
                        ),
                        std::format("Cannot find module '{}'.", import_module.module_name)
                    )
                );
            }
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_type_references(
        h::Module const& core_module,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        auto const process_type_reference = [&](
            std::string_view const declaration_name,
            h::Type_reference const& type
        ) -> bool
        {
            std::pmr::vector<h::compiler::Diagnostic> const current_diagnostics = validate_type_reference(
                core_module,
                type,
                declaration_database,
                temporaries_allocator
            );

            if (!current_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), current_diagnostics.begin(), current_diagnostics.end());

            return false;
        };

        visit_type_references_recursively_with_declaration_name(core_module, process_type_reference);

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_type_reference(
        h::Module const& core_module,
        h::Type_reference const& type,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        if (is_custom_type_reference(type))
        {   
            return validate_custom_type_reference(
                core_module,
                type,
                declaration_database,
                temporaries_allocator
            );
        }
        else if (std::holds_alternative<h::Integer_type>(type.data))
        {
            return validate_integer_type(
                core_module,
                type,
                declaration_database,
                temporaries_allocator
            );
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_custom_type_reference(
        h::Module const& core_module,
        h::Type_reference const& type,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::optional<Declaration> const declaration = find_declaration(
            declaration_database,
            type
        );

        if (!declaration.has_value())
        {
            std::pmr::string const type_name = h::parser::format_type_reference(core_module, type, temporaries_allocator, temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    core_module.source_file_path,
                    type.source_range,
                    std::format("Type '{}' does not exist.", type_name)
                )
            };
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_integer_type(
        h::Module const& core_module,
        h::Type_reference const& type,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Integer_type const& integer_type = std::get<h::Integer_type>(type.data);

        if (integer_type.number_of_bits != 8 && integer_type.number_of_bits != 16 && integer_type.number_of_bits != 32 && integer_type.number_of_bits != 64)
        {
            std::pmr::string const type_name = h::parser::format_type_reference(core_module, type, temporaries_allocator, temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    core_module.source_file_path,
                    type.source_range,
                    std::format("Type '{}' does not exist.", type_name)
                )
            };
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_declarations(
        h::Module const& core_module,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        std::pmr::unordered_set<std::string_view> all_names{temporaries_allocator};

        std::array<std::string_view, 14> const reserved_keywords = get_reserved_keywords();

        auto const process_declaration_name = [&](
            std::string_view const name,
            std::optional<Source_location> const& source_location
        ) -> void
        {
            if (all_names.contains(name))
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        create_source_range_from_source_location(source_location, name.size()),
                        std::format("Duplicate declaration name '{}'.", name)
                    )
                );
            }
            else
            {
                all_names.insert(name);
            }

            auto const location = std::find(reserved_keywords.begin(), reserved_keywords.end(), name);
            if (location != reserved_keywords.end())
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        create_source_range_from_source_location(source_location, name.size()),
                        std::format("Invalid declaration name '{}' which is a reserved keyword.", name)
                    )
                );
            }
        };

        for (Alias_type_declaration const& declaration : core_module.export_declarations.alias_type_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);
        }

        for (Alias_type_declaration const& declaration : core_module.internal_declarations.alias_type_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);
        }

        for (Enum_declaration const& declaration : core_module.export_declarations.enum_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::pmr::vector<h::compiler::Diagnostic> declaration_diagnostics = validate_enum_declaration(
                core_module,
                declaration,
                declaration_database,
                temporaries_allocator
            );
            
            if (!declaration_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), declaration_diagnostics.begin(), declaration_diagnostics.end());
        }

        for (Enum_declaration const& declaration : core_module.internal_declarations.enum_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::pmr::vector<h::compiler::Diagnostic> const declaration_diagnostics = validate_enum_declaration(
                core_module,
                declaration,
                declaration_database,
                temporaries_allocator
            );
            
            if (!declaration_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), declaration_diagnostics.begin(), declaration_diagnostics.end());
        }

        for (Global_variable_declaration const& declaration : core_module.export_declarations.global_variable_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::pmr::vector<h::compiler::Diagnostic> const declaration_diagnostics = validate_global_variable_declaration(
                core_module,
                declaration,
                declaration_database,
                temporaries_allocator
            );
            
            if (!declaration_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), declaration_diagnostics.begin(), declaration_diagnostics.end());
        }

        for (Global_variable_declaration const& declaration : core_module.internal_declarations.global_variable_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::pmr::vector<h::compiler::Diagnostic> const declaration_diagnostics = validate_global_variable_declaration(
                core_module,
                declaration,
                declaration_database,
                temporaries_allocator
            );
            
            if (!declaration_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), declaration_diagnostics.begin(), declaration_diagnostics.end());
        }

        for (Struct_declaration const& declaration : core_module.export_declarations.struct_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::pmr::vector<h::compiler::Diagnostic> const declaration_diagnostics = validate_struct_declaration(
                core_module,
                declaration,
                declaration_database,
                temporaries_allocator
            );

            if (!declaration_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), declaration_diagnostics.begin(), declaration_diagnostics.end());
        }

        for (Struct_declaration const& declaration : core_module.internal_declarations.struct_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::pmr::vector<h::compiler::Diagnostic> const declaration_diagnostics = validate_struct_declaration(
                core_module,
                declaration,
                declaration_database,
                temporaries_allocator
            );

            if (!declaration_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), declaration_diagnostics.begin(), declaration_diagnostics.end());
        }

        for (Union_declaration const& declaration : core_module.export_declarations.union_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::pmr::vector<h::compiler::Diagnostic> const declaration_diagnostics = validate_union_declaration(
                core_module,
                declaration,
                declaration_database,
                temporaries_allocator
            );

            if (!declaration_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), declaration_diagnostics.begin(), declaration_diagnostics.end());
        }

        for (Union_declaration const& declaration : core_module.internal_declarations.union_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::pmr::vector<h::compiler::Diagnostic> const declaration_diagnostics = validate_union_declaration(
                core_module,
                declaration,
                declaration_database,
                temporaries_allocator
            );

            if (!declaration_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), declaration_diagnostics.begin(), declaration_diagnostics.end());
        }

        for (Function_declaration const& declaration : core_module.export_declarations.function_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::optional<Function_definition const*> const definition = find_function_definition(core_module, declaration.name);

            std::pmr::vector<h::compiler::Diagnostic> const function_diagnostics = validate_function(
                core_module,
                declaration,
                definition.has_value() ? definition.value() : nullptr,
                declaration_database,
                temporaries_allocator
            );

            if (!function_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), function_diagnostics.begin(), function_diagnostics.end());
        }

        for (Function_declaration const& declaration : core_module.internal_declarations.function_declarations)
        {
            process_declaration_name(declaration.name, declaration.source_location);

            std::optional<Function_definition const*> const definition = find_function_definition(core_module, declaration.name);

            std::pmr::vector<h::compiler::Diagnostic> const function_diagnostics = validate_function(
                core_module,
                declaration,
                definition.has_value() ? definition.value() : nullptr,
                declaration_database,
                temporaries_allocator
            );

            if (!function_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), function_diagnostics.begin(), function_diagnostics.end());
        }

        for (Function_constructor const& declaration : core_module.export_declarations.function_constructors)
        {
            process_declaration_name(declaration.name, declaration.source_location);
        }

        for (Function_constructor const& declaration : core_module.internal_declarations.function_constructors)
        {
            process_declaration_name(declaration.name, declaration.source_location);
        }

        for (Type_constructor const& declaration : core_module.export_declarations.type_constructors)
        {
            process_declaration_name(declaration.name, declaration.source_location);
        }

        for (Type_constructor const& declaration : core_module.internal_declarations.type_constructors)
        {
            process_declaration_name(declaration.name, declaration.source_location);
        }

        sort_diagnostics(diagnostics);
        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_enum_declaration(
        h::Module const& core_module,
        h::Enum_declaration const& declaration,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        std::pmr::unordered_set<std::string_view> all_names{temporaries_allocator};

        Scope scope;

        Type_reference const int32_type = create_integer_type_type_reference(32, true);

        for (Enum_value const& value : declaration.values)
        {
            if (all_names.contains(value.name))
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        create_source_range_from_source_location(value.source_location, value.name.size()),
                        std::format("Duplicate enum value name '{}.{}'.", declaration.name, value.name)
                    )
                );
            }
            else
            {
                all_names.insert(value.name);
            }

            if (value.value.has_value())
            {
                h::Statement const& statement = value.value.value();

                std::pmr::vector<std::optional<h::Type_reference>> const expression_types = calculate_expression_types_of_statement(
                    core_module,
                    nullptr,
                    scope,
                    statement,
                    std::nullopt,
                    declaration_database,
                    temporaries_allocator
                );

                bool const is_compile_time = is_computable_at_compile_time(
                    core_module,
                    scope,
                    statement,
                    expression_types,
                    declaration_database
                );

                if (!is_compile_time)
                {
                    diagnostics.push_back(
                        create_error_diagnostic(
                            core_module.source_file_path,
                            get_statement_source_range(statement),
                            std::format("The value of '{}.{}' must be computable at compile-time.", declaration.name, value.name)
                        )
                    );
                    continue;
                }

                std::optional<Type_reference> const type = get_expression_type(
                    core_module,
                    nullptr,
                    scope,
                    statement,
                    std::nullopt,
                    declaration_database
                );
                
                if (!type.has_value() || type.value() != int32_type)
                {
                    diagnostics.push_back(
                        create_error_diagnostic(
                            core_module.source_file_path,
                            get_statement_source_range(statement),
                            std::format("Enum value '{}.{}' must be a Int32 type.", declaration.name, value.name)
                        )
                    );
                }
            }

            scope.variables.push_back(
                {
                    .name = value.name,
                    .type = int32_type,
                    .is_compile_time = true,
                }
            );
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_global_variable_declaration(
        h::Module const& core_module,
        h::Global_variable_declaration const& declaration,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<std::optional<h::Type_reference>> const expression_types = calculate_expression_types_of_statement(
            core_module,
            nullptr,
            {},
            declaration.initial_value,
            declaration.type,
            declaration_database,
            temporaries_allocator
        );

        bool const is_compile_time = is_computable_at_compile_time(
            core_module,
            {},
            declaration.initial_value,
            expression_types,
            declaration_database
        );

        if (!is_compile_time)
        {
            return
            {
                create_error_diagnostic(
                    core_module.source_file_path,
                    get_statement_source_range(declaration.initial_value),
                    std::format("The value of '{}' must be computable at compile-time.", declaration.name)
                )
            };
        }

        if (declaration.type.has_value())
        {
            std::optional<h::Type_reference> const& type_reference =
                !expression_types.empty() ?
                expression_types[0] :
                std::optional<h::Type_reference>{std::nullopt};

            if (!are_compatible_types(declaration.type, type_reference))
            {
                std::pmr::string const provided_type_name = h::parser::format_type_reference(core_module, type_reference, temporaries_allocator, temporaries_allocator);
                std::pmr::string const expected_type_name = h::parser::format_type_reference(core_module, declaration.type, temporaries_allocator, temporaries_allocator);

                return
                {
                    create_error_diagnostic(
                        core_module.source_file_path,
                        get_statement_source_range(declaration.initial_value),
                        std::format("Expression type '{}' does not match expected type '{}'.", provided_type_name, expected_type_name)
                    )
                };
            }
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_struct_declaration(
        h::Module const& core_module,
        h::Struct_declaration const& declaration,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        std::pmr::unordered_set<std::string_view> all_names{temporaries_allocator};

        for (std::size_t member_index = 0; member_index < declaration.member_names.size(); ++member_index)
        {
            std::string_view const member_name = declaration.member_names[member_index];

            std::optional<Source_position> const member_source_position =
                declaration.member_source_positions.has_value() ?
                declaration.member_source_positions.value()[member_index] :
                std::optional<Source_position>{std::nullopt};

            if (all_names.contains(member_name))
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        create_source_range_from_source_position(member_source_position, member_name.size()),
                        std::format("Duplicate struct member name '{}.{}'.", declaration.name, member_name)
                    )
                );
            }
            else
            {
                all_names.insert(member_name);
            }

            h::Type_reference const& member_type = declaration.member_types[member_index];
            h::Statement const& member_default_value = declaration.member_default_values[member_index];

            std::pmr::vector<std::optional<h::Type_reference>> const expression_types = calculate_expression_types_of_statement(
                core_module,
                nullptr,
                {},
                member_default_value,
                member_type,
                declaration_database,
                temporaries_allocator
            );

            bool const is_compile_time = is_computable_at_compile_time(
                core_module,
                {},
                member_default_value,
                expression_types,
                declaration_database
            );

            if (!is_compile_time)
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        get_statement_source_range(member_default_value),
                        std::format("The value of '{}.{}' must be computable at compile-time.", declaration.name, member_name)
                    )
                );
                continue;
            }

            std::optional<Type_reference> const& default_value_type =
                !expression_types.empty() ?
                expression_types[0] :
                std::optional<Type_reference>{std::nullopt};

            if (!are_compatible_types(default_value_type, member_type))
            {
                std::pmr::string const provided_type_name = h::parser::format_type_reference(core_module, default_value_type, temporaries_allocator, temporaries_allocator);
                std::pmr::string const expected_type_name = h::parser::format_type_reference(core_module, member_type, temporaries_allocator, temporaries_allocator);

                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        get_statement_source_range(member_default_value),
                        std::format(
                            "Expression type '{}' does not match expected type '{}'.",
                            provided_type_name,
                            expected_type_name
                        )
                    )
                );
            }
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_union_declaration(
        h::Module const& core_module,
        h::Union_declaration const& declaration,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        std::pmr::unordered_set<std::string_view> all_names{temporaries_allocator};

        for (std::size_t member_index = 0; member_index < declaration.member_names.size(); ++member_index)
        {
            std::string_view const member_name = declaration.member_names[member_index];

            std::optional<Source_position> const member_source_position =
                declaration.member_source_positions.has_value() ?
                declaration.member_source_positions.value()[member_index] :
                std::optional<Source_position>{std::nullopt};

            if (all_names.contains(member_name))
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        create_source_range_from_source_position(member_source_position, member_name.size()),
                        std::format("Duplicate union member name '{}.{}'.", declaration.name, member_name)
                    )
                );
            }
            else
            {
                all_names.insert(member_name);
            }
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_function(
        h::Module const& core_module,
        h::Function_declaration const& declaration,
        h::Function_definition const* const definition,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        // TODO validate parameters

        {
            Scope scope
            {
                .variables{temporaries_allocator}
            };

            add_function_parameters_to_scope(
                scope,
                declaration.input_parameter_names,
                declaration.type.input_parameter_types
            );

            std::pmr::vector<h::compiler::Diagnostic> pre_condition_diagnostics = validate_function_contracts(
                core_module,
                declaration,
                scope,
                declaration.preconditions,
                declaration_database,
                temporaries_allocator
            );
            if (!pre_condition_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), pre_condition_diagnostics.begin(), pre_condition_diagnostics.end());

            add_function_parameters_to_scope(
                scope,
                declaration.output_parameter_names,
                declaration.type.output_parameter_types
            );

            std::pmr::vector<h::compiler::Diagnostic> post_condition_diagnostics = validate_function_contracts(
                core_module,
                declaration,
                scope,
                declaration.postconditions,
                declaration_database,
                temporaries_allocator
            );
            if (!post_condition_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), post_condition_diagnostics.begin(), post_condition_diagnostics.end());
        }

        if (definition != nullptr)
        {
            Scope scope
            {
                .variables{temporaries_allocator}
            };

            add_function_parameters_to_scope(
                scope,
                declaration.input_parameter_names,
                declaration.type.input_parameter_types
            );

            std::pmr::vector<h::compiler::Diagnostic> const definition_diagnostics = validate_statements(
                core_module,
                &declaration,
                scope,
                definition->statements,
                declaration_database,
                temporaries_allocator
            );
            if (!definition_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), definition_diagnostics.begin(), definition_diagnostics.end());
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_function_contracts(
        h::Module const& core_module,
        Function_declaration const& function_declaration,
        h::compiler::Scope const& scope,
        std::span<h::Function_condition const> const function_conditions,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        for (h::Function_condition const& function_condition : function_conditions)
        {
            std::pmr::vector<h::compiler::Diagnostic> statement_diagnostics = validate_statement(
                core_module,
                &function_declaration,
                scope,
                function_condition.condition,
                create_bool_type_reference(),
                declaration_database,
                temporaries_allocator
            );
            if (!statement_diagnostics.empty())
            {
                diagnostics.insert(diagnostics.end(), statement_diagnostics.begin(), statement_diagnostics.end());
                continue;
            }

            std::optional<h::Type_reference> const condition_type_optional = get_expression_type(
                core_module,
                &function_declaration,
                scope,
                function_condition.condition,
                std::nullopt,
                declaration_database
            );

            if (!condition_type_optional.has_value() || (!is_bool(condition_type_optional.value()) && !is_c_bool(condition_type_optional.value())))
            {
                std::pmr::string const provided_type_name = h::parser::format_type_reference(core_module, condition_type_optional, temporaries_allocator, temporaries_allocator);

                diagnostics.push_back(
                    create_error_diagnostic(
                        core_module.source_file_path,
                        get_statement_source_range(function_condition.condition),
                        std::format("Expression type '{}' does not match expected type 'Bool'.", provided_type_name)
                    )
                );
            }

            auto const process_expression = [&](h::Expression const& expression, h::Statement const& statement) -> bool
            {
                bool const is_mutable_global_constant = is_mutable_global_variable(
                    core_module.name,
                    expression,
                    declaration_database
                );
                if (is_mutable_global_constant)
                {
                    diagnostics.push_back(
                        create_error_diagnostic(
                            core_module.source_file_path,
                            expression.source_range,
                            "Cannot use mutable global variable in function preconditions and postconditions. Consider making the global constant."
                        )
                    );
                }

                return false;
            };

            visit_expressions(
                function_condition.condition,
                process_expression
            );
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_statements(
        h::Module const& core_module,
        Function_declaration const* const function_declaration,
        Scope const& scope,
        std::span<h::Statement const> const statements,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        Scope new_scope = scope;

        for (std::size_t statement_index = 0; statement_index < statements.size(); ++statement_index)
        {
            h::Statement const& statement = statements[statement_index];

            std::pmr::vector<h::compiler::Diagnostic> const statement_diagnostics = validate_statement(
                core_module,
                function_declaration,
                new_scope,
                statement,
                std::nullopt,
                declaration_database,
                temporaries_allocator
            );
            if (!statement_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), statement_diagnostics.begin(), statement_diagnostics.end());

            if (!statement.expressions.empty())
            {
                h::Expression const& expression = statement.expressions[0];
                
                if (std::holds_alternative<h::Variable_declaration_expression>(expression.data))
                {
                    h::Variable_declaration_expression const& variable_declaration = std::get<h::Variable_declaration_expression>(expression.data);

                    std::optional<h::Type_reference> variable_type = get_expression_type(
                        core_module,
                        function_declaration,
                        new_scope,
                        statement,
                        statement.expressions[variable_declaration.right_hand_side.expression_index],
                        std::nullopt,
                        declaration_database
                    );

                    if (variable_type.has_value())
                    {
                        new_scope.variables.push_back(
                            Variable
                            {
                                .name = variable_declaration.name,
                                .type = std::move(variable_type.value()),
                                .is_compile_time = false,
                            }
                        );
                    }
                }
                else if (std::holds_alternative<h::Variable_declaration_with_type_expression>(expression.data))
                {
                    h::Variable_declaration_with_type_expression const& variable_declaration_with_type = std::get<h::Variable_declaration_with_type_expression>(expression.data);

                    new_scope.variables.push_back(
                        Variable
                        {
                            .name = variable_declaration_with_type.name,
                            .type = variable_declaration_with_type.type,
                            .is_compile_time = false,
                        }
                    );
                }
            }
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_statement(
        h::Module const& core_module,
        Function_declaration const* const function_declaration,
        Scope const& scope,
        h::Statement const& statement,
        std::optional<h::Type_reference> const& expected_statement_type,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<std::optional<h::Type_reference>> const expression_types = calculate_expression_types_of_statement(
            core_module,
            function_declaration,
            scope,
            statement,
            expected_statement_type,
            declaration_database,
            temporaries_allocator
        );

        Validate_expression_parameters parameters
        {
            .core_module = core_module,
            .function_declaration = function_declaration,
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
        else if (std::holds_alternative<h::Assert_expression>(expression.data))
        {
            h::Assert_expression const& value = std::get<h::Assert_expression>(expression.data);
            return validate_assert_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Assignment_expression>(expression.data))
        {
            h::Assignment_expression const& value = std::get<h::Assignment_expression>(expression.data);
            return validate_assignment_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Binary_expression>(expression.data))
        {
            h::Binary_expression const& value = std::get<h::Binary_expression>(expression.data);
            return validate_binary_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Block_expression>(expression.data))
        {
            h::Block_expression const& value = std::get<h::Block_expression>(expression.data);
            return validate_block_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Call_expression>(expression.data))
        {
            h::Call_expression const& value = std::get<h::Call_expression>(expression.data);
            return validate_call_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Cast_expression>(expression.data))
        {
            h::Cast_expression const& value = std::get<h::Cast_expression>(expression.data);
            return validate_cast_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::For_loop_expression>(expression.data))
        {
            h::For_loop_expression const& value = std::get<h::For_loop_expression>(expression.data);
            return validate_for_loop_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::If_expression>(expression.data))
        {
            h::If_expression const& value = std::get<h::If_expression>(expression.data);
            return validate_if_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Instantiate_expression>(expression.data))
        {
            h::Instantiate_expression const& value = std::get<h::Instantiate_expression>(expression.data);
            return validate_instantiate_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Return_expression>(expression.data))
        {
            h::Return_expression const& value = std::get<h::Return_expression>(expression.data);
            return validate_return_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Switch_expression>(expression.data))
        {
            h::Switch_expression const& value = std::get<h::Switch_expression>(expression.data);
            return validate_switch_expression(parameters, value, expression.source_range);
        }
        else if (std::holds_alternative<h::Ternary_condition_expression>(expression.data))
        {
            h::Ternary_condition_expression const& value = std::get<h::Ternary_condition_expression>(expression.data);
            return validate_ternary_condition_expression(parameters, value, expression.source_range);
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
        else if (std::holds_alternative<h::While_loop_expression>(expression.data))
        {
            h::While_loop_expression const& value = std::get<h::While_loop_expression>(expression.data);
            return validate_while_loop_expression(parameters, value, expression.source_range);
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

                std::pmr::vector<Declaration_member_info> const member_infos = get_declaration_member_infos(
                    declaration,
                    parameters.temporaries_allocator
                );

                auto const member_location = std::find_if(
                    member_infos.begin(),
                    member_infos.end(),
                    [&](Declaration_member_info const& member_info) -> bool { return member_info.member_name == access_expression.member_name; }
                );
                if (member_location == member_infos.end())
                {
                    std::optional<Declaration> const function_declaration = find_underlying_declaration(
                        parameters.declaration_database,
                        declaration.module_name,
                        access_expression.member_name
                    );
                    if (!function_declaration.has_value() || (!std::holds_alternative<h::Function_declaration const*>(function_declaration->data) && !std::holds_alternative<h::Function_constructor const*>(function_declaration->data)))
                    {
                        std::pmr::string const type_full_name = h::parser::format_type_reference(parameters.core_module, left_hand_side_type.value(), parameters.temporaries_allocator, parameters.temporaries_allocator);

                        return
                        {
                            create_error_diagnostic(
                                parameters.core_module.source_file_path,
                                source_range,
                                std::format(
                                    "Member '{}' does not exist in the type '{}'.",
                                    access_expression.member_name,
                                    type_full_name
                                )
                            )
                        };
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

    std::pmr::vector<h::compiler::Diagnostic> validate_assert_expression(
        Validate_expression_parameters const& parameters,
        h::Assert_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const condition_type_optional = get_expression_type(
            parameters.core_module,
            parameters.function_declaration,
            parameters.scope,
            expression.statement,
            std::nullopt,
            parameters.declaration_database
        );

        if (!condition_type_optional.has_value() || (!is_bool(condition_type_optional.value()) && !is_c_bool(condition_type_optional.value())))
        {
            std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, condition_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return 
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    get_statement_source_range(expression.statement),
                    std::format(
                        "Expression type '{}' does not match expected type 'Bool'.",
                        provided_type_name
                    )
                )
            };
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_binary_operation(
        Validate_expression_parameters const& parameters,
        h::Expression_index const left_hand_side,
        h::Expression_index const right_hand_side,
        h::Binary_operation const operation,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& left_hand_side_type_optional = parameters.expression_types[left_hand_side.expression_index];
        std::optional<h::Type_reference> const& right_hand_side_type_optional = parameters.expression_types[right_hand_side.expression_index];

        if (!left_hand_side_type_optional.has_value() || !right_hand_side_type_optional.has_value())
            return {};

        std::optional<h::Type_reference> const type_optional = get_underlying_type(parameters.declaration_database, left_hand_side_type_optional.value());
        if (!type_optional.has_value())
            return {};
        
        h::Type_reference const& type = type_optional.value();

        if (is_bit_shift_binary_operation(operation))
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
                            h::parser::binary_operation_symbol_to_string(operation)
                        )
                    )
                };
            }
        }
        else if (is_bitwise_binary_operation(operation))
        {
            if (!is_integer(type) && !is_byte(type) && !is_enum_type(parameters.declaration_database, type))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Binary operation '{}' can only be applied to integers, bytes or enums.",
                            h::parser::binary_operation_symbol_to_string(operation)
                        )
                    )
                };
            }
        }
        else if (is_equality_binary_operation(operation))
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
                                h::parser::binary_operation_symbol_to_string(operation)
                            )
                        )
                    };
                }
            }
            else if (!is_integer(type) && !is_floating_point(type) && !is_byte(type) && !is_bool(type) && !is_c_bool(type) && !is_enum_type(parameters.declaration_database, type))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Binary operation '{}' can only be applied to numbers, bytes, booleans or enums.",
                            h::parser::binary_operation_symbol_to_string(operation)
                        )
                    )
                };
            }
        }
        else if (is_comparison_binary_operation(operation))
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
                            h::parser::binary_operation_symbol_to_string(operation)
                        )
                    )
                };
            }
        }
        else if (is_logical_binary_operation(operation))
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
                            h::parser::binary_operation_symbol_to_string(operation)
                        )
                    )
                };
            }
        }
        else if (is_numeric_binary_operation(operation))
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
                            h::parser::binary_operation_symbol_to_string(operation)
                        )
                    )
                };
            }
        }
        else if (operation == h::Binary_operation::Has)
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
                            h::parser::binary_operation_symbol_to_string(operation)
                        )
                    )
                };
            }
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_assignment_expression(
        Validate_expression_parameters const& parameters,
        h::Assignment_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& left_hand_side_type_optional = parameters.expression_types[expression.left_hand_side.expression_index];
        std::optional<h::Type_reference> const& right_hand_side_type_optional = parameters.expression_types[expression.right_hand_side.expression_index];
        
        if (!are_compatible_types(left_hand_side_type_optional, right_hand_side_type_optional))
        {
            h::Expression const& right_hand_side_expression = parameters.statement.expressions[expression.right_hand_side.expression_index];
            std::pmr::string const left_hand_side_type_name = h::parser::format_type_reference(parameters.core_module, left_hand_side_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);
            std::pmr::string const right_hand_side_type_name = h::parser::format_type_reference(parameters.core_module, right_hand_side_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    right_hand_side_expression.source_range,
                    std::format(
                        "Expected type is '{}' but got '{}'.",
                        left_hand_side_type_name,
                        right_hand_side_type_name
                    )
                )
            };
        }

        if (expression.additional_operation.has_value())
        {
            std::pmr::vector<h::compiler::Diagnostic> diagnostics = validate_binary_operation(
                parameters,
                expression.left_hand_side,
                expression.right_hand_side,
                expression.additional_operation.value(),
                source_range
            );

            if (!diagnostics.empty())
                return diagnostics;
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

        return validate_binary_operation(
            parameters,
            expression.left_hand_side,
            expression.right_hand_side,
            expression.operation,
            source_range
        );
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_block_expression(
        Validate_expression_parameters const& parameters,
        h::Block_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        return validate_statements(
            parameters.core_module,
            parameters.function_declaration,
            parameters.scope,
            expression.statements,
            parameters.declaration_database,
            parameters.temporaries_allocator
        );
    }

    h::Function_constructor const* find_function_constructor_using_call_expression(
        std::string_view const current_module_name,
        Declaration_database const& declaration_database,
        Scope const& scope,
        h::Statement const& statement,
        h::Call_expression const& expression
    )
    {
        h::Expression const& left_side_expression = statement.expressions[expression.expression.expression_index];

        if (std::holds_alternative<h::Access_expression>(left_side_expression.data))
        {
            h::Access_expression const& access_expression = std::get<h::Access_expression>(left_side_expression.data);

            h::Expression const& access_left_side_expression = statement.expressions[access_expression.expression.expression_index];

            if (std::holds_alternative<h::Variable_expression>(access_left_side_expression.data))
            {
                h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(access_left_side_expression.data);
                // Left side can be a module alias or a variable name

                Variable const* const variable = find_variable_from_scope(
                    scope,
                    variable_expression.name
                );
                if (variable != nullptr)
                {
                    std::optional<std::string_view> const module_name = get_type_module_name(variable->type);
                    if (module_name.has_value())
                    {
                        std::optional<Declaration> const declaration = find_underlying_declaration(
                            declaration_database,
                            module_name.value(),
                            access_expression.member_name
                        );
                        if (declaration.has_value())
                        {
                            if (std::holds_alternative<h::Function_constructor const*>(declaration->data))
                                return std::get<h::Function_constructor const*>(declaration->data);
                        }
                    }

                    return nullptr;
                }

                // TODO import alias
            }
        }
        else if (std::holds_alternative<h::Variable_expression>(left_side_expression.data))
        {
            h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(left_side_expression.data);

            std::optional<Declaration> const declaration = find_underlying_declaration(declaration_database, current_module_name, variable_expression.name);
            if (declaration.has_value())
            {
                if (std::holds_alternative<h::Function_constructor const*>(declaration->data))
                    return std::get<h::Function_constructor const*>(declaration->data);
            }
        }

        return nullptr;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_call_expression(
        Validate_expression_parameters const& parameters,
        h::Call_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& callable_type_optional = parameters.expression_types[expression.expression.expression_index];

        Function_constructor const* const function_constructor = find_function_constructor_using_call_expression(
            parameters.core_module.name,
            parameters.declaration_database,
            parameters.scope,
            parameters.statement,
            expression
        );

        if (function_constructor != nullptr)
        {
            std::optional<Deduced_instance_call> const deduced_instance_call = deduce_instance_call_arguments(
                parameters.declaration_database,
                parameters.core_module,
                parameters.scope,
                parameters.statement,
                expression,
                parameters.temporaries_allocator
            );

            if (!deduced_instance_call.has_value())
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Cannot deduce arguments of implicit call of function constructor '{}'.",
                            function_constructor->name
                        )
                    )
                };
            }

            return {};
        }

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

        std::pmr::vector<Expression_index> const call_arguments = get_implicit_call_aguments(
            parameters.statement,
            expression,
            parameters.scope,
            parameters.declaration_database,
            parameters.temporaries_allocator
        );

        if (function_pointer_type.type.is_variadic)
        {
            if (call_arguments.size() < function_pointer_type.type.input_parameter_types.size())
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Function expects at least {} arguments, but {} were provided.",
                            function_pointer_type.type.input_parameter_types.size(),
                            call_arguments.size()
                        )
                    )
                };  
            }
        }
        else if (call_arguments.size() != function_pointer_type.type.input_parameter_types.size())
        {
            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    std::format(
                        "Function expects {} arguments, but {} were provided.",
                        function_pointer_type.type.input_parameter_types.size(),
                        call_arguments.size()
                    )
                )
            };
        }

        std::pmr::vector<Diagnostic> diagnostics{parameters.temporaries_allocator};

        for (std::size_t argument_index = 0; argument_index < function_pointer_type.type.input_parameter_types.size(); ++argument_index)
        {
            std::uint64_t const expression_index = call_arguments[argument_index].expression_index;
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

    std::pmr::vector<h::compiler::Diagnostic> validate_cast_expression(
        Validate_expression_parameters const& parameters,
        h::Cast_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& source_type_optional = parameters.expression_types[expression.source.expression_index];
        std::optional<Type_reference> const& underlying_destination_type = get_underlying_type(parameters.declaration_database, expression.destination_type);

        if (!source_type_optional.has_value() || !underlying_destination_type.has_value())
        {
            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    std::format(
                        "Cannot apply numeric cast from '{}' to '{}'.",
                        h::parser::format_type_reference(parameters.core_module, source_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator),
                        h::parser::format_type_reference(parameters.core_module, underlying_destination_type, parameters.temporaries_allocator, parameters.temporaries_allocator)
                    )
                )
            };
        }
        
        std::optional<Type_reference> const& underlying_source_type = get_underlying_type(parameters.declaration_database, source_type_optional.value());

        bool const is_source_numeric = 
            underlying_source_type.has_value() && 
            (is_number_or_c_number(underlying_source_type.value()) || is_enum_type(parameters.declaration_database, underlying_source_type.value()) || is_bool(underlying_destination_type.value()) || is_c_bool(underlying_destination_type.value()));
        
        bool const is_destination_numeric =
            underlying_destination_type.has_value() &&
            (is_number_or_c_number(underlying_destination_type.value()) || is_enum_type(parameters.declaration_database, underlying_destination_type.value()) || is_bool(underlying_destination_type.value()) || is_c_bool(underlying_destination_type.value()));

        if (!is_source_numeric || !is_destination_numeric)
        {
            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    std::format(
                        "Cannot apply numeric cast from '{}' to '{}'.",
                        h::parser::format_type_reference(parameters.core_module, underlying_source_type, parameters.temporaries_allocator, parameters.temporaries_allocator),
                        h::parser::format_type_reference(parameters.core_module, underlying_destination_type, parameters.temporaries_allocator, parameters.temporaries_allocator)
                    )
                )
            };
        }

        if (source_type_optional.value() == expression.destination_type)
        {
            return
            {
                create_warning_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    std::format(
                        "Numeric cast from '{}' to '{}'.",
                        h::parser::format_type_reference(parameters.core_module, source_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator),
                        h::parser::format_type_reference(parameters.core_module, expression.destination_type, parameters.temporaries_allocator, parameters.temporaries_allocator)
                    )
                )
            };
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_for_loop_expression(
        Validate_expression_parameters const& parameters,
        h::For_loop_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& range_begin_type_optional = parameters.expression_types[expression.range_begin.expression_index];

        if (!range_begin_type_optional.has_value() || (!is_integer(range_begin_type_optional.value()) && !is_floating_point(range_begin_type_optional.value())))
        {
            h::Expression const& range_begin_expression = parameters.statement.expressions[expression.range_begin.expression_index];
            std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, range_begin_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    range_begin_expression.source_range,
                    std::format(
                        "For loop range begin type '{}' is not a number.",
                        provided_type_name
                    )
                )
            };
        }

        Scope new_scope = parameters.scope;
        new_scope.variables.push_back(
            Variable
            {
                .name = expression.variable_name,
                .type = range_begin_type_optional.value(),
                .is_compile_time = false,
            }
        );

        {
            std::pmr::vector<h::compiler::Diagnostic> const range_end_statement_diagnostics = validate_statement(
                parameters.core_module,
                parameters.function_declaration,
                new_scope,
                expression.range_end,
                std::nullopt,
                parameters.declaration_database,
                parameters.temporaries_allocator
            );
            if (!range_end_statement_diagnostics.empty())
                return range_end_statement_diagnostics;
        }

        std::optional<h::Type_reference> const range_end_type_optional = get_expression_type(
            parameters.core_module,
            parameters.function_declaration,
            new_scope,
            expression.range_end,
            std::nullopt,
            parameters.declaration_database
        );

        if (!are_compatible_types(range_begin_type_optional, range_end_type_optional))
        {
            std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, range_end_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);
            std::pmr::string const expected_type_name = h::parser::format_type_reference(parameters.core_module, range_begin_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    get_statement_source_range(expression.range_end),
                    std::format(
                        "For loop range end type '{}' does not match range begin type '{}'.",
                        provided_type_name,
                        expected_type_name
                    )
                )
            };
        }

        if (expression.step_by.has_value())
        {
            std::optional<h::Type_reference> const& step_by_type_optional = parameters.expression_types[expression.step_by->expression_index];

            if (!are_compatible_types(range_begin_type_optional, step_by_type_optional))
            {
                h::Expression const& step_by_expression = parameters.statement.expressions[expression.step_by->expression_index];
                std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, step_by_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);
                std::pmr::string const expected_type_name = h::parser::format_type_reference(parameters.core_module, range_begin_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        step_by_expression.source_range,
                        std::format(
                            "For loop step_by type '{}' does not match range begin type '{}'.",
                            provided_type_name,
                            expected_type_name
                        )
                    )
                };
            }
        }

        {
            std::pmr::vector<h::compiler::Diagnostic> const statements_diagnostics = validate_statements(
                parameters.core_module,
                parameters.function_declaration,
                new_scope,
                expression.then_statements,
                parameters.declaration_database,
                parameters.temporaries_allocator
            );
            if (!statements_diagnostics.empty())
                return statements_diagnostics;
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_if_expression(
        Validate_expression_parameters const& parameters,
        h::If_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{parameters.temporaries_allocator};

        for (Condition_statement_pair const& pair : expression.series)
        {
            if (pair.condition.has_value())
            {
                std::pmr::vector<h::compiler::Diagnostic> const condition_diagnostics = validate_statement(
                    parameters.core_module,
                    parameters.function_declaration,
                    parameters.scope,
                    pair.condition.value(),
                    std::nullopt,
                    parameters.declaration_database,
                    parameters.temporaries_allocator
                );
                if (!condition_diagnostics.empty())
                    diagnostics.insert(diagnostics.end(), condition_diagnostics.begin(), condition_diagnostics.end());

                if (condition_diagnostics.empty())
                {
                    std::optional<h::Type_reference> const condition_type_optional = get_expression_type(
                        parameters.core_module,
                        parameters.function_declaration,
                        parameters.scope,
                        pair.condition.value(),
                        std::nullopt,
                        parameters.declaration_database
                    );

                    if (!condition_type_optional.has_value() || (!is_bool(condition_type_optional.value()) && !is_c_bool(condition_type_optional.value())))
                    {
                        std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, condition_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

                        diagnostics.push_back(
                            create_error_diagnostic(
                                parameters.core_module.source_file_path,
                                get_statement_source_range(pair.condition.value()),
                                std::format(
                                    "Expression type '{}' does not match expected type 'Bool'.",
                                    provided_type_name
                                )
                            )
                        );
                    }
                }

                std::pmr::vector<h::compiler::Diagnostic> const then_diagnostics = validate_statements(
                    parameters.core_module,
                    parameters.function_declaration,
                    parameters.scope,
                    pair.then_statements,
                    parameters.declaration_database,
                    parameters.temporaries_allocator
                );
                if (!then_diagnostics.empty())
                    diagnostics.insert(diagnostics.end(), then_diagnostics.begin(), then_diagnostics.end());
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

        std::optional<h::Type_reference> const type_to_instantiate = parameters.expression_types[parameters.expression_index];
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
                parameters.function_declaration,
                parameters.scope,
                pair.value,
                member_type,
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

    std::pmr::vector<h::compiler::Diagnostic> validate_return_expression(
        Validate_expression_parameters const& parameters,
        h::Return_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        if (parameters.function_declaration == nullptr)
            return {};

        std::optional<h::Type_reference> const expected_type = 
            !parameters.function_declaration->type.output_parameter_types.empty() ?
            std::optional<h::Type_reference>{parameters.function_declaration->type.output_parameter_types[0]} :
            std::optional<h::Type_reference>{std::nullopt};

        if (expression.expression.has_value())
        {
            std::optional<h::Type_reference> const& provided_type = parameters.expression_types[expression.expression->expression_index];

            if (!are_compatible_types(provided_type, expected_type))
            {
                std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, provided_type, parameters.temporaries_allocator, parameters.temporaries_allocator);
                std::pmr::string const expected_type_name = h::parser::format_type_reference(parameters.core_module, expected_type, parameters.temporaries_allocator, parameters.temporaries_allocator);

                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        source_range,
                        std::format(
                            "Function '{}' expects a return value of type '{}', but '{}' was provided.",
                            parameters.function_declaration->name,
                            expected_type_name,
                            provided_type_name
                        )
                    )
                };
            }
        }
        else
        {
            if (parameters.function_declaration != nullptr)
            {
                if (!parameters.function_declaration->type.output_parameter_types.empty())
                {
                    std::pmr::string const expected_type_name = h::parser::format_type_reference(parameters.core_module, expected_type, parameters.temporaries_allocator, parameters.temporaries_allocator);

                    return {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            source_range,
                            std::format(
                                "Function '{}' expects a return value of type '{}', but none was provided.",
                                parameters.function_declaration->name,
                                expected_type_name
                            )
                        )
                    };
                }
            }
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_switch_expression(
        Validate_expression_parameters const& parameters,
        h::Switch_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<Type_reference> const type_optional = parameters.expression_types[expression.value.expression_index];

        if (!type_optional.has_value() || (!is_enum_type(parameters.declaration_database, type_optional.value()) && !is_integer(type_optional.value())))
        {
            h::Expression const& value_expression = parameters.statement.expressions[expression.value.expression_index];
            std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    value_expression.source_range,
                    std::format(
                        "Switch condition type is '{}' but expected an integer or an enum value.",
                        provided_type_name
                    )
                )
            };
        }

        std::pmr::vector<h::compiler::Diagnostic> diagnostics{parameters.temporaries_allocator};

        std::size_t default_case_count = 0;

        for (Switch_case_expression_pair const& pair : expression.cases)
        {
            if (!pair.case_value.has_value())
            {
                default_case_count += 1;

                if (default_case_count > 1)
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            source_range,
                            "Switch expression cannot have more than one default case."
                        )
                    };
                }

                continue;
            }

            h::Expression const& case_value_expression = parameters.statement.expressions[pair.case_value->expression_index];
            std::optional<h::Type_reference> const case_value_type_optional = parameters.expression_types[pair.case_value->expression_index];

            if (!are_compatible_types(type_optional, case_value_type_optional))
            {
                std::pmr::string const expected_type_name = h::parser::format_type_reference(parameters.core_module, type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);
                std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, case_value_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

                diagnostics.push_back(
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        case_value_expression.source_range,
                        std::format(
                            "Switch case value type '{}' does not match switch condition type '{}'.",
                            provided_type_name,
                            expected_type_name
                        )
                    )
                );
            }
            else if (!is_computable_at_compile_time(case_value_expression, case_value_type_optional, parameters))
            {
                diagnostics.push_back(
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        case_value_expression.source_range,
                        "Switch case expression must be computable at compile-time, and evaluate to an integer or an enum value."
                    )
                );
            }

            {
                std::pmr::vector<h::compiler::Diagnostic> const statements_diagnostics = validate_statements(
                    parameters.core_module,
                    parameters.function_declaration,
                    parameters.scope,
                    pair.statements,
                    parameters.declaration_database,
                    parameters.temporaries_allocator
                );
                if (!statements_diagnostics.empty())
                    diagnostics.insert(diagnostics.end(), statements_diagnostics.begin(), statements_diagnostics.end());
            }
        }

        return diagnostics;
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_ternary_condition_expression(
        Validate_expression_parameters const& parameters,
        h::Ternary_condition_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        std::optional<h::Type_reference> const& condition_type_optional = parameters.expression_types[expression.condition.expression_index];

        if (!condition_type_optional.has_value() || (!is_bool(condition_type_optional.value()) && !is_c_bool(condition_type_optional.value())))
        {
            h::Expression const& condition_expression = parameters.statement.expressions[expression.condition.expression_index];
            std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, condition_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    condition_expression.source_range,
                    std::format(
                        "Expression type '{}' does not match expected type 'Bool'.",
                        provided_type_name
                    )
                )
            };
        }

        {
            std::pmr::vector<h::compiler::Diagnostic> diagnostics{parameters.temporaries_allocator};

            std::pmr::vector<h::compiler::Diagnostic> const then_statement_diagnostics = validate_statement(
                parameters.core_module,
                parameters.function_declaration,
                parameters.scope,
                expression.then_statement,
                std::nullopt,
                parameters.declaration_database,
                parameters.temporaries_allocator
            );
            if (!then_statement_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), then_statement_diagnostics.begin(), then_statement_diagnostics.end());

            std::pmr::vector<h::compiler::Diagnostic> const else_statement_diagnostics = validate_statement(
                parameters.core_module,
                parameters.function_declaration,
                parameters.scope,
                expression.else_statement,
                std::nullopt,
                parameters.declaration_database,
                parameters.temporaries_allocator
            );
            if (!else_statement_diagnostics.empty())
                diagnostics.insert(diagnostics.end(), else_statement_diagnostics.begin(), else_statement_diagnostics.end());

            if (!diagnostics.empty())
                return diagnostics;
        }

        std::optional<h::Type_reference> const then_type_optional = get_expression_type(
            parameters.core_module,
            parameters.function_declaration,
            parameters.scope,
            expression.then_statement,
            std::nullopt,
            parameters.declaration_database
        );

        std::optional<h::Type_reference> const else_type_optional = get_expression_type(
            parameters.core_module,
            parameters.function_declaration,
            parameters.scope,
            expression.else_statement,
            std::nullopt,
            parameters.declaration_database
        );

        if (!are_compatible_types(then_type_optional, else_type_optional))
        {
            std::pmr::string const then_type_name = h::parser::format_type_reference(parameters.core_module, then_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);
            std::pmr::string const else_type_name = h::parser::format_type_reference(parameters.core_module, else_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    source_range,
                    std::format(
                        "Ternary condition expression requires both branches to be of the same type. Left side type '{}' does not match right side type '{}'.",
                        then_type_name,
                        else_type_name
                    )
                )
            };
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
                // TODO should be possible to take address from access expression too
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
                else if (is_constant_global_variable(parameters.core_module.name, operand_expression, parameters.declaration_database))
                {
                    return
                    {
                        create_error_diagnostic(
                            parameters.core_module.source_file_path,
                            create_sub_source_range(source_range, 0, 1),
                            "Cannot take address of a global constant."
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
        
        h::Expression const& right_hand_side = parameters.statement.expressions[expression.right_hand_side.expression_index];
        h::Type_reference const& type = expression.type;

        if (std::holds_alternative<h::Instantiate_expression>(right_hand_side.data))
        {
            std::optional<Declaration> const declaration_optional = find_underlying_declaration(parameters.declaration_database, type);
            if (!declaration_optional.has_value() || (!std::holds_alternative<h::Struct_declaration const*>(declaration_optional->data) && !std::holds_alternative<h::Union_declaration const*>(declaration_optional->data)))
            {
                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        right_hand_side.source_range,
                        std::format(
                            "Cannot assign expression of type '{}' to variable '{}'. Expected struct or union type.",
                            h::parser::format_type_reference(parameters.core_module, type, parameters.temporaries_allocator, parameters.temporaries_allocator),
                            expression.name
                        )
                    )
                };
            }
        }
        else
        {
            std::optional<h::Type_reference> const& right_hand_side_type = get_expression_type(
                parameters.core_module,
                parameters.function_declaration,
                parameters.scope,
                parameters.statement,
                right_hand_side,
                type,
                parameters.declaration_database
            );

            if (!are_compatible_types(type, right_hand_side_type))
            {
                std::pmr::string const expected_type_name = h::parser::format_type_reference(parameters.core_module, type, parameters.temporaries_allocator, parameters.temporaries_allocator);
                std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, right_hand_side_type, parameters.temporaries_allocator, parameters.temporaries_allocator);

                return
                {
                    create_error_diagnostic(
                        parameters.core_module.source_file_path,
                        right_hand_side.source_range,
                        std::format(
                            "Expression type '{}' does not match expected type '{}'.",
                            provided_type_name,
                            expected_type_name
                        )
                    )
                };
            }
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

    std::pmr::vector<h::compiler::Diagnostic> validate_while_loop_expression(
        Validate_expression_parameters const& parameters,
        h::While_loop_expression const& expression,
        std::optional<h::Source_range> const& source_range
    )
    {
        {
            std::pmr::vector<h::compiler::Diagnostic> const condition_statement_diagnostics = validate_statement(
                parameters.core_module,
                parameters.function_declaration,
                parameters.scope,
                expression.condition,
                std::nullopt,
                parameters.declaration_database,
                parameters.temporaries_allocator
            );
            if (!condition_statement_diagnostics.empty())
                return condition_statement_diagnostics;
        }

        std::optional<h::Type_reference> const condition_type_optional = get_expression_type(
            parameters.core_module,
            parameters.function_declaration,
            parameters.scope,
            expression.condition,
            std::nullopt,
            parameters.declaration_database
        );

        if (!condition_type_optional.has_value() || (!is_bool(condition_type_optional.value()) && !is_c_bool(condition_type_optional.value())))
        {
            std::pmr::string const provided_type_name = h::parser::format_type_reference(parameters.core_module, condition_type_optional, parameters.temporaries_allocator, parameters.temporaries_allocator);

            return 
            {
                create_error_diagnostic(
                    parameters.core_module.source_file_path,
                    get_statement_source_range(expression.condition),
                    std::format(
                        "Expression type '{}' does not match expected type 'Bool'.",
                        provided_type_name
                    )
                )
            };
        }

        {
            std::pmr::vector<h::compiler::Diagnostic> const statements_diagnostics = validate_statements(
                parameters.core_module,
                parameters.function_declaration,
                parameters.scope,
                expression.then_statements,
                parameters.declaration_database,
                parameters.temporaries_allocator
            );
            if (!statements_diagnostics.empty())
                return statements_diagnostics;
        }

        return {};
    }

    std::pmr::vector<std::optional<h::Type_reference>> calculate_expression_types_of_statement(
        h::Module const& core_module,
        h::Function_declaration const* const function_declaration,
        Scope const& scope,
        h::Statement const& statement,
        std::optional<h::Type_reference> const expected_statement_type,
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
                function_declaration,
                scope,
                statement,
                expression,
                expected_statement_type,
                declaration_database
            );
        }

        return expression_types;
    }

    bool is_computable_at_compile_time(
        h::Expression const& expression,
        std::optional<h::Type_reference> const& expression_type,
        Validate_expression_parameters const& parameters
    )
    {
        return is_computable_at_compile_time(
            parameters.core_module,
            parameters.scope,
            parameters.statement,
            expression,
            expression_type,
            parameters.expression_types,
            parameters.declaration_database
        );
    }

    bool is_computable_at_compile_time(
        h::Module const& core_module,
        h::compiler::Scope const& scope,
        h::Statement const& statement,
        std::span<std::optional<h::Type_reference> const> const expression_types,
        Declaration_database const& declaration_database
    )
    {
        if (statement.expressions.empty())
            return true;

        h::Expression const& expression = statement.expressions[0];
        std::optional<h::Type_reference> const& expression_type = expression_types[0];

        return is_computable_at_compile_time(
            core_module,
            scope,
            statement,
            expression,
            expression_type,
            expression_types,
            declaration_database
        );
    }

    bool is_computable_at_compile_time(
        h::Module const& core_module,
        h::compiler::Scope const& scope,
        h::Statement const& statement,
        h::Expression_index const& expression_index,
        std::span<std::optional<h::Type_reference> const> const expression_types,
        Declaration_database const& declaration_database
    )
    {
        h::Expression const& expression = statement.expressions[expression_index.expression_index];
        std::optional<h::Type_reference> const& expression_type = expression_types[expression_index.expression_index];

        return is_computable_at_compile_time(
            core_module,
            scope,
            statement,
            expression,
            expression_type,
            expression_types,
            declaration_database
        );
    }

    bool is_computable_at_compile_time(
        h::Module const& core_module,
        h::compiler::Scope const& scope,
        h::Statement const& statement,
        h::Expression const& expression,
        std::optional<h::Type_reference> const& expression_type,
        std::span<std::optional<h::Type_reference> const> const expression_types,
        Declaration_database const& declaration_database
    )
    {
        if (std::holds_alternative<h::Access_expression>(expression.data))
        {
            if (expression_type.has_value() && is_enum_type(declaration_database, expression_type.value()))
            {
                return true;
            }
        }
        else if (std::holds_alternative<h::Binary_expression>(expression.data))
        {
            h::Binary_expression const& binary_expression = std::get<h::Binary_expression>(expression.data);

            bool const is_lhs_compile_time = is_computable_at_compile_time(
                core_module,
                scope,
                statement,
                binary_expression.left_hand_side,
                expression_types,
                declaration_database
            );
            if (!is_lhs_compile_time)
                return false;

            bool const is_rhs_compile_time = is_computable_at_compile_time(
                core_module,
                scope,
                statement,
                binary_expression.right_hand_side,
                expression_types,
                declaration_database
            );
            if (!is_rhs_compile_time)
                return false;

            return true;
        }
        else if (std::holds_alternative<h::Cast_expression>(expression.data))
        {
            return true;
        }
        else if (std::holds_alternative<h::Constant_expression>(expression.data))
        {
            return true;
        }
        else if (std::holds_alternative<h::Constant_array_expression>(expression.data))
        {
            h::Constant_array_expression const& constant_array_expression = std::get<h::Constant_array_expression>(expression.data);

            for (h::Statement const& element : constant_array_expression.array_data)
            {
                bool const is_compile_time = is_computable_at_compile_time(
                    core_module,
                    scope,
                    element,
                    expression_types,
                    declaration_database
                );
                if (!is_compile_time)
                    return false;
            }

            return true;
        }
        else if (std::holds_alternative<h::Null_pointer_expression>(expression.data))
        {
            return true;
        }
        else if (std::holds_alternative<h::Instantiate_expression>(expression.data))
        {
            h::Instantiate_expression const& instantiate_expression = std::get<h::Instantiate_expression>(expression.data);

            for (h::Instantiate_member_value_pair const& pair : instantiate_expression.members)
            {
                bool const is_compile_time = is_computable_at_compile_time(
                    core_module,
                    scope,
                    pair.value,
                    expression_types,
                    declaration_database
                );

                if (!is_compile_time)
                    return false;
            }

            return true;
        }
        else if (std::holds_alternative<h::Variable_expression>(expression.data))
        {
            h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(expression.data);
            Variable const* const variable = find_variable_from_scope(scope, variable_expression.name);
            if (variable == nullptr)
                return false;

            return variable->is_compile_time;
        }

        return false;
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

    Global_variable_declaration const* get_global_variable(
        std::string_view const current_module_name,
        h::Expression const& expression,
        Declaration_database const& declaration_database
    )
    {
        // TODO can also be access expression

        if (std::holds_alternative<h::Variable_expression>(expression.data))
        {
            h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(expression.data);

            std::optional<Declaration> const declaration = find_underlying_declaration(
                declaration_database,
                current_module_name,
                variable_expression.name
            );
            if (!declaration.has_value())
                return nullptr;

            if (std::holds_alternative<Global_variable_declaration const*>(declaration->data))
            {
                return std::get<Global_variable_declaration const*>(declaration->data);
            }
        }

        return nullptr;
    }

    bool is_constant_global_variable(
        std::string_view const current_module_name,
        h::Expression const& expression,
        Declaration_database const& declaration_database
    )
    {
        Global_variable_declaration const* const global_variable = get_global_variable(
            current_module_name,
            expression,
            declaration_database
        );
        if (global_variable == nullptr)
            return false;

        return !global_variable->is_mutable;
    }

    bool is_mutable_global_variable(
        std::string_view const current_module_name,
        h::Expression const& expression,
        Declaration_database const& declaration_database
    )
    {
        Global_variable_declaration const* const global_variable = get_global_variable(
            current_module_name,
            expression,
            declaration_database
        );
        if (global_variable == nullptr)
            return false;

        return global_variable->is_mutable;
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

    std::optional<h::Source_range> create_source_range_from_source_location(
        std::optional<h::Source_location> const& source_location,
        std::uint32_t const count
    )
    {
        if (!source_location.has_value())
            return std::nullopt;

        return h::Source_range
        {
            .start =
            {
                .line = source_location->line,
                .column = source_location->column
            },
            .end = 
            {
                .line = source_location->line,
                .column = source_location->column + count
            }
        };
    }

    std::optional<h::Source_range> create_source_range_from_source_position(
        std::optional<h::Source_position> const& source_position,
        std::uint32_t const count
    )
    {
        if (!source_position.has_value())
            return std::nullopt;

        return h::Source_range
        {
            .start =
            {
                .line = source_position->line,
                .column = source_position->column
            },
            .end = 
            {
                .line = source_position->line,
                .column = source_position->column + count
            }
        };
    }

    std::pmr::vector<Declaration_member_info> get_declaration_member_infos(
        Declaration const& declaration,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<Declaration_member_info> members{output_allocator};

        if (std::holds_alternative<Enum_declaration const*>(declaration.data))
        {
            Enum_declaration const& enum_declaration = *std::get<Enum_declaration const*>(declaration.data);

            members.reserve(enum_declaration.values.size());

            for (std::size_t member_index = 0; member_index < enum_declaration.values.size(); ++member_index)
            {
                Declaration_member_info member_info =
                {
                    .member_name = enum_declaration.values[member_index].name,
                    .member_type = create_custom_type_reference(declaration.module_name, enum_declaration.name),
                };

                members.push_back(std::move(member_info));
            }
        }
        else if (std::holds_alternative<Struct_declaration const*>(declaration.data))
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

    void add_function_parameters_to_scope(
        Scope& scope,
        std::span<std::pmr::string const> const parameter_names,
        std::span<Type_reference const> const parameter_types
    )
    {
        for (std::size_t index = 0; index < parameter_names.size(); ++index)
        {
            scope.variables.push_back(
                Variable
                {
                    .name = parameter_names[index],
                    .type = parameter_types[index],
                    .is_compile_time = false,
                }
            );
        }
    }

    std::optional<Expression_index> get_implicit_first_call_argument(
        h::Statement const& statement,
        h::Call_expression const& expression,
        Scope const& scope,
        Declaration_database const& declaration_database
    )
    {
        h::Expression const& left_side_expression = statement.expressions[expression.expression.expression_index];

        if (std::holds_alternative<h::Access_expression>(left_side_expression.data))
        {
            h::Access_expression const& access_expression = std::get<h::Access_expression>(left_side_expression.data);

            h::Expression const& left_side_access_expression = statement.expressions[access_expression.expression.expression_index];

            if (std::holds_alternative<h::Variable_expression>(left_side_access_expression.data))
            {
                h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(left_side_access_expression.data);

                Variable const* const variable = find_variable_from_scope(
                    scope,
                    variable_expression.name
                );
                if (variable != nullptr)
                {
                    std::optional<Declaration> const declaration = find_underlying_declaration(
                        declaration_database,
                        variable->type
                    );
                    if (declaration.has_value())
                    {
                        if (std::holds_alternative<Struct_declaration const*>(declaration->data))
                        {
                            Struct_declaration const& struct_declaration = *std::get<Struct_declaration const*>(declaration->data);

                            auto const member_location = std::find(
                                struct_declaration.member_names.begin(),
                                struct_declaration.member_names.end(),
                                access_expression.member_name
                            );

                            if (member_location != struct_declaration.member_names.end())
                                return std::nullopt;
                        }
                    }

                    return access_expression.expression;
                }
            }
        }

        return std::nullopt;
    }

    std::pmr::vector<Expression_index> get_implicit_call_aguments(
        h::Statement const& statement,
        h::Call_expression const& expression,
        Scope const& scope,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::optional<Expression_index> const implicit_first_argument = get_implicit_first_call_argument(
            statement,
            expression,
            scope,
            declaration_database
        );
        if (!implicit_first_argument.has_value())
            return std::pmr::vector<Expression_index>{expression.arguments, output_allocator};

        std::pmr::vector<Expression_index> output{output_allocator};
        output.reserve(1 + expression.arguments.size());

        output.push_back(implicit_first_argument.value());
        output.insert(output.end(), expression.arguments.begin(), expression.arguments.end());

        return output;
    }
}
