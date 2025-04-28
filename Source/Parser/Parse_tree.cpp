module;

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

#include <tree_sitter/api.h>

module h.parser.parse_tree;

import h.core;

namespace h::parser
{
    Parse_node get_root_node(Parse_tree const& tree)
    {
        return {};
    }
}
