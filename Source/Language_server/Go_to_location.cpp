module;

#include <filesystem>
#include <optional>
#include <variant>
#include <vector>

#include <lsp/types.h>

module h.language_server.go_to_location;

import h.compiler.analysis;
import h.core;
import h.core.declarations;
import h.core.types;
import h.language_server.core;
import h.language_server.location;
import h.parser.parse_tree;

namespace h::language_server
{
    static lsp::TextDocument_DefinitionResult create_result(
        std::filesystem::path const& target_file_path,
        h::Source_range const& target_range,
        h::Source_range const& target_selection_range,
        bool const client_supports_definition_link
    )
    {
        if (client_supports_definition_link)
        {
            std::vector<lsp::DefinitionLink> links;

            links.push_back(
                lsp::LocationLink
                {
                    .targetUri = lsp::DocumentUri::fromPath(target_file_path.generic_string()),
                    .targetRange = to_lsp_range(target_range),
                    .targetSelectionRange = to_lsp_range(target_selection_range),
                    .originSelectionRange = std::nullopt,
                }
            );

            return links;
        }
        else
        {
            std::vector<lsp::Location> locations;

            locations.push_back(
                lsp::Location
                {
                    .uri = lsp::DocumentUri::fromPath(target_file_path.generic_string()),
                    .range =  to_lsp_range(target_range),
                }
            );

            return locations;
        }
    }

    static lsp::TextDocument_DefinitionResult create_result_from_declaration(
        h::parser::Parse_tree const& parse_tree,
        Declaration const& declaration,
        bool const client_supports_definition_link
    )
    {
        std::string_view const declaration_name = get_declaration_name(declaration);
        std::optional<h::Source_range_location> const declaration_location = get_declaration_source_location(declaration);
        if (!declaration_location.has_value() || !declaration_location->file_path.has_value())
            return nullptr;
        
        std::filesystem::path const& target_file_path = declaration_location->file_path.value();
        h::Source_range const target_range = declaration_location->range;
        h::Source_range const target_selection_range = create_sub_source_range(target_range, 0, declaration_name.size()).value();

        return create_result(
            target_file_path,
            target_range,
            target_selection_range,
            client_supports_definition_link
        );
    }

    static lsp::TextDocument_DefinitionResult create_result_from_type(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Type_reference const& type,
        bool const client_supports_definition_link
    )
    {
        std::optional<Declaration> const& declaration = find_declaration(declaration_database, type);
        if (!declaration.has_value())
            return nullptr;

        return create_result_from_declaration(
            parse_tree,
            declaration.value(),
            client_supports_definition_link
        );
    }

    static lsp::TextDocument_DefinitionResult create_result_from_variable(
        h::Module const& core_module,
        h::compiler::Variable const& variable,
        bool const client_supports_definition_link
    )
    {
        if (!core_module.source_file_path.has_value() || !variable.source_position.has_value())
            return nullptr;
        
        std::filesystem::path const& target_file_path = core_module.source_file_path.value();
        h::Source_range const target_range = create_source_range(
            variable.source_position->line,
            variable.source_position->column,
            variable.source_position->line,
            variable.source_position->column + variable.name.size()
        );
        h::Source_range const target_selection_range = target_range;

        return create_result(
            target_file_path,
            target_range,
            target_selection_range,
            client_supports_definition_link
        );
    }

    static lsp::TextDocument_DefinitionResult create_result_from_declaration_member(
        Declaration const& declaration,
        std::string_view const member_name,
        std::optional<h::Source_position> const& member_source_position,
        bool const client_supports_definition_link
    )
    {
        if (!member_source_position.has_value())
            return nullptr;

        std::optional<h::Source_range_location> const declaration_location = get_declaration_source_location(declaration);
        if (!declaration_location.has_value() || !declaration_location->file_path.has_value())
            return nullptr;

        std::filesystem::path const& target_file_path = declaration_location->file_path.value();
        h::Source_range const target_range = create_source_range(
            member_source_position->line,
            member_source_position->column,
            member_source_position->line,
            member_source_position->column + member_name.size()
        );
        h::Source_range const target_selection_range = target_range;    

        return create_result(
            target_file_path,
            target_range,
            target_selection_range,
            client_supports_definition_link
        );
    }

