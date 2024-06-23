import "module-alias/register";

import * as Completion from "./Completion";
import * as Server_data from "./Server_data";
import * as Semantic_tokens_provider from "./Semantic_tokens_provider";

import * as vscode_node from "vscode-languageserver/node";
import { TextDocument } from 'vscode-languageserver-textdocument';

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

connection.onInitialize((params: vscode_node.InitializeParams) => {
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
});

interface Example_settings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: Example_settings = { maxNumberOfProblems: 1000 };
let globalSettings: Example_settings = defaultSettings;

// Cache the settings of all open documents
const document_settings: Map<string, Thenable<Example_settings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (has_configuration_capability) {
		// Reset all cached document settings
		document_settings.clear();
	} else {
		globalSettings = <Example_settings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}
	// Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
	// We could optimize things here and re-fetch the setting first can compare it
	// to the existing setting, but this is out of scope for this example.
	connection.languages.diagnostics.refresh();
});

function get_document_settings(resource: string): Thenable<Example_settings> {
	if (!has_configuration_capability) {
		return Promise.resolve(globalSettings);
	}
	let result = document_settings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		document_settings.set(resource, result);
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

	const new_document_state = Text_change.update(server_data.language_description, document_state, text_changes, parameters.textDocument.text);
	server_data.document_states.set(parameters.textDocument.uri, new_document_state);
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

	const new_document_state = Text_change.update(server_data.language_description, document_state, text_changes, text_after_changes);
	server_data.document_states.set(parameters.textDocument.uri, new_document_state);
});

connection.onDidCloseTextDocument((parameters) => {
	document_settings.delete(parameters.textDocument.uri);
	server_data.document_states.delete(parameters.textDocument.uri);
	server_data.documents.delete(parameters.textDocument.uri);
});


async function validate_text_document(textDocument: TextDocument): Promise<vscode_node.Diagnostic[]> {
	// In this simple example we get the settings for every validate run.
	const settings = await get_document_settings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: vscode_node.Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		const diagnostic: vscode_node.Diagnostic = {
			severity: vscode_node.DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		if (has_diagnostic_related_information_capability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Particularly for names'
				}
			];
		}
		diagnostics.push(diagnostic);
	}
	return diagnostics;
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event');
});

connection.onCompletion(
	(text_document_position: vscode_node.TextDocumentPositionParams): vscode_node.CompletionItem[] => {
		return Completion.on_completion(text_document_position, server_data);
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
