import "module-alias/register";

import * as Completion from "./Completion";
import * as Platform from "./Platform";
import * as Project from "./Project";
import * as Server_data from "./Server_data";
import * as Semantic_tokens_provider from "./Semantic_tokens_provider";

import * as vscode_node from "vscode-languageserver/node";
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as vscode_uri from "vscode-uri";

import * as Document from "@core/Document";
import * as Language from "@core/Language";
import * as Storage_cache from "@core/Storage_cache";
import * as Text_change from "@core/Text_change";
import * as Validation from "@core/Validation";


const connection = vscode_node.createConnection(vscode_node.ProposedFeatures.all);

const server_data = Server_data.create_server_data();

let has_configuration_capability = false;
let has_workspace_folder_capability = false;
let has_diagnostic_related_information_capability = false;

connection.onInitialize(async (params: vscode_node.InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	has_configuration_capability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	has_workspace_folder_capability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	has_diagnostic_related_information_capability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: vscode_node.InitializeResult = {
		capabilities: {
			textDocumentSync: {
				openClose: true,
				change: vscode_node.TextDocumentSyncKind.Incremental,
				willSave: false,
				willSaveWaitUntil: false,
				save: false
			},
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			},
			semanticTokensProvider: {
				documentSelector: Semantic_tokens_provider.selector,
				legend: {
					tokenTypes: Semantic_tokens_provider.token_types,
					tokenModifiers: Semantic_tokens_provider.token_modifiers
				},
				range: true,
				full: {
					delta: false
				}
			}
		}
	};
	if (has_workspace_folder_capability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}

	return result;
});

connection.onInitialized(() => {
	if (has_configuration_capability) {
		// Register for all configuration changes.
		connection.client.register(vscode_node.DidChangeConfigurationNotification.type, undefined);
	}
	if (has_workspace_folder_capability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}

	create_projects_data();
});

async function create_projects_data(): Promise<void> {
	if (has_workspace_folder_capability) {
		const workspace_folders = await connection.workspace.getWorkspaceFolders();
		if (workspace_folders !== null) {
			for (const workspace_folder of workspace_folders) {
				const workspace_folder_uri = vscode_uri.URI.parse(workspace_folder.uri);
				const workspace_folder_fs_path = workspace_folder_uri.fsPath;

				const extension_settings = await get_extension_settings(workspace_folder.uri);

				const repository_paths = extension_settings.repositories;
				const header_search_paths: string[] = Platform.get_default_c_header_search_paths();
				const project_data = await Project.create_project_data(workspace_folder_fs_path, repository_paths, header_search_paths);

				server_data.projects.set(workspace_folder.uri, project_data);
			}
		}
	}
}

interface Extension_settings {
	repositories: string[];
}

const default_settings: Extension_settings = {
	repositories: []
};

let global_settings: Extension_settings = default_settings;

const extension_settings_map: Map<string, Thenable<Extension_settings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (has_configuration_capability) {
		extension_settings_map.clear();
	} else {
		global_settings = <Extension_settings>(
			(change.settings.hlang_language_server || default_settings)
		);
	}
});

function get_extension_settings(scope_uri: string): Thenable<Extension_settings> {
	if (!has_configuration_capability) {
		return Promise.resolve(global_settings);
	}
	let result = extension_settings_map.get(scope_uri);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: scope_uri,
			section: 'hlang_language_server'
		});
		extension_settings_map.set(scope_uri, result);
	}
	return result;
}

