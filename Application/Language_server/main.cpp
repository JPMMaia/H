#include <format>
#include <iostream>
#include <limits>
#include <memory_resource>
#include <optional>
#include <variant>

#include <rapidjson/istreamwrapper.h>
#include <rapidjson/ostreamwrapper.h>
#include <rapidjson/reader.h>
#include <rapidjson/writer.h>

import h.core;
import h.editor;
import h.language_server.json_serializer;
import h.language_server.request;

namespace
{
    std::optional<h::language_server::Request> read_request_from_stdin(
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::string buffer{ temporaries_allocator };
        while (buffer.empty())
        {
            std::getline(std::cin, buffer);
        }

        rapidjson::Reader reader;
        rapidjson::StringStream input_stream{ buffer.c_str() };

        return h::language_server::read<h::language_server::Request>(reader, input_stream);
    }

    template <typename Answer_data>
    void write_answer_to_stdout(std::uint64_t const message_id, Answer_data&& answer_data)
    {
        rapidjson::OStreamWrapper output_stream{ std::cout };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ output_stream };

        h::language_server::Answer const answer
        {
            .id = message_id,
            .data = std::move(answer_data)
        };

        h::language_server::write(writer, answer);
    }
}

int main()
{
    using namespace h::language_server;

    std::pmr::polymorphic_allocator<> temporaries_allocator = {};

    while (true)
    {
        try
        {
            std::optional<Request> const request = read_request_from_stdin(temporaries_allocator);

            if (request)
            {
                auto const visitor = [&request, &temporaries_allocator](auto&& request_data)
                {
                    using T = std::decay_t<decltype(request_data)>;

                    if constexpr (std::is_same_v<T, Create_html_templates_request>)
                    {
                        std::pmr::vector<std::pmr::string> html_templates{ temporaries_allocator };
                        html_templates.reserve(request_data.templates_to_create.size());

                        for (Create_html_template_data const& create_html_template_data : request_data.templates_to_create)
                        {
                            h::editor::Code_format_segment const format = h::editor::create_code_format_segment(
                                create_html_template_data.format,
                                temporaries_allocator,
                                temporaries_allocator
                            );

                            h::editor::HTML_template const html_template = create_template(
                                create_html_template_data.name,
                                format,
                                temporaries_allocator,
                                temporaries_allocator
                            );

                            html_templates.push_back(html_template.value);
                        }

                        Create_html_templates_answer answer
                        {
                            .templates = std::move(html_templates)
                        };

                        write_answer_to_stdout(request->id, std::move(answer));
                    }
                    else if constexpr (std::is_same_v<T, Echo_request>)
                    {
                        Echo_answer answer
                        {
                            .data = request_data.data
                        };

                        write_answer_to_stdout(request->id, std::move(answer));
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
                std::cin.clear();
                std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
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
