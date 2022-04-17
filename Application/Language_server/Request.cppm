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

    export struct Request
    {
        using Data_type = std::variant<
            Echo_request
        >;

        Data_type data;
    };

    export struct Answer
    {
        using Data_type = std::variant<
            Echo_answer
        >;

        Data_type data;
    };
}
