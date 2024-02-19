module;

#include <filesystem>
#include <memory_resource>
#include <unordered_map>

export module h.compiler;

import h.core;

namespace h::compiler
{
    export void generate_code(
        std::filesystem::path const& output_file_path,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    );
}
