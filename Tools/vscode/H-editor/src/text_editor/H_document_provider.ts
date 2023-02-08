import * as Abstract_syntax_tree from "../core/Abstract_syntax_tree_helpers";
import * as Core from "../utilities/coreModelInterface";
import * as vscode from "vscode";

export interface H_document {
    module: Core.Module;
    abstract_syntax_tree: Abstract_syntax_tree.Node;
}

export class H_document_provider {

    private documents = new Map<string, H_document>();

    public add_document(uri: vscode.Uri, document: H_document): void {
        this.set_document(uri, document);
    }

    public remove_document(uri: vscode.Uri): void {
        const key = uri.toString();
        this.documents.delete(key);
    }

    public get_document(uri: vscode.Uri): H_document | undefined {
        const key = uri.toString();
        return this.documents.get(key);
    }

    public set_document(uri: vscode.Uri, document: H_document): void {
        const key = uri.toString();
        this.documents.set(key, document);
    }
}
