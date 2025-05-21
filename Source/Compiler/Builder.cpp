module;

#include <filesystem>
#include <memory_resource>
#include <span>
#include <string>
#include <vector>

module h.compiler.builder;

import h.core;
import h.compiler;
import h.compiler.repository;
import h.compiler.target;

namespace h::compiler
{
    Builder create_builder(
        h::compiler::Target const& target,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> header_search_paths,
        std::span<h::compiler::Repository const> repositories,
        h::compiler::Compilation_options const& compilation_options
    )
    {
        return {};
    }

    void build_artifact(
        Builder& builder,
        std::filesystem::path const& artifact_file_path
    )
    {
    }
}
