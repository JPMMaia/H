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
import h.core;

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

    std::pmr::vector<std::pmr::string> parse_string_array(nlohmann::json const& json)
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

    std::pmr::vector<std::filesystem::path> parse_path_array(nlohmann::json const& json)
    {
        std::pmr::vector<std::filesystem::path> includes;
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
        };
    }

    std::pmr::vector<C_header> parse_c_headers(nlohmann::json const& json)
    {
        std::pmr::vector<C_header> headers;
        headers.reserve(json.size());

        for (nlohmann::json const& element : json)
        {
            C_header header
            {
                .module_name = element.at("name").get<std::pmr::string>(),
                .header = element.at("header").get<std::pmr::string>(),
                .options_key = {}
            };

            if (element.contains("options"))
                header.options_key = element.at("options").get<std::pmr::string>();

            headers.push_back(std::move(header));
        }

        return headers;
    }

    C_header_options parse_c_header_options(nlohmann::json const& json)
    {
        C_header_options options;

        if (json.contains("search_paths"))
            options.search_paths = parse_path_array(json.at("search_paths"));

        if (json.contains("public_prefixes"))
            options.public_prefixes = parse_string_array(json.at("public_prefixes"));

        if (json.contains("remove_prefixes"))
            options.remove_prefixes = parse_string_array(json.at("remove_prefixes"));

        return options;
    }

    std::pmr::unordered_map<std::pmr::string, C_header_options> parse_c_header_options_map(nlohmann::json const& json)
    {
        std::pmr::unordered_map<std::pmr::string, C_header_options> map;
        map.reserve(json.size());

        for (auto const& pair : json.items())
        {
            std::pmr::string key = std::pmr::string{ pair.key() };
            C_header_options value = parse_c_header_options(pair.value());
            map.insert(std::make_pair(std::move(key), std::move(value)));
        }

        return map;
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
        Library_info library_info;

        if (json.contains("c_headers"))
            library_info.c_headers = parse_c_headers(json.at("c_headers"));

        if (json.contains("c_header_options"))
            library_info.c_header_options = parse_c_header_options_map(json.at("c_header_options"));

        if (json.contains("external_library"))
            library_info.external_libraries = parse_external_library(json.at("external_library"));

        return library_info;
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

        std::pmr::vector<std::pmr::string> include = json.contains("include") ? parse_string_array(json.at("include")) : std::pmr::vector<std::pmr::string>{};

        std::optional<std::variant<Executable_info, Library_info>> info = parse_info(json);

        return Artifact
        {
            .file_path = artifact_file_path,
            .name = std::move(name),
            .version = version,
            .type = type,
            .dependencies = std::move(dependencies),
            .include = std::move(include),
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

        if (!artifact.include.empty())
        {
            nlohmann::json include_json;

            for (std::pmr::string const& include : artifact.include)
            {
                include_json.push_back(std::move(include));
            }

            json["include"] = std::move(include_json);
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

                        if (c_header.options_key.has_value())
                            json["options"] = c_header.options_key.value();

                        c_headers_json.push_back(std::move(c_header_json));
                    }

                    library_json["c_headers"] = std::move(c_headers_json);
                }

                if (!library_info.c_header_options.empty())
                {
                    nlohmann::json c_header_options_map_json;

                    for (auto const& pair : library_info.c_header_options)
                    {
                        nlohmann::json c_header_options_json;

                        C_header_options const& options = pair.second;

                        if (!options.search_paths.empty())
                        {
                            nlohmann::json search_paths_json;

                            for (std::filesystem::path const& search_path : options.search_paths)
                            {
                                search_paths_json.push_back(search_path.generic_string());
                            }

                            c_header_options_json["search_paths"] = std::move(search_paths_json);
                        }

                        if (!options.public_prefixes.empty())
                            c_header_options_json["public_prefixes"] = options.public_prefixes;

                        if (!options.remove_prefixes.empty())
                            c_header_options_json["remove_prefixes"] = options.remove_prefixes;
                        
                        c_header_options_map_json[pair.first.c_str()] = c_header_options_json;
                    }

                    library_json["c_header_options"] = std::move(c_header_options_map_json);
                }

                if (!library_info.external_libraries.empty())
                {
                    nlohmann::json external_libraries_json;

                    for (auto const& pair : library_info.external_libraries)
                    {
                        external_libraries_json[pair.first.c_str()] = pair.second;
                    }

                    library_json["external_libraries"] = std::move(external_libraries_json);
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

    h::compiler::C_header_options const* get_c_header_options(
        h::compiler::Library_info const& library_info,
        h::compiler::C_header const& c_header
    )
    {
        if (c_header.options_key.has_value())
        {
            auto const location = library_info.c_header_options.find(*c_header.options_key);
            if (location != library_info.c_header_options.end())
            {
                return &location->second;
            }
        }

        return nullptr;
    }

    C_header const* find_c_header(Artifact const& artifact, std::string_view const module_name)
    {
        if (artifact.info.has_value() && std::holds_alternative<Library_info>(*artifact.info))
        {
            Library_info const& library_info = std::get<Library_info>(*artifact.info);

            auto const is_c_header = [&](C_header const& c_header) -> bool
            {
                return c_header.module_name == module_name;
            };

            auto const location = std::find_if(library_info.c_headers.begin(), library_info.c_headers.end(), is_c_header);
            if (location != library_info.c_headers.end())
            {
                C_header const& c_header = *location;
                return &c_header;
            }
        }

        return nullptr;
    }

    C_header_options const* find_c_header_options(Artifact const& artifact, std::string_view const module_name)
    {
        if (artifact.info.has_value() && std::holds_alternative<Library_info>(*artifact.info))
        {
            Library_info const& library_info = std::get<Library_info>(*artifact.info);

            C_header const* const c_header = find_c_header(artifact, module_name);
            if (c_header != nullptr)
            {
                return get_c_header_options(
                    library_info,
                    *c_header
                );
            }
        }

        return nullptr;
    }

    static std::optional<std::filesystem::path> search_file(
        std::string_view const filename,
        std::span<std::filesystem::path const> const search_paths
    )
    {
        {
            std::filesystem::path const file_path = filename;
            if (file_path.is_absolute())
                return file_path;
        }

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
        for (std::string_view const regular_expression : artifact.include)
        {
            bool const done = visit_included_files(artifact.file_path.parent_path(), regular_expression, predicate);
            if (done)
                return true;
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

        for (std::string_view const regular_expression : regular_expressions)
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

        return find_included_files(artifact.file_path.parent_path(), artifact.include, output_allocator);
    }

    std::pmr::vector<std::filesystem::path> get_artifact_source_files(
        Artifact const& artifact,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        return find_included_files(
            artifact,
            output_allocator
        );
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

        for (std::string_view const regular_expression : regular_expressions)
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

        return find_root_include_directories(artifact.file_path.parent_path(), artifact.include, output_allocator);
    }

    std::optional<std::size_t> find_artifact_index_that_includes_source_file(
        std::span<Artifact const> const artifacts,
        std::filesystem::path const& source_file_path,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (std::size_t index = 0; index < artifacts.size(); ++index)
        {
            Artifact const& artifact = artifacts[index];

            std::pmr::vector<std::filesystem::path> const source_files = get_artifact_source_files(artifact, temporaries_allocator);
            for (std::filesystem::path const& current_source_file : source_files)
            {
                if (current_source_file == source_file_path)
                    return index;
            }
        }

        return std::nullopt;
    }

    std::pmr::vector<h::Module const*> get_artifact_modules_and_dependencies(
        Artifact const& artifact,
        std::span<Artifact const> const all_artifacts,
        std::span<h::Module const> const header_modules,
        std::span<h::Module const> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::Module const*> output{ temporaries_allocator };

        auto const add_modules = [&](std::span<std::filesystem::path const> const source_files) -> void
        {
            output.reserve(output.size() + source_files.size());

            for (std::filesystem::path const& source_file : source_files)
            {
                auto const location = std::find_if(
                    core_modules.begin(),
                    core_modules.end(),
                    [&source_file](h::Module const& module) -> bool
                    {
                        return module.source_file_path.has_value() && *module.source_file_path == source_file;
                    }
                );

                if (location != core_modules.end())
                    output.push_back(&*location);
            }
        };

        auto const add_headers = [&](std::span<C_header const> const headers) -> void
        {
            output.reserve(output.size() + headers.size());

            for (C_header const& header : headers)
            {
                auto const location = std::find_if(
                    header_modules.begin(),
                    header_modules.end(),
                    [&header](h::Module const& module) -> bool
                    {
                        return module.name == header.module_name;
                    }
                );

                if (location != header_modules.end())
                    output.push_back(&*location);
            }
        };

        std::pmr::vector<std::filesystem::path> const source_files = get_artifact_source_files(artifact, temporaries_allocator);
        std::span<C_header const> const c_headers = get_c_headers(artifact);

        add_modules(source_files);
        add_headers(c_headers);

        for (Dependency const& dependency : artifact.dependencies)
        {
            auto const dependency_artifact_location = std::find_if(
                all_artifacts.begin(),
                all_artifacts.end(),
                [&dependency](Artifact const& artifact) -> bool
                {
                    return artifact.name == dependency.artifact_name;
                }
            );

            if (dependency_artifact_location == all_artifacts.end())
                continue;

            Artifact const& dependency_artifact = *dependency_artifact_location;

            std::pmr::vector<std::filesystem::path> const dependency_source_files = get_artifact_source_files(dependency_artifact, temporaries_allocator);
            std::span<C_header const> const dependency_c_headers = get_c_headers(dependency_artifact);
            
            add_modules(dependency_source_files);
            add_headers(dependency_c_headers);
        }

        return std::pmr::vector<h::Module const*>{std::move(output), output_allocator};
    }

    std::optional<External_library_info> get_external_library(
        std::pmr::unordered_map<std::pmr::string, std::pmr::string> const& external_libraries,
        Target const& target,
        bool const prefer_debug,
        bool const prefer_dynamic
    )
    {
        std::array<bool, 2> const debug_priority
        {
            prefer_debug,
            !prefer_debug
        };
        
        std::array<bool, 2> const dynamic_priority
        {
            prefer_dynamic,
            !prefer_dynamic,
        };

        for (std::size_t debug_index = 0; debug_index < debug_priority.size(); ++debug_index)
        {
            for (std::size_t dynamic_index = 0; dynamic_index < dynamic_priority.size(); ++dynamic_index)
            {
                bool const is_debug = debug_priority[debug_index];
                bool const is_dynamic = dynamic_priority[dynamic_index];
                std::string const target_library = std::format("{}-{}-{}", target.operating_system, is_dynamic ? "dynamic" : "static", is_debug ? "debug" : "release");

                auto const location = external_libraries.find(target_library.c_str());
                if (location != external_libraries.end())
                {
                    return External_library_info
                    {
                        .key = std::pmr::string{target_library},
                        .name = location->second,
                        .is_debug = is_debug,
                        .is_dynamic = is_dynamic,
                    };
                }
            }
        }

        return std::nullopt;
    }

    std::optional<std::string_view> get_external_library_dll(
        std::pmr::unordered_map<std::pmr::string, std::pmr::string> const& external_libraries,
        std::string_view const key
    )
    {
        std::string const target_library = std::format("{}-dll", key);

        auto const location = external_libraries.find(target_library.c_str());
        if (location == external_libraries.end())
            return std::nullopt;
        
        return location->second;
    }
}
