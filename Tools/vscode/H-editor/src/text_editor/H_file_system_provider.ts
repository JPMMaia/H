import * as vscode from "vscode";

import * as Abstract_syntax_tree_from_module from "../core/Abstract_syntax_tree_from_module";
import * as Abstract_syntax_tree_to_text from "../core/Abstract_syntax_tree_to_text";
import * as Core from "../utilities/coreModelInterface";
import * as Default_grammar from "../core/Default_grammar";
import * as Symbol_database from "../core/Symbol_database";

import { H_document_provider } from "./H_document_provider";

export class H_file_system_provider implements vscode.FileSystemProvider {

    private onDidChangeFileEventEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    public onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.onDidChangeFileEventEmitter.event;

    private h_document_provider: H_document_provider;

    constructor(H_document_provider: H_document_provider) {
        this.h_document_provider = H_document_provider;
    }

    public watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        return new vscode.Disposable(() => { });
    }

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        const file_uri = uri.with({ scheme: "file" });
        return vscode.workspace.fs.stat(file_uri);
    }

    public readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        const file_uri = uri.with({ scheme: "file" });
        return vscode.workspace.fs.readDirectory(file_uri);
    }

    public createDirectory(uri: vscode.Uri): void | Thenable<void> {
        const file_uri = uri.with({ scheme: "file" });
        return vscode.workspace.fs.createDirectory(file_uri);
    }

    public async readFile(uri: vscode.Uri): Promise<Uint8Array> {

        const file_uri = uri.with({ scheme: "file" });

        const file_data = await vscode.workspace.fs.readFile(file_uri);
        const utf8_data = Buffer.from(file_data).toString("utf8");
        const json_data = JSON.parse(utf8_data);

        const module: Core.Module = json_data as Core.Module;
        const grammar = Default_grammar.create_grammar();
        const symbol_database = Symbol_database.create_edit_database(module);
        const abstract_syntax_tree = Abstract_syntax_tree_from_module.create_module_node(module, symbol_database, grammar);
        this.h_document_provider.set_document(uri, { module: module, grammar: grammar, abstract_syntax_tree: abstract_syntax_tree, symbol_database: symbol_database });

        const text = Abstract_syntax_tree_to_text.to_string(abstract_syntax_tree);
        const encoded_text = Buffer.from(text, "utf8");

        return await Promise.resolve(encoded_text);
    }

    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {

        const document_data = this.h_document_provider.get_document(uri);
        if (document_data === undefined) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        const file_uri = uri.with({ scheme: "file" });

        const json_data = JSON.stringify(document_data.module);
        const file_data: Uint8Array = Buffer.from(json_data, "utf8");

        return vscode.workspace.fs.writeFile(file_uri, file_data);
    }

    public delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
        const file_uri = uri.with({ scheme: "file" });
        return vscode.workspace.fs.delete(file_uri, options);
    }

    public rename(old_uri: vscode.Uri, new_uri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
        const old_file_uri = old_uri.with({ scheme: "file" });
        const new_file_uri = new_uri.with({ scheme: "file" });
        return vscode.workspace.fs.rename(old_file_uri, new_file_uri, options);
    }

    public copy?(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
        const source_uri = source.with({ scheme: "file" });
        const destination_uri = destination.with({ scheme: "file" });
        return vscode.workspace.fs.copy(source_uri, destination_uri, options);
    }
}
