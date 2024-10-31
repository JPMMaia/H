import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node.js';

let client: LanguageClient = undefined;

export async function activate(context: ExtensionContext): Promise<LanguageClient> {

	const mode: string | undefined = process.env.mode;
	const use_webpack_server = mode !== "debug";

	// The server is implemented in node
	const server_module = context.asAbsolutePath(
		use_webpack_server ?
			path.join("dist", "server.js", "server") :
			path.join("out", "packages", "server", "src", "server.js")
	);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const server_options: ServerOptions = {
		run: { module: server_module, transport: TransportKind.ipc },
		debug: {
			module: server_module,
			transport: TransportKind.ipc
		}
	};

	// Options to control the language client
	const client_options: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'hlang' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'HLanglanguageServer',
		'HLang Language Server',
		server_options,
		client_options
	);

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
