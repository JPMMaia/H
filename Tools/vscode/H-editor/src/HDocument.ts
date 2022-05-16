import * as vscode from 'vscode';
import { findInArray, findKeyInJSONObject, FindResult, findValue } from './utilities/parseJSON';

class IsObjectWithID {
    constructor(private id: number) { }

    public predicate(text: string, bounds: FindResult): boolean {

        const idKeyBounds = findKeyInJSONObject(text, bounds.openIndex, "id");
        const valueBounds = findValue(text, idKeyBounds.closeIndex + 1);

        const value = text.substring(valueBounds.openIndex + 1, valueBounds.closeIndex - 1);

        const currentID = Number(value);
        return currentID === this.id;
    }
}

function updateFunctionName(document: vscode.TextDocument, functionId: number, isExportDeclaration: boolean, newName: string): Thenable<boolean> {

    const text = document.getText(undefined);

    const functionDeclarationKey = isExportDeclaration ? "export_declarations" : "internal_declarations";

    const functionDeclarationsKeyBounds = findKeyInJSONObject(text, 0, functionDeclarationKey);

    const isObjectWithID = new IsObjectWithID(functionId);
    const funtionDeclarationBounds = findInArray(text, functionDeclarationsKeyBounds.closeIndex, isObjectWithID);
    const functionNameKeyBounds = findKeyInJSONObject(text, funtionDeclarationBounds.openIndex, "name");
    const functionNameValueBounds = findValue(text, functionNameKeyBounds.closeIndex);

    const range = new vscode.Range(
        document.positionAt(functionNameValueBounds.openIndex + 1),
        document.positionAt(functionNameValueBounds.closeIndex - 1)
    );

    const edit = new vscode.WorkspaceEdit();

    edit.replace(
        document.uri,
        range,
        newName
    );

    return vscode.workspace.applyEdit(edit);
}

export class HDocument {

    constructor(private document: vscode.TextDocument) {

    }

    public updateFunctionName(functionId: number, isExportDeclaration: boolean, newName: string): Thenable<boolean> {

        return updateFunctionName(this.document, functionId, isExportDeclaration, newName);
    }

    private getDocumentAsJson(document: vscode.TextDocument): any | null {
        const text = document.getText();
        if (text.trim().length === 0) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Could not get document as json. Content is not valid json');
        }
    }
}