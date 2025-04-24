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

    std::pmr::vector<h::Expression> create_enum_value_expressions(std::string_view const enum_name, std::string_view const member_name)
    {
        return
        {
            h::Expression
            {
                .data = h::Access_expression
                {
                    .expression = {
                        .expression_index = 1
                    },
                    .member_name = std::pmr::string{ member_name },
                    .access_type = h::Access_type::Read
                }
            },
            h::Expression
            {
                .data = h::Variable_expression
                {
                    .name = std::pmr::string{ enum_name },
                    .access_type = h::Access_type::Read
                }
            }
        };
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
}
