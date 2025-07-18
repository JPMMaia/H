#include <memory_resource>
#include <filesystem>
#include <optional>
#include <span>
#include <string_view>
#include <unordered_map>
#include <vector>

import h.compiler;
import h.compiler.analysis;
import h.compiler.diagnostic;
import h.core;
import h.core.declarations;
import h.parser.convertor;
import h.parser.parser;

using h::compiler::operator<<;

#include <catch2/catch_all.hpp>

namespace h::compiler
{
    void test_validate_module(
        std::string_view const input_text,
        std::span<std::string_view const> const input_dependencies_text,
        std::span<h::compiler::Diagnostic const> const expected_diagnostics
    )
    {
        Declaration_database declaration_database = create_declaration_database();

        Analysis_options const options
        {
            .validate = true,
        };

        std::pmr::vector<h::Module> dependency_core_modules;
        dependency_core_modules.reserve(input_dependencies_text.size());

        for (std::size_t index = 0; index < input_dependencies_text.size(); ++index)
        {
            std::string_view const dependency_text = input_dependencies_text[index];

            std::optional<h::Module> dependency_module = h::parser::parse_and_convert_to_module(
                dependency_text,
                std::nullopt,
                {},
                {}
            );
            REQUIRE(dependency_module.has_value());

            add_declarations(declaration_database, dependency_module.value());
            
            Analysis_result const result = process_module(
                dependency_module.value(),
                declaration_database,
                options,
                {}
            );
            REQUIRE(result.diagnostics.empty());

            dependency_core_modules.push_back(std::move(dependency_module.value()));
        }

        std::optional<h::Module> core_module = h::parser::parse_and_convert_to_module(
            input_text,
            std::nullopt,
            {},
            {}
        );
        REQUIRE(core_module.has_value());

        add_declarations(declaration_database, core_module.value());

        Analysis_result const result = process_module(
            core_module.value(),
            declaration_database,
            options,
            {}
        );

        std::span<h::compiler::Diagnostic const> const actual_diagnostics = result.diagnostics;

        REQUIRE(actual_diagnostics.size() == expected_diagnostics.size());
        for (std::size_t index = 0; index < actual_diagnostics.size(); ++index)
        {
            h::compiler::Diagnostic const& actual_diagnostic = actual_diagnostics[index];
            h::compiler::Diagnostic const& expected_diagnostic = expected_diagnostics[index];
            CHECK(actual_diagnostic == expected_diagnostic);
        }
    }


        TEST_CASE("Validates that a import alias is a not a duplicate", "[Validation][Import]")
    {
        std::string_view const input = R"(module Test;

import module_a as module_a;
import module_b as module_a;
)";

        std::string_view const module_a_input = "module module_a;";
        std::string_view const module_b_input = "module module_b;";
        
