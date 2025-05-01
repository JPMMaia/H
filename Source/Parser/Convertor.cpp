module;

#include <filesystem>
#include <memory_resource>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

module h.parser.convertor;

import h.core;
import h.parser.parse_tree;

namespace h::parser
{
    static std::pmr::string create_string(
        std::string_view const value,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        return std::pmr::string{value, output_allocator};
    }

    static std::optional<std::string_view> get_module_name(
        Parse_tree const& tree,
        Parse_node const& node
    )
    {
        std::optional<Parse_node> const module_head = get_child_node(tree, node, 0);
        if (!module_head.has_value())
            return std::nullopt;

        std::optional<Parse_node> const module_declaration = get_child_node(tree, module_head.value(), 0);
        if (!module_declaration.has_value())
            return std::nullopt;

        std::optional<Parse_node> const module_name = get_child_node(tree, module_declaration.value(), "Module_name");
        if (!module_name.has_value())
            return std::nullopt;

        return get_node_value(module_name.value());
    }

    std::optional<h::Module> parse_node_to_module(
        Parse_tree const& tree,
        Parse_node const& node,
        std::filesystem::path source_file_path,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::optional<std::string_view> const module_name = get_module_name(tree, node);
        if (!module_name.has_value())
            return std::nullopt;
        
        h::Module output = {};
        output.language_version = {0, 1, 0};
        output.name = create_string(module_name.value(), output_allocator);
        output.source_file_path = std::move(source_file_path);
    
        return output;
    }
}
