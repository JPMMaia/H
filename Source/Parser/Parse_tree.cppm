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
        std::pmr::u8string text;
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

    export std::pmr::vector<Parse_node> get_named_child_nodes(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    export std::pmr::vector<Parse_node> get_child_nodes_of_parent(
        Parse_tree const& tree,
        Parse_node const& node,
        std::string_view const parent_key,
        std::string_view const child_key,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    export Source_position get_node_start_source_position(
        Parse_node const& node
    );

    export Source_range get_node_source_range(
        Parse_node const& node
    );

    export bool has_errors(
        Parse_node const& node
    );

    export bool is_error_node(
        Parse_node const& node
    );

    export std::pmr::vector<Parse_node> get_error_or_missing_nodes(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );
}
