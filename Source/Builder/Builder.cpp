module;

#include <clang/AST/ASTContext.h>
#include <clang/AST/Decl.h>
#include <clang/AST/DeclBase.h>
#include <clang/AST/Type.h>

#include <nlohmann/json.hpp>

#include <cstdio>
#include <filesystem>
#include <memory_resource>
#include <regex>
#include <string>
#include <optional>
#include <span>
#include <sstream>
#include <unordered_map>
#include <variant>

module h.builder;

import h.common;
import h.core;
import h.core.declarations;
import h.core.struct_layout;
import h.compiler;
import h.compiler.artifact;
import h.compiler.clang_code_generation;
import h.compiler.clang_data;
import h.compiler.common;
import h.compiler.linker;
import h.compiler.repository;
import h.compiler.target;
import h.compiler.types;
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
        h::compiler::Compilation_options const& compilation_options,
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
            std::optional<h::Module> const core_module = h::compiler::read_core_module(parsed_file_path);
            if (!core_module.has_value())
                h::common::print_message_and_exit(std::format("Failed to read module contents of {}", parsed_file_path.generic_string()));

            std::string_view const entry_point = linker_options.entry_point;

            h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm({});
            h::compiler::LLVM_module_data llvm_module_data = h::compiler::create_llvm_module(llvm_data, core_module.value(), module_name_to_file_path_map, compilation_options);

            // TODO For link time optimization (LTO) we need to output bitcode instead of objects
            //std::filesystem::path const output_assembly_file = build_directory_path / std::format("{}.ll", core_module.value().name);
            //h::compiler::write_bitcode_to_file(llvm_data, *llvm_module_data.module, output_assembly_file);*/

            std::filesystem::path const output_assembly_file = build_directory_path / std::format("{}.o", core_module.value().name);
            h::compiler::write_object_file(llvm_data, *llvm_module_data.module, output_assembly_file);

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
        std::span<h::compiler::Repository const> const repositories,
        h::compiler::Compilation_options const& compilation_options
    )
    {
        create_directory_if_it_does_not_exist(build_directory_path);

        h::compiler::Artifact const artifact = h::compiler::get_artifact(configuration_file_path);

        std::filesystem::path const output_directory_path = build_directory_path / artifact.name;
        create_directory_if_it_does_not_exist(output_directory_path);

        for (h::compiler::Dependency const& dependency : artifact.dependencies)
        {
            std::optional<std::filesystem::path> const dependency_location = h::compiler::get_artifact_location(repositories, dependency.artifact_name);
            if (!dependency_location.has_value())
                h::common::print_message_and_exit(std::format("Could not find dependency {}.", dependency.artifact_name));

            std::filesystem::path const dependency_configuration_file_path = dependency_location.value();

            build_artifact_auxiliary(module_name_to_file_path_map, libraries, target, parser, dependency_configuration_file_path, build_directory_path, header_search_paths, repositories, compilation_options);
        }

        if (artifact.info.has_value() && std::holds_alternative<h::compiler::Library_info>(*artifact.info))
        {
            h::compiler::Library_info const& library_info = std::get<h::compiler::Library_info>(*artifact.info);

            for (h::compiler::C_header const& c_header : library_info.c_headers)
            {
                std::string_view const header_module_name = c_header.module_name;
                std::string_view const header_filename = c_header.header;

                std::optional<std::filesystem::path> const header_path = h::compiler::find_c_header_path(header_filename, header_search_paths);
                if (!header_path.has_value())
                    h::common::print_message_and_exit(std::format("Could not find header {}. Please provide its location using --header-search-path.", header_filename));

                std::filesystem::path const header_module_filename = header_path.value().filename().replace_extension("hl");
                std::filesystem::path const output_header_module_path = output_directory_path / header_module_filename;

                h::c::import_header_and_write_to_file(header_module_name, header_path.value(), output_header_module_path, {});

                module_name_to_file_path_map.insert(std::make_pair(std::pmr::string{ header_module_name }, output_header_module_path));
            }

            std::optional<h::compiler::External_library_info> const external_library = h::compiler::get_external_library(library_info.external_libraries, target, true);
            if (external_library.has_value())
            {
                libraries.push_back(external_library.value().name);
            }
        }

        if (artifact.info.has_value() && std::holds_alternative<h::compiler::Executable_info>(*artifact.info))
        {
            h::compiler::Executable_info const& executable_info = std::get<h::compiler::Executable_info>(*artifact.info);

            std::filesystem::path const output_location = build_directory_path / "bin" / artifact.name;

            h::compiler::Linker_options const linker_options
            {
                .entry_point = executable_info.entry_point,
                .debug = compilation_options.debug
            };

            std::pmr::vector<std::filesystem::path> const source_file_paths = h::compiler::find_included_files(artifact, {});

            build_executable(target, parser, source_file_paths, libraries, build_directory_path / artifact.name, output_location, module_name_to_file_path_map, compilation_options, linker_options);
        }
    }

    void build_artifact(
        h::compiler::Target const& target,
        h::parser::Parser const& parser,
        std::filesystem::path const& configuration_file_path,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> const header_search_paths,
        std::span<h::compiler::Repository const> const repositories,
        h::compiler::Compilation_options const& compilation_options
    )
    {
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> module_name_to_file_path_map;
        std::pmr::vector<std::pmr::string> libraries;
        build_artifact_auxiliary(module_name_to_file_path_map, libraries, target, parser, configuration_file_path, build_directory_path, header_search_paths, repositories, compilation_options);
    }

    void print_struct_layout(
        std::filesystem::path const input_file_path,
        std::string_view const struct_name,
        std::optional<std::string_view> const target_triple
    )
    {
        std::optional<h::Module> core_module = h::compiler::read_core_module(input_file_path);
        if (!core_module.has_value())
            h::common::print_message_and_exit(std::format("Failed to read module of '{}'", input_file_path.generic_string()));

        h::compiler::LLVM_options const options
        {
            .target_triple = target_triple
        };
        h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm(options);

        h::Declaration_database declaration_database = h::create_declaration_database();
        h::add_declarations(declaration_database, *core_module);

        h::compiler::Clang_module_data clang_module_data = h::compiler::create_clang_module_data(
            *llvm_data.context,
            llvm_data.clang_data,
            *core_module,
            {},
            declaration_database
        );

        h::compiler::Type_database type_database = h::compiler::create_type_database(*llvm_data.context);
        h::compiler::add_module_types(type_database, *llvm_data.context, llvm_data.data_layout, clang_module_data, *core_module);

        h::Struct_layout const struct_layout = h::compiler::calculate_struct_layout(llvm_data.data_layout, type_database, core_module->name, struct_name);

        std::stringstream string_stream;
        string_stream << struct_layout;
        std::string const output = string_stream.str();
        std::puts(output.c_str());
    }
}
