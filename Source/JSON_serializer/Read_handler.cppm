module;

#include <cassert>
#include <cstddef>
#include <format>
#include <iostream>
#include <memory_resource>
#include <span>
#include <optional>
#include <sstream>
#include <string_view>
#include <string>
#include <vector>

#include <rapidjson/reader.h>

export module h.json_serializer.read_handler;

import h.core;
import h.json_serializer.read_json;

namespace h::json
{
    static constexpr bool g_debug = false;

    bool is_array(Stack_state const& state)
    {
        return state.set_vector_size != nullptr && state.get_element != nullptr;
    }

    std::pmr::string to_string(std::span<Stack_state const> const stack)
    {
        std::stringstream stream;

        stream << "[";

        for (std::size_t index = 0; index < stack.size(); ++index)
        {
            if (index != 0)
            {
                stream << "; ";
            }

            Stack_state const& state = stack[index];
            stream << state.type;
        }

        stream << "]";

        return std::pmr::string{ stream.str() };
    }

    void print_debug(std::string_view const message, std::span<Stack_state const> const stack, bool const new_line = true)
    {
        std::cout << std::format("{} {}", message, to_string(stack));
        if (new_line)
            std::cout << "\n";
    }

    bool is_vector_element(std::pmr::vector<Stack_state>& stack)
    {
        if (stack.size() >= 2)
        {
            Stack_state const& current_state = stack[stack.size() - 1];
            Stack_state const& parent_state = stack[stack.size() - 2];

            return current_state.type != "vector_size" && is_array(parent_state);
        }

        return false;
    }

    void handle_vector_state(std::pmr::vector<Stack_state>& stack, std::pmr::vector<std::size_t>& array_indices)
    {
        if (is_vector_element(stack))
        {
            std::size_t const index = array_indices.back();
            array_indices.back() = index + 1;

            Stack_state const& parent_state = stack[stack.size() - 2];
            void* const next_element = parent_state.get_element(&parent_state, index);

            auto const begin_value_type = std::find(parent_state.type.begin(), parent_state.type.end(), '<');
            auto const end_value_type = std::find(parent_state.type.begin(), parent_state.type.end(), '>');
            std::pmr::string const type = { begin_value_type + 1, end_value_type };

            Stack_state next_state =
            {
                .pointer = next_element,
                .type = type,
                .get_next_state = parent_state.get_next_state_element
            };

            if constexpr (g_debug)
            {
                std::cout << std::format(" {}\n", next_state.type);
            }

            stack.push_back(std::move(next_state));
        }
    }

    export template<typename Struct_type, bool export_declarations_only>
        struct Handler : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Handler<Struct_type, export_declarations_only>>
    {
        Struct_type output = {};
        std::pmr::vector<Stack_state> state_stack;
        std::pmr::vector<std::size_t> array_indices;

        Handler()
        {
            Stack_state first_state = get_first_state<Struct_type>(&this->output);
            state_stack.push_back(std::move(first_state));
        }

        bool StartObject()
        {
            if constexpr (g_debug)
            {
                bool const new_line = !is_vector_element(this->state_stack);
                print_debug("StartObject()", this->state_stack, new_line);
            }

            handle_vector_state(this->state_stack, this->array_indices);

            return true;
        }

        bool EndObject(rapidjson::SizeType const member_count)
        {
            if constexpr (g_debug)
            {
                print_debug(std::format("EndObject({})", member_count), this->state_stack);
            }

            if (this->state_stack.empty())
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
                print_debug(std::format("Key({})", key), this->state_stack, false);
            }

            if constexpr (export_declarations_only)
            {
                if (key == "internal_declarations")
                {
                    return false;
                }
            }

            Stack_state& current_state = this->state_stack.back();

            std::optional<Stack_state> new_state = current_state.get_next_state(&current_state, key);

            if (!new_state)
            {
                return false;
            }

            if constexpr (g_debug)
            {
                std::cout << std::format(" {}\n", new_state.value().type);
            }

            this->state_stack.push_back(std::move(new_state.value()));

            return true;
        }

        bool Null()
        {
            if constexpr (g_debug)
            {
                bool const new_line = !is_vector_element(this->state_stack);
                print_debug("Null()", this->state_stack, new_line);
            }

            handle_vector_state(this->state_stack, this->array_indices);

            return true;
        }

