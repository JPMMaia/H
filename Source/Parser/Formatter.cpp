module;

#include <cstdint>
#include <memory_resource>
#include <sstream>
#include <string>
#include <string_view>
#include <span>
#include <variant>
#include <vector>

module h.parser.formatter;

import h.core;
import h.core.declarations;

namespace h::parser
{
    static std::pmr::string to_string(String_buffer const& buffer)
    {
        return std::pmr::string{buffer.string_stream.str()};
    }

    static void add_text(
        String_buffer& buffer,
        std::string_view const text
    )
    {
        buffer.string_stream << text;
    }

    static void add_integer_text(
        String_buffer& buffer,
        std::int64_t const value
    )
    {
        buffer.string_stream << value;
    }

    static void add_integer_text(
        String_buffer& buffer,
        std::uint64_t const value
    )
    {
        buffer.string_stream << value;
    }

    static void add_new_line(
        String_buffer& buffer
    )
    {
        add_text(buffer, "\n");
    }

    static void add_indentation(
        String_buffer& buffer,
        std::uint32_t const indentation
    )
    {
        for (std::uint32_t index = 0; index < indentation; ++index)
            add_text(buffer, " ");
    }

    static void add_comment(
        String_buffer& buffer,
        std::string_view const comment,
        std::uint32_t const indentation
    )
    {
        add_text(buffer, "// ");

        for (std::size_t index = 0; index < comment.size(); ++index)
        {
            char const character = comment[index];
            
            if (character == '\n')
            {
                add_new_line(buffer);
                add_indentation(buffer, indentation);
                add_text(buffer, "// ");
            }
            else
            {
                add_text(buffer, std::string_view{&character, 1});
            }
        }

        add_new_line(buffer);
        add_indentation(buffer, indentation);
    }

    static std::optional<std::string_view> get_declaration_comment(
        Declaration const& declaration
    )
    {
        return std::nullopt;
    }

    static void add_format_declaration(
        String_buffer& buffer,
        h::Module const& core_module,
        Declaration const& declaration,
        bool const is_export,
        Format_options const& options
    )
    {
        std::optional<std::string_view> const comment = get_declaration_comment(declaration);
        if (comment.has_value())
            add_comment(buffer, comment.value(), 0);

        if (is_export)
            add_text(buffer, "export ");

        auto const visitor = [&](auto const& value) -> void
        {
            using Declaration_type = std::decay_t<decltype(value)>;

            if constexpr (std::is_same_v<Declaration_type, Alias_type_declaration const*>)
            {
                add_format_alias_type_declaration(buffer, *value, options);
            }
            else if constexpr (std::is_same_v<Declaration_type, Enum_declaration const*>)
            {
                add_format_enum_declaration(buffer, *value, options);
            }
            else if constexpr (std::is_same_v<Declaration_type, Function_declaration const*>)
            {
                add_format_function_declaration(buffer, *value, options);

                std::optional<Function_definition const*> function_definition = find_function_definition(core_module, value->name);
                if (function_definition.has_value())
                {
                    add_format_function_definition(buffer, *function_definition.value(), options);
                }
                else
                {
                    add_text(buffer, ";");
                }
            }
            else if constexpr (std::is_same_v<Declaration_type, Global_variable_declaration const*>)
            {
                add_format_global_variable_declaration(buffer, *value, options);
            }
            else if constexpr (std::is_same_v<Declaration_type, Struct_declaration const*>)
            {
                add_format_struct_declaration(buffer, *value, options);
            }
            else if constexpr (std::is_same_v<Declaration_type, Union_declaration const*>)
            {
                add_format_union_declaration(buffer, *value, options);   
            }
            
            // TODO add function constructor and type constructor
        };

        std::visit(visitor, declaration.data);
    }

    static void add_format_import_module_with_alias(
        String_buffer& buffer,
        Import_module_with_alias const& alias_import,
        Format_options const& options
    )
    {
        add_text(buffer, "import ");
        add_text(buffer, alias_import.module_name);
        add_text(buffer, " as ");
        add_text(buffer, alias_import.alias);
        add_text(buffer, ";");
    }

    void add_format_expression(
        String_buffer& buffer,
        Statement const& statement,
        Expression const& expression,
        std::uint32_t const indentation,
        Format_options const& options
    );

