module;

#include <filesystem>
#include <span>

export module h.builder;

import h.builder.repository;
import h.compiler.linker;

namespace h::builder
{
    export void build_executable(
        std::filesystem::path const& file_path,
        std::filesystem::path const& build_directory_path,
        std::filesystem::path const& output_path,
        std::span<std::filesystem::path const> const module_search_paths,
        h::compiler::Linker_options const& linker_options
    );

    export void build_artifact(
        std::filesystem::path const& configuration_file_path,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> header_search_paths,
        std::span<Repository const> repositories
    );
}
