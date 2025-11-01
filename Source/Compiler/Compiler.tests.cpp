#include <cstdio>
#include <filesystem>
#include <memory_resource>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>

#include <llvm/Analysis/CGSCCPassManager.h>
#include <llvm/Analysis/LoopAnalysisManager.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/PassInstrumentation.h>
#include <llvm/IR/PassManager.h>
#include <llvm/Passes/StandardInstrumentations.h>
#include <llvm/Target/TargetMachine.h>

import h.binary_serializer;
import h.core;
import h.core.declarations;
import h.core.struct_layout;
import h.common;
import h.common.filesystem;
import h.compiler;
import h.compiler.artifact;
import h.compiler.clang_code_generation;
import h.compiler.clang_data;
import h.compiler.common;
import h.compiler.expressions;
import h.compiler.types;
import h.json_serializer.operators;
import h.c_header_converter;
import h.parser.convertor;
import h.parser.parse_tree;
import h.parser.parser;

using h::json::operators::operator<<;

#include <catch2/catch_all.hpp>

namespace h
{
  static std::filesystem::path const g_test_source_files_path = std::filesystem::path{ TEST_SOURCE_FILES_PATH };
  static std::filesystem::path const g_standard_library_path = std::filesystem::path{ C_STANDARD_LIBRARY_PATH };
  static std::filesystem::path const g_tests_output_directory_path = std::filesystem::path{ TESTS_OUTPUT_DIRECTORY_PATH };

  std::filesystem::path find_c_header_path(std::string_view const filename)
  {
    std::pmr::vector<std::filesystem::path> header_search_directories = h::common::get_default_header_search_directories();
    std::optional<std::filesystem::path> const header_path = h::compiler::find_c_header_path(filename, header_search_directories);
    REQUIRE(header_path.has_value());
    return header_path.value();
  }

  std::filesystem::path import_c_header_and_get_file_path(
    std::string_view const header_name,
    std::string_view const filename
  )
  {
    static std::mutex mutex;
    std::lock_guard<std::mutex> lock{mutex};

    std::filesystem::path const input_file_path = find_c_header_path(filename);
    std::filesystem::path const output_file_path = (g_standard_library_path / filename).replace_extension(".hl");

    if (std::filesystem::exists(output_file_path))
      return output_file_path;

    if (!std::filesystem::exists(output_file_path.parent_path()))
      std::filesystem::create_directories(output_file_path.parent_path());

    h::c::Options const options = {};
    h::c::import_header_and_write_to_file(
      header_name,
      input_file_path,
      output_file_path,
      options
    );

    return output_file_path;
  }

  std::filesystem::path parse_and_get_file_path(
    std::filesystem::path const& source_file_path
  )
  {
    std::optional<h::Module> const core_module = h::parser::parse_and_convert_to_module(
        source_file_path,
        {},
        {}
    );
    REQUIRE(core_module.has_value());

    std::filesystem::path const output_file_path = g_tests_output_directory_path / std::format("{}.hlb", core_module.value().name);
    if (!std::filesystem::exists(output_file_path.parent_path()))
      std::filesystem::create_directories(output_file_path.parent_path());

    h::binary_serializer::write_module_to_file(output_file_path, core_module.value(), {});

    return output_file_path;
  }

  std::string_view exclude_header(std::string_view const llvm_ir)
  {
    std::size_t current_index = 0;

    std::size_t const location = llvm_ir.find("\n\n", current_index);
    if (location == std::string_view::npos)
      return "";

    current_index = location + 1;
    return llvm_ir.substr(current_index, llvm_ir.size());
  }

  struct Test_options
  {
    bool debug = false;
    std::string_view target_triple = "x86_64-pc-linux-gnu";
    h::compiler::Contract_options contract_options = h::compiler::Contract_options::Log_error_and_abort;
  };

  void test_create_llvm_module(
    std::string_view const input_file,
    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
    std::string_view const expected_llvm_ir,
    Test_options const test_options = {}
  )
  {
    std::filesystem::path const input_file_path = g_test_source_files_path / input_file;
    std::optional<std::pmr::u8string> input_content = h::common::get_file_utf8_contents(input_file_path);
    REQUIRE(input_content.has_value());

    h::parser::Parser parser = h::parser::create_parser();

    h::parser::Parse_tree parse_tree = h::parser::parse(parser, std::move(input_content.value()));

    h::parser::Parse_node const root = get_root_node(parse_tree);

    std::optional<h::Module> core_module = h::parser::parse_node_to_module(
      parse_tree,
      root,
      input_file_path,
      {},
      {}
    );
    REQUIRE(core_module.has_value());

    h::compiler::Compilation_options const compilation_options
    {
      .target_triple = test_options.target_triple,
      .is_optimized = false,
      .debug = test_options.debug,
      .contract_options = test_options.contract_options,
    };

    h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm(compilation_options);

    h::compiler::LLVM_module_data llvm_module_data = h::compiler::create_llvm_module(llvm_data, core_module.value(), module_name_to_file_path_map, compilation_options);
    std::string const llvm_ir = h::compiler::to_string(*llvm_module_data.module);

    std::string_view const llvm_ir_body = exclude_header(llvm_ir);

    CHECK(llvm_ir_body == expected_llvm_ir);

    h::parser::destroy_tree(std::move(parse_tree));
    h::parser::destroy_parser(std::move(parser));
  }

  TEST_CASE("Compile Address Of", "[LLVM_IR]")
  {
    char const* const input_file = "address_of.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.Address_of_My_struct = type { i32, i32 }

; Function Attrs: convergent
define void @Address_of_take(ptr noundef %"arguments[0].integers", i64 noundef %"arguments[1].instance") #0 {
entry:
  %integers = alloca ptr, align 8
  %0 = alloca %struct.Address_of_My_struct, align 4
  %p0 = alloca ptr, align 8
  %p1 = alloca ptr, align 8
  store ptr %"arguments[0].integers", ptr %integers, align 8
  %1 = getelementptr inbounds %struct.Address_of_My_struct, ptr %0, i32 0, i32 0
  store i64 %"arguments[1].instance", ptr %1, align 4
  %array_element_pointer = getelementptr i32, ptr %integers, i32 1
  store ptr %array_element_pointer, ptr %p0, align 8
  %2 = getelementptr inbounds %struct.Address_of_My_struct, ptr %0, i32 0, i32 1
  store ptr %2, ptr %p1, align 8
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Array Slices", "[LLVM_IR]")
  {
    char const* const input_file = "array_slices.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.H_Builtin_Generic_array_slice = type { ptr, i64 }

; Function Attrs: convergent
define void @Array_slices_take(ptr %"arguments[0].integers_0", i64 %"arguments[0].integers_1") #0 {
entry:
  %integers = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %data = alloca ptr, align 8
  %length = alloca i64, align 8
  %v0 = alloca i32, align 4
  %v1 = alloca i32, align 4
  %v2 = alloca i32, align 4
  %0 = getelementptr inbounds { ptr, i64 }, ptr %integers, i32 0, i32 0
  store ptr %"arguments[0].integers_0", ptr %0, align 8
  %1 = getelementptr inbounds { ptr, i64 }, ptr %integers, i32 0, i32 1
  store i64 %"arguments[0].integers_1", ptr %1, align 8
  %2 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %integers, i32 0, i32 0
  store ptr %2, ptr %data, align 8
  %3 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %integers, i32 0, i32 1
  %4 = load i64, ptr %3, align 8
  store i64 %4, ptr %length, align 8
  %5 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %integers, i32 0, i32 0
  %array_slice_element_pointer = getelementptr i32, ptr %5, i32 0
  %6 = load i32, ptr %array_slice_element_pointer, align 4
  store i32 %6, ptr %v0, align 4
  %7 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %integers, i32 0, i32 0
  %array_slice_element_pointer1 = getelementptr i32, ptr %7, i32 1
  %8 = load i32, ptr %array_slice_element_pointer1, align 4
  store i32 %8, ptr %v1, align 4
  %9 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %integers, i32 0, i32 0
  %array_slice_element_pointer2 = getelementptr i32, ptr %9, i32 2
  %10 = load i32, ptr %array_slice_element_pointer2, align 4
  store i32 %10, ptr %v2, align 4
  ret void
}

; Function Attrs: convergent
define void @Array_slices_run() #0 {
entry:
  %array = alloca [4 x i32], i64 4, align 4
  %a = alloca [4 x i32], align 4
  %0 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %1 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %array4 = alloca [1 x i32], i64 1, align 4
  %2 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %b = alloca i32, align 4
  %c = alloca ptr, align 8
  %3 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %d = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %array_element_pointer = getelementptr [4 x i32], ptr %array, i32 0, i32 0
  store i32 0, ptr %array_element_pointer, align 4
  %array_element_pointer1 = getelementptr [4 x i32], ptr %array, i32 0, i32 1
  store i32 1, ptr %array_element_pointer1, align 4
  %array_element_pointer2 = getelementptr [4 x i32], ptr %array, i32 0, i32 2
  store i32 2, ptr %array_element_pointer2, align 4
  %array_element_pointer3 = getelementptr [4 x i32], ptr %array, i32 0, i32 3
  store i32 3, ptr %array_element_pointer3, align 4
  %4 = load [4 x i32], ptr %array, align 4
  store [4 x i32] %4, ptr %a, align 4
  %data_pointer = getelementptr [4 x i32], ptr %a, i32 0, i32 0
  %5 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %0, i32 0, i32 0
  store ptr %data_pointer, ptr %5, align 8
  %6 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %0, i32 0, i32 1
  store i64 4, ptr %6, align 8
  %7 = getelementptr inbounds { ptr, i64 }, ptr %0, i32 0, i32 0
  %8 = load ptr, ptr %7, align 8
  %9 = getelementptr inbounds { ptr, i64 }, ptr %0, i32 0, i32 1
  %10 = load i64, ptr %9, align 8
  call void @Array_slices_take(ptr %8, i64 %10)
  %11 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %1, i32 0, i32 0
  store ptr null, ptr %11, align 8
  %12 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %1, i32 0, i32 1
  store i64 0, ptr %12, align 8
  %13 = getelementptr inbounds { ptr, i64 }, ptr %1, i32 0, i32 0
  %14 = load ptr, ptr %13, align 8
  %15 = getelementptr inbounds { ptr, i64 }, ptr %1, i32 0, i32 1
  %16 = load i64, ptr %15, align 8
  call void @Array_slices_take(ptr %14, i64 %16)
  %array_element_pointer5 = getelementptr [1 x i32], ptr %array4, i32 0, i32 0
  store i32 4, ptr %array_element_pointer5, align 4
  %data_pointer6 = getelementptr [1 x i32], ptr %array4, i32 0, i32 0
  %17 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %2, i32 0, i32 0
  store ptr %data_pointer6, ptr %17, align 8
  %18 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %2, i32 0, i32 1
  store i64 1, ptr %18, align 8
  %19 = getelementptr inbounds { ptr, i64 }, ptr %2, i32 0, i32 0
  %20 = load ptr, ptr %19, align 8
  %21 = getelementptr inbounds { ptr, i64 }, ptr %2, i32 0, i32 1
  %22 = load i64, ptr %21, align 8
  call void @Array_slices_take(ptr %20, i64 %22)
  store i32 0, ptr %b, align 4
  store ptr %b, ptr %c, align 8
  %23 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %3, i32 0, i32 0
  store ptr %c, ptr %23, align 8
  %24 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %3, i32 0, i32 1
  store i64 1, ptr %24, align 8
  %25 = load %struct.H_Builtin_Generic_array_slice, ptr %3, align 8
  store %struct.H_Builtin_Generic_array_slice %25, ptr %d, align 8
  %26 = getelementptr inbounds { ptr, i64 }, ptr %d, i32 0, i32 0
  %27 = load ptr, ptr %26, align 8
  %28 = getelementptr inbounds { ptr, i64 }, ptr %d, i32 0, i32 1
  %29 = load i64, ptr %28, align 8
  call void @Array_slices_take(ptr %27, i64 %29)
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Asserts", "[LLVM_IR]")
  {
    char const* const input_file = "assert_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
@function_contract_error_string = private unnamed_addr constant [69 x i8] c"In function 'Assert_expressions.run' assert 'Value is not 0' failed!\00"
@function_contract_error_string.1 = private unnamed_addr constant [55 x i8] c"In function 'Assert_expressions.run' assert '' failed!\00"

; Function Attrs: convergent
define void @Assert_expressions_run(i32 noundef %"arguments[0].value") #0 {
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  %0 = load i32, ptr %value, align 4
  %1 = icmp ne i32 %0, 0
  br i1 %1, label %condition_success, label %condition_fail

condition_success:                                ; preds = %entry
  %2 = load i32, ptr %value, align 4
  %3 = icmp ne i32 %2, 1
  br i1 %3, label %condition_success1, label %condition_fail2

condition_fail:                                   ; preds = %entry
  %4 = call i32 @puts(ptr @function_contract_error_string)
  call void @abort()
  unreachable

condition_success1:                               ; preds = %condition_success
  ret void

condition_fail2:                                  ; preds = %condition_success
  %5 = call i32 @puts(ptr @function_contract_error_string.1)
  call void @abort()
  unreachable
}

declare i32 @puts(ptr)

declare void @abort()

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Assignments", "[LLVM_IR]")
  {
    char const* const input_file = "assignment_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Assignment_expressions_integer_operations(i32 noundef %"arguments[0].other_signed_integer", i32 noundef %"arguments[1].other_unsigned_integer") #0 {
entry:
  %other_signed_integer = alloca i32, align 4
  %other_unsigned_integer = alloca i32, align 4
  %my_signed_integer = alloca i32, align 4
  %my_unsigned_integer = alloca i32, align 4
  store i32 %"arguments[0].other_signed_integer", ptr %other_signed_integer, align 4
  store i32 %"arguments[1].other_unsigned_integer", ptr %other_unsigned_integer, align 4
  store i32 1, ptr %my_signed_integer, align 4
  store i32 1, ptr %my_unsigned_integer, align 4
  store i32 2, ptr %my_signed_integer, align 4
  store i32 2, ptr %my_unsigned_integer, align 4
  %0 = load i32, ptr %my_signed_integer, align 4
  %1 = load i32, ptr %other_signed_integer, align 4
  %2 = add i32 %0, %1
  store i32 %2, ptr %my_signed_integer, align 4
  %3 = load i32, ptr %my_signed_integer, align 4
  %4 = load i32, ptr %other_signed_integer, align 4
  %5 = sub i32 %3, %4
  store i32 %5, ptr %my_signed_integer, align 4
  %6 = load i32, ptr %my_signed_integer, align 4
  %7 = load i32, ptr %other_signed_integer, align 4
  %8 = mul i32 %6, %7
  store i32 %8, ptr %my_signed_integer, align 4
  %9 = load i32, ptr %my_signed_integer, align 4
  %10 = load i32, ptr %other_signed_integer, align 4
  %11 = sdiv i32 %9, %10
  store i32 %11, ptr %my_signed_integer, align 4
  %12 = load i32, ptr %my_unsigned_integer, align 4
  %13 = load i32, ptr %other_unsigned_integer, align 4
  %14 = udiv i32 %12, %13
  store i32 %14, ptr %my_unsigned_integer, align 4
  %15 = load i32, ptr %my_signed_integer, align 4
  %16 = load i32, ptr %other_signed_integer, align 4
  %17 = srem i32 %15, %16
  store i32 %17, ptr %my_signed_integer, align 4
  %18 = load i32, ptr %my_unsigned_integer, align 4
  %19 = load i32, ptr %other_unsigned_integer, align 4
  %20 = urem i32 %18, %19
  store i32 %20, ptr %my_unsigned_integer, align 4
  %21 = load i32, ptr %my_signed_integer, align 4
  %22 = load i32, ptr %other_signed_integer, align 4
  %23 = and i32 %21, %22
  store i32 %23, ptr %my_signed_integer, align 4
  %24 = load i32, ptr %my_signed_integer, align 4
  %25 = load i32, ptr %other_signed_integer, align 4
  %26 = or i32 %24, %25
  store i32 %26, ptr %my_signed_integer, align 4
  %27 = load i32, ptr %my_signed_integer, align 4
  %28 = load i32, ptr %other_signed_integer, align 4
  %29 = xor i32 %27, %28
  store i32 %29, ptr %my_signed_integer, align 4
  %30 = load i32, ptr %my_signed_integer, align 4
  %31 = load i32, ptr %other_signed_integer, align 4
  %32 = shl i32 %30, %31
  store i32 %32, ptr %my_signed_integer, align 4
  %33 = load i32, ptr %my_signed_integer, align 4
  %34 = load i32, ptr %other_signed_integer, align 4
  %35 = ashr i32 %33, %34
  store i32 %35, ptr %my_signed_integer, align 4
  %36 = load i32, ptr %my_unsigned_integer, align 4
  %37 = load i32, ptr %other_unsigned_integer, align 4
  %38 = lshr i32 %36, %37
  store i32 %38, ptr %my_unsigned_integer, align 4
  ret void
}

; Function Attrs: convergent
define void @Assignment_expressions_float32_operations(float noundef %"arguments[0].other_float") #0 {
entry:
  %other_float = alloca float, align 4
  %my_float = alloca float, align 4
  store float %"arguments[0].other_float", ptr %other_float, align 4
  store float 1.000000e+00, ptr %my_float, align 4
  store float 2.000000e+00, ptr %my_float, align 4
  %0 = load float, ptr %my_float, align 4
  %1 = load float, ptr %other_float, align 4
  %2 = fadd float %0, %1
  store float %2, ptr %my_float, align 4
  %3 = load float, ptr %my_float, align 4
  %4 = load float, ptr %other_float, align 4
  %5 = fsub float %3, %4
  store float %5, ptr %my_float, align 4
  %6 = load float, ptr %my_float, align 4
  %7 = load float, ptr %other_float, align 4
  %8 = fmul float %6, %7
  store float %8, ptr %my_float, align 4
  %9 = load float, ptr %my_float, align 4
  %10 = load float, ptr %other_float, align 4
  %11 = fdiv float %9, %10
  store float %11, ptr %my_float, align 4
  %12 = load float, ptr %my_float, align 4
  %13 = load float, ptr %other_float, align 4
  %14 = frem float %12, %13
  store float %14, ptr %my_float, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Binary Expressions Precedence", "[LLVM_IR]")
  {
    char const* const input_file = "binary_expressions_precedence.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Binary_expressions_operator_precedence_foo(i32 noundef %"arguments[0].a", i32 noundef %"arguments[1].b", i32 noundef %"arguments[2].c") #0 {
entry:
  %a = alloca i32, align 4
  %b = alloca i32, align 4
  %c = alloca i32, align 4
  %case_0 = alloca i32, align 4
  %case_1 = alloca i32, align 4
  %case_2 = alloca i32, align 4
  %case_3 = alloca i32, align 4
  %case_4 = alloca i32, align 4
  %pointer_a = alloca ptr, align 8
  %pointer_b = alloca ptr, align 8
  %case_7 = alloca i32, align 4
  %case_8 = alloca i32, align 4
  %case_9 = alloca i32, align 4
  %case_10 = alloca i1, align 1
  %case_11 = alloca i1, align 1
  %case_12 = alloca i1, align 1
  %case_13 = alloca i1, align 1
  %case_14 = alloca i32, align 4
  store i32 %"arguments[0].a", ptr %a, align 4
  store i32 %"arguments[1].b", ptr %b, align 4
  store i32 %"arguments[2].c", ptr %c, align 4
  %0 = load i32, ptr %a, align 4
  %1 = load i32, ptr %b, align 4
  %2 = load i32, ptr %c, align 4
  %3 = mul i32 %1, %2
  %4 = add i32 %0, %3
  store i32 %4, ptr %case_0, align 4
  %5 = load i32, ptr %a, align 4
  %6 = load i32, ptr %b, align 4
  %7 = mul i32 %5, %6
  %8 = load i32, ptr %c, align 4
  %9 = add i32 %7, %8
  store i32 %9, ptr %case_1, align 4
  %10 = load i32, ptr %a, align 4
  %11 = load i32, ptr %b, align 4
  %12 = sdiv i32 %10, %11
  %13 = load i32, ptr %c, align 4
  %14 = mul i32 %12, %13
  store i32 %14, ptr %case_2, align 4
  %15 = load i32, ptr %a, align 4
  %16 = load i32, ptr %b, align 4
  %17 = mul i32 %15, %16
  %18 = load i32, ptr %c, align 4
  %19 = sdiv i32 %17, %18
  store i32 %19, ptr %case_3, align 4
  %20 = load i32, ptr %a, align 4
  %21 = call i32 @Binary_expressions_operator_precedence_other_function()
  %22 = mul i32 %20, %21
  %23 = load i32, ptr %b, align 4
  %24 = add i32 %22, %23
  store i32 %24, ptr %case_4, align 4
  store ptr %case_0, ptr %pointer_a, align 8
  store ptr %case_1, ptr %pointer_b, align 8
  %25 = load ptr, ptr %pointer_a, align 8
  %26 = load i32, ptr %25, align 4
  %27 = load ptr, ptr %pointer_b, align 8
  %28 = load i32, ptr %27, align 4
  %29 = mul i32 %26, %28
  store i32 %29, ptr %case_7, align 4
  %30 = load i32, ptr %a, align 4
  %31 = load i32, ptr %b, align 4
  %32 = add i32 %30, %31
  %33 = load i32, ptr %c, align 4
  %34 = mul i32 %32, %33
  store i32 %34, ptr %case_8, align 4
  %35 = load i32, ptr %a, align 4
  %36 = load i32, ptr %b, align 4
  %37 = load i32, ptr %c, align 4
  %38 = add i32 %36, %37
  %39 = mul i32 %35, %38
  store i32 %39, ptr %case_9, align 4
  %40 = load i32, ptr %a, align 4
  %41 = icmp eq i32 %40, 0
  %42 = load i32, ptr %b, align 4
  %43 = icmp eq i32 %42, 1
  %44 = and i1 %41, %43
  store i1 %44, ptr %case_10, align 1
  %45 = load i32, ptr %a, align 4
  %46 = load i32, ptr %b, align 4
  %47 = and i32 %45, %46
  %48 = load i32, ptr %b, align 4
  %49 = load i32, ptr %a, align 4
  %50 = and i32 %48, %49
  %51 = icmp eq i32 %47, %50
  store i1 %51, ptr %case_11, align 1
  %52 = load i32, ptr %a, align 4
  %53 = load i32, ptr %b, align 4
  %54 = icmp slt i32 %52, %53
  %55 = load i32, ptr %b, align 4
  %56 = load i32, ptr %c, align 4
  %57 = icmp slt i32 %55, %56
  %58 = and i1 %54, %57
  store i1 %58, ptr %case_12, align 1
  %59 = load i32, ptr %a, align 4
  %60 = load i32, ptr %b, align 4
  %61 = add i32 %59, %60
  %62 = load i32, ptr %b, align 4
  %63 = load i32, ptr %c, align 4
  %64 = add i32 %62, %63
  %65 = icmp eq i32 %61, %64
  store i1 %65, ptr %case_13, align 1
  %66 = load i32, ptr %a, align 4
  %67 = sub i32 0, %66
  %68 = load i32, ptr %b, align 4
  %69 = sub i32 0, %68
  %70 = add i32 %67, %69
  store i32 %70, ptr %case_14, align 4
  ret void
}

; Function Attrs: convergent
define private i32 @Binary_expressions_operator_precedence_other_function() #0 {
entry:
  ret i32 1
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Binary Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "binary_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Binary_expressions_integer_operations(i32 noundef %"arguments[0].first_signed_integer", i32 noundef %"arguments[1].second_signed_integer", i32 noundef %"arguments[2].first_unsigned_integer", i32 noundef %"arguments[3].second_unsigned_integer") #0 {
entry:
  %first_signed_integer = alloca i32, align 4
  %second_signed_integer = alloca i32, align 4
  %first_unsigned_integer = alloca i32, align 4
  %second_unsigned_integer = alloca i32, align 4
  %add = alloca i32, align 4
  %subtract = alloca i32, align 4
  %multiply = alloca i32, align 4
  %signed_divide = alloca i32, align 4
  %unsigned_divide = alloca i32, align 4
  %signed_modulus = alloca i32, align 4
  %unsigned_modulus = alloca i32, align 4
  %equal = alloca i1, align 1
  %not_equal = alloca i1, align 1
  %signed_less_than = alloca i1, align 1
  %unsigned_less_than = alloca i1, align 1
  %signed_less_than_or_equal_to = alloca i1, align 1
  %unsigned_less_than_or_equal_to = alloca i1, align 1
  %signed_greater_than = alloca i1, align 1
  %unsigned_greater_than = alloca i1, align 1
  %signed_greater_than_or_equal_to = alloca i1, align 1
  %unsigned_greater_than_or_equal_to = alloca i1, align 1
  %bitwise_and = alloca i32, align 4
  %bitwise_or = alloca i32, align 4
  %bitwise_xor = alloca i32, align 4
  %bit_shift_left = alloca i32, align 4
  %signed_bit_shift_right = alloca i32, align 4
  %unsigned_bit_shift_right = alloca i32, align 4
  store i32 %"arguments[0].first_signed_integer", ptr %first_signed_integer, align 4
  store i32 %"arguments[1].second_signed_integer", ptr %second_signed_integer, align 4
  store i32 %"arguments[2].first_unsigned_integer", ptr %first_unsigned_integer, align 4
  store i32 %"arguments[3].second_unsigned_integer", ptr %second_unsigned_integer, align 4
  %0 = load i32, ptr %first_signed_integer, align 4
  %1 = load i32, ptr %second_signed_integer, align 4
  %2 = add i32 %0, %1
  store i32 %2, ptr %add, align 4
  %3 = load i32, ptr %first_signed_integer, align 4
  %4 = load i32, ptr %second_signed_integer, align 4
  %5 = sub i32 %3, %4
  store i32 %5, ptr %subtract, align 4
  %6 = load i32, ptr %first_signed_integer, align 4
  %7 = load i32, ptr %second_signed_integer, align 4
  %8 = mul i32 %6, %7
  store i32 %8, ptr %multiply, align 4
  %9 = load i32, ptr %first_signed_integer, align 4
  %10 = load i32, ptr %second_signed_integer, align 4
  %11 = sdiv i32 %9, %10
  store i32 %11, ptr %signed_divide, align 4
  %12 = load i32, ptr %first_unsigned_integer, align 4
  %13 = load i32, ptr %second_unsigned_integer, align 4
  %14 = udiv i32 %12, %13
  store i32 %14, ptr %unsigned_divide, align 4
  %15 = load i32, ptr %first_signed_integer, align 4
  %16 = load i32, ptr %second_signed_integer, align 4
  %17 = srem i32 %15, %16
  store i32 %17, ptr %signed_modulus, align 4
  %18 = load i32, ptr %first_unsigned_integer, align 4
  %19 = load i32, ptr %second_unsigned_integer, align 4
  %20 = urem i32 %18, %19
  store i32 %20, ptr %unsigned_modulus, align 4
  %21 = load i32, ptr %first_signed_integer, align 4
  %22 = load i32, ptr %second_signed_integer, align 4
  %23 = icmp eq i32 %21, %22
  store i1 %23, ptr %equal, align 1
  %24 = load i32, ptr %first_signed_integer, align 4
  %25 = load i32, ptr %second_signed_integer, align 4
  %26 = icmp ne i32 %24, %25
  store i1 %26, ptr %not_equal, align 1
  %27 = load i32, ptr %first_signed_integer, align 4
  %28 = load i32, ptr %second_signed_integer, align 4
  %29 = icmp slt i32 %27, %28
  store i1 %29, ptr %signed_less_than, align 1
  %30 = load i32, ptr %first_unsigned_integer, align 4
  %31 = load i32, ptr %second_unsigned_integer, align 4
  %32 = icmp ult i32 %30, %31
  store i1 %32, ptr %unsigned_less_than, align 1
  %33 = load i32, ptr %first_signed_integer, align 4
  %34 = load i32, ptr %second_signed_integer, align 4
  %35 = icmp sle i32 %33, %34
  store i1 %35, ptr %signed_less_than_or_equal_to, align 1
  %36 = load i32, ptr %first_unsigned_integer, align 4
  %37 = load i32, ptr %second_unsigned_integer, align 4
  %38 = icmp ule i32 %36, %37
  store i1 %38, ptr %unsigned_less_than_or_equal_to, align 1
  %39 = load i32, ptr %first_signed_integer, align 4
  %40 = load i32, ptr %second_signed_integer, align 4
  %41 = icmp sgt i32 %39, %40
  store i1 %41, ptr %signed_greater_than, align 1
  %42 = load i32, ptr %first_unsigned_integer, align 4
  %43 = load i32, ptr %second_unsigned_integer, align 4
  %44 = icmp ugt i32 %42, %43
  store i1 %44, ptr %unsigned_greater_than, align 1
  %45 = load i32, ptr %first_signed_integer, align 4
  %46 = load i32, ptr %second_signed_integer, align 4
  %47 = icmp sge i32 %45, %46
  store i1 %47, ptr %signed_greater_than_or_equal_to, align 1
  %48 = load i32, ptr %first_unsigned_integer, align 4
  %49 = load i32, ptr %second_unsigned_integer, align 4
  %50 = icmp uge i32 %48, %49
  store i1 %50, ptr %unsigned_greater_than_or_equal_to, align 1
  %51 = load i32, ptr %first_signed_integer, align 4
  %52 = load i32, ptr %second_signed_integer, align 4
  %53 = and i32 %51, %52
  store i32 %53, ptr %bitwise_and, align 4
  %54 = load i32, ptr %first_signed_integer, align 4
  %55 = load i32, ptr %second_signed_integer, align 4
  %56 = or i32 %54, %55
  store i32 %56, ptr %bitwise_or, align 4
  %57 = load i32, ptr %first_signed_integer, align 4
  %58 = load i32, ptr %second_signed_integer, align 4
  %59 = xor i32 %57, %58
  store i32 %59, ptr %bitwise_xor, align 4
  %60 = load i32, ptr %first_signed_integer, align 4
  %61 = load i32, ptr %second_signed_integer, align 4
  %62 = shl i32 %60, %61
  store i32 %62, ptr %bit_shift_left, align 4
  %63 = load i32, ptr %first_signed_integer, align 4
  %64 = load i32, ptr %second_signed_integer, align 4
  %65 = ashr i32 %63, %64
  store i32 %65, ptr %signed_bit_shift_right, align 4
  %66 = load i32, ptr %first_unsigned_integer, align 4
  %67 = load i32, ptr %second_unsigned_integer, align 4
  %68 = lshr i32 %66, %67
  store i32 %68, ptr %unsigned_bit_shift_right, align 4
  ret void
}

; Function Attrs: convergent
define void @Binary_expressions_boolean_operations(i8 noundef zeroext %"arguments[0].first_boolean", i8 noundef zeroext %"arguments[1].second_boolean") #0 {
entry:
  %first_boolean = alloca i1, align 1
  %second_boolean = alloca i1, align 1
  %equal = alloca i1, align 1
  %not_equal = alloca i1, align 1
  %logical_and = alloca i1, align 1
  %logical_or = alloca i1, align 1
  %0 = trunc i8 %"arguments[0].first_boolean" to i1
  store i1 %0, ptr %first_boolean, align 1
  %1 = trunc i8 %"arguments[1].second_boolean" to i1
  store i1 %1, ptr %second_boolean, align 1
  %2 = load i1, ptr %first_boolean, align 1
  %3 = load i1, ptr %second_boolean, align 1
  %4 = icmp eq i1 %2, %3
  store i1 %4, ptr %equal, align 1
  %5 = load i1, ptr %first_boolean, align 1
  %6 = load i1, ptr %second_boolean, align 1
  %7 = icmp ne i1 %5, %6
  store i1 %7, ptr %not_equal, align 1
  %8 = load i1, ptr %first_boolean, align 1
  %9 = load i1, ptr %second_boolean, align 1
  %10 = and i1 %8, %9
  store i1 %10, ptr %logical_and, align 1
  %11 = load i1, ptr %first_boolean, align 1
  %12 = load i1, ptr %second_boolean, align 1
  %13 = or i1 %11, %12
  store i1 %13, ptr %logical_or, align 1
  ret void
}

