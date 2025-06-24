module;

#include <cstdio>
#include <filesystem>
#include <memory_resource>
#include <span>
#include <vector>

#include <lsp/types.h>

module h.language_server.server;

import h.common.filesystem;
import h.common.filesystem_common;
import h.compiler;
import h.compiler.artifact;
import h.compiler.builder;
import h.compiler.diagnostic;
import h.compiler.target;
import h.core;
import h.language_server.diagnostics;
import h.parser.parse_tree;
import h.parser.parser;

namespace h::language_server
{
    static constexpr bool g_debug = true;

    Server create_server()
    {
        h::parser::Parser parser = h::parser::create_parser();

        return
        {
            .workspace_folders = {},
            .workspaces_data = {},
            .parser = std::move(parser)
        };
    }

    void destroy_server(
        Server& server
    )
    {
        // TODO destroy existing trees in each workspace data

        h::parser::destroy_parser(std::move(server.parser));
    }

    lsp::InitializeResult initialize(
        Server& server,
        lsp::InitializeParams const& parameters
    )
    {
        if constexpr (g_debug)
            std::printf("Language Server initialize\n");

        lsp::ClientCapabilities const& client_capabilities = parameters.capabilities;

        lsp::DiagnosticOptions const diagnostic_options
        {
            .workDoneProgress = false,
            .interFileDependencies = true,
            .workspaceDiagnostics = true,
            .identifier = std::nullopt,
        };

        lsp::TextDocumentSyncOptions const text_document_sync_server_capabilities
        {
            .openClose = true,
            .change = lsp::TextDocumentSyncKind::Incremental,
            .willSave = false,
            .willSaveWaitUntil = false,
            .save = false,
        };

        lsp::ServerCapabilitiesWorkspace const workspace_server_capabilities
        {
            .workspaceFolders = lsp::WorkspaceFoldersServerCapabilities
            {
                .supported = true,
                .changeNotifications = true,
            }
        };

        lsp::InitializeResult result
        {
            .capabilities =
            {
                .textDocumentSync = text_document_sync_server_capabilities,
                .diagnosticProvider = diagnostic_options,
                .workspace = workspace_server_capabilities,
            },
            .serverInfo = lsp::InitializeResultServerInfo
            {
                .name = "Hlang Language Server",
                .version = "0.1.0"
            }
        };

        std::span<lsp::WorkspaceFolder const> const workspace_folders =
            parameters.workspaceFolders && !parameters.workspaceFolders->isNull() ?
            parameters.workspaceFolders->value() :
            std::span<lsp::WorkspaceFolder const>{};

        set_workspace_folders(server, workspace_folders);

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
        server.workspace_folders.clear();
        server.workspaces_data.clear();

        server.workspace_folders.assign(workspace_folders.begin(), workspace_folders.end());
    }

    static std::pmr::vector<std::filesystem::path> get_header_search_paths_from_configuration(
        lsp::json::Any const& configuration
    )
    {
        std::pmr::vector<std::filesystem::path> header_search_paths = h::common::get_default_header_search_directories();

        return header_search_paths;
    }

    static std::pmr::vector<std::filesystem::path> get_repository_paths_from_configuration(
        std::filesystem::path const& workspace_folder_path,
        lsp::json::Any const& configuration
    )
    {
        if (!configuration.isObject())
            return {};

        lsp::json::Any const& extension_settings = configuration.object().get("hlang_language_server");
        if (!extension_settings.isObject())
            return {};

        lsp::json::Any const& repositories_json = extension_settings.object().get("repositories");
        if (!repositories_json.isArray())
            return {};

        lsp::json::Array const& repositories = repositories_json.array();

        std::pmr::vector<std::filesystem::path> repository_paths;
        repository_paths.reserve(repositories.size());

        for (lsp::json::Any const repository_json : repositories)
        {
            if (!repository_json.isString())
                continue;

            std::filesystem::path repository_path = repository_json.string();

            if (repository_path.is_absolute())
            {
                repository_paths.push_back(std::move(repository_path));
            }
            else
            {
                std::filesystem::path repository_absolute_path = workspace_folder_path / ".vscode" / repository_path;
                repository_paths.push_back(std::move(repository_absolute_path));
            }
        }

        return repository_paths;
    }

