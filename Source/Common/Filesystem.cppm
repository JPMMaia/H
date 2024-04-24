module;

#include <filesystem>

export module h.common.filesystem;

namespace h::common
{
    export std::filesystem::path get_executable_directory();
}
