module;

#include <filesystem>
#include <memory_resource>
#include <span>
#include <string>
#include <vector>

export module h.compiler.builder;

import h.core;
import h.compiler;
import h.compiler.repository;
import h.compiler.target;

namespace h::compiler
{
    export struct Builder
    {
    };

    export Builder create_builder(
        h::compiler::Target const& target,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> header_search_paths,
        std::span<h::compiler::Repository const> repositories,
        h::compiler::Compilation_options const& compilation_options
    );

    export void build_artifact(
        Builder& builder,
        std::filesystem::path const& artifact_file_path
    );

    std::pmr::vector<std::filesystem::path> detect_source_files_that_need_to_be_compiled(
        Builder const& builder,
        std::span<std::filesystem::path const> const files,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    std::pmr::vector<h::Module> parse_source_files_and_cache(
        Builder const& builder,
        std::span<std::filesystem::path const> const files,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    struct Dependency_graph
    {

    };

    Dependency_graph build_dependency_graph(
        Builder const& builder,
        std::span<h::Module const> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    std::pmr::vector<h::Module*> calculate_modules_for_recompilation(
        Builder const& builder,
        Dependency_graph const& dependency_graph,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    struct Compilation_database
    {
    };

    void update_compilation_database(
        Compilation_database& compilation_database,
        Builder const& builder
    );

    void compile_modules(
        Builder const& builder,
        std::span<h::Module* const> const core_modules
    );

}
