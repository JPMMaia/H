module;

#include <memory_resource>
#include <string_view>
#include <vector>

export module h.core.expressions;

import h.core;

namespace h
{
    export template <typename T>
        h::Expression create_expression(T expression)
    {
        return h::Expression
        {
            .data = std::move(expression)
        };
    }

    export h::Statement create_statement(std::pmr::vector<h::Expression> expressions);

    export h::Expression create_constant_expression(Type_reference type_reference, std::string_view const data);

    export h::Expression create_constant_array_expression(Type_reference type, std::pmr::vector<h::Statement> array_data);

    export std::pmr::vector<h::Expression> create_enum_value_expressions(std::string_view const enum_name, std::string_view const member_name);

    export h::Expression create_instantiate_expression(Instantiate_expression_type type, std::pmr::vector<Instantiate_member_value_pair> members);

    export h::Expression create_null_pointer_expression();
}
