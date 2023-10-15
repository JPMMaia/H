import * as vscode from "vscode";
import { ExtensionContext } from "vscode";

import { H_file_system_provider } from "./text_editor/H_file_system_provider";
import { H_default_formatter } from "./text_editor/H_default_formatter";
import { H_document_provider } from "./text_editor/H_document_provider";

import * as Module_examples from "./core/Module_examples";
import * as Text_change from "./core/Text_change";

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

    vscode.workspace.onDidChangeTextDocument(
      e => {

        if (e.contentChanges.length > 0 && !e.document.isClosed && e.document.uri.scheme === "hlp" && e.document.uri.path.endsWith(".hl")) {
          const document_data = h_document_provider.get_document(e.document.uri);
          if (document_data !== undefined) {

            const text_changes: Text_change.Text_change[] = e.contentChanges.map(
              (change: vscode.TextDocumentContentChangeEvent): Text_change.Text_change => {
                return {
                  range: {
                    start: change.rangeOffset,
                    end: change.rangeOffset + change.rangeLength
                  },
                  text: change.text
                };
              });

            const text_after_changes = e.document.getText();

            document_data.state = Text_change.update(
              document_data.language_description,
              document_data.state,
              text_changes,
              text_after_changes
            );
          }
        }
      }
    );
  }
}
