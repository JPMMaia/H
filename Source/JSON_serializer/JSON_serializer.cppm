module;

#include <bitset>
#include <cassert>
#include <concepts>
#include <cstddef>
#include <format>
#include <iostream>
#include <memory_resource>
#include <span>
#include <string>
#include <type_traits>
#include <variant>
#include <vector>

#include <rapidjson/reader.h>

export module h.json_serializer;

import h.core;
import h.json_serializer.generated;
import h.json_serializer.reader;

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
}
