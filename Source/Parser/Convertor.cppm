module;

#include <filesystem>
#include <memory_resource>
#include <optional>

export module h.parser.convertor;

import h.core;
import h.parser.parse_tree;

namespace h::parser
{
    export std::optional<h::Module> parse_node_to_module(
        Parse_tree const& tree,
        Parse_node const& node,
        std::filesystem::path source_file_path,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );
}
