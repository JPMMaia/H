module;

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

export module h.language_server.core;

namespace h::language_server
{
    export struct URI
    {
        std::pmr::string value;
    };

    export URI parse_uri_json(nlohmann::json const& json);


    export struct Workspace_folder
    {
        URI uri = {};
        std::pmr::string name = {};
    };

    export Workspace_folder parse_workspace_folder_json(nlohmann::json const& json);


    export struct Server_capabilities
    {

    };

    export nlohmann::json server_capabilities_to_json(Server_capabilities const& capabilities);

    
    export struct Initialize_params
    {
        std::uint64_t process_id = 0;
        std::pmr::vector<Workspace_folder> workspace_folders = {};
    };

    export Initialize_params parse_initialize_params_json(nlohmann::json const& json);


    export struct Initialize_result
    {
        Server_capabilities capabilities = {};
    };

    export nlohmann::json initialize_result_to_json(Initialize_result const& result);

    
    export struct Shutdown_result
    {
    };

    export nlohmann::json shutdown_result_to_json(Shutdown_result const& result);
}