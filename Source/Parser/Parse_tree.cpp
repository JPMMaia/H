module;

#include <optional>
#include <memory_resource>
#include <string>
#include <string_view>
#include <vector>

#include <tree_sitter/api.h>

module h.parser.parse_tree;

import h.core;

namespace h::parser
{
    std::string_view get_node_value(
        Parse_node const& node
    )
    {
        return ts_node_grammar_type(*node.ts_node);
    }

    Parse_node get_root_node(Parse_tree const& tree)
    {
        // TODO
        return {};
    }

    std::optional<Parse_node> get_parent_node(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const child_key
    )
    {
        // TODO
        return std::nullopt;
    }

    std::optional<Parse_node> get_child_node(
        Parse_tree const& tree,
        Parse_node const& node,
        std::size_t const child_index
    )
    {
        // TODO
        return {};
    }

    std::optional<Parse_node> get_child_node(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const child_key
    )
    {
        // TODO
        return {};
    }

    std::pmr::vector<Parse_node> get_child_nodes(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        // TODO
        return {};
    }

    std::pmr::vector<Parse_node> get_child_nodes(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const child_key,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        // TODO
        return {};
    }

    std::pmr::vector<Parse_node> get_child_nodes_of_parent(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const parent_key,
        std::string_view const child_key,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        // TODO
        return {};
    }
}
