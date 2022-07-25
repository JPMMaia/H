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

#define CATCH_CONFIG_MAIN
//#define CATCH_CONFIG_ENABLE_ALL_STRINGMAKERS
#include <catch2/catch.hpp>

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
                "data_type": "fundamental_type",
                "data": "uint32"
            }
        )JSON";

        Type_reference const expected
        {
            .data = Fundamental_type::Uint32
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
            .data = Fundamental_type::Uint32
        };

        std::string const expected = "{\"data_type\":\"fundamental_type\",\"data\":\"uint32\"}";

        rapidjson::StringBuffer output_stream;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ output_stream };
        h::json::write(writer, input);

        std::string const actual = output_stream.GetString();
        CHECK(actual == expected);
    }

    TEST_CASE("Read Type_reference with Struct_type_reference")
    {
        std::pmr::string const json_data = R"JSON(
            {
                "data_type": "struct_type_reference",
                "data": {
                    "module_reference": {
                        "name": "module_foo"
                    },
                    "id": 10
                }
            }
        )JSON";

        Type_reference const expected
        {
            .data = Struct_type_reference
            {
                .module_reference = Module_reference{
                    .name = "module_foo"
                },
                .id = 10
            }
        };

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data.c_str() };
        std::optional<Type_reference> const output = h::json::read<Type_reference>(reader, input_stream);

        REQUIRE(output.has_value());

        Type_reference const& actual = output.value();
        CHECK(actual == expected);
    }

    TEST_CASE("Write Type_reference with Struct_type_reference")
    {
        Type_reference const input
        {
            .data = Struct_type_reference
            {
                .module_reference = Module_reference{
                    .name = "module_foo"
                },
                .id = 10
            }
        };

        std::string const expected = "{\"data_type\":\"struct_type_reference\",\"data\":{\"module_reference\":{\"name\":\"module_foo\"},\"id\":10}}";

        rapidjson::StringBuffer output_stream;
        rapidjson::Writer<rapidjson::StringBuffer> writer{ output_stream };
        h::json::write(writer, input);

        std::string const actual = output_stream.GetString();
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
            .id = 125,
            .name = "Add",
            .return_type = Type_reference{.data = Fundamental_type::Int32},
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
                "id": 125,
                "name": "Add",
                "return_type": {
                    "data_type": "fundamental_type",
                    "data": "int32"
                },
                "parameter_types": {
                    "size": 2,
                    "elements": [
                        {
                            "data_type": "fundamental_type",
                            "data": "int32"
                        },
                        {
                            "data_type": "fundamental_type",
                            "data": "int32"
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
            .id = 125,
            .statements = std::move(statements)
        };

        return function;
    }

    TEST_CASE("Read Function_definition")
    {
        std::pmr::string const json_data = R"JSON(
        {
            "id": 125,
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
                                    "data_type": "binary_expression",
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
                                    "data_type": "return_expression",
                                    "data": {
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

    h::Module create_expected_module()
    {
        Language_version const language_version
        {
            .major = 1,
            .minor = 2,
            .patch = 3
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
            "export_declarations": {
                "function_declarations": {
                    "size": 1,
                    "elements": [
                        {
                            "id": 125,
                            "name": "Add",
                            "return_type": {
                                "data_type": "fundamental_type",
                                "data": "int32"
                            },
                            "parameter_types": {
                                "size": 2,
                                "elements": [
                                    {
                                        "data_type": "fundamental_type",
                                        "data": "int32"
                                    },
                                    {
                                        "data_type": "fundamental_type",
                                        "data": "int32"
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
                            "id": 125,
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
                                                    "data_type": "binary_expression",
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
                                                    "data_type": "return_expression",
                                                    "data": {
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

        h::Module const& actual = output.value();
        CHECK(actual == expected);
    }
}
