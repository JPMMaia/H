#include <docopt.h>

#include <filesystem>
#include <iostream>
#include <map>
#include <memory_resource>
#include <span>
#include <string>
#include <vector>

import h.builder;
import h.compiler;
import h.compiler.linker;

static constexpr char g_usage[] =
R"(H compiler

    Usage:
      h_compiler build-executable <file> [--build-directory=<build_directory>] [--entry=<entry>] [--output=<output>] [--module-search-path=<module_search_path>]...
      h_compiler build-artifact [--artifact-file=<artifact_file>] [--build-directory=<build_directory>] [--header-search-path=<header_search_path>]...
      h_compiler (-h | --help)
      h_compiler --version

    Options:
      -h --help                                   Show this screen.
      --version                                   Show version.
      --build-directory=<build_directory>         Directory where build artifacts will be written to [default: build].
      --entry=<entry>                             Entry point symbol name [default: main].
      --header-search-path=<header_search_path>   Search directories for C header files.
      --artifact-file=<artifact_file>
      --output=<output>                           Write output to <output> [default: output].
)";

std::pmr::vector<std::filesystem::path> convert_to_path(std::span<std::string const> const values)
{
    std::pmr::vector<std::filesystem::path> output;
    output.reserve(values.size());

    for (std::string const& value : values)
    {
        output.push_back(value);
    }

    return output;
}

int main(int const argc, char const* const* argv)
{
    std::map<std::string, docopt::value> const arguments = docopt::docopt(g_usage, { argv + 1, argv + argc }, true, "H Builder 0.1.0");

    if (arguments.at("build-executable").asBool())
    {
        std::filesystem::path const file_path = arguments.at("<file>").asString();
        std::filesystem::path const build_directory_path = arguments.at("--build-directory").asString();
        std::filesystem::path const output_path = arguments.at("--output").asString();
        std::pmr::vector<std::filesystem::path> const module_search_paths = convert_to_path(arguments.at("--module-search-path").asStringList());
        std::string_view const entry = arguments.at("--entry").asString();

        h::compiler::Linker_options const linker_options
        {
            .entry_point = entry
        };

        h::builder::build_executable(file_path, build_directory_path, output_path, module_search_paths, linker_options);
    }
    else if (arguments.at("build-artifact").asBool())
    {
        std::filesystem::path const artifact_file_path = arguments.at("--artifact-file").asString();
        std::filesystem::path const build_directory_path = arguments.at("--build-directory").asString();
        std::pmr::vector<std::filesystem::path> const header_search_paths = convert_to_path(arguments.at("--header-search-path").asStringList());

        h::builder::build_artifact(artifact_file_path, build_directory_path, header_search_paths);
    }

    return 0;
}
