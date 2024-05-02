module;

#include <filesystem>
#include <memory_resource>
#include <optional>
#include <span>
#include <string_view>
#include <unordered_map>
#include <variant>
#include <vector>

export module h.compiler.artifact;

namespace h::compiler
{
    export struct Version
    {
        std::uint32_t major;
        std::uint32_t minor;
        std::uint32_t patch;
    };

    export enum Artifact_type
    {
        Executable,
        Library
    };

    export struct Dependency
    {
        std::pmr::string artifact_name;
    };

    export struct C_header
    {
        std::pmr::string module_name;
        std::pmr::string header;
    };

    export struct Executable_info
    {
        std::filesystem::path source;
        std::pmr::string entry_point;
        std::pmr::vector<std::pmr::string> include;
    };

    export struct Library_info
    {
        std::pmr::vector<C_header> c_headers;
        std::pmr::unordered_map<std::pmr::string, std::pmr::string> external_libraries;
    };

    export struct Artifact
    {
        std::filesystem::path file_path;
        std::pmr::string name;
        Version version;
        Artifact_type type;
        std::pmr::vector<Dependency> dependencies;
        std::optional<std::variant<Executable_info, Library_info>> info;
    };

    export Artifact get_artifact(std::filesystem::path const& artifact_file_path);
}
