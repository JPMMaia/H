module;

#include <memory_resource>

export module h.parser.convertor;

import h.core;
import h.parser.parse_tree;

namespace h::parser
{
    export h::Module parse_node_to_module(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );
}
