module;

#include <nlohmann/json.hpp>

#include <cstdio>
#include <filesystem>
#include <string>
#include <optional>
#include <span>
#include <unordered_map>

module h.builder;

import h.builder.common;
import h.builder.repository;

import h.core;
import h.compiler;
import h.compiler.common;
import h.compiler.linker;
import h.c_header_converter;
import h.json_serializer;

namespace h::builder
{
    void create_directory_if_it_does_not_exist(std::filesystem::path const& path)
    {
        if (!std::filesystem::exists(path))
        {
            std::filesystem::create_directories(path);
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
        create_directory_if_it_does_not_exist(output_path.parent_path());

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

    void build_artifact(
        std::filesystem::path const& configuration_file_path,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> const header_search_paths,
        std::span<Repository const> const repositories
    )
    {
        create_directory_if_it_does_not_exist(build_directory_path);

        std::optional<std::pmr::string> const json_data = h::compiler::get_file_contents(configuration_file_path);
        if (!json_data.has_value())
            print_message_and_exit(std::format("Failed to read contents of {}", configuration_file_path.generic_string()));

        nlohmann::json const json = nlohmann::json::parse(json_data.value());

        std::string const& artifact_name = json.at("name").get<std::string>();

        std::filesystem::path const output_directory_path = build_directory_path / artifact_name;
        create_directory_if_it_does_not_exist(output_directory_path);

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
                std::filesystem::path const output_header_module_path = output_directory_path / header_module_filename;

                h::c::import_header_and_write_to_file(header_name, header_path.value(), output_header_module_path);
            }

            /*nlohmann::json const output_manifest = {
                {"name", artifact_name},
                {"version", json.at("version")},
                {"type", "external_library"}
            };

            std::filesystem::path const output_manifest_path = output_directory_path / "hlang_project.json";
            h::compiler::write_to_file(output_manifest_path, output_manifest.dump(4));*/
        }

        if (json.contains("dependencies"))
        {
            for (nlohmann::json const& element : json.at("dependencies"))
            {
                std::string const dependency_name = element.at("name").get<std::string>();

                std::optional<std::filesystem::path> const dependency_location = get_artifact_location(repositories, dependency_name);
                if (!dependency_location.has_value())
                    print_message_and_exit(std::format("Could not find dependency {}.", dependency_name));

                std::filesystem::path const dependency_configuration_file_path = dependency_location.value() / "hlang_artifact.json";

                build_artifact(dependency_configuration_file_path, build_directory_path, header_search_paths, repositories);
            }
        }

        std::string const& type = json.at("type").get<std::string>();

        if (type == "executable")
        {
            if (json.contains("executable"))
            {
                nlohmann::json const& executable_json = json.at("executable");
                std::string const& source = executable_json.at("source").get<std::string>();
                std::string const& entry_point = executable_json.at("entry_point").get<std::string>();

                std::filesystem::path const source_location = configuration_file_path.parent_path() / source;
                std::filesystem::path const output_location = build_directory_path / "bin" / artifact_name;

                h::compiler::Linker_options const linker_options
                {
                    .entry_point = entry_point
                };

                build_executable(source_location, build_directory_path, output_location, {}, linker_options);
            }
        }
    }
}
