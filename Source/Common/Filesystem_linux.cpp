module;

#include <filesystem>
#include <memory_resource>
#include <string>
#include <string_view>

module h.common.filesystem;

import h.common;

namespace h::common
{
    std::filesystem::path get_executable_directory()
    {
        return std::filesystem::path{}; // TODO
    }

    std::pmr::vector<std::filesystem::path> get_default_library_directories()
    {
        std::pmr::vector<std::filesystem::path> library_directories
        {
            "/usr/lib"
        };

        return library_directories;
    }
}
