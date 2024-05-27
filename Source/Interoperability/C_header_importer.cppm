module;

#include <filesystem>
#include <memory_resource>
#include <string>
#include <string_view>
#include <vector>

export module h.c_header_converter;

import h.core;

namespace h::c
{
    export struct C_declarations
    {
        std::pmr::vector<h::Alias_type_declaration> alias_type_declarations;
        std::pmr::vector<h::Enum_declaration> enum_declarations;
        std::pmr::vector<h::Struct_declaration> struct_declarations;
        std::pmr::vector<h::Union_declaration> union_declarations;
        std::pmr::vector<h::Function_declaration> function_declarations;
    };

    export struct C_header
    {
        h::Language_version language_version;
        std::filesystem::path path;
        C_declarations declarations;
    };

    export h::Module import_header(std::string_view const header_name, std::filesystem::path const& header_path);

    export void import_header_and_write_to_file(std::string_view const header_name, std::filesystem::path const& header_path, std::filesystem::path const& output_path);
}
