module;

#include <span>

#include <lsp/types.h>

export module h.language_server.server;

import h.compiler.artifact;
import h.compiler.builder;
import h.core;
import h.parser.parse_tree;
import h.parser.parser;

namespace h::language_server
{
    struct Workspace_data
    {
        h::compiler::Builder builder;
        std::pmr::vector<h::compiler::Artifact> artifacts;
        std::pmr::vector<h::Module> header_modules;
        std::pmr::vector<std::filesystem::path> core_module_source_file_paths;
        std::pmr::vector<h::parser::Parse_tree> core_module_parse_trees;
        std::pmr::vector<h::Module> core_modules;
    };
    
    export struct Server
    {
        std::pmr::vector<lsp::WorkspaceFolder> workspace_folders;
        std::pmr::vector<Workspace_data> workspaces_data;
        h::parser::Parser parser;
    };

    export Server create_server();

    export void destroy_server(
        Server& server
    );

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

    export void set_workspace_folder_configurations(
        Server& server,
        lsp::Workspace_ConfigurationResult const& configurations
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
