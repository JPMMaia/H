module;

#include <nlohmann/json.hpp>

#include <cstdio>
#include <filesystem>
#include <memory_resource>
#include <regex>
#include <string>
#include <optional>
#include <span>
#include <unordered_map>

module h.builder;

import h.common;
import h.core;
import h.compiler;
import h.compiler.common;
import h.compiler.linker;
import h.compiler.repository;
import h.compiler.target;
import h.c_header_converter;
import h.json_serializer;
import h.parser;

namespace h::builder
{
    static void create_directory_if_it_does_not_exist(std::filesystem::path const& path)
    {
        if (!std::filesystem::exists(path))
        {
            std::filesystem::create_directories(path);
        }
    }

    static std::filesystem::path parse_if_needed(
        h::parser::Parser const& parser,
        std::filesystem::path const& file_path,
        std::filesystem::path const& build_directory_path
    )
    {
        if (file_path.extension() == "hl")
            return file_path;

        std::filesystem::path const& output_path = build_directory_path / file_path.filename().replace_extension("hl");

        h::parser::parse(parser, file_path, output_path);

        return output_path;
    }

    void build_executable(
        h::compiler::Target const& target,
        h::parser::Parser const& parser,
        std::span<std::filesystem::path const> const source_file_paths,
        std::span<std::pmr::string const> const libraries,
        std::filesystem::path const& build_directory_path,
        std::filesystem::path const& output_path,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path>& module_name_to_file_path_map,
        h::compiler::Linker_options const& linker_options
    )
    {
        create_directory_if_it_does_not_exist(build_directory_path);
        create_directory_if_it_does_not_exist(output_path.parent_path());

        std::pmr::vector<std::filesystem::path> parsed_source_file_paths;
        parsed_source_file_paths.reserve(source_file_paths.size());

        // Parse all source files:
        for (std::filesystem::path const& source_file_path : source_file_paths)
        {
            std::filesystem::path const parsed_file_path = parse_if_needed(parser, source_file_path, build_directory_path);
            parsed_source_file_paths.push_back(parsed_file_path);
        }

        // Read module names:
        for (std::filesystem::path const& parsed_file_path : parsed_source_file_paths)
        {
            std::optional<std::pmr::string> const module_name = h::json::read_module_name(parsed_file_path);
            if (!module_name.has_value())
                h::common::print_message_and_exit(std::format("Failed to read module name of {}", parsed_file_path.generic_string()));

            module_name_to_file_path_map.insert(std::make_pair(module_name.value(), parsed_file_path));
        }

        std::pmr::vector<std::filesystem::path> object_file_paths;
        object_file_paths.reserve(source_file_paths.size());

        // Compile each module:
        for (std::filesystem::path const& parsed_file_path : parsed_source_file_paths)
        {
            std::optional<std::pmr::string> const json_data = h::common::get_file_contents(parsed_file_path);
            if (!json_data.has_value())
                h::common::print_message_and_exit(std::format("Failed to read contents of {}", parsed_file_path.generic_string()));

            std::optional<h::Module> const module = h::json::read<h::Module>(json_data.value().c_str());
            if (!module.has_value())
                h::common::print_message_and_exit(std::format("Failed to read module contents of {}", parsed_file_path.generic_string()));

            std::string_view const entry_point = linker_options.entry_point;

            h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm();
            h::compiler::LLVM_module_data llvm_module_data = h::compiler::create_llvm_module(llvm_data, module.value(), module_name_to_file_path_map);

            std::filesystem::path const output_assembly_file = build_directory_path / std::format("{}.ll", module.value().name);
            h::compiler::write_to_file(llvm_data, *llvm_module_data.module, output_assembly_file);

            object_file_paths.push_back(output_assembly_file);
        }

        // Link:
        std::filesystem::path const output_executable_path = target.operating_system == "windows" ? std::format("{}.exe", output_path.generic_string()) : output_path;
        if (h::compiler::link(object_file_paths, libraries, output_executable_path, linker_options))
        {
            std::uintmax_t const executable_size = std::filesystem::file_size(output_executable_path);
            std::puts(std::format("Created {} ({} bytes)", output_executable_path.generic_string(), executable_size).c_str());
        }
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

    static std::optional<std::pmr::string> get_external_library(nlohmann::json const& json, h::compiler::Target const& target)
    {
        nlohmann::json const external_library_json = json.at("external_library");

        bool const prefer_dynamic = true;

        {
            std::string const first_target_library = std::format("{}-{}-release", target.operating_system, prefer_dynamic ? "dynamic" : "static");

            if (external_library_json.contains(first_target_library))
            {
                return external_library_json.at(first_target_library);
            }
        }

        {
            std::string const second_target_library = std::format("{}-{}-release", target.operating_system, prefer_dynamic ? "static" : "dynamic");

            if (external_library_json.contains(second_target_library))
            {
                return external_library_json.at(second_target_library);
            }
        }

        return std::nullopt;
    }

    static std::regex create_regex(std::string_view const regular_expression)
    {
        std::pmr::string modified_regular_expression{ regular_expression.begin(), regular_expression.begin() + regular_expression.size() };
        for (std::size_t index = 0; index < modified_regular_expression.size(); ++index)
        {
            // Escape dots:
            if (modified_regular_expression[index] == '.')
            {
                std::string_view const insert_value = "\\";
                modified_regular_expression.insert(index, insert_value);
                index += insert_value.size();
            }
            // '*' needs to match any valid path character:
            else if (modified_regular_expression[index] == '*')
            {
                std::string_view const insert_value = "[A-Za-z0-9\\-_\\.]";
                modified_regular_expression.insert(index, insert_value);
                index += insert_value.size();
            }
        }
        // Match the whole expression:
        modified_regular_expression.insert(0, "^");
        modified_regular_expression.push_back('$');

        std::regex const regex{ modified_regular_expression };

        return regex;
    }

    static std::pmr::vector<std::filesystem::path> find_files_in_filesystem(
        std::filesystem::path const& root_path,
        std::string_view const regular_expression,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        // Current directory:
        if (regular_expression.starts_with("./"))
        {
            return find_files_in_filesystem(root_path, regular_expression.substr(2), output_allocator);
        }
        // Go to parent directory:
        else if (regular_expression.starts_with("../"))
        {
            return find_files_in_filesystem(root_path.parent_path(), regular_expression.substr(3), output_allocator);
        }
        // Recursively iterate through subdirectories
        else if (regular_expression.starts_with("**/"))
        {
            std::pmr::vector<std::filesystem::path> found_paths{ output_allocator };

            // Files in the current directory:
            {
                std::pmr::vector<std::filesystem::path> file_paths = find_files_in_filesystem(root_path, regular_expression.substr(3), output_allocator);
                found_paths.insert(found_paths.end(), file_paths.begin(), file_paths.end());
            }

            // Files in subdirectories:
            for (const std::filesystem::directory_entry& entry : std::filesystem::recursive_directory_iterator{ root_path })
            {
                if (entry.is_directory())
                {
                    std::pmr::vector<std::filesystem::path> file_paths = find_files_in_filesystem(entry.path(), regular_expression.substr(3), output_allocator);
                    found_paths.insert(found_paths.end(), file_paths.begin(), file_paths.end());
                }
            }

            return found_paths;
        }

        // Go to next directory:
        {
            auto const location = regular_expression.find_first_of("/");
            if (location != std::string_view::npos)
            {
                std::string_view const next_directory{ regular_expression.begin(), regular_expression.begin() + location };
                return find_files_in_filesystem(root_path / next_directory, regular_expression.substr(location + 1), output_allocator);
            }
        }

        std::regex const regex = create_regex(regular_expression);

        // Find finds in the current directory:
        {
            std::pmr::vector<std::filesystem::path> found_paths{ output_allocator };

            for (const std::filesystem::directory_entry& entry : std::filesystem::directory_iterator{ root_path })
            {
                if (entry.is_regular_file())
                {
                    std::filesystem::path const entry_relative_path = std::filesystem::relative(entry.path(), root_path);

                    if (std::regex_match(entry_relative_path.generic_string(), regex))
                    {
                        found_paths.push_back(entry.path());
                    }
                }
            }

            return found_paths;
        }
    }

    static std::pmr::vector<std::filesystem::path> find_included_files(
        nlohmann::json const& json,
        std::filesystem::path const& root_path,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path>& module_name_to_file_path_map
    )
    {
        std::pmr::monotonic_buffer_resource temporaries_buffer_resource;
        std::pmr::polymorphic_allocator<> temporaries_allocator{ &temporaries_buffer_resource };

        std::pmr::vector<std::filesystem::path> output;

        if (json.contains("include"))
        {
            nlohmann::json const& include_json = json.at("include");

            for (nlohmann::json const& element : include_json)
            {
                std::string const& include_path_regular_expression = element.get<std::string>();

                temporaries_buffer_resource.release();
                std::pmr::vector<std::filesystem::path> const found_files = find_files_in_filesystem(root_path, include_path_regular_expression, temporaries_allocator);

                output.insert(output.end(), found_files.begin(), found_files.end());
            }
        }

        return output;
    }

    static void build_artifact_auxiliary(
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path>& module_name_to_file_path_map,
        std::pmr::vector<std::pmr::string>& libraries,
        h::compiler::Target const& target,
        h::parser::Parser const& parser,
        std::filesystem::path const& configuration_file_path,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> const header_search_paths,
        std::span<h::compiler::Repository const> const repositories
    )
    {
        create_directory_if_it_does_not_exist(build_directory_path);

        std::optional<std::pmr::string> const json_data = h::common::get_file_contents(configuration_file_path);
        if (!json_data.has_value())
            h::common::print_message_and_exit(std::format("Failed to read contents of {}", configuration_file_path.generic_string()));

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
                    h::common::print_message_and_exit(std::format("Could not find header {}. Please provide its location using --header-search-path.", header));

                std::filesystem::path const header_module_filename = header_path.value().filename().replace_extension("hl");
                std::filesystem::path const output_header_module_path = output_directory_path / header_module_filename;

                h::c::import_header_and_write_to_file(header_name, header_path.value(), output_header_module_path);

                module_name_to_file_path_map.insert(std::make_pair(std::pmr::string{ header_name }, output_header_module_path));
            }
        }

