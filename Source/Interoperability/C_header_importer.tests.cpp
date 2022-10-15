#include <algorithm>
#include <compare>
#include <filesystem>
#include <span>
#include <stdexcept>
#include <string_view>
#include <system_error>
#include <variant>
#include <vector>

import h.core;
import h.c_header_converter;

#include <catch2/catch_all.hpp>

namespace h::c
{
    constexpr char const* g_c_headers_location = C_HEADERS_LOCATION;
    constexpr char const* g_vulkan_headers_location = VULKAN_HEADERS_LOCATION;

    h::Alias_type_declaration const& find_alias_type_declaration(h::c::C_header const& header, std::uint64_t const id)
    {
        std::span<h::Alias_type_declaration const> const declarations = header.declarations.alias_type_declarations;
        auto const location = std::find_if(declarations.begin(), declarations.end(), [id](h::Alias_type_declaration const& value) -> bool { return value.id == id; });
        REQUIRE(location != declarations.end());
        return *location;
    }

    h::Alias_type_declaration const& find_alias_type_declaration(h::c::C_header const& header, std::string_view const name)
    {
        std::span<h::Alias_type_declaration const> const declarations = header.declarations.alias_type_declarations;
        auto const location = std::find_if(declarations.begin(), declarations.end(), [name](h::Alias_type_declaration const& value) -> bool { return value.name == name; });
        REQUIRE(location != declarations.end());
        return *location;
    }

    h::Enum_declaration const& find_enum_declaration(h::c::C_header const& header, std::string_view const name)
    {
        std::span<h::Enum_declaration const> const declarations = header.declarations.enum_declarations;
        auto const location = std::find_if(declarations.begin(), declarations.end(), [name](h::Enum_declaration const& value) -> bool { return value.name == name; });
        REQUIRE(location != declarations.end());
        return *location;
    }

    h::Function_declaration const& find_function_declaration(h::c::C_header const& header, std::string_view const name)
    {
        std::span<h::Function_declaration const> const function_declarations = header.declarations.function_declarations;
        auto const location = std::find_if(function_declarations.begin(), function_declarations.end(), [name](h::Function_declaration const& function_declaration) -> bool { return function_declaration.name == name; });
        REQUIRE(location != function_declarations.end());
        return *location;
    }

    h::Struct_declaration const& find_struct_declaration(h::c::C_header const& header, std::string_view const name)
    {
        std::span<h::Struct_declaration const> const struct_declarations = header.declarations.struct_declarations;
        auto const location = std::find_if(struct_declarations.begin(), struct_declarations.end(), [name](h::Struct_declaration const& struct_declaration) -> bool { return struct_declaration.name == name; });
        REQUIRE(location != struct_declarations.end());
        return *location;
    }

    TEST_CASE("Import stdio.h C header creates 'puts' function declaration")
    {
        std::filesystem::path const c_headers_path = g_c_headers_location;
        std::filesystem::path const stdio_header_path = c_headers_path / "stdio.h";

        h::c::C_header const header = h::c::import_header(stdio_header_path);

        CHECK(header.path == stdio_header_path);

        h::Function_declaration const& actual = find_function_declaration(header, "puts");

        CHECK(actual.name == "puts");

        {
            h::Type_reference const expected_return_type{ .data = h::Fundamental_type::C_int };

            REQUIRE(actual.type.return_types.size() == 1);
            CHECK(actual.type.return_types[0] == expected_return_type);
        };

        {
            h::Type_reference const c_char_type_reference{ .data = h::Fundamental_type::C_char };
            h::Type_reference const c_char_const_pointer_type_reference{ .data = h::Pointer_type{.element_type = c_char_type_reference, .is_mutable = false } };
            CHECK(actual.type.parameter_types == std::pmr::vector<h::Type_reference>{c_char_const_pointer_type_reference});
        }

        CHECK(actual.parameter_ids.size() == 1);
        REQUIRE(actual.parameter_names.size() == 1);
        CHECK(!actual.parameter_names[0].empty());
        CHECK(actual.linkage == Linkage::External);
    }

    TEST_CASE("Import time.h C header creates 'time_t' typedef")
    {
        std::filesystem::path const c_headers_path = g_c_headers_location;
        std::filesystem::path const time_header_path = c_headers_path / "time.h";

        h::c::C_header const header = h::c::import_header(time_header_path);

        CHECK(header.path == time_header_path);

        h::Alias_type_declaration const& actual = find_alias_type_declaration(header, "time_t");

        CHECK(actual.name == "time_t");
        CHECK(!actual.type.empty());
    }