        bool Bool(bool const boolean)
        {
            if constexpr (g_debug)
            {
                bool const new_line = !is_vector_element(this->state_stack);
                print_debug(std::format("Bool({})", boolean), this->state_stack, new_line);
            }

            handle_vector_state(this->state_stack, this->array_indices);

            Stack_state const& current_state = this->state_stack.back();
            if (current_state.type == "bool")
            {
                bool* pointer = static_cast<bool*>(current_state.pointer);
                *pointer = boolean;
            }

            this->state_stack.pop_back();
            return true;
        }

        bool Int(int const number)
        {
            return Int64(number);
        }

        bool Uint(unsigned const number)
        {
            return Uint64(number);
        }

        bool Int64(std::int64_t const number)
        {
            if constexpr (g_debug)
            {
                bool const new_line = !is_vector_element(this->state_stack);
                print_debug(std::format("Int64({})", number), this->state_stack, new_line);
            }

            handle_vector_state(this->state_stack, this->array_indices);

            Stack_state const& current_state = this->state_stack.back();
            if (current_state.type == "std::uint32_t")
            {
                std::uint32_t* pointer = static_cast<std::uint32_t*>(current_state.pointer);
                *pointer = number;
            }
            else
            {
                return false;
            }

            this->state_stack.pop_back();
            return true;
        }

        bool Uint64(std::uint64_t const number)
        {
            if constexpr (g_debug)
            {
                bool const new_line = !is_vector_element(this->state_stack);
                print_debug(std::format("Uint64({})", number), this->state_stack, new_line);
            }

            handle_vector_state(this->state_stack, this->array_indices);

            Stack_state const& current_state = this->state_stack.back();
            if (current_state.type == "std::uint32_t")
            {
                std::uint32_t* pointer = static_cast<std::uint32_t*>(current_state.pointer);
                *pointer = number;
            }
            else if (current_state.type == "std::uint64_t")
            {
                std::uint64_t* pointer = static_cast<std::uint64_t*>(current_state.pointer);
                *pointer = number;
            }
            else if (current_state.type == "vector_size")
            {
                Stack_state const& parent_state = this->state_stack[state_stack.size() - 2];
                parent_state.set_vector_size(&parent_state, number);
            }
            else
            {
                return false;
            }

            this->state_stack.pop_back();
            return true;
        }

        bool Double(double const number)
        {
            if constexpr (g_debug)
            {
                bool const new_line = !is_vector_element(this->state_stack);
                print_debug(std::format("Double({})", number), this->state_stack, new_line);
            }

            handle_vector_state(this->state_stack, this->array_indices);

            this->state_stack.pop_back();
            return true;
        }

        bool String(const char* const str, rapidjson::SizeType const length, bool const copy)
        {
            std::string_view const string = { str, length };

            if constexpr (g_debug)
            {
                bool const new_line = !is_vector_element(this->state_stack);
                print_debug(std::format("String({})", string), this->state_stack, new_line);
            }

            handle_vector_state(this->state_stack, this->array_indices);

            Stack_state const& current_state = this->state_stack.back();

            if (current_state.type == "std::pmr::string")
            {
                std::pmr::string* pointer = static_cast<std::pmr::string*>(current_state.pointer);
                *pointer = string;
            }
            else if (current_state.type == "std::filesystem::path")
            {
                std::filesystem::path* pointer = static_cast<std::filesystem::path*>(current_state.pointer);
                *pointer = string;
            }
            else if (current_state.type == "variant_type")
            {
                Stack_state& parent_state = this->state_stack[state_stack.size() - 2];
                parent_state.set_variant_type(&parent_state, string);
            }
            else if (current_state.type == "variant_value")
            {
                Stack_state const& parent_state = this->state_stack[state_stack.size() - 2];
                std::optional<int> const enum_value = get_enum_value(parent_state.type, string);
                if (!enum_value.has_value())
                {
                    return false;
                }

                std::memcpy(parent_state.pointer, &enum_value.value(), sizeof(int));
            }
            else
            {
                std::optional<int> const enum_value = get_enum_value(current_state.type, string);
                if (!enum_value.has_value())
                {
                    return false;
                }

                std::memcpy(current_state.pointer, &enum_value.value(), sizeof(int));
            }

            this->state_stack.pop_back();

            return true;
        }

        bool StartArray()
        {
            if constexpr (g_debug)
            {
                print_debug("StartArray()", this->state_stack);
            }

            this->array_indices.push_back(0);

            return true;
        }

        bool EndArray(rapidjson::SizeType element_count)
        {
            if constexpr (g_debug)
            {
                print_debug(std::format("EndArray({})", element_count), this->state_stack);
            }

            this->state_stack.pop_back();
            this->array_indices.pop_back();

            return true;
        }
    };
}
