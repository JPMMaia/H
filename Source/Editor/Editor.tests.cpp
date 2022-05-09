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

    TEST_CASE("Create constant expression template with style 0")
    {
        Code_format_segment const format = create_code_format_segment("${constant_type}${constant_value}", {}, {});

        HTML_template const actual = create_template(
            "h_constant_expression",
            format,
            {},
            {}
        );

        char const* const expected =
            "<template id=\"h_constant_expression\">"
            "<h_type_reference><span slot=\"type_name\"><slot name=\"type\"></slot></span></h_type_reference>"
            "<slot name=\"value\"></slot>"
            "</template>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create constant expression template instance")
    {
        h::Constant_expression const expression =
        {
            .type = Fundamental_type::Float16,
            .data = "0.5"
        };

        Fundamental_type_name_map const fundamental_type_name_map = create_default_fundamental_type_name_map(
            {}
        );

        HTML_template_instance const actual = create_constant_expression_instance(
            expression,
            fundamental_type_name_map,
            {},
            {}
        );

        char const* const expected =
            "<h_constant_expression>"
            "<span slot=\"type\">Float16</span>"
            "<span slot=\"value\">0.5</span>"
            "</h_constant_expression>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create return expression template with style 0")
    {
        Code_format_segment const format = create_code_format_segment("return ${expression}", {}, {});

        HTML_template const actual = create_template(
            "h_return_expression",
            format,
            {},
            {}
        );

        char const* const expected =
            "<template id=\"h_return_expression\">"
            "return "
            "<h_expression><slot name=\"expression\"></slot></h_expression>"
            "</template>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create variable expression template with style 0")
    {
        Code_format_segment const format = create_code_format_segment("${variable_name}", {}, {});

        HTML_template const actual = create_template(
            "h_variable_expression",
            format,
            {},
            {}
        );

        char const* const expected =
            "<template id=\"h_variable_expression\">"
            "<slot name=\"type\"></slot>"
            "<slot name=\"id\"></slot>"
            "<slot name=\"temporary\"></slot>"
            "</template>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create function argument variable expression template instance")
    {
        h::Variable_expression const expression
        {
            .type = Variable_expression_type::Function_argument,
            .id = 1
        };

        Fundamental_type_name_map const fundamental_type_name_map = create_default_fundamental_type_name_map(
            {}
        );

        HTML_template_instance const actual = create_variable_expression_instance(
            expression,
            std::nullopt,
            fundamental_type_name_map,
            {},
            {}
        );

        char const* const expected =
            "<h_variable_expression>"
            "<span slot=\"type\">function_argument</span>"
            "<span slot=\"id\">1</span>"
            "</h_variable_expression>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create temporary variable expression template instance")
    {
        HTML_template_instance const temporary_expression
        {
            .value = "<temporary_expression></temporary_expression>"
        };

        h::Variable_expression const expression
        {
            .type = Variable_expression_type::Temporary,
            .id = 1
        };

        Fundamental_type_name_map const fundamental_type_name_map = create_default_fundamental_type_name_map(
            {}
        );

        HTML_template_instance const actual = create_variable_expression_instance(
            expression,
            temporary_expression,
            fundamental_type_name_map,
            {},
            {}
        );

        char const* const expected =
            "<h_variable_expression>"
            "<span slot=\"type\">temporary</span>"
            "<span slot=\"id\">1</span>"
            "<span slot=\"temporary\">"
            "<temporary_expression></temporary_expression>"
            "</span>"
            "</h_variable_expression>";

        CHECK(actual.value == expected);
    }

    TEST_CASE("Create statement expression template with style 0")
    {
        Code_format_segment const format = create_code_format_segment("${statement};", {}, {});

        HTML_template const actual = create_template(
            "h_statement",
            format,
            {},
            {}
        );

        char const* const expected =
            "<template id=\"h_statement\">"
            "<slot name=\"id\"></slot>"
            "<slot name=\"name\"></slot>"
            "<slot name=\"expression\"></slot>"
            ";"
            "</template>";

        CHECK(actual.value == expected);
    }

    namespace
    {
        h::Statement create_statement()
        {
            std::pmr::vector<h::Expression> expressions
            {
                {
                    h::Expression{
                        .data = h::Binary_expression{
                            .left_hand_side = h::Variable_expression{
                                .type = h::Variable_expression_type::Function_argument,
                                .id = 0
                            },
                            .right_hand_side = h::Variable_expression{
                                .type = h::Variable_expression_type::Function_argument,
                                .id = 1
                            },
                            .operation = h::Binary_operation::Add
                        }
                    },
                    h::Expression{
                        .data = h::Return_expression{
                            .variable = h::Variable_expression{
                                .type = h::Variable_expression_type::Temporary,
                                .id = 0
                            },
                        }
                    }
                }
            };

            return h::Statement
            {
                .id = 0,
                .name = "var_0",
                .expressions = std::move(expressions)
            };
        }
    }

    TEST_CASE("Create statement template instance")
    {
        h::Statement const statement = create_statement();

        Fundamental_type_name_map const fundamental_type_name_map = create_default_fundamental_type_name_map(
            {}
        );

        HTML_template_instance const actual = create_statement_instance(
            statement,
            fundamental_type_name_map,
            {},
            {}
        );

        char const* const expected =
            "<h_statement>"
            "<span slot=\"id\">0</span>"
            "<span slot=\"name\">var_0</span>"
            "<span slot=\"expression\">"
            "<h_return_expression>"
            "<span slot=\"expression\">"
            "<h_binary_expression>"
            "<span slot=\"left_hand_side\">"
            "<h_variable_expression>"
            "<span slot=\"type\">function_argument</span>"
            "<span slot=\"id\">0</span>"
            "</h_variable_expression>"
            "</span>"
            "<span slot=\"right_hand_side\">"
            "<h_variable_expression>"
            "<span slot=\"type\">function_argument</span>"
            "<span slot=\"id\">1</span>"
            "</h_variable_expression>"
            "</span>"
            "<span slot=\"operation\">add</span>"
            "</h_binary_expression>"
            "</span>"
            "</h_return_expression>"
            "</span>"
            "</h_statement>";

        CHECK(actual.value == expected);
    }
}