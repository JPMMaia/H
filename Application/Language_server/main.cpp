#include <format>
#include <iostream>
#include <limits>
#include <optional>
#include <variant>

#include <rapidjson/istreamwrapper.h>
#include <rapidjson/ostreamwrapper.h>
#include <rapidjson/reader.h>
#include <rapidjson/writer.h>

import h.language_server.json_serializer;
import h.language_server.request;

namespace
{
    std::optional<h::language_server::Request> read_request_from_stdin()
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper input_stream{ std::cin };

        return h::language_server::read<h::language_server::Request>(reader, input_stream);
    }

    template <typename Answer_data>
    void write_answer_to_stdout(Answer_data&& answer_data)
    {
        rapidjson::OStreamWrapper output_stream{ std::cout };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ output_stream };

        h::language_server::Answer const answer
        {
            .data = std::move(answer_data)
        };

        h::language_server::write(writer, answer);
    }
}

int main()
{
    using namespace h::language_server;

    while (true)
    {
        try
        {
            std::optional<Request> const request = read_request_from_stdin();

            if (request)
            {
                auto const visitor = [](auto&& request_data)
                {
                    using T = std::decay_t<decltype(request_data)>;

                    if constexpr (std::is_same_v<T, Echo_request>)
                    {
                        Echo_answer answer
                        {
                            .data = request_data.data
                        };

                        write_answer_to_stdout(std::move(answer));
                    }
                    else
                    {
                        static_assert(always_false_v<T>, "non-exhaustive visitor!");
                    }
                };

                std::visit(visitor, request->data);
            }
            else
            {
                std::cerr << "{\"error\": \"Did not understand the request!\"}" << std::endl;
            }
        }
        catch (const std::exception& e)
        {
            std::cerr << std::format("{{\"error\": \"{}\"}}", e.what()) << std::endl;
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
        }
    }

    return 0;
}
