module;

#include <memory_resource>

module h.parser.convertor;

import h.core;
import h.parser.parse_tree;

namespace h::parser
{
    h::Module parse_node_to_module(
        Parse_tree const& tree,
        Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        return {};
    }
}
