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

    TEST_CASE("Create type reference template")
    {
        Code_format_segment const format = create_code_format_segment(
            "${type_name}",
            {},
            {}
        );

        HTML_template const actual = create_template(
            "h_type_reference",
            format,
            {},
            {}
        );


        char const* const expected =
            "<template id=\"h_type_reference\">"
            "<slot name=\"type_name\"></slot>"
            "</template>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create function parameters template with style 0")
    {
        Code_format_segment const format = create_code_format_segment("${parameter_type} ${parameter_name}", {}, {});

        HTML_template const actual = create_template(
            "h_function_parameter",
            format,
            {},
            {}
        );

        char const* const expected =
            "<template id=\"h_function_parameter\">"
            "<h_type_reference><span slot=\"type_name\"><slot name=\"type\"></slot></span></h_type_reference>"
            " "
            "<slot name=\"name\"></slot>"
            "</template>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create function parameters template with style 1")
    {
        Code_format_segment const format = create_code_format_segment("${parameter_name}: ${parameter_type}", {}, {});

        HTML_template const actual = create_template(
            "h_function_parameter",
            format,
            {},
            {}
        );

        char const* const expected =
            "<template id=\"h_function_parameter\">"
            "<slot name=\"name\"></slot>"
            ": "
            "<h_type_reference><span slot=\"type_name\"><slot name=\"type\"></slot></span></h_type_reference>"
            "</template>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create function declaration template with style 0")
    {
        Code_format_segment const format = create_code_format_segment("${return_type} ${function_name}(${function_parameters})", {}, {});

        HTML_template const actual = create_template(
            "h_function_declaration",
            format,
            {},
            {}
        );

        char const* const expected =
            "<template id=\"h_function_declaration\">"
            "<h_type_reference><span slot=\"type_name\"><slot name=\"return_type\"></slot></span></h_type_reference>"
            " "
            "<slot name=\"name\"></slot>"
            "("
            "<slot name=\"parameters\"></slot>"
            ")"
            "</template>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create function declaration template with style 1")
    {
        Code_format_segment const format = create_code_format_segment("function ${function_name}(${function_parameters}) -> ${return_type}", {}, {});

        HTML_template const actual = create_template(
            "h_function_declaration",
            format,
            {},
            {}
        );

        char const* const expected =
            "<template id=\"h_function_declaration\">"
            "function"
            " "
            "<slot name=\"name\"></slot>"
            "("
            "<slot name=\"parameters\"></slot>"
            ")"
            " -> "
            "<h_type_reference><span slot=\"type_name\"><slot name=\"return_type\"></slot></span></h_type_reference>"
            "</template>";

        CHECK(actual.value == expected);
    }


    h::Function_declaration create_function_declaration()
    {
        std::pmr::vector<Type_reference> parameter_types
        {
            Type_reference{.data = Fundamental_type::Int32},
            Type_reference{.data = Fundamental_type::Int32},
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
            .return_type = Type_reference{.data = Fundamental_type::Int32},
            .parameter_types = std::move(parameter_types),
            .parameter_ids = std::move(parameter_ids),
            .parameter_names = std::move(parameter_names),
            .linkage = Linkage::External
        };
    }

    TEST_CASE("Create function declaration template instance")
    {
        h::Function_declaration const function_declaration = create_function_declaration();

        Fundamental_type_name_map const fundamental_type_name_map = create_default_fundamental_type_name_map(
            {}
        );

        Function_format_options const options
        {
            .parameter_separator = ", "
        };

        HTML_template_instance const actual = create_function_declaration_instance(
            function_declaration,
            fundamental_type_name_map,
            options,
            {},
            {}
        );

        char const* const expected =
            "<h_function_declaration>"
            "<span slot=\"name\">add</span>"
            "<span slot=\"return_type\">Int32</span>"
            "<span slot=\"parameters\">"
            "<h_function_parameter>"
            "<span slot=\"type\">Int32</span>"
            "<span slot=\"name\">lhs</span>"
            "</h_function_parameter>"
            ", "
            "<h_function_parameter>"
            "<span slot=\"type\">Int32</span>"
            "<span slot=\"name\">rhs</span>"
            "</h_function_parameter>"
            "</span>"
            "</h_function_declaration>";

        CHECK(actual.value == expected);
    }
}