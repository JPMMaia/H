import * as path from 'path';
import * as vscode from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node.js';

let client: LanguageClient = undefined;

export async function activate(context: vscode.ExtensionContext): Promise<LanguageClient> {

	const mode: string | undefined = process.env.mode;
	const use_webpack_server = mode !== "debug";

	const hlang_language_server_path = process.env.hlang_language_server;
	const use_cpp_server = hlang_language_server_path !== undefined;

	const server_module = use_cpp_server ?
		hlang_language_server_path :
		context.asAbsolutePath(
			use_webpack_server ?
				path.join("dist", "server.js") :
				path.join("out", "packages", "server", "src", "server.js")
		);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const server_options: ServerOptions = {
		run: { module: server_module, transport: use_cpp_server ? TransportKind.stdio : TransportKind.ipc },
		debug: {
			module: server_module,
			transport: use_cpp_server ? TransportKind.stdio : TransportKind.ipc
		}
	};

	// Options to control the language client
	const client_options: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'hlang' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'HLanglanguageServer',
		'HLang Language Server',
		server_options,
		client_options
	);

	client.middleware.didOpen = on_did_open;
	client.middleware.didChange = on_did_change;
	client.middleware.provideCompletionItem = provide_completion_item;
	client.middleware.provideInlayHints = provide_inlay_hints;

	// Start the client. This will also launch the server
	await client.start();

	return client;
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

interface Document_state {
	text: string;
	pending_change_events: vscode.TextDocumentContentChangeEvent[];
}

const g_documents = new Map<string, Document_state>();
let g_cancel_debounces: (() => void)[] = [];

function create_debounce_promise<T>(
	delay: number,
	predicate: () => T
): Promise<T> {

	let timeout: NodeJS.Timeout | undefined = undefined;
	let reject_promise: (value: T | PromiseLike<T>) => void = null;

	const cancel = () => {
		if (timeout !== undefined) {
			clearTimeout(timeout);
		}
		if (reject_promise !== null) {
			reject_promise(undefined);
		}
	};
	g_cancel_debounces.push(cancel);

	const promise = new Promise<T>((resolve, reject) => {
		reject_promise = resolve;
		timeout = setTimeout(() => {
			resolve(predicate());

			const index = g_cancel_debounces.findIndex(element => element === cancel);
			g_cancel_debounces.splice(index, 1);
		}, delay);
	});

	return promise;
}

function cancel_all_debounce_timeouts() {
	for (const cancel of g_cancel_debounces) {
		cancel();
	}
	g_cancel_debounces = [];
}

function on_did_open(data: vscode.TextDocument, next: (data: vscode.TextDocument) => Promise<void>): Promise<void> {

	const document_state: Document_state = {
		text: data.getText(),
		pending_change_events: []
	};

	g_documents.set(data.uri.toString(), document_state);

	return next(data);
}

function on_did_change(data: vscode.TextDocumentChangeEvent, next: (data: vscode.TextDocumentChangeEvent) => Promise<void>): Promise<void> {

	cancel_all_debounce_timeouts();

	const document_state = g_documents.get(data.document.uri.toString());
	if (document_state === undefined) {
		return next(data);
	}

	document_state.pending_change_events.push(...data.contentChanges);

	return create_debounce_promise<void>(100, () => {
		const content_changes = [...document_state.pending_change_events];
		document_state.pending_change_events = [];

		const new_event: vscode.TextDocumentChangeEvent = {
			document: data.document,
			contentChanges: content_changes,
			reason: data.reason,
		};

		return next(new_event);
	});
}

function provide_completion_item(
	document: vscode.TextDocument,
	position: vscode.Position,
	context: vscode.CompletionContext,
	token: vscode.CancellationToken,
	next: (document: vscode.TextDocument, position: vscode.Position, context: vscode.CompletionContext, token: vscode.CancellationToken) => Promise<vscode.CompletionItem[] | vscode.CompletionList>
): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
	const result = create_debounce_promise(200, () => {
		return next(document, position, context, token);
	});
	return Promise.resolve(result);
}

function provide_inlay_hints(
	document: vscode.TextDocument,
	view_port: vscode.Range,
	token: vscode.CancellationToken,
	next: (document: vscode.TextDocument, viewPort: vscode.Range, token: vscode.CancellationToken) => vscode.ProviderResult<vscode.InlayHint[]>
): Promise<vscode.InlayHint[]> {
	const result = create_debounce_promise(400, () => {
		return next(document, view_port, token);
	});
	return Promise.resolve(result);
}
