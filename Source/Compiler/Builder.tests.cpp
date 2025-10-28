import h.common.filesystem;
import h.compiler;
import h.compiler.builder;
import h.compiler.target;

#include <filesystem>
#include <span>
#include <string_view>
#include <vector>

#include <catch2/catch_all.hpp>

namespace h::compiler
{
    static std::filesystem::path const g_examples_directory = std::filesystem::path{ EXAMPLES_DIRECTORY };
    static std::filesystem::path const g_standard_repository_file_path = std::filesystem::path{ STANDARD_REPOSITORY_FILE_PATH };

    static std::pmr::string get_binary_name(
        std::string_view const name,
        h::compiler::Target const& target
    )
    {
        if (target.operating_system == "windows")
        {
            return std::pmr::string{name} + ".exe";
        }

        return std::pmr::string{name};
    }

    static std::pmr::string get_static_library_name(
        std::string_view const name,
        h::compiler::Target const& target
    )
    {
        if (target.operating_system == "windows")
        {
            return std::pmr::string{name} + ".lib";
        }

        return std::pmr::string{name} + ".a";
    }

    void test_builder(
        std::string_view const project_name,
        std::filesystem::path const& main_artifact_path,
        h::compiler::Target const& target,
        std::span<std::filesystem::path const> const additional_repository_paths,
        std::span<std::filesystem::path const> const expected_output_paths
    )
    {
        std::filesystem::path const temporary_directory_path = std::filesystem::temp_directory_path();
        std::filesystem::path const build_directory_path = temporary_directory_path / project_name;
        std::filesystem::path const artifact_file_path = g_examples_directory / project_name / main_artifact_path;

        std::pmr::vector<std::filesystem::path> header_search_directories = h::common::get_default_header_search_directories();
        
        std::pmr::vector<std::filesystem::path> repository_paths{ g_standard_repository_file_path };
        repository_paths.insert(repository_paths.end(), additional_repository_paths.begin(), additional_repository_paths.end());

        h::compiler::Compilation_options const compilation_options
        {

        };

        std::filesystem::remove_all(build_directory_path);

        Builder builder = create_builder(
            target,
            build_directory_path,
            header_search_directories,
            repository_paths,
            compilation_options,
            {}
        );
    
        build_artifact(builder, artifact_file_path);

        for (std::filesystem::path const& expected_output_path : expected_output_paths)
        {
            std::filesystem::path const output_path = build_directory_path / expected_output_path;
            CHECK(std::filesystem::exists(output_path));
        }
    }

    TEST_CASE("Build Hello_world", "[Builder]")
    {
        h::compiler::Target const target = h::compiler::get_default_target();

        std::pmr::vector<std::filesystem::path> const expected_output_paths
        {
            std::filesystem::path{"bin"} / get_binary_name("Hello_world", target)
        };

        test_builder("Hello_world", "hlang_artifact.json", target, {}, expected_output_paths);
    }

    TEST_CASE("Build Link_with_library", "[Builder]")
    {
        h::compiler::Target const target = h::compiler::get_default_target();

        std::pmr::vector<std::filesystem::path> const repository_paths
        {
            g_examples_directory / "Link_with_library" / "hlang_repository.json"
        };

        std::pmr::vector<std::filesystem::path> const expected_output_paths
        {
            std::filesystem::path{"lib"} / get_static_library_name("my_library", target),
            std::filesystem::path{"bin"} / get_binary_name("my_app", target),
        };

        test_builder("Link_with_library", "my_app/hlang_artifact.json", target, repository_paths, expected_output_paths);
    }
}
