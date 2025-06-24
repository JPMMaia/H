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

        for (std::size_t expression_index = 0; expression_index < statement.expressions.size(); ++expression_index)
        {
            std::pmr::vector<h::compiler::Diagnostic> diagnostics = validate_expression(
                core_module,
                scope,
                statement,
                expression_types,
                expression_index,
                declaration_database,
                temporaries_allocator
            );

            if (!diagnostics.empty())
                return diagnostics;
        }

        return {};
    }

    std::pmr::vector<h::compiler::Diagnostic> validate_expression(
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        std::span<std::optional<h::Type_reference> const> expression_types,
        std::size_t const expression_index,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Expression const& expression = statement.expressions[expression_index];

        if (std::holds_alternative<h::Binary_expression>(expression.data))
        {
            h::Binary_expression const& value = std::get<h::Binary_expression>(expression.data);

            std::optional<h::Type_reference> const& left_hand_side_type = expression_types[value.left_hand_side.expression_index];
            std::optional<h::Type_reference> const& right_hand_side_type = expression_types[value.right_hand_side.expression_index];
            
            if (!are_compatible_types(left_hand_side_type, right_hand_side_type))
            {
                std::pmr::string const left_hand_side_type_name = h::parser::format_type_reference(core_module, left_hand_side_type, temporaries_allocator, temporaries_allocator);
                std::pmr::string const right_hand_side_type_name = h::parser::format_type_reference(core_module, right_hand_side_type, temporaries_allocator, temporaries_allocator);

                return
                {
                    create_error_diagnostic(
                        core_module.source_file_path,
                        expression.source_range,
                        std::format(
                            "Binary expression requires both operands to be of the same type. Left side type '{}' does not match right hand side type '{}'.",
                            left_hand_side_type_name,
                            right_hand_side_type_name
                        )
                    )
                };
            }
        }

        return {};
    }
}
