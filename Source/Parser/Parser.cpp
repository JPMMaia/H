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

#include <tree_sitter/api.h>

module h.parser.parser;

import h.common;
import h.common.filesystem;

extern "C"
{
    TSLanguage const* tree_sitter_hlang(void);
}

namespace h::parser
{
    Parser create_parser(bool const use_tree_sitter)
    {
        if (!use_tree_sitter)
        {
            return Parser
            {
                .parser_javascript_path = h::common::get_executable_directory() / "parser.js",
            };
        }

        TSLanguage const* language = tree_sitter_hlang();

        TSParser* parser = ts_parser_new();
        bool const success = ts_parser_set_language(parser, language);
        if (!success)
            h::common::print_message_and_exit("Failed to set tree sitter language!");

        return Parser
        {
            .language = language,
            .parser = parser
        };
    }

    void destroy_parser(Parser&& parser)
    {
        if (parser.parser != nullptr)
        {
            ts_parser_delete(parser.parser);
            parser.parser = nullptr;
        }

        if (parser.language != nullptr)
        {
            ts_language_delete(parser.language);
            parser.language = nullptr;
        }
    }

    void parse(Parser const& parser, std::filesystem::path const& source_file_path, std::filesystem::path const& output_file_path)
    {
        std::string const command = std::format("node {} write {} --input {}", parser.parser_javascript_path.generic_string(), output_file_path.generic_string(), source_file_path.generic_string());
        std::system(command.c_str());
    }

    Parse_tree parse(Parser const& parser, Parse_tree* previous_parse_tree, std::string_view const source)
    {
        TSTree* tree = ts_parser_parse_string(parser.parser, nullptr, source.data(), source.size());
        return Parse_tree
        { 
            .source = source,
            .ts_tree = tree
        };
    }

    void destroy_tree(Parse_tree&& tree)
    {
        ts_tree_delete(tree.ts_tree);
    }

    std::optional<std::pmr::string> read_module_name(std::filesystem::path const& unparsed_file_path)
    {
        std::string const path_string = unparsed_file_path.generic_string();
        std::FILE* file_stream = std::fopen(path_string.c_str(), "r");
        if (file_stream == nullptr)
            return std::nullopt;

        std::optional<std::pmr::string> module_name = std::nullopt;

        constexpr int line_size = 1000;
        char line[line_size];
        while (true)
        {
            if (std::fgets(line, line_size, file_stream) == nullptr)
                break;

            char const* const end = std::find(line, line + line_size, '\0');

            std::string_view const line_view{ line, end };

            std::string_view::size_type const line_without_spaces_begin = line_view.find_first_not_of(' ');
            if (line_without_spaces_begin == std::string_view::npos)
                continue;

            std::string_view const line_without_spaces{ line + line_without_spaces_begin, end - 1 };

            if (line_without_spaces.starts_with("module ") && line_without_spaces.ends_with(';'))
            {
                module_name = line_without_spaces.substr(7, line_without_spaces.size() - 8);
                break;
            }
        }

        std::fclose(file_stream);

        return module_name;
    }
}
