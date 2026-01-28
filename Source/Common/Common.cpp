module;

#include <cstdio>
#include <cstddef>
#include <filesystem>
#include <format>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

module h.common;

namespace h::common
{
    void print_message_and_exit(std::string const& message)
    {
        std::puts(message.c_str());
        std::fflush(stdout);
        std::exit(-1);
    }

    void print_message_and_exit(char const* const message)
    {
        std::puts(message);
        std::fflush(stdout);
        std::exit(-1);
    }

    std::optional<std::pmr::vector<std::byte>> read_binary_file(char const* const path)
    {
        std::FILE* file = std::fopen(path, "rb");
        if (file == nullptr)
            return std::nullopt;

        std::pmr::vector<std::byte> contents;
        std::fseek(file, 0, SEEK_END);
        contents.resize(std::ftell(file));
        std::rewind(file);
        std::size_t const read_bytes = std::fread(&contents[0], 1, contents.size(), file);
        std::fclose(file);

        if (read_bytes < contents.size())
            contents.erase(contents.begin() + read_bytes, contents.end());

        return contents;
    }

    std::optional<std::pmr::vector<std::byte>> read_binary_file(std::filesystem::path const& path)
    {
        std::string const path_string = path.generic_string();
        std::optional<std::pmr::vector<std::byte>> const file_contents = read_binary_file(path_string.c_str());
        return file_contents;
    }

    void write_binary_file(char const* const path, std::span<std::byte const> const content)
    {
        std::FILE* const file = std::fopen(path, "wb");
        if (file == nullptr)
        {
            std::string const message = std::format("Cannot write to '{}'", path);
            std::perror(message.c_str());
            throw std::runtime_error{ message };
        }

        std::fwrite(content.data(), sizeof(std::byte), content.size(), file);

        std::fclose(file);
    }

    void write_binary_file(std::filesystem::path const& path, std::span<std::byte const> const content)
    {
        std::string const path_string = path.generic_string();
        write_binary_file(path_string.c_str(), content);
    }

    std::optional<std::pmr::string> get_file_contents(char const* const path)
    {
        std::FILE* file = std::fopen(path, "r");
        if (file == nullptr)
            return {};

        std::pmr::string contents;
        std::fseek(file, 0, SEEK_END);
        contents.resize(std::ftell(file));
        std::rewind(file);
        std::size_t const read_bytes = std::fread(&contents[0], 1, contents.size(), file);
        std::fclose(file);

        if (read_bytes < contents.size())
            contents.erase(contents.begin() + read_bytes, contents.end());

        return contents;
    }

    std::optional<std::pmr::string> get_file_contents(std::filesystem::path const& path)
    {
        std::string const path_string = path.generic_string();
        std::optional<std::pmr::string> const file_contents = get_file_contents(path_string.c_str());
        return file_contents;
    }

    std::optional<std::pmr::u8string> get_file_utf8_contents(char const* const path)
    {
        std::FILE* file = std::fopen(path, "r");
        if (file == nullptr)
            return {};

        std::pmr::u8string contents;
        std::fseek(file, 0, SEEK_END);
        contents.resize(std::ftell(file));
        std::rewind(file);
        std::size_t const read_bytes = std::fread(&contents[0], 1, contents.size(), file);
        std::fclose(file);

        if (read_bytes < contents.size())
            contents.erase(contents.begin() + read_bytes, contents.end());

        return contents;
    }

    std::optional<std::pmr::u8string> get_file_utf8_contents(std::filesystem::path const& path)
    {
        std::string const path_string = path.generic_string();
        std::optional<std::pmr::u8string> const file_contents = get_file_utf8_contents(path_string.c_str());
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

    std::pmr::vector<std::pmr::string> convert_path_to_string(std::span<std::filesystem::path const> const values, std::pmr::polymorphic_allocator<> output_allocator)
    {
        std::pmr::vector<std::pmr::string> output{output_allocator};
        output.reserve(values.size());

        for (std::filesystem::path const& value : values)
        {
            output.push_back(std::pmr::string{value.generic_string()});
        }

        return output;
    }

    std::pmr::vector<std::string_view> split_string(std::string_view const value, char const separator, std::pmr::polymorphic_allocator<> const& output_allocator)
    {
        std::pmr::vector<std::string_view> output;

        std::size_t count = std::count(value.begin(), value.end(), separator);
        output.reserve(count + 1);

        std::string_view::size_type previous_position = 0;
        std::string_view::size_type current_position = 0;

        while((current_position = value.find(separator, current_position)) != std::string::npos)
        {
            std::string_view const substring = value.substr(previous_position, current_position-previous_position);
            output.push_back(substring);

            current_position += 1;
            previous_position = current_position;
        }

        output.push_back(value.substr(previous_position));

        return output;
    }
}
