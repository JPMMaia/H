module;

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

#include <tree_sitter/api.h>

export module h.parser.parse_tree;

import h.core;

namespace h::parser
{
    export struct Parse_node
    {
        TSNode* ts_node;
    };

    export struct Parse_tree
    {
        TSTree* ts_tree;
    };

    export Parse_node get_root_node(Parse_tree const& tree);
}
