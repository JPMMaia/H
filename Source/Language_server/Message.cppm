module;

#include <optional>
#include <string>
#include <string_view>

#include <nlohmann/json.hpp>

export module h.language_server.message;

namespace h::language_server
{
    export struct Response
    {
        nlohmann::json data;
    };

    export enum class Error_code
    {
        Parse_error = -32700,
        Invalid_request = -32600,
        Method_not_found = -32601,
        Invalid_params = -32602,
        Internal_error = -32603,
    };

    export struct Response_error
    {
        Error_code code = Error_code::Internal_error;
        std::pmr::string message = {};
        std::optional<nlohmann::json> data = std::nullopt;
    };

    export Response create_response(
        std::pmr::string const& id,
        nlohmann::json result
    );

    export Response create_response(
        std::pmr::string const& id,
        Response_error const& error
    );

    export struct Request
    {
        nlohmann::json data;
    };

    export Request parse_request(std::string_view const value);
}
