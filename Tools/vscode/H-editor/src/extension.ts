import { commands, ExtensionContext } from "vscode";
import { HEditorProvider } from './HEditorProvider';
import * as vscode from "vscode";
import { HEditorExplorerTreeDataProvider } from "./treeView/HEditorExplorerTreeDataProvider";
import type { HEditorExplorerTreeEntry } from "./treeView/HEditorExplorerTreeDataProvider";
import { HDocumentManager } from "./HDocumentManager";
import { HDocument } from "./HDocument";
import { onThrowError } from "./utilities/errors";

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
        openDocumentIfRequired(hDocumentManager, entry.entryUri).then(
          (document: HDocument) => {
            document.addDeclaration("alias_type_declarations", false);
          }
        );
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addEnum",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        openDocumentIfRequired(hDocumentManager, entry.entryUri).then(
          (document: HDocument) => {
            document.addDeclaration("enum_declarations", false);
          }
        );
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addStruct",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        openDocumentIfRequired(hDocumentManager, entry.entryUri).then(
          (document: HDocument) => {
            document.addDeclaration("struct_declarations", false);
          }
        );
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addFunction",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        openDocumentIfRequired(hDocumentManager, entry.entryUri).then(
          (document: HDocument) => {
            document.addDeclaration("function_declarations", false);
            // TODO addEmptyFunctionDefinition
          }
        );
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.delete",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        openDocumentIfRequired(hDocumentManager, entry.entryUri).then(
          (document: HDocument) => {
            // TODO
          }
        );
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.editName",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        openDocumentIfRequired(hDocumentManager, entry.entryUri).then(
          (document: HDocument) => {
            if (entry.hID === undefined) {
              const message = "Entry '" + entry.label + "' did not have a valid hID";
              onThrowError(message);
              throw Error(message);
            }

            const options: vscode.InputBoxOptions = {
              placeHolder: "Enter the new name"
            };
            vscode.window.showInputBox(options).then(
              (newName: string | undefined) => {
                if (newName === undefined || entry.hID === undefined) {
                  return;
                }

                document.updateDeclarationName(entry.hID, newName);
              }
            );
          }
        );
      }
    );
  }
}
