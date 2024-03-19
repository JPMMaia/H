#include <cstdio>
#include <filesystem>
#include <memory_resource>
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

  TEST_CASE("Compile Assignments")
  {
    char const* const input_file = "assignment_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define void @integer_operations(i32 %other_signed_integer, i32 %other_unsigned_integer) {
entry:
  %my_signed_integer = alloca i32, align 4
  store i32 1, ptr %my_signed_integer, align 4
  %my_unsigned_integer = alloca i32, align 4
  store i32 1, ptr %my_unsigned_integer, align 4
  store i32 2, ptr %my_signed_integer, align 4
  store i32 2, ptr %my_unsigned_integer, align 4
  %0 = load i32, ptr %my_signed_integer, align 4
  %1 = add i32 %0, %other_signed_integer
  store i32 %1, ptr %my_signed_integer, align 4
  %2 = load i32, ptr %my_signed_integer, align 4
  %3 = sub i32 %2, %other_signed_integer
  store i32 %3, ptr %my_signed_integer, align 4
  %4 = load i32, ptr %my_signed_integer, align 4
  %5 = mul i32 %4, %other_signed_integer
  store i32 %5, ptr %my_signed_integer, align 4
  %6 = load i32, ptr %my_signed_integer, align 4
  %7 = sdiv i32 %6, %other_signed_integer
  store i32 %7, ptr %my_signed_integer, align 4
  %8 = load i32, ptr %my_unsigned_integer, align 4
  %9 = udiv i32 %8, %other_unsigned_integer
  store i32 %9, ptr %my_unsigned_integer, align 4
  %10 = load i32, ptr %my_signed_integer, align 4
  %11 = srem i32 %10, %other_signed_integer
  store i32 %11, ptr %my_signed_integer, align 4
  %12 = load i32, ptr %my_unsigned_integer, align 4
  %13 = urem i32 %12, %other_unsigned_integer
  store i32 %13, ptr %my_unsigned_integer, align 4
  %14 = load i32, ptr %my_signed_integer, align 4
  %15 = and i32 %14, %other_signed_integer
  store i32 %15, ptr %my_signed_integer, align 4
  %16 = load i32, ptr %my_signed_integer, align 4
  %17 = or i32 %16, %other_signed_integer
  store i32 %17, ptr %my_signed_integer, align 4
  %18 = load i32, ptr %my_signed_integer, align 4
  %19 = xor i32 %18, %other_signed_integer
  store i32 %19, ptr %my_signed_integer, align 4
  %20 = load i32, ptr %my_signed_integer, align 4
  %21 = shl i32 %20, %other_signed_integer
  store i32 %21, ptr %my_signed_integer, align 4
  %22 = load i32, ptr %my_signed_integer, align 4
  %23 = ashr i32 %22, %other_signed_integer
  store i32 %23, ptr %my_signed_integer, align 4
  %24 = load i32, ptr %my_unsigned_integer, align 4
  %25 = lshr i32 %24, %other_unsigned_integer
  store i32 %25, ptr %my_unsigned_integer, align 4
  ret void
}

