module;

#include <bitset>
#include <cassert>
#include <concepts>
#include <cstddef>
#include <format>
#include <iostream>
#include <memory_resource>
#include <string>
#include <type_traits>
#include <variant>
#include <vector>

#include <rapidjson/reader.h>

export module h.json_serializer;

import h.core;

namespace h::json
{
    export Variable_expression::Type read_variable_expression_type(std::string_view const value)
    {
        if (value == "function_argument")
            return Variable_expression::Type::Function_argument;
        else if (value == "local_variable")
            return Variable_expression::Type::Local_variable;
        else if (value == "temporary")
            return Variable_expression::Type::Temporary;
        else
            throw std::runtime_error{ std::format("Did not expect '{}' as Variable_expression::Type.\n", value) };
    }

    export Binary_expression::Operation read_binary_expression_operation(std::string_view const value)
    {
        if (value == "add")
            return Binary_expression::Operation::Add;
        if (value == "subtract")
            return Binary_expression::Operation::Subtract;
        if (value == "multiply")
            return Binary_expression::Operation::Multiply;
        if (value == "signed_divide")
            return Binary_expression::Operation::Signed_divide;
        if (value == "unsigned_divide")
            return Binary_expression::Operation::Unsigned_divide;
        if (value == "less_than")
            return Binary_expression::Operation::Less_than;
        else
            throw std::runtime_error{ std::format("Did not expect '{}' as Binary_expression::Operation.\n", value) };
    }

    export template<typename... State>
        constexpr std::bitset<32> new_state(State const... state)
    {
        std::bitset<32> output = {};
        (output.set(state), ...);
        return output;
    }

    export struct State
    {
        enum Enum
        {
            Expect_object_start = 0,
            Expect_object_end,
            Expect_key,
            Expect_non_object_value,
            Expect_object_value,
            Finished
        };
    };

    namespace
    {
        template<typename Value_type>
        struct Parser_state;

        template<typename Value_type, typename Output_type, typename Stack_type>
        void add_new_state_to_stack_with_variant(
            Output_type& output,
            Stack_type& state_stack
        )
        {
            output = Value_type{};

            Parser_state<Value_type> new_parser_state
            {
                .value = &std::get<Value_type>(output),
            };

            state_stack.push_back(std::move(new_parser_state));
        }

        template<typename Value_type, typename Output_type, typename Stack_type>
        void add_new_state_to_stack(
            Output_type& output,
            Stack_type& state_stack
        )
        {
            Parser_state<Value_type> new_parser_state
            {
                .value = &output,
            };

            state_stack.push_back(std::move(new_parser_state));
        }

        template<typename Output_type>
        bool handle_new_object_value(
            std::string_view const key,
            Output_type& output,
            auto& state_stack
        )
        {
            if constexpr (std::is_same_v<Output_type, Type>)
            {
                if (key == "integer_type")
                {
                    add_new_state_to_stack_with_variant<Integer_type>(output.data, state_stack);
                    return true;
                }
                else if (key == "float_type")
                {
                    add_new_state_to_stack_with_variant<Float_type>(output.data, state_stack);
                    return true;
                }
            }
            else if constexpr (std::is_same_v<Output_type, Binary_expression>)
            {
                if (key == "left_hand_side")
                {
                    add_new_state_to_stack<Variable_expression>(output.left_hand_side, state_stack);
                    return true;
                }
                else if (key == "right_hand_side")
                {
                    add_new_state_to_stack<Variable_expression>(output.right_hand_side, state_stack);
                    return true;
                }
            }

            return false;
        }

