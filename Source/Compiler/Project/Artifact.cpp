module;

#include <nlohmann/json.hpp>

#include <filesystem>
#include <memory_resource>
#include <optional>
#include <regex>
#include <span>
#include <string_view>
#include <unordered_map>
#include <variant>
#include <vector>

module h.compiler.artifact;

import h.common;
import h.compiler.common;
import h.compiler.target;

namespace h::compiler
{
    Version parse_version(std::string_view const string)
    {
        std::string_view::size_type const first_dot = string.find_first_of(".");
        std::string_view::size_type const last_dot = string.find_last_of(".");

        std::uint32_t major = 0;
        std::from_chars(string.data(), string.data() + first_dot, major);

        std::uint32_t minor = 0;
        std::from_chars(string.data() + first_dot + 1, string.data() + last_dot, minor);

        std::uint32_t patch = 0;
        std::from_chars(string.data() + last_dot + 1, string.data() + string.size(), patch);

        return Version
        {
            .major = major,
            .minor = minor,
            .patch = patch
        };
    }

    Artifact_type parse_artifact_type(std::string_view const string)
    {
        if (string == "executable")
            return Artifact_type::Executable;
        else if (string == "library")
            return Artifact_type::Library;

        h::common::print_message_and_exit(std::format("Failed to parse artifact type '{}'", string));
        return Artifact_type{};
    }

    std::pmr::vector<Dependency> parse_dependencies(nlohmann::json const& json)
    {
        if (!json.contains("dependencies"))
            return {};

        nlohmann::json const dependencies_json = json.at("dependencies");

        std::pmr::vector<Dependency> dependencies;
        dependencies.reserve(json.size());

        for (nlohmann::json const& dependency_json : dependencies_json)
        {
            std::pmr::string name = dependency_json.at("name").get<std::pmr::string>();

            dependencies.push_back(
                Dependency
                {
                    .artifact_name = std::move(name)
                }
            );
        }

        return dependencies;
    }

    std::pmr::vector<std::pmr::string> parse_include(nlohmann::json const& json)
    {
        std::pmr::vector<std::pmr::string> includes;
        includes.reserve(json.size());

        for (nlohmann::json const& element : json)
        {
            includes.push_back(
                element.get<std::pmr::string>()
            );
        }

        return includes;
    }


    Executable_info parse_executable_info(nlohmann::json const& json)
    {
        return Executable_info
        {
            .source = json.at("source").get<std::pmr::string>(),
            .entry_point = json.at("entry_point").get<std::pmr::string>(),
            .include = parse_include(json.at("include")),
        };
    }

    std::pmr::vector<C_header> parse_c_headers(nlohmann::json const& json)
    {
        std::pmr::vector<C_header> headers;
        headers.reserve(json.size());

        for (nlohmann::json const& element : json)
        {
            headers.push_back(
                C_header
                {
                    .module_name = element.at("name").get<std::pmr::string>(),
                    .header = element.at("header").get<std::pmr::string>(),
                }
                );
        }

        return headers;
    }

    std::pmr::unordered_map<std::pmr::string, std::pmr::string> parse_external_library(nlohmann::json const& json)
    {
        std::pmr::unordered_map<std::pmr::string, std::pmr::string> map;
        map.reserve(json.size());

        for (auto const& pair : json.items())
        {
            std::pmr::string key = std::pmr::string{ pair.key() };
            std::pmr::string value = pair.value().get<std::pmr::string>();
            map.insert(std::make_pair(std::move(key), std::move(value)));
        }

        return map;
    }

    Library_info parse_library_info(nlohmann::json const& json)
    {
        return Library_info
        {
            .c_headers = parse_c_headers(json.at("c_headers")),
            .external_libraries = parse_external_library(json.at("external_library"))
        };
    }

    std::optional<std::variant<Executable_info, Library_info>> parse_info(nlohmann::json const& json)
    {
        if (json.contains("executable"))
        {
            return parse_executable_info(json.at("executable"));
        }
        else if (json.contains("library"))
        {
            return parse_library_info(json.at("library"));
        }
        else
        {
            return std::nullopt;
        }
    }

