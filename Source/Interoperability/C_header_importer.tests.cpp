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

    h::Union_declaration const& find_union_declaration(h::c::C_header const& header, std::string_view const name)
    {
        std::span<h::Union_declaration const> const union_declarations = header.declarations.union_declarations;
        auto const location = std::find_if(union_declarations.begin(), union_declarations.end(), [name](h::Union_declaration const& union_declaration) -> bool { return union_declaration.name == name; });
        REQUIRE(location != union_declarations.end());
        return *location;
    }

    void check_enum_constant_value(h::Enum_declaration const& actual, std::size_t const value_index, std::string_view const value_expected_data)
    {
        auto const& expression_data = actual.values[value_index].value.value().expressions[0].data;

        REQUIRE(std::holds_alternative<h::Constant_expression>(expression_data));
        Constant_expression const& expression = std::get<h::Constant_expression>(expression_data);

        h::Integer_type const int32_type
        {
            .number_of_bits = 32,
            .is_signed = true
        };

        CHECK(expression == h::Constant_expression{ .type = int32_type, .data = std::pmr::string{value_expected_data} });
    }

    TEST_CASE("Import stdio.h C header creates 'puts' function declaration")
    {
        std::filesystem::path const c_headers_path = g_c_headers_location;
        std::filesystem::path const stdio_header_path = c_headers_path / "stdio.h";

        h::c::C_header const header = h::c::import_header(stdio_header_path);

        CHECK(header.path == stdio_header_path);

        h::Function_declaration const& actual = find_function_declaration(header, "puts");

        CHECK(actual.name == "puts");

        REQUIRE(actual.unique_name.has_value());
        CHECK(actual.unique_name.value() == "puts");

        {
            h::Type_reference const c_char_type_reference{ .data = h::Fundamental_type::C_char };
            h::Type_reference const c_char_const_pointer_type_reference{ .data = h::Pointer_type{.element_type = c_char_type_reference, .is_mutable = false } };
            CHECK(actual.type.input_parameter_types == std::pmr::vector<h::Type_reference>{c_char_const_pointer_type_reference});
        }

        {
            h::Type_reference const expected_return_type{ .data = h::Fundamental_type::C_int };

            REQUIRE(actual.type.output_parameter_types.size() == 1);
            CHECK(actual.type.output_parameter_types[0] == expected_return_type);
        }

        REQUIRE(actual.input_parameter_names.size() == 1);
        CHECK(!actual.input_parameter_names[0].empty());
        REQUIRE(actual.output_parameter_names.size() == 1);
        CHECK(!actual.output_parameter_names[0].empty());
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

        REQUIRE(actual.unique_name.has_value());
        CHECK(actual.unique_name.value() == "time_t");

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
        REQUIRE(actual.unique_name.has_value());
        CHECK(actual.unique_name.value() == "VkPhysicalDeviceType");

        REQUIRE(actual.values.size() >= 5);

        CHECK(actual.values[0].name == "VK_PHYSICAL_DEVICE_TYPE_OTHER");
        check_enum_constant_value(actual, 0, "0");

        CHECK(actual.values[1].name == "VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU");
        check_enum_constant_value(actual, 1, "1");

        CHECK(actual.values[2].name == "VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU");
        check_enum_constant_value(actual, 2, "2");

        CHECK(actual.values[3].name == "VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU");
        check_enum_constant_value(actual, 3, "3");

        CHECK(actual.values[4].name == "VK_PHYSICAL_DEVICE_TYPE_CPU");
        check_enum_constant_value(actual, 4, "4");
    }

    TEST_CASE("Import vulkan.h C header creates 'VkCommandPoolCreateInfo' enum")
    {
        std::filesystem::path const vulkan_headers_path = g_vulkan_headers_location;
        std::filesystem::path const vulkan_header_path = vulkan_headers_path / "vulkan" / "vulkan.h";

        h::c::C_header const header = h::c::import_header(vulkan_header_path);

        CHECK(header.path == vulkan_header_path);

        h::Struct_declaration const& actual = find_struct_declaration(header, "VkCommandPoolCreateInfo");

        CHECK(actual.name == "VkCommandPoolCreateInfo");

        REQUIRE(actual.unique_name.has_value());
        CHECK(actual.unique_name.value() == "VkCommandPoolCreateInfo");

        CHECK(actual.is_packed == false);
        CHECK(actual.is_literal == false);

        REQUIRE(actual.member_types.size() == 4);
        REQUIRE(actual.member_names.size() == 4);

        {
            CHECK(actual.member_names[0] == "sType");

            h::Enum_declaration const& expected_type_declaration = find_enum_declaration(header, "VkStructureType");
            h::Custom_type_reference const expected_type =
            {
                .module_reference = {
                    .name = {}
                },
                .name = expected_type_declaration.name
            };

            if (std::holds_alternative<h::Custom_type_reference>(actual.member_types[0].data))
            {
                h::Custom_type_reference const& alias_type_reference = std::get<h::Custom_type_reference>(actual.member_types[0].data);

                REQUIRE(alias_type_reference.module_reference.name == "");
                h::Alias_type_declaration const& alias_type_declaration = find_alias_type_declaration(header, alias_type_reference.name);
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
            h::Custom_type_reference const expected_type =
            {
                .module_reference = {
                    .name = {}
                },
                .name = expected_type_declaration.name
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

    TEST_CASE("Import vulkan.h C header creates 'VkClearColorValue' union")
    {
        std::filesystem::path const vulkan_headers_path = g_vulkan_headers_location;
        std::filesystem::path const vulkan_header_path = vulkan_headers_path / "vulkan" / "vulkan.h";

        h::c::C_header const header = h::c::import_header(vulkan_header_path);

        CHECK(header.path == vulkan_header_path);

        h::Union_declaration const& actual = find_union_declaration(header, "VkClearColorValue");

        CHECK(actual.name == "VkClearColorValue");

        REQUIRE(actual.unique_name.has_value());
        CHECK(actual.unique_name.value() == "VkClearColorValue");

        REQUIRE(actual.member_types.size() == 3);
        REQUIRE(actual.member_names.size() == 3);

        {
            CHECK(actual.member_names[0] == "float32");

            h::Constant_array_type const expected_type =
            {
                .value_type = {
                     h::Type_reference
                    {
                        .data = h::Fundamental_type::Float32
                    }
                },
                .size = 4
            };

            CHECK(actual.member_types[0] == h::Type_reference{ .data = expected_type });
        }

        {
            CHECK(actual.member_names[1] == "int32");

            h::Constant_array_type const expected_type =
            {
                .value_type = {
                    h::Type_reference
                    {
                        .data = h::Integer_type
                        {
                            .number_of_bits = 32,
                            .is_signed = true
                        }
                    }
                },
                .size = 4
            };

            CHECK(actual.member_types[1] == h::Type_reference{ .data = expected_type });
        }

        {
            CHECK(actual.member_names[2] == "uint32");

            h::Constant_array_type const expected_type =
            {
                .value_type = {
                    h::Type_reference
                    {
                        .data = h::Integer_type
                        {
                            .number_of_bits = 32,
                            .is_signed = false
                        }
                    }
                },
                .size = 4
            };

            CHECK(actual.member_types[2] == h::Type_reference{ .data = expected_type });
        }
    }
}
