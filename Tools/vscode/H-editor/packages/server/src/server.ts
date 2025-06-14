import * as Definition from "./Definition";
import * as Code_actions from "./Code_actions";
import * as Code_lens from "./Code_lens";
import * as Completion from "./Completion";
import * as Hover from "./Hover";
import * as Inlay_hints from "./Inlay_hints";
import * as Platform from "./Platform";
import * as Project from "./Project";
import * as Server_data from "./Server_data";
import * as Semantic_tokens_provider from "./Semantic_tokens_provider";
import * as Signature_help from "./Signature_help";

import * as vscode_node from "vscode-languageserver/node";
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as vscode_uri from "vscode-uri";

import * as Document from "../../core/src/Document";
import * as Text_change from "../../core/src/Text_change";
import * as Validation from "../../core/src/Validation";

const connection = vscode_node.createConnection(vscode_node.ProposedFeatures.all);

let server_data: Server_data.Server_data;

let g_workspace_folders: vscode_node.WorkspaceFolder[] = [];

let has_configuration_capability = false;
let has_workspace_folder_capability = false;
let has_diagnostic_related_information_capability = false;
let has_code_action_literal_support_capability = false;
let is_initialized = false;

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
	has_code_action_literal_support_capability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.codeAction &&
		capabilities.textDocument.codeAction.codeActionLiteralSupport
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
			codeLensProvider: {
				resolveProvider: true
			},
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: [
					".", " "
				]
			},
			definitionProvider: true,
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			},
			hoverProvider: true,
			inlayHintProvider: {
				resolveProvider: false
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
			},
			signatureHelpProvider: {
				triggerCharacters: ['(', ',']
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
	if (has_code_action_literal_support_capability) {
		result.capabilities.codeActionProvider = {
			codeActionKinds: [
				vscode_node.CodeActionKind.RefactorRewrite
			],
			resolveProvider: false
		};
	}

	server_data = await Server_data.create_server_data();
	server_data.initialize_promise = new Promise((resolve) => {
		let timer: NodeJS.Timeout | undefined = undefined;

		const check = () => {
			if (is_initialized) {
				if (timer !== undefined) {
					clearInterval(timer);
				}
				resolve();
			}
		};

		timer = setInterval(check, 500);
	});

	return result;
});

connection.onInitialized(async () => {
	if (has_configuration_capability) {
		// Register for all configuration changes.
		connection.client.register(vscode_node.DidChangeConfigurationNotification.type, undefined);
	}
	if (has_workspace_folder_capability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}

	await create_projects_data();
	is_initialized = true;
});

async function create_projects_data(): Promise<void> {
	if (has_workspace_folder_capability) {
		const workspace_folders = await connection.workspace.getWorkspaceFolders();
		if (workspace_folders !== null) {
			g_workspace_folders = workspace_folders;

			for (const workspace_folder of workspace_folders) {
				const workspace_folder_uri = vscode_uri.URI.parse(workspace_folder.uri);
				const workspace_folder_fs_path = workspace_folder_uri.fsPath;

				const extension_settings = await get_extension_settings(workspace_folder.uri);

				const repository_paths = extension_settings.repositories;
				const header_search_paths: string[] = Platform.get_default_c_header_search_paths();
				const project_data = await Project.create_project_data(extension_settings.hlang_executable, workspace_folder_fs_path, repository_paths, header_search_paths);

				server_data.projects.set(workspace_folder.uri, project_data);
			}
		}
	}
}

interface Extension_settings {
	hlang_executable: string | undefined;
	repositories: string[];
}

