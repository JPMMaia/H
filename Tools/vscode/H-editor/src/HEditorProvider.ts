import * as vscode from 'vscode';
import { getNonce } from './util';
import { createFunctionsListHTML } from './transformer';
import * as H from "./model";
import * as settings from './settings';
import { LanguageServer } from './LanguageServer';
import { HEditorPanel } from './panels/HEditorPanel';
import { HDocument } from './HDocument';
import { fromOffsetToPosition, isNumber } from './utilities/parseJSON';
import { HDocumentManager } from './HDocumentManager';
import * as Change from "./utilities/Change";

function getWebviewPanelIDs(webviewDocuments: Map<number, HDocument>, documentUri: vscode.Uri): number[] {

	const ids: number[] = [];

	for (const entry of webviewDocuments.entries()) {
		if (entry[1].getDocumentUri().toString() === documentUri.toString()) {
			ids.push(entry[0]);
		}
	}

	return ids;
}

/**
 * Provider for H editors.
 * 
 * H editors are used for `.hl` files, which are just json files.
 * To get started, run this extension and open an empty `.hl` file in VS Code.
 * 
 */
export class HEditorProvider implements vscode.CustomTextEditorProvider {

	public static readonly viewType = 'heditor.textEditor';

	private languageServer?: LanguageServer = undefined;
	private registeredWebviews = new Map<number, HEditorPanel>();
	private webviewDocuments = new Map<number, HDocument>();
	private nextWebviewPanelID = 0;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private hDocumentManager: HDocumentManager
	) {
	}

	/*private getWebviewPanelID(registeredWebviews: Map<number, HEditorPanel>, webviewPanel: vscode.WebviewPanel): number | undefined {

		for (const entry of registeredWebviews.entries()) {
			if (entry[1].panel === webviewPanel) {
				return entry[0];
			}
		}

		return undefined;
	}*/

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

		if (!this.hDocumentManager.isDocumentRegistered(document.uri)) {
			this.hDocumentManager.registerDocument(document.uri, document);
		}

		const hDocument = this.hDocumentManager.getRegisteredDocument(document.uri);

		const webpanelID = this.nextWebviewPanelID;
		++this.nextWebviewPanelID;

		const hPanel = new HEditorPanel(
			webpanelID,
			webviewPanel,
			this.context.extensionUri
		);

		this.registeredWebviews.set(webpanelID, hPanel);
		this.webviewDocuments.set(webpanelID, hDocument);

		hPanel.addListener(hDocument);

		// Hook up event handlers so that we can synchronize the webview with the text document.
		//
		// The text document acts as our model, so we have to sync change in the document to our
		// editor and sync changes in the editor back to the document.
		// 
		// Remember that a single text document can also be shared between multiple custom
		// editors (this happens for example when you split a custom editor)

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {

			this.webviewDocuments.delete(webpanelID);
			this.registeredWebviews.delete(webpanelID);

			if (document.isClosed) {
				this.hDocumentManager.unregisterDocument(document.uri);
			}
		});

		{
			const jsonData = hDocument.getDocumentAsJson();

			if (jsonData !== null) {

				const initial_value = jsonData;

				const change_hierarchy: Change.Hierarchy = {
					changes: [
						Change.create_initialize(initial_value)
					],
					children: []
				};

				const message = {
					command: "new_changes",
					data: {
						"changes": [change_hierarchy]
					}
				};

				hPanel.sendMessage([message]);
			}
		}

		/*if (this.languageServer === undefined) {
			this.languageServer = new LanguageServer("C:/Users/jpmmaia/Desktop/source/H/build/Application/Language_server/Debug/H_Language_server.exe", this);
			//languageServer.request({ "echo_request": { "data": "Hello from vscode!" } });
		}
		this.requestHtmlTemplates(this.languageServer, webpanelID);*/
	}

	public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent, changes: Change.Hierarchy[]): void {

		const webviewPanelIDs = getWebviewPanelIDs(this.webviewDocuments, e.document.uri);

		for (const webviewPanelID of webviewPanelIDs) {
			const hPanel = this.registeredWebviews.get(webviewPanelID);
			if (hPanel === undefined) {
				return;
			}

			const message = {
				command: "new_changes",
				data: {
					"changes": changes
				}
			};

			hPanel.sendMessage([message]);
		}
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

	private handleHtmlTemplates(registeredWebviews: Map<number, HEditorPanel>, data: any): void {

		const webviewPanelID = data.id;
		const webviewPanel = registeredWebviews.get(webviewPanelID);

		if (webviewPanel !== undefined) {
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
