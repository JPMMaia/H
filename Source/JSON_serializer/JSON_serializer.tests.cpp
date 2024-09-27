#include <memory_resource>
#include <string>
#include <variant>

#include <rapidjson/reader.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>

import h.core;
import h.json_serializer;
import h.json_serializer.operators;

using h::json::operators::operator<<;

#include <catch2/catch_all.hpp>

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

    TEST_CASE("Write Language_version")
    {
        Language_version const input
        {
            .major = 1,
            .minor = 2,
            .patch = 3,
        };

        std::string const expected = "{\"major\":1,\"minor\":2,\"patch\":3}";

        rapidjson::StringBuffer output_stream;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ output_stream };
        h::json::write(writer, input);

        std::string const actual = output_stream.GetString();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Type_reference with Fundamental_type")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "data": {
                    "type": "Fundamental_type",
                    "value": "Byte"
                }
            }
        )JSON";

        Type_reference const expected
        {
            .data = Fundamental_type::Byte
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Type_reference> const output = h::json::read<Type_reference>(reader, input_stream);

        REQUIRE(output.has_value());

        Type_reference const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Write Type_reference with Fundamental_type")
    {
        Type_reference const input
        {
            .data = Fundamental_type::Byte
        };

        std::string const expected = "{\"data\":{\"type\":\"Fundamental_type\",\"value\":\"Byte\"}}";

        rapidjson::StringBuffer output_stream;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ output_stream };
        h::json::write(writer, input);

        std::string const actual = output_stream.GetString();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Type_reference with Custom_type_reference")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "data": {
                    "type": "Custom_type_reference",
                    "value": {
                        "module_reference": {
                            "name": "module_foo"
                        },
                        "name": "custom_name"
                    }
                }
            }
        )JSON";

        Type_reference const expected
        {
            .data = Custom_type_reference
            {
                .module_reference = Module_reference{
                    .name = "module_foo"
                },
                .name = "custom_name"
            }
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Type_reference> const output = h::json::read<Type_reference>(reader, input_stream);

        REQUIRE(output.has_value());

        Type_reference const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Write Type_reference with Custom_type_reference")
    {
        Type_reference const input
        {
            .data = Custom_type_reference
            {
                .module_reference = Module_reference{
                    .name = "module_foo"
                },
                .name = "custom_name"
            }
        };

        std::string const expected = "{\"data\":{\"type\":\"Custom_type_reference\",\"value\":{\"module_reference\":{\"name\":\"module_foo\"},\"name\":\"custom_name\"}}}";

        rapidjson::StringBuffer output_stream;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ output_stream };
        h::json::write(writer, input);

        std::string const actual = output_stream.GetString();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Assignment_expression with optional value")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "left_hand_side": {
                    "expression_index": 1
                },
                "right_hand_side": {
                    "expression_index": 2
                },
                "additional_operation": "Add"
            }
        )JSON";

        Assignment_expression const expected
        {
            .left_hand_side = {.expression_index = 1},
            .right_hand_side = {.expression_index = 2},
            .additional_operation = Binary_operation::Add
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Assignment_expression> const output = h::json::read<Assignment_expression>(reader, input_stream);

        REQUIRE(output.has_value());

        Assignment_expression const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Write Assignment_expression with optional value")
    {
        Assignment_expression const input
        {
            .left_hand_side = {.expression_index = 1},
            .right_hand_side = {.expression_index = 2},
            .additional_operation = Binary_operation::Add
        };

        std::string const expected = "{\"left_hand_side\":{\"expression_index\":1},\"right_hand_side\":{\"expression_index\":2},\"additional_operation\":\"Add\"}";

        rapidjson::StringBuffer output_stream;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ output_stream };
        h::json::write(writer, input);

        std::string const actual = output_stream.GetString();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Assignment_expression without optional value")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "left_hand_side": {
                    "expression_index": 1
                },
                "right_hand_side": {
                    "expression_index": 2
                }
            }
        )JSON";

        Assignment_expression const expected
        {
            .left_hand_side = {.expression_index = 1},
            .right_hand_side = {.expression_index = 2},
            .additional_operation = std::nullopt
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Assignment_expression> const output = h::json::read<Assignment_expression>(reader, input_stream);

        REQUIRE(output.has_value());

        Assignment_expression const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Write Assignment_expression without optional value")
    {
        Assignment_expression const input
        {
            .left_hand_side = {.expression_index = 1},
            .right_hand_side = {.expression_index = 2},
            .additional_operation = std::nullopt
        };

        std::string const expected = "{\"left_hand_side\":{\"expression_index\":1},\"right_hand_side\":{\"expression_index\":2}}";

        rapidjson::StringBuffer output_stream;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ output_stream };
        h::json::write(writer, input);

        std::string const actual = output_stream.GetString();
        CHECK(actual == expected);
    }

    TEST_CASE("Read If_expression")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "series": {
                    "size": 2,
                    "elements": [
                        {
                            "condition": {
                                "expressions": {
                                    "size": 1,
                                    "elements": [
                                        {
                                            "data": {
                                                "type": "Variable_expression",
                                                "value": {
                                                    "name": "some_boolean"
                                                }
                                            }
                                        }
                                    ]
                                }
                            },
                            "then_statements": {
                                "size": 1,
                                "elements": [
                                    {
                                        "expressions": {
                                            "size": 2,
                                            "elements": [
                                                {
                                                    "data": {
                                                        "type": "Return_expression",
                                                        "value": {
                                                            "expression": {
                                                                "expression_index": 1
                                                            }
                                                        }
                                                    }
                                                },
                                                {
                                                    "data": {
                                                        "type": "Variable_expression",
                                                        "value": {
                                                            "name": "value"
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            "then_statements": {
                                "size": 1,
                                "elements": [
                                    {
                                        "expressions": {
                                            "size": 2,
                                            "elements": [
                                                {
                                                    "data": {
                                                        "type": "Return_expression",
                                                        "value": {
                                                            "expression": {
                                                                "expression_index": 3
                                                            }
                                                        }
                                                    }
                                                },
                                                {
                                                    "data": {
                                                        "type": "Variable_expression",
                                                        "value": {
                                                            "name": "value"
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        )JSON";

        std::pmr::vector<Condition_statement_pair> expected_series
        {
            Condition_statement_pair
            {
                .condition = Statement
                {
                    .expressions = std::pmr::vector<Expression>
                    {
                        {
                            .data = Variable_expression
                            {
                                .name = "some_boolean"
                            }
                        }
                    }
                },
                .then_statements = {
                    Statement
                    {
                        .expressions = std::pmr::vector<Expression>
                        {
                            {
                                .data = Return_expression
                                {
                                    .expression = Expression_index
                                    {
                                        .expression_index = 1
                                    }
                                }
                            },
                            {
                                .data = Variable_expression
                                {
                                    .name = "value"
                                }
                            }
                        }
                    }
                }
            },
            Condition_statement_pair
            {
                .condition = std::nullopt,
                .then_statements = {
                    Statement
                    {
                        .expressions = std::pmr::vector<Expression>
                        {
                            {
                                .data = Return_expression
                                {
                                    .expression = Expression_index
                                    {
                                        .expression_index = 3
                                    }
                                }
                            },
                            {
                                .data = Variable_expression
                                {
                                    .name = "value"
                                }
                            }
                        }
                    }
                }
            }
        };

        If_expression const expected
        {
            .series = std::move(expected_series)
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<If_expression> const output = h::json::read<If_expression>(reader, input_stream);

        REQUIRE(output.has_value());

        If_expression const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Write If_expression")
    {
        std::pmr::vector<Condition_statement_pair> input_series
        {
            Condition_statement_pair
            {
                .condition = Statement
                {
                    .expressions = std::pmr::vector<Expression>
                    {
                        {
                            .data = Variable_expression
                            {
                                .name = "some_boolean",
                                .access_type = Access_type::Read
                            }
                        }
                    }
                },
                .then_statements = {
                    Statement
                    {
                        .expressions = std::pmr::vector<Expression>
                        {
                            {
                                .data = Return_expression
                                {
                                    .expression = Expression_index
                                    {
                                        .expression_index = 1
                                    }
                                }
                            },
                            {
                                .data = Variable_expression
                                {
                                    .name = "value",
                                    .access_type = Access_type::Read
                                }
                            }
                        }
                    }
                }
            },
            Condition_statement_pair
            {
                .condition = std::nullopt,
                .then_statements = {
                    Statement
                    {
                        .expressions = std::pmr::vector<Expression>
                        {
                            {
                                .data = Return_expression
                                {
                                    .expression = Expression_index
                                    {
                                        .expression_index = 3
                                    }
                                }
                            },
                            {
                                .data = Variable_expression
                                {
                                    .name = "value",
                                    .access_type = Access_type::Read
                                }
                            }
                        }
                    }
                }
            }
        };

        If_expression const input
        {
            .series = std::move(input_series)
        };

        std::string const expected = "{\"series\":{\"size\":2,\"elements\":[{\"condition\":{\"expressions\":{\"size\":1,\"elements\":[{\"data\":{\"type\":\"Variable_expression\",\"value\":{\"name\":\"some_boolean\",\"access_type\":\"Read\"}}}]}},\"then_statements\":{\"size\":1,\"elements\":[{\"expressions\":{\"size\":2,\"elements\":[{\"data\":{\"type\":\"Return_expression\",\"value\":{\"expression\":{\"expression_index\":1}}}},{\"data\":{\"type\":\"Variable_expression\",\"value\":{\"name\":\"value\",\"access_type\":\"Read\"}}}]}}]}},{\"then_statements\":{\"size\":1,\"elements\":[{\"expressions\":{\"size\":2,\"elements\":[{\"data\":{\"type\":\"Return_expression\",\"value\":{\"expression\":{\"expression_index\":3}}}},{\"data\":{\"type\":\"Variable_expression\",\"value\":{\"name\":\"value\",\"access_type\":\"Read\"}}}]}}]}}]}}";

        rapidjson::StringBuffer output_stream;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ output_stream };
        h::json::write(writer, input);

        std::string const actual = output_stream.GetString();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Variable_expression")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "name": "variable_name"
            }
            
        )JSON";

        Variable_expression const expected
        {
            .name = "variable_name"
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
        CHECK(h::json::read_enum<Binary_operation>("Add") == Binary_operation::Add);
        CHECK(h::json::read_enum<Binary_operation>("Subtract") == Binary_operation::Subtract);
        CHECK(h::json::read_enum<Binary_operation>("Multiply") == Binary_operation::Multiply);
        CHECK(h::json::read_enum<Binary_operation>("Divide") == Binary_operation::Divide);
        CHECK(h::json::read_enum<Binary_operation>("Less_than") == Binary_operation::Less_than);
    }

    TEST_CASE("Read Binary_expression")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "left_hand_side": {
                    "expression_index": 2
                },
                "right_hand_side": {
                    "expression_index": 3
                },
                "operation": "Subtract"
            }
        )JSON";

        Binary_expression const expected
        {
            .left_hand_side = Expression_index
            {
                .expression_index = 2
            },
            .right_hand_side = Expression_index
            {
                .expression_index = 3
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
                "expression": {
                    "expression_index": 4
                },
                "arguments": {
                    "size": 2,
                    "elements": [
                        {
                            "expression_index": 3
                        },
                        {
                            "expression_index": 1
                        }
                    ]
                }
            }
        )JSON";

        std::pmr::vector<Expression_index> arguments
        {
            Expression_index
            {
                .expression_index = 3
            },
            Expression_index
            {
                .expression_index = 1
            },
        };

        Call_expression const expected
        {
            .expression = {
                .expression_index = 4,
            },
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
        std::pmr::vector<Type_reference> input_parameter_types
        {
            Type_reference{.data = Fundamental_type::Byte},
            Type_reference{.data = Fundamental_type::Byte},
        };

        std::pmr::vector<Type_reference> output_parameter_types
        {
            Type_reference{.data = Fundamental_type::Byte},
        };

        std::pmr::vector<std::pmr::string> input_parameter_names
        {
            "lhs", "rhs"
        };

        std::pmr::vector<std::pmr::string> output_parameter_names
        {
            {"sum"}
        };

        h::Function_type function_type
        {
            .input_parameter_types = std::move(input_parameter_types),
            .output_parameter_types = std::move(output_parameter_types),
            .is_variadic = false
        };

        std::pmr::vector<h::Source_location> input_parameter_source_locations
        {
            {
                .line = 3,
                .column = 22
            }
        };

        std::pmr::vector<h::Source_location> output_parameter_source_locations
        {
            {
                .line = 3,
                .column = 38
            }
        };

        return h::Function_declaration
        {
            .name = "Add",
            .type = std::move(function_type),
            .input_parameter_names = std::move(input_parameter_names),
            .output_parameter_names = std::move(output_parameter_names),
            .linkage = Linkage::External,
            .source_location = Source_location
            {
                .line = 3,
                .column = 0
            },
            .input_parameter_source_locations = std::move(input_parameter_source_locations),
            .output_parameter_source_locations = std::move(output_parameter_source_locations)
        };
    }

    TEST_CASE("Read Function_declaration")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "name": "Add",
                "type": {
                    "input_parameter_types": {
                        "size": 2,
                        "elements": [
                            {
                                "data": {
                                    "type": "Fundamental_type",
                                    "value": "Byte"
                                }
                            },
                            {
                                "data": {
                                    "type": "Fundamental_type",
                                    "value": "Byte"
                                }
                            }
                        ]
                    },
                    "output_parameter_types": {
                        "size": 1,
                        "elements": [
                            {
                                "data": {
                                    "type": "Fundamental_type",
                                    "value": "Byte"
                                }
                            }
                        ]            
                    },
                    "is_variadic": false
                },
                "input_parameter_names": {
                    "size": 2,
                    "elements": [
                        "lhs", "rhs"
                    ]
                },
                "output_parameter_names": {
                    "size": 1,
                    "elements": [
                        "sum"
                    ]
                },
                "linkage": "External",
                "source_location": {
                    "line": 3,
                    "column": 0
                },
                "input_parameter_source_locations": {
                    "size": 1,
                    "elements": [
                        {
                            "line": 3,
                            "column": 22
                        }
                    ]
                },
                "output_parameter_source_locations": {
                    "size": 1,
                    "elements": [
                        {
                            "line": 3,
                            "column": 38
                        }
                    ]
                }
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
                    .data = Variable_expression{
                        .name = "lhs"
                    }
                },
                Expression{
                    .data = Variable_expression{
                        .name = "rhs"
                    }
                },
                Expression{
                    .data = Binary_expression{
                        .left_hand_side = Expression_index{
                            .expression_index = 0
                        },
                        .right_hand_side = Expression_index{
                            .expression_index = 1
                        },
                        .operation = Binary_operation::Add
                    }
                },
                Expression{
                    .data = Return_expression{
                        .expression = Expression_index{
                            .expression_index = 2
                        },
                    }
                }
            }
        };

        std::pmr::vector<Statement> statements
        {
            {
                Statement{
                    .expressions = std::move(expressions)
                }
            }
        };

        h::Function_definition function
        {
            .name = "Add",
            .statements = std::move(statements)
        };

        return function;
    }

    TEST_CASE("Read Function_definition")
    {
        std::pmr::string const json_data = R"JSON(
        {
            "name": "Add",
            "statements": {
                "size": 1,
                "elements": [
                    {
                        "expressions": {
                            "size": 4,
                            "elements": 
                            [
                                {
                                    "data": {
                                        "type": "Variable_expression",
                                        "value": {
                                            "name": "lhs"
                                        }
                                    }
                                },
                                {
                                    "data": {
                                        "type": "Variable_expression",
                                        "value": {
                                            "name": "rhs"
                                        }
                                    }
                                },
                                {
                                    "data": {
                                        "type": "Binary_expression",
                                        "value": {
                                            "left_hand_side": {
                                                "expression_index": 0
                                            },
                                            "right_hand_side": {
                                                "expression_index": 1
                                            },
                                            "operation": "Add"
                                        }
                                    }
                                },
                                {
                                    "data": {
                                        "type": "Return_expression",
                                        "value": {
                                            "expression": {
                                                "expression_index": 2
                                            }
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

    h::Module create_expected_module()
    {
        Language_version const language_version
        {
            .major = 1,
            .minor = 2,
            .patch = 3
        };

        Module_dependencies dependencies
        {
            .alias_imports = {
                {
                    .module_name = "C.Standard_library",
                    .alias = "Cstl",
                    .usages = { "puts" }
                }
            }
        };

        Module_declarations export_declarations
        {
            .function_declarations = create_expected_function_declaration()
        };

        Module_definitions definitions
        {
            .function_definitions = create_expected_function_definition()
        };

        return h::Module
        {
            .language_version = language_version,
            .name = "module_name",
            .dependencies = std::move(dependencies),
            .export_declarations = std::move(export_declarations),
            .internal_declarations = Module_declarations{},
            .definitions = std::move(definitions),
        };
    }

    TEST_CASE("Read Module")
    {
        std::pmr::string const json_data = R"JSON(
        {
            "language_version": {
                "major": 1,
                "minor": 2,
                "patch": 3
            },
            "name": "module_name",
            "dependencies": {
                "alias_imports": {
                    "size": 1,
                    "elements": [
                        {
                            "module_name": "C.Standard_library",
                            "alias": "Cstl",
                            "usages": {
                                "size": 1,
                                "elements": [
                                    "puts"
                                ]
                            }
                        }
                    ]
                }
            },
            "export_declarations": {
                "function_declarations": {
                    "size": 1,
                    "elements": [
                        {
                            "name": "Add",
                            "type": {
                                "input_parameter_types": {
                                    "size": 2,
                                    "elements": [
                                        {
                                            "data": {
                                                "type": "Fundamental_type",
                                                "value": "Byte"
                                            }
                                        },
                                        {
                                            "data": {
                                                "type": "Fundamental_type",
                                                "value": "Byte"
                                            }
                                        }
                                    ]
                                },
                                "output_parameter_types": {
                                    "size": 1,
                                    "elements": [
                                        {
                                            "data": {
                                                "type": "Fundamental_type",
                                                "value": "Byte"
                                            }
                                        }
                                    ]
                                },
                                "is_variadic": false
                            },
                            "input_parameter_names": {
                                "size": 2,
                                "elements": [
                                    "lhs", "rhs"
                                ]
                            },
                            "output_parameter_names": {
                                "size": 1,
                                "elements": [
                                    "sum"
                                ]
                            },
                            "linkage": "External",
                            "source_location": {
                                "line": 3,
                                "column": 0
                            },
                            "input_parameter_source_locations": {
                                "size": 1,
                                "elements": [
                                    {
                                        "line": 3,
                                        "column": 22
                                    }
                                ]
                            },
                            "output_parameter_source_locations": {
                                "size": 1,
                                "elements": [
                                    {
                                        "line": 3,
                                        "column": 38
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            "internal_declarations": {
                "function_declarations": {
                    "size": 0,
                    "elements": []
                }
            },
            "definitions": {
                "function_definitions": {
                    "size": 1,
                    "elements": [
                        {
                            "name": "Add",
                            "statements": {
                                "size": 1,
                                "elements": [
                                    {
                                        "expressions": {
                                            "size": 4,
                                            "elements": 
                                            [
                                                {
                                                    "data": {
                                                        "type": "Variable_expression",
                                                        "value": {
                                                            "name": "lhs"
                                                        }
                                                    }
                                                },
                                                {
                                                    "data": {
                                                        "type": "Variable_expression",
                                                        "value": {
                                                            "name": "rhs"
                                                        }
                                                    }
                                                },
                                                {
                                                    "data": {
                                                        "type": "Binary_expression",
                                                        "value": {
                                                            "left_hand_side": {
                                                                "expression_index": 0
                                                            },
                                                            "right_hand_side": {
                                                                "expression_index": 1
                                                            },
                                                            "operation": "Add"
                                                        }
                                                    }
                                                },
                                                {
                                                    "data": {
                                                        "type": "Return_expression",
                                                        "value": {
                                                            "expression": {
                                                                "expression_index": 2
                                                            }
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        }
        )JSON";

        h::Module const expected = create_expected_module();

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<h::Module> const output = h::json::read<h::Module>(reader, input_stream);

        REQUIRE(output.has_value());

        h::Module const actual = output.value();
        CHECK(actual == expected);
    }
}