; Function Attrs: convergent
define void @Binary_expressions_float32_operations(float noundef %"arguments[0].first_float", float noundef %"arguments[1].second_float") #0 {
entry:
  %first_float = alloca float, align 4
  %second_float = alloca float, align 4
  %add = alloca float, align 4
  %subtract = alloca float, align 4
  %multiply = alloca float, align 4
  %divide = alloca float, align 4
  %modulus = alloca float, align 4
  %equal = alloca i1, align 1
  %not_equal = alloca i1, align 1
  %less_than = alloca i1, align 1
  %less_than_or_equal_to = alloca i1, align 1
  %greater_than = alloca i1, align 1
  %greater_than_or_equal_to = alloca i1, align 1
  store float %"arguments[0].first_float", ptr %first_float, align 4
  store float %"arguments[1].second_float", ptr %second_float, align 4
  %0 = load float, ptr %first_float, align 4
  %1 = load float, ptr %second_float, align 4
  %2 = fadd float %0, %1
  store float %2, ptr %add, align 4
  %3 = load float, ptr %first_float, align 4
  %4 = load float, ptr %second_float, align 4
  %5 = fsub float %3, %4
  store float %5, ptr %subtract, align 4
  %6 = load float, ptr %first_float, align 4
  %7 = load float, ptr %second_float, align 4
  %8 = fmul float %6, %7
  store float %8, ptr %multiply, align 4
  %9 = load float, ptr %first_float, align 4
  %10 = load float, ptr %second_float, align 4
  %11 = fdiv float %9, %10
  store float %11, ptr %divide, align 4
  %12 = load float, ptr %first_float, align 4
  %13 = load float, ptr %second_float, align 4
  %14 = frem float %12, %13
  store float %14, ptr %modulus, align 4
  %15 = load float, ptr %first_float, align 4
  %16 = load float, ptr %second_float, align 4
  %17 = fcmp oeq float %15, %16
  store i1 %17, ptr %equal, align 1
  %18 = load float, ptr %first_float, align 4
  %19 = load float, ptr %second_float, align 4
  %20 = fcmp one float %18, %19
  store i1 %20, ptr %not_equal, align 1
  %21 = load float, ptr %first_float, align 4
  %22 = load float, ptr %second_float, align 4
  %23 = fcmp olt float %21, %22
  store i1 %23, ptr %less_than, align 1
  %24 = load float, ptr %first_float, align 4
  %25 = load float, ptr %second_float, align 4
  %26 = fcmp ole float %24, %25
  store i1 %26, ptr %less_than_or_equal_to, align 1
  %27 = load float, ptr %first_float, align 4
  %28 = load float, ptr %second_float, align 4
  %29 = fcmp ogt float %27, %28
  store i1 %29, ptr %greater_than, align 1
  %30 = load float, ptr %first_float, align 4
  %31 = load float, ptr %second_float, align 4
  %32 = fcmp oge float %30, %31
  store i1 %32, ptr %greater_than_or_equal_to, align 1
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Binary Expressions Types", "[LLVM_IR]")
  {
    char const* const input_file = "binary_expressions_types.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Binary_expression_types_run() #0 {
entry:
  %p0 = alloca ptr, align 8
  %v0 = alloca i1, align 1
  store ptr null, ptr %p0, align 8
  %0 = load ptr, ptr %p0, align 8
  %1 = icmp eq ptr %0, null
  store i1 %1, ptr %v0, align 1
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }


  TEST_CASE("Compile Bit Fields", "[LLVM_IR]")
  {
    char const* const input_file = "bit_fields.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.bit_fields_My_struct = type { i64 }

; Function Attrs: convergent
define private i64 @bit_fields_run(i64 noundef %"arguments[0].parameter") #0 {
entry:
  %0 = alloca %struct.bit_fields_My_struct, align 8
  %a = alloca i32, align 4
  %b = alloca i32, align 4
  %c = alloca i32, align 4
  %d = alloca i32, align 4
  %e = alloca i32, align 4
  %1 = alloca %struct.bit_fields_My_struct, align 8
  %mutable_instance = alloca %struct.bit_fields_My_struct, align 8
  %2 = alloca %struct.bit_fields_My_struct, align 8
  %instance = alloca %struct.bit_fields_My_struct, align 8
  %3 = alloca %struct.bit_fields_My_struct, align 8
  %instance_2 = alloca %struct.bit_fields_My_struct, align 8
  %4 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %0, i32 0, i32 0
  store i64 %"arguments[0].parameter", ptr %4, align 8
  %5 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %0, i32 0, i32 0
  %6 = load i32, ptr %5, align 4
  %7 = lshr i32 %6, 0
  %8 = and i32 %7, 16777215
  store i32 %8, ptr %a, align 4
  %9 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %0, i32 0, i32 0
  %10 = load i32, ptr %9, align 4
  %11 = lshr i32 %10, 24
  %12 = and i32 %11, 255
  store i32 %12, ptr %b, align 4
  %13 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %0, i32 0, i32 0
  %14 = load i32, ptr %13, align 4
  %15 = lshr i32 %14, 32
  %16 = and i32 %15, 4095
  store i32 %16, ptr %c, align 4
  %17 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %0, i32 0, i32 0
  %18 = load i32, ptr %17, align 4
  %19 = lshr i32 %18, 44
  %20 = and i32 %19, 255
  store i32 %20, ptr %d, align 4
  %21 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %0, i32 0, i32 0
  %22 = load i32, ptr %21, align 4
  %23 = lshr i32 %22, 52
  %24 = and i32 %23, 4095
  store i32 %24, ptr %e, align 4
  %25 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %1, i32 0, i32 0
  %26 = load i32, ptr %25, align 4
  %27 = and i32 %26, -16777216
  %28 = or i32 %27, 0
  store i32 %28, ptr %25, align 4
  %29 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %1, i32 0, i32 0
  %30 = load i32, ptr %29, align 4
  %31 = and i32 %30, 16777215
  %32 = or i32 %31, 0
  store i32 %32, ptr %29, align 4
  %33 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %1, i32 0, i32 0
  %34 = load i32, ptr %33, align 4
  %35 = and i32 %34, -4096
  %36 = or i32 %35, poison
  store i32 %36, ptr %33, align 4
  %37 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %1, i32 0, i32 0
  %38 = load i32, ptr %37, align 4
  %39 = and i32 %38, -1044481
  %40 = or i32 %39, poison
  store i32 %40, ptr %37, align 4
  %41 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %1, i32 0, i32 0
  %42 = load i32, ptr %41, align 4
  %43 = and i32 %42, 1048575
  %44 = or i32 %43, poison
  store i32 %44, ptr %41, align 4
  %45 = load %struct.bit_fields_My_struct, ptr %1, align 8
  store %struct.bit_fields_My_struct %45, ptr %mutable_instance, align 8
  %46 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %mutable_instance, i32 0, i32 0
  %47 = load i32, ptr %46, align 4
  %48 = lshr i32 %47, 0
  %49 = and i32 %48, 16777215
  %50 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %mutable_instance, i32 0, i32 0
  %51 = load i32, ptr %50, align 4
  %52 = and i32 %51, -16777216
  %53 = or i32 %52, 1
  store i32 %53, ptr %50, align 4
  %54 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %mutable_instance, i32 0, i32 0
  %55 = load i32, ptr %54, align 4
  %56 = lshr i32 %55, 24
  %57 = and i32 %56, 255
  %58 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %mutable_instance, i32 0, i32 0
  %59 = load i32, ptr %58, align 4
  %60 = and i32 %59, 16777215
  %61 = or i32 %60, 33554432
  store i32 %61, ptr %58, align 4
  %62 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %mutable_instance, i32 0, i32 0
  %63 = load i32, ptr %62, align 4
  %64 = lshr i32 %63, 32
  %65 = and i32 %64, 4095
  %66 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %mutable_instance, i32 0, i32 0
  %67 = load i32, ptr %66, align 4
  %68 = and i32 %67, -4096
  %69 = or i32 %68, poison
  store i32 %69, ptr %66, align 4
  %70 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %2, i32 0, i32 0
  %71 = load i32, ptr %70, align 4
  %72 = and i32 %71, -16777216
  %73 = or i32 %72, 1
  store i32 %73, ptr %70, align 4
  %74 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %2, i32 0, i32 0
  %75 = load i32, ptr %74, align 4
  %76 = and i32 %75, 16777215
  %77 = or i32 %76, 33554432
  store i32 %77, ptr %74, align 4
  %78 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %2, i32 0, i32 0
  %79 = load i32, ptr %78, align 4
  %80 = and i32 %79, -4096
  %81 = or i32 %80, poison
  store i32 %81, ptr %78, align 4
  %82 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %2, i32 0, i32 0
  %83 = load i32, ptr %82, align 4
  %84 = and i32 %83, -1044481
  %85 = or i32 %84, poison
  store i32 %85, ptr %82, align 4
  %86 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %2, i32 0, i32 0
  %87 = load i32, ptr %86, align 4
  %88 = and i32 %87, 1048575
  %89 = or i32 %88, poison
  store i32 %89, ptr %86, align 4
  %90 = load %struct.bit_fields_My_struct, ptr %2, align 8
  store %struct.bit_fields_My_struct %90, ptr %instance, align 8
  %91 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %3, i32 0, i32 0
  %92 = load i32, ptr %91, align 4
  %93 = and i32 %92, -16777216
  %94 = or i32 %93, 1
  store i32 %94, ptr %91, align 4
  %95 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %3, i32 0, i32 0
  %96 = load i32, ptr %95, align 4
  %97 = and i32 %96, 16777215
  %98 = or i32 %97, 0
  store i32 %98, ptr %95, align 4
  %99 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %3, i32 0, i32 0
  %100 = load i32, ptr %99, align 4
  %101 = and i32 %100, -4096
  %102 = or i32 %101, poison
  store i32 %102, ptr %99, align 4
  %103 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %3, i32 0, i32 0
  %104 = load i32, ptr %103, align 4
  %105 = and i32 %104, -1044481
  %106 = or i32 %105, poison
  store i32 %106, ptr %103, align 4
  %107 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %3, i32 0, i32 0
  %108 = load i32, ptr %107, align 4
  %109 = and i32 %108, 1048575
  %110 = or i32 %109, poison
  store i32 %110, ptr %107, align 4
  %111 = load %struct.bit_fields_My_struct, ptr %3, align 8
  store %struct.bit_fields_My_struct %111, ptr %instance_2, align 8
  %112 = getelementptr inbounds %struct.bit_fields_My_struct, ptr %instance, i32 0, i32 0
  %113 = load i64, ptr %112, align 8
  ret i64 %113
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }


  TEST_CASE("Compile Block Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "block_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Block_expressions_run_blocks() #0 {
entry:
  %a = alloca i32, align 4
  %b = alloca i32, align 4
  %b1 = alloca i32, align 4
  store i32 0, ptr %a, align 4
  %0 = load i32, ptr %a, align 4
  store i32 %0, ptr %b, align 4
  %1 = load i32, ptr %a, align 4
  store i32 %1, ptr %b1, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Booleans", "[LLVM_IR]")
  {
    char const* const input_file = "booleans.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Booleans_foo() #0 {
entry:
  %my_true_boolean = alloca i1, align 1
  %my_false_boolean = alloca i1, align 1
  store i1 true, ptr %my_true_boolean, align 1
  store i1 false, ptr %my_false_boolean, align 1
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Break Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "break_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "c.stdio", import_c_header_and_get_file_path("c.stdio", "stdio.h") }
    };

    char const* const expected_llvm_ir = R"(
@global_0 = internal constant [3 x i8] c"%d\00"

; Function Attrs: convergent
define void @Break_expressions_run_breaks(i32 noundef %"arguments[0].size") #0 {
entry:
  %size = alloca i32, align 4
  %index = alloca i32, align 4
  %index1 = alloca i32, align 4
  %index_2 = alloca i32, align 4
  %index8 = alloca i32, align 4
  %index_213 = alloca i32, align 4
  store i32 %"arguments[0].size", ptr %size, align 4
  store i32 0, ptr %index, align 4
  br label %for_loop_condition

for_loop_condition:                               ; preds = %for_loop_update_index, %entry
  %0 = load i32, ptr %size, align 4
  %1 = load i32, ptr %index, align 4
  %2 = icmp slt i32 %1, %0
  br i1 %2, label %for_loop_then, label %for_loop_after

for_loop_then:                                    ; preds = %for_loop_condition
  %3 = load i32, ptr %index, align 4
  %4 = icmp sgt i32 %3, 4
  br i1 %4, label %if_s0_then, label %if_s1_after

for_loop_update_index:                            ; preds = %if_s1_after
  %5 = load i32, ptr %index, align 4
  %6 = add i32 %5, 1
  store i32 %6, ptr %index, align 4
  br label %for_loop_condition

for_loop_after:                                   ; preds = %if_s0_then, %for_loop_condition
  store i32 0, ptr %index1, align 4
  br label %for_loop_condition2

if_s0_then:                                       ; preds = %for_loop_then
  br label %for_loop_after

if_s1_after:                                      ; preds = %for_loop_then
  %7 = load i32, ptr %index, align 4
  call void @Break_expressions_print_integer(i32 noundef %7)
  br label %for_loop_update_index

for_loop_condition2:                              ; preds = %for_loop_update_index4, %for_loop_after
  %8 = load i32, ptr %size, align 4
  %9 = load i32, ptr %index1, align 4
  %10 = icmp slt i32 %9, %8
  br i1 %10, label %for_loop_then3, label %for_loop_after5

for_loop_then3:                                   ; preds = %for_loop_condition2
  store i32 0, ptr %index_2, align 4
  br label %while_loop_condition

for_loop_update_index4:                           ; preds = %while_loop_after
  %11 = load i32, ptr %index1, align 4
  %12 = add i32 %11, 1
  store i32 %12, ptr %index1, align 4
  br label %for_loop_condition2

for_loop_after5:                                  ; preds = %for_loop_condition2
  store i32 0, ptr %index8, align 4
  br label %for_loop_condition9

while_loop_condition:                             ; preds = %if_s1_after7, %for_loop_then3
  %13 = load i32, ptr %index_2, align 4
  %14 = load i32, ptr %size, align 4
  %15 = icmp slt i32 %13, %14
  br i1 %15, label %while_loop_then, label %while_loop_after

while_loop_then:                                  ; preds = %while_loop_condition
  %16 = load i32, ptr %index1, align 4
  %17 = icmp sgt i32 %16, 3
  br i1 %17, label %if_s0_then6, label %if_s1_after7

while_loop_after:                                 ; preds = %if_s0_then6, %while_loop_condition
  %18 = load i32, ptr %index1, align 4
  call void @Break_expressions_print_integer(i32 noundef %18)
  br label %for_loop_update_index4

if_s0_then6:                                      ; preds = %while_loop_then
  br label %while_loop_after

if_s1_after7:                                     ; preds = %while_loop_then
  %19 = load i32, ptr %index_2, align 4
  call void @Break_expressions_print_integer(i32 noundef %19)
  %20 = load i32, ptr %index1, align 4
  %21 = add i32 %20, 1
  store i32 %21, ptr %index1, align 4
  br label %while_loop_condition

for_loop_condition9:                              ; preds = %for_loop_update_index11, %for_loop_after5
  %22 = load i32, ptr %size, align 4
  %23 = load i32, ptr %index8, align 4
  %24 = icmp slt i32 %23, %22
  br i1 %24, label %for_loop_then10, label %for_loop_after12

for_loop_then10:                                  ; preds = %for_loop_condition9
  store i32 0, ptr %index_213, align 4
  br label %while_loop_condition14

for_loop_update_index11:                          ; preds = %while_loop_after16
  %25 = load i32, ptr %index8, align 4
  %26 = add i32 %25, 1
  store i32 %26, ptr %index8, align 4
  br label %for_loop_condition9

for_loop_after12:                                 ; preds = %if_s0_then17, %for_loop_condition9
  ret void

while_loop_condition14:                           ; preds = %if_s1_after18, %for_loop_then10
  %27 = load i32, ptr %index_213, align 4
  %28 = load i32, ptr %size, align 4
  %29 = icmp slt i32 %27, %28
  br i1 %29, label %while_loop_then15, label %while_loop_after16

while_loop_then15:                                ; preds = %while_loop_condition14
  %30 = load i32, ptr %index8, align 4
  %31 = icmp sgt i32 %30, 3
  br i1 %31, label %if_s0_then17, label %if_s1_after18

while_loop_after16:                               ; preds = %while_loop_condition14
  %32 = load i32, ptr %index8, align 4
  call void @Break_expressions_print_integer(i32 noundef %32)
  br label %for_loop_update_index11

if_s0_then17:                                     ; preds = %while_loop_then15
  br label %for_loop_after12

if_s1_after18:                                    ; preds = %while_loop_then15
  %33 = load i32, ptr %index_213, align 4
  call void @Break_expressions_print_integer(i32 noundef %33)
  %34 = load i32, ptr %index8, align 4
  %35 = add i32 %34, 1
  store i32 %35, ptr %index8, align 4
  br label %while_loop_condition14
}

; Function Attrs: convergent
define private void @Break_expressions_print_integer(i32 noundef %"arguments[0].value") #0 {
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  %0 = call i32 (ptr, ...) @printf(ptr noundef @global_0)
  ret void
}

; Function Attrs: convergent
declare i32 @printf(ptr noundef, ...) #0

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Cast Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "cast_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Cast_expressions_run(i32 noundef %"arguments[0].first", i32 noundef %"arguments[1].second", i32 noundef %"arguments[2].third") #0 {
entry:
  %first = alloca i32, align 4
  %second = alloca i32, align 4
  %third = alloca i32, align 4
  %a = alloca i32, align 4
  %b = alloca i1, align 1
  %c = alloca i32, align 4
  %d = alloca i32, align 4
  %e = alloca i32, align 4
  store i32 %"arguments[0].first", ptr %first, align 4
  store i32 %"arguments[1].second", ptr %second, align 4
  store i32 %"arguments[2].third", ptr %third, align 4
  store i32 1, ptr %a, align 4
  %0 = load i32, ptr %a, align 4
  %1 = load i32, ptr %first, align 4
  %2 = icmp eq i32 %0, %1
  store i1 %2, ptr %b, align 1
  %3 = load i32, ptr %second, align 4
  store i32 %3, ptr %c, align 4
  %4 = load i32, ptr %a, align 4
  store i32 %4, ptr %d, align 4
  %5 = load i32, ptr %third, align 4
  store i32 %5, ptr %e, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Comment Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "comment_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Comment_expressions_comment_expressions() #0 {
entry:
  %index = alloca i32, align 4
  br i1 true, label %if_s0_then, label %if_s1_after

if_s0_then:                                       ; preds = %entry
  br label %if_s1_after

if_s1_after:                                      ; preds = %if_s0_then, %entry
  store i32 0, ptr %index, align 4
  br label %for_loop_condition

for_loop_condition:                               ; preds = %for_loop_update_index, %if_s1_after
  %0 = load i32, ptr %index, align 4
  %1 = icmp slt i32 %0, 3
  br i1 %1, label %for_loop_then, label %for_loop_after

for_loop_then:                                    ; preds = %for_loop_condition
  br label %for_loop_update_index

for_loop_update_index:                            ; preds = %for_loop_then
  %2 = load i32, ptr %index, align 4
  %3 = add i32 %2, 1
  store i32 %3, ptr %index, align 4
  br label %for_loop_condition

for_loop_after:                                   ; preds = %for_loop_condition
  br label %while_loop_condition

while_loop_condition:                             ; preds = %while_loop_then, %for_loop_after
  br i1 false, label %while_loop_then, label %while_loop_after

while_loop_then:                                  ; preds = %while_loop_condition
  br label %while_loop_condition

