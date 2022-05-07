import * as vscode from 'vscode';
import { getNonce } from './util';
import { createFunctionsListHTML } from './transformer';
import * as H from "./model";
import * as settings from './settings';
import { LanguageServer } from './LanguageServer';
import { HelloWorldPanel } from './panels/HelloWorldPanel';

/**
 * Provider for H editors.
 * 
 * H editors are used for `.hl` files, which are just json files.
 * To get started, run this extension and open an empty `.hl` file in VS Code.
 * 
 */
export class HEditorProvider implements vscode.CustomTextEditorProvider {

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new HEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(HEditorProvider.viewType, provider);
		return providerRegistration;
	}

	private static readonly viewType = 'heditor.textEditor';

	private languageServer?: LanguageServer = undefined;
	private registeredWebviews = new Map<number, HelloWorldPanel>();
	private nextWebviewPanelID = 0;

	constructor(
		private readonly context: vscode.ExtensionContext
	) {
	}

	private getWebviewPanelID(registeredWebviews: Map<number, HelloWorldPanel>, webviewPanel: vscode.WebviewPanel): number | undefined {

		for (const entry of registeredWebviews.entries()) {
			if (entry[1].panel === webviewPanel) {
				return entry[0];
			}
		}

		return undefined;
	}

	private updateWebview(
		webviewPanel: vscode.WebviewPanel,
		text: string
	): void {

		webviewPanel.webview.postMessage({
			type: 'update',
			text: text,
		});
	}

	/**
	 * Called when our custom editor is opened.
	 * 
	 * 
	 */
	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {

		let webpanelID = this.getWebviewPanelID(this.registeredWebviews, webviewPanel);

		const panel = new HelloWorldPanel(
			webviewPanel,
			this.context.extensionUri
		);

		if (webpanelID === undefined) {
			webpanelID = this.nextWebviewPanelID;
			++this.nextWebviewPanelID;

			this.registeredWebviews.set(webpanelID, panel);
		}

		// Hook up event handlers so that we can synchronize the webview with the text document.
		//
		// The text document acts as our model, so we have to sync change in the document to our
		// editor and sync changes in the editor back to the document.
		// 
		// Remember that a single text document can also be shared between multiple custom
		// editors (this happens for example when you split a custom editor)

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				//updateWebview(this);
				return;
			}
		});

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		{
			const data = this.getDocumentAsJson(document);
			if (data !== null) {
				webviewPanel.webview.postMessage(data);
			}
		}

		/*if (this.languageServer === undefined) {
			this.languageServer = new LanguageServer("C:/Users/jpmmaia/Desktop/source/H/build/Application/Language_server/Debug/H_Language_server.exe", this);
			//languageServer.request({ "echo_request": { "data": "Hello from vscode!" } });
		}
		this.requestHtmlTemplates(this.languageServer, webpanelID);*/
	}

	/**
	 * Try to get a current document as json text.
	 */
	private getDocumentAsJson(document: vscode.TextDocument): any | null {
		const text = document.getText();
		if (text.trim().length === 0) {
			return null;
		}

		try {
			return JSON.parse(text);
		} catch {
			throw new Error('Could not get document as json. Content is not valid json');
		}
	}

	/**
	 * Write out the json to a given document.
	 */
	private updateTextDocument(document: vscode.TextDocument, json: any) {
		const edit = new vscode.WorkspaceEdit();

		// Just replace the entire document every time for this example extension.
		// A more complete extension should compute minimal edits instead.
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			JSON.stringify(json, null, 2));

		return vscode.workspace.applyEdit(edit);
	}

	private requestHtmlTemplates(languageServer: LanguageServer, messageID: number): void {

		const createHtmlTemplatesRequest = {
			"id": messageID,
			"create_html_templates_request": {
				"templates_to_create": {
					"size": 3,
					"elements": [
						{
							"name": "h_type_reference",
							"format": "${type_name}"
						},
						{
							"name": "h_function_parameter",
							"format": "${parameter_name}: ${parameter_type}"
						},
						{
							"name": "h_function_declaration",
							"format": "function ${function_name}(${function_parameters}) -> ${return_type}"
						}
					]
				}
			}
		};

		languageServer.request(createHtmlTemplatesRequest);
	}

	private handleHtmlTemplates(registeredWebviews: Map<number, HelloWorldPanel>, data: any): void {

		const webviewPanelID = data.id;
		const webviewPanel = registeredWebviews.get(webviewPanelID);

		if (webviewPanel != undefined) {
			const html = data.create_html_templates_answer.templates.elements.join('');

			//this.updateWebview(webviewPanel, html);
		}
	}

	public onAnswerArrived(data: any): void {

		console.log(data);

		if ("create_html_templates_answer" in data) {
			this.handleHtmlTemplates(this.registeredWebviews, data);
		}
		if ("echo_answer" in data) {
			console.log(data);
		}
		else {
			console.log("Unhandled answer: " + data);
		}
	}
}
