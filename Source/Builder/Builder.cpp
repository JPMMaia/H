module;

#include <nlohmann/json.hpp>

#include <cstdio>
#include <filesystem>
#include <string>
#include <optional>
#include <span>
#include <unordered_map>

module h.builder;

import h.core;
import h.compiler;
import h.compiler.common;
import h.compiler.linker;
import h.c_header_converter;
import h.json_serializer;

namespace h::builder
{
    void print_message_and_exit(std::string const& message)
    {
        std::puts(message.c_str());
        std::exit(-1);
    }

    void create_directory_if_it_does_not_exist(std::filesystem::path const& path)
    {
        std::filesystem::path const directory = !std::filesystem::is_directory(path) ? path.parent_path() : path;
        if (!std::filesystem::exists(directory))
        {
            std::filesystem::create_directory(directory);
        }
    }

    void build_executable(
        std::filesystem::path const& file_path,
        std::filesystem::path const& build_directory_path,
        std::filesystem::path const& output_path,
        std::span<std::filesystem::path const> const module_search_paths,
        h::compiler::Linker_options const& linker_options
    )
    {
        create_directory_if_it_does_not_exist(build_directory_path);
        create_directory_if_it_does_not_exist(output_path);

        // TODO pass an array of library paths
        // 
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map;

        std::optional<std::pmr::string> const json_data = h::compiler::get_file_contents(file_path);
        if (!json_data.has_value())
            print_message_and_exit(std::format("Failed to read contents of {}", file_path.generic_string()));

        std::optional<h::Module> const module = h::json::read<h::Module>(json_data.value().c_str());
        if (!module.has_value())
            print_message_and_exit(std::format("Failed to read module contents of {}", file_path.generic_string()));

        std::string_view const entry_point = linker_options.entry_point;

        h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm();
        h::compiler::LLVM_module_data llvm_module_data = h::compiler::create_llvm_module(llvm_data, module.value(), module_name_to_file_path_map);

        std::filesystem::path const output_assembly_file = build_directory_path / std::format("{}.{}.ll", module.value().name, entry_point);
        h::compiler::write_to_file(llvm_data, *llvm_module_data.module, output_assembly_file);

        h::compiler::link({ &output_assembly_file, 1 }, output_path, linker_options);
    }

    std::optional<std::filesystem::path> search_file(
        std::string_view const filename,
        std::span<std::filesystem::path const> const search_paths
    )
    {
        for (std::filesystem::path const& search_path : search_paths)
        {
            for (const std::filesystem::directory_entry& entry : std::filesystem::recursive_directory_iterator{ search_path })
            {
                if (entry.path().filename() == filename)
                {
                    return entry.path();
                }
            }
        }

        return std::nullopt;
    }

    void build_project(
        std::filesystem::path const& project_file_path,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> const header_search_paths
    )
    {
        create_directory_if_it_does_not_exist(build_directory_path);

        std::optional<std::pmr::string> const json_data = h::compiler::get_file_contents(project_file_path);
        if (!json_data.has_value())
            print_message_and_exit(std::format("Failed to read contents of {}", project_file_path.generic_string()));

        nlohmann::json const json = nlohmann::json::parse(json_data.value());

        std::string const project_name = json.at("name").get<std::string>();

        bool const is_c_library = json.contains("type") && json.at("type").get<std::string>() == "c_library";

        if (is_c_library)
        {
            std::filesystem::path const output_header_module_directory_path = build_directory_path / project_name;
            create_directory_if_it_does_not_exist(output_header_module_directory_path);

            if (json.contains("c_headers"))
            {

                for (nlohmann::json const& element : json.at("c_headers"))
                {
                    std::string const header_name = element.at("name").get<std::string>();
                    std::string const header = element.at("header").get<std::string>();

                    std::optional<std::filesystem::path> const header_path = search_file(header, header_search_paths);
                    if (!header_path.has_value())
                        print_message_and_exit(std::format("Could not find header {}. Please provide its location using --header-search-path.", header));

                    std::filesystem::path const header_module_filename = header_path.value().filename().replace_extension("hl");
                    std::filesystem::path const output_header_module_path = output_header_module_directory_path / header_module_filename;

                    h::c::import_header_and_write_to_file(header_name, header_path.value(), output_header_module_path);
                }
            }

            nlohmann::json const output_manifest = {
                {"name", project_name},
                {"version", json.at("version")},
                {"type", "external_library"}
            };

            std::filesystem::path const output_manifest_path = output_header_module_directory_path / "hlang_project.json";
            h::compiler::write_to_file(output_manifest_path, output_manifest.dump(4));
        }
    }
}
