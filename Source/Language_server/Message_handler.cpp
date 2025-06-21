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
    Message_handler create_message_handler()
    {
        return
        {
        };
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

    void run_message_handler(lsp::io::Socket socket)
    {
        bool running = true;

        lsp::Connection connection{socket};
        lsp::MessageHandler message_handler{connection};

        Server server = create_server();

        bool has_workspace_folder_capability = false;
        
        message_handler.add<lsp::requests::Initialize>(
            [&](lsp::requests::Initialize::Params&& parameters) -> lsp::requests::Initialize::Result
            {
                lsp::ClientCapabilities const& client_capabilities = parameters.capabilities;

                if (client_capabilities.workspace)
                    has_workspace_folder_capability = client_capabilities.workspace->workspaceFolders.value_or(false);

                return initialize(server, parameters);
            }
        );

        message_handler.add<lsp::notifications::Initialized>(
            [&](lsp::notifications::Initialized::Params&& parameters) -> void
            {
                if (has_workspace_folder_capability)
                {
                    message_handler.add<lsp::notifications::Workspace_DidChangeWorkspaceFolders>(
                        [&](lsp::notifications::Workspace_DidChangeWorkspaceFolders::Params&& parameters) -> void
                        {
                            connection.writeMessage("Workspace folder change event received.");
                        }
                    );

                    request_workspace_folders(message_handler, server);
                }
            }
        );

        message_handler.add<lsp::requests::Shutdown>(
            [&]() -> lsp::requests::Shutdown::Result
            {
                return shutdown(server);
            }
        );

        message_handler.add<lsp::notifications::Exit>(
            [&]() -> void
            {
                exit(server);
                running = false;
            }
        );

        message_handler.add<lsp::notifications::TextDocument_DidOpen>(
            [&](lsp::notifications::TextDocument_DidOpen::Params&& parameters) -> void
            {
                text_document_did_open(server, parameters);
            }
        );

        message_handler.add<lsp::notifications::TextDocument_DidClose>(
            [&](lsp::notifications::TextDocument_DidClose::Params&& parameters) -> void
            {
                text_document_did_close(server, parameters);
            }
        );

        message_handler.add<lsp::notifications::TextDocument_DidChange>(
            [&](lsp::notifications::TextDocument_DidChange::Params&& parameters) -> void
            {
                text_document_did_change(server, parameters);
            }
        );

        message_handler.add<lsp::requests::Workspace_Diagnostic>(
            [&](lsp::requests::Workspace_Diagnostic::Params&& parameters) -> lsp::requests::Workspace_Diagnostic::Result
            {
                return compute_workspace_diagnostics(server, parameters);
            }
        );
      
         while(running)
            message_handler.processIncomingMessages();
    }

    void request_workspace_folders(
        lsp::MessageHandler& message_handler,
        Server& server
    )
    {
        message_handler.sendRequest<lsp::requests::Workspace_WorkspaceFolders>(
            [&](lsp::requests::Workspace_WorkspaceFolders::Result&& result)
            {
                if (!result.isNull())
                {
                    lsp::Array<lsp::WorkspaceFolder> const& workspace_folders = result.value();
                    set_workspace_folders(server, workspace_folders);
                }
            },
            [](const lsp::ResponseError& error)
            {
            }
        );        
    }
}
