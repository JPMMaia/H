module;

#include <filesystem>
#include <optional>
#include <span>
#include <variant>
#include <vector>

#include <lsp/types.h>

module h.language_server.code_action;

import h.compiler.analysis;
import h.core;
import h.core.declarations;
import h.core.types;
import h.language_server.core;
import h.language_server.location;
import h.parser.formatter;
import h.parser.parse_tree;

namespace h::language_server
{
    static std::uint32_t count_consecutive_spaces(
        std::u8string_view const text,
        std::uint32_t const start_index
    )
    {
        std::uint32_t count = 0;

        for (std::uint32_t index = start_index; index < text.size(); ++index)
        {
            char8_t const current_character = text[index];

            if (current_character == ' ')
            {
                count += 1;
                continue;
            }

            break;
        }

        return count;
    }

    static std::uint32_t calculate_indendation(
        h::parser::Parse_tree const& parse_tree,
        h::Source_position const& source_position
    )
    {
        h::parser::Parse_node const root_node = get_root_node(parse_tree);

        h::parser::Parse_node const hint_node = h::parser::get_smallest_node_that_contains_position(
            root_node,
            source_position
        );

        std::uint32_t const start_byte = calculate_byte(
            parse_tree,
            hint_node,
            source_position
        );

        std::uint32_t current_byte = start_byte;
        while (current_byte > 0)
        {
            char8_t const current_character = parse_tree.text[current_byte];
            if (current_character == '\n' || current_character == '\r')
            {
                current_byte += 1;
                std::uint32_t const indentation = count_consecutive_spaces(
                    parse_tree.text,
                    current_byte
                );

                return indentation;
            }

            current_byte -= 1;
        }

        return 0;
    }

    static lsp::WorkspaceEdit create_workspace_edit_from_text_edit(
        std::filesystem::path const& source_file_path,
        h::Source_range const& range,
        std::string_view const new_text
    )
    {
        lsp::TextEdit text_edit
        {
            .range = to_lsp_range(range),
            .newText = std::string{new_text},
        };

        lsp::Array<lsp::TextEdit> text_edits
        {
            std::move(text_edit)
        };

        lsp::DocumentUri document_uri = lsp::DocumentUri::fromPath(source_file_path.generic_string());

        lsp::Map<lsp::DocumentUri, lsp::Array<lsp::TextEdit>> changes;
        changes[document_uri] = std::move(text_edits);

        lsp::WorkspaceEdit edit
        {
            .changes = std::move(changes),
        };

        return edit;
    }

    static lsp::CodeAction create_add_missing_instantiate_members_code_action(
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        h::Struct_declaration const& declaration,
        h::Expression const& original_expression,
        h::Instantiate_expression const& original_instantiate_expression
    )
    {
        h::Instantiate_expression new_instantiate_expression = original_instantiate_expression;

        for (std::size_t index = 0; index < declaration.member_names.size(); ++index)
        {
            std::string_view const& member_name = declaration.member_names[index];

            auto const location = std::find_if(
                new_instantiate_expression.members.begin(),
                new_instantiate_expression.members.end(),
                [&](Instantiate_member_value_pair const& member) -> bool { return member.member_name == member_name; }
            );

            if (location == new_instantiate_expression.members.end())
            {
                h::Statement const& default_value = declaration.member_default_values[index];

                new_instantiate_expression.members.push_back(
                    h::Instantiate_member_value_pair
                    {
                        .member_name = std::pmr::string{member_name},
                        .value = default_value,
                        .source_range = std::nullopt,
                    }
                );
            }
        }

        std::sort(
            new_instantiate_expression.members.begin(),
            new_instantiate_expression.members.end(),
            [&](Instantiate_member_value_pair const& first, Instantiate_member_value_pair const& second)
            {
                for (std::size_t index = 0; index < declaration.member_names.size(); ++index)
                {
                    std::string_view const& member_name = declaration.member_names[index];

                    if (member_name == first.member_name)
                        return true;
                    else if (member_name == second.member_name)
                        return false;
                }

                return false;
            }
        );

        std::uint32_t const indentation = calculate_indendation(
            parse_tree,
            original_expression.source_range->start
        );

        Statement const statement
        {
            .expressions = {
                h::Expression{.data = new_instantiate_expression}
            }
        };

        std::pmr::string const new_text = h::parser::format_statement(
            core_module,
            statement,
            indentation,
            false,
            {},
            {}
        );

        lsp::WorkspaceEdit edit = create_workspace_edit_from_text_edit(
            core_module.source_file_path.value(),
            original_expression.source_range.value(),
            new_text
        );

        lsp::CodeActionKind const kind =
            original_instantiate_expression.type == h::Instantiate_expression_type::Explicit ?
            lsp::CodeActionKind::QuickFix :
            lsp::CodeActionKind::RefactorRewrite;

        return lsp::CodeAction
        {
            .title = "Add missing instantiate members",
            .kind = kind,
            .diagnostics = std::nullopt, // TODO
            .isPreferred = true,
            .edit = std::move(edit),
        };
    }

