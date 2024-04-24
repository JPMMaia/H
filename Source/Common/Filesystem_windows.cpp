module;

#include <filesystem>
#include <memory_resource>
#include <string>
#include <string_view>

#include <windows.h>

module h.common.filesystem;

namespace h::common
{
    std::filesystem::path get_executable_directory()
    {
        std::pmr::string buffer;
        buffer.resize(1024);

        int const bytes = GetModuleFileName(nullptr, buffer.data(), buffer.size());

        std::filesystem::path const executable_path = std::string_view{ buffer.data(), buffer.data() + bytes + 1 };
        return executable_path.parent_path();
    }
}
