import h.compiler;
import h.compiler.builder;
import h.compiler.target;

#include <filesystem>
#include <string_view>

#include <catch2/catch_all.hpp>

namespace h::compiler
{
    static std::filesystem::path const g_examples_directory = std::filesystem::path{ EXAMPLES_DIRECTORY };

    void test_builder(
        std::string_view const project_name
    )
    {
        std::filesystem::path const temporary_directory_path = std::filesystem::temp_directory_path();
        std::filesystem::path const build_directory_path = temporary_directory_path / project_name;
        std::filesystem::path const artifact_file_path = g_examples_directory / project_name / "hlang_artifact.json";
    
        h::compiler::Target const target = h::compiler::get_default_target();

        h::compiler::Compilation_options const compilation_options
        {

        };

        std::filesystem::remove_all(build_directory_path);

        Builder builder = create_builder(
            target,
            build_directory_path,
            {},
            {},
            compilation_options
        );
    
        build_artifact(builder, artifact_file_path);

        // TODO check that artifact output file was created
    }

    TEST_CASE("Build Hello_world", "[Builder]")
    {
        test_builder("Hello_world");
    }
}
