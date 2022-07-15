import * as vscode from 'vscode';
import { findNumber, findEndOfString, fromPositionToOffset } from './utilities/parseJSON';
import { updateState } from './utilities/updateState';
import { createUpdateStateMessage } from './utilities/updateStateMessage';

function createFunction(document: vscode.TextDocument, state: any, functionIndex: number, isExportDeclaration: boolean): Thenable<boolean> {

    /*const text = document.getText(undefined);

    const functionDeclarationKey = isExportDeclaration ? "export_declarations" : "internal_declarations";

    const functionCount = getObjectAtPosition(state, [functionDeclarationKey, "size"]);

    if (functionIndex >= functionCount.value) {
        functionIndex = -1;
    }

    const functionDeclarationPosition = [functionDeclarationKey, "elements", functionIndex];

    const beginOffset = fromPositionToOffset(text, functionDeclarationPosition);
    const endOffset = beginOffset;

    const range = new vscode.Range(
        document.positionAt(beginOffset),
        document.positionAt(endOffset)
    );*/

    const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(0)
    );

    const edit = new vscode.WorkspaceEdit();

    edit.replace(
        document.uri,
        range,
        ""
    );

    return vscode.workspace.applyEdit(edit);
}

function updateValue(document: vscode.TextDocument, position: any[], newValue: string | number): Thenable<boolean> {

    const text = document.getText(undefined);

    // TODO cache

    const parserState = {
        stack: [],
        expectKey: false
    };

    const result = fromPositionToOffset(parserState, text, 0, [], position);
    const isStringValue = text[result.offset] === '"';

    const beginOffset = result.offset;
    const endOffset = isStringValue ? findEndOfString(text, beginOffset + 1) + 1 : findNumber(text, beginOffset).closeIndex;
    const newWrappedValue = isStringValue ? '"' + newValue + '"' : String(newValue);

    const range = new vscode.Range(
        document.positionAt(beginOffset),
        document.positionAt(endOffset)
    );

    const edit = new vscode.WorkspaceEdit();

    edit.replace(
        document.uri,
        range,
        newWrappedValue
    );

    return vscode.workspace.applyEdit(edit);
}

export class HDocument {

    private state: any;
    private changeDocumentSubscription: vscode.Disposable;

    constructor(private document: vscode.TextDocument) {
        this.state = this.getDocumentAsJson();

        this.changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {

                for (const change of e.contentChanges) {
                    const message = createUpdateStateMessage(change, e.document, this);
                    this.updateState(message);
                }
            }
        });
    }

    public dispose(): void {
        this.changeDocumentSubscription.dispose();
    }

    public updateState(message: any): void {

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

        const newText = JSON.stringify(defaultModule);

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

    public updateValue(position: any[], newValue: string | number): Thenable<boolean> {

        return updateValue(this.document, position, newValue);
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