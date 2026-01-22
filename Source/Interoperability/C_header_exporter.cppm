module;

#include <filesystem>
#include <memory_resource>
#include <span>
#include <string>
#include <unordered_map>

export module h.c_header_exporter;

import h.core;

namespace h::c
{
    export struct Exported_c_header
    {
        std::pmr::string content;
    };

    export Exported_c_header export_module_as_c_header(
        h::Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& dependencies_c_file_paths,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );
}
