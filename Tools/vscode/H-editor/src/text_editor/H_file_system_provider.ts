import * as vscode from "vscode";

import * as Core from "../core/Core_interface";
import * as Core_intermediate_interface from "../core/Core_intermediate_representation";
import * as Document from "../core/Document";
import * as Language from "../core/Language";
import * as Module_examples from "../core/Module_examples";

import * as H_document_provider from "./H_document_provider";

export class H_file_system_provider implements vscode.FileSystemProvider {

    private onDidChangeFileEventEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    public onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.onDidChangeFileEventEmitter.event;

    private h_document_provider: H_document_provider.H_document_provider;

    constructor(h_document_provider: H_document_provider.H_document_provider) {
        this.h_document_provider = h_document_provider;
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

    private createNameFromFileUri(file_uri: vscode.Uri): string {
        const begin = file_uri.path.lastIndexOf("/") + 1;
        const end = file_uri.path.length - 3;
        const name = file_uri.path.slice(begin, end);
        return name;
    }

    private createModuleFromData(file_uri: vscode.Uri, data: Uint8Array): Core.Module {

        if (data.length === 0) {
            const module = Module_examples.create_empty();
            module.name = this.createNameFromFileUri(file_uri);
            return Core_intermediate_interface.create_core_module(module, { major: 0, minor: 0, patch: 1 });
        }

        const utf8_data = Buffer.from(data).toString("utf8");
        const json_data = JSON.parse(utf8_data);

        const module: Core.Module = json_data as Core.Module;
        return module;
    }

    public async readFile(uri: vscode.Uri): Promise<Uint8Array> {

        const file_uri = uri.with({ scheme: "file" });

        const file_data = await vscode.workspace.fs.readFile(file_uri);

        const module = this.createModuleFromData(file_uri, file_data);

        const language_description = Language.create_default_description();
        const document_state = Document.create_state_from_module(module, language_description, []);

        const document_data: H_document_provider.H_document = {
            language_description: language_description,
            state: document_state
        };
        this.h_document_provider.set_document(uri, document_data);

        const encoded_text = Buffer.from(document_state.text, "utf8");
        return await Promise.resolve(encoded_text);
    }

    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {

        const document_data = this.h_document_provider.get_document(uri);
        if (document_data === undefined) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        const file_uri = uri.with({ scheme: "file" });

        const language_version: Core.Language_version = {
            major: 0,
            minor: 0,
            patch: 1
        };
        const module = Core_intermediate_interface.create_core_module(document_data.state.module, language_version);
        const json_data = JSON.stringify(module);
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
