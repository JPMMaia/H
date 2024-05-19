module;

#include <filesystem>
#include <optional>
#include <span>
#include <string_view>

export module h.common.filesystem_common;

namespace h::common
{
    export std::optional<std::filesystem::path> search_file(
        std::string_view const filename,
        std::span<std::filesystem::path const> const search_paths
    );
}
