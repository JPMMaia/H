module;

#include <filesystem>
#include <optional>
#include <variant>
#include <vector>

#include <lsp/types.h>

module h.language_server.go_to_location;

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

        std::string_view const declaration_name = get_declaration_name(declaration.value());
        std::optional<h::Source_range_location> const declaration_location = get_declaration_source_location(declaration.value());
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

    lsp::TextDocument_DefinitionResult compute_go_to_definition(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        lsp::Position const position,
        bool const client_supports_definition_link
    )
    {
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

            /*Declaration const& declaration = declaration_optional.value();

            if (std::holds_alternative<h::Struct_declaration const*>(declaration.data))
            {
                h::Struct_declaration const& struct_declaration = *std::get<h::Struct_declaration const*>(declaration.data);

                for (h::Type_reference const& member_type : struct_declaration.member_types)
                {
                    std::optional<h::Type_reference> const inner_type = find_type_that_contains_source_position(
                        member_type,
                        source_position
                    );
                    if (inner_type.has_value())
                    {
                        return create_result_from_type(
                            declaration_database,
                            parse_tree,
                            inner_type.value(),
                            client_supports_definition_link
                        );
                    }
                }
            }*/
        }

        std::optional<h::Function> const function = find_function_that_contains_source_position(
            core_module,
            source_position
        );
        if (function.has_value())
        {
            /*// TODO visit types
            // TODO visit expressions
            std::filesystem::path const target_file_path;
            h::Source_range const target_range;
            h::Source_range const target_selection_range;

            return create_result(
                target_file_path,
                target_range,
                target_selection_range,
                client_supports_definition_link
            );*/
        }

        return nullptr;
    }
}
