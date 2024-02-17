module;

#include <bitset>
#include <cassert>
#include <concepts>
#include <cstddef>
#include <filesystem>
#include <format>
#include <iostream>
#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <type_traits>
#include <variant>
#include <vector>

#include <rapidjson/filewritestream.h>
#include <rapidjson/reader.h>
#include <rapidjson/writer.h>

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

    export template<typename Type>
        std::optional<Type> read(
            char const* const json_data
        )
    {
        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ json_data };
        return h::json::read<Type>(reader, input_stream);
    }

    export template<typename Writer_type, typename Input_type>
        void write(
            Writer_type& writer,
            Input_type const& value
        )
    {
        write_object(writer, value);
    }

    export template<typename Input_type>
        void write(
            std::filesystem::path const& file_path,
            Input_type const& value
        )
    {
        std::string const file_path_string = file_path.generic_string();
        std::FILE* file = std::fopen(file_path_string.c_str(), "wb");

        char write_buffer[65536];
        rapidjson::FileWriteStream output_stream{ file, write_buffer, sizeof(write_buffer) };

        rapidjson::Writer<rapidjson::FileWriteStream> writer{ output_stream };
        write_object(writer, value);
    }
}
