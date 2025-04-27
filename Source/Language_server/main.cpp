#include <argparse/argparse.hpp>

#include <filesystem>
#include <exception>
#include <optional>
#include <string>
#include <vector>

import h.compiler.artifact;
import h.compiler.repository;

import h.language_server.breakpoint;
import h.language_server.message_handler;
import h.language_server.server;

struct Source_file_info
{
    std::filesystem::path file_path;
    std::pmr::string module_name;
};

struct Project
{
    std::filesystem::path project_directory;
    std::pmr::vector<h::compiler::Repository> repositories;
    std::pmr::unordered_map<std::filesystem::path, h::compiler::Artifact> artifacts;
    std::pmr::unordered_map<std::filesystem::path, Source_file_info> artifact_to_source_files_map;
};

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

using namespace h::language_server;

int main(int const argc, char const* const* argv)
{
    /*argparse::ArgumentParser program("hlang_language_server");

    program.add_argument("project_directory")
        .help("Project directory")
        .required();

    program.add_argument("--repository")
        .help("Specify a repository")
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

    std::filesystem::path const project_directory_path = program.get<std::string>("project_directory");
    
    std::pmr::vector<std::filesystem::path> const repository_paths = convert_to_path(program.get<std::vector<std::string>>("--repository"));
    std::pmr::vector<h::compiler::Repository> const repositories = h::compiler::get_repositories(repository_paths);*/

    // TODO if debug
    //trigger_breakpoint();

    std::printf("Hlang Language Server started");

    Server server = create_server();
    Message_handler message_handler = create_message_handler(server, *stdin, *stdout);
    process_messages(message_handler);
    return 0;
}
