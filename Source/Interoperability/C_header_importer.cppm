module;

#include <filesystem>
#include <memory_resource>
#include <string>
#include <vector>

export module h.c_header_converter;

import h.core;

namespace h::c
{
    export struct C_declarations
    {
        std::pmr::vector<h::Alias_type_declaration> alias_type_declarations;
        std::pmr::vector<h::Struct_declaration> struct_declarations;
        std::pmr::vector<h::Function_declaration> function_declarations;
    };

    export struct C_header
    {
        h::Language_version language_version;
        std::filesystem::path path;
        C_declarations declarations;
    };

    export C_header import_header(std::filesystem::path const& header_path);
}
