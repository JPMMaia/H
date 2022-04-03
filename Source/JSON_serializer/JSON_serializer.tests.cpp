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

    TEST_CASE("Read Variable_expression::Type")
    {
        CHECK(h::json::read_enum<Variable_expression::Type>("function_argument") == Variable_expression::Type::Function_argument);
        CHECK(h::json::read_enum<Variable_expression::Type>("local_variable") == Variable_expression::Type::Local_variable);
        CHECK(h::json::read_enum<Variable_expression::Type>("temporary") == Variable_expression::Type::Temporary);
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
            .type = Variable_expression::Type::Local_variable,
            .id = 2
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Variable_expression> const output = h::json::read<Variable_expression>(reader, input_stream);

        REQUIRE(output.has_value());

        Variable_expression const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Binary_expression::Operation")
    {
        CHECK(h::json::read_enum<Binary_expression::Operation>("add") == Binary_expression::Operation::Add);
        CHECK(h::json::read_enum<Binary_expression::Operation>("subtract") == Binary_expression::Operation::Subtract);
        CHECK(h::json::read_enum<Binary_expression::Operation>("multiply") == Binary_expression::Operation::Multiply);
        CHECK(h::json::read_enum<Binary_expression::Operation>("signed_divide") == Binary_expression::Operation::Signed_divide);
        CHECK(h::json::read_enum<Binary_expression::Operation>("unsigned_divide") == Binary_expression::Operation::Unsigned_divide);
        CHECK(h::json::read_enum<Binary_expression::Operation>("less_than") == Binary_expression::Operation::Less_than);
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
                .type = Variable_expression::Type::Local_variable,
                .id = 3
            },
            .right_hand_side = Variable_expression
            {
                .type = Variable_expression::Type::Local_variable,
                .id = 1
            },
            .operation = Binary_expression::Operation::Subtract
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
                    "length": 2,
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
                .type = Variable_expression::Type::Local_variable,
                .id = 3
            },
            Variable_expression
            {
                .type = Variable_expression::Type::Temporary,
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

/*
    h::Function create_expected_function()
    {
        std::pmr::vector<Expression> expressions
        {
            {
                Expression{
                    .data = Binary_expression{
                        .left_hand_side = Variable_expression{
                            .type = Variable_expression::Type::Function_argument,
                            .id = 0
                        },
                        .right_hand_side = Variable_expression{
                            .type = Variable_expression::Type::Function_argument,
                            .id = 1
                        },
                        .operation = Binary_expression::Operation::Add
                    }
                },
                Expression{
                    .data = Return_expression{
                        .variable = Variable_expression{
                            .type = Variable_expression::Type::Temporary,
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

        std::pmr::vector<Type> parameter_types
        {
            {
                Type
                {
                    .data = Float_type
                    {
                        .precision = 64
                    },
                },
                    Type
                {
                    .data = Float_type
                    {
                        .precision = 64
                    }
                }
            }
        };

        std::pmr::vector<std::pmr::string> argument_names
        {
            "bar_0", "bar_1"
        };

        h::Function function
        {
            .type = Function_type
            {
                .return_type = Type
                {
                    .data = Float_type
                    {
                        .precision = 64
                    }
                },
                .parameter_types = std::move(parameter_types)
            },
            .name = "foo",
            .argument_ids = std::pmr::vector<std::uint64_t>{
                {
                    0, 1
                }
            },
            .argument_names = std::move(argument_names),
            .linkage = Linkage::External,
            .statements = std::move(statements)
        };

        return function;
    }

    TEST_CASE("Read json")
    {
        std::pmr::string const json_data = R"JSON(
        {
            "type": {
                "return_type": {
                    "type": "float_type",
                    "data": {
                        "precision": 64
                    }
                },
                "parameter_types": [
                    {
                        "type": "float_type",
                        "data": {
                            "precision": 64
                        }
                    },
                    {
                        "type": "float_type",
                        "data": {
                            "precision": 64
                        }
                    }
                ]
            },
            "name": "foo",
            "argument_ids": [
                0, 1
            ],
            "argument_names": [
                "bar_0", "bar_1"
            ],
            "linkage": "external",
            "statements": [
                {
                    "id": 0,
                    "name": "var_0",
                    "expressions": [
                        {
                            "type": "binary_expression",
                            "data": {
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
                            "type": "return_expression",
                            "data": {
                                "variable": {
                                    "type": "temporary",
                                    "id": 0
                                }
                            }
                        }
                    ]
                }
            ]
        }
        )JSON";

        h::Function const expected_function = create_expected_function();

        h::Json const json = h::Json::parse(json_data);

        h::Function const actual_function = h::to_function(json, {});

        CHECK(actual_function == expected_function);
    }*/
}
