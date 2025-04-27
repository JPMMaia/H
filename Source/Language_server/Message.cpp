module;

#include <optional>
#include <string_view>

#include <nlohmann/json.hpp>

module h.language_server.message;

namespace h::language_server
{
    Request parse_request(std::string_view const value)
    {
        nlohmann::json data = nlohmann::json::parse(value);
        return { data = std::move(data) };
    }
}
