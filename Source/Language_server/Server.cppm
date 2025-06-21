module;

#include <span>

#include <lsp/types.h>

export module h.language_server.server;

import h.language_server.core;

namespace h::language_server
{
    export struct Server
    {

    };

    export Server create_server();

    export lsp::InitializeResult initialize(
        Server& server,
        lsp::InitializeParams const& parameters
    );

    export lsp::ShutdownResult shutdown(
        Server& server
    );

    export void exit(
        Server& server
    );

    export void set_workspace_folders(
        Server& server,
        std::span<lsp::WorkspaceFolder const> const workspace_folders
    );

    export void text_document_did_open(
        Server& server,
        lsp::DidOpenTextDocumentParams const& parameters
    );

    export void text_document_did_close(
        Server& server,
        lsp::DidCloseTextDocumentParams const& parameters
    );

    export void text_document_did_change(
        Server& server,
        lsp::DidChangeTextDocumentParams const& parameters
    );

    export lsp::WorkspaceDiagnosticReport compute_workspace_diagnostics(
        Server& server,
        lsp::WorkspaceDiagnosticParams const& parameters
    );
}
