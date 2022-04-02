module;

#include <bitset>
#include <cassert>
#include <cstddef>
#include <format>
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
            Expect_value,
            Let_object_handler_handle
        };
    };

    namespace
    {
        struct No_object_handler
        {
        };

        template<typename Value_type, typename Object_handler = No_object_handler>
        struct Handler;

        template<typename Object_handler>
        bool handle_start_object(std::bitset<32>& state, Object_handler& object_handler)
        {
            if (state.test(State::Expect_object_start))
            {
                state = new_state(State::Expect_object_end, State::Expect_key);
                return true;
            }
            else if (state.test(State::Let_object_handler_handle))
            {
                if constexpr (!std::is_same_v<Object_handler, No_object_handler>)
                {
                    bool result = false;
                    auto const visit_handler = [&result](auto&& handler)
                    {
                        result = handler.StartObject();
                    };

                    std::visit(visit_handler, object_handler);

                    return result;
                }
            }

            return false;
        }

        template<typename Value_type, typename Object_handler>
        bool handle_end_object(
            rapidjson::SizeType const member_count,
            std::bitset<32>& state,
            Value_type& value,
            Object_handler& object_handler
        )
        {
            if (state.test(State::Expect_object_end))
            {
                return true;
            }
            else if (state.test(State::Let_object_handler_handle))
            {
                if constexpr (!std::is_same_v<Object_handler, No_object_handler>)
                {
                    bool result = false;
                    auto const visit_handler = [&](auto&& handler)
                    {
                        if (handler.state == State::Expect_object_end)
                        {
                            result = handler.EndObject(member_count);
                            state = new_state(State::Expect_key, State::Expect_object_end);

                            if constexpr (std::is_same_v<Value_type, Type>)
                            {
                                value.data = handler.value;
                            }
                            else
                            {
                                throw std::runtime_error{ "Non-exhaustive visitor!" };
                            }
                        }
                        else
                        {
                            result = handler.EndObject(member_count);
                        }
                    };

                    std::visit(visit_handler, object_handler);

                    return result;
                }
            }

            return false;
        }

        template<typename Value_type, typename Object_handler>
        std::bitset<32> get_new_state(std::pmr::string const& key, Object_handler& object_handler)
        {
            if constexpr (std::is_same_v<Value_type, Language_version>)
            {
                return new_state(State::Expect_value);
            }
            else if constexpr (std::is_same_v<Value_type, Type>)
            {
                if (key == "integer_type")
                {
                    object_handler = Handler<Integer_type>{};
                    return new_state(State::Let_object_handler_handle);
                }
                else if (key == "float_type")
                {
                    object_handler = Handler<Float_type>{};
                    return new_state(State::Let_object_handler_handle);
                }
            }

            return new_state(State::Expect_value);
        }

        template<typename Output_type, typename Value_type, typename Object_handler, typename Visit_handler>
        bool handle_key_value(
            Output_type& output,
            std::pmr::string const& key,
            Value_type const& value,
            std::bitset<32>& state,
            Object_handler& object_handler,
            Visit_handler const visit_handler
        )
        {
            if (state.test(State::Expect_value))
            {
                state = new_state(State::Expect_object_end, State::Expect_key);

                if constexpr (std::is_same_v<Output_type, Language_version>)
                {
                    if constexpr (std::is_same_v<Value_type, unsigned>)
                    {
                        if (key == "major")
                        {
                            output.major = static_cast<std::uint32_t>(value);
                            return true;
                        }
                        else if (key == "minor")
                        {
                            output.minor = static_cast<std::uint32_t>(value);
                            return true;
                        }
                        else if (key == "patch")
                        {
                            output.patch = static_cast<std::uint32_t>(value);
                            return true;
                        }
                    }
                }
            }
            else
            {
                if constexpr (!std::is_same_v<Object_handler, No_object_handler>)
                {
                    assert(state.test(State::Let_object_handler_handle));

                    bool result = false;
                    auto const v = [&](auto&& handler)
                    {
                        result = visit_handler(handler);
                    };

                    std::visit(
                        v,
                        object_handler
                    );

                    return result;
                }
            }

            return false;
        }

        /*template<typename Value_type>
        struct Parser_state : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Parser_state<Value_type>>
        {
            std::bitset<32> state = h::json::new_state(State::Expect_object_start);
            std::pmr::string current_key;
            Value_type* value = {};

            bool StartObject()
            {
                return handle_start_object(this->state, this);
            }

            bool EndObject(rapidjson::SizeType const member_count)
            {
                return handle_end_object(member_count, this->state, this->value, this->object_handler);
            }

            bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
            {
                if (this->state.test(State::Expect_key))
                {
                    current_key.assign(name, length);
                    this->state = get_new_state<Value_type>(current_key, object_handler);
                    return true;
                }
                else
                {
                    return false;
                }
            }

            bool Null()
            {
                auto const visit_handler = [](auto&& handler) -> bool
                {
                    return handler.Null();
                };

                return handle_key_value(this->value, this->current_key, nullptr, this->state, this->object_handler, visit_handler);
            }

            bool Bool(bool const b)
            {
                auto const visit_handler = [b](auto&& handler) -> bool
                {
                    return handler.Bool(b);
                };

                return handle_key_value(this->value, this->current_key, b, this->state, this->object_handler, visit_handler);
            }

            bool Int(int const integer)
            {
                auto const visit_handler = [integer](auto&& handler) -> bool
                {
                    return handler.Int(integer);
                };

                return handle_key_value(this->value, this->current_key, integer, this->state, this->object_handler, visit_handler);
            }

            bool Uint(unsigned const integer)
            {
                auto const visit_handler = [integer](auto&& handler) -> bool
                {
                    return handler.Uint(integer);
                };

                return handle_key_value(this->value, this->current_key, integer, this->state, this->object_handler, visit_handler);
            }

            bool Int64(std::int64_t const integer)
            {
                auto const visit_handler = [integer](auto&& handler) -> bool
                {
                    return handler.Int64(integer);
                };

                return handle_key_value(this->value, this->current_key, integer, this->state, this->object_handler, visit_handler);
            }

            bool Uint64(std::uint64_t const integer)
            {
                auto const visit_handler = [integer](auto&& handler) -> bool
                {
                    return handler.Uint64(integer);
                };

                return handle_key_value(this->value, this->current_key, integer, this->state, this->object_handler, visit_handler);
            }

            bool Double(double const d)
            {
                auto const visit_handler = [d](auto&& handler) -> bool
                {
                    return handler.Double(d);
                };

                return handle_key_value(this->value, this->current_key, d, this->state, this->object_handler, visit_handler);
            }

            bool String(const char* const str, rapidjson::SizeType const length, bool const copy)
            {
                auto const visit_handler = [&](auto&& handler) -> bool
                {
                    return handler.String(str, length, copy);
                };

                std::string_view const string = { str, length };
                return handle_key_value(this->value, this->current_key, string, this->state, this->object_handler, visit_handler);
            }

            bool StartArray()
            {
                return false;
            }

            bool EndArray(rapidjson::SizeType elementCount)
            {
                return false;
            }
        };*/

        template<typename Value_type, typename Object_handler>
        struct Handler : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Handler<Value_type>>
        {
            std::bitset<32> state = h::json::new_state(State::Expect_object_start);
            std::pmr::string current_key;
            Value_type value = {};
            Object_handler object_handler;

            bool StartObject()
            {
                return handle_start_object(this->state, this->object_handler);
            }

            bool EndObject(rapidjson::SizeType const member_count)
            {
                return handle_end_object(member_count, this->state, this->value, this->object_handler);
            }

            bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
            {
                if (this->state.test(State::Expect_key))
                {
                    current_key.assign(name, length);
                    this->state = get_new_state<Value_type>(current_key, object_handler);
                    return true;
                }
                else
                {
                    return false;
                }
            }

            bool Null()
            {
                auto const visit_handler = [](auto&& handler) -> bool
                {
                    return handler.Null();
                };

                return handle_key_value(this->value, this->current_key, nullptr, this->state, this->object_handler, visit_handler);
            }

            bool Bool(bool const b)
            {
                auto const visit_handler = [b](auto&& handler) -> bool
                {
                    return handler.Bool(b);
                };

                return handle_key_value(this->value, this->current_key, b, this->state, this->object_handler, visit_handler);
            }

            bool Int(int const integer)
            {
                auto const visit_handler = [integer](auto&& handler) -> bool
                {
                    return handler.Int(integer);
                };

                return handle_key_value(this->value, this->current_key, integer, this->state, this->object_handler, visit_handler);
            }

            bool Uint(unsigned const integer)
            {
                auto const visit_handler = [integer](auto&& handler) -> bool
                {
                    return handler.Uint(integer);
                };

                return handle_key_value(this->value, this->current_key, integer, this->state, this->object_handler, visit_handler);
            }

            bool Int64(std::int64_t const integer)
            {
                auto const visit_handler = [integer](auto&& handler) -> bool
                {
                    return handler.Int64(integer);
                };

                return handle_key_value(this->value, this->current_key, integer, this->state, this->object_handler, visit_handler);
            }

            bool Uint64(std::uint64_t const integer)
            {
                auto const visit_handler = [integer](auto&& handler) -> bool
                {
                    return handler.Uint64(integer);
                };

                return handle_key_value(this->value, this->current_key, integer, this->state, this->object_handler, visit_handler);
            }

            bool Double(double const d)
            {
                auto const visit_handler = [d](auto&& handler) -> bool
                {
                    return handler.Double(d);
                };

                return handle_key_value(this->value, this->current_key, d, this->state, this->object_handler, visit_handler);
            }

            bool String(const char* const str, rapidjson::SizeType const length, bool const copy)
            {
                auto const visit_handler = [&](auto&& handler) -> bool
                {
                    return handler.String(str, length, copy);
                };

                std::string_view const string = { str, length };
                return handle_key_value(this->value, this->current_key, string, this->state, this->object_handler, visit_handler);
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

        struct Integer_type_handler : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Integer_type_handler>
        {
            enum State
            {
                Expect_start_object,
                Expect_end_object,
                Expect_key,
                Expect_precision,
            };
            std::bitset<32> state = new_state(State::Expect_start_object);
            Integer_type value = {};

            bool StartObject()
            {
                if (this->state.test(State::Expect_start_object))
                {
                    this->state = new_state(State::Expect_end_object, State::Expect_key);
                    return true;
                }
                else
                {
                    return false;
                }
            }

            bool EndObject(rapidjson::SizeType member_count)
            {
                return this->state.test(State::Expect_end_object);
            }

            bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
            {
                if (this->state.test(State::Expect_key))
                {
                    std::string_view const key = { name, length };

                    if (key == "precision")
                    {
                        this->state = new_state(State::Expect_precision);
                        return true;
                    }
                }

                return false;
            }

            bool Uint(unsigned const integer)
            {
                if (this->state.test(State::Expect_precision))
                {
                    this->value.precision = integer;
                    this->state = new_state(State::Expect_end_object);
                    return true;
                }
                else
                {
                    return false;
                }
            }

            bool Uint64(uint64_t const integer)
            {
                if (this->state.test(State::Expect_precision))
                {
                    this->value.precision = integer;
                    this->state = new_state(State::Expect_end_object);
                    return true;
                }
                else
                {
                    return false;
                }
            }

            bool Default()
            {
                return false;
            }
        };

        struct Float_type_handler : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Float_type_handler>
        {
            enum State
            {
                Expect_start_object,
                Expect_end_object,
                Expect_key,
                Expect_precision,
            };
            std::bitset<32> state = new_state(State::Expect_start_object);
            Integer_type value = {};

            bool StartObject()
            {
                if (this->state.test(State::Expect_start_object))
                {
                    this->state = new_state(State::Expect_end_object, State::Expect_key);
                    return true;
                }
                else
                {
                    return false;
                }
            }

            bool EndObject(rapidjson::SizeType member_count)
            {
                return this->state.test(State::Expect_end_object);
            }

            bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
            {
                if (this->state.test(State::Expect_key))
                {
                    std::string_view const key = { name, length };

                    if (key == "precision")
                    {
                        this->state = new_state(State::Expect_precision);
                        return true;
                    }
                }

                return false;
            }

            bool Double(double const d)
            {
                if (this->state.test(State::Expect_precision))
                {
                    this->value.precision = d;
                    this->state = new_state(State::Expect_end_object);
                    return true;
                }
                else
                {
                    return false;
                }
            }

            bool Default()
            {
                return false;
            }
        };

        struct Type_handler : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Type_handler>
        {
            enum State
            {
                Expect_start_object,
                Expect_end_object,
                Expect_key,
                Expect_integer_type,
                Expect_float_type
            };
            std::bitset<32> state = new_state(State::Expect_start_object);
            Type value = {};
            std::variant<Integer_type_handler, Float_type_handler> object_handler = Integer_type_handler{};

            bool StartObject()
            {
                if (this->state.test(State::Expect_start_object))
                {
                    this->state = new_state(State::Expect_end_object, State::Expect_key);
                    return true;
                }
                else if (this->state.test(State::Expect_integer_type))
                {
                    Integer_type_handler& handler = std::get<Integer_type_handler>(this->object_handler);
                    return handler.StartObject();
                }
                else if (this->state.test(State::Expect_float_type))
                {
                    Float_type_handler& handler = std::get<Float_type_handler>(this->object_handler);
                    return handler.StartObject();
                }
                else
                {
                    return false;
                }
            }

            bool EndObject(rapidjson::SizeType member_count)
            {
                if (this->state.test(State::Expect_end_object))
                {
                    return true;
                }
                else if (this->state.test(State::Expect_integer_type))
                {
                    Integer_type_handler& handler = std::get<Integer_type_handler>(this->object_handler);
                    if (handler.state == Integer_type_handler::State::Expect_end_object)
                    {
                        state = new_state(State::Expect_key, State::Expect_end_object);
                        value.data = handler.value;
                        return handler.EndObject(member_count);
                    }
                    else
                    {
                        return handler.EndObject(member_count);
                    }
                }
                else if (this->state.test(State::Expect_float_type))
                {
                    Float_type_handler& handler = std::get<Float_type_handler>(this->object_handler);
                    if (handler.state == Float_type_handler::State::Expect_end_object)
                    {
                        state = new_state(State::Expect_key, State::Expect_end_object);
                        value.data = handler.value;
                        return handler.EndObject(member_count);
                    }
                    else
                    {
                        return handler.EndObject(member_count);
                    }
                }
                else
                {
                    return false;
                }
            }

            bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
            {
                if (this->state.test(State::Expect_key))
                {
                    std::string_view const key = { name, length };

                    if (key == "integer_type")
                    {
                        this->state = new_state(State::Expect_integer_type);
                        this->object_handler = Integer_type_handler{};
                        return true;
                    }
                    else if (key == "float_type")
                    {
                        this->state = new_state(State::Expect_float_type);
                        this->object_handler = Float_type_handler{};
                        return true;
                    }
                }
                else if (this->state.test(State::Expect_integer_type))
                {
                    Integer_type_handler& handler = std::get<Integer_type_handler>(this->object_handler);
                    return handler.Key(name, length, copy);
                }
                else if (this->state.test(State::Expect_float_type))
                {
                    Float_type_handler& handler = std::get<Float_type_handler>(this->object_handler);
                    return handler.Key(name, length, copy);
                }

                return false;
            }

            bool Uint64(uint64_t const integer)
            {
                if (this->state.test(State::Expect_integer_type))
                {
                    Integer_type_handler& handler = std::get<Integer_type_handler>(this->object_handler);
                    return handler.Uint64(integer);
                }
                else
                {
                    return false;
                }
            }

            bool Double(uint64_t const d)
            {
                if (this->state.test(State::Expect_float_type))
                {
                    Float_type_handler& handler = std::get<Float_type_handler>(this->object_handler);
                    return handler.Double(d);
                }
                else
                {
                    return false;
                }
            }

            bool Default()
            {
                return false;
            }
        };
    }

    /*export template<typename Input_stream>
        std::optional<Type> read_type(
            rapidjson::Reader& reader,
            Input_stream& input_stream
        )
    {
        Type_handler handler;

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
    }*/

    template<typename Type, typename Handler_type, typename Input_stream>
    std::optional<Type> read(
        Handler_type& handler,
        rapidjson::Reader& reader,
        Input_stream& input_stream
    )
    {
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

    export template<typename Input_stream>
        std::optional<Language_version> read_language_version(
            rapidjson::Reader& reader,
            Input_stream& input_stream
        )
    {
        Handler<Language_version> handler;
        return read<Language_version>(handler, reader, input_stream);
    }

    export template<typename Input_stream>
        std::optional<Type> read_type(
            rapidjson::Reader& reader,
            Input_stream& input_stream
        )
    {
        Handler<Type, std::variant<Handler<Integer_type>, Handler<Float_type>>> handler;
        return read<Type>(handler, reader, input_stream);
    }
}
