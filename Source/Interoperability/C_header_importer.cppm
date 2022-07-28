module;

#include <filesystem>
#include <string>

export module h.c_header_converter;

import h.core;

namespace h::c
{
    export struct C_header
    {
        h::Language_version language_version;
        std::filesystem::path path;
        h::Module_declarations declarations;
    };

    export C_header import_header(std::filesystem::path const& header_path);
}
