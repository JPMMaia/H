import { commands, ExtensionContext } from "vscode";
import { HEditorProvider } from './HEditorProvider';
import * as vscode from "vscode";
import { HEditorExplorerTreeDataProvider } from "./treeView/HEditorExplorerTreeDataProvider";
import { HDocumentManager } from "./HDocumentManager";

export function activate(context: ExtensionContext) {

  const hDocumentManager = new HDocumentManager();

  const hEditorProvider = new HEditorProvider(context, hDocumentManager);

  {
    const hEditorProviderRegistration = vscode.window.registerCustomEditorProvider(HEditorProvider.viewType, hEditorProvider);
    context.subscriptions.push(hEditorProviderRegistration);
  }

  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {

    const workspaceRootUri = vscode.workspace.workspaceFolders[0].uri;
    const treeDataProvider = new HEditorExplorerTreeDataProvider(workspaceRootUri, context.extensionUri, hDocumentManager);

    vscode.window.registerTreeDataProvider(
      'HEditorExplorer',
      treeDataProvider
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.refresh",
      (documentUri) => treeDataProvider.refresh(documentUri)
    );
  }
}
