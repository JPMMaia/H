module;

#include <cstdio>
#include <thread>
#include <optional>
#include <string>

#include <lsp/messages.h>
#include <lsp/connection.h>
#include <lsp/io/socket.h>
#include <lsp/messagehandler.h>

#include <nlohmann/json.hpp>

module h.language_server.message_handler;

import h.language_server.core;
import h.language_server.server;

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

    void run_message_handler(lsp::io::Socket socket)
    {
        bool running = true;

        lsp::Connection connection{socket};
        lsp::MessageHandler message_handler{connection};
        
        message_handler.add<lsp::requests::Initialize>(
            [](lsp::requests::Initialize::Params&& params) -> lsp::requests::Initialize::Result
            {
               lsp::requests::Initialize::Result result
               {
                    .capabilities =
                    {
                    },
                    .serverInfo = lsp::InitializeResultServerInfo
                    {
                        .name = "Hlang Language Server",
                        .version = "0.1.0"
                    }
               };

               return result;
            }
        );

        message_handler.add<lsp::notifications::Exit>(
            [&running]() -> void
            {
               running = false;
            }
        );
      
         while(running)
            message_handler.processIncomingMessages();
    }

    void process_messages(
        Message_handler& message_handler_c
    )
    {
        int const port = 12345;
        lsp::io::SocketListener socket_listener = lsp::io::SocketListener(port);

        while (socket_listener.isReady())
        {
            lsp::io::Socket socket = socket_listener.listen();

            if (!socket.isOpen())
                break;

            std::thread([socket = std::move(socket)]() mutable -> void
            {
                run_message_handler(std::move(socket));
            }).detach();
        } 
    }
}
