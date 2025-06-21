module;

#include <cstdio>

#include <lsp/io/socket.h>
#include <lsp/messagehandler.h>

export module h.language_server.message_handler;

import h.language_server.server;

namespace h::language_server
{
    export struct Message_handler
    {
    };

    export Message_handler create_message_handler();

    export void process_messages(
        Message_handler& message_handler
    );

    void run_message_handler(
        lsp::io::Socket socket
    );

    void request_workspace_folders(
        lsp::MessageHandler& message_handler,
        Server& server
    );
}
