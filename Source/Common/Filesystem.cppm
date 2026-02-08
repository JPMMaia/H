module;

#include <filesystem>
#include <vector>

export module h.common.filesystem;

export import h.common.filesystem_common;

namespace h::common
{
    export std::filesystem::path get_executable_directory();
    
    export std::pmr::vector<std::filesystem::path> get_default_header_search_directories();
    
    export std::pmr::vector<std::filesystem::path> get_default_library_directories();

    export std::filesystem::path get_builtin_include_directory()
    {
        std::filesystem::path const current_directory_include_path = std::filesystem::current_path().parent_path() / "share" / "hlang" / "include";
        if (std::filesystem::exists(current_directory_include_path))
            return current_directory_include_path;
        std::filesystem::path const executable_directory_include_path = get_executable_directory().parent_path() / "share" / "hlang" / "include";
        return executable_directory_include_path;
    }
}
