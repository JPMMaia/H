module;

#include <cstdio>
#include <filesystem>
#include <optional>
#include <string>
#include <string_view>

module h.common;

namespace h::common
{
    void print_message_and_exit(std::string const& message)
    {
        std::puts(message.c_str());
        std::exit(-1);
    }


    std::optional<std::pmr::string> get_file_contents(char const* const path)
    {
        std::FILE* file = std::fopen(path, "rb");
        if (file == nullptr)
            return {};

        std::pmr::string contents;
        std::fseek(file, 0, SEEK_END);
        contents.resize(std::ftell(file));
        std::rewind(file);
        std::fread(&contents[0], 1, contents.size(), file);
        std::fclose(file);

        return contents;
    }

    std::optional<std::pmr::string> get_file_contents(std::filesystem::path const& path)
    {
        std::string const path_string = path.generic_string();
        std::optional<std::pmr::string> const file_contents = get_file_contents(path_string.c_str());
        return file_contents;
    }

    void write_to_file(char const* const path, std::string_view const content)
    {
        std::FILE* const file = std::fopen(path, "w");
        if (file == nullptr)
        {
            std::string const message = std::format("Cannot write to '{}'", path);
            std::perror(message.c_str());
            throw std::runtime_error{ message };
        }

        std::fwrite(content.data(), sizeof(std::string_view::value_type), content.size(), file);

        std::fclose(file);
    }

    void write_to_file(std::filesystem::path const& path, std::string_view const content)
    {
        std::string const path_string = path.generic_string();
        write_to_file(path_string.c_str(), content);
    }
}
