module;

#include <cassert>
#include <cstddef>
#include <format>
#include <iostream>
#include <memory_resource>
#include <span>
#include <string_view>
#include <string>
#include <vector>

#include <rapidjson/reader.h>

export module h.json_serializer.reader;

import h.core;
import h.json_serializer.generated;

namespace h::json
{
    static constexpr bool g_debug = true;

    export template<typename Struct_type>
        struct Handler : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Handler<Struct_type>>
    {
        Struct_type output = {};
        std::pmr::vector<int> state_stack;

        bool StartObject()
        {
            if constexpr (g_debug)
            {
                std::cout << "StartObject()\n";
            }

            this->state_stack.push_back(0);
            return read_object(this->output, Event::Start_object, No_event_data{}, this->state_stack, 0);
        }

        bool EndObject(rapidjson::SizeType const member_count)
        {
            if constexpr (g_debug)
            {
                std::cout << std::format("EndObject({})\n", member_count);
            }

            if (!read_object(this->output, Event::End_object, No_event_data{}, this->state_stack, 0))
            {
                return false;
            }

            this->state_stack.pop_back();

            return true;
        }

        bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
        {
            std::string_view const key = { name, name + length };

            if constexpr (g_debug)
            {
                std::cout << std::format("Key({})\n", key);
            }

            return read_object(this->output, Event::Key, key, this->state_stack, 0);
        }

        bool Null()
        {
            if constexpr (g_debug)
            {
                std::cout << "Null()\n";
            }

            return read_object(this->output, Event::Value, nullptr, this->state_stack, 0);
        }

        bool Bool(bool const boolean)
        {
            if constexpr (g_debug)
            {
                std::cout << std::format("Bool({})\n", boolean);
            }

            return read_object(this->output, Event::Value, boolean, this->state_stack, 0);
        }

        bool Int(int const number)
        {
            if constexpr (g_debug)
            {
                std::cout << std::format("Int({})\n", number);
            }

            return read_object(this->output, Event::Value, number, this->state_stack, 0);
        }

        bool Uint(unsigned const number)
        {
            if constexpr (g_debug)
            {
                std::cout << std::format("Uint({})\n", number);
            }

            return read_object(this->output, Event::Value, number, this->state_stack, 0);
        }

        bool Int64(std::int64_t const number)
        {
            if constexpr (g_debug)
            {
                std::cout << std::format("Int64({})\n", number);
            }

            return read_object(this->output, Event::Value, number, this->state_stack, 0);
        }

        bool Uint64(std::uint64_t const number)
        {
            if constexpr (g_debug)
            {
                std::cout << std::format("Uint64({})\n", number);
            }

            return read_object(this->output, Event::Value, number, this->state_stack, 0);
        }

        bool Double(double const number)
        {
            if constexpr (g_debug)
            {
                std::cout << std::format("Double({})\n", number);
            }

            return read_object(this->output, Event::Value, number, this->state_stack, 0);
        }

        bool String(const char* const str, rapidjson::SizeType const length, bool const copy)
        {
            std::string_view const string = { str, length };

            if constexpr (g_debug)
            {
                std::cout << std::format("String({})\n", string);
            }

            return read_object(this->output, Event::Value, string, this->state_stack, 0);
        }

        bool StartArray()
        {
            if constexpr (g_debug)
            {
                std::cout << "StartArray()\n";
            }

            return read_object(this->output, Event::Start_array, No_event_data{}, this->state_stack, 0);
        }

        bool EndArray(rapidjson::SizeType element_count)
        {
            if constexpr (g_debug)
            {
                std::cout << std::format("EndArray({})\n", element_count);
            }

            return read_object(this->output, Event::End_array, No_event_data{}, this->state_stack, 0);
        }
    };
}
