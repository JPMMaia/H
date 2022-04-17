module;

#include <iostream>
#include <memory_resource>
#include <variant>
#include <vector>

export module h.language_server.read_json_request;

import h.language_server.request;

namespace h::language_server
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
            Echo_request& output,
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
            std::cerr << "While parsing 'Echo_request' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.data, "data", event_data);
        }
        }

        std::cerr << "Error while reading 'Echo_request'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Echo_answer& output,
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
            std::cerr << "While parsing 'Echo_answer' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 1;
            return read_value(output.data, "data", event_data);
        }
        }

        std::cerr << "Error while reading 'Echo_answer'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Request& output,
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
                    if (event_data == "echo_request")
                    {
                        output.data = Echo_request{};
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
            std::cerr << "While parsing 'Request' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(std::get<Echo_request>(output.data), event, event_data, state_stack, state_stack_position + 1);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 == state_stack.size()))
            {
                if (!read_object(std::get<Echo_request>(output.data), event, event_data, state_stack, state_stack_position + 1))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(std::get<Echo_request>(output.data), event, event_data, state_stack, state_stack_position + 1);
            }
        }
        }

        std::cerr << "Error while reading 'Request'.\n";
        return false;
    }

    export template<typename Event_data>
        bool read_object(
            Answer& output,
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
                    if (event_data == "echo_answer")
                    {
                        output.data = Echo_answer{};
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
            std::cerr << "While parsing 'Answer' unexpected '}' found.\n";
            return false;
        }
        case 3:
        {
            state = 4;
            return read_object(std::get<Echo_answer>(output.data), event, event_data, state_stack, state_stack_position + 1);
        }
        case 4:
        {
            if ((event == Event::End_object) && (state_stack_position + 2 == state_stack.size()))
            {
                if (!read_object(std::get<Echo_answer>(output.data), event, event_data, state_stack, state_stack_position + 1))
                {
                    return false;
                }

                state = 1;
                return true;
            }
            else
            {
                return read_object(std::get<Echo_answer>(output.data), event, event_data, state_stack, state_stack_position + 1);
            }
        }
        }

        std::cerr << "Error while reading 'Answer'.\n";
        return false;
    }

}
