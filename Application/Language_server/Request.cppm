module;

#include <memory_resource>
#include <string>
#include <variant>

export module h.language_server.request;

namespace h::language_server
{
    export struct Echo_request
    {
        std::pmr::string data;
    };

    export struct Echo_answer
    {
        std::pmr::string data;
    };

    export struct Create_html_template_data
    {
        std::pmr::string name;
        std::pmr::string format;
    };

    export struct Create_html_templates_request
    {
        std::pmr::vector<Create_html_template_data> templates_to_create;
    };

    export struct Create_html_templates_answer
    {
        std::pmr::vector<std::pmr::string> templates;
    };

    export struct Request
    {
        using Data_type = std::variant<
            Create_html_templates_request,
            Echo_request
        >;

        std::uint64_t id;
        Data_type data;
    };

    export struct Answer
    {
        using Data_type = std::variant<
            Create_html_templates_answer,
            Echo_answer
        >;

        std::uint64_t id;
        Data_type data;
    };
}