    TEST_CASE("Import vulkan.h C header creates 'VkPhysicalDeviceType' enum")
    {
        std::filesystem::path const vulkan_headers_path = g_vulkan_headers_location;
        std::filesystem::path const vulkan_header_path = vulkan_headers_path / "vulkan" / "vulkan.h";

        h::c::C_header const header = h::c::import_header(vulkan_header_path);

        CHECK(header.path == vulkan_header_path);

        h::Enum_declaration const& actual = find_enum_declaration(header, "VkPhysicalDeviceType");

        CHECK(actual.name == "VkPhysicalDeviceType");

        REQUIRE(actual.values.size() >= 5);

        CHECK(actual.values[0].name == "VK_PHYSICAL_DEVICE_TYPE_OTHER");
        CHECK(actual.values[0].value == 0);

        CHECK(actual.values[1].name == "VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU");
        CHECK(actual.values[1].value == 1);

        CHECK(actual.values[2].name == "VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU");
        CHECK(actual.values[2].value == 2);

        CHECK(actual.values[3].name == "VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU");
        CHECK(actual.values[3].value == 3);

        CHECK(actual.values[4].name == "VK_PHYSICAL_DEVICE_TYPE_CPU");
        CHECK(actual.values[4].value == 4);
    }

    TEST_CASE("Import vulkan.h C header creates 'VkCommandPoolCreateInfo' enum")
    {
        std::filesystem::path const vulkan_headers_path = g_vulkan_headers_location;
        std::filesystem::path const vulkan_header_path = vulkan_headers_path / "vulkan" / "vulkan.h";

        h::c::C_header const header = h::c::import_header(vulkan_header_path);

        CHECK(header.path == vulkan_header_path);

        h::Struct_declaration const& actual = find_struct_declaration(header, "VkCommandPoolCreateInfo");

        CHECK(actual.name == "VkCommandPoolCreateInfo");
        CHECK(actual.is_packed == false);
        CHECK(actual.is_literal == false);

        REQUIRE(actual.member_types.size() == 4);
        REQUIRE(actual.member_names.size() == 4);

        {
            CHECK(actual.member_names[0] == "sType");

            h::Enum_declaration const& expected_type_declaration = find_enum_declaration(header, "VkStructureType");
            h::Enum_type_reference const expected_type =
            {
                .module_reference = {
                    .name = {}
                },
                .id = expected_type_declaration.id
            };

            if (std::holds_alternative<h::Alias_type_reference>(actual.member_types[0].data))
            {
                h::Alias_type_reference const& alias_type_reference = std::get<h::Alias_type_reference>(actual.member_types[0].data);

                REQUIRE(alias_type_reference.module_reference.name == "");
                h::Alias_type_declaration const& alias_type_declaration = find_alias_type_declaration(header, alias_type_reference.id);
                REQUIRE(alias_type_declaration.type.size() == 1);

                CHECK(alias_type_declaration.type[0] == h::Type_reference{ .data = expected_type });
            }
            else
            {
                CHECK(actual.member_types[0] == h::Type_reference{ .data = expected_type });
            }
        }

        {
            CHECK(actual.member_names[1] == "pNext");

            h::Pointer_type const expected_type =
            {
                .element_type = {},
                .is_mutable = false
            };

            CHECK(actual.member_types[1] == h::Type_reference{ .data = expected_type });
        }

        {
            CHECK(actual.member_names[2] == "flags");

            h::Alias_type_declaration const& expected_type_declaration = find_alias_type_declaration(header, "VkCommandPoolCreateFlags");
            h::Alias_type_reference const expected_type =
            {
                .module_reference = {
                    .name = {}
                },
                .id = expected_type_declaration.id
            };

            CHECK(actual.member_types[2] == h::Type_reference{ .data = expected_type });
        }

        {
            CHECK(actual.member_names[3] == "queueFamilyIndex");

            h::Integer_type const expected_type =
            {
                .number_of_bits = 32,
                .is_signed = false
            };

            CHECK(actual.member_types[3] == h::Type_reference{ .data = expected_type });
        }
    }
}
