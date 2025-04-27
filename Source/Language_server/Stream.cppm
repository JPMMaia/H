module;

#include <cstdio>
#include <optional>

export module h.language_server.stream;

import h.language_server.message;

namespace h::language_server
{
    export std::optional<Request> read_request(std::FILE& input_stream);

    export void write_response(std::FILE& output_stream, Response const& response);
}
