#include <iostream>

import h.c_header_converter;

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

    h::c::import_header_and_write_to_file(header_name, header_path_string, output_path_string);

    return 0;
}
