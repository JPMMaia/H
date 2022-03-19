#define CATCH_CONFIG_MAIN
#define CATCH_CONFIG_ENABLE_ALL_STRINGMAKERS
#include <catch2/catch.hpp>

import h.core;
import h.editor;

TEST_CASE("Add/remove statement preserve variable references")
{
    using namespace h;

    Function_type const function_type
    {
        .return_type = Type
        {
            .data = Integer_type
            {
                .precision = 64
            }
        },
        .parameter_types = {}
    };

    Function function
    {
        .type = function_type,
        .name = "generate",
        .argument_names = {},
        .linkage = Linkage::External,
        .statements = {}
    };

    {
        Expression expression
        {
            .data = Constant_expression
            {
                .type = Type
                {
                    .data = Integer_type
                    {
                        .precision = 64
                    }
                },
                .data = Integer_constant
                {
                    .number_of_bits = 64,
                    .is_signed = false,
                    .value = 100,
                }
            }
        };

        Statement statement
        {
            .name = "var0",
            .expressions =
            {
                expression
            }
        };

        editor::add_statement(function, std::move(statement), 0);
    }

    REQUIRE(function.statements.size() == 1);
    CHECK(std::get<Integer_constant>(std::get<Constant_expression>(function.statements[0].expressions[0].data).data).value == 100);

    {
        Expression expression
        {
            .data = Return_expression
            {
                .variable = {.type = Variable_expression::Type::Local_variable, .index = 0 },
            }
        };

        Statement statement
        {
            .name = "return var0",
            .expressions =
            {
                expression
            }
        };

        editor::add_statement(function, std::move(statement), 1);
    }

    REQUIRE(function.statements.size() == 2);
    CHECK(std::get<Integer_constant>(std::get<Constant_expression>(function.statements[0].expressions[0].data).data).value == 100);
    CHECK(std::get<Return_expression>(function.statements[1].expressions[0].data).variable.index == 0);

    {
        Expression expression
        {
            .data = Constant_expression
            {
                .type = Type
                {
                    .data = Integer_type
                    {
                        .precision = 64
                    }
                },
                .data = Integer_constant
                {
                    .number_of_bits = 64,
                    .is_signed = false,
                    .value = 200,
                }
            }
        };

        Statement statement
        {
            .name = "var1",
            .expressions =
            {
                expression
            }
        };

        editor::add_statement(function, std::move(statement), 0);
    }

    REQUIRE(function.statements.size() == 3);
    CHECK(std::get<Integer_constant>(std::get<Constant_expression>(function.statements[0].expressions[0].data).data).value == 200);
    CHECK(std::get<Integer_constant>(std::get<Constant_expression>(function.statements[1].expressions[0].data).data).value == 100);
    CHECK(std::get<Return_expression>(function.statements[2].expressions[0].data).variable.index == 1);

    editor::remove_statement(function, 0);

    REQUIRE(function.statements.size() == 2);
    CHECK(std::get<Integer_constant>(std::get<Constant_expression>(function.statements[0].expressions[0].data).data).value == 100);
    CHECK(std::get<Return_expression>(function.statements[1].expressions[0].data).variable.index == 0);
}
