import { commands, ExtensionContext } from "vscode";
import { HEditorProvider } from './HEditorProvider';
import * as vscode from "vscode";
import { HEditorExplorerTreeDataProvider } from "./treeView/HEditorExplorerTreeDataProvider";
import type { HEditorExplorerTreeEntry } from "./treeView/HEditorExplorerTreeDataProvider";
import { HDocumentManager } from "./HDocumentManager";
import { HDocument } from "./HDocument";
import { onThrowError } from "./utilities/errors";

import * as Change from "./utilities/Change";
import * as Change_update_from_text from "./utilities/Change_update_from_text";
import * as core from "./utilities/coreModelInterface";
import * as core_helpers from "./utilities/coreModelInterfaceHelpers";
import * as type_utilities from "./utilities/Type_utilities";

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
        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter alias name" }, (name, document) => {

          const module = document.getState();

          const index = module.internal_declarations.alias_type_declarations.size;
          const id = module.next_unique_id;
          const new_type = type_utilities.create_default_type_reference();

          const new_alias_type_declaration: core.Alias_type_declaration = {
            id: id,
            name: name,
            type: {
              size: 1,
              elements: [new_type]
            }
          };

          const new_changes: Change.Hierarchy = {
            changes: [
              Change.create_add_number("next_unique_id", 1)
            ],
            children: [
              {
                position: ["internal_declarations"],
                hierarchy: {
                  changes: [
                    Change.create_add_element_to_vector("alias_type_declarations", index, new_alias_type_declaration)
                  ],
                  children: []
                }
              }
            ]
          };

          document.update(new_changes);
        });
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addEnum",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter enum name" }, (name, document) => {

          const module = document.getState();

          const index = module.internal_declarations.enum_declarations.size;
          const id = module.next_unique_id;

          const new_enum_declaration: core.Enum_declaration = {
            id: id,
            name: name,
            values: {
              size: 0,
              elements: []
            }
          };

          const new_changes: Change.Hierarchy = {
            changes: [
              Change.create_add_number("next_unique_id", 1)
            ],
            children: [
              {
                position: ["internal_declarations"],
                hierarchy: {
                  changes: [
                    Change.create_add_element_to_vector("enum_declarations", index, new_enum_declaration)
                  ],
                  children: []
                }
              }
            ]
          };

          document.update(new_changes);
        });
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addStruct",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter struct name" }, (name, document) => {

          const module = document.getState();

          const index = module.internal_declarations.struct_declarations.size;
          const id = module.next_unique_id;

          const new_struct_declaration: core.Struct_declaration = {
            id: id,
            name: name,
            member_types: {
              size: 0,
              elements: []
            },
            member_names: {
              size: 0,
              elements: []
            },
            is_packed: false,
            is_literal: false
          };

          const new_changes: Change.Hierarchy = {
            changes: [
              Change.create_add_number("next_unique_id", 1)
            ],
            children: [
              {
                position: ["internal_declarations"],
                hierarchy: {
                  changes: [
                    Change.create_add_element_to_vector("struct_declarations", index, new_struct_declaration)
                  ],
                  children: []
                }
              }
            ]
          };

          document.update(new_changes);
        });
      }
    );

    vscode.commands.registerCommand(
      "HEditorExplorer.addFunction",
      (entry: HEditorExplorerTreeEntry, selectedEntries: HEditorExplorerTreeEntry[]) => {
        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter function name" }, (name, document) => {

          const module = document.getState();

          const id = module.next_unique_id;
          const declaration_index = module.internal_declarations.function_declarations.size;
          const definition_index = module.definitions.function_definitions.size;

          const new_function_declaration: core.Function_declaration = {
            id: id,
            name: name,
            type: {
              input_parameter_types: {
                size: 0,
                elements: []
              },
              output_parameter_types: {
                size: 0,
                elements: []
              },
              is_variadic: false
            },
            input_parameter_ids: {
              size: 0,
              elements: []
            },
            input_parameter_names: {
              size: 0,
              elements: []
            },
            output_parameter_ids: {
              size: 0,
              elements: []
            },
            output_parameter_names: {
              size: 0,
              elements: []
            },
            linkage: core.Linkage.Private
          };

          const new_function_definition: core.Function_definition = {
            id: id,
            statements: {
              size: 0,
              elements: []
            }
          };

          const new_changes: Change.Hierarchy = {
            changes: [
              Change.create_add_number("next_unique_id", 1)
            ],
            children: [
              {
                position: ["internal_declarations"],
                hierarchy: {
                  changes: [
                    Change.create_add_element_to_vector("function_declarations", declaration_index, new_function_declaration)
                  ],
                  children: []
                }
              },
              {
                position: ["definitions"],
                hierarchy: {
                  changes: [
                    Change.create_add_element_to_vector("function_definitions", definition_index, new_function_definition)
                  ],
                  children: []
                }
              }
            ]
          };

          document.update(new_changes);
        });
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

              const module = document.getState();

              const change_pairs = selectedEntries
                .map(entry => entry.hID !== undefined ? entry.hID : -1)
                .filter(id => id !== -1)
                .map(id => {
                  return core_helpers.get_position_of_vector_element(module, id);
                })
                .map(position => position !== undefined ? position : [])
                .filter(position => position.length === 4)
                .map(position => {
                  const change: Change.Position_hierarchy_pair = {
                    position: position[0],
                    hierarchy: {
                      changes: [
                        Change.create_remove_element_of_vector(position[1], position[3])
                      ],
                      children: []
                    }
                  };
                  return change;
                });

              const new_changes: Change.Hierarchy = {
                changes: [],
                children: change_pairs
              };

              document.update(new_changes);
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

        showInputBoxAndOpenDocumentIfRequired(hDocumentManager, entry.entryUri, { placeHolder: "Enter the new name", value: entry.label },
          (new_name, document) => {
            if (entry.hID !== undefined) {

              const module = document.getState();

              const vector_name = entry.contextValue + "s";
              const id = entry.hID;
              const result = core_helpers.findElementIndexWithId(
                core_helpers.get_declarations_vector(module.export_declarations, vector_name).elements,
                core_helpers.get_declarations_vector(module.internal_declarations, vector_name).elements,
                id
              );
              const index = result.index;
              const declarations_name = result.isExportDeclaration ? "export_declarations" : "internal_declarations";

              const new_changes: Change.Hierarchy = {
                changes: [],
                children: [
                  {
                    position: [declarations_name, vector_name, "elements", index],
                    hierarchy: {
                      changes: [
                        Change.create_update("name", new_name)
                      ],
                      children: []
                    }
                  }
                ]
              };

              document.update(new_changes);
            }
          }
        );
      }
    );

    vscode.workspace.onDidChangeTextDocument(
      e => {

        if (e.contentChanges.length > 0 && !e.document.isClosed && e.document.uri.path.startsWith(workspaceRootUri.path) && e.document.uri.path.endsWith(".hl")) {

          const document = hDocumentManager.getRegisteredDocument(e.document.uri);
          const changes = Change_update_from_text.create_change_updates_from_text_changes(e.contentChanges, e.document, document);

          document.onDidChangeTextDocument(e, changes);
          hEditorProvider.onDidChangeTextDocument(e, changes);
          treeDataProvider.onDidChangeTextDocument(e, changes);
        }
      }
    );
  }
}