    void set_workspace_folder_configurations(
        Server& server,
        lsp::Workspace_ConfigurationResult const& configurations
    )
    {
        if (configurations.size() != server.workspace_folders.size())
            return;

        // TODO destroy parse_trees
        server.workspaces_data.clear();

        h::compiler::Target const target = h::compiler::get_default_target();

        std::pmr::polymorphic_allocator<> temporaries_allocator;

        for (std::size_t index = 0; index < configurations.size(); ++index)
        {
            lsp::WorkspaceFolder const& workspace_folder = server.workspace_folders[index];
            lsp::json::Any const& workspace_configuration = configurations[index];

            std::filesystem::path const workspace_folder_path = 
                target.operating_system == "windows" ?
                workspace_folder.uri.path().substr(1) :
                workspace_folder.uri.path();
            std::filesystem::path const build_directory_path = workspace_folder_path / "build";

            std::pmr::vector<std::filesystem::path> const header_search_paths = get_header_search_paths_from_configuration(workspace_configuration);
            std::pmr::vector<std::filesystem::path> const repository_paths = get_repository_paths_from_configuration(workspace_folder_path, workspace_configuration);

            h::compiler::Compilation_options const compilation_options
            {
                .target_triple = std::nullopt,
                .is_optimized = false,
                .debug = true,
                .contract_options = h::compiler::Contract_options::Log_error_and_abort,
            };

            h::compiler::Builder builder = h::compiler::create_builder(
                target,
                build_directory_path,
                header_search_paths,
                repository_paths,
                compilation_options,
                {}
            );

            std::pmr::vector<std::filesystem::path> const artifact_file_paths = h::common::search_files(
                workspace_folder_path,
                "hlang_artifact.json",
                {},
                {}
            );

            std::pmr::vector<h::compiler::Artifact> artifacts = h::compiler::get_sorted_artifacts(
                artifact_file_paths,
                builder.repositories,
                {},
                {}
            );

            std::pmr::vector<h::compiler::C_header_and_options> const c_headers_and_options = h::compiler::get_artifacts_c_headers(
                artifacts,
                temporaries_allocator,
                temporaries_allocator
            );

            std::pmr::vector<h::Module> header_modules = h::compiler::parse_c_headers_and_cache(
                builder,
                c_headers_and_options,
                temporaries_allocator,
                temporaries_allocator
            );
            h::compiler::add_builtin_module(header_modules, temporaries_allocator, temporaries_allocator);

            // TODO
            std::pmr::vector<std::filesystem::path> core_module_source_file_paths;

            // TODO parse all source files
            std::pmr::vector<h::parser::Parse_tree> core_module_parse_trees;

            // TODO convert all source files to modules (if they dont contain any parsing errors)
            std::pmr::vector<h::Module> core_modules;

            Workspace_data workspace_data
            {
                .builder = std::move(builder),
                .artifacts = std::move(artifacts),
                .header_modules = std::move(header_modules),
                .core_module_source_file_paths = std::move(core_module_source_file_paths),
                .core_module_parse_trees = std::move(core_module_parse_trees),
                .core_modules = std::move(core_modules),
            };

            server.workspaces_data.push_back(std::move(workspace_data));
        }
    }

    void text_document_did_open(
        Server& server,
        lsp::DidOpenTextDocumentParams const& parameters
    )
    {
        // TODO set version of document
    }

    void text_document_did_close(
        Server& server,
        lsp::DidCloseTextDocumentParams const& parameters
    )
    {
        // TODO unset version of document
    }

    void text_document_did_change(
        Server& server,
        lsp::DidChangeTextDocumentParams const& parameters
    )
    {
        // TODO set version of document
        // TODO update parse tree
    }

    lsp::WorkspaceDiagnosticReport compute_workspace_diagnostics(
        Server& server,
        lsp::WorkspaceDiagnosticParams const& parameters
    )
    {
        if (server.workspace_folders.size() != server.workspaces_data.size())
            return {};

        // TODO use workDoneToken
        // TODO use partialResultToken

        std::pmr::polymorphic_allocator<> temporaries_allocator;

        lsp::WorkspaceDiagnosticReport report;

        for (std::size_t workspace_index = 0; workspace_index < server.workspace_folders.size(); ++workspace_index)
        {
            Workspace_data& workspace_data = server.workspaces_data[workspace_index];

            std::pmr::vector<h::compiler::Diagnostic> const parser_diagnostics = create_parser_diagnostics(
                workspace_data.core_module_source_file_paths,
                workspace_data.core_module_parse_trees,
                temporaries_allocator,
                temporaries_allocator
            );

            if (!parser_diagnostics.empty())
            {
                std::pmr::vector<lsp::WorkspaceFullDocumentDiagnosticReport> const items = create_document_diagnostics_report(
                    parser_diagnostics,
                    workspace_data.core_module_source_file_paths,
                    temporaries_allocator
                );

                for (lsp::WorkspaceFullDocumentDiagnosticReport const& item : items)
                    report.items.push_back(item);
            }
            else
            {
                h::compiler::Declaration_database_and_sorted_modules const result = h::compiler::create_declaration_database_and_sorted_modules(
                    workspace_data.header_modules,
                    workspace_data.core_modules,
                    temporaries_allocator,
                    temporaries_allocator
                );

                std::span<h::compiler::Diagnostic const> const compiler_diagnostics = result.diagnostics;

                std::pmr::vector<lsp::WorkspaceFullDocumentDiagnosticReport> const items = create_document_diagnostics_report(
                    compiler_diagnostics,
                    workspace_data.core_module_source_file_paths,
                    temporaries_allocator
                );

                for (lsp::WorkspaceFullDocumentDiagnosticReport const& item : items)
                    report.items.push_back(item);
            }
        }

        return report;
    }
}
