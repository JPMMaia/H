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

    void test_create_llvm_module(
        std::string_view const input_file,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        std::string_view const expected_llvm_ir
    )
    {
        std::optional<std::pmr::string> const json_data = get_file_contents(g_test_files_path / input_file);
        REQUIRE(json_data.has_value());

        std::optional<h::Module> const module = h::json::read<h::Module>(json_data.value().c_str());
        REQUIRE(module.has_value());

        h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm();
        h::compiler::LLVM_module_data llvm_module_data = h::compiler::create_llvm_module(llvm_data, module.value(), module_name_to_file_path_map);
        std::string const llvm_ir = h::compiler::to_string(*llvm_module_data.module);

        std::string_view const llvm_ir_body = exclude_header(llvm_ir);

        CHECK(llvm_ir_body == expected_llvm_ir);
    }

    TEST_CASE("Compile hello world!")
    {
        char const* const input_file = "hello_world.hl";

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
        {
            { "C.stdio", g_standard_library_path / "C_stdio.hl" }
        };

        char const* const expected_llvm_ir = R"(
@global_0 = internal constant [13 x i8] c"Hello world!\00"

define i32 @main() {
entry:
  %call_puts = call i32 @puts(ptr @global_0)
  ret i32 0
}
)";

        test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
    }

    TEST_CASE("Compile Numbers")
    {
        char const* const input_file = "numbers.hl";

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
        {
        };

        char const* const expected_llvm_ir = R"(
define i32 @main() {
entry:
  %my_int8 = alloca i8, align 1
  store i8 1, ptr %my_int8, align 1
  %my_int16 = alloca i16, align 2
  store i16 1, ptr %my_int16, align 2
  %my_int32 = alloca i32, align 4
  store i32 1, ptr %my_int32, align 4
  %my_int64 = alloca i64, align 8
  store i64 1, ptr %my_int64, align 8
  %my_uint8 = alloca i8, align 1
  store i8 1, ptr %my_uint8, align 1
  %my_uint16 = alloca i16, align 2
  store i16 1, ptr %my_uint16, align 2
  %my_uint32 = alloca i32, align 4
  store i32 1, ptr %my_uint32, align 4
  %my_uint64 = alloca i64, align 8
  store i64 1, ptr %my_uint64, align 8
  %my_float16 = alloca half, align 2
  store half 0xH3C00, ptr %my_float16, align 2
  %my_float32 = alloca float, align 4
  store float 1.000000e+00, ptr %my_float32, align 4
  %my_float64 = alloca double, align 8
  store double 1.000000e+00, ptr %my_float64, align 8
  ret i32 0
}
)";

        test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
    }

    TEST_CASE("Compile Numeric_casts")
    {
        char const* const input_file = "numeric_casts.hl";

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
        {
        };

        char const* const expected_llvm_ir = R"(
define i32 @do_casts(i32 %uint32_argument, i64 %uint64_argument, i32 %int32_argument, i64 %int64_argument, half %float16_argument, float %float32_argument, double %float64_argument) {
entry:
  %0 = trunc i64 %uint64_argument to i32
  %u64_to_u32 = alloca i32, align 4
  store i32 %0, ptr %u64_to_u32, align 4
  %1 = trunc i64 %uint64_argument to i32
  %u64_to_i32 = alloca i32, align 4
  store i32 %1, ptr %u64_to_i32, align 4
  %2 = trunc i64 %int64_argument to i32
  %i64_to_u32 = alloca i32, align 4
  store i32 %2, ptr %i64_to_u32, align 4
  %3 = trunc i64 %int64_argument to i32
  %i64_to_i32 = alloca i32, align 4
  store i32 %3, ptr %i64_to_i32, align 4
  %4 = zext i32 %uint32_argument to i64
  %u32_to_u64 = alloca i64, align 8
  store i64 %4, ptr %u32_to_u64, align 8
  %5 = zext i32 %uint32_argument to i64
  %u32_to_i64 = alloca i64, align 8
  store i64 %5, ptr %u32_to_i64, align 8
  %6 = zext i32 %int32_argument to i64
  %i32_to_u64 = alloca i64, align 8
  store i64 %6, ptr %i32_to_u64, align 8
  %7 = sext i32 %int32_argument to i64
  %i32_to_i64 = alloca i64, align 8
  store i64 %7, ptr %i32_to_i64, align 8
  %8 = uitofp i32 %uint32_argument to float
  %u32_to_f32 = alloca float, align 4
  store float %8, ptr %u32_to_f32, align 4
  %9 = sitofp i32 %int32_argument to float
  %i32_to_f32 = alloca float, align 4
  store float %9, ptr %i32_to_f32, align 4
  %10 = fptoui float %float32_argument to i32
  %f32_to_u32 = alloca i32, align 4
  store i32 %10, ptr %f32_to_u32, align 4
  %11 = fptosi float %float32_argument to i32
  %f32_to_i32 = alloca i32, align 4
  store i32 %11, ptr %f32_to_i32, align 4
  %12 = fpext half %float16_argument to float
  %f16_to_f32 = alloca float, align 4
  store float %12, ptr %f16_to_f32, align 4
  %13 = fpext float %float32_argument to double
  %f32_to_f64 = alloca double, align 8
  store double %13, ptr %f32_to_f64, align 8
  %14 = fptrunc double %float64_argument to float
  %f64_to_f32 = alloca float, align 4
  store float %14, ptr %f64_to_f32, align 4
  %15 = fptrunc float %float32_argument to half
  %f32_to_f16 = alloca half, align 2
  store half %15, ptr %f32_to_f16, align 2
  ret i32 0
}
)";

        test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
    }

    TEST_CASE("Compile Variables")
    {
        char const* const input_file = "variables.hl";

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
        {
        };

        char const* const expected_llvm_ir = R"(
define i32 @main() {
entry:
  %my_constant_variable = alloca i32, align 4
  store i32 1, ptr %my_constant_variable, align 4
  %my_mutable_variable = alloca i32, align 4
  store i32 2, ptr %my_mutable_variable, align 4
  store i32 3, ptr %my_mutable_variable, align 4
  ret i32 0
}
)";

        test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
    }
}
