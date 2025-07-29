module;

#include <filesystem>
#include <span>
#include <string>
#include <string_view>
#include <vector>

export module h.compiler.linker;

namespace h::compiler
{
    export enum class Link_type
    {
        Executable,
        Shared_library,
        Static_library
    };

    export struct Linker_options
    {
        std::optional<std::string_view> entry_point = std::nullopt;
        bool debug = false;
        Link_type link_type = Link_type::Static_library;
    };

    export bool link(
        std::span<std::filesystem::path const> object_file_paths,
        std::span<std::pmr::string const> libraries,
        std::filesystem::path const& output,
        Linker_options const& options
    );
}
