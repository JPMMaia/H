module;

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

export module h.language_server.core;

namespace h::language_server
{
    export struct URI
    {
        std::pmr::string value;
    };

    export struct Workspace_folder
    {
        URI uri = {};
        std::pmr::string name = {};
    };

    export struct Initialize_params
    {
        std::uint64_t process_id = 0;
        std::pmr::vector<Workspace_folder> workspace_folders = {};
    };
}