#include <fstream>

import h.tools.code_generator;

int main(int const argc, char const* const* const argv)
{
    if (argc != 3)
    {
        return 1;
    }

    const char* const input_filename = argv[1];
    const char* const output_filename = argv[2];

    std::ifstream input_stream{ input_filename };
    std::ofstream output_stream{ output_filename };

    h::tools::code_generator::generate_json_code(
        input_stream,
        output_stream,
        "h.json_serializer.generated",
        "h.core",
        "h::json"
    );

    return 0;
}
