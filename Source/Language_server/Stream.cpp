module;

#include <nlohmann/json.hpp>

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <optional>
#include <span>
#include <string>

module h.language_server.stream;

import h.common;

import h.language_server.message;

constexpr bool g_debug = true;

namespace h::language_server
{
    void print_debug(std::string_view const message)
    {   
        if (message.ends_with('\0'))
        {
            std::puts(message.data());
            return;
        }

        std::pmr::string string{ message.data(), message.size() };
        std::puts(string.c_str());
    }

    std::string_view read_line(
        std::FILE& input_stream,
        std::span<char> const buffer
    )
    {
        std::size_t count = 0;

        int value = 0;

        while (count < buffer.size())
        {
            value = std::fgetc(&input_stream);
            if (value == EOF)
                break;

            char const character = static_cast<char>(value);
            buffer[count] = character;
            count += 1;

            if (character == '\n')
                break;
        }

        std::string_view const line{ buffer.data(), count };

        if (g_debug)
            print_debug(line);

        return line;
    }

    static constexpr std::string_view g_content_length_string = "Content-Length: ";

    std::uint32_t read_content_length(
        std::FILE& input_stream,
        std::span<char> const buffer
    )
    {
        std::string_view const line = read_line(input_stream, buffer);
        if (!line.starts_with(g_content_length_string))
            return 0;

        char const* const start = line.data() + g_content_length_string.size();
        char* end = nullptr;
        unsigned long const length = std::strtoul(start, &end, 10);
        return static_cast<std::uint32_t>(length);
    }

    std::optional<Request> read_message(
        std::FILE& input_stream,
        std::span<char> const buffer,
        std::uint32_t const content_length
    )
    {
        if (content_length > buffer.size())
            return std::nullopt;

        std::size_t const count = std::fread(buffer.data(), sizeof(char), content_length, &input_stream);
        if (count != content_length)
            return std::nullopt;

        std::string_view const message{buffer.data(), content_length};
        if (g_debug)
            print_debug(message);

        return parse_request(message);
    }

    std::optional<Request> read_request(std::FILE& input_stream)
    {
        char buffer[2048];
        std::span<char> const buffer_view{buffer};

        std::uint32_t const content_length = read_content_length(input_stream, buffer_view);
        if (content_length > buffer_view.size())
            h::common::print_message_and_exit("Language server only supports messages up to 2048 bytes.");
        
        read_line(input_stream, buffer_view);

        return read_message(input_stream, buffer_view, content_length);
    }

    static void write_content_length(
        std::FILE& output_stream,
        std::uint32_t const content_length
    )
    {   
        std::fprintf(
            &output_stream,
            "Content-Length: %u",
            content_length
        );
    }

    void write_response(
        std::FILE& output_stream,
        Response const& response
    )
    {
        std::string const response_string = nlohmann::to_string(response.data);

        std::uint32_t const content_length = static_cast<std::uint32_t>(response_string.length()); 
        write_content_length(output_stream, content_length);

        std::fwrite(
            "\r\n\r\n",
            sizeof(char), 
            4, 
            &output_stream
        );
        
        std::fwrite(
            response_string.c_str(),
            sizeof(char),
            response_string.size(),
            &output_stream
        );
    }
}