define void @float32_operations(float %other_float) {
entry:
  %my_float = alloca float, align 4
  store float 1.000000e+00, ptr %my_float, align 4
  store i32 2, ptr %my_float, align 4
  %0 = load float, ptr %my_float, align 4
  %1 = fadd float %0, %other_float
  store float %1, ptr %my_float, align 4
  %2 = load float, ptr %my_float, align 4
  %3 = fsub float %2, %other_float
  store float %3, ptr %my_float, align 4
  %4 = load float, ptr %my_float, align 4
  %5 = fmul float %4, %other_float
  store float %5, ptr %my_float, align 4
  %6 = load float, ptr %my_float, align 4
  %7 = fdiv float %6, %other_float
  store float %7, ptr %my_float, align 4
  %8 = load float, ptr %my_float, align 4
  %9 = frem float %8, %other_float
  store float %9, ptr %my_float, align 4
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Binary Expressions Precedence")
  {
    char const* const input_file = "binary_expressions_precedence.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define void @foo(i32 %a, i32 %b, i32 %c) {
entry:
  %0 = mul i32 %b, %c
  %1 = add i32 %a, %0
  %case_0 = alloca i32, align 4
  store i32 %1, ptr %case_0, align 4
  %2 = mul i32 %a, %b
  %3 = add i32 %2, %c
  %case_1 = alloca i32, align 4
  store i32 %3, ptr %case_1, align 4
  %4 = sdiv i32 %a, %b
  %5 = mul i32 %4, %c
  %case_2 = alloca i32, align 4
  store i32 %5, ptr %case_2, align 4
  %6 = mul i32 %a, %b
  %7 = sdiv i32 %6, %c
  %case_3 = alloca i32, align 4
  store i32 %7, ptr %case_3, align 4
  %8 = call i32 @other_function()
  %9 = mul i32 %a, %8
  %10 = add i32 %9, %b
  %case_4 = alloca i32, align 4
  store i32 %10, ptr %case_4, align 4
  %11 = load i32, ptr %case_0, align 4
  %pointer_a = alloca ptr, align 8
  store ptr %case_0, ptr %pointer_a, align 8
  %12 = load i32, ptr %case_1, align 4
  %pointer_b = alloca ptr, align 8
  store ptr %case_1, ptr %pointer_b, align 8
  %13 = load ptr, ptr %pointer_b, align 8
  %14 = load ptr, ptr %13, align 8
  %15 = load i32, ptr %14, align 4
  %16 = load ptr, ptr %pointer_a, align 8
  %17 = load ptr, ptr %16, align 8
  %18 = load i32, ptr %17, align 4
  %19 = mul i32 %18, %15
  %case_7 = alloca i32, align 4
  store i32 %19, ptr %case_7, align 4
  %20 = add i32 %a, %b
  %21 = mul i32 %20, %c
  %case_8 = alloca i32, align 4
  store i32 %21, ptr %case_8, align 4
  %22 = add i32 %b, %c
  %23 = mul i32 %a, %22
  %case_9 = alloca i32, align 4
  store i32 %23, ptr %case_9, align 4
  %24 = icmp eq i32 %b, 1
  %25 = icmp eq i32 %a, 0
  %26 = and i1 %25, %24
  %case_10 = alloca i1, align 1
  store i1 %26, ptr %case_10, align 1
  %27 = and i32 %b, %a
  %28 = and i32 %a, %b
  %29 = icmp eq i32 %28, %27
  %case_11 = alloca i1, align 1
  store i1 %29, ptr %case_11, align 1
  %30 = icmp slt i32 %b, %c
  %31 = icmp slt i32 %a, %b
  %32 = and i1 %31, %30
  %case_12 = alloca i1, align 1
  store i1 %32, ptr %case_12, align 1
  %33 = add i32 %b, %c
  %34 = add i32 %a, %b
  %35 = icmp eq i32 %34, %33
  %case_13 = alloca i1, align 1
  store i1 %35, ptr %case_13, align 1
  %36 = sub i32 0, %b
  %37 = sub i32 0, %a
  %38 = add i32 %37, %36
  %case_14 = alloca i32, align 4
  store i32 %38, ptr %case_14, align 4
  ret void
}

define private i32 @other_function() {
entry:
  ret i32 1
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Binary Expressions")
  {
    char const* const input_file = "binary_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define void @integer_operations(i32 %first_signed_integer, i32 %second_signed_integer, i32 %first_unsigned_integer, i32 %second_unsigned_integer) {
entry:
  %0 = add i32 %first_signed_integer, %second_signed_integer
  %add = alloca i32, align 4
  store i32 %0, ptr %add, align 4
  %1 = sub i32 %first_signed_integer, %second_signed_integer
  %subtract = alloca i32, align 4
  store i32 %1, ptr %subtract, align 4
  %2 = mul i32 %first_signed_integer, %second_signed_integer
  %multiply = alloca i32, align 4
  store i32 %2, ptr %multiply, align 4
  %3 = sdiv i32 %first_signed_integer, %second_signed_integer
  %signed_divide = alloca i32, align 4
  store i32 %3, ptr %signed_divide, align 4
  %4 = udiv i32 %first_unsigned_integer, %second_unsigned_integer
  %unsigned_divide = alloca i32, align 4
  store i32 %4, ptr %unsigned_divide, align 4
  %5 = srem i32 %first_signed_integer, %second_signed_integer
  %signed_modulus = alloca i32, align 4
  store i32 %5, ptr %signed_modulus, align 4
  %6 = urem i32 %first_unsigned_integer, %second_unsigned_integer
  %unsigned_modulus = alloca i32, align 4
  store i32 %6, ptr %unsigned_modulus, align 4
  %7 = icmp eq i32 %first_signed_integer, %second_signed_integer
  %equal = alloca i1, align 1
  store i1 %7, ptr %equal, align 1
  %8 = icmp ne i32 %first_signed_integer, %second_signed_integer
  %not_equal = alloca i1, align 1
  store i1 %8, ptr %not_equal, align 1
  %9 = icmp slt i32 %first_signed_integer, %second_signed_integer
  %signed_less_than = alloca i1, align 1
  store i1 %9, ptr %signed_less_than, align 1
  %10 = icmp ult i32 %first_unsigned_integer, %second_unsigned_integer
  %unsigned_less_than = alloca i1, align 1
  store i1 %10, ptr %unsigned_less_than, align 1
  %11 = icmp sle i32 %first_signed_integer, %second_signed_integer
  %signed_less_than_or_equal_to = alloca i1, align 1
  store i1 %11, ptr %signed_less_than_or_equal_to, align 1
  %12 = icmp ule i32 %first_unsigned_integer, %second_unsigned_integer
  %unsigned_less_than_or_equal_to = alloca i1, align 1
  store i1 %12, ptr %unsigned_less_than_or_equal_to, align 1
  %13 = icmp sgt i32 %first_signed_integer, %second_signed_integer
  %signed_greater_than = alloca i1, align 1
  store i1 %13, ptr %signed_greater_than, align 1
  %14 = icmp ugt i32 %first_unsigned_integer, %second_unsigned_integer
  %unsigned_greater_than = alloca i1, align 1
  store i1 %14, ptr %unsigned_greater_than, align 1
  %15 = icmp sge i32 %first_signed_integer, %second_signed_integer
  %signed_greater_than_or_equal_to = alloca i1, align 1
  store i1 %15, ptr %signed_greater_than_or_equal_to, align 1
  %16 = icmp uge i32 %first_unsigned_integer, %second_unsigned_integer
  %unsigned_greater_than_or_equal_to = alloca i1, align 1
  store i1 %16, ptr %unsigned_greater_than_or_equal_to, align 1
  %17 = and i32 %first_signed_integer, %second_signed_integer
  %bitwise_and = alloca i32, align 4
  store i32 %17, ptr %bitwise_and, align 4
  %18 = or i32 %first_signed_integer, %second_signed_integer
  %bitwise_or = alloca i32, align 4
  store i32 %18, ptr %bitwise_or, align 4
  %19 = xor i32 %first_signed_integer, %second_signed_integer
  %bitwise_xor = alloca i32, align 4
  store i32 %19, ptr %bitwise_xor, align 4
  %20 = shl i32 %first_signed_integer, %second_signed_integer
  %bit_shift_left = alloca i32, align 4
  store i32 %20, ptr %bit_shift_left, align 4
  %21 = ashr i32 %first_signed_integer, %second_signed_integer
  %signed_bit_shift_right = alloca i32, align 4
  store i32 %21, ptr %signed_bit_shift_right, align 4
  %22 = lshr i32 %first_unsigned_integer, %second_unsigned_integer
  %unsigned_bit_shift_right = alloca i32, align 4
  store i32 %22, ptr %unsigned_bit_shift_right, align 4
  ret void
}

define void @boolean_operations(i1 %first_boolean, i1 %second_boolean) {
entry:
  %0 = and i1 %first_boolean, %second_boolean
  %logical_and = alloca i1, align 1
  store i1 %0, ptr %logical_and, align 1
  %1 = or i1 %first_boolean, %second_boolean
  %logical_or = alloca i1, align 1
  store i1 %1, ptr %logical_or, align 1
  ret void
}

define void @float32_operations(float %first_float, float %second_float) {
entry:
  %0 = fadd float %first_float, %second_float
  %add = alloca float, align 4
  store float %0, ptr %add, align 4
  %1 = fsub float %first_float, %second_float
  %subtract = alloca float, align 4
  store float %1, ptr %subtract, align 4
  %2 = fmul float %first_float, %second_float
  %multiply = alloca float, align 4
  store float %2, ptr %multiply, align 4
  %3 = fdiv float %first_float, %second_float
  %divide = alloca float, align 4
  store float %3, ptr %divide, align 4
  %4 = frem float %first_float, %second_float
  %modulus = alloca float, align 4
  store float %4, ptr %modulus, align 4
  %5 = fcmp oeq float %first_float, %second_float
  %equal = alloca i1, align 1
  store i1 %5, ptr %equal, align 1
  %6 = fcmp one float %first_float, %second_float
  %not_equal = alloca i1, align 1
  store i1 %6, ptr %not_equal, align 1
  %7 = fcmp olt float %first_float, %second_float
  %less_than = alloca i1, align 1
  store i1 %7, ptr %less_than, align 1
  %8 = fcmp ole float %first_float, %second_float
  %less_than_or_equal_to = alloca i1, align 1
  store i1 %8, ptr %less_than_or_equal_to, align 1
  %9 = fcmp ogt float %first_float, %second_float
  %greater_than = alloca i1, align 1
  store i1 %9, ptr %greater_than, align 1
  %10 = fcmp oge float %first_float, %second_float
  %greater_than_or_equal_to = alloca i1, align 1
  store i1 %10, ptr %greater_than_or_equal_to, align 1
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }


  TEST_CASE("Compile Block Expressions")
  {
    char const* const input_file = "block_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define void @run_blocks() {
entry:
  %a = alloca i32, align 4
  store i32 0, ptr %a, align 4
  %0 = load i32, ptr %a, align 4
  %b = alloca i32, align 4
  store i32 %0, ptr %b, align 4
  %1 = load i32, ptr %a, align 4
  %b1 = alloca i32, align 4
  store i32 %1, ptr %b1, align 4
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Booleans")
  {
    char const* const input_file = "booleans.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define void @foo() {
entry:
  %my_true_boolean = alloca i1, align 1
  store i1 true, ptr %my_true_boolean, align 1
  %my_false_boolean = alloca i1, align 1
  store i1 false, ptr %my_false_boolean, align 1
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Break Expressions")
  {
    char const* const input_file = "break_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "C.stdio", g_standard_library_path / "C_stdio.hl" }
    };

    char const* const expected_llvm_ir = R"(
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile For Loop Expressions")
  {
    char const* const input_file = "for_loop_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
      { "C.stdio", g_standard_library_path / "C_stdio.hl" }
    };

    char const* const expected_llvm_ir = R"(
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
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
  %0 = call i32 @puts(ptr @global_0)
  ret i32 0
}

declare i32 @puts(ptr)
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile If Expressions")
  {
    char const* const input_file = "if_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "C.stdio", g_standard_library_path / "C_stdio.hl" }
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
@global_9 = internal constant [9 x i8] c"negative\00"
@global_10 = internal constant [9 x i8] c"positive\00"
@global_11 = internal constant [5 x i8] c"zero\00"

define void @run_ifs(i32 %value) {
entry:
  %0 = icmp eq i32 %value, 0
  br i1 %0, label %if_s0_then, label %if_s1_after

if_s0_then:                                       ; preds = %entry
  call void @print_message(ptr @global_1)
  br label %if_s1_after

if_s1_after:                                      ; preds = %if_s0_then, %entry
  %1 = icmp slt i32 %value, 0
  br i1 %1, label %if_s0_then1, label %if_s1_else

if_s0_then1:                                      ; preds = %if_s1_after
  call void @print_message(ptr @global_2)
  br label %if_s2_after

if_s1_else:                                       ; preds = %if_s1_after
  call void @print_message(ptr @global_3)
  br label %if_s2_after

if_s2_after:                                      ; preds = %if_s1_else, %if_s0_then1
  %2 = icmp slt i32 %value, 0
  br i1 %2, label %if_s0_then2, label %if_s1_else3

if_s0_then2:                                      ; preds = %if_s2_after
  call void @print_message(ptr @global_4)
  br label %if_s3_after

if_s1_else3:                                      ; preds = %if_s2_after
  %3 = icmp sgt i32 %value, 0
  br i1 %3, label %if_s2_then, label %if_s3_after

if_s2_then:                                       ; preds = %if_s1_else3
  call void @print_message(ptr @global_5)
  br label %if_s3_after

if_s3_after:                                      ; preds = %if_s2_then, %if_s1_else3, %if_s0_then2
  %4 = icmp slt i32 %value, 0
  br i1 %4, label %if_s0_then4, label %if_s1_else5

if_s0_then4:                                      ; preds = %if_s3_after
  call void @print_message(ptr @global_6)
  br label %if_s4_after

if_s1_else5:                                      ; preds = %if_s3_after
  %5 = icmp sgt i32 %value, 0
  br i1 %5, label %if_s2_then6, label %if_s3_else

if_s2_then6:                                      ; preds = %if_s1_else5
  call void @print_message(ptr @global_7)
  br label %if_s4_after

if_s3_else:                                       ; preds = %if_s1_else5
  call void @print_message(ptr @global_8)
  br label %if_s4_after

if_s4_after:                                      ; preds = %if_s3_else, %if_s2_then6, %if_s0_then4
  %6 = icmp slt i32 %value, 0
  br i1 %6, label %if_s0_then7, label %if_s1_else8

if_s0_then7:                                      ; preds = %if_s4_after
  call void @print_message(ptr @global_9)
  br label %if_s4_after11

if_s1_else8:                                      ; preds = %if_s4_after
  %7 = icmp sgt i32 %value, 0
  br i1 %7, label %if_s2_then9, label %if_s3_else10

if_s2_then9:                                      ; preds = %if_s1_else8
  call void @print_message(ptr @global_10)
  br label %if_s4_after11

if_s3_else10:                                     ; preds = %if_s1_else8
  call void @print_message(ptr @global_11)
  br label %if_s4_after11

if_s4_after11:                                    ; preds = %if_s3_else10, %if_s2_then9, %if_s0_then7
  ret void
}

define private void @print_message(ptr %message) {
entry:
  %0 = call i32 (ptr, ...) @printf(ptr @global_0, ptr %message)
  ret void
}

declare i32 @printf(ptr, ...)
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

  TEST_CASE("Compile Pointers")
  {
    char const* const input_file = "pointers.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define void @pointers() {
entry:
  %a = alloca i32, align 4
  store i32 1, ptr %a, align 4
  %0 = load i32, ptr %a, align 4
  %pointer_a = alloca ptr, align 8
  store ptr %a, ptr %pointer_a, align 8
  %1 = load ptr, ptr %pointer_a, align 8
  %2 = load ptr, ptr %1, align 8
  %3 = load i32, ptr %2, align 4
  %dereferenced_a = alloca i32, align 4
  store i32 %3, ptr %dereferenced_a, align 4
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Switch Expressions")
  {
    char const* const input_file = "switch_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Ternary Condition Expressions")
  {
    char const* const input_file = "ternary_condition_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Unary Expressions")
  {
    char const* const input_file = "unary_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define void @unary_operations(i32 %my_integer, i1 %my_boolean) {
entry:
  %0 = xor i1 %my_boolean, true
  %not_variable = alloca i1, align 1
  store i1 %0, ptr %not_variable, align 1
  %1 = xor i32 %my_integer, -1
  %bitwise_not_variable = alloca i32, align 4
  store i32 %1, ptr %bitwise_not_variable, align 4
  %2 = sub i32 0, %my_integer
  %minus_variable = alloca i32, align 4
  store i32 %2, ptr %minus_variable, align 4
  %my_mutable_integer = alloca i32, align 4
  store i32 1, ptr %my_mutable_integer, align 4
  %3 = load i32, ptr %my_mutable_integer, align 4
  %4 = add i32 %3, 1
  store i32 %4, ptr %my_mutable_integer, align 4
  %pre_increment_variable = alloca i32, align 4
  store i32 %4, ptr %pre_increment_variable, align 4
  %5 = load i32, ptr %my_mutable_integer, align 4
  %6 = add i32 %5, 1
  store i32 %6, ptr %my_mutable_integer, align 4
  %post_increment_variable = alloca i32, align 4
  store i32 %5, ptr %post_increment_variable, align 4
  %7 = load i32, ptr %my_mutable_integer, align 4
  %8 = sub i32 %7, 1
  store i32 %8, ptr %my_mutable_integer, align 4
  %pre_decrement_variable = alloca i32, align 4
  store i32 %8, ptr %pre_decrement_variable, align 4
  %9 = load i32, ptr %my_mutable_integer, align 4
  %10 = sub i32 %9, 1
  store i32 %10, ptr %my_mutable_integer, align 4
  %post_decrement_variable = alloca i32, align 4
  store i32 %9, ptr %post_decrement_variable, align 4
  %11 = load i32, ptr %my_mutable_integer, align 4
  %address_of_variable = alloca ptr, align 8
  store ptr %my_mutable_integer, ptr %address_of_variable, align 8
  %12 = load ptr, ptr %address_of_variable, align 8
  %13 = load ptr, ptr %12, align 8
  %14 = load i32, ptr %13, align 4
  %indirection_variable = alloca i32, align 4
  store i32 %14, ptr %indirection_variable, align 4
  ret void
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

  TEST_CASE("Compile While Loop Expressions")
  {
    char const* const input_file = "while_loop_expressions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "C.stdio", g_standard_library_path / "C_stdio.hl" }
    };

    char const* const expected_llvm_ir = R"(
@global_0 = internal constant [3 x i8] c"%d\00"

define void @run_while_loops(i32 %size) {
entry:
  %index = alloca i32, align 4
  store i32 0, ptr %index, align 4
  br label %while_loop_condition

while_loop_condition:                             ; preds = %while_loop_then, %entry
  %0 = load i32, ptr %index, align 4
  %1 = icmp slt i32 %0, %size
  br i1 %1, label %while_loop_then, label %while_loop_after

while_loop_then:                                  ; preds = %while_loop_condition
  %2 = load i32, ptr %index, align 4
  call void @print_integer(i32 %2)
  %3 = load i32, ptr %index, align 4
  %4 = add i32 %3, 1
  store i32 %4, ptr %index, align 4
  br label %while_loop_condition

while_loop_after:                                 ; preds = %while_loop_condition
  %index1 = alloca i32, align 4
  store i32 0, ptr %index1, align 4
  br label %while_loop_condition2

while_loop_condition2:                            ; preds = %if_s1_after6, %if_s0_then, %while_loop_after
  %5 = load i32, ptr %index1, align 4
  %6 = icmp slt i32 %5, %size
  br i1 %6, label %while_loop_then3, label %while_loop_after4

while_loop_then3:                                 ; preds = %while_loop_condition2
  %7 = load i32, ptr %index1, align 4
  %8 = srem i32 %7, 2
  %9 = icmp eq i32 %8, 0
  br i1 %9, label %if_s0_then, label %if_s1_after

while_loop_after4:                                ; preds = %if_s0_then5, %while_loop_condition2
  ret void

if_s0_then:                                       ; preds = %while_loop_then3
  br label %while_loop_condition2

if_s1_after:                                      ; preds = %while_loop_then3
  %10 = load i32, ptr %index1, align 4
  %11 = icmp sgt i32 %10, 5
  br i1 %11, label %if_s0_then5, label %if_s1_after6

if_s0_then5:                                      ; preds = %if_s1_after
  br label %while_loop_after4

if_s1_after6:                                     ; preds = %if_s1_after
  %12 = load i32, ptr %index1, align 4
  call void @print_integer(i32 %12)
  %13 = load i32, ptr %index1, align 4
  %14 = add i32 %13, 1
  store i32 %14, ptr %index1, align 4
  br label %while_loop_condition2
}

define private void @print_integer(i32 %value) {
entry:
  %0 = call i32 (ptr, ...) @printf(ptr @global_0, i32 %value)
  ret void
}

declare i32 @printf(ptr, ...)
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }
}
