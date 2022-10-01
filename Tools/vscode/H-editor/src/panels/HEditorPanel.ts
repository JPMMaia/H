import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn } from "vscode";
import { getUri } from "../utilities/getUri";

/**
 * This class manages the state and behavior of HelloWorld webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering HelloWorld webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class HEditorPanel {

  public readonly id: number;
  public readonly panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private listeners: any[] = [];

  /**
   * The HEditorPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  public constructor(id: number, panel: WebviewPanel, extensionUri: Uri) {
    this.id = id;
    this.panel = panel;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this.panel.onDidDispose(this.dispose, null, this._disposables);

    // Set webview options
    this.panel.webview.options = {
      enableScripts: true,
    };

    // Set the HTML content for the webview panel
    this.panel.webview.html = this._getWebviewContent(this.panel.webview, extensionUri);

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this.panel.webview);
  }

  public addListener(listener: any): void {
    this.listeners.push(listener);
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  private dispose() {
    // Dispose of the current webview panel
    this.panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  public sendMessage(messages: any[]): void {
    this.panel.webview.postMessage(messages);
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the Vue webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the Vue build output
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    // The JS file from the Vue build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);

    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode/codicons", "dist", "codicon.css"]);

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />

          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <link rel="stylesheet" type="text/css" href="${codiconsUri}">

          <title>Hello World</title>
        </head>
        <body>
          <div id="app"></div>
          <script type="module" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  private onMessageReceived(message: any) {

    const command = message.command;

    switch (command) {
      case "create:module":
        for (const listener of this.listeners) {
          listener.replaceByDefaultModule();
        }
        break;
      case "delete:module":
        for (const listener of this.listeners) {
          listener.deleteModule();
        }
        break;
      case "create:function":
        for (const listener of this.listeners) {
          listener.createFunction(message.data.function_index, message.data.is_export_declaration);
        }
        break;
      case "insert:value":
        for (const listener of this.listeners) {
          listener.insertValue(message.data.position, message.data.value);
        }
        break;
      case "delete:value":
        for (const listener of this.listeners) {
          listener.deleteValue(message.data.position);
        }
        break;
      case "update:value":
        for (const listener of this.listeners) {
          listener.updateValue(message.data.position, message.data.new_value);
        }
        break;
      case "update:variant_type":
        for (const listener of this.listeners) {
          listener.updateVariant(message.data.position, message.data.new_value);
        }
        break;
      case "add:function_parameter":
        for (const listener of this.listeners) {
          listener.addFunctionParameter(message.data.function_id, message.data.parameter_info);
        }
        break;
      case "remove:function_parameter":
        for (const listener of this.listeners) {
          listener.removeFunctionParameter(message.data.function_id, message.data.parameter_index);
        }
        break;
      case "move_up:function_parameter":
        for (const listener of this.listeners) {
          listener.moveFunctionParameterUp(message.data.function_id, message.data.parameter_index);
        }
        break;
      case "move_down:function_parameter":
        for (const listener of this.listeners) {
          listener.moveFunctionParameterDown(message.data.function_id, message.data.parameter_index);
        }
        break;
    }
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {

    webview.onDidReceiveMessage(
      (message: any) => {
        this.onMessageReceived(message);
      },
      undefined,
      this._disposables
    );

  }
}
