module;

#include <filesystem>
#include <optional>
#include <string>
#include <string_view>

export module h.common;

namespace h::common
{
    export void print_message_and_exit(std::string const& message);
    export void print_message_and_exit(char const* const message);

    export std::optional<std::pmr::string> get_file_contents(char const* const path);
    export std::optional<std::pmr::string> get_file_contents(std::filesystem::path const& path);

    export std::optional<std::pmr::u8string> get_file_utf8_contents(char const* const path);
    export std::optional<std::pmr::u8string> get_file_utf8_contents(std::filesystem::path const& path);

    export void write_to_file(char const* const path, std::string_view const content);
    export void write_to_file(std::filesystem::path const& path, std::string_view const content);
}
