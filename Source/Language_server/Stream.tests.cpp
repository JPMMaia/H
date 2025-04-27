#include <cstdio>
#include <optional>

#include <catch2/catch_all.hpp>

import h.language_server.message;
import h.language_server.stream;

namespace h::language_server
{
    static void write_request(
        std::FILE& input_stream,
        std::string_view const content
    )
    {
        std::uint32_t const content_length = static_cast<std::uint32_t>(content.size());
        std::fprintf(&input_stream, "Content-Length: %u\r\n\r\n", content_length);

        std::fwrite(content.data(), sizeof(char), content.size(), &input_stream);
    }

    TEST_CASE("Read Initialize Request", "[Stream]")
    {
        std::FILE* input_stream = std::tmpfile();
        REQUIRE(input_stream != nullptr);

        write_request(*input_stream, R"({"processId": 1, "rootUri": "file:///c:/project", "capabilities": {}})");
        std::rewind(input_stream);

        std::optional<Request> request = read_request(*input_stream);

        CHECK(request.has_value());

        std::fclose(input_stream);
    }
}