while_loop_after:                                 ; preds = %while_loop_condition
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Constant Arrays", "[LLVM_IR]")
  {
    char const* const input_file = "constant_array_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.Constant_array_expressions_My_struct = type { [4 x i32] }

; Function Attrs: convergent
define void @Constant_array_expressions_foo() #0 {
entry:
  %a = alloca [0 x i32], align 4
  %b = alloca [0 x i32], align 4
  %array = alloca [4 x i32], i64 4, align 4
  %c = alloca [4 x i32], align 4
  %d = alloca i32, align 4
  %0 = alloca %struct.Constant_array_expressions_My_struct, align 4
  %array7 = alloca [4 x i32], i64 4, align 4
  %instance = alloca %struct.Constant_array_expressions_My_struct, align 4
  %e = alloca i32, align 4
  %array_element_pointer = getelementptr [4 x i32], ptr %array, i32 0, i32 0
  store i32 0, ptr %array_element_pointer, align 4
  %array_element_pointer1 = getelementptr [4 x i32], ptr %array, i32 0, i32 1
  store i32 1, ptr %array_element_pointer1, align 4
  %array_element_pointer2 = getelementptr [4 x i32], ptr %array, i32 0, i32 2
  store i32 2, ptr %array_element_pointer2, align 4
  %array_element_pointer3 = getelementptr [4 x i32], ptr %array, i32 0, i32 3
  store i32 3, ptr %array_element_pointer3, align 4
  %1 = load [4 x i32], ptr %array, align 4
  store [4 x i32] %1, ptr %c, align 4
  %array_element_pointer4 = getelementptr [4 x i32], ptr %c, i32 0, i32 0
  store i32 0, ptr %array_element_pointer4, align 4
  %array_element_pointer5 = getelementptr [4 x i32], ptr %c, i32 0, i32 1
  store i32 1, ptr %array_element_pointer5, align 4
  %array_element_pointer6 = getelementptr [4 x i32], ptr %c, i32 0, i32 3
  %2 = load i32, ptr %array_element_pointer6, align 4
  store i32 %2, ptr %d, align 4
  %array_element_pointer8 = getelementptr [4 x i32], ptr %array7, i32 0, i32 0
  store i32 0, ptr %array_element_pointer8, align 4
  %array_element_pointer9 = getelementptr [4 x i32], ptr %array7, i32 0, i32 1
  store i32 2, ptr %array_element_pointer9, align 4
  %array_element_pointer10 = getelementptr [4 x i32], ptr %array7, i32 0, i32 2
  store i32 4, ptr %array_element_pointer10, align 4
  %array_element_pointer11 = getelementptr [4 x i32], ptr %array7, i32 0, i32 3
  store i32 6, ptr %array_element_pointer11, align 4
  %3 = load [4 x i32], ptr %array7, align 4
  %4 = getelementptr inbounds %struct.Constant_array_expressions_My_struct, ptr %0, i32 0, i32 0
  store [4 x i32] %3, ptr %4, align 4
  %5 = load %struct.Constant_array_expressions_My_struct, ptr %0, align 4
  store %struct.Constant_array_expressions_My_struct %5, ptr %instance, align 4
  %6 = getelementptr inbounds %struct.Constant_array_expressions_My_struct, ptr %instance, i32 0, i32 0
  %array_element_pointer12 = getelementptr [4 x i32], ptr %6, i32 0, i32 0
  %7 = load i32, ptr %array_element_pointer12, align 4
  store i32 %7, ptr %e, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Debug Information C Headers", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_c_headers.hltxt";

    std::filesystem::path const root_directory_path = std::filesystem::temp_directory_path() / "debug_information_c_headers";
    std::filesystem::create_directories(root_directory_path);

    std::string const header_content = R"(
struct Vector2i
{
    int x;
    int y;
};

Vector2i add(Vector2i lhs, Vector2i rhs);
)";

    std::filesystem::path const header_file_path = root_directory_path / "vector2i.h";
    h::common::write_to_file(header_file_path, header_content);

    std::filesystem::path const header_module_file_path = root_directory_path / "vector2i.hltxt";
    h::c::import_header_and_write_to_file("c.vector2i", header_file_path, header_module_file_path, {});

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
      { "c.vector2i", header_module_file_path }
    };

    std::string const expected_llvm_ir = std::format(R"(
%struct.Vector2i = type {{ i32, i32 }}

; Function Attrs: convergent
define i32 @Debug_information_run() #0 !dbg !3 {{
entry:
  %0 = alloca %struct.Vector2i, align 4, !dbg !8
  %a = alloca %struct.Vector2i, align 4, !dbg !9
  %1 = alloca %struct.Vector2i, align 4, !dbg !9
  %b = alloca %struct.Vector2i, align 4, !dbg !10
  %2 = alloca %struct.Vector2i, align 4, !dbg !11
  %c = alloca %struct.Vector2i, align 4, !dbg !12
  %3 = getelementptr inbounds %struct.Vector2i, ptr %0, i32 0, i32 0, !dbg !8
  store i32 1, ptr %3, align 4, !dbg !8
  %4 = getelementptr inbounds %struct.Vector2i, ptr %0, i32 0, i32 1, !dbg !8
  store i32 -1, ptr %4, align 4, !dbg !8
  %5 = load %struct.Vector2i, ptr %0, align 4, !dbg !13
  call void @llvm.dbg.declare(metadata ptr %a, metadata !14, metadata !DIExpression()), !dbg !9
  store %struct.Vector2i %5, ptr %a, align 4, !dbg !9
  %6 = getelementptr inbounds %struct.Vector2i, ptr %1, i32 0, i32 0, !dbg !9
  store i32 2, ptr %6, align 4, !dbg !9
  %7 = getelementptr inbounds %struct.Vector2i, ptr %1, i32 0, i32 1, !dbg !9
  store i32 -2, ptr %7, align 4, !dbg !9
  %8 = load %struct.Vector2i, ptr %1, align 4, !dbg !20
  call void @llvm.dbg.declare(metadata ptr %b, metadata !21, metadata !DIExpression()), !dbg !10
  store %struct.Vector2i %8, ptr %b, align 4, !dbg !10
  %9 = getelementptr inbounds %struct.Vector2i, ptr %a, i32 0, i32 0, !dbg !11
  %10 = load i64, ptr %9, align 4, !dbg !11
  %11 = getelementptr inbounds %struct.Vector2i, ptr %b, i32 0, i32 0, !dbg !11
  %12 = load i64, ptr %11, align 4, !dbg !11
  %13 = call i64 @add(i64 noundef %10, i64 noundef %12), !dbg !11
  %14 = getelementptr inbounds %struct.Vector2i, ptr %2, i32 0, i32 0, !dbg !11
  store i64 %13, ptr %14, align 4, !dbg !11
  %15 = load %struct.Vector2i, ptr %2, align 4, !dbg !11
  call void @llvm.dbg.declare(metadata ptr %c, metadata !22, metadata !DIExpression()), !dbg !12
  store %struct.Vector2i %15, ptr %c, align 4, !dbg !12
  %16 = getelementptr inbounds %struct.Vector2i, ptr %c, i32 0, i32 0, !dbg !12
  %17 = load i32, ptr %16, align 4, !dbg !23
  %18 = getelementptr inbounds %struct.Vector2i, ptr %c, i32 0, i32 1, !dbg !23
  %19 = load i32, ptr %18, align 4, !dbg !24
  %20 = add i32 %17, %19, !dbg !23
  ret i32 %20, !dbg !25
}}

; Function Attrs: convergent
declare i64 @add(i64 noundef, i64 noundef) #0

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_c_headers.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "run", linkageName: "Debug_information_run", scope: null, file: !2, line: 5, type: !4, scopeLine: 6, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !7)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6}}
!6 = !DIBasicType(name: "c_int", size: 32, encoding: DW_ATE_signed)
!7 = !{{}}
!8 = !DILocation(line: 6, column: 1, scope: !3)
!9 = !DILocation(line: 7, column: 5, scope: !3)
!10 = !DILocation(line: 8, column: 5, scope: !3)
!11 = !DILocation(line: 9, column: 13, scope: !3)
!12 = !DILocation(line: 9, column: 5, scope: !3)
!13 = !DILocation(line: 7, column: 32, scope: !3)
!14 = !DILocalVariable(name: "a", scope: !3, file: !2, line: 7, type: !15)
!15 = !DICompositeType(tag: DW_TAG_structure_type, name: "Vector2i", file: !16, line: 2, size: 64, align: 8, elements: !17)
!16 = !DIFile(filename: "vector2i.h", directory: "{}")
!17 = !{{!18, !19}}
!18 = !DIDerivedType(tag: DW_TAG_member, name: "x", file: !16, line: 4, baseType: !6, size: 32, align: 32)
!19 = !DIDerivedType(tag: DW_TAG_member, name: "y", file: !16, line: 5, baseType: !6, size: 32, align: 32, offset: 32)
!20 = !DILocation(line: 8, column: 32, scope: !3)
!21 = !DILocalVariable(name: "b", scope: !3, file: !2, line: 8, type: !15)
!22 = !DILocalVariable(name: "c", scope: !3, file: !2, line: 9, type: !15)
!23 = !DILocation(line: 10, column: 12, scope: !3)
!24 = !DILocation(line: 10, column: 18, scope: !3)
!25 = !DILocation(line: 10, column: 5, scope: !3)
)", g_test_source_files_path.generic_string(), root_directory_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information Array Slices", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_array_slices.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
%struct.H_Builtin_Generic_array_slice = type {{ ptr, i64 }}

; Function Attrs: convergent
define void @Debug_information_run(ptr noundef %"arguments[0].data", i64 noundef %"arguments[1].length") #0 !dbg !3 {{
entry:
  %data = alloca ptr, align 8
  %length = alloca i64, align 8
  %0 = alloca %struct.H_Builtin_Generic_array_slice, align 8, !dbg !12
  %a = alloca %struct.H_Builtin_Generic_array_slice, align 8, !dbg !13
  store ptr %"arguments[0].data", ptr %data, align 8
  call void @llvm.dbg.declare(metadata ptr %data, metadata !10, metadata !DIExpression()), !dbg !14
  store i64 %"arguments[1].length", ptr %length, align 8
  call void @llvm.dbg.declare(metadata ptr %length, metadata !11, metadata !DIExpression()), !dbg !15
  %1 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %0, i32 0, i32 0, !dbg !12
  store ptr %data, ptr %1, align 8, !dbg !12
  %2 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %0, i32 0, i32 1, !dbg !12
  store ptr %length, ptr %2, align 8, !dbg !12
  %3 = load %struct.H_Builtin_Generic_array_slice, ptr %0, align 8, !dbg !16
  call void @llvm.dbg.declare(metadata ptr %a, metadata !17, metadata !DIExpression()), !dbg !13
  store %struct.H_Builtin_Generic_array_slice %3, ptr %a, align 8, !dbg !13
  ret void, !dbg !13
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_array_slices.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "run", linkageName: "Debug_information_run", scope: null, file: !2, line: 3, type: !4, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !9)
!4 = !DISubroutineType(types: !5)
!5 = !{{null, !6, !8}}
!6 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !7, size: 64)
!7 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!8 = !DIBasicType(name: "Uint64", size: 64, encoding: DW_ATE_unsigned)
!9 = !{{!10, !11}}
!10 = !DILocalVariable(name: "data", arg: 1, scope: !3, file: !2, line: 3, type: !6)
!11 = !DILocalVariable(name: "length", arg: 2, scope: !3, file: !2, line: 3, type: !8)
!12 = !DILocation(line: 4, column: 1, scope: !3)
!13 = !DILocation(line: 5, column: 5, scope: !3)
!14 = !DILocation(line: 3, column: 21, scope: !3)
!15 = !DILocation(line: 3, column: 35, scope: !3)
!16 = !DILocation(line: 5, column: 33, scope: !3)
!17 = !DILocalVariable(name: "a", scope: !3, file: !2, line: 5, type: !18)
!18 = !DICompositeType(tag: DW_TAG_structure_type, name: "Array_slice", scope: !3, size: 128, align: 8, elements: !19)
!19 = !{{!20, !21}}
!20 = !DIDerivedType(tag: DW_TAG_member, name: "data", scope: !3, baseType: !6, size: 64, align: 8)
!21 = !DIDerivedType(tag: DW_TAG_member, name: "length", scope: !3, baseType: !8, size: 64, align: 8, offset: 64)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information Bit Fields", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_bit_fields.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
%struct.Debug_information_My_struct = type {{ i32, i32 }}

; Function Attrs: convergent
define private i64 @Debug_information_instantiate() #0 !dbg !3 {{
entry:
  %0 = alloca %struct.Debug_information_My_struct, align 4, !dbg !13
  %instance = alloca %struct.Debug_information_My_struct, align 4, !dbg !14
  %1 = getelementptr inbounds %struct.Debug_information_My_struct, ptr %0, i32 0, i32 0, !dbg !13
  store i32 1, ptr %1, align 4, !dbg !13
  %2 = getelementptr inbounds %struct.Debug_information_My_struct, ptr %0, i32 0, i32 1, !dbg !13
  %3 = load i32, ptr %2, align 4, !dbg !13
  %4 = and i32 %3, -16777216, !dbg !13
  %5 = or i32 %4, 1, !dbg !13
  store i32 %5, ptr %2, align 4, !dbg !13
  %6 = getelementptr inbounds %struct.Debug_information_My_struct, ptr %0, i32 0, i32 1, !dbg !13
  %7 = load i32, ptr %6, align 4, !dbg !13
  %8 = and i32 %7, 16777215, !dbg !13
  %9 = or i32 %8, 33554432, !dbg !13
  store i32 %9, ptr %6, align 4, !dbg !13
  %10 = load %struct.Debug_information_My_struct, ptr %0, align 4, !dbg !15
  call void @llvm.dbg.declare(metadata ptr %instance, metadata !16, metadata !DIExpression()), !dbg !14
  store %struct.Debug_information_My_struct %10, ptr %instance, align 4, !dbg !14
  %11 = getelementptr inbounds %struct.Debug_information_My_struct, ptr %instance, i32 0, i32 0, !dbg !17
  %12 = load i64, ptr %11, align 4, !dbg !17
  ret i64 %12, !dbg !17
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_bit_fields.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "instantiate", linkageName: "Debug_information_instantiate", scope: null, file: !2, line: 10, type: !4, scopeLine: 11, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !12)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6}}
!6 = !DICompositeType(tag: DW_TAG_structure_type, name: "Debug_information_My_struct", file: !2, line: 3, size: 64, align: 8, elements: !7)
!7 = !{{!8, !10, !11}}
!8 = !DIDerivedType(tag: DW_TAG_member, name: "a", file: !2, line: 5, baseType: !9, size: 32, align: 32)
!9 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!10 = !DIDerivedType(tag: DW_TAG_member, name: "b", file: !2, line: 6, baseType: !9, size: 24, align: 32, offset: 32, flags: DIFlagBitField)
!11 = !DIDerivedType(tag: DW_TAG_member, name: "c", file: !2, line: 7, baseType: !9, size: 8, align: 32, offset: 56, flags: DIFlagBitField)
!12 = !{{}}
!13 = !DILocation(line: 11, column: 1, scope: !3)
!14 = !DILocation(line: 12, column: 5, scope: !3)
!15 = !DILocation(line: 12, column: 31, scope: !3)
!16 = !DILocalVariable(name: "instance", scope: !3, file: !2, line: 12, type: !6)
!17 = !DILocation(line: 13, column: 5, scope: !3)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information For Loop", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_for_loop.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
; Function Attrs: convergent
define i32 @Debug_information_run() #0 !dbg !3 {{
entry:
  %value = alloca i32, align 4, !dbg !8
  call void @llvm.dbg.declare(metadata ptr %value, metadata !9, metadata !DIExpression()), !dbg !8
  %index = alloca i32, align 4, !dbg !10
  store i32 0, ptr %value, align 4, !dbg !8
  call void @llvm.dbg.declare(metadata ptr %index, metadata !12, metadata !DIExpression()), !dbg !10
  store i32 0, ptr %index, align 4, !dbg !10
  br label %for_loop_condition, !dbg !10

for_loop_condition:                               ; preds = %for_loop_update_index, %entry
  %0 = load i32, ptr %index, align 4, !dbg !10
  %1 = icmp slt i32 %0, 10, !dbg !10
  br i1 %1, label %for_loop_then, label %for_loop_after, !dbg !10

for_loop_then:                                    ; preds = %for_loop_condition
  %2 = load i32, ptr %value, align 4, !dbg !13
  %3 = load i32, ptr %index, align 4, !dbg !14
  %4 = add i32 %2, %3, !dbg !13
  store i32 %4, ptr %value, align 4, !dbg !13
  br label %for_loop_update_index, !dbg !13

for_loop_update_index:                            ; preds = %for_loop_then
  %5 = load i32, ptr %index, align 4, !dbg !10
  %6 = add i32 %5, 1, !dbg !10
  store i32 %6, ptr %index, align 4, !dbg !10
  br label %for_loop_condition, !dbg !10

for_loop_after:                                   ; preds = %for_loop_condition
  %7 = load i32, ptr %value, align 4, !dbg !15
  ret i32 %7, !dbg !15
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_for_loop.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "run", linkageName: "Debug_information_run", scope: null, file: !2, line: 3, type: !4, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !7)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6}}
!6 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!7 = !{{}}
!8 = !DILocation(line: 5, column: 5, scope: !3)
!9 = !DILocalVariable(name: "value", scope: !3, file: !2, line: 5, type: !6)
!10 = !DILocation(line: 7, column: 5, scope: !11)
!11 = distinct !DILexicalBlock(scope: !3, file: !2, line: 7, column: 5)
!12 = !DILocalVariable(name: "index", scope: !11, file: !2, line: 7, type: !6)
!13 = !DILocation(line: 9, column: 9, scope: !11)
!14 = !DILocation(line: 9, column: 18, scope: !11)
!15 = !DILocation(line: 12, column: 5, scope: !3)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information Function Call", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_function_call.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
; Function Attrs: convergent
define i32 @Debug_information_run() #0 !dbg !3 {{
entry:
  %value = alloca i32, align 4, !dbg !8
  %0 = call i32 @Debug_information_add(i32 noundef 1, i32 noundef 2), !dbg !9
  call void @llvm.dbg.declare(metadata ptr %value, metadata !10, metadata !DIExpression()), !dbg !8
  store i32 %0, ptr %value, align 4, !dbg !8
  %1 = load i32, ptr %value, align 4, !dbg !11
  ret i32 %1, !dbg !11
}}

; Function Attrs: convergent
define private i32 @Debug_information_add(i32 noundef %"arguments[0].lhs", i32 noundef %"arguments[1].rhs") #0 !dbg !12 {{
entry:
  %lhs = alloca i32, align 4
  %rhs = alloca i32, align 4
  store i32 %"arguments[0].lhs", ptr %lhs, align 4
  call void @llvm.dbg.declare(metadata ptr %lhs, metadata !16, metadata !DIExpression()), !dbg !18
  store i32 %"arguments[1].rhs", ptr %rhs, align 4
  call void @llvm.dbg.declare(metadata ptr %rhs, metadata !17, metadata !DIExpression()), !dbg !19
  %0 = load i32, ptr %lhs, align 4, !dbg !20
  %1 = load i32, ptr %rhs, align 4, !dbg !21
  %2 = add i32 %0, %1, !dbg !20
  ret i32 %2, !dbg !22
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_function_call.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "run", linkageName: "Debug_information_run", scope: null, file: !2, line: 8, type: !4, scopeLine: 9, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !7)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6}}
!6 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!7 = !{{}}
!8 = !DILocation(line: 10, column: 5, scope: !3)
!9 = !DILocation(line: 10, column: 17, scope: !3)
!10 = !DILocalVariable(name: "value", scope: !3, file: !2, line: 10, type: !6)
!11 = !DILocation(line: 11, column: 5, scope: !3)
!12 = distinct !DISubprogram(name: "add", linkageName: "Debug_information_add", scope: null, file: !2, line: 3, type: !13, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !15)
!13 = !DISubroutineType(types: !14)
!14 = !{{!6, !6, !6}}
!15 = !{{!16, !17}}
!16 = !DILocalVariable(name: "lhs", arg: 1, scope: !12, file: !2, line: 3, type: !6)
!17 = !DILocalVariable(name: "rhs", arg: 2, scope: !12, file: !2, line: 3, type: !6)
!18 = !DILocation(line: 3, column: 14, scope: !12)
!19 = !DILocation(line: 3, column: 26, scope: !12)
!20 = !DILocation(line: 5, column: 12, scope: !12)
!21 = !DILocation(line: 5, column: 18, scope: !12)
!22 = !DILocation(line: 5, column: 5, scope: !12)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information If", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_if.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
; Function Attrs: convergent
define private i32 @Debug_information_run(i32 noundef %"arguments[0].value") #0 !dbg !3 {{
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  call void @llvm.dbg.declare(metadata ptr %value, metadata !8, metadata !DIExpression()), !dbg !9
  %0 = load i32, ptr %value, align 4, !dbg !10
  %1 = icmp eq i32 %0, 0, !dbg !10
  br i1 %1, label %if_s0_then, label %if_s1_else, !dbg !10

if_s0_then:                                       ; preds = %entry
  ret i32 1, !dbg !11

if_s1_else:                                       ; preds = %entry
  %2 = load i32, ptr %value, align 4, !dbg !13
  %3 = icmp eq i32 %2, 1, !dbg !13
  br i1 %3, label %if_s2_then, label %if_s3_else, !dbg !13

if_s2_then:                                       ; preds = %if_s1_else
  ret i32 2, !dbg !14

if_s3_else:                                       ; preds = %if_s1_else
  ret i32 3, !dbg !16
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_if.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "run", linkageName: "Debug_information_run", scope: null, file: !2, line: 3, type: !4, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !7)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6, !6}}
!6 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!7 = !{{!8}}
!8 = !DILocalVariable(name: "value", arg: 1, scope: !3, file: !2, line: 3, type: !6)
!9 = !DILocation(line: 3, column: 14, scope: !3)
!10 = !DILocation(line: 5, column: 8, scope: !3)
!11 = !DILocation(line: 7, column: 9, scope: !12)
!12 = distinct !DILexicalBlock(scope: !3, file: !2, line: 6, column: 5)
!13 = !DILocation(line: 9, column: 13, scope: !3)
!14 = !DILocation(line: 11, column: 9, scope: !15)
!15 = distinct !DILexicalBlock(scope: !3, file: !2, line: 10, column: 5)
!16 = !DILocation(line: 15, column: 9, scope: !17)
!17 = distinct !DILexicalBlock(scope: !3, file: !2, line: 14, column: 5)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information Struct", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_structs.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
%struct.Debug_information_Vector2i = type {{ i32, i32 }}

; Function Attrs: convergent
define private i64 @Debug_information_instantiate() #0 !dbg !3 {{
entry:
  %0 = alloca %struct.Debug_information_Vector2i, align 4, !dbg !12
  %instance = alloca %struct.Debug_information_Vector2i, align 4, !dbg !13
  %1 = getelementptr inbounds %struct.Debug_information_Vector2i, ptr %0, i32 0, i32 0, !dbg !12
  store i32 1, ptr %1, align 4, !dbg !12
  %2 = getelementptr inbounds %struct.Debug_information_Vector2i, ptr %0, i32 0, i32 1, !dbg !12
  store i32 2, ptr %2, align 4, !dbg !12
  %3 = load %struct.Debug_information_Vector2i, ptr %0, align 4, !dbg !14
  call void @llvm.dbg.declare(metadata ptr %instance, metadata !15, metadata !DIExpression()), !dbg !13
  store %struct.Debug_information_Vector2i %3, ptr %instance, align 4, !dbg !13
  %4 = getelementptr inbounds %struct.Debug_information_Vector2i, ptr %instance, i32 0, i32 0, !dbg !16
  %5 = load i64, ptr %4, align 4, !dbg !16
  ret i64 %5, !dbg !16
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_structs.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "instantiate", linkageName: "Debug_information_instantiate", scope: null, file: !2, line: 9, type: !4, scopeLine: 10, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !11)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6}}
!6 = !DICompositeType(tag: DW_TAG_structure_type, name: "Debug_information_Vector2i", file: !2, line: 3, size: 64, align: 8, elements: !7)
!7 = !{{!8, !10}}
!8 = !DIDerivedType(tag: DW_TAG_member, name: "x", file: !2, line: 5, baseType: !9, size: 32, align: 32)
!9 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!10 = !DIDerivedType(tag: DW_TAG_member, name: "y", file: !2, line: 6, baseType: !9, size: 32, align: 32, offset: 32)
!11 = !{{}}
!12 = !DILocation(line: 10, column: 1, scope: !3)
!13 = !DILocation(line: 11, column: 5, scope: !3)
!14 = !DILocation(line: 11, column: 30, scope: !3)
!15 = !DILocalVariable(name: "instance", scope: !3, file: !2, line: 11, type: !6)
!16 = !DILocation(line: 12, column: 5, scope: !3)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information Switch", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_switch.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
; Function Attrs: convergent
define private i32 @Debug_information_run(i32 noundef %"arguments[0].value") #0 !dbg !3 {{
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  call void @llvm.dbg.declare(metadata ptr %value, metadata !8, metadata !DIExpression()), !dbg !9
  %0 = load i32, ptr %value, align 4, !dbg !10
  switch i32 %0, label %switch_case_default [
    i32 0, label %switch_case_i0_
    i32 1, label %switch_case_i1_
  ], !dbg !10

switch_after:                                     ; preds = %switch_case_default, %switch_case_i1_
  %1 = load i32, ptr %value, align 4, !dbg !11
  ret i32 %1, !dbg !11

switch_case_i0_:                                  ; preds = %entry
  ret i32 10, !dbg !12

switch_case_i1_:                                  ; preds = %entry
  br label %switch_after, !dbg !13

switch_case_default:                              ; preds = %entry
  br label %switch_after, !dbg !14
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_switch.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "run", linkageName: "Debug_information_run", scope: null, file: !2, line: 3, type: !4, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !7)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6, !6}}
!6 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!7 = !{{!8}}
!8 = !DILocalVariable(name: "value", arg: 1, scope: !3, file: !2, line: 3, type: !6)
!9 = !DILocation(line: 3, column: 14, scope: !3)
!10 = !DILocation(line: 5, column: 12, scope: !3)
!11 = !DILocation(line: 15, column: 5, scope: !3)
!12 = !DILocation(line: 8, column: 9, scope: !3)
!13 = !DILocation(line: 10, column: 9, scope: !3)
!14 = !DILocation(line: 12, column: 9, scope: !3)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information Union", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_unions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
%union.Debug_information_My_int = type {{ i32 }}

