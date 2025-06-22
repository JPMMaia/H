module;

#include <cstdio>
#include <filesystem>
#include <memory_resource>
#include <span>
#include <vector>

#include <lsp/types.h>

module h.language_server.server;

import h.common.filesystem;
import h.compiler;
import h.compiler.builder;
import h.compiler.target;

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

        h::compiler::Target const target = h::compiler::get_default_target();

        for (std::size_t index = 0; index < configurations.size(); ++index)
        {
            lsp::WorkspaceFolder const& workspace_folder = server.workspace_folders[index];
            lsp::json::Any const& workspace_configuration = configurations[index];

            std::filesystem::path const workspace_folder_path = workspace_folder.uri.path();
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

            server.builders.push_back(std::move(builder));
        }
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
        
        /*for (lsp::WorkspaceFolder const& workspace_folder : workspace_folders)
        {
            lsp::Uri const& workspace_uri = workspace_folder.uri;
            std::filesystem::path const workspace_path = workspace_uri.path();

            

            // TODO read workspace configuration
            // TODO read all repositories
            // TODO read all artifacts
        }*/

        // TODO
        return {};
    }
}
