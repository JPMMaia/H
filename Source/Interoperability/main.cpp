#include <argparse/argparse.hpp>

#include <filesystem>
#include <iostream>
#include <span>
#include <string>
#include <vector>

import h.c_header_converter;

std::pmr::vector<std::filesystem::path> convert_to_path(std::span<std::string const> const values)
{
    std::pmr::vector<std::filesystem::path> output;
    output.reserve(values.size());

    for (std::string const& value : values)
    {
        output.push_back(value);
    }

    return output;
}

int main(int const argc, char const* const argv[])
{
    argparse::ArgumentParser program("hlang_c_header_importer");

    program.add_argument("header_name")
        .help("Header name of the converted output hlang module")
        .required();
    program.add_argument("header_path")
        .help("Source file path.")
        .required();
    program.add_argument("output_path")
        .help("Destination file path.")
        .required();
    program.add_argument("--include-directory")
        .help("Specify an include directory")
        .default_value<std::vector<std::string>>({})
        .append();

    try
    {
        program.parse_args(argc, argv);
    }
    catch (std::exception const& error)
    {
        std::cerr << error.what() << std::endl;
        std::cerr << program;
        std::exit(1);
    }

    std::string const& header_name = program.get<std::string>("header_name");
    std::filesystem::path const header_path = program.get<std::string>("header_path");
    std::filesystem::path const output_path = program.get<std::string>("output_path");
    std::pmr::vector<std::filesystem::path> const include_directories = convert_to_path(program.get<std::vector<std::string>>("--include-directory"));
    
    h::c::Options const options =
    {
        .include_directories = include_directories
    };

    h::c::import_header_and_write_to_file(header_name, header_path, output_path, options);

    return 0;
}
