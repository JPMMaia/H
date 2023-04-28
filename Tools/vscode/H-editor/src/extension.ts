import { commands, ExtensionContext } from "vscode";
import { HEditorProvider } from './HEditorProvider';
import * as vscode from "vscode";
import { HEditorExplorerTreeDataProvider } from "./treeView/HEditorExplorerTreeDataProvider";
import type { HEditorExplorerTreeEntry } from "./treeView/HEditorExplorerTreeDataProvider";
import { HDocumentManager } from "./HDocumentManager";
import { HDocument } from "./HDocument";
import { onThrowError } from "./utilities/errors";
import { H_file_system_provider } from "./text_editor/H_file_system_provider";
import { H_default_formatter } from "./text_editor/H_default_formatter";
import { H_document_provider } from "./text_editor/H_document_provider";
import * as Module_examples from "./core/Module_examples";

import * as Abstract_syntax_tree from "./core/Abstract_syntax_tree";
import * as Abstract_syntax_tree_change from "./core/Abstract_syntax_tree_change";
import * as Change from "./utilities/Change";
import * as Change_update_from_text from "./utilities/Change_update_from_text";
import * as core from "./utilities/coreModelInterface";
import * as core_helpers from "./utilities/coreModelInterfaceHelpers";
import * as Grammar from "./core/Grammar";
import * as Module_change from "./core/Module_change";
import * as Parser from "./core/Parser";
import * as Scanner from "./core/Scanner";
import * as type_utilities from "./utilities/Type_utilities";
import * as Scanner from "./core/Scanner";
import * as Symbol_database from "./core/Symbol_database";
import * as Symbol_database_change from "./core/Symbol_database_change";

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

    context.subscriptions.push(vscode.commands.registerCommand('HEditor.initialize_workspace', _ => {

      if (vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders.length === 0) {
        return;
      }

      for (const workspace_folder of vscode.workspace.workspaceFolders) {
        const uri = workspace_folder.uri.with({ scheme: "hlp" });
        const name = vscode.workspace.workspaceFolders[0].name + " (H File System)";

        vscode.workspace.updateWorkspaceFolders(0, 0, { uri: uri, name: name });
      }
    }));

    const hDocumentManager = new HDocumentManager();

    const h_document_provider = new H_document_provider();
    const file_system_provider = new H_file_system_provider(h_document_provider);

    {
      const disposable = vscode.workspace.registerFileSystemProvider("hlp", file_system_provider, { isCaseSensitive: true, isReadonly: false });
      context.subscriptions.push(disposable);
    }

    vscode.workspace.onDidOpenTextDocument((text_document: vscode.TextDocument) => {
      if (text_document.languageId === "hl") {
        const hlp_uri = text_document.uri.with({ scheme: "hlp" });
        vscode.workspace.openTextDocument(hlp_uri);
      }
    });

    {
      const disposable = vscode.languages.registerDocumentFormattingEditProvider('hl', new H_default_formatter(h_document_provider));
      context.subscriptions.push(disposable);
    }

    {
      const example_0 = Module_examples.create_default();
      const json = JSON.stringify(example_0);
      const data: Uint8Array = Buffer.from(json, "utf8");

      const destination_uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "default.hl");
      vscode.workspace.fs.writeFile(destination_uri, data);
    }

    /*const hEditorProvider = new HEditorProvider(context, hDocumentManager);

    {
      const hEditorProviderRegistration = vscode.window.registerCustomEditorProvider(HEditorProvider.viewType, hEditorProvider);
      context.subscriptions.push(hEditorProviderRegistration);
    }*/

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

        if (e.contentChanges.length > 0 && !e.document.isClosed && e.document.uri.scheme === "hlp" && e.document.uri.path.endsWith(".hl")) {
          const document_data = h_document_provider.get_document(e.document.uri);
          if (document_data !== undefined) {

            for (const content_change of e.contentChanges) {

              const scanned_input_change = Parser.scan_new_change(
                document_data.parse_tree,
                { line: content_change.range.start.line, column: content_change.range.start.character },
                { line: content_change.range.end.line, column: content_change.range.end.character },
                content_change.text
              );

              if (scanned_input_change.new_words.length > 0) {

                const parse_result = Parser.parse_incrementally(
                  document_data.parse_tree,
                  scanned_input_change.start_change_node_position,
                  scanned_input_change.new_words,
                  scanned_input_change.after_change_node_position,
                  document_data.actions_table,
                  document_data.go_to_table,
                  document_data.map_word_to_terminal
                );

                // TODO figure out errors...

                // Create symbol changes
                // Create module changes

                // Apply parse tree changes
                // Apply symbol changes
                // Apply module changes
              }

              // Update parse tree text position

              /*const root: Abstract_syntax_tree.Node = document_data.abstract_syntax_tree;

              const nodes_range = Abstract_syntax_tree.find_nodes_of_range(root, content_change.rangeOffset, content_change.rangeOffset + content_change.rangeLength);

              if (nodes_range.parent_position !== undefined) {

                const parent_position = nodes_range.parent_position;
                const start_child_index = nodes_range.child_indices.start;
                const end_child_index = nodes_range.child_indices.end;

                for (let child_index = start_child_index; child_index < end_child_index; ++child_index) {

                  const child_node_position = [...parent_position, child_index];
                  const child_node = Abstract_syntax_tree.get_node_at_position(root, child_node_position);
                  const child_node_offset_range = Abstract_syntax_tree.find_node_range(root, -1, child_node_position);

                  const text_adjusted_offset_range = { start: child_node_offset_range.start, end: child_node_offset_range.end - content_change.rangeLength + content_change.text.length };

                  const text_adjusted_range = new vscode.Range(e.document.positionAt(text_adjusted_offset_range.start), e.document.positionAt(text_adjusted_offset_range.end));
                  const text = e.document.getText(text_adjusted_range);

                  {
                    const scanned_words = Scanner.scan(text);
                    const new_node = Parser.parse(scanned_words, 0, document_data.grammar, child_node.token).node;

                    const abstract_syntax_tree_change = Abstract_syntax_tree_change.create_replace_change(child_node_position, new_node);
                    Abstract_syntax_tree_change.update(document_data.abstract_syntax_tree, abstract_syntax_tree_change);

                    const symbol_database_change = Symbol_database_change.create_change(new_node);
                    Symbol_database_change.update(document_data.symbol_database, symbol_database_change);

                    const module_change = Module_change.create_change(new_node);
                    Module_change.update(document_data.module, module_change);
                  }
                }
              }
              else {
                throw Error("Not implemented!");
              }*/
            }
          }
        }

        if (e.contentChanges.length > 0 && !e.document.isClosed && e.document.uri.path.startsWith(workspaceRootUri.path) && e.document.uri.path.endsWith(".hl")) {

          const document = hDocumentManager.getRegisteredDocument(e.document.uri);
          const changes = Change_update_from_text.create_change_updates_from_text_changes(e.contentChanges, e.document, document);

          document.onDidChangeTextDocument(e, changes);
          //hEditorProvider.onDidChangeTextDocument(e, changes);
          treeDataProvider.onDidChangeTextDocument(e, changes);
        }
      }
    );
  }
}
