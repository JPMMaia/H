module;

#include <bitset>
#include <cassert>
#include <concepts>
#include <cstddef>
#include <format>
#include <iostream>
#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <type_traits>
#include <variant>
#include <vector>

#include <rapidjson/reader.h>

export module h.json_serializer;

import h.core;
import h.json_serializer.read_handler;
import h.json_serializer.read_json;
import h.json_serializer.write_json;

namespace h::json
{
    export template<typename Enum_type>
        Enum_type read_enum(std::string_view const string_value)
    {
        Enum_type enum_value = {};

        if (!read_enum(enum_value, string_value))
        {
            throw std::runtime_error{ "Failed to parse enum!" };
        }

        return enum_value;
    };

    export template <typename Enum_type>
        std::string_view write_enum(Enum_type const value)
    {
        return write_enum(value);
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
                std::cout << "Parse error!\n";
                return std::nullopt;
            }

            reader.IterativeParseNext<parse_flags>(input_stream, handler);
        }

        return handler.output;
    }

    export template<typename Writer_type, typename Input_type>
        void write(
            Writer_type& writer,
            Input_type const& value
        )
    {
        write_object(writer, value);
    }
}
