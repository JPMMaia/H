#include <filesystem>
#include <iostream>

import h.core;
import h.c_header_converter;
import h.json_serializer;

int main(int const argc, char const* const argv[])
{
    if (argc != 4)
    {
        std::cerr << "Required number of arguments is 3!\n";
        return -1;
    }

    std::string_view const header_name = argv[1];
    std::string_view const header_path_string = argv[2];
    std::string_view const output_path_string = argv[3];

    h::c::C_header const header = h::c::import_header(header_path_string);

    h::Module const module
    {
        .language_version = header.language_version,
        .name = std::pmr::string{ header_name },
        .dependencies = {},
        .export_declarations = {
            .alias_type_declarations = header.declarations.alias_type_declarations,
            .enum_declarations = header.declarations.enum_declarations,
            .struct_declarations = header.declarations.struct_declarations,
            .function_declarations = header.declarations.function_declarations,
        },
        .internal_declarations = {},
        .definitions = {},
    };

    h::json::write<h::Module>(output_path_string, module);

    return 0;
}