const default_settings: Extension_settings = {
	hlang_executable: undefined,
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

connection.onDefinition(async (parameters: vscode_node.DefinitionParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.Location[]> => {
	if (cancellation_token.isCancellationRequested) {
		return [];
	}

	const start_time = performance.now();

	const workspace_folder_uri = await get_workspace_folder_uri_for_document(parameters.textDocument.uri);
	const result = Definition.find_definition_link(parameters, server_data, workspace_folder_uri);

	const end_time = performance.now();
	console.log(`onDefinition() took ${(end_time - start_time).toFixed(2)} milliseconds`);

	return result;
});

connection.languages.diagnostics.on(async (parameters, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.DocumentDiagnosticReport> => {
	if (cancellation_token.isCancellationRequested) {
		return {
			kind: vscode_node.DocumentDiagnosticReportKind.Full,
			items: []
		};
	}

	// TODO if content or diagnostics did not change, then return unchanged

	const start_time = performance.now();

	const document_state = server_data.document_states.get(parameters.textDocument.uri);
	if (document_state === undefined) {
		return {
			kind: vscode_node.DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies vscode_node.DocumentDiagnosticReport;
	}

	const workspace_folder_uri = await get_workspace_folder_uri_for_document(parameters.textDocument.uri);
	const get_parse_tree = Server_data.create_get_parse_tree(server_data, workspace_folder_uri);

	const diagnostics = await Text_change.get_all_diagnostics(document_state, get_parse_tree);

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

	const end_time = performance.now();
	console.log(`diagnostics() took ${(end_time - start_time).toFixed(2)} milliseconds`);

	return {
		kind: vscode_node.DocumentDiagnosticReportKind.Full,
		items: items
	};
});

connection.onDidOpenTextDocument((parameters) => {
	const start_time = performance.now();

	const document = TextDocument.create(
		parameters.textDocument.uri,
		parameters.textDocument.languageId,
		parameters.textDocument.version,
		parameters.textDocument.text
	);
	server_data.documents.set(parameters.textDocument.uri, document);

	const document_file_path = vscode_uri.URI.parse(parameters.textDocument.uri).fsPath.replace(/\\/g, "/");
	const document_state = Document.create_empty_state(document_file_path);

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
		const new_document_state = Text_change.update(server_data.parser, document_state, text_changes, parameters.textDocument.text);
		server_data.document_states.set(parameters.textDocument.uri, new_document_state);
	}
	catch (error: any) {
		console.log(`server.onDidOpenTextDocument(): Exception thrown: '${error}'`);
	}

	const end_time = performance.now();
	console.log(`onDidOpenTextDocument() took ${(end_time - start_time).toFixed(2)} milliseconds`);
});

connection.onDidChangeTextDocument((parameters) => {
	const start_time = performance.now();

	const document = server_data.documents.get(parameters.textDocument.uri);
	if (document === undefined) {
		return;
	}

	const document_state = server_data.document_states.get(parameters.textDocument.uri);
	if (document_state === undefined) {
		return;
	}

	server_data.core_modules_with_source_locations.delete(parameters.textDocument.uri);

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
		const new_document_state = Text_change.update(server_data.parser, document_state, text_changes, text_after_changes);
		server_data.document_states.set(parameters.textDocument.uri, new_document_state);
	}
	catch (error: any) {
		console.log(`server.onDidChangeTextDocument(): Exception thrown: '${error}'`);
	}

	const end_time = performance.now();
	console.log(`onDidChangeTextDocument() took ${(end_time - start_time).toFixed(2)} milliseconds`);
});

connection.onDidCloseTextDocument((parameters) => {
	const start_time = performance.now();

	extension_settings_map.delete(parameters.textDocument.uri);
	server_data.document_states.delete(parameters.textDocument.uri);
	server_data.documents.delete(parameters.textDocument.uri);
	server_data.core_modules_with_source_locations.delete(parameters.textDocument.uri);

	const end_time = performance.now();
	console.log(`onDidCloseTextDocument() took ${(end_time - start_time).toFixed(2)} milliseconds`);
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event');
});

connection.onCodeAction(
	async (parameters: vscode_node.CodeActionParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.CodeAction[]> => {
		if (cancellation_token.isCancellationRequested) {
			return [];
		}

		const start_time = performance.now();

		const workspace_folder_uri = await get_workspace_folder_uri_for_document(parameters.textDocument.uri);
		const result = Code_actions.get_code_actions(parameters, server_data, workspace_folder_uri);

		const end_time = performance.now();
		console.log(`onCodeAction() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.onCodeLens(
	async (parameters: vscode_node.CodeLensParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.CodeLens[]> => {
		if (cancellation_token.isCancellationRequested) {
			return [];
		}

		const start_time = performance.now();

		const workspace_folder_uri = await get_workspace_folder_uri_for_document(parameters.textDocument.uri);
		if (workspace_folder_uri === undefined) {
			return [];
		}

		const result = Code_lens.create(parameters, server_data, workspace_folder_uri);

		const end_time = performance.now();
		console.log(`onCodeLens() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.onCodeLensResolve(
	async (code_lens: vscode_node.CodeLens, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.CodeLens> => {
		if (cancellation_token.isCancellationRequested) {
			return code_lens;
		}

		const start_time = performance.now();

		const result = Code_lens.resolve(code_lens);

		const end_time = performance.now();
		console.log(`onCodeLensResolve() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.onCompletion(
	async (text_document_position: vscode_node.TextDocumentPositionParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.CompletionItem[]> => {
		if (cancellation_token.isCancellationRequested) {
			return [];
		}

		await server_data.initialize_promise;

		const start_time = performance.now();

		const workspace_folder_uri = await get_workspace_folder_uri_for_document(text_document_position.textDocument.uri);
		const result = Completion.on_completion(text_document_position, server_data, workspace_folder_uri);

		const end_time = performance.now();
		console.log(`onCompletion() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.onCompletionResolve(
	(item: vscode_node.CompletionItem): vscode_node.CompletionItem => {
		return item;
	}
);

connection.onHover(
	async (parameters: vscode_node.HoverParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.Hover | undefined> => {
		if (cancellation_token.isCancellationRequested) {
			return undefined;
		}

		const start_time = performance.now();

		const workspace_folder_uri = await get_workspace_folder_uri_for_document(parameters.textDocument.uri);
		const result = Hover.get_hover(parameters, server_data, workspace_folder_uri);

		const end_time = performance.now();
		console.log(`onHover() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.languages.inlayHint.on(
	async (parameters: vscode_node.InlayHintParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.InlayHint[]> => {
		if (cancellation_token.isCancellationRequested) {
			return [];
		}

		const start_time = performance.now();

		const workspace_folder_uri = await get_workspace_folder_uri_for_document(parameters.textDocument.uri);
		const result = Inlay_hints.create(parameters, server_data, workspace_folder_uri);

		const end_time = performance.now();
		console.log(`inlayHint() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.languages.semanticTokens.on(
	async (parameters: vscode_node.SemanticTokensParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.SemanticTokens> => {
		if (cancellation_token.isCancellationRequested) {
			return { data: [] };
		}

		const start_time = performance.now();

		const document_state = server_data.document_states.get(parameters.textDocument.uri);
		if (document_state === undefined) {
			return { data: [] };
		}
		const root = Document.get_parse_tree(document_state);
		if (root === undefined) {
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

		const result = Semantic_tokens_provider.provider(range_parameters, document_state);

		const end_time = performance.now();
		console.log(`semanticTokens() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.languages.semanticTokens.onRange(
	async (parameters: vscode_node.SemanticTokensRangeParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.SemanticTokens> => {
		if (cancellation_token.isCancellationRequested) {
			return { data: [] };
		}

		const start_time = performance.now();

		const document_state = server_data.document_states.get(parameters.textDocument.uri);
		if (document_state === undefined) {
			return { data: [] };
		}

		const result = Semantic_tokens_provider.provider(parameters, document_state);

		const end_time = performance.now();
		console.log(`semanticTokens() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.onSignatureHelp(
	async (parameters: vscode_node.SignatureHelpParams, cancellation_token: vscode_node.CancellationToken): Promise<vscode_node.SignatureHelp | null> => {
		if (cancellation_token.isCancellationRequested) {
			return null;
		}

		const start_time = performance.now();

		const workspace_folder_uri = await get_workspace_folder_uri_for_document(parameters.textDocument.uri);
		const result = Signature_help.create(parameters, server_data, workspace_folder_uri);

		const end_time = performance.now();
		console.log(`onSignatureHelp() took ${(end_time - start_time).toFixed(2)} milliseconds`);

		return result;
	}
);

connection.listen();

async function get_workspace_folder_uri_for_document(document_uri: string): Promise<string | undefined> {

	if (g_workspace_folders.length === 0) {
		await create_projects_data();
	}

	const workspace_folders = g_workspace_folders;

	for (const folder of workspace_folders) {
		if (document_uri.startsWith(folder.uri)) {
			return folder.uri;
		}
	}

	return undefined;
}