    Artifact get_artifact(std::filesystem::path const& artifact_file_path)
    {
        std::optional<std::pmr::string> const json_data = h::common::get_file_contents(artifact_file_path.c_str());
        if (!json_data.has_value())
            h::common::print_message_and_exit(std::format("Failed to read contents of {}", artifact_file_path.generic_string()));

        nlohmann::json const json = nlohmann::json::parse(json_data.value());

        std::pmr::string const name = json.at("name").get<std::string>().c_str();

        Version const version = parse_version(json.at("version").get<std::string>());

        Artifact_type const type = parse_artifact_type(json.at("type").get<std::string>());

        std::pmr::vector<Dependency> dependencies = parse_dependencies(json);

        std::optional<std::variant<Executable_info, Library_info>> info = parse_info(json);

        return Artifact
        {
            .file_path = artifact_file_path,
            .name = std::move(name),
            .version = version,
            .type = type,
            .dependencies = std::move(dependencies),
            .info = std::move(info),
        };
    }

    void write_artifact_to_file(Artifact const& artifact, std::filesystem::path const& artifact_file_path)
    {
        nlohmann::json json;
        json["name"] = artifact.name;
        json["version"] = std::format("{}.{}.{}", artifact.version.major, artifact.version.minor, artifact.version.patch);

        if (artifact.type == Artifact_type::Executable)
            json["type"] = "executable";
        else if (artifact.type == Artifact_type::Library)
            json["type"] = "library";
        else
            h::common::print_message_and_exit("Did not handle artifact.type!");

        if (!artifact.dependencies.empty())
        {
            nlohmann::json dependencies_json;

            for (Dependency const& dependency : artifact.dependencies)
            {
                nlohmann::json dependency_json
                {
                    { "name", dependency.artifact_name }
                };

                dependencies_json.push_back(std::move(dependency_json));
            }

            json["dependencies"] = std::move(dependencies_json);
        }

        if (artifact.info.has_value())
        {
            if (std::holds_alternative<Executable_info>(*artifact.info))
            {
                Executable_info const& executable_info = std::get<Executable_info>(*artifact.info);

                nlohmann::json executable_json
                {
                    { "source", executable_info.source },
                    { "entry_point", executable_info.entry_point },
                };

                if (!executable_info.include.empty())
                {
                    nlohmann::json include_json;

                    for (std::pmr::string const& include : executable_info.include)
                    {
                        include_json.push_back(std::move(include));
                    }

                    executable_json["include"] = std::move(include_json);
                }

                json["executable"] = std::move(executable_json);
            }
            else if (std::holds_alternative<Library_info>(*artifact.info))
            {
                Library_info const& library_info = std::get<Library_info>(*artifact.info);

                nlohmann::json library_json;

                if (!library_info.c_headers.empty())
                {
                    nlohmann::json c_headers_json;

                    for (C_header const& c_header : library_info.c_headers)
                    {
                        nlohmann::json c_header_json
                        {
                            { "name", c_header.module_name },
                            { "header", c_header.header },
                        };

                        c_headers_json.push_back(std::move(c_header_json));
                    }

                    json["c_headers"] = std::move(c_headers_json);
                }

                if (!library_info.external_libraries.empty())
                {
                    nlohmann::json external_libraries_json;

                    for (auto const& pair : library_info.external_libraries)
                    {
                        external_libraries_json[pair.first.c_str()] = pair.second;
                    }

                    json["external_libraries"] = std::move(external_libraries_json);
                }

                if (!library_json.empty())
                    json["library"] = std::move(library_json);
            }
        }

        std::string const json_string = json.dump(4);
        h::common::write_to_file(artifact_file_path, json_string);
    }


    std::span<C_header const> get_c_headers(Artifact const& artifact)
    {
        if (artifact.info.has_value())
        {
            if (std::holds_alternative<Library_info>(*artifact.info))
            {
                Library_info const& library_info = std::get<Library_info>(*artifact.info);
                return library_info.c_headers;
            }
        }

        return {};
    }