; Function Attrs: convergent
define private i32 @Debug_information_instantiate() #0 !dbg !3 {{
entry:
  %0 = alloca %union.Debug_information_My_int, align 4, !dbg !13
  %instance = alloca %union.Debug_information_My_int, align 4, !dbg !14
  store i32 0, ptr %0, align 4, !dbg !13
  %1 = load %union.Debug_information_My_int, ptr %0, align 4, !dbg !13
  call void @llvm.dbg.declare(metadata ptr %instance, metadata !15, metadata !DIExpression()), !dbg !14
  store %union.Debug_information_My_int %1, ptr %instance, align 4, !dbg !14
  %2 = getelementptr inbounds %union.Debug_information_My_int, ptr %instance, i32 0, i32 0, !dbg !16
  %3 = load i32, ptr %2, align 4, !dbg !16
  ret i32 %3, !dbg !16
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_unions.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "instantiate", linkageName: "Debug_information_instantiate", scope: null, file: !2, line: 9, type: !4, scopeLine: 10, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !12)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6}}
!6 = !DICompositeType(tag: DW_TAG_union_type, name: "Debug_information_My_int", file: !2, line: 3, size: 32, align: 8, elements: !7)
!7 = !{{!8, !10}}
!8 = !DIDerivedType(tag: DW_TAG_member, name: "x", file: !2, line: 5, baseType: !9, size: 32, align: 8)
!9 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!10 = !DIDerivedType(tag: DW_TAG_member, name: "y", file: !2, line: 6, baseType: !11, size: 32, align: 8)
!11 = !DIBasicType(name: "Float32", size: 32, encoding: DW_ATE_float)
!12 = !{{}}
!13 = !DILocation(line: 11, column: 28, scope: !3)
!14 = !DILocation(line: 11, column: 5, scope: !3)
!15 = !DILocalVariable(name: "instance", scope: !3, file: !2, line: 11, type: !6)
!16 = !DILocation(line: 12, column: 5, scope: !3)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information Variables", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_variables.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
; Function Attrs: convergent
define i32 @Debug_information_run() #0 !dbg !3 {{
entry:
  %i = alloca i32, align 4, !dbg !8
  call void @llvm.dbg.declare(metadata ptr %i, metadata !9, metadata !DIExpression()), !dbg !8
  store i32 0, ptr %i, align 4, !dbg !8
  store i32 2, ptr %i, align 4, !dbg !10
  %0 = load i32, ptr %i, align 4, !dbg !11
  ret i32 %0, !dbg !11
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_variables.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "run", linkageName: "Debug_information_run", scope: null, file: !2, line: 3, type: !4, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !7)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6}}
!6 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!7 = !{{}}
!8 = !DILocation(line: 5, column: 5, scope: !3)
!9 = !DILocalVariable(name: "i", scope: !3, file: !2, line: 5, type: !6)
!10 = !DILocation(line: 6, column: 5, scope: !3)
!11 = !DILocation(line: 7, column: 5, scope: !3)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Debug Information While Loop", "[LLVM_IR]")
  {
    char const* const input_file = "debug_information_while_loop.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
; Function Attrs: convergent
define i32 @Debug_information_run() #0 !dbg !3 {{
entry:
  %value = alloca i32, align 4, !dbg !8
  call void @llvm.dbg.declare(metadata ptr %value, metadata !9, metadata !DIExpression()), !dbg !8
  %index = alloca i32, align 4, !dbg !10
  store i32 0, ptr %value, align 4, !dbg !8
  call void @llvm.dbg.declare(metadata ptr %index, metadata !11, metadata !DIExpression()), !dbg !10
  store i32 0, ptr %index, align 4, !dbg !10
  br label %while_loop_condition, !dbg !10

while_loop_condition:                             ; preds = %while_loop_then, %entry
  %0 = load i32, ptr %index, align 4, !dbg !12
  %1 = icmp slt i32 %0, 10, !dbg !12
  br i1 %1, label %while_loop_then, label %while_loop_after, !dbg !12

while_loop_then:                                  ; preds = %while_loop_condition
  %2 = load i32, ptr %value, align 4, !dbg !13
  %3 = load i32, ptr %index, align 4, !dbg !15
  %4 = add i32 %2, %3, !dbg !13
  store i32 %4, ptr %value, align 4, !dbg !13
  %5 = load i32, ptr %index, align 4, !dbg !16
  %6 = add i32 %5, 1, !dbg !16
  store i32 %6, ptr %index, align 4, !dbg !16
  br label %while_loop_condition, !dbg !16

while_loop_after:                                 ; preds = %while_loop_condition
  %7 = load i32, ptr %value, align 4, !dbg !17
  ret i32 %7, !dbg !17
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "debug_information_while_loop.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "run", linkageName: "Debug_information_run", scope: null, file: !2, line: 3, type: !4, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !7)
!4 = !DISubroutineType(types: !5)
!5 = !{{!6}}
!6 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!7 = !{{}}
!8 = !DILocation(line: 5, column: 5, scope: !3)
!9 = !DILocalVariable(name: "value", scope: !3, file: !2, line: 5, type: !6)
!10 = !DILocation(line: 7, column: 5, scope: !3)
!11 = !DILocalVariable(name: "index", scope: !3, file: !2, line: 7, type: !6)
!12 = !DILocation(line: 8, column: 11, scope: !3)
!13 = !DILocation(line: 10, column: 9, scope: !14)
!14 = distinct !DILexicalBlock(scope: !3, file: !2, line: 8, column: 5)
!15 = !DILocation(line: 10, column: 18, scope: !14)
!16 = !DILocation(line: 11, column: 9, scope: !14)
!17 = !DILocation(line: 14, column: 5, scope: !3)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Defer Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "defer_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private void @Defer_expressions_do_defer(i32 noundef %"arguments[0].value") #0 {
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  ret void
}

; Function Attrs: convergent
define private void @Defer_expressions_run(i8 noundef zeroext %"arguments[0].condition", i32 noundef %"arguments[1].value") #0 {
entry:
  %condition = alloca i1, align 1
  %value = alloca i32, align 4
  %v2 = alloca i32, align 4
  %v3 = alloca i32, align 4
  %v4 = alloca i32, align 4
  %v5 = alloca i32, align 4
  %v6 = alloca i32, align 4
  %v7 = alloca i32, align 4
  %index = alloca i32, align 4
  %v8 = alloca i32, align 4
  %v9 = alloca i32, align 4
  %v10 = alloca i32, align 4
  %i = alloca i32, align 4
  %j = alloca i32, align 4
  %0 = trunc i8 %"arguments[0].condition" to i1
  store i1 %0, ptr %condition, align 1
  store i32 %"arguments[1].value", ptr %value, align 4
  %1 = load i1, ptr %condition, align 1
  br i1 %1, label %if_s0_then, label %if_s1_else

if_s0_then:                                       ; preds = %entry
  store i32 2, ptr %v2, align 4
  %2 = load i32, ptr %v2, align 4
  call void @Defer_expressions_do_defer(i32 noundef %2)
  call void @Defer_expressions_do_defer(i32 noundef 2)
  br label %if_s4_after

if_s1_else:                                       ; preds = %entry
  %3 = load i32, ptr %value, align 4
  %4 = icmp eq i32 %3, 0
  br i1 %4, label %if_s2_then, label %if_s3_else

if_s2_then:                                       ; preds = %if_s1_else
  store i32 3, ptr %v3, align 4
  %5 = load i32, ptr %v3, align 4
  call void @Defer_expressions_do_defer(i32 noundef %5)
  call void @Defer_expressions_do_defer(i32 noundef 3)
  br label %if_s4_after

if_s3_else:                                       ; preds = %if_s1_else
  store i32 4, ptr %v4, align 4
  %6 = load i32, ptr %v4, align 4
  call void @Defer_expressions_do_defer(i32 noundef %6)
  call void @Defer_expressions_do_defer(i32 noundef 4)
  br label %if_s4_after

if_s4_after:                                      ; preds = %if_s3_else, %if_s2_then, %if_s0_then
  %7 = load i1, ptr %condition, align 1
  br i1 %7, label %if_s0_then1, label %if_s1_after

if_s0_then1:                                      ; preds = %if_s4_after
  call void @Defer_expressions_do_defer(i32 noundef 1)
  call void @Defer_expressions_do_defer(i32 noundef 0)
  ret void

if_s1_after:                                      ; preds = %if_s4_after
  br label %while_loop_condition

while_loop_condition:                             ; preds = %while_loop_then, %if_s1_after
  %8 = load i1, ptr %condition, align 1
  br i1 %8, label %while_loop_then, label %while_loop_after

while_loop_then:                                  ; preds = %while_loop_condition
  store i32 5, ptr %v5, align 4
  %9 = load i32, ptr %v5, align 4
  call void @Defer_expressions_do_defer(i32 noundef %9)
  call void @Defer_expressions_do_defer(i32 noundef 5)
  br label %while_loop_condition

while_loop_after:                                 ; preds = %while_loop_condition
  br label %while_loop_condition2

while_loop_condition2:                            ; preds = %while_loop_then3, %while_loop_after
  %10 = load i1, ptr %condition, align 1
  br i1 %10, label %while_loop_then3, label %while_loop_after4

while_loop_then3:                                 ; preds = %while_loop_condition2
  store i32 6, ptr %v6, align 4
  call void @Defer_expressions_do_defer(i32 noundef 6)
  br label %while_loop_condition2

while_loop_after4:                                ; preds = %while_loop_condition2
  br label %while_loop_condition5

while_loop_condition5:                            ; preds = %while_loop_after4
  %11 = load i1, ptr %condition, align 1
  br i1 %11, label %while_loop_then6, label %while_loop_after7

while_loop_then6:                                 ; preds = %while_loop_condition5
  store i32 7, ptr %v7, align 4
  call void @Defer_expressions_do_defer(i32 noundef 7)
  br label %while_loop_after7

while_loop_after7:                                ; preds = %while_loop_then6, %while_loop_condition5
  store i32 0, ptr %index, align 4
  br label %for_loop_condition

for_loop_condition:                               ; preds = %for_loop_update_index, %while_loop_after7
  %12 = load i32, ptr %index, align 4
  %13 = icmp slt i32 %12, 10
  br i1 %13, label %for_loop_then, label %for_loop_after

for_loop_then:                                    ; preds = %for_loop_condition
  store i32 8, ptr %v8, align 4
  %14 = load i32, ptr %v8, align 4
  call void @Defer_expressions_do_defer(i32 noundef %14)
  call void @Defer_expressions_do_defer(i32 noundef 8)
  br label %for_loop_update_index

for_loop_update_index:                            ; preds = %for_loop_then
  %15 = load i32, ptr %index, align 4
  %16 = add i32 %15, 1
  store i32 %16, ptr %index, align 4
  br label %for_loop_condition

for_loop_after:                                   ; preds = %for_loop_condition
  %17 = load i32, ptr %value, align 4
  switch i32 %17, label %switch_after [
    i32 0, label %switch_case_i0_
  ]

switch_after:                                     ; preds = %switch_case_i0_, %for_loop_after
  store i32 10, ptr %v10, align 4
  %18 = load i32, ptr %v10, align 4
  call void @Defer_expressions_do_defer(i32 noundef %18)
  call void @Defer_expressions_do_defer(i32 noundef 10)
  store i32 0, ptr %i, align 4
  br label %for_loop_condition8

switch_case_i0_:                                  ; preds = %for_loop_after
  store i32 9, ptr %v9, align 4
  %19 = load i32, ptr %v9, align 4
  call void @Defer_expressions_do_defer(i32 noundef %19)
  call void @Defer_expressions_do_defer(i32 noundef 9)
  br label %switch_after

for_loop_condition8:                              ; preds = %for_loop_update_index10, %switch_after
  %20 = load i32, ptr %i, align 4
  %21 = icmp slt i32 %20, 10
  br i1 %21, label %for_loop_then9, label %for_loop_after11

for_loop_then9:                                   ; preds = %for_loop_condition8
  %22 = load i32, ptr %i, align 4
  %23 = srem i32 %22, 2
  %24 = icmp eq i32 %23, 0
  br i1 %24, label %if_s0_then12, label %if_s1_after13

for_loop_update_index10:                          ; preds = %if_s1_after13
  %25 = load i32, ptr %i, align 4
  %26 = add i32 %25, 1
  store i32 %26, ptr %i, align 4
  br label %for_loop_condition8

for_loop_after11:                                 ; preds = %if_s0_then18, %for_loop_condition8
  call void @Defer_expressions_do_defer(i32 noundef 1)
  call void @Defer_expressions_do_defer(i32 noundef 0)
  ret void

if_s0_then12:                                     ; preds = %for_loop_then9
  store i32 0, ptr %j, align 4
  br label %for_loop_condition14

if_s1_after13:                                    ; preds = %for_loop_after17, %for_loop_then9
  call void @Defer_expressions_do_defer(i32 noundef 11)
  br label %for_loop_update_index10

for_loop_condition14:                             ; preds = %for_loop_update_index16, %if_s0_then12
  %27 = load i32, ptr %j, align 4
  %28 = icmp slt i32 %27, 10
  br i1 %28, label %for_loop_then15, label %for_loop_after17

for_loop_then15:                                  ; preds = %for_loop_condition14
  %29 = load i32, ptr %j, align 4
  %30 = srem i32 %29, 2
  %31 = icmp eq i32 %30, 0
  br i1 %31, label %if_s0_then18, label %if_s1_after19

for_loop_update_index16:                          ; preds = %if_s1_after19
  %32 = load i32, ptr %j, align 4
  %33 = add i32 %32, 1
  store i32 %33, ptr %j, align 4
  br label %for_loop_condition14

for_loop_after17:                                 ; preds = %for_loop_condition14
  call void @Defer_expressions_do_defer(i32 noundef 12)
  br label %if_s1_after13

if_s0_then18:                                     ; preds = %for_loop_then15
  call void @Defer_expressions_do_defer(i32 noundef 12)
  call void @Defer_expressions_do_defer(i32 noundef 11)
  br label %for_loop_after11

if_s1_after19:                                    ; preds = %for_loop_then15
  br label %for_loop_update_index16
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Dereference and Access Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "dereference_and_access_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.Dereference_and_access_My_struct = type { i32 }

; Function Attrs: convergent
define void @Dereference_and_access_run() #0 {
entry:
  %0 = alloca %struct.Dereference_and_access_My_struct, align 4
  %instance = alloca %struct.Dereference_and_access_My_struct, align 4
  %pointer = alloca ptr, align 8
  %a = alloca i32, align 4
  %1 = getelementptr inbounds %struct.Dereference_and_access_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %1, align 4
  %2 = load %struct.Dereference_and_access_My_struct, ptr %0, align 4
  store %struct.Dereference_and_access_My_struct %2, ptr %instance, align 4
  store ptr %instance, ptr %pointer, align 8
  %3 = getelementptr inbounds %struct.Dereference_and_access_My_struct, ptr %pointer, i32 0, i32 0
  %4 = load i32, ptr %3, align 4
  store i32 %4, ptr %a, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Defer Expressions with Debug Information", "[LLVM_IR]")
  {
    char const* const input_file = "defer_expressions_with_debug_information.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    std::string const expected_llvm_ir = std::format(R"(
; Function Attrs: convergent
define private void @Defer_expressions_with_debug_information_do_defer(i32 noundef %"arguments[0].value") #0 !dbg !3 {{
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  call void @llvm.dbg.declare(metadata ptr %value, metadata !8, metadata !DIExpression()), !dbg !9
  ret void, !dbg !10
}}

; Function Attrs: convergent
define private void @Defer_expressions_with_debug_information_run(i8 noundef zeroext %"arguments[0].condition", i32 noundef %"arguments[1].value") #0 !dbg !11 {{
entry:
  %condition = alloca i1, align 1
  %value = alloca i32, align 4
  %value_2 = alloca i32, align 4, !dbg !18
  %0 = trunc i8 %"arguments[0].condition" to i1
  store i1 %0, ptr %condition, align 1
  call void @llvm.dbg.declare(metadata ptr %condition, metadata !16, metadata !DIExpression()), !dbg !19
  store i32 %"arguments[1].value", ptr %value, align 4
  call void @llvm.dbg.declare(metadata ptr %value, metadata !17, metadata !DIExpression()), !dbg !20
  call void @llvm.dbg.declare(metadata ptr %value_2, metadata !21, metadata !DIExpression()), !dbg !18
  store i32 0, ptr %value_2, align 4, !dbg !18
  call void @Defer_expressions_with_debug_information_do_defer(i32 noundef 1), !dbg !22
  call void @Defer_expressions_with_debug_information_do_defer(i32 noundef 0), !dbg !23
  ret void, !dbg !24
}}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare void @llvm.dbg.declare(metadata, metadata, metadata) #1

attributes #0 = {{ convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }}
attributes #1 = {{ nocallback nofree nosync nounwind speculatable willreturn memory(none) }}

!llvm.module.flags = !{{!0}}
!llvm.dbg.cu = !{{!1}}

!0 = !{{i32 2, !"Debug Info Version", i32 3}}
!1 = distinct !DICompileUnit(language: DW_LANG_C, file: !2, producer: "Hlang Compiler", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)
!2 = !DIFile(filename: "defer_expressions_with_debug_information.hltxt", directory: "{}")
!3 = distinct !DISubprogram(name: "do_defer", linkageName: "Defer_expressions_with_debug_information_do_defer", scope: null, file: !2, line: 3, type: !4, scopeLine: 4, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !7)
!4 = !DISubroutineType(types: !5)
!5 = !{{null, !6}}
!6 = !DIBasicType(name: "Int32", size: 32, encoding: DW_ATE_signed)
!7 = !{{!8}}
!8 = !DILocalVariable(name: "value", arg: 1, scope: !3, file: !2, line: 3, type: !6)
!9 = !DILocation(line: 3, column: 19, scope: !3)
!10 = !DILocation(line: 4, column: 1, scope: !3)
!11 = distinct !DISubprogram(name: "run", linkageName: "Defer_expressions_with_debug_information_run", scope: null, file: !2, line: 7, type: !12, scopeLine: 8, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !1, retainedNodes: !15)
!12 = !DISubroutineType(types: !13)
!13 = !{{null, !14, !6}}
!14 = !DIBasicType(name: "Bool", size: 1, encoding: DW_ATE_boolean)
!15 = !{{!16, !17}}
!16 = !DILocalVariable(name: "condition", arg: 1, scope: !11, file: !2, line: 7, type: !14)
!17 = !DILocalVariable(name: "value", arg: 2, scope: !11, file: !2, line: 7, type: !6)
!18 = !DILocation(line: 10, column: 5, scope: !11)
!19 = !DILocation(line: 7, column: 14, scope: !11)
!20 = !DILocation(line: 7, column: 31, scope: !11)
!21 = !DILocalVariable(name: "value_2", scope: !11, file: !2, line: 10, type: !6)
!22 = !DILocation(line: 11, column: 11, scope: !11)
!23 = !DILocation(line: 9, column: 11, scope: !11)
!24 = !DILocation(line: 12, column: 5, scope: !11)
)", g_test_source_files_path.generic_string());

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, { .debug = true });
  }

  TEST_CASE("Compile Dynamic Array", "[LLVM_IR]")
  {
    char const* const input_file = "dynamic_array.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"()";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Dynamic Array Usage", "[LLVM_IR]")
  {
    char const* const input_file = "dynamic_array_usage.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
      { "dynamic_array", parse_and_get_file_path(g_test_source_files_path / "dynamic_array.hltxt") },
    };

    char const* const expected_llvm_ir = R"(
%struct.dynamic_array_Allocator = type { ptr, ptr }
%"struct.dynamic_array_Dynamic_array@9566610295894871722" = type { ptr, i64, i64, %struct.dynamic_array_Allocator }

@function_contract_error_string = private unnamed_addr constant [106 x i8] c"In function 'dynamic_array.create@17907512829831209369' precondition 'allocator.allocate != null' failed!\00"
@function_contract_error_string.1 = private unnamed_addr constant [108 x i8] c"In function 'dynamic_array.create@17907512829831209369' precondition 'allocator.deallocate != null' failed!\00"
@function_contract_error_string.2 = private unnamed_addr constant [99 x i8] c"In function 'dynamic_array.push_back@17441349256315945061' precondition 'instance != null' failed!\00"
@function_contract_error_string.3 = private unnamed_addr constant [100 x i8] c"In function 'dynamic_array.push_back@17441349256315945061' assert 'Allocation did not fail' failed!\00"
@function_contract_error_string.4 = private unnamed_addr constant [93 x i8] c"In function 'dynamic_array.get@16525916682172407869' precondition 'instance != null' failed!\00"
@function_contract_error_string.5 = private unnamed_addr constant [101 x i8] c"In function 'dynamic_array.get@16525916682172407869' precondition 'index < instance->length' failed!\00"

; Function Attrs: convergent
define private void @dynamic_array_usage_run() #0 {
entry:
  %0 = alloca %struct.dynamic_array_Allocator, align 8
  %allocator = alloca %struct.dynamic_array_Allocator, align 8
  %1 = alloca %"struct.dynamic_array_Dynamic_array@9566610295894871722", align 8
  %instance = alloca %"struct.dynamic_array_Dynamic_array@9566610295894871722", align 8
  %element = alloca i32, align 4
  %2 = getelementptr inbounds %struct.dynamic_array_Allocator, ptr %0, i32 0, i32 0
  store ptr null, ptr %2, align 8
  %3 = getelementptr inbounds %struct.dynamic_array_Allocator, ptr %0, i32 0, i32 1
  store ptr null, ptr %3, align 8
  %4 = load %struct.dynamic_array_Allocator, ptr %0, align 8
  store %struct.dynamic_array_Allocator %4, ptr %allocator, align 8
  %5 = getelementptr inbounds { ptr, ptr }, ptr %allocator, i32 0, i32 0
  %6 = load ptr, ptr %5, align 8
  %7 = getelementptr inbounds { ptr, ptr }, ptr %allocator, i32 0, i32 1
  %8 = load ptr, ptr %7, align 8
  call void @"dynamic_array_create@17907512829831209369"(ptr noundef %1, ptr %6, ptr %8)
  %9 = load %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %1, align 8
  store %"struct.dynamic_array_Dynamic_array@9566610295894871722" %9, ptr %instance, align 8
  call void @"dynamic_array_push_back@17441349256315945061"(ptr noundef %instance, i32 noundef 1)
  %10 = call i32 @"dynamic_array_get@16525916682172407869"(ptr noundef %instance, i64 noundef 0)
  store i32 %10, ptr %element, align 4
  ret void
}

; Function Attrs: convergent
define private void @"dynamic_array_create@17907512829831209369"(ptr %"arguments[0].allocator_0", ptr %"arguments[0].allocator_1", ptr %0) #0 {
entry:
  %allocator = alloca %struct.dynamic_array_Allocator, align 8
  %1 = alloca %"struct.dynamic_array_Dynamic_array@9566610295894871722", align 8
  %2 = getelementptr inbounds { ptr, ptr }, ptr %allocator, i32 0, i32 0
  store ptr %"arguments[0].allocator_0", ptr %2, align 8
  %3 = getelementptr inbounds { ptr, ptr }, ptr %allocator, i32 0, i32 1
  store ptr %"arguments[0].allocator_1", ptr %3, align 8
  %4 = getelementptr inbounds %struct.dynamic_array_Allocator, ptr %allocator, i32 0, i32 0
  %5 = icmp ne ptr %4, null
  br i1 %5, label %condition_success, label %condition_fail

condition_success:                                ; preds = %entry
  %6 = getelementptr inbounds %struct.dynamic_array_Allocator, ptr %allocator, i32 0, i32 1
  %7 = icmp ne ptr %6, null
  br i1 %7, label %condition_success1, label %condition_fail2

condition_fail:                                   ; preds = %entry
  %8 = call i32 @puts(ptr @function_contract_error_string)
  call void @abort()
  unreachable

condition_success1:                               ; preds = %condition_success
  %9 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %1, i32 0, i32 0
  store ptr null, ptr %9, align 8
  %10 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %1, i32 0, i32 1
  store i64 0, ptr %10, align 8
  %11 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %1, i32 0, i32 2
  store i64 0, ptr %11, align 8
  %12 = load %struct.dynamic_array_Allocator, ptr %allocator, align 8
  %13 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %1, i32 0, i32 3
  store %struct.dynamic_array_Allocator %12, ptr %13, align 8
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %"arguments[0].allocator_0", ptr align 8 %1, i64 40, i1 false)
  ret void

condition_fail2:                                  ; preds = %condition_success
  %14 = call i32 @puts(ptr @function_contract_error_string.1)
  call void @abort()
  unreachable
}

; Function Attrs: convergent
define private void @"dynamic_array_push_back@17441349256315945061"(ptr noundef %"arguments[0].instance", i32 noundef %"arguments[1].element") #0 {
entry:
  %instance = alloca ptr, align 8
  %element = alloca i32, align 4
  %new_capacity = alloca i64, align 8
  %allocation_size_in_bytes = alloca i64, align 8
  %allocation = alloca ptr, align 8
  %index = alloca i64, align 8
  store ptr %"arguments[0].instance", ptr %instance, align 8
  store i32 %"arguments[1].element", ptr %element, align 4
  %0 = load ptr, ptr %instance, align 8
  %1 = icmp ne ptr %0, null
  br i1 %1, label %condition_success, label %condition_fail

condition_success:                                ; preds = %entry
  %2 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 1
  %3 = load i64, ptr %2, align 8
  %4 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 2
  %5 = load i64, ptr %4, align 8
  %6 = icmp eq i64 %3, %5
  br i1 %6, label %if_s0_then, label %if_s1_after

condition_fail:                                   ; preds = %entry
  %7 = call i32 @puts(ptr @function_contract_error_string.2)
  call void @abort()
  unreachable

if_s0_then:                                       ; preds = %condition_success
  %8 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 2
  %9 = load i64, ptr %8, align 8
  %10 = add i64 %9, 1
  %11 = mul i64 2, %10
  store i64 %11, ptr %new_capacity, align 8
  %12 = load i64, ptr %new_capacity, align 8
  %13 = mul i64 %12, 4
  store i64 %13, ptr %allocation_size_in_bytes, align 8
  %14 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 3
  %15 = getelementptr inbounds %struct.dynamic_array_Allocator, ptr %14, i32 0, i32 0
  %16 = load i64, ptr %allocation_size_in_bytes, align 8
  %17 = call ptr %15(i64 noundef %16, i64 noundef 4)
  store ptr %17, ptr %allocation, align 8
  %18 = load ptr, ptr %allocation, align 8
  %19 = icmp ne ptr %18, null
  br i1 %19, label %condition_success1, label %condition_fail2

