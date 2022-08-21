import { commands, ExtensionContext } from "vscode";
import { HEditorProvider } from './HEditorProvider';
import * as vscode from "vscode";
import { HEditorExplorerTreeDataProvider } from "./treeView/HEditorExplorerTreeDataProvider";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(HEditorProvider.register(context));

  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {

    const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;

    vscode.window.registerTreeDataProvider(
      'HEditorExplorer',
      new HEditorExplorerTreeDataProvider(rootPath, context.extensionUri)
    );
  }
}
