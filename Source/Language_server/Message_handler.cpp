module;

#include <cstdio>
#include <thread>
#include <optional>
#include <string>

#include <nlohmann/json.hpp>

module h.language_server.message_handler;

import h.language_server.core;
import h.language_server.message;
import h.language_server.server;
import h.language_server.stream;

namespace h::language_server
{
    Message_handler create_message_handler(
        Server& server,
        std::FILE& input_stream,
        std::FILE& output_stream
    )
    {
        return
        {
            .server = server,
            .input_stream = input_stream,
            .output_stream = output_stream,
        };
    }

    static void sleep()
    {
        using namespace std::chrono_literals;
        std::this_thread::sleep_for(500ms);
    }

    static std::pmr::string read_string(nlohmann::json const& data, std::string_view const key)
    {
        nlohmann::json const& value = data.at(key);

        if (value.is_string())
            return value.get<std::pmr::string>();

        if (value.is_number_integer())
        {
            std::int32_t const number = value.get<std::int32_t>();
            return std::pmr::string{ std::to_string(number) };
        }

        return "";
    }

    void process_messages(
        Message_handler& message_handler
    )
    {
        while (true)
        {
            std::optional<Request> request_optional = read_request(message_handler.input_stream);
            if (!request_optional.has_value())
            {
                sleep();
                continue;
            }

            Request const& request = request_optional.value();

            nlohmann::json const& id = request.data.at("id");
            std::string const& method = request.data.at("method").get<std::string>();

            if (method == "initialize")
            {
                Initialize_params const parameters = parse_initialize_params_json(request.data.at("params"));
                Initialize_result const result = initialize(message_handler.server, parameters);

                nlohmann::json content;
                content["id"] = id;
                content["result"] = initialize_result_to_json(result);
                Response const response = { .data = std::move(content) };
                write_response(message_handler.output_stream, response);
            }
            else if (method == "initialized")
            {
                initialized(message_handler.server);
            }
            else if (method == "shutdown")
            {
                Shutdown_result const result = shutdown(message_handler.server);

                nlohmann::json content;
                content["id"] = id;
                content["result"] = shutdown_result_to_json(result);
                Response const response = { .data = std::move(content) };
                write_response(message_handler.output_stream, response);
            }
            else if (method == "exit")
            {
                exit(message_handler.server);
                break;
            }
        }
    }
}
