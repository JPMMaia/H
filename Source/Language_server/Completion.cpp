module;

#include <array>
#include <span>
#include <string>
#include <vector>

#include <lsp/types.h>

module h.language_server.completion;

import h.compiler.analysis;
import h.core;
import h.core.declarations;
import h.core.types;
import h.language_server.core;
import h.parser.convertor;
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

    static void add_builtin_type_items(
        std::vector<lsp::CompletionItem>& items
    )
    {
        static constexpr std::array<std::string_view, 28> builtin_types
        {
            "Any_type",
            "Bool",
            "Byte",
            "C_bool",
            "C_char",
            "C_int",
            "C_long",
            "C_longdouble",
            "C_longlong",
            "C_schar",
            "C_short",
            "C_uchar",
            "C_uint",
            "C_ulong",
            "C_ulonglong",
            "C_ushort",
            "Float16",
            "Float32",
            "Float64",
            "Int16",
            "Int32",
            "Int64",
            "Int8",
            "String",
            "Uint16",
            "Uint32",
            "Uint64",
            "Uint8",
        };

        items.reserve(items.size() + builtin_types.size());

        for (std::string_view const type_name : builtin_types)
        {
            items.push_back(
                lsp::CompletionItem
                {
                    .label = std::string{type_name},
                    .kind = lsp::CompletionItemKind::Keyword,
                }
            );
        }
    }

    static void add_import_alias_items(
        std::vector<lsp::CompletionItem>& items,
        h::Module const& core_module
    )
    {
        items.reserve(items.size() + core_module.dependencies.alias_imports.size());

        for (Import_module_with_alias const& import_module : core_module.dependencies.alias_imports)
        {
            items.push_back(
                lsp::CompletionItem
                {
                    .label = std::string{import_module.alias},
                    .kind = lsp::CompletionItemKind::Module,
                }
            );
        }
    }

    static void add_declaration_type_items(
        std::vector<lsp::CompletionItem>& items,
        Declaration_database const& declaration_database,
        std::string_view const module_name
    )
    {
        auto const process_declaration = [&](Declaration const& declaration) -> bool {

            if (std::holds_alternative<h::Alias_type_declaration const*>(declaration.data))
            {
                h::Alias_type_declaration const& data = *std::get<h::Alias_type_declaration const*>(declaration.data);

                items.push_back(
                    lsp::CompletionItem
                    {
                        .label = std::string{data.name},
                        .kind = lsp::CompletionItemKind::TypeParameter,
                    }
                );
            }
            else if (std::holds_alternative<h::Enum_declaration const*>(declaration.data))
            {
                h::Enum_declaration const& data = *std::get<h::Enum_declaration const*>(declaration.data);
                
                items.push_back(
                    lsp::CompletionItem
                    {
                        .label = std::string{data.name},
                        .kind = lsp::CompletionItemKind::Enum,
                    }
                );
            }
            else if (std::holds_alternative<h::Struct_declaration const*>(declaration.data))
            {
                h::Struct_declaration const& data = *std::get<h::Struct_declaration const*>(declaration.data);

                items.push_back(
                    lsp::CompletionItem
                    {
                        .label = std::string{data.name},
                        .kind = lsp::CompletionItemKind::Struct,
                    }
                );
            }
            else if (std::holds_alternative<h::Union_declaration const*>(declaration.data))
            {
                h::Union_declaration const& data = *std::get<h::Union_declaration const*>(declaration.data);

                items.push_back(
                    lsp::CompletionItem
                    {
                        .label = std::string{data.name},
                        .kind = lsp::CompletionItemKind::Struct,
                    }
                );
            }
            else if (std::holds_alternative<h::Type_constructor const*>(declaration.data))
            {
                h::Type_constructor const& data = *std::get<h::Type_constructor const*>(declaration.data);

                items.push_back(
                    lsp::CompletionItem
                    {
                        .label = std::string{data.name},
                        .kind = lsp::CompletionItemKind::TypeParameter,
                    }
                );
            }

            return false;
        };

        visit_declarations(
            declaration_database,
            module_name,
            process_declaration
        );
    }

    static lsp::CompletionList create_type_completion_list(
        Declaration_database const& declaration_database,
        h::Module const& core_module
    )
    {
        std::vector<lsp::CompletionItem> items = {};
        add_builtin_type_items(items);
        add_import_alias_items(items, core_module);
        add_declaration_type_items(items, declaration_database, core_module.name);

        return lsp::CompletionList
        {
            .isIncomplete = false,
            .items = std::move(items),
            .itemDefaults = std::nullopt,
        };
    }

    static std::optional<lsp::CompletionList> create_module_type_completion_list(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        h::parser::Parse_node const& node_before
    )
    {
        std::optional<h::parser::Parse_node> const node_to_access = h::parser::get_node_previous_sibling(node_before);
        if (!node_to_access.has_value())
            return std::nullopt;

        std::string_view const node_to_access_value = h::parser::get_node_value(parse_tree, node_to_access.value());
        h::Import_module_with_alias const* import_module = find_import_module_with_alias(
            core_module,
            node_to_access_value
        );
        if (import_module != nullptr)
        {
            std::vector<lsp::CompletionItem> items = {};
            add_declaration_type_items(items, declaration_database, import_module->module_name);

            return lsp::CompletionList
            {
                .isIncomplete = false,
                .items = std::move(items),
                .itemDefaults = std::nullopt,
            };
        }

        h::parser::Module_info const module_info = h::parser::create_module_info(core_module);

        h::Statement statement_to_access = {};
        h::parser::node_to_expression(statement_to_access, module_info, parse_tree, node_to_access.value(), {}, {});

        if (!statement_to_access.expressions.empty())
        {
            h::Expression const& expression_to_access = statement_to_access.expressions[0];
                
            // TODO calculate scope
            // TODO calculate expression type
            // TODO try to access member
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
        std::string_view const previous_sibling_symbol = previous_sibling.has_value() ? h::parser::get_node_symbol(previous_sibling.value()) : std::string_view{""};
        std::string_view const previous_sibling_value = previous_sibling.has_value() ? h::parser::get_node_value(parse_tree, previous_sibling.value()) : std::string_view{""};
        h::Source_range const previous_sibling_range = previous_sibling.has_value() ? h::parser::get_node_source_range(previous_sibling.value()) : smallest_node_range;

        std::optional<h::parser::Parse_node> const node_before = h::parser::find_node_before_source_position(parse_tree, smallest_node, source_position);
        std::string_view const node_before_value = node_before.has_value() ? h::parser::get_node_value(parse_tree, node_before.value()) : std::string_view{""};

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

                bool const is_access_expression = previous_sibling_value.ends_with(".");
                bool const is_function_type_parameter =
                    (previous_sibling_value.ends_with(":") || is_access_expression) &&
                    (smallest_node_symbol == "," || smallest_node_symbol == ")");
                if (is_function_type_parameter)
                {
                    if (is_access_expression)
                    {
                        std::optional<lsp::CompletionList> module_type_completion_list = create_module_type_completion_list(
                            declaration_database,
                            parse_tree,
                            core_module,
                            node_before.value()
                        );
                        if (module_type_completion_list.has_value())
                        {
                            return module_type_completion_list.value();
                        }
                        else
                        {
                            return lsp::CompletionList
                            {
                                .isIncomplete = false,
                                .items = {},
                                .itemDefaults = std::nullopt,
                            };
                        }
                    }
                    else
                    {
                        return create_type_completion_list(declaration_database, core_module);
                    }
                }
            }
            else if (std::holds_alternative<h::Struct_declaration const*>(declaration.data))
            {
                h::Struct_declaration const& struct_declaration = *std::get<h::Struct_declaration const*>(declaration.data);

                if (node_before_value == ":")
                {
                    return create_type_completion_list(declaration_database, core_module);
                }
                else if (node_before_value == ".")
                {
                    std::optional<lsp::CompletionList> module_type_completion_list = create_module_type_completion_list(
                        declaration_database,
                        parse_tree,
                        core_module,
                        node_before.value()
                    );
                    if (module_type_completion_list.has_value())
                        return module_type_completion_list.value();
                }
            }
        }

        std::optional<h::Function> const function = find_function_that_contains_source_position(
            core_module,
            source_position
        );

        if (function.has_value())
        {
            std::vector<lsp::CompletionItem> items = {};

            if (node_before_value == ":" || node_before_value == "as")
            {
                // TODO : can also come in instantiate expressions
                return create_type_completion_list(declaration_database, core_module);
            }
            else if (node_before_value == ".")
            {
                std::optional<lsp::CompletionList> module_type_completion_list = create_module_type_completion_list(
                    declaration_database,
                    parse_tree,
                    core_module,
                    node_before.value()
                );
                if (module_type_completion_list.has_value())
                    return module_type_completion_list.value();
            }
        }

        return lsp::CompletionList
        {
            .isIncomplete = false,
            .items = {},
            .itemDefaults = std::nullopt,
        };
    }
}