    static std::optional<std::filesystem::path> search_file(
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

    std::optional<std::filesystem::path> find_c_header_path(
        std::string_view const c_header,
        std::span<std::filesystem::path const> search_paths
    )
    {
        return search_file(c_header, search_paths);
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


    bool visit_included_files(
        std::filesystem::path const& root_path,
        std::string_view const regular_expression,
        std::function<bool(std::filesystem::path)> const& predicate
    )
    {
        // Current directory:
        if (regular_expression.starts_with("./"))
        {
            return visit_included_files(root_path, regular_expression.substr(2), predicate);
        }
        // Go to parent directory:
        else if (regular_expression.starts_with("../"))
        {
            return visit_included_files(root_path.parent_path(), regular_expression.substr(3), predicate);
        }
        // Recursively iterate through subdirectories
        else if (regular_expression.starts_with("**/"))
        {
            // Files in the current directory:
            {
                bool const done = visit_included_files(root_path, regular_expression.substr(3), predicate);
                if (done)
                    return true;
            }

            // Files in subdirectories:
            for (const std::filesystem::directory_entry& entry : std::filesystem::recursive_directory_iterator{ root_path })
            {
                if (entry.is_directory())
                {
                    bool const done = visit_included_files(entry.path(), regular_expression.substr(3), predicate);
                    if (done)
                        return true;
                }
            }

            return false;
        }

        // Go to next directory:
        {
            auto const location = regular_expression.find_first_of("/");
            if (location != std::string_view::npos)
            {
                std::string_view const next_directory{ regular_expression.begin(), regular_expression.begin() + location };
                return visit_included_files(root_path / next_directory, regular_expression.substr(location + 1), predicate);
            }
        }

        std::regex const regex = create_regex(regular_expression);

        // Find finds in the current directory:
        {
            for (const std::filesystem::directory_entry& entry : std::filesystem::directory_iterator{ root_path })
            {
                if (entry.is_regular_file())
                {
                    std::filesystem::path const entry_relative_path = std::filesystem::relative(entry.path(), root_path);

                    if (std::regex_match(entry_relative_path.generic_string(), regex))
                    {
                        if (predicate(entry.path()))
                            return true;
                    }
                }
            }

            return false;
        }
    }

    bool visit_included_files(
        Artifact const& artifact,
        std::function<bool(std::filesystem::path)> const& predicate
    )
    {
        if (artifact.info.has_value())
        {
            if (std::holds_alternative<Executable_info>(*artifact.info))
            {
                Executable_info const& executable_info = std::get<Executable_info>(*artifact.info);

                for (std::string_view const& regular_expression : executable_info.include)
                {
                    bool const done = visit_included_files(artifact.file_path.parent_path(), regular_expression, predicate);
                    if (done)
                        return true;
                }
            }
        }

        return false;
    }

    std::pmr::vector<std::filesystem::path> find_included_files(
        std::filesystem::path const& root_path,
        std::string_view const regular_expression,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<std::filesystem::path> found_paths{ output_allocator };

        std::function<bool(std::filesystem::path)> predicate = [&found_paths](std::filesystem::path const& file_path) -> bool
        {
            found_paths.push_back(file_path);
            return false;
        };

        visit_included_files(root_path, regular_expression, predicate);

        return found_paths;
    }

    std::pmr::vector<std::filesystem::path> find_included_files(
        std::filesystem::path const& root_path,
        std::span<std::pmr::string const> const regular_expressions,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::monotonic_buffer_resource temporaries_buffer_resource;
        std::pmr::polymorphic_allocator<> temporaries_allocator{ &temporaries_buffer_resource };

        std::pmr::vector<std::filesystem::path> all_found_files{ temporaries_allocator };

        for (std::string_view const& regular_expression : regular_expressions)
        {
            std::pmr::vector<std::filesystem::path> const found_files = find_included_files(root_path, regular_expression, temporaries_allocator);

            all_found_files.insert(all_found_files.end(), found_files.begin(), found_files.end());
        }

        std::pmr::vector<std::filesystem::path> output{ output_allocator };
        output.assign(all_found_files.begin(), all_found_files.end());
        return output;
    }


    std::pmr::vector<std::filesystem::path> find_included_files(
        Artifact const& artifact,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::monotonic_buffer_resource temporaries_buffer_resource;
        std::pmr::polymorphic_allocator<> temporaries_allocator{ &temporaries_buffer_resource };

        if (artifact.info.has_value())
        {
            if (std::holds_alternative<Executable_info>(*artifact.info))
            {
                Executable_info const& executable_info = std::get<Executable_info>(*artifact.info);

                return find_included_files(artifact.file_path.parent_path(), executable_info.include, output_allocator);
            }
        }

        return std::pmr::vector<std::filesystem::path>{ output_allocator };
    }


    std::filesystem::path find_root_include_directory(
        std::filesystem::path const& root_path,
        std::string_view const regular_expression
    )
    {
        // Current directory:
        if (regular_expression.starts_with("./"))
        {
            return find_root_include_directory(root_path, regular_expression.substr(2));
        }
        // Go to parent directory:
        else if (regular_expression.starts_with("../"))
        {
            return find_root_include_directory(root_path.parent_path(), regular_expression.substr(3));
        }
        // Recursively iterate through subdirectories
        else if (regular_expression.starts_with("**/"))
        {
            return root_path;
        }

        // Go to next directory:
        {
            auto const location = regular_expression.find_first_of("/");
            if (location != std::string_view::npos)
            {
                std::string_view const next_directory{ regular_expression.begin(), regular_expression.begin() + location };
                return find_root_include_directory(root_path / next_directory, regular_expression.substr(location + 1));
            }
        }

        return root_path;
    }

    std::pmr::vector<std::filesystem::path> find_root_include_directories(
        std::filesystem::path const& root_path,
        std::span<std::pmr::string const> const regular_expressions,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::monotonic_buffer_resource temporaries_buffer_resource;
        std::pmr::polymorphic_allocator<> temporaries_allocator{ &temporaries_buffer_resource };

        std::pmr::vector<std::filesystem::path> all_found_roots{ temporaries_allocator };

        for (std::string_view const& regular_expression : regular_expressions)
        {
            std::filesystem::path const found_root = find_root_include_directory(root_path, regular_expression);
            all_found_roots.push_back(found_root);
        }

        std::pmr::vector<std::filesystem::path> output{ output_allocator };
        output.assign(all_found_roots.begin(), all_found_roots.end());
        return output;
    }

    std::pmr::vector<std::filesystem::path> find_root_include_directories(
        Artifact const& artifact,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::monotonic_buffer_resource temporaries_buffer_resource;
        std::pmr::polymorphic_allocator<> temporaries_allocator{ &temporaries_buffer_resource };

        if (artifact.info.has_value())
        {
            if (std::holds_alternative<Executable_info>(*artifact.info))
            {
                Executable_info const& executable_info = std::get<Executable_info>(*artifact.info);

                return find_root_include_directories(artifact.file_path.parent_path(), executable_info.include, output_allocator);
            }
        }

        return std::pmr::vector<std::filesystem::path>{ output_allocator };
    }

    std::optional<External_library_info> get_external_library(
        std::pmr::unordered_map<std::pmr::string, std::pmr::string> const& external_libraries,
        Target const& target,
        bool const prefer_dynamic
    )
    {
        {
            std::string const first_target_library = std::format("{}-{}-release", target.operating_system, prefer_dynamic ? "dynamic" : "static");

            auto const location = external_libraries.find(first_target_library.c_str());
            if (location != external_libraries.end())
            {
                return External_library_info
                {
                    .name = location->second,
                    .is_dynamic = prefer_dynamic
                };
            }
        }

        {
            std::string const second_target_library = std::format("{}-{}-release", target.operating_system, prefer_dynamic ? "static" : "dynamic");

            auto const location = external_libraries.find(second_target_library.c_str());
            if (location != external_libraries.end())
            {
                return External_library_info
                {
                    .name = location->second,
                    .is_dynamic = !prefer_dynamic
                };
            }
        }

        return std::nullopt;
    }
}
