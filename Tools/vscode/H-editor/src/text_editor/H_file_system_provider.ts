import * as vscode from "vscode";

import * as Abstract_syntax_tree from "../core/Abstract_syntax_tree_helpers";
import * as Core from "../utilities/coreModelInterface";

export class H_file_system_provider implements vscode.FileSystemProvider {

    private onDidChangeFileEventEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    public onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.onDidChangeFileEventEmitter.event;

    public watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        throw new Error("Method not implemented.");
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
        const abstract_syntax_tree = Abstract_syntax_tree.create_module_code_tree(module);

        const text = Abstract_syntax_tree.to_string(abstract_syntax_tree);
        const encoded_text = Buffer.from(text, "utf8");

        return await Promise.resolve(encoded_text);
    }

    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
        const file_uri = uri.with({ scheme: "file" });
        return vscode.workspace.fs.writeFile(file_uri, content);
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
