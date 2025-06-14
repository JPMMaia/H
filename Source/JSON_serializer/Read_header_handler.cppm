module;

#include <bit>
#include <memory_resource>
#include <optional>
#include <string_view>
#include <string>

#include <rapidjson/reader.h>

export module h.json_serializer.read_header_handler;

import h.core;

namespace h::json
{
    export struct Read_header_handler : public rapidjson::BaseReaderHandler<rapidjson::UTF8<>, Read_header_handler>
    {
        std::pmr::string module_name;
        std::optional<std::uint64_t> content_hash;
        std::pmr::string current_key;

        bool StartObject()
        {
            return true;
        }

        bool EndObject(rapidjson::SizeType const member_count)
        {
            return true;
        }

        bool Key(char const* const name, rapidjson::SizeType const length, bool const copy)
        {
            std::string_view const key = { name, name + length };
            current_key = key;
            
            if (key == "dependencies" || key == "export_declarations" || key == "internal_declarations" || key == "definitions")
                return false;

            return true;
        }

        bool Null()
        {
            return true;
        }

        bool Bool(bool const boolean)
        {
            return true;
        }

        bool Int(int const number)
        {
            if (this->current_key == "content_hash")
                this->content_hash = static_cast<std::uint64_t>(number);

            return true;
        }

        bool Uint(unsigned const number)
        {
            if (this->current_key == "content_hash")
                this->content_hash = number;

            return true;
        }

        bool Int64(std::int64_t const number)
        {
            if (this->current_key == "content_hash")
                this->content_hash = std::bit_cast<std::uint64_t>(number);

            return true;
        }

        bool Uint64(std::uint64_t const number)
        {
            if (this->current_key == "content_hash")
                this->content_hash = number;

            return true;
        }

        bool Double(double const number)
        {
            return true;
        }

        bool String(const char* const str, rapidjson::SizeType const length, bool const copy)
        {
            std::string_view const string = { str, length };

            if (this->current_key == "name")
                this->module_name = string;

            return true;
        }

        bool StartArray()
        {
            return true;
        }

        bool EndArray(rapidjson::SizeType element_count)
        {
            return true;
        }
    };
}
