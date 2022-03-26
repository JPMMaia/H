#define CATCH_CONFIG_MAIN
#define CATCH_CONFIG_ENABLE_ALL_STRINGMAKERS
#include <catch2/catch.hpp>

#include <memory_resource>
#include <string>

#include <nlohmann/json.hpp>

import h.core;
import h.json_serializer;

namespace h
{
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
    }
}
