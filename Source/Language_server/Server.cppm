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
        std::pmr::vector<std::optional<int>> core_module_versions;
        std::pmr::vector<std::pmr::string> core_module_diagnostic_result_ids;
        std::pmr::vector<bool> core_module_diagnostic_dirty_flags;
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

    void destroy_workspaces_data(
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

    export lsp::DocumentDiagnosticReport compute_document_diagnostics(
        Server& server,
        lsp::DocumentDiagnosticParams const& parameters
    );

    std::filesystem::path to_filesystem_path(
        h::compiler::Target const& target,
        lsp::Uri const& uri
    );

    h::Source_range utf_16_lsp_range_to_utf_8_source_range(
        lsp::Range const& range
    );
}
