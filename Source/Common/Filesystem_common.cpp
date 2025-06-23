module;

#include <filesystem>
#include <optional>
#include <span>
#include <string_view>

module h.common.filesystem_common;

namespace h::common
{
    std::optional<std::filesystem::path> search_file(
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

    std::pmr::vector<std::filesystem::path> search_files(
        std::filesystem::path const& root_directory,
        std::string_view const filename,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<std::filesystem::path> found_files{temporaries_allocator};

        for (const std::filesystem::directory_entry& entry : std::filesystem::recursive_directory_iterator{ root_directory })
        {
            if (entry.is_regular_file())
            {
                std::filesystem::path const& entry_path = entry.path();
                std::filesystem::path const filename_path = entry_path.filename();

                if (filename_path.generic_string() == filename)
                {
                    found_files.push_back(entry_path);
                }
            }
        }

        return std::pmr::vector<std::filesystem::path>{std::move(found_files), output_allocator};
    }
}
