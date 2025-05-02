module;

#include <memory_resource>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include <tree_sitter/api.h>

export module h.parser.parse_tree;

import h.core;

namespace h::parser
{
    export struct Parse_node
    {
        TSNode ts_node;
    };

    export struct Parse_tree
    {
        std::string_view const source;
        TSTree* ts_tree;
    };

    export std::string_view get_node_value(
        Parse_tree const& tree,
        Parse_node const& node
    );

    export std::string_view get_node_symbol(
        Parse_node const& node
    );

    export Parse_node get_root_node(
        Parse_tree const& tree
    );

    export std::optional<Parse_node> get_parent_node(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const child_key
    );

    export std::optional<Parse_node> get_child_node(
        Parse_tree const& tree,
        Parse_node const& node,
        std::uint32_t const child_index
    );

    export std::optional<Parse_node> get_child_node(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const child_key
    );

    export std::optional<Parse_node> get_last_child_node(
        Parse_tree const& tree,
        Parse_node const& node
    );

    export std::pmr::vector<Parse_node> get_child_nodes(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    export std::pmr::vector<Parse_node> get_child_nodes(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const child_key,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    export std::pmr::vector<Parse_node> get_child_nodes_of_parent(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const parent_key,
        std::string_view const child_key,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );
}
