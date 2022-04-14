#define CATCH_CONFIG_MAIN
#define CATCH_CONFIG_ENABLE_ALL_STRINGMAKERS
#include <catch2/catch.hpp>

#include <memory_resource>
#include <string>

#include <rapidjson/reader.h>

import h.core;
import h.json_serializer;

namespace h
{
    TEST_CASE("Read Language_version")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "major": 1,
                "minor": 2,
                "patch": 3
            }
        )JSON";

        Language_version const expected
        {
            .major = 1,
            .minor = 2,
            .patch = 3,
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Language_version> const output = h::json::read<Language_version>(reader, input_stream);

        REQUIRE(output.has_value());

        Language_version const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Type with Integer_type")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "integer_type": {
                    "precision": 32
                }
            }
        )JSON";

        Type const expected
        {
            .data = Integer_type
            {
                .precision = 32
            }
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Type> const output = h::json::read<Type>(reader, input_stream);

        REQUIRE(output.has_value());

        Type const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Type with Float_type")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "float_type": {
                    "precision": 32
                }
            }
        )JSON";

        Type const expected
        {
            .data = Float_type
            {
                .precision = 32
            }
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Type> const output = h::json::read<Type>(reader, input_stream);

        REQUIRE(output.has_value());

        Type const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Variable_expression_type")
    {
        CHECK(h::json::read_enum<Variable_expression_type>("function_argument") == Variable_expression_type::Function_argument);
        CHECK(h::json::read_enum<Variable_expression_type>("local_variable") == Variable_expression_type::Local_variable);
        CHECK(h::json::read_enum<Variable_expression_type>("temporary") == Variable_expression_type::Temporary);
    }

    TEST_CASE("Read Variable_expression")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "type": "local_variable",
                "id": 2
            }
            
        )JSON";

        Variable_expression const expected
        {
            .type = Variable_expression_type::Local_variable,
            .id = 2
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Variable_expression> const output = h::json::read<Variable_expression>(reader, input_stream);

        REQUIRE(output.has_value());

        Variable_expression const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Binary_operation")
    {
        CHECK(h::json::read_enum<Binary_operation>("add") == Binary_operation::Add);
        CHECK(h::json::read_enum<Binary_operation>("subtract") == Binary_operation::Subtract);
        CHECK(h::json::read_enum<Binary_operation>("multiply") == Binary_operation::Multiply);
        CHECK(h::json::read_enum<Binary_operation>("signed_divide") == Binary_operation::Signed_divide);
        CHECK(h::json::read_enum<Binary_operation>("unsigned_divide") == Binary_operation::Unsigned_divide);
        CHECK(h::json::read_enum<Binary_operation>("less_than") == Binary_operation::Less_than);
    }

    TEST_CASE("Read Binary_expression")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "left_hand_side": {
                    "type": "local_variable",
                    "id": 3
                },
                "right_hand_side": {
                    "type": "local_variable",
                    "id": 1
                },
                "operation": "subtract"
            }
        )JSON";

        Binary_expression const expected
        {
            .left_hand_side = Variable_expression
            {
                .type = Variable_expression_type::Local_variable,
                .id = 3
            },
            .right_hand_side = Variable_expression
            {
                .type = Variable_expression_type::Local_variable,
                .id = 1
            },
            .operation = Binary_operation::Subtract
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Binary_expression> const output = h::json::read<Binary_expression>(reader, input_stream);

        REQUIRE(output.has_value());

        Binary_expression const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Call_expression")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "function_name": "foo",
                "arguments": {
                    "size": 2,
                    "elements": [
                        {
                            "type": "local_variable",
                            "id": 3
                        },
                        {
                            "type": "temporary",
                            "id": 1
                        }
                    ]
                }
            }
        )JSON";

        std::pmr::vector<Variable_expression> arguments
        {
            Variable_expression
            {
                .type = Variable_expression_type::Local_variable,
                .id = 3
            },
            Variable_expression
            {
                .type = Variable_expression_type::Temporary,
                .id = 1
            }
        };

        Call_expression const expected
        {
            .function_name = "foo",
            .arguments = std::move(arguments)
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Call_expression> const output = h::json::read<Call_expression>(reader, input_stream);

        REQUIRE(output.has_value());

        Call_expression const& actual = output.value();
        CHECK(actual == expected);
    }

    h::Function_declaration create_expected_function_declaration()
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
            .name = "Add",
            .return_type = Type{.data = Integer_type{.precision = 32}},
            .parameter_types = std::move(parameter_types),
            .parameter_ids = std::move(parameter_ids),
            .parameter_names = std::move(parameter_names),
            .linkage = Linkage::External
        };
    }

    TEST_CASE("Read Function_declaration")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "name": "Add",
                "return_type": {
                    "integer_type": {
                        "precision": 32
                    }
                },
                "parameter_types": {
                    "size": 2,
                    "elements": [
                        {
                            "integer_type": {
                                "precision": 32
                            }
                        },
                        {
                            "integer_type": {
                                "precision": 32
                            }
                        }
                    ]
                },
                "parameter_ids": {
                    "size": 2,
                    "elements": [
                        0, 1
                    ]
                },
                "parameter_names": {
                    "size": 2,
                    "elements": [
                        "lhs", "rhs"
                    ]
                },
                "linkage": "external"
            }
        )JSON";

        h::Function_declaration const expected = create_expected_function_declaration();

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<h::Function_declaration> const output = h::json::read<h::Function_declaration>(reader, input_stream);

        REQUIRE(output.has_value());

        h::Function_declaration const& actual = output.value();
        CHECK(actual == expected);
    }

    h::Function_definition create_expected_function_definition()
    {
        std::pmr::vector<Expression> expressions
        {
            {
                Expression{
                    .data = Binary_expression{
                        .left_hand_side = Variable_expression{
                            .type = Variable_expression_type::Function_argument,
                            .id = 0
                        },
                        .right_hand_side = Variable_expression{
                            .type = Variable_expression_type::Function_argument,
                            .id = 1
                        },
                        .operation = Binary_operation::Add
                    }
                },
                Expression{
                    .data = Return_expression{
                        .variable = Variable_expression{
                            .type = Variable_expression_type::Temporary,
                            .id = 0
                        },
                    }
                }
            }
        };

        std::pmr::vector<Statement> statements
        {
            {
                Statement{
                    .id = 0,
                    .name = "var_0",
                    .expressions = std::move(expressions)
                }
            }
        };

        h::Function_definition function
        {
            .name = "Foo",
            .statements = std::move(statements)
        };

        return function;
    }

    TEST_CASE("Read Function_definition")
    {
        std::pmr::string const json_data = R"JSON(
        {
            "name": "Foo",
            "statements": {
                "size": 1,
                "elements": [
                    {
                        "id": 0,
                        "name": "var_0",
                        "expressions": {
                            "size": 2,
                            "elements": 
                            [
                                {
                                    "binary_expression": {
                                        "left_hand_side": {
                                            "type": "function_argument",
                                            "id": 0
                                        },
                                        "right_hand_side": {
                                            "type": "function_argument",
                                            "id": 1
                                        },
                                        "operation": "add"
                                    }
                                },
                                {
                                    "return_expression": {
                                        "variable": {
                                            "type": "temporary",
                                            "id": 0
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
        )JSON";

        h::Function_definition const expected = create_expected_function_definition();

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<h::Function_definition> const output = h::json::read<h::Function_definition>(reader, input_stream);

        REQUIRE(output.has_value());

        h::Function_definition const& actual = output.value();
        CHECK(actual == expected);
    }
}
