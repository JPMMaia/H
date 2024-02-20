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

    std::string_view exclude_header(std::string_view const llvm_ir)
    {
        std::size_t current_index = 0;

        std::size_t const location = llvm_ir.find("\n\n", current_index);
        if (location != std::string_view::npos)
            current_index = location + 1;

        return llvm_ir.substr(current_index, llvm_ir.size());
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

        h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm();
        h::compiler::LLVM_module_data llvm_module_data = h::compiler::create_llvm_module(llvm_data, module.value(), module_name_to_file_path_map);
        std::string const llvm_ir = h::compiler::to_string(*llvm_module_data.module);

        std::string_view const llvm_ir_body = exclude_header(llvm_ir);

        char const* const expected_llvm_ir = R"(
@global_0 = internal constant [13 x i8] c"Hello world!\00"

define i32 @main() {
entry:
  %call_puts = call i32 @puts(ptr @global_0)
  ret i32 0
}
)";

        CHECK(llvm_ir_body == expected_llvm_ir);
    }
}
