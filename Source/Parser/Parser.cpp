module;

#include <cstddef>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <memory>
#include <memory_resource>
#include <span>
#include <string>
#include <vector>

module h.parser;

import h.common.filesystem;

namespace h::parser
{
    Parser create_parser()
    {
        return Parser
        {
            .parser_javascript_path = h::common::get_executable_directory() / "parser.js",
        };
    }

    void parse(Parser const& parser, std::filesystem::path const& source_file_path, std::filesystem::path const& output_file_path)
    {
        std::string const command = std::format("node {} write {} --input {}", parser.parser_javascript_path.generic_string(), output_file_path.generic_string(), source_file_path.generic_string());
        std::system(command.c_str());
    }
}
