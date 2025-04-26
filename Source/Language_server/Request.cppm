module;

#include <optional>
#include <string_view>

#include <nlohmann/json.hpp>

export module h.language_server.request;

namespace h::language_server
{
    export struct Request
    {
        nlohmann::json data;
    };

    export Request parse_request(std::string_view const value);
}
