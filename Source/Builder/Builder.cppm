module;

#include <filesystem>
#include <span>
#include <string>
#include <unordered_map>

export module h.builder;

import h.builder.repository;
import h.builder.target;
import h.compiler.linker;
import h.parser;

namespace h::builder
{
    export void build_executable(
        Target const& target,
        h::parser::Parser const& parser,
        std::span<std::filesystem::path const> source_file_paths,
        std::span<std::pmr::string const> libraries,
        std::filesystem::path const& build_directory_path,
        std::filesystem::path const& output_path,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path>& module_name_to_file_path_map,
        h::compiler::Linker_options const& linker_options
    );

    export void build_artifact(
        Target const& target,
        h::parser::Parser const& parser,
        std::filesystem::path const& configuration_file_path,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> header_search_paths,
        std::span<Repository const> repositories
    );
}