    static void add_format_statement(
        String_buffer& buffer,
        Statement const& statement,
        std::uint32_t indentation,
        Format_options const& options
    )
    {
        if (statement.expressions.size() > 0)
        {
            add_format_expression(buffer, statement, statement.expressions[0], indentation, options);
        }
    }

    void add_format_expression(
        String_buffer& buffer,
        Statement const& statement,
        Expression const& expression,
        std::uint32_t const indentation,
        Format_options const& options
    )
    {
        if (std::holds_alternative<Access_expression>(expression.data))
        {
            Access_expression const& value = std::get<Access_expression>(expression.data);
            add_format_expression_access(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Access_array_expression>(expression.data))
        {
            Access_array_expression const& value = std::get<Access_array_expression>(expression.data);
            add_format_expression_access_array(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Assignment_expression>(expression.data))
        {
            Assignment_expression const& value = std::get<Assignment_expression>(expression.data);
            add_format_expression_assignment(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Binary_expression>(expression.data))
        {
            Binary_expression const& value = std::get<Binary_expression>(expression.data);
            add_format_expression_binary(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Block_expression>(expression.data))
        {
            Block_expression const& value = std::get<Block_expression>(expression.data);
            add_format_expression_block(buffer, statement, value, indentation, options);
        }
        else if (std::holds_alternative<Break_expression>(expression.data))
        {
            Break_expression const& value = std::get<Break_expression>(expression.data);
            add_format_expression_break(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Call_expression>(expression.data))
        {
            Call_expression const& value = std::get<Call_expression>(expression.data);
            add_format_expression_call(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Cast_expression>(expression.data))
        {
            Cast_expression const& value = std::get<Cast_expression>(expression.data);
            add_format_expression_cast(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Compile_time_expression>(expression.data))
        {
            Compile_time_expression const& value = std::get<Compile_time_expression>(expression.data);
            add_format_expression_compile_time(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Continue_expression>(expression.data))
        {
            Continue_expression const& value = std::get<Continue_expression>(expression.data);
            add_format_expression_continue(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Constant_array_expression>(expression.data))
        {
            Constant_array_expression const& value = std::get<Constant_array_expression>(expression.data);
            add_format_expression_constant_array(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Constant_expression>(expression.data))
        {
            Constant_expression const& value = std::get<Constant_expression>(expression.data);
            add_format_expression_constant(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Defer_expression>(expression.data))
        {
            Defer_expression const& value = std::get<Defer_expression>(expression.data);
            add_format_expression_defer(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Dereference_and_access_expression>(expression.data))
        {
            Dereference_and_access_expression const& value = std::get<Dereference_and_access_expression>(expression.data);
            add_format_expression_dereference_and_access(buffer, statement, value, options);
        }
        else if (std::holds_alternative<For_loop_expression>(expression.data))
        {
            For_loop_expression const& value = std::get<For_loop_expression>(expression.data);
            add_format_expression_for_loop(buffer, statement, value, indentation, options);
        }
        else if (std::holds_alternative<If_expression>(expression.data))
        {
            If_expression const& value = std::get<If_expression>(expression.data);
            add_format_expression_if(buffer, statement, value, indentation, options);
        }
        else if (std::holds_alternative<Instantiate_expression>(expression.data))
        {
            Instantiate_expression const& value = std::get<Instantiate_expression>(expression.data);
            add_format_expression_instantiate(buffer, statement, value, indentation, options);
        }
        else if (std::holds_alternative<Invalid_expression>(expression.data))
        {
            Invalid_expression const& value = std::get<Invalid_expression>(expression.data);
            add_format_expression_invalid(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Null_pointer_expression>(expression.data))
        {
            Null_pointer_expression const& value = std::get<Null_pointer_expression>(expression.data);
            add_format_expression_null_pointer(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Parenthesis_expression>(expression.data))
        {
            Parenthesis_expression const& value = std::get<Parenthesis_expression>(expression.data);
            add_format_expression_parenthesis(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Reflection_expression>(expression.data))
        {
            Reflection_expression const& value = std::get<Reflection_expression>(expression.data);
            add_format_expression_reflection(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Return_expression>(expression.data))
        {
            Return_expression const& value = std::get<Return_expression>(expression.data);
            add_format_expression_return(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Switch_expression>(expression.data))
        {
            Switch_expression const& value = std::get<Switch_expression>(expression.data);
            add_format_expression_switch(buffer, statement, value, indentation, options);
        }
        else if (std::holds_alternative<Ternary_condition_expression>(expression.data))
        {
            Ternary_condition_expression const& value = std::get<Ternary_condition_expression>(expression.data);
            add_format_expression_ternary_condition(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Type_expression>(expression.data))
        {
            Type_expression const& value = std::get<Type_expression>(expression.data);
            add_format_expression_type(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Unary_expression>(expression.data))
        {
            Unary_expression const& value = std::get<Unary_expression>(expression.data);
            add_format_expression_unary(buffer, statement, value, options);
        }
        else if (std::holds_alternative<Variable_expression>(expression.data))
        {
            Variable_expression const& value = std::get<Variable_expression>(expression.data);
            add_format_expression_variable(buffer, statement, value, options);
        }
        else if (std::holds_alternative<While_loop_expression>(expression.data))
        {
            While_loop_expression const& value = std::get<While_loop_expression>(expression.data);
            add_format_expression_while_loop(buffer, statement, value, indentation, options);
        }
    }

    void add_format_expression_access(
        String_buffer& buffer,
        Statement const& statement,
        Access_expression const& expression,
        Format_options const& options
    )
    {
        add_format_expression(buffer, statement, get_expression(statement, expression.expression), 0, options);
        add_text(buffer, ".");
        add_text(buffer, expression.member_name);
    }

    void add_format_expression_access_array(
        String_buffer& buffer,
        Statement const& statement,
        Access_array_expression const& expression,
        Format_options const& options
    )
    {
        add_format_expression(buffer, statement, get_expression(statement, expression.expression), 0, options);
        add_text(buffer, "[");
        add_format_expression(buffer, statement, get_expression(statement, expression.index), 0, options);
        add_text(buffer, "]");
    }

    void add_format_expression_assignment(
        String_buffer& buffer,
        Statement const& statement,
        Assignment_expression const& expression,
        Format_options const& options
    )
    {
        add_format_expression(buffer, statement, get_expression(statement, expression.left_hand_side), 0, options);
        if (expression.additional_operation)
        {
            add_text(buffer, " ");
            add_format_binary_operation_symbol(buffer, *expression.additional_operation);
        }
        add_text(buffer, "= ");
        add_format_expression(buffer, statement, get_expression(statement, expression.right_hand_side), 0, options);
    }

    void add_format_expression_binary(
        String_buffer& buffer,
        Statement const& statement,
        Binary_expression const& expression,
        Format_options const& options
    )
    {
        add_format_expression(buffer, statement, get_expression(statement, expression.left_hand_side), 0, options);
        add_text(buffer, " ");
        add_format_binary_operation_symbol(buffer, expression.operation);
        add_text(buffer, " ");
        add_format_expression(buffer, statement, get_expression(statement, expression.right_hand_side), 0, options);
    }

    void add_format_binary_operation_symbol(
        String_buffer& buffer,
        Binary_operation operation
    )
    {
        switch (operation)
        {
            case Binary_operation::Add:
                add_text(buffer, "+");
                break;
            case Binary_operation::Subtract:
                add_text(buffer, "-");
                break;
            case Binary_operation::Multiply:
                add_text(buffer, "*");
                break;
            case Binary_operation::Divide:
                add_text(buffer, "/");
                break;
            case Binary_operation::Modulus:
                add_text(buffer, "%");
                break;
            case Binary_operation::Equal:
                add_text(buffer, "==");
                break;
            case Binary_operation::Not_equal:
                add_text(buffer, "!=");
                break;
            case Binary_operation::Less_than:
                add_text(buffer, "<");
                break;
            case Binary_operation::Less_than_or_equal_to:
                add_text(buffer, "<=");
                break;
            case Binary_operation::Greater_than:
                add_text(buffer, ">");
                break;
            case Binary_operation::Greater_than_or_equal_to:
                add_text(buffer, ">=");
                break;
            case Binary_operation::Logical_and:
                add_text(buffer, "&&");
                break;
            case Binary_operation::Logical_or:
                add_text(buffer, "||");
                break;
            case Binary_operation::Bitwise_and:
                add_text(buffer, "&");
                break;
            case Binary_operation::Bitwise_or:
                add_text(buffer, "|");
                break;
            case Binary_operation::Bitwise_xor:
                add_text(buffer, "^");
                break;
            case Binary_operation::Bit_shift_left:
                add_text(buffer, "<<");
                break;
            case Binary_operation::Bit_shift_right:
                add_text(buffer, ">>");
                break;
            case Binary_operation::Has:
                add_text(buffer, "has");
                break;
        }
    }

    void add_format_expression_block(
        String_buffer& buffer,
        std::span<Statement const> const statements,
        std::uint32_t outside_indentation,
        Format_options const& options
    )
    {
        add_text(buffer, "{");
        
        for (Statement const& statement : statements)
        {
            add_new_line(buffer);

            add_indentation(buffer, outside_indentation + 4);
            add_format_statement(buffer, statement, outside_indentation + 4, options);
        }

        add_new_line(buffer);
        add_indentation(buffer, outside_indentation);
        add_text(buffer, "}");
    }

    void add_format_expression_block(
        String_buffer& buffer,
        Statement const& statement,
        Block_expression const& expression,
        std::uint32_t outside_indentation,
        Format_options const& options
    )
    {
        add_format_expression_block(buffer, expression.statements, outside_indentation, options);
    }

    void add_format_expression_break(
        String_buffer& buffer,
        Statement const& statement,
        Break_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, "break");
        if (expression.loop_count > 1)
        {
            add_text(buffer, " ");
            add_text(buffer, std::to_string(expression.loop_count));
        }
    }

    void add_format_expression_call(
        String_buffer& buffer,
        Statement const& statement,
        Call_expression const& expression,
        Format_options const& options
    )
    {
        add_format_expression(buffer, statement, get_expression(statement, expression.expression), 0, options);
        add_text(buffer, "(");
        for (std::size_t i = 0; i < expression.arguments.size(); ++i)
        {
            if (i > 0)
                add_text(buffer, ", ");
            add_format_expression(buffer, statement, get_expression(statement, expression.arguments[i]), 0, options);
        }
        add_text(buffer, ")");
    }

    void add_format_expression_cast(
        String_buffer& buffer,
        Statement const& statement,
        Cast_expression const& expression,
        Format_options const& options
    )
    {
        add_format_expression(buffer, statement, get_expression(statement, expression.source), 0, options);
        add_text(buffer, " as ");
        add_format_type_name(buffer, {&expression.destination_type, 1}, options);
    }

    void add_format_expression_compile_time(
        String_buffer& buffer,
        Statement const& statement,
        Compile_time_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, "comptime ");
        add_format_expression(buffer, statement, get_expression(statement, expression.expression), 0, options);
    }

    void add_format_expression_constant(
        String_buffer& buffer,
        Statement const& statement,
        Constant_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, expression.data);
    }

    void add_format_expression_constant_array(
        String_buffer& buffer,
        Statement const& statement,
        Constant_array_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, "[");
        for (std::size_t i = 0; i < expression.array_data.size(); ++i)
        {
            if (i > 0)
                add_text(buffer, ", ");

            add_format_statement(buffer, expression.array_data[i], 0, options);
        }
        add_text(buffer, "]");
    }

    void add_format_expression_continue(
        String_buffer& buffer,
        Statement const& statement,
        Continue_expression const&,
        Format_options const&
    )
    {
        add_text(buffer, "continue");
    }

    void add_format_expression_defer(
        String_buffer& buffer,
        Statement const& statement,
        Defer_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, "defer ");
        add_format_expression(buffer, statement, get_expression(statement, expression.expression_to_defer), 0, options);
    }
    
    void add_format_expression_dereference_and_access(
        String_buffer& buffer,
        Statement const& statement,
        Dereference_and_access_expression const& expression,
        Format_options const& options
    )
    {
        add_format_expression(buffer, statement, get_expression(statement, expression.expression), 0, options);
        add_text(buffer, "->"); 
        add_text(buffer, expression.member_name);
    }

    void add_format_expression_if(
        String_buffer& buffer,
        Statement const& statement,
        If_expression const& expression,
        std::uint32_t outside_indentation,
        Format_options const& options
    )
    {
        for (std::size_t index = 0; index < expression.series.size(); ++index)
        {
            Condition_statement_pair const& pair = expression.series[index];

            if (index > 0)
            {
                add_indentation(buffer, outside_indentation);
                add_text(buffer, "else ");
            }

            if (pair.condition)
            {
                add_text(buffer, "if ");
                add_format_statement(buffer, *pair.condition, 0, options);
                add_new_line(buffer);
            }

            add_format_expression_block(buffer, pair.then_statements, outside_indentation, options);
        }
    }

    void add_format_expression_instantiate(
        String_buffer& buffer,
        Statement const& statement,
        Instantiate_expression const& expression,
        std::uint32_t outside_indentation,
        Format_options const& options
    )
    {
        if (expression.type == Instantiate_expression_type::Explicit)
            add_text(buffer, "explicit ");
            
        add_text(buffer, "{");
        if (!expression.members.empty())
        {
            for (std::size_t i = 0; i < expression.members.size(); ++i)
            {
                if (i > 0)
                    add_text(buffer, ", ");
                    
                auto const& member = expression.members[i];
                add_text(buffer, member.member_name);
                add_text(buffer, ": ");
                add_format_statement(buffer, member.value, outside_indentation, options);
            }
        }
        add_text(buffer, "}");
    }

    void add_format_expression_invalid(
        String_buffer& buffer,
        Statement const& statement,
        Invalid_expression const& expression,
        Format_options const&
    )
    {
        add_text(buffer, expression.value);
    }

    void add_format_expression_for_loop(
        String_buffer& buffer,
        Statement const& statement,
        For_loop_expression const& expression,
        std::uint32_t outside_indentation,
        Format_options const& options
    )
    {
        add_text(buffer, "for ");
        add_text(buffer, expression.variable_name);
        add_text(buffer, " in ");
        add_format_expression(buffer, statement, get_expression(statement, expression.range_begin), outside_indentation, options);
        add_text(buffer, " to ");
        add_format_statement(buffer, expression.range_end, outside_indentation, options);
        
        if (expression.step_by)
        {
            add_text(buffer, " step_by ");
            add_format_expression(buffer, statement, get_expression(statement, *expression.step_by), outside_indentation, options);
        }

        add_text(buffer, " ");
        add_format_expression_block(buffer, {expression.then_statements}, outside_indentation, options);
    }

    void add_format_expression_null_pointer(
        String_buffer& buffer,
        Statement const& statement,
        Null_pointer_expression const&,
        Format_options const&
    )
    {
        add_text(buffer, "null");
    }

    void add_format_expression_parenthesis(
        String_buffer& buffer,
        Statement const& statement,
        Parenthesis_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, "(");
        add_format_expression(buffer, statement, get_expression(statement, expression.expression), 0, options);
        add_text(buffer, ")");
    }

    void add_format_expression_reflection(
        String_buffer& buffer,
        Statement const& statement,
        Reflection_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, expression.name);
        add_text(buffer, "(");
        for (std::size_t i = 0; i < expression.arguments.size(); ++i)
        {
            if (i > 0)
                add_text(buffer, ", ");
            add_format_expression(buffer, statement, get_expression(statement, expression.arguments[i]), 0, options);
        }
        add_text(buffer, ")");
    }

    void add_format_expression_return(
        String_buffer& buffer,
        Statement const& statement,
        Return_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, "return");
        if (expression.expression.has_value())
        {
            add_text(buffer, " ");
            add_format_expression(buffer, statement, get_expression(statement, *expression.expression), 0, options);
        }
    }

    void add_format_expression_switch(
        String_buffer& buffer,
        Statement const& statement,
        Switch_expression const& expression,
        std::uint32_t outside_indentation,
        Format_options const& options
    )
    {
        add_text(buffer, "switch ");
        add_format_expression(buffer, statement, get_expression(statement, expression.value), 0, options);
        add_text(buffer, "\n");
        add_indentation(buffer, outside_indentation);
        
        add_text(buffer, "{");

        for (Switch_case_expression_pair const& case_pair : expression.cases)
        {
            add_new_line(buffer);
            add_indentation(buffer, outside_indentation + 4);

            if (case_pair.case_value.has_value())
            {
                add_text(buffer, "case ");
                add_format_expression(buffer, statement, get_expression(statement, *case_pair.case_value), outside_indentation + 4, options);
            }
            else
            {
                add_text(buffer, "default");
            }
            add_text(buffer, ":");
            add_new_line(buffer);
            add_indentation(buffer, outside_indentation);

            add_format_expression_block(buffer, case_pair.statements, outside_indentation + 4, options);
        }

        add_new_line(buffer);
        add_indentation(buffer, outside_indentation);
        add_text(buffer, "}");
    }

    void add_format_expression_ternary_condition(
        String_buffer& buffer,
        Statement const& statement,
        Ternary_condition_expression const& expression,
        Format_options const& options
    )
    {
        add_format_expression(buffer, statement, get_expression(statement, expression.condition), 0, options);
        add_text(buffer, " ? ");
        add_format_statement(buffer, expression.then_statement, 0, options);
        add_text(buffer, " : ");
        add_format_statement(buffer, expression.else_statement, 0, options);
    }

    void add_format_expression_type(
        String_buffer& buffer,
        Statement const& statement,
        Type_expression const& expression,
        Format_options const& options
    )
    {
        add_format_type_name(buffer, {&expression.type, 1}, options);
    }

    void add_format_expression_unary(
        String_buffer& buffer,
        Statement const& statement,
        Unary_expression const& expression,
        Format_options const& options
    )
    {
        switch (expression.operation)
        {
            case Unary_operation::Not:
                add_text(buffer, "!");
                break;
            case Unary_operation::Bitwise_not:
                add_text(buffer, "~");
                break;
            case Unary_operation::Minus:
                add_text(buffer, "-");
                break;
            case Unary_operation::Indirection:
                add_text(buffer, "*");
                break;
            case Unary_operation::Address_of:
                add_text(buffer, "&");
                break;
        }
        
        add_format_expression(buffer, statement, get_expression(statement, expression.expression), 0, options);
    }

    void add_format_expression_variable(
        String_buffer& buffer,
        Statement const& statement,
        Variable_expression const& expression,
        Format_options const& options
    )
    {
        add_text(buffer, expression.name);
    }

    void add_format_expression_while_loop(
        String_buffer& buffer,
        Statement const& statement,
        While_loop_expression const& expression,
        std::uint32_t outside_indentation,
        Format_options const& options
    )
    {
        add_text(buffer, "while ");
        add_format_statement(buffer, expression.condition, outside_indentation, options);
        add_text(buffer, " ");
        add_format_expression_block(buffer, expression.then_statements, outside_indentation, options);
    }

    void add_format_type_name(
        String_buffer& buffer,
        std::span<Type_reference const> types,
        Format_options const& options
    )
    {
        if (types.empty())
        {
            add_text(buffer, "void");
            return;
        }

        Type_reference const& type = types[0];

        // TODO: Implement type name formatting similar to Type_utilities.get_type_name
        auto const visitor = [&](auto const& value)
        {
            using Value_type = std::decay_t<decltype(value)>;

            if constexpr (std::is_same_v<Value_type, Builtin_type_reference>)
            {
                add_text(buffer, value.value);
            }
            else if constexpr (std::is_same_v<Value_type, Custom_type_reference>)
            {
                add_text(buffer, value.module_reference.name);
                add_text(buffer, ".");
                add_text(buffer, value.name);
            }
            else if constexpr (std::is_same_v<Value_type, Integer_type>)
            {
                add_text(buffer, value.is_signed ? "Int" : "Uint");
                add_integer_text(buffer, static_cast<std::uint64_t>(value.number_of_bits));
            }
            
            // TODO add rest
        };
        
        std::visit(visitor, type.data);
    }

    void add_format_function_declaration(
        String_buffer& buffer,
        Function_declaration const& function_declaration,
        Format_options const& options
    )
    {
        add_text(buffer, "function ");
        add_text(buffer, function_declaration.name);
        
        add_text(buffer, "(");
        for (std::size_t i = 0; i < function_declaration.input_parameter_names.size(); ++i)
        {
            if (i > 0)
                add_text(buffer, ", ");
            add_text(buffer, function_declaration.input_parameter_names[i]);
            add_text(buffer, ": ");
            add_format_type_name(buffer, {&function_declaration.type.input_parameter_types[i], 1}, options);
        }
        if (function_declaration.type.is_variadic)
        {
            if (!function_declaration.input_parameter_names.empty())
                add_text(buffer, ", ");
            add_text(buffer, "...");
        }
        add_text(buffer, ")");

        add_text(buffer, " -> (");
        for (std::size_t i = 0; i < function_declaration.output_parameter_names.size(); ++i)
        {
            if (i > 0)
                add_text(buffer, ", ");
            add_text(buffer, function_declaration.output_parameter_names[i]);
            add_text(buffer, ": ");
            add_format_type_name(buffer, {&function_declaration.type.output_parameter_types[i], 1}, options);
        }
        add_text(buffer, ")");
    }

    void add_format_function_definition(
        String_buffer& buffer,
        Function_definition const& function_definition,
        Format_options const& options
    )
    {
        add_text(buffer, "\n{");
        for (Statement const& statement : function_definition.statements)
        {
            add_new_line(buffer);
            add_text(buffer, "    "); // 4-space indentation
            add_format_statement(buffer, statement, 4, options);
        }
        add_new_line(buffer);
        add_text(buffer, "}");
    }

    static void add_format_enum_value(
        String_buffer& buffer,
        Enum_value const& enum_value,
        std::uint32_t indentation,
        Format_options const& options
    )
    {
        std::string indentation_str(indentation, ' ');
        add_text(buffer, indentation_str);
        add_text(buffer, enum_value.name);
        if (enum_value.value)
        {
            add_text(buffer, " = ");
            add_format_statement(buffer, *enum_value.value, indentation, options);
        }
        add_text(buffer, ",");
    }

    void add_format_enum_declaration(
        String_buffer& buffer,
        Enum_declaration const& enum_declaration,
        Format_options const& options
    )
    {
        add_text(buffer, "enum ");
        add_text(buffer, enum_declaration.name);
        add_text(buffer, "\n{");
        
        for (Enum_value const& value : enum_declaration.values)
        {
            add_new_line(buffer);
            add_format_enum_value(buffer, value, 4, options);
        }
        
        add_new_line(buffer);
        add_text(buffer, "}");
    }

    void add_format_global_variable_declaration(
        String_buffer& buffer,
        Global_variable_declaration const& declaration,
        Format_options const& options
    )
    {
        add_text(buffer, declaration.is_mutable ? "mutable " : "var ");
        add_text(buffer, declaration.name);
        add_text(buffer, " = ");
        add_format_statement(buffer, declaration.initial_value, 0, options);
        add_text(buffer, ";");
    }

    void add_format_struct_declaration(
        String_buffer& buffer,
        Struct_declaration const& struct_declaration,
        Format_options const& options
    )
    {
        if (struct_declaration.is_packed)
            add_text(buffer, "packed ");
        if (struct_declaration.is_literal)
            add_text(buffer, "literal ");
            
        add_text(buffer, "struct ");
        add_text(buffer, struct_declaration.name);
        add_text(buffer, "\n{");

        for (std::size_t i = 0; i < struct_declaration.member_names.size(); ++i)
        {
            add_new_line(buffer);
            add_text(buffer, "    ");

            // Add member comment if exists
            auto member_comment_it = std::find_if(
                struct_declaration.member_comments.begin(),
                struct_declaration.member_comments.end(),
                [i](auto const& comment) { return comment.index == i; }
            );
            if (member_comment_it != struct_declaration.member_comments.end())
            {
                add_comment(buffer, member_comment_it->comment, 4);
                add_new_line(buffer);
                add_text(buffer, "    ");
            }

            // Member name and type
            add_text(buffer, struct_declaration.member_names[i]);
            add_text(buffer, ": ");
            add_format_type_name(buffer, {&struct_declaration.member_types[i], 1}, options);

            // Default value if exists
            if (i < struct_declaration.member_default_values.size())
            {
                add_text(buffer, " = ");
                add_format_statement(buffer, struct_declaration.member_default_values[i], 4, options);
            }

            add_text(buffer, ",");
        }

        if (!struct_declaration.member_names.empty())
            add_new_line(buffer);
        add_text(buffer, "}");
    }

    void add_format_union_declaration(
        String_buffer& buffer,
        Union_declaration const& union_declaration,
        Format_options const& options
    )
    {
        add_text(buffer, "union ");
        add_text(buffer, union_declaration.name);
        add_text(buffer, "\n{");

        for (std::size_t i = 0; i < union_declaration.member_names.size(); ++i)
        {
            add_new_line(buffer);
            add_text(buffer, "    ");

            // Add member comment if exists
            auto member_comment_it = std::find_if(
                union_declaration.member_comments.begin(),
                union_declaration.member_comments.end(),
                [i](auto const& comment) { return comment.index == i; }
            );
            if (member_comment_it != union_declaration.member_comments.end())
            {
                add_comment(buffer, member_comment_it->comment, 4);
                add_new_line(buffer);
                add_text(buffer, "    ");
            }

            // Member name and type
            add_text(buffer, union_declaration.member_names[i]);
            add_text(buffer, ": ");
            add_format_type_name(buffer, {&union_declaration.member_types[i], 1}, options);
            add_text(buffer, ",");
        }

        if (!union_declaration.member_names.empty())
            add_new_line(buffer);
        add_text(buffer, "}");
    }

    void add_format_alias_type_declaration(
        String_buffer& buffer,
        Alias_type_declaration const& alias_declaration,
        Format_options const& options
    )
    {
        add_text(buffer, "type ");
        add_text(buffer, alias_declaration.name);
        add_text(buffer, " = ");
        add_format_type_name(buffer, {alias_declaration.type.data(), alias_declaration.type.size()}, options);
        add_text(buffer, ";");
    }

    struct Declaration_info
    {
        Declaration declaration = {};
        bool is_export = false;
        std::optional<Source_location> const* source_location;
    };

    void add_sorted_declaration_info(
        std::pmr::vector<Declaration_info>& declaration_infos,
        Declaration_info element
    )
    {
        if (!element.source_location->has_value())
        {
            declaration_infos.push_back(element);
            return;
        }

        for (std::size_t index = 0; index < declaration_infos.size(); ++index)
        {
            Declaration_info const& current_element = declaration_infos[index];
            if (!current_element.source_location->has_value())
            {
                declaration_infos.push_back(element);
                return;
            }

            if (element.source_location->value() < current_element.source_location->value())
            {
                declaration_infos.insert(declaration_infos.begin() + index, element);
                return;
            }
        }

        declaration_infos.push_back(element);
    }

    void add_sorted_declaration_infos(
        std::pmr::vector<Declaration_info>& declaration_infos,
        Module_declarations const& declarations,
        bool const is_export
    )
    {
        auto const process = [&](auto const& declaration) -> void
        {
            Declaration_info info
            {
                .declaration = {.data = &declaration},
                .is_export = is_export,
                .source_location = &declaration.source_location
            };

            add_sorted_declaration_info(declaration_infos, info);
        };

        for (Alias_type_declaration const& declaration : declarations.alias_type_declarations)
            process(declaration);

        for (Enum_declaration const& declaration : declarations.enum_declarations)
            process(declaration);

        for (Global_variable_declaration const& declaration : declarations.global_variable_declarations)
            process(declaration);

        for (Struct_declaration const& declaration : declarations.struct_declarations)
            process(declaration);

        for (Union_declaration const& declaration : declarations.union_declarations)
            process(declaration);

        for (Function_declaration const& declaration : declarations.function_declarations)
            process(declaration);

        for (Function_constructor const& declaration : declarations.function_constructors)
            process(declaration);

        for (Type_constructor const& declaration : declarations.type_constructors)
            process(declaration);
    }

    std::pmr::vector<Declaration_info> get_declaration_infos(
        h::Module const& core_module,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        std::pmr::vector<Declaration_info> output{allocator};

        add_sorted_declaration_infos(
            output,
            core_module.export_declarations,
            true
        );

        add_sorted_declaration_infos(
            output,
            core_module.internal_declarations,
            false
        );

        return output;
    }

    std::pmr::string format_module(
        h::Module const& core_module,
        Format_options const& options
    )
    {
        String_buffer buffer;

        if (core_module.comment.has_value())
        {
            add_comment(buffer, core_module.comment.value(), 0);
            add_new_line(buffer);
        }

        add_text(buffer, "module ");
        add_text(buffer, core_module.name);
        add_text(buffer, ";");
        add_new_line(buffer);

        if (core_module.dependencies.alias_imports.size() > 0)
            add_new_line(buffer);

        for (Import_module_with_alias const& alias_import : core_module.dependencies.alias_imports)
        {
            add_format_import_module_with_alias(buffer, alias_import, options);
            add_new_line(buffer);
        }

        std::pmr::vector<Declaration_info> const declaration_infos = get_declaration_infos(core_module, options.temporaries_allocator);
        if (declaration_infos.size() > 0)
            add_new_line(buffer);

        for (Declaration_info const& declaration_info : declaration_infos)
        {
            add_format_declaration(buffer, core_module, declaration_info.declaration, declaration_info.is_export, options);
            add_new_line(buffer);
        }

        return to_string(buffer);
    }

    Expression const& get_expression(
        Statement const& statement,
        Expression_index const expression_index
    )
    {
        return statement.expressions[expression_index.expression_index];
    }
}
