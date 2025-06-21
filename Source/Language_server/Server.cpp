module;

#include <cstdio>
#include <span>

#include <lsp/types.h>

module h.language_server.server;

namespace h::language_server
{
    static constexpr bool g_debug = true;

    Server create_server()
    {
        return {};
    }

    lsp::InitializeResult initialize(
        Server& server,
        lsp::InitializeParams const& parameters
    )
    {
        if constexpr (g_debug)
            std::printf("Language Server initialize\n");

        lsp::ClientCapabilities const& client_capabilities = parameters.capabilities;

        lsp::ServerCapabilitiesWorkspace workspace_server_capabilities
        {
            .workspaceFolders = lsp::WorkspaceFoldersServerCapabilities
            {
                .supported = true,
                .changeNotifications = true,
            }
        };

        lsp::TextDocumentSyncOptions text_document_sync_server_capabilities
        {
            .openClose = true,
            .change = lsp::TextDocumentSyncKind::Incremental,
            .willSave = false,
            .willSaveWaitUntil = false,
            .save = false,
        };

        lsp::InitializeResult result
        {
            .capabilities =
            {
                .textDocumentSync = text_document_sync_server_capabilities,
                .workspace = workspace_server_capabilities,
            },
            .serverInfo = lsp::InitializeResultServerInfo
            {
                .name = "Hlang Language Server",
                .version = "0.1.0"
            }
        };

        return result;
    }

    lsp::ShutdownResult shutdown(
        Server& server
    )
    {
        if constexpr (g_debug)
            std::printf("Language Server shutdown\n");

        return {};
    }
    
    void exit(
        Server& server
    )
    {
        if constexpr (g_debug)
            std::printf("Language Server exit\n");
    }

    void set_workspace_folders(
        Server& server,
        std::span<lsp::WorkspaceFolder const> const workspace_folders
    )
    {
        // TODO
    }

    void text_document_did_open(
        Server& server,
        lsp::DidOpenTextDocumentParams const& parameters
    )
    {
        // TODO
    }

    void text_document_did_close(
        Server& server,
        lsp::DidCloseTextDocumentParams const& parameters
    )
    {
        // TODO
    }

    void text_document_did_change(
        Server& server,
        lsp::DidChangeTextDocumentParams const& parameters
    )
    {
        // TODO
    }

    lsp::WorkspaceDiagnosticReport compute_workspace_diagnostics(
        Server& server,
        lsp::WorkspaceDiagnosticParams const& parameters
    )
    {
        // TODO
        return {};
    }
}
