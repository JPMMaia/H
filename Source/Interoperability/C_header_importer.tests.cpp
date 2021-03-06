#include <algorithm>
#include <compare>
#include <filesystem>
#include <span>
#include <stdexcept>
#include <string_view>
#include <system_error>
#include <variant>
#include <vector>

#include <stdio.h>

import h.core;
import h.c_header_converter;

#define CATCH_CONFIG_MAIN
//#define CATCH_CONFIG_ENABLE_ALL_STRINGMAKERS
#include <catch2/catch.hpp>

namespace h
{
    constexpr char const* g_c_headers_location = C_HEADERS_LOCATION;

    Function_declaration const& find_function_declaration(h::c::C_header const& header, std::string_view const name)
    {
        std::span<Function_declaration const> const function_declarations = header.declarations.function_declarations;
        auto const location = std::find_if(function_declarations.begin(), function_declarations.end(), [name](Function_declaration const& function_declaration) -> bool { return function_declaration.name == name; });
        REQUIRE(location != function_declarations.end());
        return *location;
    }

    TEST_CASE("Import stdio.h C header creates 'puts' function declaration")
    {
        std::filesystem::path const c_headers_path = g_c_headers_location;
        std::filesystem::path const stdio_header_path = c_headers_path / "stdio.h";

        h::c::C_header const header = h::c::import_header(stdio_header_path);

        CHECK(header.path == stdio_header_path);

        Function_declaration const& actual = find_function_declaration(header, "puts");

        CHECK(actual.name == "puts");

        {
            Type_reference const expected_return_type{ .data = Fundamental_type::C_int };

            REQUIRE(actual.type.return_types.size() == 1);
            CHECK(actual.type.return_types[0] == expected_return_type);
        };

        {
            Type_reference const c_char_type_reference{ .data = Fundamental_type::C_char };
            Type_reference const c_char_const_pointer_type_reference{ .data = Pointer_type{.element_type = c_char_type_reference, .is_mutable = false } };
            CHECK(actual.type.parameter_types == std::pmr::vector<Type_reference>{c_char_const_pointer_type_reference});
        }

        CHECK(actual.parameter_ids.size() == 1);
        REQUIRE(actual.parameter_names.size() == 1);
        CHECK(!actual.parameter_names[0].empty());
        CHECK(actual.linkage == Linkage::External);
    }
}
