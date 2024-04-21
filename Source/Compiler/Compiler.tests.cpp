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
import h.common;
import h.compiler;
import h.compiler.common;
import h.json_serializer;
import h.json_serializer.operators;

using h::json::operators::operator<<;

#include <catch2/catch_all.hpp>

namespace h
{
  static std::filesystem::path const g_test_files_path = std::filesystem::path{ TEST_FILES_PATH };
  static std::filesystem::path const g_standard_library_path = std::filesystem::path{ C_STANDARD_LIBRARY_PATH };

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
    std::optional<std::pmr::string> const json_data = h::common::get_file_contents(g_test_files_path / input_file);
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
define void @integer_operations(i32 %arguments.other_signed_integer, i32 %arguments.other_unsigned_integer) {
entry:
  %other_signed_integer = alloca i32, align 4
  store i32 %arguments.other_signed_integer, ptr %other_signed_integer, align 4
  %other_unsigned_integer = alloca i32, align 4
  store i32 %arguments.other_unsigned_integer, ptr %other_unsigned_integer, align 4
  %my_signed_integer = alloca i32, align 4
  store i32 1, ptr %my_signed_integer, align 4
  %my_unsigned_integer = alloca i32, align 4
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

define void @float32_operations(float %arguments.other_float) {
entry:
  %other_float = alloca float, align 4
  store float %arguments.other_float, ptr %other_float, align 4
  %my_float = alloca float, align 4
  store float 1.000000e+00, ptr %my_float, align 4
  store i32 2, ptr %my_float, align 4
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
define void @foo(i32 %arguments.a, i32 %arguments.b, i32 %arguments.c) {
entry:
  %a = alloca i32, align 4
  store i32 %arguments.a, ptr %a, align 4
  %b = alloca i32, align 4
  store i32 %arguments.b, ptr %b, align 4
  %c = alloca i32, align 4
  store i32 %arguments.c, ptr %c, align 4
  %0 = load i32, ptr %a, align 4
  %1 = load i32, ptr %b, align 4
  %2 = load i32, ptr %c, align 4
  %3 = mul i32 %1, %2
  %4 = add i32 %0, %3
  %case_0 = alloca i32, align 4
  store i32 %4, ptr %case_0, align 4
  %5 = load i32, ptr %a, align 4
  %6 = load i32, ptr %b, align 4
  %7 = mul i32 %5, %6
  %8 = load i32, ptr %c, align 4
  %9 = add i32 %7, %8
  %case_1 = alloca i32, align 4
  store i32 %9, ptr %case_1, align 4
  %10 = load i32, ptr %a, align 4
  %11 = load i32, ptr %b, align 4
  %12 = sdiv i32 %10, %11
  %13 = load i32, ptr %c, align 4
  %14 = mul i32 %12, %13
  %case_2 = alloca i32, align 4
  store i32 %14, ptr %case_2, align 4
  %15 = load i32, ptr %a, align 4
  %16 = load i32, ptr %b, align 4
  %17 = mul i32 %15, %16
  %18 = load i32, ptr %c, align 4
  %19 = sdiv i32 %17, %18
  %case_3 = alloca i32, align 4
  store i32 %19, ptr %case_3, align 4
  %20 = load i32, ptr %a, align 4
  %21 = call i32 @other_function()
  %22 = mul i32 %20, %21
  %23 = load i32, ptr %b, align 4
  %24 = add i32 %22, %23
  %case_4 = alloca i32, align 4
  store i32 %24, ptr %case_4, align 4
  %pointer_a = alloca ptr, align 8
  store ptr %case_0, ptr %pointer_a, align 8
  %pointer_b = alloca ptr, align 8
  store ptr %case_1, ptr %pointer_b, align 8
  %25 = load ptr, ptr %pointer_a, align 8
  %26 = load i32, ptr %25, align 4
  %27 = load ptr, ptr %pointer_b, align 8
  %28 = load i32, ptr %27, align 4
  %29 = mul i32 %26, %28
  %case_7 = alloca i32, align 4
  store i32 %29, ptr %case_7, align 4
  %30 = load i32, ptr %a, align 4
  %31 = load i32, ptr %b, align 4
  %32 = add i32 %30, %31
  %33 = load i32, ptr %c, align 4
  %34 = mul i32 %32, %33
  %case_8 = alloca i32, align 4
  store i32 %34, ptr %case_8, align 4
  %35 = load i32, ptr %a, align 4
  %36 = load i32, ptr %b, align 4
  %37 = load i32, ptr %c, align 4
  %38 = add i32 %36, %37
  %39 = mul i32 %35, %38
  %case_9 = alloca i32, align 4
  store i32 %39, ptr %case_9, align 4
  %40 = load i32, ptr %a, align 4
  %41 = icmp eq i32 %40, 0
  %42 = load i32, ptr %b, align 4
  %43 = icmp eq i32 %42, 1
  %44 = and i1 %41, %43
  %case_10 = alloca i1, align 1
  store i1 %44, ptr %case_10, align 1
  %45 = load i32, ptr %a, align 4
  %46 = load i32, ptr %b, align 4
  %47 = and i32 %45, %46
  %48 = load i32, ptr %b, align 4
  %49 = load i32, ptr %a, align 4
  %50 = and i32 %48, %49
  %51 = icmp eq i32 %47, %50
  %case_11 = alloca i1, align 1
  store i1 %51, ptr %case_11, align 1
  %52 = load i32, ptr %a, align 4
  %53 = load i32, ptr %b, align 4
  %54 = icmp slt i32 %52, %53
  %55 = load i32, ptr %b, align 4
  %56 = load i32, ptr %c, align 4
  %57 = icmp slt i32 %55, %56
  %58 = and i1 %54, %57
  %case_12 = alloca i1, align 1
  store i1 %58, ptr %case_12, align 1
  %59 = load i32, ptr %a, align 4
  %60 = load i32, ptr %b, align 4
  %61 = add i32 %59, %60
  %62 = load i32, ptr %b, align 4
  %63 = load i32, ptr %c, align 4
  %64 = add i32 %62, %63
  %65 = icmp eq i32 %61, %64
  %case_13 = alloca i1, align 1
  store i1 %65, ptr %case_13, align 1
  %66 = load i32, ptr %a, align 4
  %67 = sub i32 0, %66
  %68 = load i32, ptr %b, align 4
  %69 = sub i32 0, %68
  %70 = add i32 %67, %69
  %case_14 = alloca i32, align 4
  store i32 %70, ptr %case_14, align 4
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
define void @integer_operations(i32 %arguments.first_signed_integer, i32 %arguments.second_signed_integer, i32 %arguments.first_unsigned_integer, i32 %arguments.second_unsigned_integer) {
entry:
  %first_signed_integer = alloca i32, align 4
  store i32 %arguments.first_signed_integer, ptr %first_signed_integer, align 4
  %second_signed_integer = alloca i32, align 4
  store i32 %arguments.second_signed_integer, ptr %second_signed_integer, align 4
  %first_unsigned_integer = alloca i32, align 4
  store i32 %arguments.first_unsigned_integer, ptr %first_unsigned_integer, align 4
  %second_unsigned_integer = alloca i32, align 4
  store i32 %arguments.second_unsigned_integer, ptr %second_unsigned_integer, align 4
  %0 = load i32, ptr %first_signed_integer, align 4
  %1 = load i32, ptr %second_signed_integer, align 4
  %2 = add i32 %0, %1
  %add = alloca i32, align 4
  store i32 %2, ptr %add, align 4
  %3 = load i32, ptr %first_signed_integer, align 4
  %4 = load i32, ptr %second_signed_integer, align 4
  %5 = sub i32 %3, %4
  %subtract = alloca i32, align 4
  store i32 %5, ptr %subtract, align 4
  %6 = load i32, ptr %first_signed_integer, align 4
  %7 = load i32, ptr %second_signed_integer, align 4
  %8 = mul i32 %6, %7
  %multiply = alloca i32, align 4
  store i32 %8, ptr %multiply, align 4
  %9 = load i32, ptr %first_signed_integer, align 4
  %10 = load i32, ptr %second_signed_integer, align 4
  %11 = sdiv i32 %9, %10
  %signed_divide = alloca i32, align 4
  store i32 %11, ptr %signed_divide, align 4
  %12 = load i32, ptr %first_unsigned_integer, align 4
  %13 = load i32, ptr %second_unsigned_integer, align 4
  %14 = udiv i32 %12, %13
  %unsigned_divide = alloca i32, align 4
  store i32 %14, ptr %unsigned_divide, align 4
  %15 = load i32, ptr %first_signed_integer, align 4
  %16 = load i32, ptr %second_signed_integer, align 4
  %17 = srem i32 %15, %16
  %signed_modulus = alloca i32, align 4
  store i32 %17, ptr %signed_modulus, align 4
  %18 = load i32, ptr %first_unsigned_integer, align 4
  %19 = load i32, ptr %second_unsigned_integer, align 4
  %20 = urem i32 %18, %19
  %unsigned_modulus = alloca i32, align 4
  store i32 %20, ptr %unsigned_modulus, align 4
  %21 = load i32, ptr %first_signed_integer, align 4
  %22 = load i32, ptr %second_signed_integer, align 4
  %23 = icmp eq i32 %21, %22
  %equal = alloca i1, align 1
  store i1 %23, ptr %equal, align 1
  %24 = load i32, ptr %first_signed_integer, align 4
  %25 = load i32, ptr %second_signed_integer, align 4
  %26 = icmp ne i32 %24, %25
  %not_equal = alloca i1, align 1
  store i1 %26, ptr %not_equal, align 1
  %27 = load i32, ptr %first_signed_integer, align 4
  %28 = load i32, ptr %second_signed_integer, align 4
  %29 = icmp slt i32 %27, %28
  %signed_less_than = alloca i1, align 1
  store i1 %29, ptr %signed_less_than, align 1
  %30 = load i32, ptr %first_unsigned_integer, align 4
  %31 = load i32, ptr %second_unsigned_integer, align 4
  %32 = icmp ult i32 %30, %31
  %unsigned_less_than = alloca i1, align 1
  store i1 %32, ptr %unsigned_less_than, align 1
  %33 = load i32, ptr %first_signed_integer, align 4
  %34 = load i32, ptr %second_signed_integer, align 4
  %35 = icmp sle i32 %33, %34
  %signed_less_than_or_equal_to = alloca i1, align 1
  store i1 %35, ptr %signed_less_than_or_equal_to, align 1
  %36 = load i32, ptr %first_unsigned_integer, align 4
  %37 = load i32, ptr %second_unsigned_integer, align 4
  %38 = icmp ule i32 %36, %37
  %unsigned_less_than_or_equal_to = alloca i1, align 1
  store i1 %38, ptr %unsigned_less_than_or_equal_to, align 1
  %39 = load i32, ptr %first_signed_integer, align 4
  %40 = load i32, ptr %second_signed_integer, align 4
  %41 = icmp sgt i32 %39, %40
  %signed_greater_than = alloca i1, align 1
  store i1 %41, ptr %signed_greater_than, align 1
  %42 = load i32, ptr %first_unsigned_integer, align 4
  %43 = load i32, ptr %second_unsigned_integer, align 4
  %44 = icmp ugt i32 %42, %43
  %unsigned_greater_than = alloca i1, align 1
  store i1 %44, ptr %unsigned_greater_than, align 1
  %45 = load i32, ptr %first_signed_integer, align 4
  %46 = load i32, ptr %second_signed_integer, align 4
  %47 = icmp sge i32 %45, %46
  %signed_greater_than_or_equal_to = alloca i1, align 1
  store i1 %47, ptr %signed_greater_than_or_equal_to, align 1
  %48 = load i32, ptr %first_unsigned_integer, align 4
  %49 = load i32, ptr %second_unsigned_integer, align 4
  %50 = icmp uge i32 %48, %49
  %unsigned_greater_than_or_equal_to = alloca i1, align 1
  store i1 %50, ptr %unsigned_greater_than_or_equal_to, align 1
  %51 = load i32, ptr %first_signed_integer, align 4
  %52 = load i32, ptr %second_signed_integer, align 4
  %53 = and i32 %51, %52
  %bitwise_and = alloca i32, align 4
  store i32 %53, ptr %bitwise_and, align 4
  %54 = load i32, ptr %first_signed_integer, align 4
  %55 = load i32, ptr %second_signed_integer, align 4
  %56 = or i32 %54, %55
  %bitwise_or = alloca i32, align 4
  store i32 %56, ptr %bitwise_or, align 4
  %57 = load i32, ptr %first_signed_integer, align 4
  %58 = load i32, ptr %second_signed_integer, align 4
  %59 = xor i32 %57, %58
  %bitwise_xor = alloca i32, align 4
  store i32 %59, ptr %bitwise_xor, align 4
  %60 = load i32, ptr %first_signed_integer, align 4
  %61 = load i32, ptr %second_signed_integer, align 4
  %62 = shl i32 %60, %61
  %bit_shift_left = alloca i32, align 4
  store i32 %62, ptr %bit_shift_left, align 4
  %63 = load i32, ptr %first_signed_integer, align 4
  %64 = load i32, ptr %second_signed_integer, align 4
  %65 = ashr i32 %63, %64
  %signed_bit_shift_right = alloca i32, align 4
  store i32 %65, ptr %signed_bit_shift_right, align 4
  %66 = load i32, ptr %first_unsigned_integer, align 4
  %67 = load i32, ptr %second_unsigned_integer, align 4
  %68 = lshr i32 %66, %67
  %unsigned_bit_shift_right = alloca i32, align 4
  store i32 %68, ptr %unsigned_bit_shift_right, align 4
  ret void
}

define void @boolean_operations(i1 %arguments.first_boolean, i1 %arguments.second_boolean) {
entry:
  %first_boolean = alloca i1, align 1
  store i1 %arguments.first_boolean, ptr %first_boolean, align 1
  %second_boolean = alloca i1, align 1
  store i1 %arguments.second_boolean, ptr %second_boolean, align 1
  %0 = load i1, ptr %first_boolean, align 1
  %1 = load i1, ptr %second_boolean, align 1
  %2 = icmp eq i1 %0, %1
  %equal = alloca i1, align 1
  store i1 %2, ptr %equal, align 1
  %3 = load i1, ptr %first_boolean, align 1
  %4 = load i1, ptr %second_boolean, align 1
  %5 = icmp ne i1 %3, %4
  %not_equal = alloca i1, align 1
  store i1 %5, ptr %not_equal, align 1
  %6 = load i1, ptr %first_boolean, align 1
  %7 = load i1, ptr %second_boolean, align 1
  %8 = and i1 %6, %7
  %logical_and = alloca i1, align 1
  store i1 %8, ptr %logical_and, align 1
  %9 = load i1, ptr %first_boolean, align 1
  %10 = load i1, ptr %second_boolean, align 1
  %11 = or i1 %9, %10
  %logical_or = alloca i1, align 1
  store i1 %11, ptr %logical_or, align 1
  ret void
}

define void @float32_operations(float %arguments.first_float, float %arguments.second_float) {
entry:
  %first_float = alloca float, align 4
  store float %arguments.first_float, ptr %first_float, align 4
  %second_float = alloca float, align 4
  store float %arguments.second_float, ptr %second_float, align 4
  %0 = load float, ptr %first_float, align 4
  %1 = load float, ptr %second_float, align 4
  %2 = fadd float %0, %1
  %add = alloca float, align 4
  store float %2, ptr %add, align 4
  %3 = load float, ptr %first_float, align 4
  %4 = load float, ptr %second_float, align 4
  %5 = fsub float %3, %4
  %subtract = alloca float, align 4
  store float %5, ptr %subtract, align 4
  %6 = load float, ptr %first_float, align 4
  %7 = load float, ptr %second_float, align 4
  %8 = fmul float %6, %7
  %multiply = alloca float, align 4
  store float %8, ptr %multiply, align 4
  %9 = load float, ptr %first_float, align 4
  %10 = load float, ptr %second_float, align 4
  %11 = fdiv float %9, %10
  %divide = alloca float, align 4
  store float %11, ptr %divide, align 4
  %12 = load float, ptr %first_float, align 4
  %13 = load float, ptr %second_float, align 4
  %14 = frem float %12, %13
  %modulus = alloca float, align 4
  store float %14, ptr %modulus, align 4
  %15 = load float, ptr %first_float, align 4
  %16 = load float, ptr %second_float, align 4
  %17 = fcmp oeq float %15, %16
  %equal = alloca i1, align 1
  store i1 %17, ptr %equal, align 1
  %18 = load float, ptr %first_float, align 4
  %19 = load float, ptr %second_float, align 4
  %20 = fcmp one float %18, %19
  %not_equal = alloca i1, align 1
  store i1 %20, ptr %not_equal, align 1
  %21 = load float, ptr %first_float, align 4
  %22 = load float, ptr %second_float, align 4
  %23 = fcmp olt float %21, %22
  %less_than = alloca i1, align 1
  store i1 %23, ptr %less_than, align 1
  %24 = load float, ptr %first_float, align 4
  %25 = load float, ptr %second_float, align 4
  %26 = fcmp ole float %24, %25
  %less_than_or_equal_to = alloca i1, align 1
  store i1 %26, ptr %less_than_or_equal_to, align 1
  %27 = load float, ptr %first_float, align 4
  %28 = load float, ptr %second_float, align 4
  %29 = fcmp ogt float %27, %28
  %greater_than = alloca i1, align 1
  store i1 %29, ptr %greater_than, align 1
  %30 = load float, ptr %first_float, align 4
  %31 = load float, ptr %second_float, align 4
  %32 = fcmp oge float %30, %31
  %greater_than_or_equal_to = alloca i1, align 1
  store i1 %32, ptr %greater_than_or_equal_to, align 1
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
@global_0 = internal constant [3 x i8] c"%d\00"

define void @run_breaks(i32 %arguments.size) {
entry:
  %size = alloca i32, align 4
  store i32 %arguments.size, ptr %size, align 4
  %index = alloca i32, align 4
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
  %index1 = alloca i32, align 4
  store i32 0, ptr %index1, align 4
  br label %for_loop_condition2

if_s0_then:                                       ; preds = %for_loop_then
  br label %for_loop_after

if_s1_after:                                      ; preds = %for_loop_then
  %7 = load i32, ptr %index, align 4
  call void @print_integer(i32 %7)
  br label %for_loop_update_index

for_loop_condition2:                              ; preds = %for_loop_update_index4, %for_loop_after
  %8 = load i32, ptr %size, align 4
  %9 = load i32, ptr %index1, align 4
  %10 = icmp slt i32 %9, %8
  br i1 %10, label %for_loop_then3, label %for_loop_after5

for_loop_then3:                                   ; preds = %for_loop_condition2
  %index_2 = alloca i32, align 4
  store i32 0, ptr %index_2, align 4
  br label %while_loop_condition

for_loop_update_index4:                           ; preds = %while_loop_after
  %11 = load i32, ptr %index1, align 4
  %12 = add i32 %11, 1
  store i32 %12, ptr %index1, align 4
  br label %for_loop_condition2

for_loop_after5:                                  ; preds = %for_loop_condition2
  %index8 = alloca i32, align 4
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
  call void @print_integer(i32 %18)
  br label %for_loop_update_index4

if_s0_then6:                                      ; preds = %while_loop_then
  br label %while_loop_after

if_s1_after7:                                     ; preds = %while_loop_then
  %19 = load i32, ptr %index_2, align 4
  call void @print_integer(i32 %19)
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
  %index_213 = alloca i32, align 4
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
  call void @print_integer(i32 %32)
  br label %for_loop_update_index11

if_s0_then17:                                     ; preds = %while_loop_then15
  br label %for_loop_after12

if_s1_after18:                                    ; preds = %while_loop_then15
  %33 = load i32, ptr %index_213, align 4
  call void @print_integer(i32 %33)
  %34 = load i32, ptr %index8, align 4
  %35 = add i32 %34, 1
  store i32 %35, ptr %index8, align 4
  br label %while_loop_condition14
}

define private void @print_integer(i32 %arguments.value) {
entry:
  %value = alloca i32, align 4
  store i32 %arguments.value, ptr %value, align 4
  %0 = load i32, ptr %value, align 4
  %1 = call i32 (ptr, ...) @printf(ptr @global_0, i32 %0)
  ret void
}

declare i32 @printf(ptr, ...)
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
@global_0 = internal constant [3 x i8] c"%d\00"

define void @run_for_loops() {
entry:
  %index = alloca i32, align 4
  store i32 0, ptr %index, align 4
  br label %for_loop_condition

for_loop_condition:                               ; preds = %for_loop_update_index, %entry
  %0 = load i32, ptr %index, align 4
  %1 = icmp slt i32 %0, 3
  br i1 %1, label %for_loop_then, label %for_loop_after

for_loop_then:                                    ; preds = %for_loop_condition
  %2 = load i32, ptr %index, align 4
  call void @print_integer(i32 %2)
  br label %for_loop_update_index

for_loop_update_index:                            ; preds = %for_loop_then
  %3 = load i32, ptr %index, align 4
  %4 = add i32 %3, 1
  store i32 %4, ptr %index, align 4
  br label %for_loop_condition

for_loop_after:                                   ; preds = %for_loop_condition
  %index1 = alloca i32, align 4
  store i32 0, ptr %index1, align 4
  br label %for_loop_condition2

for_loop_condition2:                              ; preds = %for_loop_update_index4, %for_loop_after
  %5 = load i32, ptr %index1, align 4
  %6 = icmp slt i32 %5, 4
  br i1 %6, label %for_loop_then3, label %for_loop_after5

for_loop_then3:                                   ; preds = %for_loop_condition2
  %7 = load i32, ptr %index1, align 4
  call void @print_integer(i32 %7)
  br label %for_loop_update_index4

for_loop_update_index4:                           ; preds = %for_loop_then3
  %8 = load i32, ptr %index1, align 4
  %9 = add i32 %8, 1
  store i32 %9, ptr %index1, align 4
  br label %for_loop_condition2

for_loop_after5:                                  ; preds = %for_loop_condition2
  %index6 = alloca i32, align 4
  store i32 4, ptr %index6, align 4
  br label %for_loop_condition7

for_loop_condition7:                              ; preds = %for_loop_update_index9, %for_loop_after5
  %10 = load i32, ptr %index6, align 4
  %11 = icmp sgt i32 %10, 0
  br i1 %11, label %for_loop_then8, label %for_loop_after10

for_loop_then8:                                   ; preds = %for_loop_condition7
  %12 = load i32, ptr %index6, align 4
  call void @print_integer(i32 %12)
  br label %for_loop_update_index9

for_loop_update_index9:                           ; preds = %for_loop_then8
  %13 = load i32, ptr %index6, align 4
  %14 = add i32 %13, -1
  store i32 %14, ptr %index6, align 4
  br label %for_loop_condition7

for_loop_after10:                                 ; preds = %for_loop_condition7
  %index11 = alloca i32, align 4
  store i32 4, ptr %index11, align 4
  br label %for_loop_condition12

for_loop_condition12:                             ; preds = %for_loop_update_index14, %for_loop_after10
  %15 = load i32, ptr %index11, align 4
  %16 = icmp sgt i32 %15, 0
  br i1 %16, label %for_loop_then13, label %for_loop_after15

for_loop_then13:                                  ; preds = %for_loop_condition12
  %17 = load i32, ptr %index11, align 4
  call void @print_integer(i32 %17)
  br label %for_loop_update_index14

for_loop_update_index14:                          ; preds = %for_loop_then13
  %18 = load i32, ptr %index11, align 4
  %19 = add i32 %18, -1
  store i32 %19, ptr %index11, align 4
  br label %for_loop_condition12

for_loop_after15:                                 ; preds = %for_loop_condition12
  ret void
}

define private void @print_integer(i32 %arguments.value) {
entry:
  %value = alloca i32, align 4
  store i32 %arguments.value, ptr %value, align 4
  %0 = load i32, ptr %value, align 4
  %1 = call i32 (ptr, ...) @printf(ptr @global_0, i32 %0)
  ret void
}

declare i32 @printf(ptr, ...)
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

define void @run_ifs(i32 %arguments.value) {
entry:
  %value = alloca i32, align 4
  store i32 %arguments.value, ptr %value, align 4
  %0 = load i32, ptr %value, align 4
  %1 = icmp eq i32 %0, 0
  br i1 %1, label %if_s0_then, label %if_s1_after

if_s0_then:                                       ; preds = %entry
  call void @print_message(ptr @global_1)
  br label %if_s1_after

if_s1_after:                                      ; preds = %if_s0_then, %entry
  %2 = load i32, ptr %value, align 4
  %3 = icmp slt i32 %2, 0
  br i1 %3, label %if_s0_then1, label %if_s1_else

if_s0_then1:                                      ; preds = %if_s1_after
  call void @print_message(ptr @global_2)
  br label %if_s2_after

if_s1_else:                                       ; preds = %if_s1_after
  call void @print_message(ptr @global_3)
  br label %if_s2_after

if_s2_after:                                      ; preds = %if_s1_else, %if_s0_then1
  %4 = load i32, ptr %value, align 4
  %5 = icmp slt i32 %4, 0
  br i1 %5, label %if_s0_then2, label %if_s1_else3

if_s0_then2:                                      ; preds = %if_s2_after
  call void @print_message(ptr @global_4)
  br label %if_s3_after

if_s1_else3:                                      ; preds = %if_s2_after
  %6 = load i32, ptr %value, align 4
  %7 = icmp sgt i32 %6, 0
  br i1 %7, label %if_s2_then, label %if_s3_after

if_s2_then:                                       ; preds = %if_s1_else3
  call void @print_message(ptr @global_5)
  br label %if_s3_after

if_s3_after:                                      ; preds = %if_s2_then, %if_s1_else3, %if_s0_then2
  %8 = load i32, ptr %value, align 4
  %9 = icmp slt i32 %8, 0
  br i1 %9, label %if_s0_then4, label %if_s1_else5

if_s0_then4:                                      ; preds = %if_s3_after
  call void @print_message(ptr @global_6)
  br label %if_s4_after

if_s1_else5:                                      ; preds = %if_s3_after
  %10 = load i32, ptr %value, align 4
  %11 = icmp sgt i32 %10, 0
  br i1 %11, label %if_s2_then6, label %if_s3_else

if_s2_then6:                                      ; preds = %if_s1_else5
  call void @print_message(ptr @global_7)
  br label %if_s4_after

if_s3_else:                                       ; preds = %if_s1_else5
  call void @print_message(ptr @global_8)
  br label %if_s4_after

if_s4_after:                                      ; preds = %if_s3_else, %if_s2_then6, %if_s0_then4
  ret void
}

define private void @print_message(ptr %arguments.message) {
entry:
  %message = alloca ptr, align 8
  store ptr %arguments.message, ptr %message, align 8
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
define i32 @do_casts(i32 %arguments.uint32_argument, i64 %arguments.uint64_argument, i32 %arguments.int32_argument, i64 %arguments.int64_argument, half %arguments.float16_argument, float %arguments.float32_argument, double %arguments.float64_argument) {
entry:
  %uint32_argument = alloca i32, align 4
  store i32 %arguments.uint32_argument, ptr %uint32_argument, align 4
  %uint64_argument = alloca i64, align 8
  store i64 %arguments.uint64_argument, ptr %uint64_argument, align 8
  %int32_argument = alloca i32, align 4
  store i32 %arguments.int32_argument, ptr %int32_argument, align 4
  %int64_argument = alloca i64, align 8
  store i64 %arguments.int64_argument, ptr %int64_argument, align 8
  %float16_argument = alloca half, align 2
  store half %arguments.float16_argument, ptr %float16_argument, align 2
  %float32_argument = alloca float, align 4
  store float %arguments.float32_argument, ptr %float32_argument, align 4
  %float64_argument = alloca double, align 8
  store double %arguments.float64_argument, ptr %float64_argument, align 8
  %0 = load i64, ptr %uint64_argument, align 8
  %1 = trunc i64 %0 to i32
  %u64_to_u32 = alloca i32, align 4
  store i32 %1, ptr %u64_to_u32, align 4
  %2 = load i64, ptr %uint64_argument, align 8
  %3 = trunc i64 %2 to i32
  %u64_to_i32 = alloca i32, align 4
  store i32 %3, ptr %u64_to_i32, align 4
  %4 = load i64, ptr %int64_argument, align 8
  %5 = trunc i64 %4 to i32
  %i64_to_u32 = alloca i32, align 4
  store i32 %5, ptr %i64_to_u32, align 4
  %6 = load i64, ptr %int64_argument, align 8
  %7 = trunc i64 %6 to i32
  %i64_to_i32 = alloca i32, align 4
  store i32 %7, ptr %i64_to_i32, align 4
  %8 = load i32, ptr %uint32_argument, align 4
  %9 = zext i32 %8 to i64
  %u32_to_u64 = alloca i64, align 8
  store i64 %9, ptr %u32_to_u64, align 8
  %10 = load i32, ptr %uint32_argument, align 4
  %11 = zext i32 %10 to i64
  %u32_to_i64 = alloca i64, align 8
  store i64 %11, ptr %u32_to_i64, align 8
  %12 = load i32, ptr %int32_argument, align 4
  %13 = zext i32 %12 to i64
  %i32_to_u64 = alloca i64, align 8
  store i64 %13, ptr %i32_to_u64, align 8
  %14 = load i32, ptr %int32_argument, align 4
  %15 = sext i32 %14 to i64
  %i32_to_i64 = alloca i64, align 8
  store i64 %15, ptr %i32_to_i64, align 8
  %16 = load i32, ptr %uint32_argument, align 4
  %17 = uitofp i32 %16 to float
  %u32_to_f32 = alloca float, align 4
  store float %17, ptr %u32_to_f32, align 4
  %18 = load i32, ptr %int32_argument, align 4
  %19 = sitofp i32 %18 to float
  %i32_to_f32 = alloca float, align 4
  store float %19, ptr %i32_to_f32, align 4
  %20 = load float, ptr %float32_argument, align 4
  %21 = fptoui float %20 to i32
  %f32_to_u32 = alloca i32, align 4
  store i32 %21, ptr %f32_to_u32, align 4
  %22 = load float, ptr %float32_argument, align 4
  %23 = fptosi float %22 to i32
  %f32_to_i32 = alloca i32, align 4
  store i32 %23, ptr %f32_to_i32, align 4
  %24 = load half, ptr %float16_argument, align 2
  %25 = fpext half %24 to float
  %f16_to_f32 = alloca float, align 4
  store float %25, ptr %f16_to_f32, align 4
  %26 = load float, ptr %float32_argument, align 4
  %27 = fpext float %26 to double
  %f32_to_f64 = alloca double, align 8
  store double %27, ptr %f32_to_f64, align 8
  %28 = load double, ptr %float64_argument, align 8
  %29 = fptrunc double %28 to float
  %f64_to_f32 = alloca float, align 4
  store float %29, ptr %f64_to_f32, align 4
  %30 = load float, ptr %float32_argument, align 4
  %31 = fptrunc float %30 to half
  %f32_to_f16 = alloca half, align 2
  store half %31, ptr %f32_to_f16, align 2
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
  %pointer_a = alloca ptr, align 8
  store ptr %a, ptr %pointer_a, align 8
  %0 = load ptr, ptr %pointer_a, align 8
  %1 = load i32, ptr %0, align 4
  %dereferenced_a = alloca i32, align 4
  store i32 %1, ptr %dereferenced_a, align 4
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
define i32 @run_switch(i32 %arguments.value) {
entry:
  %value = alloca i32, align 4
  store i32 %arguments.value, ptr %value, align 4
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
  %return_value = alloca i32, align 4
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
define void @run_ternary_conditions(i1 %arguments.first_boolean, i1 %arguments.second_boolean) {
entry:
  %first_boolean = alloca i1, align 1
  store i1 %arguments.first_boolean, ptr %first_boolean, align 1
  %second_boolean = alloca i1, align 1
  store i1 %arguments.second_boolean, ptr %second_boolean, align 1
  %0 = load i1, ptr %first_boolean, align 1
  br i1 %0, label %ternary_condition_then, label %ternary_condition_else

ternary_condition_then:                           ; preds = %entry
  br label %ternary_condition_end

ternary_condition_else:                           ; preds = %entry
  br label %ternary_condition_end

ternary_condition_end:                            ; preds = %ternary_condition_else, %ternary_condition_then
  %1 = phi i32 [ 1, %ternary_condition_then ], [ 0, %ternary_condition_else ]
  %a = alloca i32, align 4
  store i32 %1, ptr %a, align 4
  %2 = load i1, ptr %first_boolean, align 1
  %3 = icmp eq i1 %2, false
  br i1 %3, label %ternary_condition_then1, label %ternary_condition_else2

ternary_condition_then1:                          ; preds = %ternary_condition_end
  br label %ternary_condition_end3

ternary_condition_else2:                          ; preds = %ternary_condition_end
  br label %ternary_condition_end3

ternary_condition_end3:                           ; preds = %ternary_condition_else2, %ternary_condition_then1
  %4 = phi i32 [ 1, %ternary_condition_then1 ], [ 0, %ternary_condition_else2 ]
  %b = alloca i32, align 4
  store i32 %4, ptr %b, align 4
  %5 = load i1, ptr %first_boolean, align 1
  %6 = xor i1 %5, true
  br i1 %6, label %ternary_condition_then4, label %ternary_condition_else5

ternary_condition_then4:                          ; preds = %ternary_condition_end3
  br label %ternary_condition_end6

ternary_condition_else5:                          ; preds = %ternary_condition_end3
  br label %ternary_condition_end6

ternary_condition_end6:                           ; preds = %ternary_condition_else5, %ternary_condition_then4
  %7 = phi i32 [ 1, %ternary_condition_then4 ], [ 0, %ternary_condition_else5 ]
  %c = alloca i32, align 4
  store i32 %7, ptr %c, align 4
  %8 = load i1, ptr %first_boolean, align 1
  br i1 %8, label %ternary_condition_then7, label %ternary_condition_else8

ternary_condition_then7:                          ; preds = %ternary_condition_end6
  %9 = load i1, ptr %second_boolean, align 1
  br i1 %9, label %ternary_condition_then10, label %ternary_condition_else11

ternary_condition_else8:                          ; preds = %ternary_condition_end6
  br label %ternary_condition_end9

ternary_condition_end9:                           ; preds = %ternary_condition_else8, %ternary_condition_end12
  %10 = phi i32 [ %12, %ternary_condition_end12 ], [ 0, %ternary_condition_else8 ]
  %d = alloca i32, align 4
  store i32 %10, ptr %d, align 4
  %11 = load i1, ptr %first_boolean, align 1
  br i1 %11, label %ternary_condition_then13, label %ternary_condition_else14

ternary_condition_then10:                         ; preds = %ternary_condition_then7
  br label %ternary_condition_end12

ternary_condition_else11:                         ; preds = %ternary_condition_then7
  br label %ternary_condition_end12

ternary_condition_end12:                          ; preds = %ternary_condition_else11, %ternary_condition_then10
  %12 = phi i32 [ 2, %ternary_condition_then10 ], [ 1, %ternary_condition_else11 ]
  br label %ternary_condition_end9

ternary_condition_then13:                         ; preds = %ternary_condition_end9
  br label %ternary_condition_end15

ternary_condition_else14:                         ; preds = %ternary_condition_end9
  %13 = load i1, ptr %second_boolean, align 1
  br i1 %13, label %ternary_condition_then16, label %ternary_condition_else17

ternary_condition_end15:                          ; preds = %ternary_condition_end18, %ternary_condition_then13
  %14 = phi i32 [ 2, %ternary_condition_then13 ], [ %16, %ternary_condition_end18 ]
  %e = alloca i32, align 4
  store i32 %14, ptr %e, align 4
  %first = alloca i32, align 4
  store i32 0, ptr %first, align 4
  %second = alloca i32, align 4
  store i32 1, ptr %second, align 4
  %15 = load i1, ptr %first_boolean, align 1
  br i1 %15, label %ternary_condition_then19, label %ternary_condition_else20

ternary_condition_then16:                         ; preds = %ternary_condition_else14
  br label %ternary_condition_end18

ternary_condition_else17:                         ; preds = %ternary_condition_else14
  br label %ternary_condition_end18

ternary_condition_end18:                          ; preds = %ternary_condition_else17, %ternary_condition_then16
  %16 = phi i32 [ 1, %ternary_condition_then16 ], [ 0, %ternary_condition_else17 ]
  br label %ternary_condition_end15

ternary_condition_then19:                         ; preds = %ternary_condition_end15
  %17 = load i32, ptr %first, align 4
  br label %ternary_condition_end21

ternary_condition_else20:                         ; preds = %ternary_condition_end15
  %18 = load i32, ptr %second, align 4
  br label %ternary_condition_end21

ternary_condition_end21:                          ; preds = %ternary_condition_else20, %ternary_condition_then19
  %19 = phi i32 [ %17, %ternary_condition_then19 ], [ %18, %ternary_condition_else20 ]
  %f = alloca i32, align 4
  store i32 %19, ptr %f, align 4
  ret void
}
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
define void @unary_operations(i32 %arguments.my_integer, i1 %arguments.my_boolean) {
entry:
  %my_integer = alloca i32, align 4
  store i32 %arguments.my_integer, ptr %my_integer, align 4
  %my_boolean = alloca i1, align 1
  store i1 %arguments.my_boolean, ptr %my_boolean, align 1
  %0 = load i1, ptr %my_boolean, align 1
  %1 = xor i1 %0, true
  %not_variable = alloca i1, align 1
  store i1 %1, ptr %not_variable, align 1
  %2 = load i32, ptr %my_integer, align 4
  %3 = xor i32 %2, -1
  %bitwise_not_variable = alloca i32, align 4
  store i32 %3, ptr %bitwise_not_variable, align 4
  %4 = load i32, ptr %my_integer, align 4
  %5 = sub i32 0, %4
  %minus_variable = alloca i32, align 4
  store i32 %5, ptr %minus_variable, align 4
  %my_mutable_integer = alloca i32, align 4
  store i32 1, ptr %my_mutable_integer, align 4
  %6 = load i32, ptr %my_mutable_integer, align 4
  %7 = add i32 %6, 1
  store i32 %7, ptr %my_mutable_integer, align 4
  %pre_increment_variable = alloca i32, align 4
  store i32 %7, ptr %pre_increment_variable, align 4
  %8 = load i32, ptr %my_mutable_integer, align 4
  %9 = add i32 %8, 1
  store i32 %9, ptr %my_mutable_integer, align 4
  %post_increment_variable = alloca i32, align 4
  store i32 %8, ptr %post_increment_variable, align 4
  %10 = load i32, ptr %my_mutable_integer, align 4
  %11 = sub i32 %10, 1
  store i32 %11, ptr %my_mutable_integer, align 4
  %pre_decrement_variable = alloca i32, align 4
  store i32 %11, ptr %pre_decrement_variable, align 4
  %12 = load i32, ptr %my_mutable_integer, align 4
  %13 = sub i32 %12, 1
  store i32 %13, ptr %my_mutable_integer, align 4
  %post_decrement_variable = alloca i32, align 4
  store i32 %12, ptr %post_decrement_variable, align 4
  %address_of_variable = alloca ptr, align 8
  store ptr %my_mutable_integer, ptr %address_of_variable, align 8
  %14 = load ptr, ptr %address_of_variable, align 8
  %15 = load i32, ptr %14, align 4
  %indirection_variable = alloca i32, align 4
  store i32 %15, ptr %indirection_variable, align 4
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Alias From Modules")
  {
    char const* const input_file = "using_alias_from_modules.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "Alias", g_test_files_path / "using_alias.hl" }
    };

    char const* const expected_llvm_ir = R"(
define void @use_alias(i32 %arguments.my_enum) {
entry:
  %my_enum = alloca i32, align 4
  store i32 %arguments.my_enum, ptr %my_enum, align 4
  %a = alloca i32, align 4
  store i32 10, ptr %a, align 4
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Alias")
  {
    char const* const input_file = "using_alias.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define void @use_alias(i64 %arguments.size, i32 %arguments.my_enum) {
entry:
  %size = alloca i64, align 8
  store i64 %arguments.size, ptr %size, align 8
  %my_enum = alloca i32, align 4
  store i32 %arguments.my_enum, ptr %my_enum, align 4
  %a = alloca i32, align 4
  store i32 10, ptr %a, align 4
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Enum Flags")
  {
    char const* const input_file = "using_enum_flags.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define i32 @use_enums(i32 %arguments.enum_argument) {
entry:
  %enum_argument = alloca i32, align 4
  store i32 %arguments.enum_argument, ptr %enum_argument, align 4
  %a = alloca i32, align 4
  store i32 3, ptr %a, align 4
  %0 = load i32, ptr %enum_argument, align 4
  %1 = and i32 %0, 1
  %b = alloca i32, align 4
  store i32 %1, ptr %b, align 4
  %2 = load i32, ptr %enum_argument, align 4
  %3 = xor i32 %2, 1
  %c = alloca i32, align 4
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
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Enums From Modules")
  {
    char const* const input_file = "using_enums_from_modules.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
        { "Enums", g_test_files_path / "using_enums.hl" }
    };

    char const* const expected_llvm_ir = R"(
define void @use_enums() {
entry:
  %my_value = alloca i32, align 4
  store i32 1, ptr %my_value, align 4
  ret void
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Enums")
  {
    char const* const input_file = "using_enums.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
define i32 @use_enums(i32 %arguments.enum_argument) {
entry:
  %enum_argument = alloca i32, align 4
  store i32 %arguments.enum_argument, ptr %enum_argument, align 4
  %my_value = alloca i32, align 4
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
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }


  TEST_CASE("Compile Using Structs")
  {
    char const* const input_file = "using_structs.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%My_struct = type { i32, i32 }
%My_struct_2 = type { %My_struct, %My_struct, %My_struct }
%My_Union = type { [24 x i8] }
%My_struct_3 = type { i32, %My_Union }

define void @use_structs(%My_struct %arguments.my_struct) {
entry:
  %my_struct = alloca %My_struct, align 8
  store %My_struct %arguments.my_struct, ptr %my_struct, align 4
  %0 = getelementptr inbounds %My_struct, ptr %my_struct, i32 0, i32 0
  %1 = load i32, ptr %0, align 4
  %a = alloca i32, align 4
  store i32 %1, ptr %a, align 4
  %instance_0 = alloca %My_struct, align 8
  store %My_struct { i32 1, i32 2 }, ptr %instance_0, align 4
  %instance_1 = alloca %My_struct, align 8
  store %My_struct { i32 1, i32 3 }, ptr %instance_1, align 4
  %instance_2 = alloca %My_struct_2, align 8
  store %My_struct_2 { %My_struct { i32 1, i32 2 }, %My_struct { i32 2, i32 2 }, %My_struct { i32 3, i32 4 } }, ptr %instance_2, align 4
  %instance_3 = alloca %My_struct_2, align 8
  store %My_struct_2 { %My_struct { i32 1, i32 2 }, %My_struct { i32 1, i32 2 }, %My_struct { i32 0, i32 1 } }, ptr %instance_3, align 4
  %2 = getelementptr inbounds %My_struct_2, ptr %instance_3, i32 0, i32 1
  %3 = getelementptr inbounds %My_struct, ptr %2, i32 0, i32 0
  %4 = load i32, ptr %3, align 4
  %nested_b_a = alloca i32, align 4
  store i32 %4, ptr %nested_b_a, align 4
  %instance_4 = alloca %My_struct, align 8
  store %My_struct { i32 1, i32 2 }, ptr %instance_4, align 4
  store %My_struct { i32 10, i32 11 }, ptr %instance_4, align 4
  %5 = getelementptr inbounds %My_struct, ptr %instance_4, i32 0, i32 0
  store i32 0, ptr %5, align 4
  call void @pass_struct(%My_struct { i32 1, i32 2 })
  %6 = call %My_struct @return_struct()
  %instance_5 = alloca %My_struct, align 8
  store %My_struct %6, ptr %instance_5, align 4
  %7 = alloca %My_Union, align 8
  store %My_struct { i32 1, i32 2 }, ptr %7, align 4
  %8 = load %My_Union, ptr %7, align 1
  %9 = insertvalue %My_struct_3 { i32 4, %My_Union undef }, %My_Union %8, 1
  %instance_6 = alloca %My_struct_3, align 8
  store %My_struct_3 %9, ptr %instance_6, align 4
  ret void
}

define private void @pass_struct(%My_struct %arguments.my_struct) {
entry:
  %my_struct = alloca %My_struct, align 8
  store %My_struct %arguments.my_struct, ptr %my_struct, align 4
  ret void
}

define private %My_struct @return_struct() {
entry:
  ret %My_struct { i32 1, i32 2 }
}
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }

  TEST_CASE("Compile Using Unions")
  {
    char const* const input_file = "using_unions.hl";

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map
    {
    };

    char const* const expected_llvm_ir = R"(
%My_union = type { [4 x i8] }
%My_union_2 = type { [8 x i8] }
%My_union_3 = type { [8 x i8] }
%My_struct = type { i32 }

define void @use_unions(%My_union %arguments.my_union, i32 %arguments.my_union_tag) {
entry:
  %my_union = alloca %My_union, align 8
  store %My_union %arguments.my_union, ptr %my_union, align 1
  %my_union_tag = alloca i32, align 4
  store i32 %arguments.my_union_tag, ptr %my_union_tag, align 4
  %0 = load i32, ptr %my_union_tag, align 4
  %1 = icmp eq i32 %0, 0
  br i1 %1, label %if_s0_then, label %if_s1_else

if_s0_then:                                       ; preds = %entry
  %2 = getelementptr inbounds %My_union, ptr %my_union, i32 0, i32 0
  %3 = load i32, ptr %2, align 4
  %a = alloca i32, align 4
  store i32 %3, ptr %a, align 4
  br label %if_s3_after

if_s1_else:                                       ; preds = %entry
  %4 = load i32, ptr %my_union_tag, align 4
  %5 = icmp eq i32 %4, 1
  br i1 %5, label %if_s2_then, label %if_s3_after

if_s2_then:                                       ; preds = %if_s1_else
  %6 = getelementptr inbounds %My_union, ptr %my_union, i32 0, i32 0
  %7 = load float, ptr %6, align 4
  %b = alloca float, align 4
  store float %7, ptr %b, align 4
  br label %if_s3_after

if_s3_after:                                      ; preds = %if_s2_then, %if_s1_else, %if_s0_then
  %8 = alloca %My_union, align 8
  store i32 2, ptr %8, align 4
  %9 = load %My_union, ptr %8, align 1
  %instance_0 = alloca %My_union, align 8
  store %My_union %9, ptr %instance_0, align 1
  %10 = alloca %My_union, align 8
  store float 3.000000e+00, ptr %10, align 4
  %11 = load %My_union, ptr %10, align 1
  %instance_1 = alloca %My_union, align 8
  store %My_union %11, ptr %instance_1, align 1
  %12 = alloca %My_union_2, align 8
  store i32 2, ptr %12, align 4
  %13 = load %My_union_2, ptr %12, align 1
  %instance_2 = alloca %My_union_2, align 8
  store %My_union_2 %13, ptr %instance_2, align 1
  %14 = alloca %My_union_2, align 8
  store i64 3, ptr %14, align 8
  %15 = load %My_union_2, ptr %14, align 1
  %instance_3 = alloca %My_union_2, align 8
  store %My_union_2 %15, ptr %instance_3, align 1
  %16 = alloca %My_union_3, align 8
  store i64 3, ptr %16, align 8
  %17 = load %My_union_3, ptr %16, align 1
  %instance_4 = alloca %My_union_3, align 8
  store %My_union_3 %17, ptr %instance_4, align 1
  %18 = alloca %My_union_3, align 8
  store %My_struct { i32 1 }, ptr %18, align 4
  %19 = load %My_union_3, ptr %18, align 1
  %instance_5 = alloca %My_union_3, align 8
  store %My_union_3 %19, ptr %instance_5, align 1
  %20 = alloca %My_union_3, align 8
  store %My_struct { i32 2 }, ptr %20, align 4
  %21 = load %My_union_3, ptr %20, align 1
  %instance_6 = alloca %My_union_3, align 8
  store %My_union_3 %21, ptr %instance_6, align 1
  %22 = getelementptr inbounds %My_union_3, ptr %instance_6, i32 0, i32 0
  %23 = getelementptr inbounds %My_struct, ptr %22, i32 0, i32 0
  %24 = load i32, ptr %23, align 4
  %nested_b_a = alloca i32, align 4
  store i32 %24, ptr %nested_b_a, align 4
  %25 = alloca %My_union, align 8
  store i32 1, ptr %25, align 4
  %26 = load %My_union, ptr %25, align 1
  %instance_7 = alloca %My_union, align 8
  store %My_union %26, ptr %instance_7, align 1
  %27 = alloca %My_union, align 8
  store i32 2, ptr %27, align 4
  %28 = load %My_union, ptr %27, align 1
  store %My_union %28, ptr %instance_7, align 1
  %29 = alloca %My_union, align 8
  store i32 4, ptr %29, align 4
  %30 = load %My_union, ptr %29, align 1
  call void @pass_union(%My_union %30)
  %31 = call %My_union @return_union()
  %instance_8 = alloca %My_union, align 8
  store %My_union %31, ptr %instance_8, align 1
  ret void
}

define private void @pass_union(%My_union %arguments.my_union) {
entry:
  %my_union = alloca %My_union, align 8
  store %My_union %arguments.my_union, ptr %my_union, align 1
  ret void
}

define private %My_union @return_union() {
entry:
  %0 = alloca %My_union, align 8
  store float 1.000000e+01, ptr %0, align 4
  %1 = load %My_union, ptr %0, align 1
  ret %My_union %1
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

define void @run_while_loops(i32 %arguments.size) {
entry:
  %size = alloca i32, align 4
  store i32 %arguments.size, ptr %size, align 4
  %index = alloca i32, align 4
  store i32 0, ptr %index, align 4
  br label %while_loop_condition

while_loop_condition:                             ; preds = %while_loop_then, %entry
  %0 = load i32, ptr %index, align 4
  %1 = load i32, ptr %size, align 4
  %2 = icmp slt i32 %0, %1
  br i1 %2, label %while_loop_then, label %while_loop_after

while_loop_then:                                  ; preds = %while_loop_condition
  %3 = load i32, ptr %index, align 4
  call void @print_integer(i32 %3)
  %4 = load i32, ptr %index, align 4
  %5 = add i32 %4, 1
  store i32 %5, ptr %index, align 4
  br label %while_loop_condition

while_loop_after:                                 ; preds = %while_loop_condition
  %index1 = alloca i32, align 4
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
  ret void

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
  call void @print_integer(i32 %14)
  %15 = load i32, ptr %index1, align 4
  %16 = add i32 %15, 1
  store i32 %16, ptr %index1, align 4
  br label %while_loop_condition2
}

define private void @print_integer(i32 %arguments.value) {
entry:
  %value = alloca i32, align 4
  store i32 %arguments.value, ptr %value, align 4
  %0 = load i32, ptr %value, align 4
  %1 = call i32 (ptr, ...) @printf(ptr @global_0, i32 %0)
  ret void
}

declare i32 @printf(ptr, ...)
)";

    test_create_llvm_module(input_file, module_name_to_file_path_map, expected_llvm_ir);
  }
}
