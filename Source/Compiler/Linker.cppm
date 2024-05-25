module;

#include <filesystem>
#include <span>
#include <string>
#include <string_view>
#include <vector>

export module h.compiler.linker;

namespace h::compiler
{
    export struct Linker_options
    {
        std::string_view entry_point = "main";
        bool debug = false;
    };

    export bool link(
        std::span<std::filesystem::path const> object_file_paths,
        std::span<std::pmr::string const> libraries,
        std::filesystem::path const& output,
        Linker_options const& options
    );
}