    lsp::TextDocument_CodeActionResult compute_code_actions(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        lsp::Range const range,
        lsp::CodeActionContext const& context
    )
    {
        std::vector<std::variant<lsp::Command, lsp::CodeAction>> code_actions;

        h::Source_range const source_range = to_source_range(range);

        std::optional<h::Function> const function = find_function_that_contains_source_position(
            core_module,
            source_range.start
        );
        if (function.has_value())
        {
            std::optional<lsp::TextDocument_CodeActionResult> result_optional = std::nullopt;

            auto const process_statement = [&](h::Statement const& statement, h::compiler::Scope const& scope) -> bool
            {
                auto const process_expression = [&](h::Expression const& expression, h::Statement const& statement) -> bool
                {
                    if (!expression.source_range.has_value())
                        return false;

                    if (h::range_contains_position_inclusive(expression.source_range.value(), source_range.start))
                    {
                        if (std::holds_alternative<h::Instantiate_expression>(expression.data))
                        {
                            h::Instantiate_expression const& instantiate_expression = std::get<h::Instantiate_expression>(expression.data);

                            std::optional<h::Type_reference> const type_to_instantiate = get_expression_type(
                                core_module,
                                function->declaration,
                                scope,
                                statement,
                                expression,
                                std::nullopt,
                                declaration_database
                            );
                            if (type_to_instantiate.has_value())
                            {
                                std::optional<Declaration> const& declaration = find_underlying_declaration(declaration_database, type_to_instantiate.value());
                                if (declaration.has_value() && std::holds_alternative<h::Struct_declaration const*>(declaration->data))
                                {
                                    std::pmr::vector<h::compiler::Declaration_member_info> const member_infos = h::compiler::get_declaration_member_infos(
                                        declaration.value(),
                                        {}
                                    );

                                    if (member_infos.size() != instantiate_expression.members.size())
                                    {
                                        h::Instantiate_expression new_instantiate_expression = instantiate_expression;

                                        lsp::CodeAction code_action = create_add_missing_instantiate_members_code_action(
                                            parse_tree,
                                            core_module,
                                            *std::get<h::Struct_declaration const*>(declaration->data),
                                            expression,
                                            instantiate_expression
                                        );

                                        code_actions.push_back(std::move(code_action));
                                        return true;
                                    }
                                }
                            }
                            
                        }
                    }

                    return false;
                };

                return visit_expressions(
                    statement,
                    process_expression
                );
            };

            h::compiler::Scope scope = {};

            h::compiler::add_parameters_to_scope(
                scope,
                function->declaration->input_parameter_names,
                function->declaration->type.input_parameter_types,
                function->declaration->input_parameter_source_positions
            );

            h::compiler::visit_statements_using_scope(
                core_module,
                function->declaration,
                scope,
                function->definition->statements,
                declaration_database,
                process_statement
            );
        }

        return code_actions;
    }
}
