import "module-alias/register";

import * as vscode_node from "vscode-languageserver/node";
import { TextDocument } from 'vscode-languageserver-textdocument';

import * as Document from "@core/Document";
import * as Language from "@core/Language";
import * as Storage_cache from "@core/Storage_cache";
import * as Text_change from "@core/Text_change";

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

connection.languages.diagnostics.on(async (params) => {
	const document = documents.get(params.textDocument.uri);
	if (document !== undefined) {
		return {
			kind: vscode_node.DocumentDiagnosticReportKind.Full,
			items: await validate_text_document(document)
		} satisfies vscode_node.DocumentDiagnosticReport;
	} else {
		// We don't know the document. We can either try to read it from disk
		// or we don't report problems for it.
		return {
			kind: vscode_node.DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies vscode_node.DocumentDiagnosticReport;
	}
});

connection.onDidOpenTextDocument((parameters) => {
	const document = TextDocument.create(
		parameters.textDocument.uri,
		parameters.textDocument.languageId,
		parameters.textDocument.version,
		parameters.textDocument.text
	);
	documents.set(parameters.textDocument.uri, document);

	const document_state = Document.create_empty_state(language_description.production_rules);
	document_states.set(parameters.textDocument.uri, document_state);
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

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_text_document_position: vscode_node.TextDocumentPositionParams): vscode_node.CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: vscode_node.CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: vscode_node.CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: vscode_node.CompletionItem): vscode_node.CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
// documents.listen(connection);

// Listen on the connection
connection.listen();