if_s1_after:                                      ; preds = %condition_success1, %condition_success
  %20 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 1
  %21 = load i64, ptr %20, align 8
  store i64 %21, ptr %index, align 8
  %22 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 0
  %23 = load i64, ptr %index, align 8
  %array_element_pointer = getelementptr i32, ptr %22, i64 %23
  %24 = load i32, ptr %element, align 4
  store i32 %24, ptr %array_element_pointer, align 4
  %25 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 1
  %26 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 1
  %27 = load i64, ptr %26, align 8
  %28 = add i64 %27, 1
  store i64 %28, ptr %25, align 8
  ret void

condition_success1:                               ; preds = %if_s0_then
  %29 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 0
  %30 = load ptr, ptr %allocation, align 8
  store ptr %30, ptr %29, align 8
  %31 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 2
  %32 = load i64, ptr %new_capacity, align 8
  store i64 %32, ptr %31, align 8
  br label %if_s1_after

condition_fail2:                                  ; preds = %if_s0_then
  %33 = call i32 @puts(ptr @function_contract_error_string.3)
  call void @abort()
  unreachable
}

; Function Attrs: convergent
define private i32 @"dynamic_array_get@16525916682172407869"(ptr noundef %"arguments[0].instance", i64 noundef %"arguments[1].index") #0 {
entry:
  %instance = alloca ptr, align 8
  %index = alloca i64, align 8
  store ptr %"arguments[0].instance", ptr %instance, align 8
  store i64 %"arguments[1].index", ptr %index, align 8
  %0 = load ptr, ptr %instance, align 8
  %1 = icmp ne ptr %0, null
  br i1 %1, label %condition_success, label %condition_fail

condition_success:                                ; preds = %entry
  %2 = load i64, ptr %index, align 8
  %3 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 1
  %4 = load i64, ptr %3, align 8
  %5 = icmp ult i64 %2, %4
  br i1 %5, label %condition_success1, label %condition_fail2

condition_fail:                                   ; preds = %entry
  %6 = call i32 @puts(ptr @function_contract_error_string.4)
  call void @abort()
  unreachable

condition_success1:                               ; preds = %condition_success
  %7 = getelementptr inbounds %"struct.dynamic_array_Dynamic_array@9566610295894871722", ptr %instance, i32 0, i32 0
  %8 = load i64, ptr %index, align 8
  %array_element_pointer = getelementptr i32, ptr %7, i64 %8
  %9 = load i32, ptr %array_element_pointer, align 4
  ret i32 %9

condition_fail2:                                  ; preds = %condition_success
  %10 = call i32 @puts(ptr @function_contract_error_string.5)
  call void @abort()
  unreachable
}

declare i32 @puts(ptr)

declare void @abort()

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Empty Return Expression", "[LLVM_IR]")
  {
    char const* const input_file = "empty_return_expression.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private void @Empty_return_expression_run() #0 {
entry:
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile For Loop Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "for_loop_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
      { "c.stdio", import_c_header_and_get_file_path("c.stdio", "stdio.h") }
    };

    char const* const expected_llvm_ir = R"(
@global_0 = internal constant [3 x i8] c"%d\00"

; Function Attrs: convergent
define void @For_loop_expressions_run_for_loops() #0 {
entry:
  %index = alloca i32, align 4
  %index1 = alloca i32, align 4
  %index6 = alloca i32, align 4
  %index11 = alloca i32, align 4
  store i32 0, ptr %index, align 4
  br label %for_loop_condition

for_loop_condition:                               ; preds = %for_loop_update_index, %entry
  %0 = load i32, ptr %index, align 4
  %1 = icmp slt i32 %0, 3
  br i1 %1, label %for_loop_then, label %for_loop_after

for_loop_then:                                    ; preds = %for_loop_condition
  %2 = load i32, ptr %index, align 4
  call void @For_loop_expressions_print_integer(i32 noundef %2)
  br label %for_loop_update_index

for_loop_update_index:                            ; preds = %for_loop_then
  %3 = load i32, ptr %index, align 4
  %4 = add i32 %3, 1
  store i32 %4, ptr %index, align 4
  br label %for_loop_condition

for_loop_after:                                   ; preds = %for_loop_condition
  store i32 0, ptr %index1, align 4
  br label %for_loop_condition2

for_loop_condition2:                              ; preds = %for_loop_update_index4, %for_loop_after
  %5 = load i32, ptr %index1, align 4
  %6 = icmp slt i32 %5, 4
  br i1 %6, label %for_loop_then3, label %for_loop_after5

for_loop_then3:                                   ; preds = %for_loop_condition2
  %7 = load i32, ptr %index1, align 4
  call void @For_loop_expressions_print_integer(i32 noundef %7)
  br label %for_loop_update_index4

for_loop_update_index4:                           ; preds = %for_loop_then3
  %8 = load i32, ptr %index1, align 4
  %9 = add i32 %8, 1
  store i32 %9, ptr %index1, align 4
  br label %for_loop_condition2

for_loop_after5:                                  ; preds = %for_loop_condition2
  store i32 4, ptr %index6, align 4
  br label %for_loop_condition7

for_loop_condition7:                              ; preds = %for_loop_update_index9, %for_loop_after5
  %10 = load i32, ptr %index6, align 4
  %11 = icmp sgt i32 %10, 0
  br i1 %11, label %for_loop_then8, label %for_loop_after10

for_loop_then8:                                   ; preds = %for_loop_condition7
  %12 = load i32, ptr %index6, align 4
  call void @For_loop_expressions_print_integer(i32 noundef %12)
  br label %for_loop_update_index9

for_loop_update_index9:                           ; preds = %for_loop_then8
  %13 = load i32, ptr %index6, align 4
  %14 = add i32 %13, -1
  store i32 %14, ptr %index6, align 4
  br label %for_loop_condition7

for_loop_after10:                                 ; preds = %for_loop_condition7
  store i32 4, ptr %index11, align 4
  br label %for_loop_condition12

for_loop_condition12:                             ; preds = %for_loop_update_index14, %for_loop_after10
  %15 = load i32, ptr %index11, align 4
  %16 = icmp sgt i32 %15, 0
  br i1 %16, label %for_loop_then13, label %for_loop_after15

for_loop_then13:                                  ; preds = %for_loop_condition12
  %17 = load i32, ptr %index11, align 4
  call void @For_loop_expressions_print_integer(i32 noundef %17)
  br label %for_loop_update_index14

for_loop_update_index14:                          ; preds = %for_loop_then13
  %18 = load i32, ptr %index11, align 4
  %19 = add i32 %18, -1
  store i32 %19, ptr %index11, align 4
  br label %for_loop_condition12

for_loop_after15:                                 ; preds = %for_loop_condition12
  ret void
}

; Function Attrs: convergent
define private void @For_loop_expressions_print_integer(i32 noundef %"arguments[0].value") #0 {
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  %0 = call i32 (ptr, ...) @printf(ptr noundef @global_0)
  ret void
}

; Function Attrs: convergent
declare i32 @printf(ptr noundef, ...) #0

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Function Pointers", "[LLVM_IR]")
  {
    char const* const input_file = "function_pointers.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.Function_pointers_My_struct = type { ptr, ptr }

; Function Attrs: convergent
define void @Function_pointers_run() #0 {
entry:
  %a = alloca ptr, align 8
  %r0 = alloca i32, align 4
  %0 = alloca %struct.Function_pointers_My_struct, align 8
  %b = alloca %struct.Function_pointers_My_struct, align 8
  %r1 = alloca i32, align 4
  store ptr @Function_pointers_add, ptr %a, align 8
  %1 = call i32 %a(i32 noundef 1, i32 noundef 2)
  store i32 %1, ptr %r0, align 4
  %2 = getelementptr inbounds %struct.Function_pointers_My_struct, ptr %0, i32 0, i32 0
  store ptr @Function_pointers_add, ptr %2, align 8
  %3 = getelementptr inbounds %struct.Function_pointers_My_struct, ptr %0, i32 0, i32 1
  store ptr null, ptr %3, align 8
  %4 = load %struct.Function_pointers_My_struct, ptr %0, align 8
  store %struct.Function_pointers_My_struct %4, ptr %b, align 8
  %5 = getelementptr inbounds %struct.Function_pointers_My_struct, ptr %b, i32 0, i32 0
  %6 = call i32 %5(i32 noundef 3, i32 noundef 4)
  store i32 %6, ptr %r1, align 4
  ret void
}

; Function Attrs: convergent
define private i32 @Function_pointers_add(i32 noundef %"arguments[0].lhs", i32 noundef %"arguments[1].rhs") #0 {
entry:
  %lhs = alloca i32, align 4
  %rhs = alloca i32, align 4
  store i32 %"arguments[0].lhs", ptr %lhs, align 4
  store i32 %"arguments[1].rhs", ptr %rhs, align 4
  %0 = load i32, ptr %lhs, align 4
  %1 = load i32, ptr %rhs, align 4
  %2 = add i32 %0, %1
  ret i32 %2
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile hello world!", "[LLVM_IR]")
  {
    char const* const input_file = "hello_world.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "c.stdio", import_c_header_and_get_file_path("c.stdio", "stdio.h") }
    };

    char const* const expected_llvm_ir = R"(
@global_0 = internal constant [13 x i8] c"Hello world!\00"

; Function Attrs: convergent
define i32 @hello_world_main() #0 {
entry:
  %0 = call i32 @puts(ptr noundef @global_0)
  ret i32 0
}

; Function Attrs: convergent
declare i32 @puts(ptr noundef) #0

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile If Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "if_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "c.stdio", import_c_header_and_get_file_path("c.stdio", "stdio.h") }
    };

    char const* const expected_llvm_ir = R"(
@global_0 = internal constant [5 x i8] c"%s\\n\00"
@global_1 = internal constant [5 x i8] c"zero\00"
@global_2 = internal constant [9 x i8] c"negative\00"
@global_3 = internal constant [13 x i8] c"non-negative\00"
@global_4 = internal constant [9 x i8] c"negative\00"
@global_5 = internal constant [9 x i8] c"positive\00"
@global_6 = internal constant [9 x i8] c"negative\00"
@global_7 = internal constant [9 x i8] c"positive\00"
@global_8 = internal constant [5 x i8] c"zero\00"
@global_9 = internal constant [5 x i8] c"true\00"

; Function Attrs: convergent
define void @If_expressions_run_ifs(i32 noundef %"arguments[0].value") #0 {
entry:
  %value = alloca i32, align 4
  %c_boolean = alloca i8, align 1
  store i32 %"arguments[0].value", ptr %value, align 4
  %0 = load i32, ptr %value, align 4
  %1 = icmp eq i32 %0, 0
  br i1 %1, label %if_s0_then, label %if_s1_after

if_s0_then:                                       ; preds = %entry
  call void @If_expressions_print_message(ptr noundef @global_1)
  br label %if_s1_after

if_s1_after:                                      ; preds = %if_s0_then, %entry
  %2 = load i32, ptr %value, align 4
  %3 = icmp slt i32 %2, 0
  br i1 %3, label %if_s0_then1, label %if_s1_else

if_s0_then1:                                      ; preds = %if_s1_after
  call void @If_expressions_print_message(ptr noundef @global_2)
  br label %if_s2_after

if_s1_else:                                       ; preds = %if_s1_after
  call void @If_expressions_print_message(ptr noundef @global_3)
  br label %if_s2_after

if_s2_after:                                      ; preds = %if_s1_else, %if_s0_then1
  %4 = load i32, ptr %value, align 4
  %5 = icmp slt i32 %4, 0
  br i1 %5, label %if_s0_then2, label %if_s1_else3

if_s0_then2:                                      ; preds = %if_s2_after
  call void @If_expressions_print_message(ptr noundef @global_4)
  br label %if_s3_after

if_s1_else3:                                      ; preds = %if_s2_after
  %6 = load i32, ptr %value, align 4
  %7 = icmp sgt i32 %6, 0
  br i1 %7, label %if_s2_then, label %if_s3_after

if_s2_then:                                       ; preds = %if_s1_else3
  call void @If_expressions_print_message(ptr noundef @global_5)
  br label %if_s3_after

if_s3_after:                                      ; preds = %if_s2_then, %if_s1_else3, %if_s0_then2
  %8 = load i32, ptr %value, align 4
  %9 = icmp slt i32 %8, 0
  br i1 %9, label %if_s0_then4, label %if_s1_else5

if_s0_then4:                                      ; preds = %if_s3_after
  call void @If_expressions_print_message(ptr noundef @global_6)
  br label %if_s4_after

if_s1_else5:                                      ; preds = %if_s3_after
  %10 = load i32, ptr %value, align 4
  %11 = icmp sgt i32 %10, 0
  br i1 %11, label %if_s2_then6, label %if_s3_else

if_s2_then6:                                      ; preds = %if_s1_else5
  call void @If_expressions_print_message(ptr noundef @global_7)
  br label %if_s4_after

if_s3_else:                                       ; preds = %if_s1_else5
  call void @If_expressions_print_message(ptr noundef @global_8)
  br label %if_s4_after

if_s4_after:                                      ; preds = %if_s3_else, %if_s2_then6, %if_s0_then4
  store i8 1, ptr %c_boolean, align 1
  %12 = load i8, ptr %c_boolean, align 1
  %13 = trunc i8 %12 to i1
  br i1 %13, label %if_s0_then7, label %if_s1_after8

if_s0_then7:                                      ; preds = %if_s4_after
  call void @If_expressions_print_message(ptr noundef @global_9)
  br label %if_s1_after8

if_s1_after8:                                     ; preds = %if_s0_then7, %if_s4_after
  ret void
}

; Function Attrs: convergent
define private void @If_expressions_print_message(ptr noundef %"arguments[0].message") #0 {
entry:
  %message = alloca ptr, align 8
  store ptr %"arguments[0].message", ptr %message, align 8
  %0 = call i32 (ptr, ...) @printf(ptr noundef @global_0)
  ret void
}

; Function Attrs: convergent
declare i32 @printf(ptr noundef, ...) #0

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile If Return Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "if_return_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private i32 @If_return_expressions_run(i32 noundef %"arguments[0].value") #0 {
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  %0 = load i32, ptr %value, align 4
  %1 = icmp eq i32 %0, 0
  br i1 %1, label %if_s0_then, label %if_s1_else

if_s0_then:                                       ; preds = %entry
  ret i32 1

if_s1_else:                                       ; preds = %entry
  ret i32 2
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Instantiate Struct with Enum from Module", "[LLVM_IR]")
  {
    char const* const input_file = "instantiate_struct_with_enum_from_module.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
      { "Instantiate_struct_with_enum", parse_and_get_file_path(g_test_source_files_path / "instantiate_struct_with_enum.hltxt") },
    };

    char const* const expected_llvm_ir = R"(
%struct.Instantiate_struct_with_enum_My_struct = type { i32 }

; Function Attrs: convergent
define private void @Instantiate_struct_with_enum_from_module_run() #0 {
entry:
  %0 = alloca %struct.Instantiate_struct_with_enum_My_struct, align 4
  %instance = alloca %struct.Instantiate_struct_with_enum_My_struct, align 4
  %1 = getelementptr inbounds %struct.Instantiate_struct_with_enum_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %1, align 4
  %2 = load %struct.Instantiate_struct_with_enum_My_struct, ptr %0, align 4
  store %struct.Instantiate_struct_with_enum_My_struct %2, ptr %instance, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Module with Dots", "[LLVM_IR]")
  {
    char const* const input_file = "module_with_dots.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @name_with_dots_function_name(i32 noundef %"arguments[0].a", i32 noundef %"arguments[1].b") #0 {
entry:
  %a = alloca i32, align 4
  %b = alloca i32, align 4
  store i32 %"arguments[0].a", ptr %a, align 4
  store i32 %"arguments[1].b", ptr %b, align 4
  call void @name_with_dots_other_function_name()
  ret void
}

; Function Attrs: convergent
define void @name_with_dots_other_function_name() #0 {
entry:
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }


  TEST_CASE("Compile Multiple Modules", "[LLVM_IR]")
  {
    char const* const input_file = "multiple_modules_a.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
      { "MB", parse_and_get_file_path(g_test_source_files_path / "multiple_modules_b.hltxt") },
      { "MC", parse_and_get_file_path(g_test_source_files_path / "multiple_modules_c.hltxt") },
    };

    char const* const expected_llvm_ir = R"(
%struct.MC_Struct_c = type { %struct.MC_Private_struct_c }
%struct.MC_Private_struct_c = type { i32 }
%struct.MA_Struct_a = type { %struct.MB_Struct_b }
%struct.MB_Struct_b = type { %struct.MC_Struct_c }
%struct.MA_Private_struct_a = type { %struct.MB_Private_struct_b }
%struct.MB_Private_struct_b = type { %struct.MC_Private_struct_c }