connection.languages.diagnostics.on(async (parameters) => {

	const document_state = server_data.document_states.get(parameters.textDocument.uri);
	if (document_state === undefined) {
		return {
			kind: vscode_node.DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies vscode_node.DocumentDiagnosticReport;
	}

	const diagnostics = document_state.diagnostics;

	// TODO await validate_text_document(document)

	const items = diagnostics.map((value: Validation.Diagnostic): vscode_node.Diagnostic => {

		const related_information = value.related_information.map(
			(value: Validation.Related_information): vscode_node.DiagnosticRelatedInformation => {
				return {
					location: {
						uri: value.location.uri,
						range: {
							start: {
								line: value.location.range.start.line - 1,
								character: value.location.range.start.column - 1
							},
							end: {
								line: value.location.range.end.line - 1,
								character: value.location.range.end.column - 1
							}
						}
					},
					message: value.message
				};
			}
		);

		return {
			range: {
				start: {
					line: value.location.range.start.line - 1,
					character: value.location.range.start.column - 1
				},
				end: {
					line: value.location.range.end.line - 1,
					character: value.location.range.end.column - 1
				}
			},
			severity: value.severity,
			source: value.source,
			message: value.message,
			relatedInformation: related_information
		};
	});

	return {
		kind: vscode_node.DocumentDiagnosticReportKind.Full,
		items: items
	} satisfies vscode_node.DocumentDiagnosticReport;
});

connection.onDidOpenTextDocument((parameters) => {
	const document = TextDocument.create(
		parameters.textDocument.uri,
		parameters.textDocument.languageId,
		parameters.textDocument.version,
		parameters.textDocument.text
	);
	server_data.documents.set(parameters.textDocument.uri, document);

	const document_state = Document.create_empty_state(parameters.textDocument.uri, server_data.language_description.production_rules);

	const text_changes: Text_change.Text_change[] = [
		{
			range: {
				start: 0,
				end: parameters.textDocument.text.length,
			},
			text: parameters.textDocument.text
		}
	];

	server_data.document_states.set(parameters.textDocument.uri, document_state);

	try {
		const new_document_state = Text_change.update(server_data.language_description, document_state, text_changes, parameters.textDocument.text);
		server_data.document_states.set(parameters.textDocument.uri, new_document_state);
	}
	catch (error: any) {
		console.log(`server.onDidOpenTextDocument(): Exception thrown: '${error}'`);
	}
});

connection.onDidChangeTextDocument((parameters) => {

	const document = server_data.documents.get(parameters.textDocument.uri);
	if (document === undefined) {
		return;
	}

	const document_state = server_data.document_states.get(parameters.textDocument.uri);
	if (document_state === undefined) {
		return;
	}

	const text_changes = parameters.contentChanges.map(
		(content_change): Text_change.Text_change => {
			if (vscode_node.TextDocumentContentChangeEvent.isIncremental(content_change)) {
				return {
					range: {
						start: document.offsetAt(content_change.range.start),
						end: document.offsetAt(content_change.range.end),
					},
					text: content_change.text
				};
			}
			else {
				return {
					range: {
						start: 0,
						end: content_change.text.length,
					},
					text: content_change.text
				};
			}
		}
	);

	TextDocument.update(document, parameters.contentChanges, parameters.textDocument.version);
	const text_after_changes = document.getText();

	try {
		const new_document_state = Text_change.update(server_data.language_description, document_state, text_changes, text_after_changes);
		server_data.document_states.set(parameters.textDocument.uri, new_document_state);
	}
	catch (error: any) {
		console.log(`server.onDidChangeTextDocument(): Exception thrown: '${error}'`);
	}
});

connection.onDidCloseTextDocument((parameters) => {
	extension_settings_map.delete(parameters.textDocument.uri);
	server_data.document_states.delete(parameters.textDocument.uri);
	server_data.documents.delete(parameters.textDocument.uri);
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event');
});

connection.onCompletion(
	async (text_document_position: vscode_node.TextDocumentPositionParams): Promise<vscode_node.CompletionItem[]> => {
		const workspace_folder_uri = await get_workspace_folder_uri_for_document(text_document_position.textDocument.uri);
		return Completion.on_completion(text_document_position, server_data, workspace_folder_uri);
	}
);

connection.onCompletionResolve(
	(item: vscode_node.CompletionItem): vscode_node.CompletionItem => {
		return item;
	}
);

connection.languages.semanticTokens.on(
	async (parameters: vscode_node.SemanticTokensParams): Promise<vscode_node.SemanticTokens> => {

		const document_state = server_data.document_states.get(parameters.textDocument.uri);
		if (document_state === undefined || document_state.parse_tree === undefined) {
			return { data: [] };
		}

		const document = server_data.documents.get(parameters.textDocument.uri);
		if (document === undefined) {
			return { data: [] };
		}

		const end = document.positionAt(document.getText().length);

		const range_parameters: vscode_node.SemanticTokensRangeParams = {
			textDocument: parameters.textDocument,
			range: {
				start: {
					line: 0,
					character: 0
				},
				end: end
			}
		};

		return Semantic_tokens_provider.provider(range_parameters, document_state);
	}
);

connection.languages.semanticTokens.onRange(
	async (parameters: vscode_node.SemanticTokensRangeParams): Promise<vscode_node.SemanticTokens> => {

		const document_state = server_data.document_states.get(parameters.textDocument.uri);
		if (document_state === undefined || document_state.parse_tree === undefined) {
			return { data: [] };
		}

		return Semantic_tokens_provider.provider(parameters, document_state);
	}
);

connection.listen();

async function get_workspace_folder_uri_for_document(document_uri: string): Promise<string | undefined> {
	const workspace_folders = await connection.workspace.getWorkspaceFolders();
	if (!workspace_folders) {
		return undefined;
	}

	for (const folder of workspace_folders) {
		if (document_uri.startsWith(folder.uri)) {
			return folder.uri;
		}
	}

	return undefined;
}