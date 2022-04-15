#include <fstream>
#include <string_view>

import h.tools.code_generator;

int main(int const argc, char const* const* const argv)
{
    if (argc != 5)
    {
        return 1;
    }

    std::string_view const operation = argv[1];
    std::string_view const module_name = argv[2];
    char const* const input_filename = argv[3];
    char const* const output_filename = argv[4];

    std::ifstream input_stream{ input_filename };
    std::ofstream output_stream{ output_filename };

    if (operation == "read")
    {
        h::tools::code_generator::generate_read_json_code(
            input_stream,
            output_stream,
            module_name,
            "h.core",
            "h::json"
        );
    }
    else if (operation == "write")
    {
        h::tools::code_generator::generate_write_json_code(
            input_stream,
            output_stream,
            module_name,
            "h.core",
            "h::json"
        );
    }
    else if (operation == "operators")
    {
        h::tools::code_generator::generate_json_operators_code(
            input_stream,
            output_stream,
            module_name,
            "h::json::operators"
        );
    }


    return 0;
}