; Function Attrs: convergent
define void @MA_run(i32 noundef %"arguments[0].a", i32 noundef %"arguments[1].b", i32 noundef %"arguments[2].c", i32 noundef %"arguments[3].d") #0 {
entry:
  %0 = alloca %struct.MC_Struct_c, align 4
  %1 = alloca %struct.MC_Private_struct_c, align 4
  %2 = alloca %struct.MA_Struct_a, align 4
  %3 = alloca %struct.MA_Private_struct_a, align 4
  %4 = getelementptr inbounds %struct.MC_Struct_c, ptr %0, i32 0, i32 0
  store i32 %"arguments[0].a", ptr %4, align 4
  %5 = getelementptr inbounds %struct.MC_Private_struct_c, ptr %1, i32 0, i32 0
  store i32 %"arguments[1].b", ptr %5, align 4
  %6 = getelementptr inbounds %struct.MA_Struct_a, ptr %2, i32 0, i32 0
  store i32 %"arguments[2].c", ptr %6, align 4
  %7 = getelementptr inbounds %struct.MA_Private_struct_a, ptr %3, i32 0, i32 0
  store i32 %"arguments[3].d", ptr %7, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Null Pointers", "[LLVM_IR]")
  {
    char const* const input_file = "null_pointers.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define i32 @Null_pointers_pointers(ptr noundef %"arguments[0].parameter") #0 {
entry:
  %parameter = alloca ptr, align 8
  store ptr %"arguments[0].parameter", ptr %parameter, align 8
  %0 = load ptr, ptr %parameter, align 8
  %1 = icmp eq ptr %0, null
  br i1 %1, label %if_s0_then, label %if_s1_after

if_s0_then:                                       ; preds = %entry
  ret i32 -1

if_s1_after:                                      ; preds = %entry
  %2 = load ptr, ptr %parameter, align 8
  %3 = icmp ne ptr %2, null
  br i1 %3, label %if_s0_then1, label %if_s1_after2

if_s0_then1:                                      ; preds = %if_s1_after
  ret i32 1

if_s1_after2:                                     ; preds = %if_s1_after
  ret i32 0
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Numbers", "[LLVM_IR]")
  {
    char const* const input_file = "numbers.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define i32 @Numbers_main() #0 {
entry:
  %my_int8 = alloca i8, align 1
  %my_int16 = alloca i16, align 2
  %my_int32 = alloca i32, align 4
  %my_int64 = alloca i64, align 8
  %my_uint8 = alloca i8, align 1
  %my_uint16 = alloca i16, align 2
  %my_uint32 = alloca i32, align 4
  %my_uint64 = alloca i64, align 8
  %my_float16 = alloca half, align 2
  %my_float32 = alloca float, align 4
  %my_float64 = alloca double, align 8
  %my_c_char = alloca i8, align 1
  %my_c_short = alloca i16, align 2
  %my_c_int = alloca i32, align 4
  %my_c_long = alloca i32, align 4
  %my_c_long_long = alloca i64, align 8
  %my_c_unsigned_char = alloca i8, align 1
  %my_c_unsigned_short = alloca i16, align 2
  %my_c_unsigned_int = alloca i32, align 4
  %my_c_unsigned_long = alloca i32, align 4
  %my_c_unsigned_long_long = alloca i64, align 8
  store i8 1, ptr %my_int8, align 1
  store i16 1, ptr %my_int16, align 2
  store i32 1, ptr %my_int32, align 4
  store i64 1, ptr %my_int64, align 8
  store i8 1, ptr %my_uint8, align 1
  store i16 1, ptr %my_uint16, align 2
  store i32 1, ptr %my_uint32, align 4
  store i64 1, ptr %my_uint64, align 8
  store half 0xH3C00, ptr %my_float16, align 2
  store float 1.000000e+00, ptr %my_float32, align 4
  store double 1.000000e+00, ptr %my_float64, align 8
  store i8 1, ptr %my_c_char, align 1
  store i16 1, ptr %my_c_short, align 2
  store i32 1, ptr %my_c_int, align 4
  store i32 1, ptr %my_c_long, align 4
  store i64 1, ptr %my_c_long_long, align 8
  store i8 1, ptr %my_c_unsigned_char, align 1
  store i16 1, ptr %my_c_unsigned_short, align 2
  store i32 1, ptr %my_c_unsigned_int, align 4
  store i32 1, ptr %my_c_unsigned_long, align 4
  store i64 1, ptr %my_c_unsigned_long_long, align 8
  ret i32 0
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Numeric_casts", "[LLVM_IR]")
  {
    char const* const input_file = "numeric_casts.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define i32 @Numeric_casts_do_casts(i32 noundef %"arguments[0].uint32_argument", i64 noundef %"arguments[1].uint64_argument", i32 noundef %"arguments[2].int32_argument", i64 noundef %"arguments[3].int64_argument", half noundef %"arguments[4].float16_argument", float noundef %"arguments[5].float32_argument", double noundef %"arguments[6].float64_argument") #0 {
entry:
  %uint32_argument = alloca i32, align 4
  %uint64_argument = alloca i64, align 8
  %int32_argument = alloca i32, align 4
  %int64_argument = alloca i64, align 8
  %float16_argument = alloca half, align 2
  %float32_argument = alloca float, align 4
  %float64_argument = alloca double, align 8
  %u64_to_u32 = alloca i32, align 4
  %u64_to_i32 = alloca i32, align 4
  %i64_to_u32 = alloca i32, align 4
  %i64_to_i32 = alloca i32, align 4
  %u32_to_u64 = alloca i64, align 8
  %u32_to_i64 = alloca i64, align 8
  %i32_to_u64 = alloca i64, align 8
  %i32_to_i64 = alloca i64, align 8
  %u32_to_f32 = alloca float, align 4
  %i32_to_f32 = alloca float, align 4
  %f32_to_u32 = alloca i32, align 4
  %f32_to_i32 = alloca i32, align 4
  %f16_to_f32 = alloca float, align 4
  %f32_to_f64 = alloca double, align 8
  %f64_to_f32 = alloca float, align 4
  %f32_to_f16 = alloca half, align 2
  store i32 %"arguments[0].uint32_argument", ptr %uint32_argument, align 4
  store i64 %"arguments[1].uint64_argument", ptr %uint64_argument, align 8
  store i32 %"arguments[2].int32_argument", ptr %int32_argument, align 4
  store i64 %"arguments[3].int64_argument", ptr %int64_argument, align 8
  store half %"arguments[4].float16_argument", ptr %float16_argument, align 2
  store float %"arguments[5].float32_argument", ptr %float32_argument, align 4
  store double %"arguments[6].float64_argument", ptr %float64_argument, align 8
  %0 = load i64, ptr %uint64_argument, align 8
  %1 = trunc i64 %0 to i32
  store i32 %1, ptr %u64_to_u32, align 4
  %2 = load i64, ptr %uint64_argument, align 8
  %3 = trunc i64 %2 to i32
  store i32 %3, ptr %u64_to_i32, align 4
  %4 = load i64, ptr %int64_argument, align 8
  %5 = trunc i64 %4 to i32
  store i32 %5, ptr %i64_to_u32, align 4
  %6 = load i64, ptr %int64_argument, align 8
  %7 = trunc i64 %6 to i32
  store i32 %7, ptr %i64_to_i32, align 4
  %8 = load i32, ptr %uint32_argument, align 4
  %9 = zext i32 %8 to i64
  store i64 %9, ptr %u32_to_u64, align 8
  %10 = load i32, ptr %uint32_argument, align 4
  %11 = zext i32 %10 to i64
  store i64 %11, ptr %u32_to_i64, align 8
  %12 = load i32, ptr %int32_argument, align 4
  %13 = zext i32 %12 to i64
  store i64 %13, ptr %i32_to_u64, align 8
  %14 = load i32, ptr %int32_argument, align 4
  %15 = sext i32 %14 to i64
  store i64 %15, ptr %i32_to_i64, align 8
  %16 = load i32, ptr %uint32_argument, align 4
  %17 = uitofp i32 %16 to float
  store float %17, ptr %u32_to_f32, align 4
  %18 = load i32, ptr %int32_argument, align 4
  %19 = sitofp i32 %18 to float
  store float %19, ptr %i32_to_f32, align 4
  %20 = load float, ptr %float32_argument, align 4
  %21 = fptoui float %20 to i32
  store i32 %21, ptr %f32_to_u32, align 4
  %22 = load float, ptr %float32_argument, align 4
  %23 = fptosi float %22 to i32
  store i32 %23, ptr %f32_to_i32, align 4
  %24 = load half, ptr %float16_argument, align 2
  %25 = fpext half %24 to float
  store float %25, ptr %f16_to_f32, align 4
  %26 = load float, ptr %float32_argument, align 4
  %27 = fpext float %26 to double
  store double %27, ptr %f32_to_f64, align 8
  %28 = load double, ptr %float64_argument, align 8
  %29 = fptrunc double %28 to float
  store float %29, ptr %f64_to_f32, align 4
  %30 = load float, ptr %float32_argument, align 4
  %31 = fptrunc float %30 to half
  store half %31, ptr %f32_to_f16, align 2
  ret i32 0
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Passing Pointers to Functions", "[LLVM_IR]")
  {
    char const* const input_file = "passing_pointers_to_functions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Passing_pointers_to_functions_run() #0 {
entry:
  %v0_null = alloca ptr, align 8
  %v1 = alloca i32, align 4
  %v2 = alloca ptr, align 8
  call void @Passing_pointers_to_functions_take(ptr noundef null)
  store ptr null, ptr %v0_null, align 8
  %0 = load ptr, ptr %v0_null, align 8
  call void @Passing_pointers_to_functions_take(ptr noundef %0)
  store i32 1, ptr %v1, align 4
  call void @Passing_pointers_to_functions_take(ptr noundef %v1)
  store ptr null, ptr %v2, align 8
  call void @Passing_pointers_to_functions_take_2(ptr noundef %v2)
  ret void
}

; Function Attrs: convergent
define private void @Passing_pointers_to_functions_take(ptr noundef %"arguments[0].v0") #0 {
entry:
  %v0 = alloca ptr, align 8
  store ptr %"arguments[0].v0", ptr %v0, align 8
  ret void
}

; Function Attrs: convergent
define private void @Passing_pointers_to_functions_take_2(ptr noundef %"arguments[0].p0") #0 {
entry:
  %p0 = alloca ptr, align 8
  store ptr %"arguments[0].p0", ptr %p0, align 8
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Pointers", "[LLVM_IR]")
  {
    char const* const input_file = "pointers.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Pointers_pointers() #0 {
entry:
  %a = alloca i32, align 4
  %pointer_a = alloca ptr, align 8
  %dereferenced_a = alloca i32, align 4
  store i32 1, ptr %a, align 4
  store ptr %a, ptr %pointer_a, align 8
  %0 = load ptr, ptr %pointer_a, align 8
  %1 = load i32, ptr %0, align 4
  store i32 %1, ptr %dereferenced_a, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Stack Array Entry", "[LLVM_IR]")
  {
    char const* const input_file = "stack_array_entry.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.H_Builtin_Generic_array_slice = type { ptr, i64 }

; Function Attrs: convergent
define void @Stack_array_entry_foo(i64 noundef %"arguments[0].length") #0 {
entry:
  %length = alloca i64, align 8
  %0 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %array_0 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %1 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %array_1 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  store i64 %"arguments[0].length", ptr %length, align 8
  %2 = load i64, ptr %length, align 8
  %stack_save_pointer = call ptr @llvm.stacksave.p0()
  %stack_array = alloca i32, i64 %2, align 16
  %3 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %0, i32 0, i32 0
  store ptr %stack_array, ptr %3, align 8
  %4 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %0, i32 0, i32 1
  store i64 %2, ptr %4, align 8
  %5 = load %struct.H_Builtin_Generic_array_slice, ptr %0, align 8
  store %struct.H_Builtin_Generic_array_slice %5, ptr %array_0, align 8
  %6 = load i64, ptr %length, align 8
  %stack_array1 = alloca i32, i64 %6, align 16
  %7 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %1, i32 0, i32 0
  store ptr %stack_array1, ptr %7, align 8
  %8 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %1, i32 0, i32 1
  store i64 %6, ptr %8, align 8
  %9 = load %struct.H_Builtin_Generic_array_slice, ptr %1, align 8
  store %struct.H_Builtin_Generic_array_slice %9, ptr %array_1, align 8
  call void @llvm.stackrestore.p0(ptr %stack_save_pointer)
  ret void
}

; Function Attrs: nocallback nofree nosync nounwind willreturn
declare ptr @llvm.stacksave.p0() #1

; Function Attrs: nocallback nofree nosync nounwind willreturn
declare void @llvm.stackrestore.p0(ptr) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nosync nounwind willreturn }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Stack Array Loop", "[LLVM_IR]")
  {
    char const* const input_file = "stack_array_loop.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.H_Builtin_Generic_array_slice = type { ptr, i64 }

; Function Attrs: convergent
define void @Stack_array_loop_foo(i64 noundef %"arguments[0].length") #0 {
entry:
  %length = alloca i64, align 8
  %0 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %array_0 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %index = alloca i64, align 8
  %1 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  %array_1 = alloca %struct.H_Builtin_Generic_array_slice, align 8
  store i64 %"arguments[0].length", ptr %length, align 8
  %2 = load i64, ptr %length, align 8
  %stack_save_pointer = call ptr @llvm.stacksave.p0()
  %stack_array = alloca i32, i64 %2, align 16
  %3 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %0, i32 0, i32 0
  store ptr %stack_array, ptr %3, align 8
  %4 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %0, i32 0, i32 1
  store i64 %2, ptr %4, align 8
  %5 = load %struct.H_Builtin_Generic_array_slice, ptr %0, align 8
  store %struct.H_Builtin_Generic_array_slice %5, ptr %array_0, align 8
  store i64 1, ptr %index, align 8
  br label %for_loop_condition

for_loop_condition:                               ; preds = %for_loop_update_index, %entry
  %6 = load i64, ptr %length, align 8
  %7 = load i64, ptr %index, align 8
  %8 = icmp ult i64 %7, %6
  br i1 %8, label %for_loop_then, label %for_loop_after

for_loop_then:                                    ; preds = %for_loop_condition
  %9 = load i64, ptr %index, align 8
  %stack_save_pointer1 = call ptr @llvm.stacksave.p0()
  %stack_array2 = alloca i32, i64 %9, align 16
  %10 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %1, i32 0, i32 0
  store ptr %stack_array2, ptr %10, align 8
  %11 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %1, i32 0, i32 1
  store i64 %9, ptr %11, align 8
  %12 = load %struct.H_Builtin_Generic_array_slice, ptr %1, align 8
  store %struct.H_Builtin_Generic_array_slice %12, ptr %array_1, align 8
  %13 = getelementptr inbounds %struct.H_Builtin_Generic_array_slice, ptr %array_1, i32 0, i32 0
  %array_slice_element_pointer = getelementptr i32, ptr %13, i32 0
  %14 = load i64, ptr %index, align 8
  %15 = trunc i64 %14 to i32
  store i32 %15, ptr %array_slice_element_pointer, align 4
  call void @llvm.stackrestore.p0(ptr %stack_save_pointer1)
  br label %for_loop_update_index

for_loop_update_index:                            ; preds = %for_loop_then
  %16 = load i64, ptr %index, align 8
  %17 = add i64 %16, 1
  store i64 %17, ptr %index, align 8
  br label %for_loop_condition

for_loop_after:                                   ; preds = %for_loop_condition
  call void @llvm.stackrestore.p0(ptr %stack_save_pointer)
  ret void
}

; Function Attrs: nocallback nofree nosync nounwind willreturn
declare ptr @llvm.stacksave.p0() #1

; Function Attrs: nocallback nofree nosync nounwind willreturn
declare void @llvm.stackrestore.p0(ptr) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nosync nounwind willreturn }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Switch Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "switch_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define i32 @Switch_expressions_run_switch(i32 noundef %"arguments[0].value") #0 {
entry:
  %value = alloca i32, align 4
  %return_value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  %0 = load i32, ptr %value, align 4
  switch i32 %0, label %switch_after [
    i32 0, label %switch_case_i0_
  ]

switch_after:                                     ; preds = %entry
  %1 = load i32, ptr %value, align 4
  switch i32 %1, label %switch_case_default [
    i32 1, label %switch_case_i0_2
    i32 2, label %switch_case_i1_
    i32 3, label %switch_case_i2_
    i32 4, label %switch_case_i3_
    i32 5, label %switch_case_i4_
  ]

switch_case_i0_:                                  ; preds = %entry
  store i32 0, ptr %return_value, align 4
  %2 = load i32, ptr %return_value, align 4
  ret i32 %2

switch_after1:                                    ; preds = %switch_case_i3_
  %3 = load i32, ptr %value, align 4
  switch i32 %3, label %switch_case_default4 [
    i32 6, label %switch_case_i1_5
  ]

switch_case_i0_2:                                 ; preds = %switch_after
  ret i32 1

switch_case_i1_:                                  ; preds = %switch_after
  br label %switch_case_i2_

switch_case_i2_:                                  ; preds = %switch_case_i1_, %switch_after
  ret i32 2

switch_case_i3_:                                  ; preds = %switch_after
  br label %switch_after1

switch_case_i4_:                                  ; preds = %switch_after
  br label %switch_case_default

switch_case_default:                              ; preds = %switch_case_i4_, %switch_after
  ret i32 3

switch_after3:                                    ; No predecessors!
  ret i32 5

switch_case_default4:                             ; preds = %switch_after1
  br label %switch_case_i1_5

switch_case_i1_5:                                 ; preds = %switch_case_default4, %switch_after1
  ret i32 4
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Ternary Condition Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "ternary_condition_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Ternary_condition_expressions_run_ternary_conditions(i8 noundef zeroext %"arguments[0].first_boolean", i8 noundef zeroext %"arguments[1].second_boolean") #0 {
entry:
  %first_boolean = alloca i1, align 1
  %second_boolean = alloca i1, align 1
  %a = alloca i32, align 4
  %b = alloca i32, align 4
  %c = alloca i32, align 4
  %d = alloca i32, align 4
  %e = alloca i32, align 4
  %first = alloca i32, align 4
  %second = alloca i32, align 4
  %f = alloca i32, align 4
  %c_boolean = alloca i8, align 1
  %g = alloca i32, align 4
  %0 = trunc i8 %"arguments[0].first_boolean" to i1
  store i1 %0, ptr %first_boolean, align 1
  %1 = trunc i8 %"arguments[1].second_boolean" to i1
  store i1 %1, ptr %second_boolean, align 1
  %2 = load i1, ptr %first_boolean, align 1
  br i1 %2, label %ternary_condition_then, label %ternary_condition_else

ternary_condition_then:                           ; preds = %entry
  br label %ternary_condition_end

ternary_condition_else:                           ; preds = %entry
  br label %ternary_condition_end

ternary_condition_end:                            ; preds = %ternary_condition_else, %ternary_condition_then
  %3 = phi i32 [ 1, %ternary_condition_then ], [ 0, %ternary_condition_else ]
  store i32 %3, ptr %a, align 4
  %4 = load i1, ptr %first_boolean, align 1
  %5 = icmp eq i1 %4, false
  br i1 %5, label %ternary_condition_then1, label %ternary_condition_else2

ternary_condition_then1:                          ; preds = %ternary_condition_end
  br label %ternary_condition_end3

ternary_condition_else2:                          ; preds = %ternary_condition_end
  br label %ternary_condition_end3

ternary_condition_end3:                           ; preds = %ternary_condition_else2, %ternary_condition_then1
  %6 = phi i32 [ 1, %ternary_condition_then1 ], [ 0, %ternary_condition_else2 ]
  store i32 %6, ptr %b, align 4
  %7 = load i1, ptr %first_boolean, align 1
  %8 = xor i1 %7, true
  br i1 %8, label %ternary_condition_then4, label %ternary_condition_else5

ternary_condition_then4:                          ; preds = %ternary_condition_end3
  br label %ternary_condition_end6

ternary_condition_else5:                          ; preds = %ternary_condition_end3
  br label %ternary_condition_end6

ternary_condition_end6:                           ; preds = %ternary_condition_else5, %ternary_condition_then4
  %9 = phi i32 [ 1, %ternary_condition_then4 ], [ 0, %ternary_condition_else5 ]
  store i32 %9, ptr %c, align 4
  %10 = load i1, ptr %first_boolean, align 1
  br i1 %10, label %ternary_condition_then7, label %ternary_condition_else8

ternary_condition_then7:                          ; preds = %ternary_condition_end6
  %11 = load i1, ptr %second_boolean, align 1
  br i1 %11, label %ternary_condition_then10, label %ternary_condition_else11

ternary_condition_else8:                          ; preds = %ternary_condition_end6
  br label %ternary_condition_end9

ternary_condition_end9:                           ; preds = %ternary_condition_else8, %ternary_condition_end12
  %12 = phi i32 [ %14, %ternary_condition_end12 ], [ 0, %ternary_condition_else8 ]
  store i32 %12, ptr %d, align 4
  %13 = load i1, ptr %first_boolean, align 1
  br i1 %13, label %ternary_condition_then13, label %ternary_condition_else14

ternary_condition_then10:                         ; preds = %ternary_condition_then7
  br label %ternary_condition_end12

ternary_condition_else11:                         ; preds = %ternary_condition_then7
  br label %ternary_condition_end12

ternary_condition_end12:                          ; preds = %ternary_condition_else11, %ternary_condition_then10
  %14 = phi i32 [ 2, %ternary_condition_then10 ], [ 1, %ternary_condition_else11 ]
  br label %ternary_condition_end9

ternary_condition_then13:                         ; preds = %ternary_condition_end9
  br label %ternary_condition_end15

ternary_condition_else14:                         ; preds = %ternary_condition_end9
  %15 = load i1, ptr %second_boolean, align 1
  br i1 %15, label %ternary_condition_then16, label %ternary_condition_else17

ternary_condition_end15:                          ; preds = %ternary_condition_end18, %ternary_condition_then13
  %16 = phi i32 [ 2, %ternary_condition_then13 ], [ %18, %ternary_condition_end18 ]
  store i32 %16, ptr %e, align 4
  store i32 0, ptr %first, align 4
  store i32 1, ptr %second, align 4
  %17 = load i1, ptr %first_boolean, align 1
  br i1 %17, label %ternary_condition_then19, label %ternary_condition_else20

ternary_condition_then16:                         ; preds = %ternary_condition_else14
  br label %ternary_condition_end18

ternary_condition_else17:                         ; preds = %ternary_condition_else14
  br label %ternary_condition_end18

ternary_condition_end18:                          ; preds = %ternary_condition_else17, %ternary_condition_then16
  %18 = phi i32 [ 1, %ternary_condition_then16 ], [ 0, %ternary_condition_else17 ]
  br label %ternary_condition_end15

ternary_condition_then19:                         ; preds = %ternary_condition_end15
  %19 = load i32, ptr %first, align 4
  br label %ternary_condition_end21

ternary_condition_else20:                         ; preds = %ternary_condition_end15
  %20 = load i32, ptr %second, align 4
  br label %ternary_condition_end21

ternary_condition_end21:                          ; preds = %ternary_condition_else20, %ternary_condition_then19
  %21 = phi i32 [ %19, %ternary_condition_then19 ], [ %20, %ternary_condition_else20 ]
  store i32 %21, ptr %f, align 4
  store i8 1, ptr %c_boolean, align 1
  %22 = load i8, ptr %c_boolean, align 1
  %23 = trunc i8 %22 to i1
  br i1 %23, label %ternary_condition_then22, label %ternary_condition_else23

ternary_condition_then22:                         ; preds = %ternary_condition_end21
  br label %ternary_condition_end24

ternary_condition_else23:                         ; preds = %ternary_condition_end21
  br label %ternary_condition_end24

ternary_condition_end24:                          ; preds = %ternary_condition_else23, %ternary_condition_then22
  %24 = phi i32 [ 1, %ternary_condition_then22 ], [ 0, %ternary_condition_else23 ]
  store i32 %24, ptr %g, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Unary Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "unary_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Unary_expressions_unary_operations(i32 noundef %"arguments[0].my_integer", i8 noundef zeroext %"arguments[1].my_boolean") #0 {
entry:
  %my_integer = alloca i32, align 4
  %my_boolean = alloca i1, align 1
  %not_variable = alloca i1, align 1
  %bitwise_not_variable = alloca i32, align 4
  %minus_variable = alloca i32, align 4
  %my_mutable_integer = alloca i32, align 4
  %address_of_variable = alloca ptr, align 8
  %indirection_variable = alloca i32, align 4
  store i32 %"arguments[0].my_integer", ptr %my_integer, align 4
  %0 = trunc i8 %"arguments[1].my_boolean" to i1
  store i1 %0, ptr %my_boolean, align 1
  %1 = load i1, ptr %my_boolean, align 1
  %2 = xor i1 %1, true
  store i1 %2, ptr %not_variable, align 1
  %3 = load i32, ptr %my_integer, align 4
  %4 = xor i32 %3, -1
  store i32 %4, ptr %bitwise_not_variable, align 4
  %5 = load i32, ptr %my_integer, align 4
  %6 = sub i32 0, %5
  store i32 %6, ptr %minus_variable, align 4
  store i32 1, ptr %my_mutable_integer, align 4
  store ptr %my_mutable_integer, ptr %address_of_variable, align 8
  %7 = load ptr, ptr %address_of_variable, align 8
  %8 = load i32, ptr %7, align 4
  store i32 %8, ptr %indirection_variable, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Unique Name", "[LLVM_IR]")
  {
    char const* const input_file = "unique_name.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @my_unique_name() #0 {
entry:
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Alias From Modules", "[LLVM_IR]")
  {
    char const* const input_file = "using_alias_from_modules.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "Alias", parse_and_get_file_path(g_test_source_files_path / "using_alias.hltxt") },
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Alias_from_modules_use_alias(i32 noundef %"arguments[0].my_enum") #0 {
entry:
  %my_enum = alloca i32, align 4
  %a = alloca i32, align 4
  store i32 %"arguments[0].my_enum", ptr %my_enum, align 4
  store i32 10, ptr %a, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Alias", "[LLVM_IR]")
  {
    char const* const input_file = "using_alias.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Alias_use_alias(i64 noundef %"arguments[0].size", i32 noundef %"arguments[1].my_enum") #0 {
entry:
  %size = alloca i64, align 8
  %my_enum = alloca i32, align 4
  %a = alloca i32, align 4
  store i64 %"arguments[0].size", ptr %size, align 8
  store i32 %"arguments[1].my_enum", ptr %my_enum, align 4
  store i32 10, ptr %a, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Enum Flags", "[LLVM_IR]")
  {
    char const* const input_file = "using_enum_flags.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define i32 @Enum_flags_use_enums(i32 noundef %"arguments[0].enum_argument") #0 {
entry:
  %enum_argument = alloca i32, align 4
  %a = alloca i32, align 4
  %b = alloca i32, align 4
  %c = alloca i32, align 4
  store i32 %"arguments[0].enum_argument", ptr %enum_argument, align 4
  store i32 3, ptr %a, align 4
  %0 = load i32, ptr %enum_argument, align 4
  %1 = and i32 %0, 1
  store i32 %1, ptr %b, align 4
  %2 = load i32, ptr %enum_argument, align 4
  %3 = xor i32 %2, 1
  store i32 %3, ptr %c, align 4
  %4 = load i32, ptr %a, align 4
  %5 = load i32, ptr %enum_argument, align 4
  %6 = icmp eq i32 %4, %5
  br i1 %6, label %if_s0_then, label %if_s1_after

if_s0_then:                                       ; preds = %entry
  ret i32 0

if_s1_after:                                      ; preds = %entry
  %7 = load i32, ptr %b, align 4
  %8 = load i32, ptr %enum_argument, align 4
  %9 = icmp ne i32 %7, %8
  br i1 %9, label %if_s0_then1, label %if_s1_after2

if_s0_then1:                                      ; preds = %if_s1_after
  ret i32 1

if_s1_after2:                                     ; preds = %if_s1_after
  %10 = load i32, ptr %enum_argument, align 4
  %11 = and i32 %10, 1
  %12 = icmp ugt i32 %11, 0
  br i1 %12, label %if_s0_then3, label %if_s1_after4

if_s0_then3:                                      ; preds = %if_s1_after2
  ret i32 2

if_s1_after4:                                     ; preds = %if_s1_after2
  %13 = load i32, ptr %enum_argument, align 4
  %14 = and i32 %13, 2
  %15 = icmp ugt i32 %14, 0
  br i1 %15, label %if_s0_then5, label %if_s1_after6

if_s0_then5:                                      ; preds = %if_s1_after4
  ret i32 3

if_s1_after6:                                     ; preds = %if_s1_after4
  %16 = load i32, ptr %enum_argument, align 4
  %17 = and i32 %16, 4
  %18 = icmp ugt i32 %17, 0
  br i1 %18, label %if_s0_then7, label %if_s1_after8

if_s0_then7:                                      ; preds = %if_s1_after6
  ret i32 4

if_s1_after8:                                     ; preds = %if_s1_after6
  ret i32 5
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Enums Duplicate", "[LLVM_IR]")
  {
    char const* const input_file = "using_enums_duplicate.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "Enums", parse_and_get_file_path(g_test_source_files_path / "using_enums.hltxt") },
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Enums_duplicate_use_enums() #0 {
entry:
  %v0 = alloca i32, align 4
  %v1 = alloca i32, align 4
  store i32 10, ptr %v0, align 4
  store i32 1, ptr %v1, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Enums From Modules", "[LLVM_IR]")
  {
    char const* const input_file = "using_enums_from_modules.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "Enums", parse_and_get_file_path(g_test_source_files_path / "using_enums.hltxt") },
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define void @Enums_from_modules_use_enums() #0 {
entry:
  %my_value = alloca i32, align 4
  store i32 1, ptr %my_value, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Enums", "[LLVM_IR]")
  {
    char const* const input_file = "using_enums.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define i32 @Enums_use_enums(i32 noundef %"arguments[0].enum_argument") #0 {
entry:
  %enum_argument = alloca i32, align 4
  %my_value = alloca i32, align 4
  store i32 %"arguments[0].enum_argument", ptr %enum_argument, align 4
  store i32 1, ptr %my_value, align 4
  %0 = load i32, ptr %enum_argument, align 4
  switch i32 %0, label %switch_after [
    i32 0, label %switch_case_i0_
    i32 1, label %switch_case_i1_
    i32 4, label %switch_case_i2_
    i32 8, label %switch_case_i3_
    i32 10, label %switch_case_i4_
    i32 11, label %switch_case_i5_
  ]

switch_after:                                     ; preds = %entry
  ret i32 2

switch_case_i0_:                                  ; preds = %entry
  br label %switch_case_i1_

switch_case_i1_:                                  ; preds = %switch_case_i0_, %entry
  br label %switch_case_i2_

switch_case_i2_:                                  ; preds = %switch_case_i1_, %entry
  br label %switch_case_i3_

switch_case_i3_:                                  ; preds = %switch_case_i2_, %entry
  ret i32 0

switch_case_i4_:                                  ; preds = %entry
  br label %switch_case_i5_

switch_case_i5_:                                  ; preds = %switch_case_i4_, %entry
  ret i32 1
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Function Constructors", "[LLVM_IR]")
  {
    char const* const input_file = "using_function_constructors.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private void @Function_constructor_run() #0 {
entry:
  %a = alloca i32, align 4
  %b = alloca float, align 4
  %c = alloca i32, align 4
  %0 = call i32 @"Function_constructor_add@12872766087933253718"(i32 noundef 1, i32 noundef 2)
  store i32 %0, ptr %a, align 4
  %1 = call float @"Function_constructor_add@2587280390906766232"(float noundef 3.000000e+00, float noundef 4.000000e+00)
  store float %1, ptr %b, align 4
  %2 = call i32 @"Function_constructor_add@5701317356091045786"(i32 noundef 1, i32 noundef 2)
  store i32 %2, ptr %c, align 4
  ret void
}

; Function Attrs: convergent
define private i32 @"Function_constructor_add@12872766087933253718"(i32 noundef %"arguments[0].first", i32 noundef %"arguments[1].second") #0 {
entry:
  %first = alloca i32, align 4
  %second = alloca i32, align 4
  store i32 %"arguments[0].first", ptr %first, align 4
  store i32 %"arguments[1].second", ptr %second, align 4
  %0 = load i32, ptr %first, align 4
  %1 = load i32, ptr %second, align 4
  %2 = add i32 %0, %1
  ret i32 %2
}

; Function Attrs: convergent
define private float @"Function_constructor_add@2587280390906766232"(float noundef %"arguments[0].first", float noundef %"arguments[1].second") #0 {
entry:
  %first = alloca float, align 4
  %second = alloca float, align 4
  store float %"arguments[0].first", ptr %first, align 4
  store float %"arguments[1].second", ptr %second, align 4
  %0 = load float, ptr %first, align 4
  %1 = load float, ptr %second, align 4
  %2 = fadd float %0, %1
  ret float %2
}

; Function Attrs: convergent
define private i32 @"Function_constructor_add@5701317356091045786"(i32 noundef %"arguments[0].first", i32 noundef %"arguments[1].second") #0 {
entry:
  %first = alloca i32, align 4
  %second = alloca i32, align 4
  store i32 %"arguments[0].first", ptr %first, align 4
  store i32 %"arguments[1].second", ptr %second, align 4
  %0 = load i32, ptr %first, align 4
  %1 = load i32, ptr %second, align 4
  %2 = add i32 %0, %1
  ret i32 %2
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Global Variables", "[LLVM_IR]")
  {
    char const* const input_file = "using_global_variables.hltxt";

    std::filesystem::path const root_directory_path = std::filesystem::temp_directory_path() / "using_global_variables";
    std::filesystem::create_directories(root_directory_path);

    std::string const header_content = R"(
#define MY_DEFINE 2.0f
float my_global = 0.0f;
)";

    std::filesystem::path const header_file_path = root_directory_path / "my_header.h";
    h::common::write_to_file(header_file_path, header_content);

    std::filesystem::path const header_module_file_path = root_directory_path / "my_header.hltxt";
    h::c::import_header_and_write_to_file("my_module", header_file_path, header_module_file_path, {});

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "my_module", header_module_file_path }
    };

    char const* const expected_llvm_ir = R"(
@Global_variables_my_global_variable_0 = global float 1.000000e+00
@my_global = global float 0.000000e+00

; Function Attrs: convergent
define void @Global_variables_use_global_variables(float noundef %"arguments[0].parameter") #0 {
entry:
  %parameter = alloca float, align 4
  %a = alloca float, align 4
  %b = alloca ptr, align 8
  %c = alloca float, align 4
  %d = alloca float, align 4
  store float %"arguments[0].parameter", ptr %parameter, align 4
  %0 = load float, ptr @Global_variables_my_global_variable_0, align 4
  %1 = fadd float 2.000000e+00, %0
  %2 = load float, ptr %parameter, align 4
  %3 = fadd float %1, %2
  store float %3, ptr %a, align 4
  store ptr @Global_variables_my_global_variable_0, ptr %b, align 8
  store float 2.000000e+00, ptr %c, align 4
  %4 = load float, ptr @my_global, align 4
  store float %4, ptr %d, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Structs", "[LLVM_IR]")
  {
    char const* const input_file = "using_structs.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%struct.Structs_My_struct = type { i32, i32 }
%struct.Structs_My_struct_2 = type { %struct.Structs_My_struct, %struct.Structs_My_struct, %struct.Structs_My_struct }
%struct.Structs_My_struct_3 = type { i32, %union.Structs_My_Union }
%union.Structs_My_Union = type { %struct.Structs_My_struct_2 }

; Function Attrs: convergent
define void @Structs_use_structs(i64 noundef %"arguments[0].my_struct") #0 {
entry:
  %0 = alloca %struct.Structs_My_struct, align 4
  %a = alloca i32, align 4
  %1 = alloca %struct.Structs_My_struct, align 4
  %instance_0 = alloca %struct.Structs_My_struct, align 4
  %2 = alloca %struct.Structs_My_struct, align 4
  %instance_1 = alloca %struct.Structs_My_struct, align 4
  %3 = alloca %struct.Structs_My_struct_2, align 4
  %4 = alloca %struct.Structs_My_struct, align 4
  %5 = alloca %struct.Structs_My_struct, align 4
  %6 = alloca %struct.Structs_My_struct, align 4
  %instance_2 = alloca %struct.Structs_My_struct_2, align 4
  %7 = alloca %struct.Structs_My_struct_2, align 4
  %8 = alloca %struct.Structs_My_struct, align 4
  %9 = alloca %struct.Structs_My_struct, align 4
  %10 = alloca %struct.Structs_My_struct, align 4
  %instance_3 = alloca %struct.Structs_My_struct_2, align 4
  %nested_b_a = alloca i32, align 4
  %11 = alloca %struct.Structs_My_struct, align 4
  %instance_4 = alloca %struct.Structs_My_struct, align 4
  %12 = alloca %struct.Structs_My_struct, align 4
  %13 = alloca %struct.Structs_My_struct, align 4
  %14 = alloca %struct.Structs_My_struct, align 4
  %instance_5 = alloca %struct.Structs_My_struct, align 4
  %15 = alloca %struct.Structs_My_struct_3, align 4
  %16 = alloca %struct.Structs_My_struct, align 4
  %17 = alloca %union.Structs_My_Union, align 4
  %instance_6 = alloca %struct.Structs_My_struct_3, align 4
  %18 = getelementptr inbounds %struct.Structs_My_struct, ptr %0, i32 0, i32 0
  store i64 %"arguments[0].my_struct", ptr %18, align 4
  %19 = getelementptr inbounds %struct.Structs_My_struct, ptr %0, i32 0, i32 0
  %20 = load i32, ptr %19, align 4
  store i32 %20, ptr %a, align 4
  %21 = getelementptr inbounds %struct.Structs_My_struct, ptr %1, i32 0, i32 0
  store i32 1, ptr %21, align 4
  %22 = getelementptr inbounds %struct.Structs_My_struct, ptr %1, i32 0, i32 1
  store i32 2, ptr %22, align 4
  %23 = load %struct.Structs_My_struct, ptr %1, align 4
  store %struct.Structs_My_struct %23, ptr %instance_0, align 4
  %24 = getelementptr inbounds %struct.Structs_My_struct, ptr %2, i32 0, i32 0
  store i32 1, ptr %24, align 4
  %25 = getelementptr inbounds %struct.Structs_My_struct, ptr %2, i32 0, i32 1
  store i32 3, ptr %25, align 4
  %26 = load %struct.Structs_My_struct, ptr %2, align 4
  store %struct.Structs_My_struct %26, ptr %instance_1, align 4
  %27 = getelementptr inbounds %struct.Structs_My_struct, ptr %4, i32 0, i32 0
  store i32 1, ptr %27, align 4
  %28 = getelementptr inbounds %struct.Structs_My_struct, ptr %4, i32 0, i32 1
  store i32 2, ptr %28, align 4
  %29 = load %struct.Structs_My_struct, ptr %4, align 4
  %30 = getelementptr inbounds %struct.Structs_My_struct_2, ptr %3, i32 0, i32 0
  store %struct.Structs_My_struct %29, ptr %30, align 4
  %31 = getelementptr inbounds %struct.Structs_My_struct, ptr %5, i32 0, i32 0
  store i32 2, ptr %31, align 4
  %32 = getelementptr inbounds %struct.Structs_My_struct, ptr %5, i32 0, i32 1
  store i32 2, ptr %32, align 4
  %33 = load %struct.Structs_My_struct, ptr %5, align 4
  %34 = getelementptr inbounds %struct.Structs_My_struct_2, ptr %3, i32 0, i32 1
  store %struct.Structs_My_struct %33, ptr %34, align 4
  %35 = getelementptr inbounds %struct.Structs_My_struct, ptr %6, i32 0, i32 0
  store i32 3, ptr %35, align 4
  %36 = getelementptr inbounds %struct.Structs_My_struct, ptr %6, i32 0, i32 1
  store i32 4, ptr %36, align 4
  %37 = load %struct.Structs_My_struct, ptr %6, align 4
  %38 = getelementptr inbounds %struct.Structs_My_struct_2, ptr %3, i32 0, i32 2
  store %struct.Structs_My_struct %37, ptr %38, align 4
  %39 = load %struct.Structs_My_struct_2, ptr %3, align 4
  store %struct.Structs_My_struct_2 %39, ptr %instance_2, align 4
  %40 = getelementptr inbounds %struct.Structs_My_struct, ptr %8, i32 0, i32 0
  store i32 1, ptr %40, align 4
  %41 = getelementptr inbounds %struct.Structs_My_struct, ptr %8, i32 0, i32 1
  store i32 2, ptr %41, align 4
  %42 = load %struct.Structs_My_struct, ptr %8, align 4
  %43 = getelementptr inbounds %struct.Structs_My_struct_2, ptr %7, i32 0, i32 0
  store %struct.Structs_My_struct %42, ptr %43, align 4
  %44 = getelementptr inbounds %struct.Structs_My_struct, ptr %9, i32 0, i32 0
  store i32 1, ptr %44, align 4
  %45 = getelementptr inbounds %struct.Structs_My_struct, ptr %9, i32 0, i32 1
  store i32 2, ptr %45, align 4
  %46 = load %struct.Structs_My_struct, ptr %9, align 4
  %47 = getelementptr inbounds %struct.Structs_My_struct_2, ptr %7, i32 0, i32 1
  store %struct.Structs_My_struct %46, ptr %47, align 4
  %48 = getelementptr inbounds %struct.Structs_My_struct, ptr %10, i32 0, i32 0
  store i32 0, ptr %48, align 4
  %49 = getelementptr inbounds %struct.Structs_My_struct, ptr %10, i32 0, i32 1
  store i32 1, ptr %49, align 4
  %50 = load %struct.Structs_My_struct, ptr %10, align 4
  %51 = getelementptr inbounds %struct.Structs_My_struct_2, ptr %7, i32 0, i32 2
  store %struct.Structs_My_struct %50, ptr %51, align 4
  %52 = load %struct.Structs_My_struct_2, ptr %7, align 4
  store %struct.Structs_My_struct_2 %52, ptr %instance_3, align 4
  %53 = getelementptr inbounds %struct.Structs_My_struct_2, ptr %instance_3, i32 0, i32 1
  %54 = getelementptr inbounds %struct.Structs_My_struct, ptr %53, i32 0, i32 0
  %55 = load i32, ptr %54, align 4
  store i32 %55, ptr %nested_b_a, align 4
  %56 = getelementptr inbounds %struct.Structs_My_struct, ptr %11, i32 0, i32 0
  store i32 1, ptr %56, align 4
  %57 = getelementptr inbounds %struct.Structs_My_struct, ptr %11, i32 0, i32 1
  store i32 2, ptr %57, align 4
  %58 = load %struct.Structs_My_struct, ptr %11, align 4
  store %struct.Structs_My_struct %58, ptr %instance_4, align 4
  %59 = getelementptr inbounds %struct.Structs_My_struct, ptr %12, i32 0, i32 0
  store i32 10, ptr %59, align 4
  %60 = getelementptr inbounds %struct.Structs_My_struct, ptr %12, i32 0, i32 1
  store i32 11, ptr %60, align 4
  %61 = load %struct.Structs_My_struct, ptr %12, align 4
  store %struct.Structs_My_struct %61, ptr %instance_4, align 4
  %62 = getelementptr inbounds %struct.Structs_My_struct, ptr %instance_4, i32 0, i32 0
  %63 = getelementptr inbounds %struct.Structs_My_struct, ptr %instance_4, i32 0, i32 0
  store i32 0, ptr %63, align 4
  %64 = getelementptr inbounds %struct.Structs_My_struct, ptr %13, i32 0, i32 0
  store i32 1, ptr %64, align 4
  %65 = getelementptr inbounds %struct.Structs_My_struct, ptr %13, i32 0, i32 1
  store i32 2, ptr %65, align 4
  %66 = getelementptr inbounds %struct.Structs_My_struct, ptr %13, i32 0, i32 0
  %67 = load i64, ptr %66, align 4
  call void @Structs_pass_struct(i64 noundef %67)
  %68 = call i64 @Structs_return_struct()
  %69 = getelementptr inbounds %struct.Structs_My_struct, ptr %14, i32 0, i32 0
  store i64 %68, ptr %69, align 4
  %70 = load %struct.Structs_My_struct, ptr %14, align 4
  store %struct.Structs_My_struct %70, ptr %instance_5, align 4
  %71 = getelementptr inbounds %struct.Structs_My_struct_3, ptr %15, i32 0, i32 0
  store i32 4, ptr %71, align 4
  %72 = getelementptr inbounds %struct.Structs_My_struct, ptr %16, i32 0, i32 0
  store i32 1, ptr %72, align 4
  %73 = getelementptr inbounds %struct.Structs_My_struct, ptr %16, i32 0, i32 1
  store i32 2, ptr %73, align 4
  %74 = load %struct.Structs_My_struct, ptr %16, align 4
  store %struct.Structs_My_struct %74, ptr %17, align 4
  %75 = load %union.Structs_My_Union, ptr %17, align 4
  %76 = getelementptr inbounds %struct.Structs_My_struct_3, ptr %15, i32 0, i32 1
  store %union.Structs_My_Union %75, ptr %76, align 4
  %77 = load %struct.Structs_My_struct_3, ptr %15, align 4
  store %struct.Structs_My_struct_3 %77, ptr %instance_6, align 4
  ret void
}

; Function Attrs: convergent
define private void @Structs_pass_struct(i64 noundef %"arguments[0].my_struct") #0 {
entry:
  %0 = alloca %struct.Structs_My_struct, align 4
  %1 = getelementptr inbounds %struct.Structs_My_struct, ptr %0, i32 0, i32 0
  store i64 %"arguments[0].my_struct", ptr %1, align 4
  ret void
}

; Function Attrs: convergent
define private i64 @Structs_return_struct() #0 {
entry:
  %0 = alloca %struct.Structs_My_struct, align 4
  %1 = getelementptr inbounds %struct.Structs_My_struct, ptr %0, i32 0, i32 0
  store i32 1, ptr %1, align 4
  %2 = getelementptr inbounds %struct.Structs_My_struct, ptr %0, i32 0, i32 1
  store i32 2, ptr %2, align 4
  %3 = getelementptr inbounds %struct.Structs_My_struct, ptr %0, i32 0, i32 0
  %4 = load i64, ptr %3, align 4
  ret i64 %4
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Type Constructors", "[LLVM_IR]")
  {
    char const* const input_file = "using_type_constructors.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%"struct.Type_constructor_Dynamic_array@2616204444652410143" = type { ptr, i64 }
%"struct.Type_constructor_Dynamic_array@9084055025385753601" = type { ptr, i64 }
%struct.Type_constructor_My_struct = type { %"struct.Type_constructor_Dynamic_array@5206327013959772419" }
%"struct.Type_constructor_Dynamic_array@5206327013959772419" = type { ptr, i64 }
%"struct.Type_constructor_Dynamic_array@2428226642254427654" = type { ptr, i64 }

; Function Attrs: convergent
define private void @Type_constructor_run(ptr %"arguments[0].instance_0_0", i64 %"arguments[0].instance_0_1") #0 {
entry:
  %instance_0 = alloca %"struct.Type_constructor_Dynamic_array@2616204444652410143", align 8
  %0 = alloca %"struct.Type_constructor_Dynamic_array@9084055025385753601", align 8
  %instance_1 = alloca %"struct.Type_constructor_Dynamic_array@9084055025385753601", align 8
  %1 = alloca %struct.Type_constructor_My_struct, align 8
  %2 = alloca %"struct.Type_constructor_Dynamic_array@5206327013959772419", align 8
  %instance_2 = alloca %struct.Type_constructor_My_struct, align 8
  %3 = alloca %"struct.Type_constructor_Dynamic_array@2428226642254427654", align 8
  %instance_3 = alloca %"struct.Type_constructor_Dynamic_array@2428226642254427654", align 8
  %4 = getelementptr inbounds { ptr, i64 }, ptr %instance_0, i32 0, i32 0
  store ptr %"arguments[0].instance_0_0", ptr %4, align 8
  %5 = getelementptr inbounds { ptr, i64 }, ptr %instance_0, i32 0, i32 1
  store i64 %"arguments[0].instance_0_1", ptr %5, align 8
  %6 = getelementptr inbounds %"struct.Type_constructor_Dynamic_array@9084055025385753601", ptr %0, i32 0, i32 0
  store ptr null, ptr %6, align 8
  %7 = getelementptr inbounds %"struct.Type_constructor_Dynamic_array@9084055025385753601", ptr %0, i32 0, i32 1
  store i64 0, ptr %7, align 8
  %8 = load %"struct.Type_constructor_Dynamic_array@9084055025385753601", ptr %0, align 8
  store %"struct.Type_constructor_Dynamic_array@9084055025385753601" %8, ptr %instance_1, align 8
  %9 = getelementptr inbounds %"struct.Type_constructor_Dynamic_array@5206327013959772419", ptr %2, i32 0, i32 0
  store ptr null, ptr %9, align 8
  %10 = getelementptr inbounds %"struct.Type_constructor_Dynamic_array@5206327013959772419", ptr %2, i32 0, i32 1
  store i64 0, ptr %10, align 8
  %11 = load %"struct.Type_constructor_Dynamic_array@5206327013959772419", ptr %2, align 8
  %12 = getelementptr inbounds %struct.Type_constructor_My_struct, ptr %1, i32 0, i32 0
  store %"struct.Type_constructor_Dynamic_array@5206327013959772419" %11, ptr %12, align 8
  %13 = load %struct.Type_constructor_My_struct, ptr %1, align 8
  store %struct.Type_constructor_My_struct %13, ptr %instance_2, align 8
  %14 = getelementptr inbounds %"struct.Type_constructor_Dynamic_array@2428226642254427654", ptr %3, i32 0, i32 0
  store ptr null, ptr %14, align 8
  %15 = getelementptr inbounds %"struct.Type_constructor_Dynamic_array@2428226642254427654", ptr %3, i32 0, i32 1
  store i64 0, ptr %15, align 8
  %16 = load %"struct.Type_constructor_Dynamic_array@2428226642254427654", ptr %3, align 8
  store %"struct.Type_constructor_Dynamic_array@2428226642254427654" %16, ptr %instance_3, align 8
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Unions", "[LLVM_IR]")
  {
    char const* const input_file = "using_unions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%union.Unions_My_union = type { i32 }
%union.Unions_My_union_2 = type { i64 }
%union.Unions_My_union_3 = type { i64 }
%struct.Unions_My_struct = type { i32 }

; Function Attrs: convergent
define void @Unions_use_unions(i32 noundef %"arguments[0].my_union", i32 noundef %"arguments[1].my_union_tag") #0 {
entry:
  %0 = alloca %union.Unions_My_union, align 4
  %my_union_tag = alloca i32, align 4
  %a = alloca i32, align 4
  %b = alloca float, align 4
  %1 = alloca %union.Unions_My_union, align 4
  %instance_0 = alloca %union.Unions_My_union, align 4
  %2 = alloca %union.Unions_My_union, align 4
  %instance_1 = alloca %union.Unions_My_union, align 4
  %3 = alloca %union.Unions_My_union_2, align 8
  %instance_2 = alloca %union.Unions_My_union_2, align 8
  %4 = alloca %union.Unions_My_union_2, align 8
  %instance_3 = alloca %union.Unions_My_union_2, align 8
  %5 = alloca %union.Unions_My_union_3, align 8
  %instance_4 = alloca %union.Unions_My_union_3, align 8
  %6 = alloca %struct.Unions_My_struct, align 4
  %7 = alloca %union.Unions_My_union_3, align 8
  %instance_5 = alloca %union.Unions_My_union_3, align 8
  %8 = alloca %struct.Unions_My_struct, align 4
  %9 = alloca %union.Unions_My_union_3, align 8
  %instance_6 = alloca %union.Unions_My_union_3, align 8
  %nested_b_a = alloca i32, align 4
  %10 = alloca %union.Unions_My_union, align 4
  %instance_7 = alloca %union.Unions_My_union, align 4
  %11 = alloca %union.Unions_My_union, align 4
  %12 = alloca %union.Unions_My_union, align 4
  %13 = alloca %union.Unions_My_union, align 4
  %instance_8 = alloca %union.Unions_My_union, align 4
  %14 = alloca %union.Unions_My_union, align 4
  %instance_9 = alloca %union.Unions_My_union, align 4
  %15 = getelementptr inbounds %union.Unions_My_union, ptr %0, i32 0, i32 0
  store i32 %"arguments[0].my_union", ptr %15, align 4
  store i32 %"arguments[1].my_union_tag", ptr %my_union_tag, align 4
  %16 = load i32, ptr %my_union_tag, align 4
  %17 = icmp eq i32 %16, 0
  br i1 %17, label %if_s0_then, label %if_s1_else

if_s0_then:                                       ; preds = %entry
  %18 = getelementptr inbounds %union.Unions_My_union, ptr %0, i32 0, i32 0
  %19 = load i32, ptr %18, align 4
  store i32 %19, ptr %a, align 4
  br label %if_s3_after

if_s1_else:                                       ; preds = %entry
  %20 = load i32, ptr %my_union_tag, align 4
  %21 = icmp eq i32 %20, 1
  br i1 %21, label %if_s2_then, label %if_s3_after

if_s2_then:                                       ; preds = %if_s1_else
  %22 = getelementptr inbounds %union.Unions_My_union, ptr %0, i32 0, i32 0
  %23 = load float, ptr %22, align 4
  store float %23, ptr %b, align 4
  br label %if_s3_after

if_s3_after:                                      ; preds = %if_s2_then, %if_s1_else, %if_s0_then
  store i32 2, ptr %1, align 4
  %24 = load %union.Unions_My_union, ptr %1, align 4
  store %union.Unions_My_union %24, ptr %instance_0, align 4
  store float 3.000000e+00, ptr %2, align 4
  %25 = load %union.Unions_My_union, ptr %2, align 4
  store %union.Unions_My_union %25, ptr %instance_1, align 4
  store i32 2, ptr %3, align 4
  %26 = load %union.Unions_My_union_2, ptr %3, align 8
  store %union.Unions_My_union_2 %26, ptr %instance_2, align 8
  store i64 3, ptr %4, align 8
  %27 = load %union.Unions_My_union_2, ptr %4, align 8
  store %union.Unions_My_union_2 %27, ptr %instance_3, align 8
  store i64 3, ptr %5, align 8
  %28 = load %union.Unions_My_union_3, ptr %5, align 8
  store %union.Unions_My_union_3 %28, ptr %instance_4, align 8
  %29 = getelementptr inbounds %struct.Unions_My_struct, ptr %6, i32 0, i32 0
  store i32 1, ptr %29, align 4
  %30 = load %struct.Unions_My_struct, ptr %6, align 4
  store %struct.Unions_My_struct %30, ptr %7, align 4
  %31 = load %union.Unions_My_union_3, ptr %7, align 8
  store %union.Unions_My_union_3 %31, ptr %instance_5, align 8
  %32 = getelementptr inbounds %struct.Unions_My_struct, ptr %8, i32 0, i32 0
  store i32 2, ptr %32, align 4
  %33 = load %struct.Unions_My_struct, ptr %8, align 4
  store %struct.Unions_My_struct %33, ptr %9, align 4
  %34 = load %union.Unions_My_union_3, ptr %9, align 8
  store %union.Unions_My_union_3 %34, ptr %instance_6, align 8
  %35 = getelementptr inbounds %union.Unions_My_union_3, ptr %instance_6, i32 0, i32 0
  %36 = getelementptr inbounds %struct.Unions_My_struct, ptr %35, i32 0, i32 0
  %37 = load i32, ptr %36, align 4
  store i32 %37, ptr %nested_b_a, align 4
  store i32 1, ptr %10, align 4
  %38 = load %union.Unions_My_union, ptr %10, align 4
  store %union.Unions_My_union %38, ptr %instance_7, align 4
  store i32 2, ptr %11, align 4
  %39 = load %union.Unions_My_union, ptr %11, align 4
  store %union.Unions_My_union %39, ptr %instance_7, align 4
  store i32 4, ptr %12, align 4
  %40 = getelementptr inbounds %union.Unions_My_union, ptr %12, i32 0, i32 0
  %41 = load i32, ptr %40, align 4
  call void @Unions_pass_union(i32 noundef %41)
  %42 = call i32 @Unions_return_union()
  %43 = getelementptr inbounds %union.Unions_My_union, ptr %13, i32 0, i32 0
  store i32 %42, ptr %43, align 4
  %44 = load %union.Unions_My_union, ptr %13, align 4
  store %union.Unions_My_union %44, ptr %instance_8, align 4
  call void @llvm.memset.p0.i64(ptr align 4 %14, i8 0, i64 4, i1 false)
  %45 = load %union.Unions_My_union, ptr %14, align 4
  store %union.Unions_My_union %45, ptr %instance_9, align 4
  ret void
}

; Function Attrs: convergent
define private void @Unions_pass_union(i32 noundef %"arguments[0].my_union") #0 {
entry:
  %0 = alloca %union.Unions_My_union, align 4
  %1 = getelementptr inbounds %union.Unions_My_union, ptr %0, i32 0, i32 0
  store i32 %"arguments[0].my_union", ptr %1, align 4
  ret void
}

; Function Attrs: convergent
define private i32 @Unions_return_union() #0 {
entry:
  %0 = alloca %union.Unions_My_union, align 4
  store float 1.000000e+01, ptr %0, align 4
  %1 = getelementptr inbounds %union.Unions_My_union, ptr %0, i32 0, i32 0
  %2 = load i32, ptr %1, align 4
  ret i32 %2
}

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: write)
declare void @llvm.memset.p0.i64(ptr nocapture writeonly, i8, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: write) }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Variables", "[LLVM_IR]")
  {
    char const* const input_file = "variables.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define i32 @Variables_main() #0 {
entry:
  %my_constant_variable = alloca i32, align 4
  %my_mutable_variable = alloca i32, align 4
  store i32 1, ptr %my_constant_variable, align 4
  store i32 2, ptr %my_mutable_variable, align 4
  store i32 3, ptr %my_mutable_variable, align 4
  ret i32 0
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile While Loop Expressions", "[LLVM_IR]")
  {
    char const* const input_file = "while_loop_expressions.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "c.stdio", import_c_header_and_get_file_path("c.stdio", "stdio.h") }
    };

    char const* const expected_llvm_ir = R"(
@global_0 = internal constant [3 x i8] c"%d\00"

; Function Attrs: convergent
define void @While_loop_expressions_run_while_loops(i32 noundef %"arguments[0].size") #0 {
entry:
  %size = alloca i32, align 4
  %index = alloca i32, align 4
  %index1 = alloca i32, align 4
  %c_boolean = alloca i8, align 1
  store i32 %"arguments[0].size", ptr %size, align 4
  store i32 0, ptr %index, align 4
  br label %while_loop_condition

while_loop_condition:                             ; preds = %while_loop_then, %entry
  %0 = load i32, ptr %index, align 4
  %1 = load i32, ptr %size, align 4
  %2 = icmp slt i32 %0, %1
  br i1 %2, label %while_loop_then, label %while_loop_after

while_loop_then:                                  ; preds = %while_loop_condition
  %3 = load i32, ptr %index, align 4
  call void @While_loop_expressions_print_integer(i32 noundef %3)
  %4 = load i32, ptr %index, align 4
  %5 = add i32 %4, 1
  store i32 %5, ptr %index, align 4
  br label %while_loop_condition

while_loop_after:                                 ; preds = %while_loop_condition
  store i32 0, ptr %index1, align 4
  br label %while_loop_condition2

while_loop_condition2:                            ; preds = %if_s1_after6, %if_s0_then, %while_loop_after
  %6 = load i32, ptr %index1, align 4
  %7 = load i32, ptr %size, align 4
  %8 = icmp slt i32 %6, %7
  br i1 %8, label %while_loop_then3, label %while_loop_after4

while_loop_then3:                                 ; preds = %while_loop_condition2
  %9 = load i32, ptr %index1, align 4
  %10 = srem i32 %9, 2
  %11 = icmp eq i32 %10, 0
  br i1 %11, label %if_s0_then, label %if_s1_after

while_loop_after4:                                ; preds = %if_s0_then5, %while_loop_condition2
  store i8 1, ptr %c_boolean, align 1
  br label %while_loop_condition7

if_s0_then:                                       ; preds = %while_loop_then3
  br label %while_loop_condition2

if_s1_after:                                      ; preds = %while_loop_then3
  %12 = load i32, ptr %index1, align 4
  %13 = icmp sgt i32 %12, 5
  br i1 %13, label %if_s0_then5, label %if_s1_after6

if_s0_then5:                                      ; preds = %if_s1_after
  br label %while_loop_after4

if_s1_after6:                                     ; preds = %if_s1_after
  %14 = load i32, ptr %index1, align 4
  call void @While_loop_expressions_print_integer(i32 noundef %14)
  %15 = load i32, ptr %index1, align 4
  %16 = add i32 %15, 1
  store i32 %16, ptr %index1, align 4
  br label %while_loop_condition2

while_loop_condition7:                            ; preds = %while_loop_then8, %while_loop_after4
  %17 = load i8, ptr %c_boolean, align 1
  %18 = trunc i8 %17 to i1
  br i1 %18, label %while_loop_then8, label %while_loop_after9

while_loop_then8:                                 ; preds = %while_loop_condition7
  store i8 0, ptr %c_boolean, align 1
  br label %while_loop_condition7

while_loop_after9:                                ; preds = %while_loop_condition7
  ret void
}

