module;

#include <format>
#include <iostream>
#include <memory_resource>
#include <variant>
#include <vector>

export module h.json_serializer.read_json;

import h.core;

namespace h::json
{
    export enum class Event
    {
        Start_object,
        End_object,
        Start_array,
        End_array,
        Key,
        Value
    };

    export struct No_event_data
    {
    };

    export template<typename Output_type, typename Value_type>
        bool read_value(
            Output_type& output,
            std::string_view const key,
            Value_type const value
        )
    {
        if constexpr (std::is_arithmetic_v<Output_type> && std::is_arithmetic_v<Value_type>)
        {
            output = static_cast<Output_type>(value);
            return true;
        }
        else if constexpr (std::is_same_v<Output_type, std::pmr::string> && std::is_same_v<Value_type, std::string_view>)
        {
            output = value;
            return true;
        }
        else
        {
            std::cerr << std::format("Incompatible type found while parsing key '{}'.\n", key);
            return false;
        }
    }

    template<typename Object_type, typename Event_data>
    bool read_object(
        Object_type& output,
        Event const event,
        Event_data const event_data,
        std::pmr::vector<int>& state_stack,
        std::size_t const state_stack_position
    );

    export template<typename Output_type, typename Event_data>
        bool read_object(
            std::pmr::vector<Output_type>& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        if (state == 0)
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
        }
        else if (state == 1)
        {
            if (event == Event::Key)
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "size")
                    {
                        state = 2;
                        return true;
                    }
                    else if (event_data == "elements")
                    {
                        state = 3;
                        return true;
                    }
                }
            }
        }
        else if (state == 2)
        {
            if (event == Event::Value)
            {
                if constexpr (std::is_unsigned_v<Event_data>)
                {
                    output.reserve(event_data);
                    state = 1;
                    return true;
                }
            }
        }
        else if (state == 3)
        {
            if (event == Event::Start_array)
            {
                state = 4;
                return true;
            }
        }
        else if (state == 4)
        {
            if (event == Event::Value)
            {
                if constexpr ((std::is_arithmetic_v<Output_type> && std::is_arithmetic_v<Event_data>) || std::is_same_v<Output_type, std::pmr::string>)
                {
                    Output_type element;
                    if (!read_value(element, "array_element", event_data))
                    {
                        return false;
                    }
                    output.push_back(element);
                    return true;
                }
            }
            else if (event == Event::Start_object)
            {
                if constexpr (std::is_class_v<Output_type> && !std::is_same_v<Output_type, std::pmr::string>)
                {
                    output.emplace_back();
                    state = 5;
                    return read_object(output.back(), event, event_data, state_stack, state_stack_position + 1);
                }
            }
            else if (event == Event::End_array)
            {
                state = 6;
                return true;
            }
        }
        else if (state == 5)
        {
            if constexpr (std::is_class_v<Output_type> && !std::is_same_v<Output_type, std::pmr::string>)
            {
                if ((event == Event::End_object) && (state_stack_position + 2) == state_stack.size())
                {
                    if (!read_object(output.back(), event, event_data, state_stack, state_stack_position + 1))
                    {
                        return false;
                    }

                    state = 4;
                    return true;
                }
                else
                {
                    return read_object(output.back(), event, event_data, state_stack, state_stack_position + 1);
                }
            }
        }
        else if (state == 6)
        {
            if (event == Event::End_object)
            {
                state = 7;
                return true;
            }
        }

        return false;
    }

    export template<typename Enum_type, typename Event_value>
        bool read_enum(Enum_type& output, Event_value const value)
    {
        return false;
    };

    export template<>
        bool read_enum(Fundamental_type& output, std::string_view const value)
    {
        if (value == "bool")
        {
            output = Fundamental_type::Bool;
            return true;
        }
        else if (value == "byte")
        {
            output = Fundamental_type::Byte;
            return true;
        }
        else if (value == "float16")
        {
            output = Fundamental_type::Float16;
            return true;
        }
        else if (value == "float32")
        {
            output = Fundamental_type::Float32;
            return true;
        }
        else if (value == "float64")
        {
            output = Fundamental_type::Float64;
            return true;
        }
        else if (value == "any_type")
        {
            output = Fundamental_type::Any_type;
            return true;
        }
        else if (value == "c_bool")
        {
            output = Fundamental_type::C_bool;
            return true;
        }
        else if (value == "c_char")
        {
            output = Fundamental_type::C_char;
            return true;
        }
        else if (value == "c_schar")
        {
            output = Fundamental_type::C_schar;
            return true;
        }
        else if (value == "c_uchar")
        {
            output = Fundamental_type::C_uchar;
            return true;
        }
        else if (value == "c_short")
        {
            output = Fundamental_type::C_short;
            return true;
        }
        else if (value == "c_ushort")
        {
            output = Fundamental_type::C_ushort;
            return true;
        }
        else if (value == "c_int")
        {
            output = Fundamental_type::C_int;
            return true;
        }
        else if (value == "c_uint")
        {
            output = Fundamental_type::C_uint;
            return true;
        }
        else if (value == "c_long")
        {
            output = Fundamental_type::C_long;
            return true;
        }
        else if (value == "c_ulong")
        {
            output = Fundamental_type::C_ulong;
            return true;
        }
        else if (value == "c_longlong")
        {
            output = Fundamental_type::C_longlong;
            return true;
        }
        else if (value == "c_ulonglong")
        {
            output = Fundamental_type::C_ulonglong;
            return true;
        }

        std::cerr << std::format("Failed to read enum 'Fundamental_type' with value '{}'\n", value);
        return false;
    }

    export template<>
        bool read_enum(Variable_expression_type& output, std::string_view const value)
    {
        if (value == "function_argument")
        {
            output = Variable_expression_type::Function_argument;
            return true;
        }
        else if (value == "local_variable")
        {
            output = Variable_expression_type::Local_variable;
            return true;
        }
        else if (value == "temporary")
        {
            output = Variable_expression_type::Temporary;
            return true;
        }

        std::cerr << std::format("Failed to read enum 'Variable_expression_type' with value '{}'\n", value);
        return false;
    }

    export template<>
        bool read_enum(Binary_operation& output, std::string_view const value)
    {
        if (value == "add")
        {
            output = Binary_operation::Add;
            return true;
        }
        else if (value == "subtract")
        {
            output = Binary_operation::Subtract;
            return true;
        }
        else if (value == "multiply")
        {
            output = Binary_operation::Multiply;
            return true;
        }
        else if (value == "signed_divide")
        {
            output = Binary_operation::Signed_divide;
            return true;
        }
        else if (value == "unsigned_divide")
        {
            output = Binary_operation::Unsigned_divide;
            return true;
        }
        else if (value == "less_than")
        {
            output = Binary_operation::Less_than;
            return true;
        }

        std::cerr << std::format("Failed to read enum 'Binary_operation' with value '{}'\n", value);
        return false;
    }

    export template<>
        bool read_enum(Linkage& output, std::string_view const value)
    {
        if (value == "external")
        {
            output = Linkage::External;
            return true;
        }
        else if (value == "private")
        {
            output = Linkage::Private;
            return true;
        }

        std::cerr << std::format("Failed to read enum 'Linkage' with value '{}'\n", value);
        return false;
    }


    export template<typename Object_type, typename Event_data>
        bool read_object(
            Object_type& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        );

    export template<typename Event_data>
        bool read_object(
            Integer_type& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "number_of_bits")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "is_signed")
                    {
                        state = 4;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Integer_type' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.number_of_bits, "number_of_bits", event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.is_signed, "is_signed", event_data);
        }
        }

        std::cerr << "Error while reading 'Integer_type'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Builtin_type_reference& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "value")
                    {
                        state = 3;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Builtin_type_reference' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.value, "value", event_data);
        }
        }

        std::cerr << "Error while reading 'Builtin_type_reference'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Function_type& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "input_parameter_types")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "output_parameter_types")
                    {
                        state = 5;
                        return true;
                    }
                    else if (event_data == "is_variadic")
                    {
                        state = 7;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Function_type' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.input_parameter_types, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.input_parameter_types, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.input_parameter_types, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 6;
            return read_object(output.output_parameter_types, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 6:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.output_parameter_types, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.output_parameter_types, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 7:
        {
            state = 1;
            return read_value(output.is_variadic, "is_variadic", event_data);
        }
        }

        std::cerr << "Error while reading 'Function_type'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Pointer_type& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "element_type")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "is_mutable")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Pointer_type' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.element_type, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.element_type, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.element_type, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 1;
            return read_value(output.is_mutable, "is_mutable", event_data);
        }
        }

        std::cerr << "Error while reading 'Pointer_type'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Module_reference& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "name")
                    {
                        state = 3;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Module_reference' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.name, "name", event_data);
        }
        }

        std::cerr << "Error while reading 'Module_reference'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Alias_type_reference& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "module_reference")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "id")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Alias_type_reference' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        }

        std::cerr << "Error while reading 'Alias_type_reference'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Constant_array_type& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "value_type")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "size")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Constant_array_type' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.value_type, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.value_type, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.value_type, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 1;
            return read_value(output.size, "size", event_data);
        }
        }

        std::cerr << "Error while reading 'Constant_array_type'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Enum_type_reference& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "module_reference")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "id")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Enum_type_reference' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        }

        std::cerr << "Error while reading 'Enum_type_reference'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Struct_type_reference& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "module_reference")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "id")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Struct_type_reference' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.module_reference, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        }

        std::cerr << "Error while reading 'Struct_type_reference'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Type_reference& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "data")
                    {
                        state = 3;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Type_reference' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            if (event == Event::Start_object)
            {
                state = 5;
                return true;
            }
        }
        case 4:
        {
            if (event == Event::End_object)
            {
                state = 1;
                return true;
            }
        }
        case 5:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "type")
                {
                    state = 6;
                    return true;
                }
            }
        }
        case 6:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event_data == "alias_type_reference")
                {
                    output.data = Alias_type_reference{};
                    state = 7;
                    return true;
                }
                else if (event_data == "builtin_type_reference")
                {
                    output.data = Builtin_type_reference{};
                    state = 10;
                    return true;
                }
                else if (event_data == "constant_array_type")
                {
                    output.data = Constant_array_type{};
                    state = 13;
                    return true;
                }
                else if (event_data == "enum_type_reference")
                {
                    output.data = Enum_type_reference{};
                    state = 16;
                    return true;
                }
                else if (event_data == "fundamental_type")
                {
                    output.data = Fundamental_type{};
                    state = 19;
                    return true;
                }
                else if (event_data == "function_type")
                {
                    output.data = Function_type{};
                    state = 22;
                    return true;
                }
                else if (event_data == "integer_type")
                {
                    output.data = Integer_type{};
                    state = 25;
                    return true;
                }
                else if (event_data == "pointer_type")
                {
                    output.data = Pointer_type{};
                    state = 28;
                    return true;
                }
                else if (event_data == "struct_type_reference")
                {
                    output.data = Struct_type_reference{};
                    state = 31;
                    return true;
                }
            }
        }
        case 7:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 8;
                    return true;
                }
            }
        }
        case 8:
        {
            state = 9;
            return read_object(std::get<Alias_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 9:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Alias_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Alias_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 10:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 11;
                    return true;
                }
            }
        }
        case 11:
        {
            state = 12;
            return read_object(std::get<Builtin_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 12:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Builtin_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Builtin_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 13:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 14;
                    return true;
                }
            }
        }
        case 14:
        {
            state = 15;
            return read_object(std::get<Constant_array_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 15:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Constant_array_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Constant_array_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 16:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 17;
                    return true;
                }
            }
        }
        case 17:
        {
            state = 18;
            return read_object(std::get<Enum_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 18:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Enum_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Enum_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 19:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 20;
                    return true;
                }
            }
        }
        case 20:
        {
            state = 4;
            return read_enum(std::get<Fundamental_type>(output.data), event_data);
        }
        case 22:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 23;
                    return true;
                }
            }
        }
        case 23:
        {
            state = 24;
            return read_object(std::get<Function_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 24:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Function_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Function_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 25:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 26;
                    return true;
                }
            }
        }
        case 26:
        {
            state = 27;
            return read_object(std::get<Integer_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 27:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Integer_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Integer_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 28:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 29;
                    return true;
                }
            }
        }
        case 29:
        {
            state = 30;
            return read_object(std::get<Pointer_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 30:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Pointer_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Pointer_type>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 31:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 32;
                    return true;
                }
            }
        }
        case 32:
        {
            state = 33;
            return read_object(std::get<Struct_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 33:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Struct_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Struct_type_reference>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        }

        std::cerr << "Error while reading 'Type_reference'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Alias_type_declaration& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "id")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "name")
                    {
                        state = 4;
                        return true;
                    }
                    else if (event_data == "type")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Alias_type_declaration' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.name, "name", event_data);
        }
        case 5:
        {
            state = 6;
            return read_object(output.type, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 6:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.type, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.type, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Alias_type_declaration'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Enum_value& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "name")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "value")
                    {
                        state = 4;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Enum_value' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.name, "name", event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.value, "value", event_data);
        }
        }

        std::cerr << "Error while reading 'Enum_value'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Enum_declaration& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "id")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "name")
                    {
                        state = 4;
                        return true;
                    }
                    else if (event_data == "values")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Enum_declaration' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.name, "name", event_data);
        }
        case 5:
        {
            state = 6;
            return read_object(output.values, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 6:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.values, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.values, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Enum_declaration'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Struct_declaration& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "id")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "name")
                    {
                        state = 4;
                        return true;
                    }
                    else if (event_data == "member_types")
                    {
                        state = 5;
                        return true;
                    }
                    else if (event_data == "member_names")
                    {
                        state = 7;
                        return true;
                    }
                    else if (event_data == "is_packed")
                    {
                        state = 9;
                        return true;
                    }
                    else if (event_data == "is_literal")
                    {
                        state = 10;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Struct_declaration' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.name, "name", event_data);
        }
        case 5:
        {
            state = 6;
            return read_object(output.member_types, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 6:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.member_types, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.member_types, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 7:
        {
            state = 8;
            return read_object(output.member_names, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 8:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.member_names, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.member_names, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 9:
        {
            state = 1;
            return read_value(output.is_packed, "is_packed", event_data);
        }
        case 10:
        {
            state = 1;
            return read_value(output.is_literal, "is_literal", event_data);
        }
        }

        std::cerr << "Error while reading 'Struct_declaration'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Variable_expression& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "type")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "id")
                    {
                        state = 4;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Variable_expression' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_enum(output.type, event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        }

        std::cerr << "Error while reading 'Variable_expression'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Binary_expression& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "left_hand_side")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "right_hand_side")
                    {
                        state = 5;
                        return true;
                    }
                    else if (event_data == "operation")
                    {
                        state = 7;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Binary_expression' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.left_hand_side, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.left_hand_side, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.left_hand_side, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 6;
            return read_object(output.right_hand_side, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 6:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.right_hand_side, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.right_hand_side, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 7:
        {
            state = 1;
            return read_enum(output.operation, event_data);
        }
        }

        std::cerr << "Error while reading 'Binary_expression'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Call_expression& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "function_name")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "arguments")
                    {
                        state = 4;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Call_expression' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.function_name, "function_name", event_data);
        }
        case 4:
        {
            state = 5;
            return read_object(output.arguments, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 5:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.arguments, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.arguments, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Call_expression'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Constant_expression& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "type")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "data")
                    {
                        state = 4;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Constant_expression' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_enum(output.type, event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.data, "data", event_data);
        }
        }

        std::cerr << "Error while reading 'Constant_expression'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Return_expression& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "variable")
                    {
                        state = 3;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Return_expression' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.variable, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.variable, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.variable, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Return_expression'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Expression& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "data")
                    {
                        state = 3;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Expression' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            if (event == Event::Start_object)
            {
                state = 5;
                return true;
            }
        }
        case 4:
        {
            if (event == Event::End_object)
            {
                state = 1;
                return true;
            }
        }
        case 5:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "type")
                {
                    state = 6;
                    return true;
                }
            }
        }
        case 6:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event_data == "binary_expression")
                {
                    output.data = Binary_expression{};
                    state = 7;
                    return true;
                }
                else if (event_data == "call_expression")
                {
                    output.data = Call_expression{};
                    state = 10;
                    return true;
                }
                else if (event_data == "constant_expression")
                {
                    output.data = Constant_expression{};
                    state = 13;
                    return true;
                }
                else if (event_data == "return_expression")
                {
                    output.data = Return_expression{};
                    state = 16;
                    return true;
                }
                else if (event_data == "variable_expression")
                {
                    output.data = Variable_expression{};
                    state = 19;
                    return true;
                }
            }
        }
        case 7:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 8;
                    return true;
                }
            }
        }
        case 8:
        {
            state = 9;
            return read_object(std::get<Binary_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 9:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Binary_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Binary_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 10:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 11;
                    return true;
                }
            }
        }
        case 11:
        {
            state = 12;
            return read_object(std::get<Call_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 12:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Call_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Call_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 13:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 14;
                    return true;
                }
            }
        }
        case 14:
        {
            state = 15;
            return read_object(std::get<Constant_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 15:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Constant_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Constant_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 16:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 17;
                    return true;
                }
            }
        }
        case 17:
        {
            state = 18;
            return read_object(std::get<Return_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 18:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Return_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Return_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        case 19:
        {
            if constexpr (std::is_same_v<Event_data, std::string_view>)
            {
                if (event == Event::Key && event_data == "value")
                {
                    state = 20;
                    return true;
                }
            }
        }
        case 20:
        {
            state = 21;
            return read_object(std::get<Variable_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
        }
        case 21:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 1 == state_stack.size()))
            {
                if (!read_object(std::get<Variable_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1))
                {
                    return false;
                }

                state = 4;
                return true;
            }
            else
            {
                return read_object(std::get<Variable_expression>(output.data), event, event_data, state_stack, state_stack_position + 1 + 1);
            }
        }
        }

        std::cerr << "Error while reading 'Expression'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Statement& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "id")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "name")
                    {
                        state = 4;
                        return true;
                    }
                    else if (event_data == "expressions")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Statement' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.name, "name", event_data);
        }
        case 5:
        {
            state = 6;
            return read_object(output.expressions, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 6:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.expressions, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.expressions, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Statement'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Function_declaration& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "id")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "name")
                    {
                        state = 4;
                        return true;
                    }
                    else if (event_data == "type")
                    {
                        state = 5;
                        return true;
                    }
                    else if (event_data == "input_parameter_ids")
                    {
                        state = 7;
                        return true;
                    }
                    else if (event_data == "input_parameter_names")
                    {
                        state = 9;
                        return true;
                    }
                    else if (event_data == "output_parameter_ids")
                    {
                        state = 11;
                        return true;
                    }
                    else if (event_data == "output_parameter_names")
                    {
                        state = 13;
                        return true;
                    }
                    else if (event_data == "linkage")
                    {
                        state = 15;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Function_declaration' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.name, "name", event_data);
        }
        case 5:
        {
            state = 6;
            return read_object(output.type, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 6:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.type, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.type, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 7:
        {
            state = 8;
            return read_object(output.input_parameter_ids, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 8:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.input_parameter_ids, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.input_parameter_ids, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 9:
        {
            state = 10;
            return read_object(output.input_parameter_names, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 10:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.input_parameter_names, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.input_parameter_names, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 11:
        {
            state = 12;
            return read_object(output.output_parameter_ids, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 12:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.output_parameter_ids, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.output_parameter_ids, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 13:
        {
            state = 14;
            return read_object(output.output_parameter_names, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 14:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.output_parameter_names, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.output_parameter_names, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 15:
        {
            state = 1;
            return read_enum(output.linkage, event_data);
        }
        }

        std::cerr << "Error while reading 'Function_declaration'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Function_definition& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "id")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "statements")
                    {
                        state = 4;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Function_definition' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.id, "id", event_data);
        }
        case 4:
        {
            state = 5;
            return read_object(output.statements, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 5:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.statements, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.statements, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Function_definition'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Language_version& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "major")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "minor")
                    {
                        state = 4;
                        return true;
                    }
                    else if (event_data == "patch")
                    {
                        state = 5;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Language_version' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.major, "major", event_data);
        }
        case 4:
        {
            state = 1;
            return read_value(output.minor, "minor", event_data);
        }
        case 5:
        {
            state = 1;
            return read_value(output.patch, "patch", event_data);
        }
        }

        std::cerr << "Error while reading 'Language_version'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Module_declarations& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "alias_type_declarations")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "enum_declarations")
                    {
                        state = 5;
                        return true;
                    }
                    else if (event_data == "struct_declarations")
                    {
                        state = 7;
                        return true;
                    }
                    else if (event_data == "function_declarations")
                    {
                        state = 9;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Module_declarations' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.alias_type_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.alias_type_declarations, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.alias_type_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 6;
            return read_object(output.enum_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 6:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.enum_declarations, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.enum_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 7:
        {
            state = 8;
            return read_object(output.struct_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 8:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.struct_declarations, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.struct_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 9:
        {
            state = 10;
            return read_object(output.function_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 10:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.function_declarations, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.function_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Module_declarations'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Module_definitions& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "function_definitions")
                    {
                        state = 3;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Module_definitions' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.function_definitions, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.function_definitions, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.function_definitions, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Module_definitions'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Module& output,
            Event const event,
            Event_data const event_data,
            std::pmr::vector<int>& state_stack,
            std::size_t const state_stack_position
        )
    {
        if (state_stack_position >= state_stack.size())
        {
            return false;
        }

        int& state = state_stack[state_stack_position];

        switch (state)
        {
        case 0:
        {
            if (event == Event::Start_object)
            {
                state = 1;
                return true;
            }
            break;
        }
        case 1:
        {
            switch (event)
            {
            case Event::Key:
            {
                if constexpr (std::is_same_v<Event_data, std::string_view>)
                {
                    if (event_data == "language_version")
                    {
                        state = 3;
                        return true;
                    }
                    else if (event_data == "name")
                    {
                        state = 5;
                        return true;
                    }
                    else if (event_data == "export_declarations")
                    {
                        state = 6;
                        return true;
                    }
                    else if (event_data == "internal_declarations")
                    {
                        state = 8;
                        return true;
                    }
                    else if (event_data == "next_unique_id")
                    {
                        state = 10;
                        return true;
                    }
                    else if (event_data == "definitions")
                    {
                        state = 11;
                        return true;
                    }
                }
                break;
            }
            case Event::End_object:
            {
                state = 2;
                return true;
            }
            }
            break;
        }
        case 2:
        {
            std::cerr << "While parsing 'Module' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(output.language_version, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.language_version, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.language_version, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 5:
        {
            state = 1;
            return read_value(output.name, "name", event_data);
        }
        case 6:
        {
            state = 7;
            return read_object(output.export_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 7:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.export_declarations, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.export_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 8:
        {
            state = 9;
            return read_object(output.internal_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 9:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.internal_declarations, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.internal_declarations, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        case 10:
        {
            state = 1;
            return read_value(output.next_unique_id, "next_unique_id", event_data);
        }
        case 11:
        {
            state = 12;
            return read_object(output.definitions, event, event_data, state_stack, state_stack_position + 1 + 0);
        }
        case 12:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 + 0 == state_stack.size()))
            {
                if (!read_object(output.definitions, event, event_data, state_stack, state_stack_position + 1 + 0))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(output.definitions, event, event_data, state_stack, state_stack_position + 1 + 0);
            }
        }
        }

        std::cerr << "Error while reading 'Module'.\n";
        return false;
    }

}
