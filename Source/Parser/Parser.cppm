module;

#include <filesystem>

#include <tree_sitter/api.h>

export module h.parser.parser;

import h.parser.parse_tree;

namespace h::parser
{
    struct Parser_data
    {
        TSLanguage const* language = nullptr;
        TSParser* parser = nullptr;
        
        std::filesystem::path parser_javascript_path;
    };

    export using Parser = Parser_data;

    export Parser create_parser();
    export void destroy_parser(Parser&& parser);

    export Parse_tree parse(Parser const& parser, Parse_tree* previous_parse_tree, std::string_view const source);
    export void destroy_tree(Parse_tree&& tree);

    export std::optional<std::pmr::string> read_module_name(std::filesystem::path const& unparsed_file_path);
}
