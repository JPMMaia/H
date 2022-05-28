import * as vscode from 'vscode';
import { getObjectAtPosition, findEndOfString, fromPositionToOffset } from './utilities/parseJSON';
import { RangeEx } from './utilities/RangeEx';
import { updateState } from './utilities/updateState';

function createFunction(document: vscode.TextDocument, functionIndex: number, isExportDeclaration: boolean): Thenable<boolean> {

    /*const text = document.getText(undefined);

    const functionDeclarationKey = isExportDeclaration ? "export_declarations" : "internal_declarations";
    const functionDeclarationPosition = [functionDeclarationKey, functionIndex, "name"];

    const beginOffset = fromPositionToOffset(text, functionDeclarationPosition);
    const endOffset = findEndOfString(text, beginOffset);

    const range = new RangeEx(
        document.positionAt(beginOffset),
        document.positionAt(endOffset),
        functionDeclarationPosition
    );

    const edit = new vscode.WorkspaceEdit();

    edit.replace(
        document.uri,
        range,
        newName
    );

    return vscode.workspace.applyEdit(edit);*/
}

function updateFunctionName(document: vscode.TextDocument, functionIndex: number, functionId: number, isExportDeclaration: boolean, newName: string): Thenable<boolean> {

    const text = document.getText(undefined);

    const functionDeclarationKey = isExportDeclaration ? "export_declarations" : "internal_declarations";
    const functionDeclarationPosition = [functionDeclarationKey, functionIndex, "name"];

    const beginOffset = fromPositionToOffset(text, functionDeclarationPosition);
    const endOffset = findEndOfString(text, beginOffset);

    const range = new vscode.Range(
        document.positionAt(beginOffset),
        document.positionAt(endOffset)
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

    private state: any;

    constructor(private document: vscode.TextDocument) {
        this.state = this.getDocumentAsJson();
    }

    public updateState(message: any) {

        const self = this;

        const stateReference = {
            get value() {
                return self.state;
            },
            set value(value: any) {
                self.state = value;
            }
        };

        updateState(stateReference, message);
    }

    public replaceByDefaultModule(): void {

        const filePath = this.document.uri.fsPath;
        const fileName = filePath.replace(/^.*[\\\/]/, '');
        const moduleName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

        const defaultModule = {
            language_version: {
                "major": 0,
                "minor": 1,
                "patch": 0
            },
            name: moduleName,
            export_declarations: {
                function_declarations: {
                    size: 0,
                    elements: []
                }
            },
            internal_declarations: {
                function_declarations: {
                    size: 0,
                    elements: []
                }
            },
            definitions: {
                function_definitions: {
                    size: 0,
                    elements: []
                }
            }
        };

        const newText = JSON.stringify(defaultModule, null, 2);

        const edit = new vscode.WorkspaceEdit();

        edit.replace(
            this.document.uri,
            new vscode.Range(0, 0, this.document.lineCount, 0),
            newText
        );

        vscode.workspace.applyEdit(edit);
    }

    public deleteModule(): void {
        const edit = new vscode.WorkspaceEdit();

        edit.replace(
            this.document.uri,
            new vscode.Range(0, 0, this.document.lineCount, 0),
            ""
        );

        vscode.workspace.applyEdit(edit);
    }

    public createFunction(functionIndex: number, isExportDeclaration: boolean): void {

    }

    public updateFunctionName(functionIndex: number, functionId: number, isExportDeclaration: boolean, newName: string): Thenable<boolean> {

        return updateFunctionName(this.document, functionIndex, functionId, isExportDeclaration, newName);
    }

    public getDocumentAsJson(): any | null {
        const text = this.document.getText();
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