import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as vscode from 'vscode';
import * as os from 'os';

function connectToServer(languageServerPath: string): ChildProcessWithoutNullStreams {

	const server = spawn(languageServerPath);

	return server;
}

function request(server: ChildProcessWithoutNullStreams, requestJson: any): void {

	server.stdin.write(JSON.stringify(requestJson));
	server.stdin.write("\n");
	server.stdin.write("\n");
}

export class LanguageServer {

	server: ChildProcessWithoutNullStreams | undefined;

	constructor(
		private readonly languageServerPath: string,
		private listener: any
	) {
	}

	public request(requestJson: any): void {

		if (this.server == undefined) {
			this.server = connectToServer(this.languageServerPath);

			this.server.stdout.on('data', (data) => {
				const string_data = data.toString();
				const json_data = JSON.parse(string_data);
				this.listener.onAnswerArrived(json_data);
			});
		}

		request(this.server, requestJson);
	}
}
