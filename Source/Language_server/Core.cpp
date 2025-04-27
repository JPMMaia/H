module;

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

module h.language_server.core;

namespace h::language_server
{
    template<class T, class Function_t>
    std::pmr::vector<T> parse_vector(nlohmann::json const& parent_json, std::string_view const key, Function_t parse_element)
    {
        auto const location = parent_json.find(key);
        if (location == parent_json.end())
            return {};

        nlohmann::json const& json = *location;
        if (!json.is_array())
            return {};

        std::pmr::vector<T> output;
        output.resize(json.size());

        for (std::size_t index = 0; index < json.size(); ++index)
        {
            nlohmann::json const& element = json[index];
            output[index] = parse_element(element);
        }

        return output;
    }

    URI parse_uri_json(nlohmann::json const& json)
    {
        URI output
        {
            .value = std::pmr::string{json.get<std::string>()},
        };
        
        return output;
    }

    Workspace_folder parse_workspace_folder_json(nlohmann::json const& json)
    {
        Workspace_folder output =
        {
            .uri = parse_uri_json(json.at("uri")),
            .name = std::pmr::string{json.at("name").get<std::string>()},
        };

        return output;
    }

    nlohmann::json server_capabilities_to_json(Server_capabilities const& capabilities)
    {
        return nlohmann::json(nlohmann::json::value_t::object);
    }

    Initialize_params parse_initialize_params_json(nlohmann::json const& json)
    {
        nlohmann::json const& process_id = json.at("processId");

        Initialize_params output =
        {
            .process_id = process_id.is_null() ? 0 : process_id.get<std::uint64_t>(),
            .workspace_folders = parse_vector<Workspace_folder>(json, "workspaceFolders", parse_workspace_folder_json),
        };

        return output;
    }

    nlohmann::json initialize_result_to_json(Initialize_result const& result)
    {
        nlohmann::json json;
        json["capabilities"] = server_capabilities_to_json(result.capabilities);
        return json;
    }

    nlohmann::json shutdown_result_to_json(Shutdown_result const& result)
    {
        return {};
    }
}