        std::pmr::vector<std::string_view> const dependencies = { module_a_input, module_b_input };

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(4, 20, 4, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate import alias 'module_a'.",
                .related_information = {},
            }
        };

        test_validate_module(input, dependencies, expected_diagnostics);
    }

    TEST_CASE("Validates that a import module exists", "[Validation][Import]")
    {
        std::string_view const input = R"(module Test;

import my.module_a as my_module;
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(3, 8, 3, 19),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot find module 'my.module_a'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that a declaration name is not a duplicate", "[Validation][Declaration]")
    {
        std::string_view const input = R"(module Test;

struct My_type
{
}

union My_type
{
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            {
                .range = create_source_range(7, 7, 7, 14),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate declaration name 'My_type'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that a declaration name is not a builtin type", "[Validation][Declaration]")
    {
        std::string_view const input = R"(module Test;

struct Int32
{
}

union Float32
{
}

using true = Float32;
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(3, 8, 3, 13),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Invalid declaration name 'Int32' which is a reserved keyword.",
                .related_information = {},
            },
            {
                .range = create_source_range(7, 7, 7, 14),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Invalid declaration name 'Float32' which is a reserved keyword.",
                .related_information = {},
            },
            {
                .range = create_source_range(11, 7, 11, 11),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Invalid declaration name 'true' which is a reserved keyword.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that enum member names are different from each other", "[Validation][Enum]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    a = 0,
    b = 1,
    b = 2,
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 5, 7, 6),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate enum value name 'My_enum.b'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that enum values are signed 32-bit integers", "[Validation][Enum]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    a = 0,
    b = 1i16,
    c = 2.0f32,
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 9, 6, 13),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Enum value 'My_enum.b' must be a Int32 type.",
                .related_information = {},
            },
            {
                .range = create_source_range(7, 9, 7, 15),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Enum value 'My_enum.c' must be a Int32 type.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that enum values can be computed at compile-time", "[Validation][Enum]")
    {
        std::string_view const input = R"(module Test;

function get_value() -> (result: Int32)
{
    return 0;
}

enum My_enum
{
    a = 0,
    b = 1 + 2,
    c = a + b,
    d = get_value(),
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(13, 9, 13, 20),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "The value of 'My_enum.d' must be a computable at compile-time.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Allows enum values to be computed using enum values", "[Validation][Enum]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    a = 1,
    b = 2,
    c = 4,
    d = a | b | c,
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics = {};

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validate that enum value can only be calculated using previous enum values", "[Validation][Enum]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    a = 1,
    b = a,
    c = d,
    d = d,
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 9, 7, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "The value of 'My_enum.c' must be a computable at compile-time.",
                .related_information = {},
            },
            {
                .range = create_source_range(8, 9, 8, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "The value of 'My_enum.d' must be a computable at compile-time.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that member names are different from each other", "[Validation][Struct]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    b: Int32 = 0;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 5, 6, 6),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate member name 'My_struct.b'.",
                .related_information = {},
            },
            {
                .range = create_source_range(7, 5, 7, 6),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate member name 'My_struct.b'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that member default values types must match member types", "[Validation][Struct]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0.0f32;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 16, 6, 22),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot assign expression of type 'Float32' to 'My_struct.b' of type 'Int32'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that member default values only use compile time expressions", "[Validation][Struct]")
    {
        std::string_view const input = R"(module Test;

function get_value() -> (result: Int32)
{
    return 0;
}

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = get_value();
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(11, 16, 11, 27),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "The value of 'My_struct.b' must be a computable at compile-time.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that member default values are values, not types", "[Validation][Struct]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = Int32;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(5, 16, 5, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot assign expression of type '<undefined>' to 'My_struct.a' of type 'Int32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(5, 16, 5, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "The value of 'My_struct.a' must be a computable at compile-time.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that instantiate expressions can only be assigned to struct or union types", "[Validation][Struct]")
    {
        std::string_view const input = R"(module Test;

struct My_struct_0
{
    a: Int32 = 0;
}

union My_union_0
{
    a: Int32;
    b: Float32;
}

struct My_struct_1
{
    a: My_struct_0 = {};
    b: My_struct_1 = explicit {
        a: 1
    };
    c: My_union_0 = {
        b: 1.0f32
    };
    d: Int32 = {};
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(23, 16, 23, 18),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot initialize 'My_struct_1.d' member of type 'Int32' with an instantiate expression.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that member names are different from each other", "[Validation][Union]")
    {
        std::string_view const input = R"(module Test;

union My_union
{
    a: Int32;
    b: Float32;
    b: Float64;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 5, 6, 6),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate member name 'My_union.b'.",
                .related_information = {},
            },
            {
                .range = create_source_range(7, 5, 7, 6),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate member name 'My_union.b'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that type and type of value match", "[Validation][Global_variable]")
    {
        std::string_view const input = R"(module Test;

var my_global_0: Float32 = 2.0f32;
var my_global_1: Int32 = 2.0f32;
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(4, 26, 4, 32),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Float32' does not match expected type 'Int32'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that expression only uses compile time expressions", "[Validation][Global_variable]")
    {
        std::string_view const input = R"(module Test;

function get_value() -> (result: Int32)
{
    return 0;
}

var my_global_0 = 0;
var my_global_1 = get_value();
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(9, 19, 9, 30),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "The value of 'my_global_1' must be a computable at compile-time.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that pointers to global constants do not exist", "[Validation][Global_variable]")
    {
        std::string_view const input = R"(module Test;

mutable my_global_0 = 0;
var my_global_1 = 0;

function run() -> ()
{
    var a = &my_global_0;
    var b = &my_global_1;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(9, 13, 9, 14),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot take address of a global constant.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    
    TEST_CASE("Validates that precondition and postcondition must evaluate to a boolean", "[Validation][Function_contracts]")
    {
        std::string_view const input = R"(module Test;

function add(first: Int32, second: Int32) -> (result: Int32)
    precondition "first > 0 && second > 0" { first > 0 && second > 0 }
    precondition "first" { first }
    postcondition "result > 0" { result > 0 }
    postcondition "result" { result }
{
    return first + second;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(5, 28, 5, 33),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            },
            {
                .range = create_source_range(7, 30, 7, 36),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that precondition can only reference function inputs, global constants, enum values and call functions", "[Validation][Function_contracts]")
    {
        std::string_view const input = R"(module Test;

var g_my_constant = 0;
mutable g_my_mutable = 0;

enum My_enum
{
    First = 0,
}

function check_precondition(value: Int32) -> (result: Bool)
{
    return value > 0;
}

function add(first: Int32, second: Int32) -> (result: Int32)
    precondition "validate with function" { check_precondition(first) }
    precondition "validate with global constant" { first + g_my_constant > 0 }
    precondition "validate with global non-constant" { first + g_my_mutable > 0 }
    precondition "validate with enum value" { first > (My_enum.First as Int32) }
    precondition "validate with function output" { result > 0 }
    precondition "validate with unknown variable" { beep > 0 }
{
    return first + second;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(19, 64, 19, 76),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot use mutable global variable in function preconditions and postconditions. Consider making the global constant.",
                .related_information = {},
            },
            {
                .range = create_source_range(21, 52, 21, 58),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'result' does not exist.",
                .related_information = {},
            },
            {
                .range = create_source_range(22, 53, 22, 57),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'beep' does not exist.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that postcondition can only reference function inputs, function outputs, global constants, enum values and call functions", "[Validation][Function_contracts]")
    {
        std::string_view const input = R"(module Test;

var g_my_constant = 0;
mutable g_my_mutable = 0;

enum My_enum
{
    First = 0,
}

function check_postcondition(value: Int32) -> (result: Bool)
{
    return value > 0;
}

function add(first: Int32, second: Int32) -> (result: Int32)
    postcondition "validate with function" { check_postcondition(result) }
    postcondition "validate with global constant" { result + g_my_constant > 0 }
    postcondition "validate with global non-constant" { result + g_my_mutable > 0 }
    postcondition "validate with enum value" { result > (My_enum.First as Int32) }
    postcondition "validate with function input" { first + second == result }
    postcondition "validate with unknown variable" { beep > 0 }
{
    return first + second;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(19, 66, 19, 78),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot use mutable global variable in function preconditions and postconditions. Consider making the global constant.",
                .related_information = {},
            },
            {
                .range = create_source_range(22, 54, 22, 58),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'beep' does not exist.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    
    TEST_CASE("Validates that left hand side is either a module alias, a variable of type struct/union or an enum type", "[Validation][Access_expression]")
    {
        std::string_view const input = R"(module Test;

import Test_2 as My_module;

enum My_enum
{
    A = 0,
    B,
}

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 1;
}

union My_union
{
    a: Int32;
    b: Float32;
}

function run() -> ()
{
    var value_0 = My_enum.A;
    var value_1 = My_enum_2.A;
    
    var value_2: My_struct = {};
    var value_3 = value_2.a;

    var value_4 = value_4.b;

    var value_6: My_union = { b: 0.0f32 };
    var value_7 = value_6.b;

    var value_8 = My_module.My_enum.A;
    var value_9 = My_module.My_enum_2.A;
    var value_10 = My_module_2.My_enum.A;

    var value_11: My_module.My_struct = {};
    var value_12 = value_11.a;

    var value_13: My_module.My_union = { b: 0.0f32 };
    var value_14 = value_13.b;
}
)";

        std::string_view const test_2_input = R"(module Test_2;

enum My_enum
{
    A = 0,
    B,
}

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 1;
}

union My_union
{
    a: Int32;
    b: Float32;
}
)";

        std::pmr::vector<std::string_view> const dependencies = { test_2_input };

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(26, 19, 26, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'My_enum_2' does not exist.",
                .related_information = {},
            },
            {
                .range = create_source_range(31, 19, 31, 26),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'value_4' does not exist.",
                .related_information = {},
            },
            {
                .range = create_source_range(37, 19, 37, 38),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Declaration 'My_enum_2' does not exist in the module 'Test_2' (alias 'My_module').",
                .related_information = {},
            },
            {
                .range = create_source_range(38, 20, 38, 31),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'My_module_2' does not exist.",
                .related_information = {},
            },
        };

        test_validate_module(input, dependencies, expected_diagnostics);
    }

    TEST_CASE("Validates that a member name of local type exists", "[Validation][Access_expression]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    A = 0,
    B,
}

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 1;
}

union My_union
{
    a: Int32;
    b: Float32;
}

function run() -> ()
{
    var value_0 = My_enum.A;
    var value_1 = My_enum.C;
    
    var value_2: My_struct = {};
    var value_3 = value_2.a;
    var value_4 = value_2.c;

    var value_5: My_union = { b: 0.0f32 };
    var value_6 = value_5.a;
    var value_7 = value_5.c;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(24, 19, 24, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Member 'C' does not exist in the type 'My_enum'.",
                .related_information = {},
            },
            {
                .range = create_source_range(28, 19, 28, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Member 'c' does not exist in the type 'My_struct'.",
                .related_information = {},
            },
            {
                .range = create_source_range(32, 19, 32, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Member 'c' does not exist in the type 'My_union'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that a member name of an imported type exists", "[Validation][Access_expression]")
    {
        std::string_view const input = R"(module Test;

import Test_2 as My_module;

function run() -> ()
{
    var value_0 = My_module.My_enum.A;
    var value_1 = My_module.My_enum.C;
    
    var value_2: My_module.My_struct = {};
    var value_3 = value_2.a;
    var value_4 = value_2.c;

    var value_5: My_module.My_union = { b: 0.0f32 };
    var value_6 = value_5.a;
    var value_7 = value_5.c;
}
)";

        std::string_view const test_2_input = R"(module Test_2;

export enum My_enum
{
    A = 0,
    B,
}

export struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 1;
}

export union My_union
{
    a: Int32;
    b: Float32;
}
)";

        std::pmr::vector<std::string_view> const dependencies = { test_2_input };

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(8, 19, 8, 38),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Member 'C' does not exist in the type 'My_module.My_enum'.",
                .related_information = {},
            },
            {
                .range = create_source_range(12, 19, 12, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Member 'c' does not exist in the type 'My_module.My_struct'.",
                .related_information = {},
            },
            {
                .range = create_source_range(16, 19, 16, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Member 'c' does not exist in the type 'My_module.My_union'.",
                .related_information = {},
            },
        };

        test_validate_module(input, dependencies, expected_diagnostics);
    }


    TEST_CASE("Validates that assert must evaluate to a boolean", "[Validation][Assert_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    assert "value is not 0" { value != 0 };
    assert "value is not 0" { value };
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 31, 6, 36),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that left hand side type matches right hand side type", "[Validation][Assignment_expression]")
    {
        std::string_view const input = R"(module Test;

function run() -> ()
{
    mutable value_0 = 0;
    value_0 = 1;
    value_0 = 1.0f32;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 15, 7, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expected type is 'Int32' but got 'Float32'.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that cannot add to struct when assigning", "[Validation][Assignment_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
}

function run() -> ()
{
    mutable value_0 = 0;
    value_0 += 1;

    mutable value_1: My_struct = {};
    var value_2: My_struct = {};
    value_1 += value_2;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(14, 5, 14, 23),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary operation '+' can only be applied to numeric types.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that left and right hand side expression types match", "[Validation][Binary_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    var a = value + 1;
    var b = value + 1.0f32;
    var c = true + 1.0f32;

    var d = &a;
    var e = &a;
    var t1 = e == d;
    var t2 = e == null;
    var t3 = d == a;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 13, 6, 27),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary expression requires both operands to be of the same type. Left side type 'Int32' does not match right hand side type 'Float32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(7, 13, 7, 26),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary expression requires both operands to be of the same type. Left side type 'Bool' does not match right hand side type 'Float32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(13, 14, 13, 20),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary expression requires both operands to be of the same type. Left side type '*mutable Int32' does not match right hand side type 'Int32'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that in numeric operations both types must be numbers", "[Validation][Binary_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    var a = value + 1;
    var b = 1.0f32 + 2.0f32;
    var c = true + false;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 13, 7, 25),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary operation '+' can only be applied to numeric types.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that in comparison operations both types must be comparable 0", "[Validation][Binary_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var a = value < 1;

    var instance_0: My_struct = {};
    var instance_1: My_struct = {};
    var b = instance_0 < instance_1;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(14, 13, 14, 36),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary operation '<' can only be applied to numeric types.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that in comparison operations both types must be comparable 1", "[Validation][Binary_expression]")
    {
        std::string_view const input = R"(module Test;

using My_uint = Uint32;

function run(first: My_uint, second: My_uint) -> ()
{
    var a = first < second;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that in logical operations both types must be boolean", "[Validation][Binary_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    var a = true && false;
    var b = value && 1;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 13, 6, 23),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary operation '&&' can only be applied to a boolean value.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that in bitwise operations both types must be integers or bytes", "[Validation][Binary_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    var a = value & 1;
    var b = 1.0f32 & 2.0f32;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 13, 6, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary operation '&' can only be applied to integers or bytes.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that in bit shift operations the left type must be an integer or byte and the right side must be an integer", "[Validation][Binary_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    var a = value << 1;
    var b = 1.0f32 << 2.0f32;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 13, 6, 29),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary operation '<<' can only be applied to integers or bytes.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that in has operations both expressions must evaluate to enum values", "[Validation][Binary_expression]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    A,
    B,
}

function run(value: My_enum) -> ()
{ 
    var a = value has My_enum.A;
    var b = 1 has 0;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(12, 13, 12, 20),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Binary operation 'has' can only be applied to enum values.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


        TEST_CASE("Validates that break can only be placed inside for loops, while loops and switch cases", "[Validation][Break_expression]")
    {
        std::string_view const input = R"(module Test;

function run(input: Int32) -> ()
{
    for index in 0 to 10
    {
        break;
    }

    while false
    {
        break;
    }

    switch (input)
    {
        case 0: {
            break;
        }
    }

    break;

    {
        break;
    }

    if false
    {
        break;
    }

    for index in 0 to 10
    {
        {
            break;
        }
    }

    for index in 0 to 10
    {
        if index % 2 == 0
        {
            break;
        }
    }

    while false
    {
        {
            break;
        }
    }

    while false
    {
        if input % 2 == 0
        {
            break;
        }
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(22, 5, 22, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'break' can only be placed inside for loops, while loops and switch cases.",
                .related_information = {},
            },
            {
                .range = create_source_range(25, 9, 25, 14),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'break' can only be placed inside for loops, while loops and switch cases.",
                .related_information = {},
            },
            {
                .range = create_source_range(30, 9, 30, 14),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'break' can only be placed inside for loops, while loops and switch cases.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that break loop count is valid", "[Validation][Break_expression]")
    {
        std::string_view const input = R"(module Test;

function run(input: Int32) -> ()
{
    for index in 0 to 10
    {
        break 1;
    }

    while false
    {
        for index in 0 to 10
        {
            break 2;
        }
    }

    for index in 0 to 10
    {
        break 2;
    }

    for index in 0 to 10
    {
        break 0;
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(20, 15, 20, 16),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'break' loop count of 2 is invalid.",
                .related_information = {},
            },
            {
                .range = create_source_range(25, 15, 25, 16),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'break' loop count of 0 is invalid.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that can only call functions or expressions whose type is a function type", "[Validation][Call_expression]")
    {
        std::string_view const input = R"(module Test;

function foo() -> ()
{
}

function run() -> ()
{
    foo();

    var int_value = 0;
    int_value();
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(12, 5, 12, 16),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression does not evaluate to a callable expression.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that function call has the correct number of arguments", "[Validation][Call_expression]")
    {
        std::string_view const input = R"(module Test;

function foo_0() -> ()
{
}

function foo_1(v0: Int32) -> ()
{
}

function foo_2(v0: Int32, v1: Int32) -> ()
{
}

function run() -> ()
{
    foo_0();
    foo_0(0);

    foo_1(0);
    foo_1();
    foo_1(0, 0);

    foo_2(0, 0);
    foo_2();
    foo_2(0);
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(18, 5, 18, 13),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function expects 0 arguments, but 1 were provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(21, 5, 21, 12),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function expects 1 arguments, but 0 were provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(22, 5, 22, 16),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function expects 1 arguments, but 2 were provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(25, 5, 25, 12),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function expects 2 arguments, but 0 were provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(26, 5, 26, 13),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function expects 2 arguments, but 1 were provided.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that variadic function call has the correct number of arguments", "[Validation][Call_expression]")
    {
        std::string_view const input = R"(module Test;

function foo_0(first: Int32, second: Int32, ...) -> ()
{
}

function run() -> ()
{
    foo_0(0, 1);
    foo_0(0, 1, 2);
    foo_0(0);
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(11, 5, 11, 13),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function expects at least 2 arguments, but 1 were provided.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that function call has the correct argument types", "[Validation][Call_expression]")
    {
        std::string_view const input = R"(module Test;

function foo_1(v0: Int32) -> ()
{
}

function foo_2(v0: Int32, v1: Float32) -> ()
{
}

function run() -> ()
{
    foo_1(0);
    foo_1(0.0f32);

    foo_2(0, 0.0f32);
    foo_2(0, 0);
    foo_2(0.0f32, 0);
    foo_2(0.0f32, 0.0f32);
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(14, 11, 14, 17),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Argument 0 type is 'Int32' but 'Float32' was provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(17, 14, 17, 15),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Argument 1 type is 'Float32' but 'Int32' was provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(18, 11, 18, 17),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Argument 0 type is 'Int32' but 'Float32' was provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(18, 19, 18, 20),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Argument 1 type is 'Float32' but 'Int32' was provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(19, 11, 19, 17),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Argument 0 type is 'Int32' but 'Float32' was provided.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that function call arguments are values, not types", "[Validation][Call_expression]")
    {
        std::string_view const input = R"(module Test;

function foo_1(v0: Int32) -> ()
{
}

function run() -> ()
{
    foo_1(Int32);
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(9, 11, 9, 16),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'Int32' does not exist.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    
    TEST_CASE("Validates that the numeric cast source type is a numeric type or an enum type", "[Validation][Cast_expression]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    A = 0,
}

struct My_struct
{
    a: Int32 = 0;
}

function run(int_input: Int32, enum_input: My_enum) -> ()
{
    var value_0 = int_input as Int64;
    var value_1 = enum_input as Int64;

    var instance: My_struct = {};
    var value_2 = instance as Int64;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(19, 19, 19, 36),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply numeric cast from 'My_struct' to 'Int64'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the numeric cast destination type is a numeric type or an enum type", "[Validation][Cast_expression]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    A = 0,
}

struct My_struct
{
    a: Int32 = 0;
}

function run(int_input: Int32, enum_input: My_enum) -> ()
{
    var value_0 = int_input as My_enum;
    var value_1 = enum_input as Int64;
    var value_2 = int_input as My_struct;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(17, 19, 17, 41),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply numeric cast from 'Int32' to 'My_struct'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Warn if cast source and destination types are the same (except when using alias)", "[Validation][Cast_expression]")
    {
        std::string_view const input = R"(module Test;

using My_int = Int32;

enum My_enum
{
    A = 0,
}

function run(int_input: Int32, enum_input: My_enum) -> ()
{
    var value_0 = int_input as Int64;
    var value_1 = int_input as My_int;
    var value_2 = int_input as Int32;
    var value_3 = enum_input as My_enum;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(14, 19, 14, 37),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Warning,
                .message = "Numeric cast from 'Int32' to 'Int32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(15, 19, 15, 40),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Warning,
                .message = "Numeric cast from 'My_enum' to 'My_enum'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the numeric cast destination type is a numeric type or an enum type using imported modules", "[Validation][Cast_expression]")
    {

        std::string_view const dependency = R"(module Dependency;

export using Flags = Uint32;

export enum My_enum
{
    A = 0,
}

export struct My_struct
{
    a: Int32 = 0;
}
)";

        std::string_view const input = R"(module Test;

import Dependency as dependency;

function run(int_input: Int32, enum_input: dependency.My_enum) -> ()
{
    var value_0 = int_input as dependency.My_enum;
    var value_1 = enum_input as dependency.Flags;
    var value_2 = int_input as dependency.My_struct;
}
)";

        std::pmr::vector<std::string_view> const dependencies = { dependency };

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(9, 19, 9, 52),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply numeric cast from 'Int32' to 'dependency.My_struct'.",
                .related_information = {},
            },
        };

        test_validate_module(input, dependencies, expected_diagnostics);
    }


    TEST_CASE("Validates that continue can only be placed inside for loops and while loops", "[Validation][Continue_expression]")
    {
        std::string_view const input = R"(module Test;

function run(input: Int32) -> ()
{
    for index in 0 to 10
    {
        continue;
    }

    while false
    {
        continue;
    }

    continue;

    {
        continue;
    }

    if false
    {
        continue;
    }

    var value_0 = 0;
    switch (value_0)
    {
        case 0: {
            continue;
        }
    }

    for index in 0 to 10
    {
        {
            continue;
        }
    }

    for index in 0 to 10
    {
        if index % 2 == 0
        {
            continue;
        }

        var value_1 = 0;
        switch value_1
        {
            case 0: {
                continue;
            }
        }
    }

    while false
    {
        {
            continue;
        }
    }

    while false
    {
        if input % 2 == 0
        {
            continue;
        }

        var value_2 = 0;
        switch value_2
        {
            case 0: {
                continue;
            }
        }
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(15, 5, 15, 13),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'continue' can only be placed inside for loops and while loops.",
                .related_information = {},
            },
            {
                .range = create_source_range(18, 9, 18, 17),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'continue' can only be placed inside for loops and while loops.",
                .related_information = {},
            },
            {
                .range = create_source_range(23, 9, 23, 17),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'continue' can only be placed inside for loops and while loops.",
                .related_information = {},
            },
            {
                .range = create_source_range(30, 13, 30, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'continue' can only be placed inside for loops and while loops.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that a type exists", "[Validation][Custom_type_reference]")
    {
        std::string_view const input = R"(module Test;

using My_int = Int32;
using My_type = My_struct;
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(4, 17, 4, 26),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Type 'My_struct' does not exist.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that a type from an import module exists", "[Validation][Custom_type_reference]")
    {
        std::string_view const input = R"(module Test_a;

import Test_b as B;

using My_int = Int32;
using My_type = B.My_struct;
using My_type_2 = B.My_struct_2;
)";

        std::string_view const test_b_input = R"(module Test_b;

struct My_struct
{
    a: Int32 = 0;
}
)";

        std::pmr::vector<std::string_view> const dependencies = { test_b_input };

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 19, 7, 32),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Type 'B.My_struct_2' does not exist.",
                .related_information = {},
            }
        };

        test_validate_module(input, dependencies, expected_diagnostics);
    }

    TEST_CASE("Validates that the module alias accessed by the custom type reference exists", "[Validation][Custom_type_reference]")
    {
        std::string_view const input = R"(module Test_a;

using My_type = B.My_struct;
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(3, 17, 3, 28),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                //.message = "Module alias 'B' does not exist.",
                .message = "Type 'My_struct' does not exist.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that the expression types of a for loop range begin, end and step_by match", "[Validation][For_loop_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    for index in 0 to value step_by 1 {
    }

    for index in 0.0f32 to value step_by 1 {
    }

    for index in 0 to 10.0f32 step_by 1 {
    }

    for index in 0 to 10 step_by 1.0f32 {
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(8, 28, 8, 33),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "For loop range end type 'Int32' does not match range begin type 'Float32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(11, 23, 11, 30),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "For loop range end type 'Float32' does not match range begin type 'Int32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(14, 34, 14, 40),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "For loop step_by type 'Float32' does not match range begin type 'Int32'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the expression types of a for loop range begin, end and step_by are numbers", "[Validation][For_loop_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
}

function run(value: Int32) -> ()
{
    for index in 0 to value step_by 1 {
    }

    for index in true to false step_by false {
    }

    var instance: My_struct = {};
    for index in instance to instance step_by instance {
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(13, 18, 13, 22),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "For loop range begin type 'Bool' is not a number.",
                .related_information = {},
            },
            {
                .range = create_source_range(17, 18, 17, 26),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "For loop range begin type 'My_struct' is not a number.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that if condition expression type is boolean", "[Validation][If_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    if value == 0
    {
    }
    else if value == 1
    {
    }

    if value
    {
    }
    else if value
    {
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            {
                .range = create_source_range(12, 8, 12, 13),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            },
            {
                .range = create_source_range(15, 13, 15, 18),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the expression type of a condition expression is a boolean", "[Validation][lf_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> (result: Int32)
{
    if value {
        return 0;
    }
    else if value == 0 {
        return 1;
    }
    else if true {
        return 2;
    }
    else if 1 {
        return 3;
    }
    else if 1cb {
        return 4;
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(5, 8, 5, 13),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            },
            {
                .range = create_source_range(14, 13, 14, 14),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that members are not duplicate", "[Validation][Instantiate_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    c: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var instance_0: My_struct = {
        a: 0,
        a: 0
    };
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            {
                .range = create_source_range(14, 9, 14, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate instantiate member 'a'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that members are sorted", "[Validation][Instantiate_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    c: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var instance_0: My_struct = {
        a: 0,
        c: 0
    };

    var instance_1: My_struct = {
        c: 0,
        a: 0
    };
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(17, 33, 20, 6),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Instantiate members are not sorted. They must appear in the order they were declarated in the struct declaration.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that all members exist if explicit is used", "[Validation][Instantiate_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    c: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var instance_0: My_struct = {
        a: 0,
        c: 0
    };

    var instance_1: My_struct = explicit {
        a: 0,
        c: 0
    };
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(17, 33, 20, 6),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'My_struct.b' is not set. Explicit instantiate expression requires all members to be set.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that all members set by the instantiate expression are actual members", "[Validation][Instantiate_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    c: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var instance_0: My_struct = {
        a: 0,
        c: 0
    };

    var instance_1: My_struct = explicit {
        d: 0
    };
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(18, 9, 18, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "'My_struct.d' does not exist.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that assigned value types match the member types", "[Validation][Instantiate_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var instance_0: My_struct = {
        a: 0.0f32
    };
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(11, 12, 11, 18),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot assign value of type 'Float32' to member 'My_struct.a' of type 'Int32'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that null can only be assigned to pointer types", "[Validation][Null_expression]")
    {
        std::string_view const input = R"(module Test;

function foo(pointer: *Int32, non_pointer: Int32) -> (result: *Int32)
{
    return null;
}

struct My_struct
{
    a: *Int32 = null;
    b: Int32 = null;
}

function run(value: Int32) -> (result: Int32)
{
    foo(null, null);
    
    var instance_0: My_struct = {
        a: null,
        b: null
    };

    var instance_1: My_struct = {};
    instance_1.a = null;
    instance_1.b = null;

    return null;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(11, 16, 11, 20),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot assign expression of type 'Null_pointer_type' to 'My_struct.b' of type 'Int32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(16, 15, 16, 19),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Argument 1 type is 'Int32' but 'Null_pointer_type' was provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(20, 12, 20, 16),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot assign value of type 'Null_pointer_type' to member 'My_struct.b' of type 'Int32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(23, 20, 23, 24),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expected type is 'Int32' but got 'Null_pointer_type'.",
                .related_information = {},
            },
            {
                .range = create_source_range(25, 5, 25, 16),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function 'run' expects a return value of type 'Int32', but 'Null_pointer_type' was provided.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that the expression type of a return expression matches the function output type", "[Validation][Return_expression]")
    {
        std::string_view const input = R"(module Test;

function run_void(value: Int32) -> ()
{
    if value == 0 {
        return;
    }
    else if value == 1 {
        return 1;
    }
}

function run_int32(value: Int32) -> (result: Int32)
{
    if value == 0 {
        return 1;
    }
    else if value == 1 {
        return;
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(9, 9, 9, 17),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function 'run_void' expects a return value of type 'void', but 'Int32' was provided.",
                .related_information = {},
            },
            {
                .range = create_source_range(19, 9, 19, 15),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Function 'run_int32' expects a return value of type 'Int32', but none was provided.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the expression type of a return expression is defined", "[Validation][Return_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    return Int32;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(5, 12, 5, 17),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'Int32' does not exist.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that the expression type of the switch input is an integer or an enum value", "[Validation][Switch_expression]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    A,
    B,
    C,
}

struct My_struct
{
    a: Int32 = 0;
}

function run(int_value: Int32, enum_value: My_enum) -> (result: Int32)
{
    switch int_value {
        default: {
            return 0;
        }
    }

    switch enum_value {
        default: {
            return 1;
        }
    }

    var instance: My_struct = {};
    switch instance {
        default: {
            return 2;
        }
    }

    var float_value = 0.0f32;
    switch float_value {
        default: {
            return 3;
        }
    }

    switch My_enum {
        default: {
            return 3;
        }
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(30, 12, 30, 20),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Switch condition type is 'My_struct' but expected an integer or an enum value.",
                .related_information = {},
            },
            {
                .range = create_source_range(37, 12, 37, 23),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Switch condition type is 'Float32' but expected an integer or an enum value.",
                .related_information = {},
            },
            {
                .range = create_source_range(43, 12, 43, 19),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Switch condition type is 'void' but expected an integer or an enum value.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the expression type of the switch case is an integer or an enum value", "[Validation][Switch_expression]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    A,
    B,
    C,
}

function run(int_value: Int32, enum_value: My_enum) -> (result: Int32)
{
    switch int_value {
        case 0: {
            return 0;
        }
        case 1.0f32: {
            return 1;
        }
        default: {
            return 2;
        }
    }

    switch enum_value {
        case My_enum.A: {
            return 3;
        }
    }

    return 4;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(16, 14, 16, 20),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Switch case value type 'Float32' does not match switch condition type 'Int32'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the expression type of the switch case must match the type of the input", "[Validation][Switch_expression]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    A,
    B,
    C,
}

enum My_enum_2
{
    A,
    B,
    C,
}

function run(int_value: Int32, enum_value: My_enum) -> (result: Int32)
{
    switch int_value {
        case My_enum.A: {
            return 0;
        }
    }

    switch enum_value {
        case 0: {
            return 1;
        }
        case My_enum_2.A: {
            return 2;
        }
    }

    return 3;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(20, 14, 20, 23),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Switch case value type 'My_enum' does not match switch condition type 'Int32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(26, 14, 26, 15),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Switch case value type 'Int32' does not match switch condition type 'My_enum'.",
                .related_information = {},
            },
            {
                .range = create_source_range(29, 14, 29, 25),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Switch case value type 'My_enum_2' does not match switch condition type 'My_enum'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the expression type of the switch case is a single constant expression", "[Validation][Switch_expression]")
    {
        std::string_view const input = R"(module Test;

enum My_enum
{
    A,
    B,
    C,
}

function run(enum_value: My_enum) -> (result: Int32)
{
    var enum_value_2 = My_enum.A;
    switch enum_value {
        case enum_value_2: {
            return 1;
        }
    }

    return 2;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(14, 14, 14, 26),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Switch case expression must be computable at compile-time, and evaluate to an integer or an enum value.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that the expression type of the condition expression is a boolean", "[Validation][Ternary_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> (result: Int32)
{
    var result_0 = value == 0 ? 0 : 1;
    var result_1 = value ? 0 : 1;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 20, 6, 25),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that the expression type of the then and else expressions matches", "[Validation][Ternary_expression]")
    {
        std::string_view const input = R"(module Test;

function run(condition: Bool) -> (result: Int32)
{
    var result_0 = condition ? 0 : 1;
    var result_1 = condition ? 0 : 1.0f32;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(6, 20, 6, 42),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Ternary condition expression requires both branches to be of the same type. Left side type 'Int32' does not match right side type 'Float32'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that numeric unary operations can only be applied to numbers", "[Validation][Unary_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
}

function run() -> ()
{
    mutable int_value = 0;
    mutable float_value = 0.0f32;

    var result_0 = -int_value;
    var result_1 = -float_value;
    
    var result_2 = ~int_value;
    var result_3 = ~float_value;

    var instance: My_struct = {};
    var result_4 = -instance;
    var result_5 = ~instance;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(16, 20, 16, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply unary operation '~' to expression.",
                .related_information = {},
            },
            {
                .range = create_source_range(19, 20, 19, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply unary operation '-' to expression.",
                .related_information = {},
            },
            {
                .range = create_source_range(20, 20, 20, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply unary operation '~' to expression.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that logical unary operations can only be applied to booleans", "[Validation][Unary_expression]")
    {
        std::string_view const input = R"(module Test;

function run() -> ()
{
    var boolean_value = true;
    var result_0 = !boolean_value;

    var int_value = 0;
    var result_1 = !int_value;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(9, 20, 9, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply unary operation '!' to expression.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates unary operations related to pointers", "[Validation][Unary_expression]")
    {
        std::string_view const input = R"(module Test;

function run() -> ()
{
    var int_value = 0;
    var result_0 = &int_value;
    var result_1 = &0;

    var result_2 = *result_0;
    var result_3 = *result_2;
    var result_4 = *0;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 20, 7, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply unary operation '&' to expression.",
                .related_information = {},
            },
            {
                .range = create_source_range(10, 20, 10, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply unary operation '*' to expression.",
                .related_information = {},
            },
            {
                .range = create_source_range(11, 20, 11, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot apply unary operation '*' to expression.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that a variable declaration name is not a duplicate", "[Validation][Variable_declaration_expression]")
    {
        std::string_view const input = R"(module Test;

function run(c: Int32) -> ()
{
    var a = 0;
    var b = 1;
    var b = 2;
    var c = 3;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 9, 7, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate variable name 'b'.",
                .related_information = {},
            },
            {
                .range = create_source_range(8, 9, 8, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate variable name 'c'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates that a variable declaration right side expression type is not void", "[Validation][Variable_declaration_expression]")
    {
        std::string_view const input = R"(module Test;

function get_non_void_value() -> (result: Int32)
{
    return 0;
}

function get_void_value() -> ()
{
}

function run() -> ()
{
    var a = get_non_void_value();
    var b = get_void_value();
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(15, 13, 15, 29),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Cannot assign expression of type 'void' to variable 'b'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }
    
    
    TEST_CASE("Validates that a variable declaration with type name is not a duplicate", "[Validation][Variable_declaration_with_type_expression]")
    {
        std::string_view const input = R"(module Test;

function run(c: Int32) -> ()
{
    var a: Int32 = 0;
    var b: Int32 = 1;
    var b: Int32 = 2;
    var c: Int32 = 3;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 9, 7, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate variable name 'b'.",
                .related_information = {},
            },
            {
                .range = create_source_range(8, 9, 8, 10),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Duplicate variable name 'c'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates the right hand side type of a variable declaration with type is equal to the type", "[Validation][Variable_declaration_with_type_expression]")
    {
        std::string_view const input = R"(module Test;

function get_value() -> (result: Float32)
{
}

function run() -> ()
{
    var a: Int32 = 0;
    var b: Int32 = 1.0f32;
    var c: Int32 = get_value();
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(10, 20, 10, 26),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Float32' does not match expected type 'Int32'.",
                .related_information = {},
            },
            {
                .range = create_source_range(11, 20, 11, 31),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Float32' does not match expected type 'Int32'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates the right hand side type of a variable declaration with type is a value, not a type", "[Validation][Variable_declaration_with_type_expression]")
    {
        std::string_view const input = R"(module Test;

function run() -> ()
{
    var a: Int32 = Int32;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(5, 20, 5, 25),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'Int32' does not exist.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }

    TEST_CASE("Validates the right hand side expression is an instantiate expression when variable type is a struct or union", "[Validation][Variable_declaration_with_type_expression]")
    {
        std::string_view const input = R"(module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Float32 = 0.0f32;
}

union My_union
{
    a: Int32;
    b: Float32;
}

function run() -> ()
{
    var instance_0: My_struct = {
        a: 0,
        b: 0.0f32
    };
    var instance_1: My_struct = 1.0f32;

    var instance_2: My_union = { b: 0.0f32 };
    var instance_3: My_union = 0;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(21, 33, 21, 39),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Float32' does not match expected type 'My_struct'.",
                .related_information = {},
            },
            {
                .range = create_source_range(24, 32, 24, 33),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'My_union'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that a variable name must exist", "[Validation][Variable_expression]")
    {
        std::string_view const input = R"(module Test;

function run(a: Int32) -> ()
{
    var b = 0;
    var c = a + b;
    var d = c + e;
    var e = d + f;
    var f = f;
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(7, 17, 7, 18),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'e' does not exist.",
                .related_information = {},
            },
            {
                .range = create_source_range(8, 17, 8, 18),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'f' does not exist.",
                .related_information = {},
            },
            {
                .range = create_source_range(9, 13, 9, 14),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Variable 'f' does not exist.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }


    TEST_CASE("Validates that the expression type of a condition expression is a boolean", "[Validation][While_loop_expression]")
    {
        std::string_view const input = R"(module Test;

function run(value: Int32) -> ()
{
    while value == 0 {
    }

    while value {
    }
}
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(8, 11, 8, 16),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Expression type 'Int32' does not match expected type 'Bool'.",
                .related_information = {},
            },
        };

        test_validate_module(input, {}, expected_diagnostics);
    }
    
    
    TEST_CASE("Validates that number of bits cannot be larger than 64", "[Validation][Integer]")
    {
        std::string_view const input = R"(module Test;

using My_int = Int65;
using My_uint = Uint65;
)";

        std::pmr::vector<h::compiler::Diagnostic> expected_diagnostics =
        {
            h::compiler::Diagnostic
            {
                .range = create_source_range(3, 16, 3, 21),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Number of bits of integer cannot be larger than 64.",
                .related_information = {},
            },
            {
                .range = create_source_range(4, 17, 4, 23),
                .source = Diagnostic_source::Compiler,
                .severity = Diagnostic_severity::Error,
                .message = "Number of bits of integer cannot be larger than 64.",
                .related_information = {},
            }
        };

        test_validate_module(input, {}, expected_diagnostics);
    }
}