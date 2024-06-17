import "module-alias/register";

import * as vscode_node from "vscode-languageserver/node";
import { TextDocument } from 'vscode-languageserver-textdocument';

import * as Document from "@core/Document";
import * as Language from "@core/Language";
import * as Parser from "@core/Parser";
import * as Scan_new_changes from "@core/Scan_new_changes";
import * as Scanner from "@core/Scanner";
import * as Storage_cache from "@core/Storage_cache";
import * as Text_change from "@core/Text_change";
import * as Validation from "@core/Validation";

const connection = vscode_node.createConnection(vscode_node.ProposedFeatures.all);

const storage_cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
const language_description = Language.create_default_description(storage_cache, "out/tests/graphviz.gv");
const documents = new Map<string, TextDocument>();
const document_states = new Map<string, Document.State>();

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

	const document_state = document_states.get(parameters.textDocument.uri);
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
	documents.set(parameters.textDocument.uri, document);

	const document_state = Document.create_empty_state(parameters.textDocument.uri, language_description.production_rules);

	const text_changes: Text_change.Text_change[] = [
		{
			range: {
				start: 0,
				end: parameters.textDocument.text.length,
			},
			text: parameters.textDocument.text
		}
	];

	const new_document_state = Text_change.update(language_description, document_state, text_changes, parameters.textDocument.text);
	document_states.set(parameters.textDocument.uri, new_document_state);
});

connection.onDidChangeTextDocument((parameters) => {

	const document = documents.get(parameters.textDocument.uri);
	if (document === undefined) {
		return;
	}

	const document_state = document_states.get(parameters.textDocument.uri);
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

	const new_document_state = Text_change.update(language_description, document_state, text_changes, text_after_changes);
	document_states.set(parameters.textDocument.uri, new_document_state);
});

connection.onDidCloseTextDocument((parameters) => {
	document_settings.delete(parameters.textDocument.uri);
	document_states.delete(parameters.textDocument.uri);
	documents.delete(parameters.textDocument.uri);
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

function get_allowed_terminals(text_document_position: vscode_node.TextDocumentPositionParams): string[] {
	const document = documents.get(text_document_position.textDocument.uri);
	if (document === undefined) {
		return [];
	}

	const document_state = document_states.get(text_document_position.textDocument.uri);
	if (document_state === undefined) {
		return [];
	}

	if (document_state.diagnostics.length > 0) {
		return [];
	}

	const start_change_node_iterator =
		document_state.parse_tree !== undefined ?
			Scan_new_changes.get_node_before_text_position(
				document_state.parse_tree,
				document.getText(),
				document.offsetAt(text_document_position.position)
			) :
			undefined;

	const allowed_labels = Parser.get_allowed_labels(
		document_state.parse_tree,
		start_change_node_iterator?.node_position,
		language_description.array_infos,
		language_description.actions_table
	);

	const allowed_terminals = allowed_labels.filter(
		label => {
			if (!language_description.terminals.has(label)) {
				return false;
			}

			return Scanner.is_alphanumeric(label);
		}
	);

	return allowed_terminals;
}

connection.onCompletion(
	(text_document_position: vscode_node.TextDocumentPositionParams): vscode_node.CompletionItem[] => {

		const allowed_terminals = get_allowed_terminals(text_document_position);

		const items = allowed_terminals.map(
			(value, index) => {
				return {
					label: value,
					kind: vscode_node.CompletionItemKind.Keyword,
					data: index
				};
			}
		);

		return items;
	}
);

connection.onCompletionResolve(
	(item: vscode_node.CompletionItem): vscode_node.CompletionItem => {
		return item;
	}
);

connection.listen();
