#include <fstream>
#include <string_view>

import h.tools.code_generator;

int main(int const argc, char const* const* const argv)
{
    if (argc < 3)
    {
        return 1;
    }

    std::string_view const operation = argv[1];

    if (operation == "reflection_json")
    {
        char const* const input_filename = argv[2];
        char const* const output_filename = argv[3];

        std::ifstream input_stream{ input_filename };
        std::ofstream output_stream{ output_filename };

        h::tools::code_generator::generate_json_data(
            input_stream,
            output_stream
        );
    }
    else if (operation == "typescript_interface")
    {
        char const* const input_filename = argv[2];
        char const* const output_filename = argv[3];

        std::ifstream input_stream{ input_filename };
        std::ofstream output_stream{ output_filename };

        h::tools::code_generator::generate_typescript_interface(
            input_stream,
            output_stream
        );
    }
    else if (operation == "typescript_intermediate_representation")
    {
        char const* const input_filename = argv[2];
        char const* const output_filename = argv[3];

        std::ifstream input_stream{ input_filename };
        std::ofstream output_stream{ output_filename };

        h::tools::code_generator::generate_typescript_intermediate_representation(
            input_stream,
            output_stream
        );
    }
    else
    {
        if (argc != 7)
        {
            return 1;
        }

        std::string_view const operation = argv[1];
        std::string_view const module_name = argv[2];
        std::string_view const namespace_name = argv[3];
        std::string_view const module_name_to_import = argv[4];
        char const* const input_filename = argv[5];
        char const* const output_filename = argv[6];

        std::ifstream input_stream{ input_filename };
        std::ofstream output_stream{ output_filename };

        if (operation == "read")
        {
            h::tools::code_generator::generate_read_json_code(
                input_stream,
                output_stream,
                module_name,
                module_name_to_import,
                namespace_name
            );
        }
        else if (operation == "write")
        {
            h::tools::code_generator::generate_write_json_code(
                input_stream,
                output_stream,
                module_name,
                module_name_to_import,
                namespace_name
            );
        }
        else if (operation == "operators")
        {
            h::tools::code_generator::generate_json_operators_code(
                input_stream,
                output_stream,
                module_name,
                namespace_name
            );
        }

    }

    return 0;
}