        if (json.contains("external_library"))
        {
            std::optional<std::pmr::string> const external_library = get_external_library(json, target);
            if (external_library.has_value())
            {
                libraries.push_back(external_library.value());
            }
        }

        if (json.contains("dependencies"))
        {
            for (nlohmann::json const& element : json.at("dependencies"))
            {
                std::string const dependency_name = element.at("name").get<std::string>();

                std::optional<std::filesystem::path> const dependency_location = get_artifact_location(repositories, dependency_name);
                if (!dependency_location.has_value())
                    h::common::print_message_and_exit(std::format("Could not find dependency {}.", dependency_name));

                std::filesystem::path const dependency_configuration_file_path = dependency_location.value();

                build_artifact_auxiliary(module_name_to_file_path_map, libraries, target, parser, dependency_configuration_file_path, build_directory_path, header_search_paths, repositories);
            }
        }

        std::string const& type = json.at("type").get<std::string>();

        if (type == "executable")
        {
            if (json.contains("executable"))
            {
                nlohmann::json const& executable_json = json.at("executable");
                std::string const& entry_point = executable_json.at("entry_point").get<std::string>();

                std::filesystem::path const output_location = build_directory_path / "bin" / artifact_name;

                h::compiler::Linker_options const linker_options
                {
                    .entry_point = entry_point
                };

                std::pmr::vector<std::filesystem::path> const source_file_paths = find_included_files(executable_json, configuration_file_path.parent_path(), module_name_to_file_path_map);

                build_executable(target, parser, source_file_paths, libraries, build_directory_path / artifact_name, output_location, module_name_to_file_path_map, linker_options);
            }
        }
    }

    void build_artifact(
        h::compiler::Target const& target,
        h::parser::Parser const& parser,
        std::filesystem::path const& configuration_file_path,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> const header_search_paths,
        std::span<h::compiler::Repository const> const repositories
    )
    {
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> module_name_to_file_path_map;
        std::pmr::vector<std::pmr::string> libraries;
        build_artifact_auxiliary(module_name_to_file_path_map, libraries, target, parser, configuration_file_path, build_directory_path, header_search_paths, repositories);
    }
}
