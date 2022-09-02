import { commands, ExtensionContext } from "vscode";
import { HEditorProvider } from './HEditorProvider';
import * as vscode from "vscode";
import { HEditorExplorerTreeDataProvider } from "./treeView/HEditorExplorerTreeDataProvider";
import type { HEditorExplorerTreeEntry } from "./treeView/HEditorExplorerTreeDataProvider";
import { HDocumentManager } from "./HDocumentManager";
import { HDocument } from "./HDocument";
import { onThrowError } from "./utilities/errors";
import { createUpdateMessages } from "./utilities/updateStateMessage";

function openDocumentIfRequired(hDocumentManager: HDocumentManager, documentUri: vscode.Uri): Thenable<HDocument> {

  if (!hDocumentManager.isDocumentRegistered(documentUri)) {
    return vscode.workspace.openTextDocument(documentUri).then(
      (document) => {
        hDocumentManager.registerDocument(document.uri, document);
        const hDocument = hDocumentManager.getRegisteredDocument(document.uri);
        return hDocument;
      }
    );
  }
  else {
    const hDocument = hDocumentManager.getRegisteredDocument(documentUri);
    return Promise.resolve(hDocument);
  }
}

function showInputBoxAndOpenDocumentIfRequired(hDocumentManager: HDocumentManager, documentUri: vscode.Uri, inputBoxOptions: vscode.InputBoxOptions, callback: (value: string, document: HDocument) => void) {

  vscode.window.showInputBox(inputBoxOptions).then(
    value => {
      if (value !== undefined && value.length > 0) {
        openDocumentIfRequired(hDocumentManager, documentUri).then(
          (document: HDocument) => {
            callback(value, document);
          }
        );
      }
    }
  );

}

export function activate(context: ExtensionContext) {

  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {

    const hDocumentManager = new HDocumentManager();

    const hEditorProvider = new HEditorProvider(context, hDocumentManager);

    {
      const hEditorProviderRegistration = vscode.window.registerCustomEditorProvider(HEditorProvider.viewType, hEditorProvider);
      context.subscriptions.push(hEditorProviderRegistration);
    }

    const workspaceRootUri = vscode.workspace.workspaceFolders[0].uri;
    const treeDataProvider = new HEditorExplorerTreeDataProvider(workspaceRootUri, context.extensionUri, hDocumentManager);

    const treeView = vscode.window.createTreeView(
      "HEditorExplorer",
      {
        canSelectMany: true,
        treeDataProvider: treeDataProvider
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.refresh",
      (documentUri) => treeDataProvider.refresh(documentUri)
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addAlias",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter alias name" }, (value, document) => document.addDeclaration("alias_type_declarations", value, false));
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addEnum",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter enum name" }, (value, document) => document.addDeclaration("enum_declarations", value, false));
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addStruct",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter struct name" }, (value, document) => document.addDeclaration("struct_declarations", value, false));
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addFunction",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter function name" }, (value, document) => document.addFunctionDeclarationAndDefinition(value, false));
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.delete",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {

        if (selectedEntries === undefined) {
          selectedEntries = [entry];
        }

        if (selectedEntries.length > 0) {
          openDocumentIfRequired(hDocumentManager, entry.entryUri).then(
            (document: HDocument) => {
              const ids = selectedEntries
                .map(value => value.hID !== undefined ? value.hID : -1)
                .filter(value => value !== -1);

              document.deleteDeclarations(ids);
            }
          );
        }
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.editName",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {

        if (entry.hID === undefined) {
          const message = "Entry '" + entry.label + "' did not have a valid hID";
          onThrowError(message);
          throw Error(message);
        }

        const arrayName = entry.contextValue + "s";

        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter the new name", value: entry.label },
          (value, document) => {
            if (entry.hID !== undefined) {
              document.updateDeclarationName(arrayName, entry.hID, value);
            }
          }
        );
      }
    );

    vscode.workspace.onDidChangeTextDocument(
      e => {

        if (e.contentChanges.length > 0 && !e.document.isClosed && e.document.uri.path.startsWith(workspaceRootUri.path) && e.document.uri.path.endsWith(".hl")) {

          const document = hDocumentManager.getRegisteredDocument(e.document.uri);
          const messages = createUpdateMessages(e.contentChanges, e.document, document);

          document.onDidChangeTextDocument(e, messages);
          hEditorProvider.onDidChangeTextDocument(e, messages);
          treeDataProvider.onDidChangeTextDocument(e, messages);
        }
      }
    );
  }
}