        template<typename Value_type, typename Output_type>
        bool parse_value(
            std::string_view const key,
            Value_type const value,
            Output_type& output
        )
        {
            if constexpr (std::is_same_v<Output_type, Integer_type> || std::is_same_v<Output_type, Float_type>)
            {
                if constexpr (std::unsigned_integral<Value_type>)
                {
                    if (key == "precision")
                    {
                        output.precision = value;
                        return true;
                    }
                }
                else
                {
                    std::cerr << std::format("Integer_type/Float_type .precision expects an unsigned integer.\n");
                }
            }
            else if constexpr (std::is_same_v<Output_type, Variable_expression>)
            {
                if constexpr (std::is_same_v<Value_type, std::string_view>)
                {
                    if (key == "type")
                    {
                        output.type = read_variable_expression_type(value);
                        return true;
                    }
                }
                else if constexpr (std::unsigned_integral<Value_type>)
                {
                    if (key == "id")
                    {
                        output.id = value;
                        return true;
                    }
                }
            }
            else if constexpr (std::is_same_v<Output_type, Binary_expression>)
            {
                if constexpr (std::is_same_v<Value_type, std::string_view>)
                {
                    if (key == "operation")
                    {
                        output.operation = read_binary_expression_operation(value);
                        return true;
                    }
                }
            }
            else if constexpr (std::is_same_v<Output_type, Language_version>)
            {
                if constexpr (std::is_same_v<Value_type, unsigned>)
                {
                    if (key == "major")
                    {
                        output.major = value;
                        return true;
                    }
                    else if (key == "minor")
                    {
                        output.minor = value;
                        return true;
                    }
                    else if (key == "patch")
                    {
                        output.patch = value;
                        return true;
                    }
                }
                else
                {
                    std::cerr << std::format("Language_version .major/.minor/.patch expect an unsigned integer.\n");
                }
            }

            return false;
        }

        template<typename Value_type>
        struct Parser_state : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Parser_state<Value_type>>
        {
            std::bitset<32> state = h::json::new_state(State::Expect_object_start);
            std::pmr::string current_key;
            Value_type* value = {};

            bool StartObject()
            {
                if (this->state.test(State::Expect_object_start))
                {
                    this->state = new_state(State::Expect_object_end, State::Expect_key);
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect to start a JSON object.\n");
                    return false;
                }
            }

            bool EndObject(rapidjson::SizeType const member_count)
            {
                if (this->state.test(State::Expect_object_end))
                {
                    this->state = new_state(State::Finished);
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect to end a JSON object.\n");
                    return false;
                }
            }

            bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
            {
                if (this->state.test(State::Expect_key))
                {
                    this->current_key.assign(name, length);
                    this->state = new_state(State::Expect_non_object_value, State::Expect_object_value);
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect a JSON key.\n");
                    return false;
                }
            }

            bool Null()
            {
                this->state = new_state(State::Expect_object_end, State::Expect_key);

                std::cerr << std::format("Did not expect a null value for key '{}'.\n", this->current_key);
                return false;
            }

            bool Bool(bool const b)
            {
                this->state = new_state(State::Expect_object_end, State::Expect_key);

                std::cerr << std::format("Did not expect a boolean value for key '{}'.\n", this->current_key);
                return false;
            }

            bool Int(int const number)
            {
                this->state = new_state(State::Expect_object_end, State::Expect_key);

                if (parse_value(this->current_key, number, *this->value))
                {
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect an int value for key '{}'.\n", this->current_key);
                    return false;
                }
            }

            bool Uint(unsigned const number)
            {
                this->state = new_state(State::Expect_object_end, State::Expect_key);

                if (parse_value(this->current_key, number, *this->value))
                {
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect an uint for key '{}'.\n", this->current_key);
                    return false;
                }
            }

            bool Int64(std::int64_t const number)
            {
                this->state = new_state(State::Expect_object_end, State::Expect_key);

                if (parse_value(this->current_key, number, *this->value))
                {
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect an int64 value for key '{}'.\n", this->current_key);
                    return false;
                }
            }

            bool Uint64(std::uint64_t const number)
            {
                this->state = new_state(State::Expect_object_end, State::Expect_key);

                if (parse_value(this->current_key, number, *this->value))
                {
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect an uint64 value for key '{}'.\n", this->current_key);
                    return false;
                }
            }