; Function Attrs: convergent
define private void @While_loop_expressions_print_integer(i32 noundef %"arguments[0].value") #0 {
entry:
  %value = alloca i32, align 4
  store i32 %"arguments[0].value", ptr %value, align 4
  %0 = call i32 (ptr, ...) @printf(ptr noundef @global_0)
  ret void
}

; Function Attrs: convergent
declare i32 @printf(ptr noundef, ...) #0

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Function Contracts", "[LLVM_IR]")
  {
    char const* const input_file = "function_contracts.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
@function_contract_error_string = private unnamed_addr constant [67 x i8] c"In function 'Function_contracts.run' precondition 'x >= 0' failed!\00"
@function_contract_error_string.1 = private unnamed_addr constant [67 x i8] c"In function 'Function_contracts.run' precondition 'x <= 8' failed!\00"
@function_contract_error_string.2 = private unnamed_addr constant [73 x i8] c"In function 'Function_contracts.run' postcondition 'result >= 0' failed!\00"
@function_contract_error_string.3 = private unnamed_addr constant [74 x i8] c"In function 'Function_contracts.run' postcondition 'result <= 64' failed!\00"
@function_contract_error_string.4 = private unnamed_addr constant [73 x i8] c"In function 'Function_contracts.run' postcondition 'result >= 0' failed!\00"
@function_contract_error_string.5 = private unnamed_addr constant [74 x i8] c"In function 'Function_contracts.run' postcondition 'result <= 64' failed!\00"

; Function Attrs: convergent
define i32 @Function_contracts_run(i32 noundef %"arguments[0].x") #0 {
entry:
  %x = alloca i32, align 4
  store i32 %"arguments[0].x", ptr %x, align 4
  %0 = load i32, ptr %x, align 4
  %1 = icmp sge i32 %0, 0
  br i1 %1, label %condition_success, label %condition_fail

condition_success:                                ; preds = %entry
  %2 = load i32, ptr %x, align 4
  %3 = icmp sle i32 %2, 8
  br i1 %3, label %condition_success1, label %condition_fail2

condition_fail:                                   ; preds = %entry
  %4 = call i32 @puts(ptr @function_contract_error_string)
  call void @abort()
  unreachable

condition_success1:                               ; preds = %condition_success
  %5 = load i32, ptr %x, align 4
  %6 = icmp eq i32 %5, 8
  br i1 %6, label %if_s0_then, label %if_s1_after

condition_fail2:                                  ; preds = %condition_success
  %7 = call i32 @puts(ptr @function_contract_error_string.1)
  call void @abort()
  unreachable

if_s0_then:                                       ; preds = %condition_success1
  br i1 true, label %condition_success3, label %condition_fail4

if_s1_after:                                      ; preds = %condition_success1
  %8 = load i32, ptr %x, align 4
  %9 = load i32, ptr %x, align 4
  %10 = mul i32 %8, %9
  %11 = icmp sge i32 %10, 0
  br i1 %11, label %condition_success7, label %condition_fail8

condition_success3:                               ; preds = %if_s0_then
  br i1 true, label %condition_success5, label %condition_fail6

condition_fail4:                                  ; preds = %if_s0_then
  %12 = call i32 @puts(ptr @function_contract_error_string.2)
  call void @abort()
  unreachable

condition_success5:                               ; preds = %condition_success3
  ret i32 64

condition_fail6:                                  ; preds = %condition_success3
  %13 = call i32 @puts(ptr @function_contract_error_string.3)
  call void @abort()
  unreachable

condition_success7:                               ; preds = %if_s1_after
  %14 = icmp sle i32 %10, 64
  br i1 %14, label %condition_success9, label %condition_fail10

condition_fail8:                                  ; preds = %if_s1_after
  %15 = call i32 @puts(ptr @function_contract_error_string.4)
  call void @abort()
  unreachable

condition_success9:                               ; preds = %condition_success7
  ret i32 %10

condition_fail10:                                 ; preds = %condition_success7
  %16 = call i32 @puts(ptr @function_contract_error_string.5)
  call void @abort()
  unreachable
}

