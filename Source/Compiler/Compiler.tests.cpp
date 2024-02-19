#include <cstdio>
#include <filesystem>
#include <memory_resource>
#include <optional>
#include <string>
#include <unordered_map>

import h.core;
import h.compiler;
import h.json_serializer;
import h.json_serializer.operators;

using h::json::operators::operator<<;

#include <catch2/catch_all.hpp>

namespace h
{
    static std::filesystem::path const g_test_files_path = std::filesystem::path{ TEST_FILES_PATH };
    static std::filesystem::path const g_output_binary_path = std::filesystem::path{ OUTPUT_BINARY_PATH };
    static std::filesystem::path const g_standard_library_path = std::filesystem::path{ C_STANDARD_LIBRARY_PATH };

    std::optional<std::pmr::string> get_file_contents(char const* const path)
    {
        std::FILE* file = std::fopen(path, "rb");
        if (file == nullptr)
            return {};

        std::pmr::string contents;
        std::fseek(file, 0, SEEK_END);
        contents.resize(std::ftell(file));
        std::rewind(file);
        std::fread(&contents[0], 1, contents.size(), file);
        std::fclose(file);

        return contents;
    }

    std::optional<std::pmr::string> get_file_contents(std::filesystem::path const& path)
    {
        std::string const path_string = path.generic_string();
        std::optional<std::pmr::string> const file_contents = get_file_contents(path_string.c_str());
        return file_contents;
    }

    TEST_CASE("Compile hello world!")
    {
        std::optional<std::pmr::string> const json_data = get_file_contents(g_test_files_path / "hello_world.hl");
        REQUIRE(json_data.has_value());

        std::optional<h::Module> const module = h::json::read<h::Module>(json_data.value().c_str());
        REQUIRE(module.has_value());

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
        {
            { "C.stdio", g_standard_library_path / "C_stdio.hl" }
        };

        std::filesystem::path const output = g_output_binary_path / "hello_world.o";
        compiler::generate_code(output, module.value(), module_name_to_file_path_map);

        CHECK(std::filesystem::exists(output));
    }
}
