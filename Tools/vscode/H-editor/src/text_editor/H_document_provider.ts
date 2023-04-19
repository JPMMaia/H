import * as vscode from "vscode";

import * as Core from "../utilities/coreModelInterface";
import * as Grammar from "../core/Grammar";
import * as Parser from "../core/Parser";
import * as Symbol_database from "../core/Symbol_database";

export interface H_document {
    module: Core.Module;
    production_rules: Grammar.Production_rule[];
    map_word_to_terminal: (word: Grammar.Word) => string;
    parse_tree: Parser.Node;
    symbol_database: Symbol_database.Edit_module_database;
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
