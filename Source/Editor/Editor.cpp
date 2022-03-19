module;

#include <cstdint>
#include <memory_resource>
#include <span>
#include <string>
#include <variant>
#include <vector>

module h.editor;

import h.core;

namespace h::editor
{
    namespace
    {
        void update_index_if_local_variable(Variable_expression& variable, std::int64_t const value_to_add)
        {
            if (variable.type == h::Variable_expression::Type::Local_variable)
            {
                if (value_to_add > 0)
                {
                    variable.index += static_cast<std::size_t>(value_to_add);
                }
                else if (value_to_add < 0)
                {
                    variable.index -= static_cast<std::size_t>(-value_to_add);
                }
            }
        }

        void update_local_variable_indices(
            std::span<h::Statement> const statements,
            std::int64_t const value_to_add
        )
        {
            auto const update_local_variable_index = [value_to_add](auto&& expression)
            {
                using T = std::decay_t<decltype(expression)>;

                if constexpr (std::is_same_v<T, h::Binary_expression>)
                {
                    update_index_if_local_variable(expression.left_hand_side, value_to_add);
                    update_index_if_local_variable(expression.right_hand_side, value_to_add);
                }
                else if constexpr (std::is_same_v<T, h::Call_expression>)
                {
                    for (Variable_expression& argument : expression.arguments)
                    {
                        update_index_if_local_variable(argument, value_to_add);
                    }
                }
                else if constexpr (std::is_same_v<T, h::Constant_expression>)
                {
                }
                else if constexpr (std::is_same_v<T, h::Return_expression>)
                {
                    update_index_if_local_variable(expression.variable, value_to_add);
                }
                else if constexpr (std::is_same_v<T, h::Variable_expression>)
                {
                    update_index_if_local_variable(expression, value_to_add);
                }
                else
                {
                    static_assert(always_false_v<T>, "non-exhaustive visitor!");
                }
            };

            for (h::Statement& statement : statements)
            {
                for (h::Expression& expression : statement.expressions)
                {
                    std::visit(
                        update_local_variable_index,
                        expression.data
                    );
                }
            }
        }
    }

    void add_statement(
        h::Function& function,
        h::Statement statement,
        std::uint64_t const position
    )
    {
        if (position >= function.statements.size())
        {
            function.statements.push_back(statement);
            return;
        }

        auto const insert_location = function.statements.begin() + position;
        function.statements.insert(insert_location, std::move(statement));

        std::span<h::Statement> const statements_to_update
        {
            function.statements.data() + position + 1,
            function.statements.size() - (position + 1)
        };

        update_local_variable_indices(statements_to_update, 1);
    }

    void remove_statement(
        h::Function& function,
        std::uint64_t const position
    )
    {
        if (position >= function.statements.size())
        {
            return;
        }

        auto const erase_location = function.statements.begin() + position;
        function.statements.erase(erase_location);

        std::span<h::Statement> const statements_to_update
        {
            function.statements.data() + position,
            function.statements.size() - (position)
        };

        update_local_variable_indices(statements_to_update, -1);
    }
}
