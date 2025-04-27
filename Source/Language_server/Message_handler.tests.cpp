#include <cstdio>
#include <nlohmann/json_fwd.hpp>
#include <optional>

#include <catch2/catch_all.hpp>
#include <nlohmann/json.hpp>

import h.language_server.message_handler;
import h.language_server.message;
import h.language_server.server;
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

    static nlohmann::json read_response(
        std::FILE& output_stream
    )
    {
        std::optional<Request> const response = read_request(output_stream);
        REQUIRE(response.has_value());

        return response.value().data;
    }

    TEST_CASE("Initialize and Shutdown using Message_handler", "[Message_handler]")
    {
        std::string_view const initialize_request = R"(
{
    "id": 1,
    "method": "initialize",
    "params": {
        "processId": 123456,
        "rootUri": null,
        "capabilities": {}
    }
}
)";

        std::string_view const initialized_request = R"(
{
    "id": 2,
    "method": "initialized",
    "params": {}
}
)";

        std::string_view const shutdown_request = R"(
{
    "id": 3,
    "method": "shutdown"
}
)";

        std::string_view const exit_request = R"(
{
    "id": 4,
    "method": "exit"
}
)";

        std::FILE* input_stream = std::tmpfile();
        REQUIRE(input_stream != nullptr);

        write_request(*input_stream, initialize_request);
        write_request(*input_stream, initialized_request);
        write_request(*input_stream, shutdown_request);
        write_request(*input_stream, exit_request);
        std::rewind(input_stream);

        std::FILE* output_stream = std::tmpfile();
        REQUIRE(output_stream != nullptr);

        Server server = create_server();
        Message_handler message_handler = create_message_handler(server, *input_stream, *output_stream);
        process_messages(message_handler);

        std::rewind(output_stream);

        std::string_view const expected_initialize_response = R"(
{
    "id": 1,
    "result": {
        "capabilities": {}
    }
}
)";

        std::string_view const expected_shutdown_response = R"(
{
    "id": 3,
    "result": null
}
)";

        nlohmann::json const initialize_response = read_response(*output_stream);
        CHECK(initialize_response == nlohmann::json::parse(expected_initialize_response));
        
        nlohmann::json const shutdown_response = read_response(*output_stream);
        CHECK(shutdown_response == nlohmann::json::parse(expected_shutdown_response));

        std::fclose(output_stream);
        std::fclose(input_stream);
    }
}
