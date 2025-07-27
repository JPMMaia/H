module;

#include <format>
#include <memory_resource>
#include <vector>

#include <lsp/types.h>

module h.language_server.inlay_hints;

import h.compiler.analysis;
import h.core;
import h.core.declarations;
import h.core.types;
import h.language_server.core;
import h.parser.formatter;

namespace h::language_server
{
    std::pmr::vector<lsp::InlayHint> create_function_inlay_hints(
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        h::Function_definition const& function_definition,
        h::Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<lsp::InlayHint> output{temporaries_allocator};

        h::compiler::Scope scope
        {
            .variables{temporaries_allocator}
        };

        add_parameters_to_scope(
            scope,
            function_declaration.input_parameter_names,
            function_declaration.type.input_parameter_types
        );

        auto const process_statement = [&](h::Statement const& statement, h::compiler::Scope const& scope) -> void
        {
            if (statement.expressions.empty())
                return;

            h::Expression const& expression = statement.expressions[0];

            if (!expression.source_range.has_value())
                return;

            if (std::holds_alternative<h::Variable_declaration_expression>(expression.data))
            {
                h::Variable_declaration_expression const& variable_declaration = std::get<h::Variable_declaration_expression>(expression.data);

                std::optional<h::Type_reference> const variable_type = get_expression_type(
                    core_module,
                    &function_declaration,
                    scope,
                    statement,
                    statement.expressions[variable_declaration.right_hand_side.expression_index],
                    std::nullopt,
                    declaration_database
                );
                if (!variable_type.has_value())
                    return;

                std::uint32_t const offset =
                    variable_declaration.is_mutable ?
                    8 + variable_declaration.name.size() :
                    4 + variable_declaration.name.size();

                lsp::Position const position
                {
                    .line = expression.source_range->start.line - 1,
                    .character = expression.source_range->start.column + offset - 1,
                };

                std::vector<lsp::InlayHintLabelPart> label = create_inlay_hint_variable_type_label(
                    core_module,
                    declaration_database,
                    variable_type.value(),
                    temporaries_allocator
                );

                lsp::InlayHint inlay_hint
                {
                    .position = position,
                    .label = std::move(label),
                    .kind = lsp::InlayHintKind::Type,
                    .textEdits = std::nullopt,
                    .tooltip = std::nullopt,
                };

                output.push_back(std::move(inlay_hint));
            }
        };

        h::compiler::visit_statements_using_scope(
            core_module,
            &function_declaration,
            scope,
            function_definition.statements,
            declaration_database,
            process_statement
        );

        return output;
    }

    std::vector<lsp::InlayHintLabelPart> create_inlay_hint_variable_type_label(
        h::Module const& core_module,
        h::Declaration_database const& declaration_database,
        h::Type_reference const& type,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::string const type_name = h::parser::format_type_reference(
            core_module,
            type,
            temporaries_allocator,
            temporaries_allocator
        );

        lsp::InlayHintLabelPart first_part
        {
            .value = ": ",
        };

        lsp::InlayHintLabelPart second_part
        {
            .value = type_name.data(),
        };

        if (h::is_custom_type_reference(type))
        {
            std::optional<Declaration> const declaration = find_declaration(declaration_database, type);
            if (declaration.has_value())
            {
                std::optional<h::Source_location> const declaration_source_location = get_declaration_source_location(
                    declaration.value()
                );
                if (declaration_source_location.has_value() && declaration_source_location->file_path.has_value())
                {
                    second_part.location =
                    {
                        .uri = lsp::DocumentUri::fromPath(declaration_source_location->file_path->generic_string()),
                        .range = {
                            .start = {
                                .line = declaration_source_location->line - 1,
                                .character = declaration_source_location->column - 1,
                            },
                            .end = {
                                .line = declaration_source_location->line -1,
                                .character = declaration_source_location->column -1,
                            }
                        },
                    };
                }
            }
        }
        else
        {
            second_part.tooltip = std::format("Built-in type: {}", type_name);
        }

        return { first_part, second_part };
    }
}
