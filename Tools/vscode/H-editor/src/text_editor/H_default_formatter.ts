import * as Abstract_syntax_tree_to_text from "../core/Abstract_syntax_tree_to_text";
import { H_document_provider } from "./H_document_provider";
import * as vscode from "vscode";

export class H_default_formatter implements vscode.DocumentFormattingEditProvider {

    private h_document_provider: H_document_provider;

    constructor(H_document_provider: H_document_provider) {
        this.h_document_provider = H_document_provider;
    }

    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {

        const document_data = this.h_document_provider.get_document(document.uri);
        if (document_data === undefined) {
            return [];
        }

        const abstract_syntax_tree = document_data.abstract_syntax_tree;
        const new_text = Abstract_syntax_tree_to_text.to_string(abstract_syntax_tree);

        const whole_document_range = new vscode.Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end);

        const edit = new vscode.TextEdit(whole_document_range, new_text);
        return [edit];
    }
}