declare i32 @puts(ptr)

declare void @abort()

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

    TEST_CASE("Compile Function Contracts with disable contracts", "[LLVM_IR]")
  {
    char const* const input_file = "function_contracts.hltxt";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define i32 @Function_contracts_run(i32 noundef %"arguments[0].x") #0 {
entry:
  %x = alloca i32, align 4
  store i32 %"arguments[0].x", ptr %x, align 4
  %0 = load i32, ptr %x, align 4
  %1 = icmp eq i32 %0, 8
  br i1 %1, label %if_s0_then, label %if_s1_after

if_s0_then:                                       ; preds = %entry
  ret i32 64

if_s1_after:                                      ; preds = %entry
  %2 = load i32, ptr %x, align 4
  %3 = load i32, ptr %x, align 4
  %4 = mul i32 %2, %3
  ret i32 %4
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, {.contract_options = h::compiler::Contract_options::Disabled});
  }

  TEST_CASE("Struct layout of imported C header matches 0", "[LLVM_IR]")
  {
    std::filesystem::path const root_directory_path = std::filesystem::temp_directory_path() / "struct_layout_0";
    std::filesystem::create_directories(root_directory_path);

    std::string const header_content = R"(
#include "stdint.h"

struct My_struct
{
    uint8_t v0;  // Offset: 0, Size: 1, Alignment: 1
    uint16_t v1; // Offset: 2, Size: 2, Alignment: 2
    uint8_t v2;  // Offset: 4, Size: 1, Alignment: 1
    uint32_t v3; // Offset: 8, Size: 4, Alignment: 4
    uint8_t v4;  // Offset: 12, Size: 1, Alignment: 1
    uint64_t v5; // Offset: 16, Size: 8, Alignment: 8
};
)";

    std::filesystem::path const header_file_path = root_directory_path / "my_struct.h";
    h::common::write_to_file(header_file_path, header_content);

    h::Struct_layout const expected_struct_layout = h::c::calculate_struct_layout(header_file_path, "My_struct", {});

    std::filesystem::path const header_module_file_path = root_directory_path / "my_struct.hltxt";
    h::c::import_header_and_write_to_file("my_module", header_file_path, header_module_file_path, {});

    std::optional<h::Module> core_module = h::compiler::read_core_module(header_module_file_path);
    REQUIRE(core_module.has_value());

    h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm({});

    h::Declaration_database declaration_database = h::create_declaration_database();
    h::add_declarations(declaration_database, *core_module);

    std::pmr::vector<h::Module const*> core_modules{ &core_module.value() };
    h::compiler::Clang_module_data clang_module_data = h::compiler::create_clang_module_data(
        *llvm_data.context,
        llvm_data.clang_data,
        "Hl_clang_module",
        {},
        core_modules,
        declaration_database
    );

    h::compiler::Type_database type_database = h::compiler::create_type_database(*llvm_data.context);
    h::compiler::add_module_types(type_database, *llvm_data.context, llvm_data.data_layout, clang_module_data, *core_module);

    h::Struct_layout const actual_struct_layout = h::compiler::calculate_struct_layout(llvm_data.data_layout, type_database, "my_module", "My_struct");

    CHECK(actual_struct_layout == expected_struct_layout);
  }

  void test_c_interoperability_call_function_with_struct_argument(
    std::string_view const target_triple,
    std::string_view const expected_llvm_ir
  )
  {
    char const* const input_file = "c_interoperability_call_function_with_struct.hltxt";

    std::filesystem::path const root_directory_path = std::filesystem::temp_directory_path() / "c_interoperability_call_function_with_struct";
    std::filesystem::create_directories(root_directory_path);

    std::string const header_content = R"(
typedef struct My_struct
{
    int v0;
    int v1;
    int v2;
    int v3;
} My_struct;

void foo(My_struct argument);
)";

    std::filesystem::path const header_file_path = root_directory_path / "my_header.h";
    h::common::write_to_file(header_file_path, header_content);

    std::filesystem::path const header_module_file_path = root_directory_path / "my_header.hltxt";
    h::c::import_header_and_write_to_file("my_module", header_file_path, header_module_file_path, {});

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "my_module", header_module_file_path }
    };

    Test_options const test_options
    {
      .target_triple = target_triple,
    };

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, test_options);
  }

  TEST_CASE("C Interoperability - Call function with struct argument x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.My_struct = type { i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.My_struct, align 4
  %instance = alloca %struct.My_struct, align 4
  %1 = getelementptr inbounds %struct.My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %1, align 4
  %2 = getelementptr inbounds %struct.My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %4, align 4
  %5 = load %struct.My_struct, ptr %0, align 4
  store %struct.My_struct %5, ptr %instance, align 4
  %6 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 0
  %7 = load i64, ptr %6, align 4
  %8 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 1
  %9 = load i64, ptr %8, align 4
  call void @foo(i64 %7, i64 %9)
  ret void
}

; Function Attrs: convergent
declare void @foo(i64, i64) #0

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_call_function_with_struct_argument("x86_64-pc-linux-gnu", expected_llvm_ir);
  }

    TEST_CASE("C Interoperability - Call function with struct argument x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.My_struct = type { i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.My_struct, align 4
  %instance = alloca %struct.My_struct, align 4
  %1 = alloca %struct.My_struct, align 4
  %2 = getelementptr inbounds %struct.My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %4, align 4
  %5 = getelementptr inbounds %struct.My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %5, align 4
  %6 = load %struct.My_struct, ptr %0, align 4
  store %struct.My_struct %6, ptr %instance, align 4
  call void @llvm.memcpy.p0.p0.i64(ptr align 4 %1, ptr align 4 %instance, i64 16, i1 false)
  call void @foo(ptr noundef %1)
  ret void
}

; Function Attrs: convergent
declare void @foo(ptr noundef) #0

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_c_interoperability_call_function_with_struct_argument("x86_64-pc-windows-msvc", expected_llvm_ir);
  }

  void test_c_interoperability_definition_of_function_with_struct_argument(
    std::string_view const target_triple,
    std::string_view const expected_llvm_ir
  )
  {
    char const* const input_file = "c_interoperability_define_function_with_struct.hltxt";

    std::filesystem::path const root_directory_path = std::filesystem::temp_directory_path() / "c_interoperability_define_function_with_struct";
    std::filesystem::create_directories(root_directory_path);

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map{};

    Test_options const test_options
    {
      .target_triple = target_triple,
    };

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, test_options);
  }

  TEST_CASE("C Interoperability - Definition of function with struct argument x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32 }

; Function Attrs: convergent
define private i32 @c_interoperability_add_all(i64 %"arguments[0].instance_0", i64 %"arguments[0].instance_1") #0 {
entry:
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %0 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 0
  store i64 %"arguments[0].instance_0", ptr %0, align 4
  %1 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 1
  store i64 %"arguments[0].instance_1", ptr %1, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 0
  %3 = load i32, ptr %2, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 1
  %5 = load i32, ptr %4, align 4
  %6 = add i32 %3, %5
  %7 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 2
  %8 = load i32, ptr %7, align 4
  %9 = add i32 %6, %8
  %10 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 3
  %11 = load i32, ptr %10, align 4
  %12 = add i32 %9, %11
  ret i32 %12
}

; Function Attrs: convergent
define private i32 @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %1 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %1, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %4, align 4
  %5 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %5, ptr %instance, align 4
  %6 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 0
  %7 = load i64, ptr %6, align 4
  %8 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 1
  %9 = load i64, ptr %8, align 4
  %10 = call i32 @c_interoperability_add_all(i64 %7, i64 %9)
  ret i32 %10
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_definition_of_function_with_struct_argument("x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - Definition of function with struct argument x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32 }

; Function Attrs: convergent
define private i32 @c_interoperability_add_all(ptr noundef %"arguments[0].instance") #0 {
entry:
  %instance = alloca ptr, align 8
  store ptr %"arguments[0].instance", ptr %instance, align 8
  %0 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 0
  %1 = load i32, ptr %0, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 1
  %3 = load i32, ptr %2, align 4
  %4 = add i32 %1, %3
  %5 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 2
  %6 = load i32, ptr %5, align 4
  %7 = add i32 %4, %6
  %8 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 3
  %9 = load i32, ptr %8, align 4
  %10 = add i32 %7, %9
  ret i32 %10
}

; Function Attrs: convergent
define private i32 @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %1 = alloca %struct.c_interoperability_My_struct, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %4, align 4
  %5 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %5, align 4
  %6 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %6, ptr %instance, align 4
  call void @llvm.memcpy.p0.p0.i64(ptr align 4 %1, ptr align 4 %instance, i64 16, i1 false)
  %7 = call i32 @c_interoperability_add_all(ptr noundef %1)
  ret i32 %7
}

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_c_interoperability_definition_of_function_with_struct_argument("x86_64-pc-windows-msvc", expected_llvm_ir);
  }

  void test_c_interoperability_common(
    std::string_view const input_file,
    std::string_view const target_triple,
    std::string_view const expected_llvm_ir
  )
  {
    std::string_view const directory_name = input_file.substr(0, input_file.find_last_of('.'));
    std::filesystem::path const root_directory_path = std::filesystem::temp_directory_path() / directory_name;
    std::filesystem::create_directories(root_directory_path);

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map{};

    Test_options const test_options
    {
      .target_triple = target_triple,
    };

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir, test_options);
  }

  TEST_CASE("C Interoperability - Call function that returns c bool x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private i1 @c_interoperability_initialize(i1 noundef zeroext %"arguments[0].first", i1 noundef zeroext %"arguments[1].second") #0 {
entry:
  %first = alloca i8, align 1
  %second = alloca i8, align 1
  %0 = zext i1 %"arguments[0].first" to i8
  store i8 %0, ptr %first, align 1
  %1 = zext i1 %"arguments[1].second" to i8
  store i8 %1, ptr %second, align 1
  ret i1 true
}

; Function Attrs: convergent
define private void @c_interoperability_run(i1 noundef zeroext %"arguments[0].parameter") #0 {
entry:
  %parameter = alloca i8, align 1
  %first = alloca i8, align 1
  %result = alloca i8, align 1
  %0 = zext i1 %"arguments[0].parameter" to i8
  store i8 %0, ptr %parameter, align 1
  store i8 1, ptr %first, align 1
  %1 = load i8, ptr %first, align 1
  %2 = trunc i8 %1 to i1
  %3 = load i8, ptr %parameter, align 1
  %4 = trunc i8 %3 to i1
  %5 = call i1 @c_interoperability_initialize(i1 noundef zeroext %2, i1 noundef zeroext %4)
  %6 = zext i1 %5 to i8
  store i8 %6, ptr %result, align 1
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_call_function_that_returns_bool.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - Call function that returns c bool x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private i1 @c_interoperability_initialize(i1 noundef zeroext %"arguments[0].first", i1 noundef zeroext %"arguments[1].second") #0 {
entry:
  %first = alloca i8, align 1
  %second = alloca i8, align 1
  %0 = zext i1 %"arguments[0].first" to i8
  store i8 %0, ptr %first, align 1
  %1 = zext i1 %"arguments[1].second" to i8
  store i8 %1, ptr %second, align 1
  ret i1 true
}

; Function Attrs: convergent
define private void @c_interoperability_run(i1 noundef zeroext %"arguments[0].parameter") #0 {
entry:
  %parameter = alloca i8, align 1
  %first = alloca i8, align 1
  %result = alloca i8, align 1
  %0 = zext i1 %"arguments[0].parameter" to i8
  store i8 %0, ptr %parameter, align 1
  store i8 1, ptr %first, align 1
  %1 = load i8, ptr %first, align 1
  %2 = trunc i8 %1 to i1
  %3 = load i8, ptr %parameter, align 1
  %4 = trunc i8 %3 to i1
  %5 = call i1 @c_interoperability_initialize(i1 noundef zeroext %2, i1 noundef zeroext %4)
  %6 = zext i1 %5 to i8
  store i8 %6, ptr %result, align 1
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_call_function_that_returns_bool.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_return_big_struct x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_foo(ptr %0) #0 {
entry:
  %1 = alloca %struct.c_interoperability_My_struct, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 0
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 1
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 2
  store i32 0, ptr %4, align 4
  %5 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 3
  store i32 0, ptr %5, align 4
  %6 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 4
  store i32 0, ptr %6, align 4
  call void @llvm.memcpy.p0.p0.i64(ptr align 4 %0, ptr align 4 %1, i64 20, i1 false)
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  call void @c_interoperability_foo(ptr noundef %0)
  %1 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %1, ptr %instance, align 4
  ret void
}

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_c_interoperability_common("c_interoperability_function_return_big_struct.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_return_big_struct x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_foo(ptr %0) #0 {
entry:
  %1 = alloca %struct.c_interoperability_My_struct, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 0
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 1
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 2
  store i32 0, ptr %4, align 4
  %5 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 3
  store i32 0, ptr %5, align 4
  %6 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 4
  store i32 0, ptr %6, align 4
  call void @llvm.memcpy.p0.p0.i64(ptr align 4 %0, ptr align 4 %1, i64 20, i1 false)
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  call void @c_interoperability_foo(ptr noundef %0)
  %1 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %1, ptr %instance, align 4
  ret void
}

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_c_interoperability_common("c_interoperability_function_return_big_struct.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_return_empty_struct x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type {}

; Function Attrs: convergent
define private void @c_interoperability_foo() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 1
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  call void @c_interoperability_foo()
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_return_empty_struct.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_return_empty_struct x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { [4 x i8] }

; Function Attrs: convergent
define private i32 @c_interoperability_foo() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 1
  %1 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  %2 = load i32, ptr %1, align 1
  ret i32 %2
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 1
  %instance = alloca %struct.c_interoperability_My_struct, align 1
  %1 = call i32 @c_interoperability_foo()
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 %1, ptr %2, align 1
  %3 = load %struct.c_interoperability_My_struct, ptr %0, align 1
  store %struct.c_interoperability_My_struct %3, ptr %instance, align 1
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_return_empty_struct.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_return_int x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private i32 @c_interoperability_foo() #0 {
entry:
  ret i32 0
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %value = alloca i32, align 4
  %0 = call i32 @c_interoperability_foo()
  store i32 %0, ptr %value, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_return_int.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_return_int x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private i32 @c_interoperability_foo() #0 {
entry:
  ret i32 0
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %value = alloca i32, align 4
  %0 = call i32 @c_interoperability_foo()
  store i32 %0, ptr %value, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_return_int.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_return_pointer x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private ptr @c_interoperability_foo() #0 {
entry:
  ret ptr null
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %value = alloca ptr, align 8
  %0 = call ptr @c_interoperability_foo()
  store ptr %0, ptr %value, align 8
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_return_pointer.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_return_pointer x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private ptr @c_interoperability_foo() #0 {
entry:
  ret ptr null
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %value = alloca ptr, align 8
  %0 = call ptr @c_interoperability_foo()
  store ptr %0, ptr %value, align 8
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_return_pointer.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_return_small_struct x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32 }

; Function Attrs: convergent
define private { i64, i64 } @c_interoperability_foo() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %1 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %1, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %4, align 4
  %5 = load { i64, i64 }, ptr %0, align 4
  ret { i64, i64 } %5
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %1 = call { i64, i64 } @c_interoperability_foo()
  %2 = getelementptr inbounds { i64, i64 }, ptr %0, i32 0, i32 0
  %3 = extractvalue { i64, i64 } %1, 0
  store i64 %3, ptr %2, align 4
  %4 = getelementptr inbounds { i64, i64 }, ptr %0, i32 0, i32 1
  %5 = extractvalue { i64, i64 } %1, 1
  store i64 %5, ptr %4, align 4
  %6 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %6, ptr %instance, align 4
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_return_small_struct.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_return_small_struct x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_foo(ptr %0) #0 {
entry:
  %1 = alloca %struct.c_interoperability_My_struct, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 0
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 1
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 2
  store i32 0, ptr %4, align 4
  %5 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %1, i32 0, i32 3
  store i32 0, ptr %5, align 4
  call void @llvm.memcpy.p0.p0.i64(ptr align 4 %0, ptr align 4 %1, i64 16, i1 false)
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  call void @c_interoperability_foo(ptr noundef %0)
  %1 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %1, ptr %instance, align 4
  ret void
}

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_c_interoperability_common("c_interoperability_function_return_small_struct.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_with_big_struct x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_foo(ptr noundef %"arguments[0].instance") #0 {
entry:
  %instance = alloca ptr, align 8
  store ptr %"arguments[0].instance", ptr %instance, align 8
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %1 = alloca %struct.c_interoperability_My_struct, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %4, align 4
  %5 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %5, align 4
  %6 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 4
  store i32 0, ptr %6, align 4
  %7 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %7, ptr %instance, align 4
  call void @llvm.memcpy.p0.p0.i64(ptr align 4 %1, ptr align 4 %instance, i64 20, i1 false)
  call void @c_interoperability_foo(ptr noundef %1)
  ret void
}

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_c_interoperability_common("c_interoperability_function_with_big_struct.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_with_big_struct x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_foo(ptr noundef %"arguments[0].instance") #0 {
entry:
  %instance = alloca ptr, align 8
  store ptr %"arguments[0].instance", ptr %instance, align 8
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %1 = alloca %struct.c_interoperability_My_struct, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %4, align 4
  %5 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %5, align 4
  %6 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 4
  store i32 0, ptr %6, align 4
  %7 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %7, ptr %instance, align 4
  call void @llvm.memcpy.p0.p0.i64(ptr align 4 %1, ptr align 4 %instance, i64 20, i1 false)
  call void @c_interoperability_foo(ptr noundef %1)
  ret void
}

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_c_interoperability_common("c_interoperability_function_with_big_struct.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_with_empty_struct x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type {}

; Function Attrs: convergent
define private void @c_interoperability_foo() #0 {
entry:
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 1
  %instance = alloca %struct.c_interoperability_My_struct, align 1
  %1 = load %struct.c_interoperability_My_struct, ptr %0, align 1
  store %struct.c_interoperability_My_struct %1, ptr %instance, align 1
  call void @c_interoperability_foo()
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_with_empty_struct.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_with_empty_struct x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { [4 x i8] }

; Function Attrs: convergent
define private void @c_interoperability_foo(i32 noundef %"arguments[0].instance") #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 1
  %1 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 %"arguments[0].instance", ptr %1, align 1
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 1
  %instance = alloca %struct.c_interoperability_My_struct, align 1
  %1 = load %struct.c_interoperability_My_struct, ptr %0, align 1
  store %struct.c_interoperability_My_struct %1, ptr %instance, align 1
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %instance, i32 0, i32 0
  %3 = load i32, ptr %2, align 1
  call void @c_interoperability_foo(i32 noundef %3)
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_with_empty_struct.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_with_int_arguments x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private void @c_interoperability_foo(i32 noundef %"arguments[0].a", i32 noundef %"arguments[1].b") #0 {
entry:
  %a = alloca i32, align 4
  %b = alloca i32, align 4
  store i32 %"arguments[0].a", ptr %a, align 4
  store i32 %"arguments[1].b", ptr %b, align 4
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  call void @c_interoperability_foo(i32 noundef 0, i32 noundef 0)
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_with_int_arguments.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_with_int_arguments x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private void @c_interoperability_foo(i32 noundef %"arguments[0].a", i32 noundef %"arguments[1].b") #0 {
entry:
  %a = alloca i32, align 4
  %b = alloca i32, align 4
  store i32 %"arguments[0].a", ptr %a, align 4
  store i32 %"arguments[1].b", ptr %b, align 4
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  call void @c_interoperability_foo(i32 noundef 0, i32 noundef 0)
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_with_int_arguments.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_with_pointer x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private void @c_interoperability_foo(ptr noundef %"arguments[0].value") #0 {
entry:
  %value = alloca ptr, align 8
  store ptr %"arguments[0].value", ptr %value, align 8
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  call void @c_interoperability_foo(ptr noundef null)
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_with_pointer.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_with_pointer x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
; Function Attrs: convergent
define private void @c_interoperability_foo(ptr noundef %"arguments[0].value") #0 {
entry:
  %value = alloca ptr, align 8
  store ptr %"arguments[0].value", ptr %value, align 8
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  call void @c_interoperability_foo(ptr noundef null)
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_with_pointer.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
  
  TEST_CASE("C Interoperability - function_with_small_struct x86_64-pc-linux-gnu", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_foo(i64 %"arguments[0].instance_0", i64 %"arguments[0].instance_1") #0 {
entry:
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %0 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 0
  store i64 %"arguments[0].instance_0", ptr %0, align 4
  %1 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 1
  store i64 %"arguments[0].instance_1", ptr %1, align 4
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %1 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %1, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %4, align 4
  %5 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %5, ptr %instance, align 4
  %6 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 0
  %7 = load i64, ptr %6, align 4
  %8 = getelementptr inbounds { i64, i64 }, ptr %instance, i32 0, i32 1
  %9 = load i64, ptr %8, align 4
  call void @c_interoperability_foo(i64 %7, i64 %9)
  ret void
}

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
)";

    test_c_interoperability_common("c_interoperability_function_with_small_struct.hltxt", "x86_64-pc-linux-gnu", expected_llvm_ir);
  }

  TEST_CASE("C Interoperability - function_with_small_struct x86_64-pc-windows-msvc", "[LLVM_IR]")
  {
    char const* const expected_llvm_ir = R"(
%struct.c_interoperability_My_struct = type { i32, i32, i32, i32 }

; Function Attrs: convergent
define private void @c_interoperability_foo(ptr noundef %"arguments[0].instance") #0 {
entry:
  %instance = alloca ptr, align 8
  store ptr %"arguments[0].instance", ptr %instance, align 8
  ret void
}

; Function Attrs: convergent
define private void @c_interoperability_run() #0 {
entry:
  %0 = alloca %struct.c_interoperability_My_struct, align 4
  %instance = alloca %struct.c_interoperability_My_struct, align 4
  %1 = alloca %struct.c_interoperability_My_struct, align 4
  %2 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 0
  store i32 0, ptr %2, align 4
  %3 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 1
  store i32 0, ptr %3, align 4
  %4 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 2
  store i32 0, ptr %4, align 4
  %5 = getelementptr inbounds %struct.c_interoperability_My_struct, ptr %0, i32 0, i32 3
  store i32 0, ptr %5, align 4
  %6 = load %struct.c_interoperability_My_struct, ptr %0, align 4
  store %struct.c_interoperability_My_struct %6, ptr %instance, align 4
  call void @llvm.memcpy.p0.p0.i64(ptr align 4 %1, ptr align 4 %instance, i64 16, i1 false)
  call void @c_interoperability_foo(ptr noundef %1)
  ret void
}

; Function Attrs: nocallback nofree nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias nocapture writeonly, ptr noalias nocapture readonly, i64, i1 immarg) #1

attributes #0 = { convergent "no-trapping-math"="true" "stack-protector-buffer-size"="0" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }
attributes #1 = { nocallback nofree nounwind willreturn memory(argmem: readwrite) }
)";

    test_c_interoperability_common("c_interoperability_function_with_small_struct.hltxt", "x86_64-pc-windows-msvc", expected_llvm_ir);
  }
}
