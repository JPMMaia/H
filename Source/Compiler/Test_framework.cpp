module;

#include <span>
#include <string>
#include <vector>

module h.compiler.test_framework;

import h.core;
import h.core.types;
import h.parser.convertor;

namespace h::compiler
{
    struct Tests_info
    {
        
        std::pmr::vector<h::Function_declaration const*> test_function_declarations;
    };

    static std::pmr::vector<h::Function_declaration const*> get_test_function_declarations(
        std::span<h::Module const> const core_modules,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        // TODO
        return {};
    }

    h::Module create_test_module(
        std::span<h::Module const> const core_modules
    )
    {
        std::string_view const test_template = R"RAW(module {}.generated_tests_information;

{}

export using Test_function = function<() -> ()>;

var g_test_names: Array_slice::<*Char> = [
    {}
];

var g_tests: Array_slice::<Test_function> = [
    {}
];

@unique_name("hlang_get_test_count")
export function get_test_count() -> (result: Uint64)
{{
    return {};
}}

@unique_name("hlang_get_test_names")
export function get_test_names() -> (result: **Char)
{{
    return g_test_names.data;
}}

@unique_name("hlang_get_tests")
export function get_tests() -> (result: *Test_function)
{{
    return g_tests.data;
}}
)RAW";

        std::format(test_template, name, imports, test_names, test_pointers, test_count);
    }
}
