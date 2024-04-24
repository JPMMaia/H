module;

#include <filesystem>

export module h.parser;

namespace h::parser
{
    struct Parser_data
    {
        std::filesystem::path parser_javascript_path;
    };

    export using Parser = Parser_data;

    export Parser create_parser();

    export void parse(Parser const& parser, std::filesystem::path const& source_file_path, std::filesystem::path const& output_file_path);
}
