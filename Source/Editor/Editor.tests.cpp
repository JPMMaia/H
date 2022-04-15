#define CATCH_CONFIG_MAIN
#define CATCH_CONFIG_ENABLE_ALL_STRINGMAKERS
#include <catch2/catch.hpp>

import h.core;
import h.editor;

namespace h::editor
{
    TEST_CASE("Create code format segment")
    {
        Code_format_segment const format_segment = create_code_format_segment("${return_type} ${function_name}(${function_parameters});", {}, {});

        REQUIRE(format_segment.types.size() == 6);
        REQUIRE(format_segment.keywords.size() == 3);
        REQUIRE(format_segment.strings.size() == 3);

        REQUIRE(format_segment.types[0] == Code_format_segment::Type::Keyword);
        CHECK(format_segment.keywords[0] == Code_format_keyword::Return_type);

        REQUIRE(format_segment.types[1] == Code_format_segment::Type::String);
        CHECK(format_segment.strings[0] == " ");

        REQUIRE(format_segment.types[2] == Code_format_segment::Type::Keyword);
        CHECK(format_segment.keywords[1] == Code_format_keyword::Function_name);

        REQUIRE(format_segment.types[3] == Code_format_segment::Type::String);
        CHECK(format_segment.strings[1] == "(");

        REQUIRE(format_segment.types[4] == Code_format_segment::Type::Keyword);
        CHECK(format_segment.keywords[2] == Code_format_keyword::Function_parameters);

        REQUIRE(format_segment.types[5] == Code_format_segment::Type::String);
        CHECK(format_segment.strings[2] == ");");
    }

    h::Function_declaration create_function_declaration()
    {
        std::pmr::vector<Type> parameter_types
        {
            Type{.data = Integer_type{.precision = 32}},
            Type{.data = Integer_type{.precision = 32}},
        };

        std::pmr::vector<std::uint64_t> parameter_ids
        {
            0, 1
        };

        std::pmr::vector<std::pmr::string> parameter_names
        {
            "lhs", "rhs"
        };

        return h::Function_declaration
        {
            .name = "add",
            .return_type = Type{.data = Integer_type{.precision = 32}},
            .parameter_types = std::move(parameter_types),
            .parameter_ids = std::move(parameter_ids),
            .parameter_names = std::move(parameter_names),
            .linkage = Linkage::External
        };
    }

    TEST_CASE("Create function declaration text code with style 0")
    {
        Code_format_segment const function_declaration_format = create_code_format_segment("${return_type} ${function_name}(${function_parameters});", {}, {});
        Code_format_segment const parameters_format = create_code_format_segment("${parameter_type} ${parameter_name}", {}, {});

        Function_format_options const format_options
        {
            .parameter_separator = ", "
        };

        h::Function_declaration const function_declaration = create_function_declaration();

        Code_representation const representation = create_function_declaration_code(
            function_declaration_format,
            parameters_format,
            format_options,
            function_declaration
        );

        std::pmr::string const actual_text = create_text(representation);

        std::pmr::string const expected_text = "int32 add(int32 lhs, int32 rhs);";

        CHECK(actual_text == expected_text);
    }

    TEST_CASE("Create function declaration text code with style 1")
    {
        Code_format_segment const function_declaration_format = create_code_format_segment("function ${function_name}(${function_parameters}) -> ${return_type};", {}, {});
        Code_format_segment const parameters_format = create_code_format_segment("${parameter_name}: ${parameter_type}", {}, {});

        Function_format_options const format_options
        {
            .parameter_separator = ", "
        };

        h::Function_declaration const function_declaration = create_function_declaration();

        Code_representation const representation = create_function_declaration_code(
            function_declaration_format,
            parameters_format,
            format_options,
            function_declaration
        );

        std::pmr::string const actual_text = create_text(representation);

        std::pmr::string const expected_text = "function add(lhs: int32, rhs: int32) -> int32;";

        CHECK(actual_text == expected_text);
    }
}