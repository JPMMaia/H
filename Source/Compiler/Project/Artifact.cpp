module;

#include <nlohmann/json.hpp>

#include <filesystem>
#include <memory_resource>
#include <optional>
#include <span>
#include <string_view>
#include <unordered_map>
#include <variant>
#include <vector>

module h.compiler.artifact;

import h.common;
import h.compiler.common;

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
        std::pmr::vector<Dependency> dependencies;
        dependencies.reserve(json.size());

        for (nlohmann::json const& dependency_json : json)
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

        std::pmr::vector<Dependency> dependencies = parse_dependencies(json.at("dependencies"));

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
}