    lsp::TextDocument_DefinitionResult compute_go_to_definition(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        lsp::Position const position,
        bool const client_supports_definition_link
    )
    {
        std::pmr::polymorphic_allocator<> temporaries_allocator;

        h::Source_position const& source_position = to_source_position(position);

        std::optional<Declaration> const declaration_optional = find_declaration_that_contains_source_position(
            declaration_database,
            core_module.name,
            source_position
        );
        if (declaration_optional.has_value())
        {
            std::optional<lsp::TextDocument_DefinitionResult> result_optional = std::nullopt;

            auto const process_type = [&](h::Type_reference const& type) -> bool
            {
                std::optional<h::Type_reference> const inner_type = find_type_that_contains_source_position(
                    type,
                    source_position
                );
                if (inner_type.has_value())
                {
                    result_optional = create_result_from_type(
                        declaration_database,
                        parse_tree,
                        inner_type.value(),
                        client_supports_definition_link
                    );
                    return true;
                }
                
                return false;
            };

            auto const process_declaration = [&](auto const* const declaration) -> bool
            {
                return visit_type_references(
                    *declaration,
                    process_type
                );
            };

            std::visit(process_declaration, declaration_optional->data);
            if (result_optional.has_value())
                return result_optional.value();
        }

        std::optional<h::Function> const function = find_function_that_contains_source_position(
            core_module,
            source_position
        );
        if (function.has_value())
        {
            std::optional<lsp::TextDocument_DefinitionResult> result_optional = std::nullopt;

            auto const process_type = [&](h::Type_reference const& type) -> bool
            {
                std::optional<h::Type_reference> const inner_type = find_type_that_contains_source_position(
                    type,
                    source_position
                );
                if (inner_type.has_value())
                {
                    result_optional = create_result_from_type(
                        declaration_database,
                        parse_tree,
                        inner_type.value(),
                        client_supports_definition_link
                    );
                    return true;
                }
                
                return false;
            };

            visit_type_references(
                function->definition->statements,
                process_type
            );

            if (result_optional.has_value())
                return result_optional.value();

            auto const process_statement = [&](h::Statement const& statement, h::compiler::Scope const& scope) -> bool
            {
                auto const process_expression = [&](h::Expression const& expression, h::Statement const& statement) -> bool
                {
                    if (!expression.source_range.has_value())
                        return false;

                    if (h::range_contains_position_inclusive(expression.source_range.value(), source_position))
                    {
                        if (std::holds_alternative<h::Access_expression>(expression.data))
                        {
                            h::Access_expression const& access_expression = std::get<h::Access_expression>(expression.data);

                            h::Expression const& expression_to_access = statement.expressions[access_expression.expression.expression_index];

                            std::optional<h::Type_reference> const expression_to_access_type = h::compiler::get_expression_type(
                                core_module,
                                function->declaration,
                                scope,
                                statement,
                                expression_to_access,
                                std::nullopt,
                                declaration_database
                            );
                            if (expression_to_access_type.has_value())
                            {
                                std::optional<Declaration> const& declaration = find_declaration(declaration_database, expression_to_access_type.value());
                                if (declaration.has_value())
                                {
                                    std::pmr::vector<h::compiler::Declaration_member_info> const member_infos = h::compiler::get_declaration_member_infos(
                                        declaration.value(),
                                        temporaries_allocator
                                    );

                                    auto const location = std::find_if(
                                        member_infos.begin(),
                                        member_infos.end(),
                                        [&](h::compiler::Declaration_member_info const& member_info) -> bool { return member_info.member_name == access_expression.member_name; }
                                    );
                                    if (location != member_infos.end())
                                    {
                                        h::compiler::Declaration_member_info const& member_info = *location;

                                        result_optional = create_result_from_declaration_member(
                                            declaration.value(),
                                            member_info.member_name,
                                            member_info.member_source_position,
                                            client_supports_definition_link
                                        );
                                        return true;
                                    }
                                }
                            }

                            h::Enum_declaration const* enum_declaration = find_enum_declaration_using_expression(
                                declaration_database,
                                core_module,
                                statement,
                                expression_to_access
                            );
                            if (enum_declaration != nullptr)
                            {
                                if (range_contains_position_inclusive(expression_to_access.source_range.value(), source_position))
                                {
                                    result_optional = create_result_from_declaration(parse_tree, Declaration{.data = enum_declaration}, client_supports_definition_link);
                                    return true;
                                }

                                auto const location = std::find_if(
                                    enum_declaration->values.begin(),
                                    enum_declaration->values.end(),
                                    [&](h::Enum_value const& member) -> bool { return member.name == access_expression.member_name; }
                                );
                                if (location != enum_declaration->values.end())
                                {
                                    h::Enum_value const& member = *location;

                                    if (member.source_location.has_value())
                                    {
                                        result_optional = create_result_from_declaration_member(
                                            Declaration{ .data = enum_declaration },
                                            member.name,
                                            h::Source_position{member.source_location->line, member.source_location->column},
                                            client_supports_definition_link
                                        );
                                        return true;
                                    }
                                }
                            }

                            return true;
                        }
                        else if (std::holds_alternative<h::Instantiate_expression>(expression.data))
                        {
                            h::Instantiate_expression const& instantiate_expression = std::get<h::Instantiate_expression>(expression.data);
                            // TODO can be recursive
                        }
                        else if (std::holds_alternative<h::Variable_expression>(expression.data))
                        {
                            h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(expression.data);

                            h::compiler::Variable const* const variable = h::compiler::find_variable_from_scope(scope, variable_expression.name);
                            if (variable != nullptr)
                            {
                                result_optional = create_result_from_variable(core_module, *variable, client_supports_definition_link);
                                return true;
                            }
                            
                            std::optional<Declaration> const declaration = find_declaration(declaration_database, core_module.name, variable_expression.name);
                            if (declaration.has_value())
                            {
                                result_optional = create_result_from_declaration(parse_tree, declaration.value(), client_supports_definition_link);
                                return true;
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

            if (result_optional.has_value())
                return result_optional.value();
        }

        return nullptr;
    }
}
