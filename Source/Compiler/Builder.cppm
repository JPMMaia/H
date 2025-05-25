module;

#include <filesystem>
#include <memory_resource>
#include <span>
#include <string>
#include <unordered_map>
#include <vector>

export module h.compiler.builder;

import h.core;
import h.compiler;
import h.compiler.artifact;
import h.compiler.repository;
import h.compiler.target;

namespace h::compiler
{
    export struct Builder
    {
        h::compiler::Target target;
        std::filesystem::path build_directory_path;
        std::pmr::vector<std::filesystem::path> header_search_paths;
        std::pmr::vector<h::compiler::Repository> repositories;
        h::compiler::Compilation_options compilation_options;
    };

    export Builder create_builder(
        h::compiler::Target const& target,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> header_search_paths,
        std::span<std::filesystem::path const> repository_paths,
        h::compiler::Compilation_options const& compilation_options,
        std::pmr::polymorphic_allocator<> output_allocator
    );

    export void build_artifact(
        Builder& builder,
        std::filesystem::path const& artifact_file_path
    );

    struct C_header_and_options
    {
        h::compiler::C_header c_header = {};
        h::compiler::C_header_options const* options = nullptr;
    };

    std::pmr::vector<Artifact> get_sorted_artifacts(
        std::filesystem::path const& artifact_file_path,
        std::span<Repository const> repositories,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    std::pmr::vector<C_header_and_options> get_artifacts_c_headers(
        std::span<Artifact const> const artifacts,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    std::pmr::vector<std::filesystem::path> get_artifacts_source_files(
        std::span<Artifact const> const artifacts,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    std::pmr::vector<h::Module> parse_c_headers_and_cache(
        Builder const& builder,
        std::span<C_header_and_options const> const c_headers,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    std::pmr::vector<h::Module> parse_source_files_and_cache(
        Builder const& builder,
        std::span<std::filesystem::path const> const source_file_paths,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> create_module_name_to_file_path_map(
        Builder const& builder,
        std::span<h::Module const> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void compile_and_write_to_bitcode_files(
        Builder const& builder,
        std::span<h::Module const> const core_modules,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        LLVM_data& llvm_data,
        Compilation_database& compilation_database,
        Compilation_options const& compilation_options
    );

    void link_artifacts(
        Builder const& builder,
        std::span<Artifact const> const artifacts,
        h::compiler::Compilation_options const& compilation_options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    bool is_file_newer_than(
        std::filesystem::path const& first,
        std::filesystem::path const& second
    );
}
