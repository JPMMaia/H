module;

#include <memory_resource>
#include <string_view>
#include <string>
#include <vector>

module h.core.expressions;

import h.core;

namespace h
{
    h::Statement create_statement(std::pmr::vector<h::Expression> expressions)
    {
        return h::Statement
        {
            .expressions = std::move(expressions)
        };
    }

    h::Expression create_call_expression(std::uint64_t const left_hand_side_expression, std::pmr::vector<Expression_index> arguments)
    {
        return h::Expression
        {
            .data = h::Call_expression
            {
                .expression = {.expression_index = left_hand_side_expression},
                .arguments = std::move(arguments)
            }
        };
    }

    h::Expression create_constant_expression(Type_reference type_reference, std::string_view const data)
    {
        return h::Expression
        {
            .data = h::Constant_expression
            {
                .type = std::move(type_reference),
                .data = std::pmr::string{ data }
            }
        };
    }

    h::Expression create_constant_array_expression(std::pmr::vector<h::Statement> array_data)
    {
        return h::Expression
        {
            .data = h::Constant_array_expression
            {
                .array_data = std::move(array_data)
            }
        };
    }

    void add_enum_value_expressions(h::Statement& statement, std::string_view const enum_name, std::string_view const member_name)
    {
        h::Expression access_expression
        {
            .data = h::Access_expression
            {
                .expression = {
                    .expression_index = statement.expressions.size() + 1
                },
                .member_name = std::pmr::string{ member_name },
            }
        };

        statement.expressions.push_back(std::move(access_expression));

        h::Expression variable_expression
        {
            .data = h::Variable_expression
            {
                .name = std::pmr::string{ enum_name },
            }
        };

        statement.expressions.push_back(std::move(variable_expression));
    }

    std::pmr::vector<h::Expression> create_enum_value_expressions(std::string_view const enum_name, std::string_view const member_name)
    {
        h::Statement statement = {};
        add_enum_value_expressions(statement, enum_name, member_name);
        return statement.expressions;
    }

    h::Expression create_instantiate_expression(Instantiate_expression_type const type, std::pmr::vector<Instantiate_member_value_pair> members)
    {
        return h::Expression
        {
            .data = h::Instantiate_expression
            {
                .type = type,
                .members = std::move(members)
            }
        };
    }

    h::Expression create_null_pointer_expression()
    {
        return create_expression(h::Null_pointer_expression{});
    }

    h::Expression create_variable_expression(std::pmr::string name)
    {
        return h::Expression
        {
            .data = h::Variable_expression
            {
                .name = std::move(name),
            }
        };
    }
}
