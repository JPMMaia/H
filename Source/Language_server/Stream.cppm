module;

#include <cstdio>
#include <optional>

export module h.language_server.stream;

import h.language_server.request;

namespace h::language_server
{
    export std::optional<Request> read_request(std::FILE& input_stream);
}
