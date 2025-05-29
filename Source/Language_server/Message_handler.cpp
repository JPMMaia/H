module;

#include <cstdio>
#include <thread>
#include <optional>
#include <string>

#include <lsp/messages.h>
#include <lsp/connection.h>
#include <lsp/io/standardio.h>
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

    void process_messages(
        Message_handler& message_handler_c
    )
    {
        lsp::Connection connection{lsp::io::standardInput(), lsp::io::standardOutput()};
        lsp::MessageHandler message_handler{connection};

        bool running = true;

        lsp::RequestHandler& request_handler = message_handler.requestHandler();
        
        request_handler.add<lsp::requests::Initialize>(
            [](const lsp::jsonrpc::MessageId& id, lsp::requests::Initialize::Params&& params)
            {
               auto result = lsp::requests::Initialize::Result{
                    .capabilities = {
                    },
                  .serverInfo = lsp::InitializeResultServerInfo{
                      .name    = "Hlang Language Server",
                      .version = "0.1.0"
                  }
               };

               return result;
            }
        );

        request_handler.add<lsp::notifications::Exit>(
            [&running]()
            {
               running = false;
            }
        );
      
         while(running)
            message_handler.processIncomingMessages();
    }
}
