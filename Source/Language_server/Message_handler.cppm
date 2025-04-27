module;

#include <cstdio>

export module h.language_server.message_handler;

import h.language_server.server;

namespace h::language_server
{
    export struct Message_handler
    {
        Server& server;
        std::FILE& input_stream;
        std::FILE& output_stream;
    };

    export Message_handler create_message_handler(
        Server& server,
        std::FILE& input_stream,
        std::FILE& output_stream
    );

    export void process_messages(
        Message_handler& message_handler
    );
}