            bool Double(double const number)
            {
                this->state = new_state(State::Expect_object_end, State::Expect_key);

                if (parse_value(this->current_key, number, *this->value))
                {
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect a double value for key '{}'.\n", this->current_key);
                    return false;
                }
            }

            bool String(const char* const str, rapidjson::SizeType const length, bool const copy)
            {
                this->state = new_state(State::Expect_object_end, State::Expect_key);

                std::string_view const string = { str, length };
                if (parse_value(this->current_key, string, *this->value))
                {
                    return true;
                }
                else
                {
                    std::cerr << std::format("Did not expect a string value for key '{}'.\n", this->current_key);
                    return false;
                }
            }

            bool StartArray()
            {
                std::cerr << std::format("Did not expect to start array for key '{}'.\n", this->current_key);
                return false;
            }

            bool EndArray(rapidjson::SizeType elementCount)
            {
                std::cerr << std::format("Did not expect to end array for key '{}'.\n", this->current_key);
                return false;
            }
        };

        using Parser_state_variant = std::variant<
            Parser_state<Integer_type>,
            Parser_state<Float_type>,
            Parser_state<Type>,
            Parser_state<Variable_expression>,
            Parser_state<Binary_expression>,
            Parser_state<Language_version>
        >;

        template<typename Value_type>
        struct Handler : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Handler<Value_type>>
        {
            Value_type value = {};
            std::pmr::vector<Parser_state_variant> state_stack = { Parser_state<Value_type>{.value = &this->value } };

            bool StartObject()
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    if (underlying_state.state.test(State::Expect_object_value))
                    {
                        std::string_view const key = underlying_state.current_key;
                        auto* const underlying_value = underlying_state.value;

                        result = handle_new_object_value(key, *underlying_value, this->state_stack);

                        auto const change_state = [](auto&& underlying_state)
                        {
                            underlying_state.StartObject();
                        };

                        std::visit(change_state, state_stack.back());
                    }
                    else
                    {
                        result = underlying_state.StartObject();
                    }
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool EndObject(rapidjson::SizeType const member_count)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.EndObject(member_count);

                    if (underlying_state.state.test(State::Finished))
                    {
                        state_stack.pop_back();

                        if (!state_stack.empty())
                        {
                            auto const change_state = [](auto&& underlying_state)
                            {
                                underlying_state.state = new_state(State::Expect_object_end, State::Expect_key);
                            };

                            std::visit(change_state, state_stack.back());
                        }
                    }
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.Key(name, length, copy);
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool Null()
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.Null();
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool Bool(bool const b)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.Bool(b);
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool Int(int const number)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.Int(number);
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool Uint(unsigned const number)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.Uint(number);
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool Int64(std::int64_t const number)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.Int64(number);
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool Uint64(std::uint64_t const number)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.Uint64(number);
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool Double(double const number)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.Double(number);
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool String(const char* const str, rapidjson::SizeType const length, bool const copy)
            {
                bool result = false;
                auto const visitor = [&](auto&& underlying_state)
                {
                    result = underlying_state.String(str, length, copy);
                };

                std::visit(visitor, this->state_stack.back());

                return result;
            }

            bool StartArray()
            {
                return false;
            }

            bool EndArray(rapidjson::SizeType elementCount)
            {
                return false;
            }
        };
    }

    export template<typename Type, typename Input_stream>
        std::optional<Type> read(
            rapidjson::Reader& reader,
            Input_stream& input_stream
        )
    {
        Handler<Type> handler;

        constexpr unsigned int parse_flags =
            rapidjson::kParseStopWhenDoneFlag |
            rapidjson::kParseFullPrecisionFlag;

        while (!reader.IterativeParseComplete())
        {
            if (reader.HasParseError())
            {
                return std::nullopt;
            }

            reader.IterativeParseNext<parse_flags>(input_stream, handler);
        }

        return handler.value;
    }
}
