module;

#include <lsp/types.h>

module h.language_server.completion;

import h.core;
import h.core.declarations;
import h.language_server.core;
import h.parser.parse_tree;

namespace h::language_server
{
    bool range_contains_position(
        h::Source_range const& range,
        h::Source_position const& position
    )
    {
        if (range.start.line < position.line && position.line < range.end.line)
            return true;

        if (range.start.line == position.line && range.start.column <= position.column)
            return true;

        if (range.end.line == position.line && position.column < range.end.column)
            return true;

        return false;
    }

    std::optional<Declaration> find_declaration_that_contains_source_position(
        Declaration_database const& declaration_database,
        std::string_view const& module_name,
        h::Source_position const& source_position
    )
    {
        std::optional<Declaration> found_declaration = std::nullopt;

        auto const process_declaration = [&](Declaration const& declaration) -> bool
        {
            std::optional<h::Source_range_location> const declaration_source_location = get_declaration_source_location(
                declaration
            );

            if (declaration_source_location.has_value())
            {
                h::Source_range const& range = declaration_source_location->range;

                if (range_contains_position(range, source_position))
                {
                    found_declaration = declaration;
                    return true;
                }
            }

            return false;
        };

        visit_declarations(
            declaration_database,
            module_name,
            process_declaration
        );

        return found_declaration;
    }

    std::optional<h::Function> find_function_that_contains_source_position(
        h::Module const& core_module,
        h::Source_position const& source_position
    )
    {
        for (h::Function_definition const& definition : core_module.definitions.function_definitions)
        {
            if (definition.source_location.has_value())
            {
                if (range_contains_position(definition.source_location->range, source_position))
                {
                    std::optional<Function_declaration const*> const declaration = h::find_function_declaration(core_module, definition.name);
                    if (declaration.has_value())
                    {
                        return h::Function
                        {
                            .declaration = declaration.value(),
                            .definition = &definition
                        };                     
                    }
                    
                    return std::nullopt;
                }
            }
        }

        return std::nullopt;
    }

    lsp::TextDocument_CompletionResult compute_completion(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        lsp::Position const position
    )
    {
        h::Source_position const source_position = to_source_position(position);

        h::parser::Parse_node const smallest_node = h::parser::get_smallest_node_that_contains_position(
            h::parser::get_root_node(parse_tree),
            source_position
        );
        std::string_view const smallest_node_symbol = h::parser::get_node_symbol(smallest_node);
        h::Source_range const smallest_node_range = h::parser::get_node_source_range(smallest_node);

        std::optional<h::parser::Parse_node> const previous_sibling = h::parser::get_node_previous_sibling(smallest_node);
        std::string_view const previous_sibling_value = previous_sibling.has_value() ? h::parser::get_node_value(parse_tree, previous_sibling.value()) : std::string_view{""};
        h::Source_range const previous_sibling_range = previous_sibling.has_value() ? h::parser::get_node_source_range(previous_sibling.value()) : smallest_node_range;

        std::optional<Declaration> const declaration_optional = find_declaration_that_contains_source_position(
            declaration_database,
            core_module.name,
            source_position
        );

        if (declaration_optional.has_value())
        {
            Declaration const& declaration = declaration_optional.value();

            if (std::holds_alternative<h::Function_declaration const*>(declaration.data))
            {
                h::Function_declaration const& function_declaration = *std::get<h::Function_declaration const*>(declaration.data);

                bool const is_function_type_parameter = previous_sibling_value.ends_with(":") && (smallest_node_symbol == "," || smallest_node_symbol == ")");
                if (is_function_type_parameter)
                {
                    
                }
            }
        }

        std::optional<h::Function> const function = find_function_that_contains_source_position(
            core_module,
            source_position
        );

        if (function.has_value())
        {
            
        }

        std::vector<lsp::CompletionItem> items = {};

        return lsp::CompletionList
        {
            .isIncomplete = false,
            .items = std::move(items),
            .itemDefaults = std::nullopt,
        };
    }
}
