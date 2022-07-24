import * as vscode from 'vscode';
import { findNumber, findEndOfString, fromPositionToOffset, findEndOfCurrentObject, ParserState } from './utilities/parseJSON';
import { updateState } from './utilities/updateState';
import { createUpdateStateMessage } from './utilities/updateStateMessage';
import * as hCoreReflectionInfo from './utilities/h_core_reflection.json';
import { createDefaultElement } from './utilities/coreModel';

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

function addPossibleComma(text: string, insertOffset: number, textToInsert: string): string {

    if (text[insertOffset - 1] === '[' && text[insertOffset] === ']') {
        return textToInsert;
    }
    else if (text[insertOffset] === ']') {
        return ',' + textToInsert;
    }
    else {
        return textToInsert + ',';
    }
}

interface InsertInfo {
    position: vscode.Position,
    newText: string
}

interface DeleteInfo {
    range: vscode.Range
}

interface ReplaceInfo {
    range: vscode.Range,
    newText: string
}

function updateArraySize(document: vscode.TextDocument, text: string, position: any[], delta: number): ReplaceInfo {

    // TODO cache

    const parserState = {
        stack: [],
        expectKey: false
    };

    const sizePosition = position.concat(["size"]);
    const offsetResult = fromPositionToOffset(parserState, text, 0, [], sizePosition);

    const numberResult = findNumber(text, offsetResult.offset);
    const arraySize = Number(text.substring(numberResult.openIndex, numberResult.closeIndex));

    const newArraySize = arraySize + delta;

    return updateValueWithOffset(document, text, offsetResult.offset, newArraySize);
}

function insertValue(document: vscode.TextDocument, text: string, position: any[]): InsertInfo {

    const reflectionInfo = { enums: hCoreReflectionInfo.enums, structs: hCoreReflectionInfo.structs };
    const newElement = createDefaultElement(reflectionInfo, position);
    const newElementText = JSON.stringify(newElement);

    // TODO cache

    const parserState = {
        stack: [],
        expectKey: false
    };

    const offsetResult = fromPositionToOffset(parserState, text, 0, [], position);

    const textToInsert = addPossibleComma(text, offsetResult.offset, newElementText);

    const insertPosition = document.positionAt(offsetResult.offset);

    return {
        position: insertPosition,
        newText: textToInsert
    };
}

function deleteValue(document: vscode.TextDocument, text: string, position: any[]): DeleteInfo {

    // TODO cache

    let parserState: ParserState = {
        stack: [],
        expectKey: false
    };

    const startOffsetResult = fromPositionToOffset(parserState, text, 0, [], position);
    parserState = startOffsetResult.newState;
    parserState.stack.splice(parserState.stack.length - 1, 1);

    const endOffsetResult = findEndOfCurrentObject(parserState, text, startOffsetResult.offset);

    const startOffset = startOffsetResult.offset;
    const endOffset = text[endOffsetResult.offset] === ',' ? endOffsetResult.offset + 1 : endOffsetResult.offset;

    const range = new vscode.Range(
        document.positionAt(startOffset),
        document.positionAt(endOffset)
    );

    return {
        range: range
    };
}

function updateValueWithOffset(document: vscode.TextDocument, text: string, offset: number, newValue: string | number): ReplaceInfo {

    const isStringValue = text[offset] === '"';

    const beginOffset = offset;
    const endOffset = isStringValue ? findEndOfString(text, beginOffset + 1) + 1 : findNumber(text, beginOffset).closeIndex;
    const newWrappedValue = isStringValue ? '"' + newValue + '"' : String(newValue);

    const range = new vscode.Range(
        document.positionAt(beginOffset),
        document.positionAt(endOffset)
    );

    return {
        range: range,
        newText: newWrappedValue
    };
}

function updateValue(document: vscode.TextDocument, position: any[], newValue: string | number): ReplaceInfo {

    const text = document.getText(undefined);

    // TODO cache

    const parserState = {
        stack: [],
        expectKey: false
    };

    const result = fromPositionToOffset(parserState, text, 0, [], position);

    return updateValueWithOffset(document, text, result.offset, newValue);
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

    public insertValue(position: any[]): Thenable<boolean> {

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();

        const insertInfo = insertValue(this.document, text, position);
        edit.insert(
            this.document.uri,
            insertInfo.position,
            insertInfo.newText
        );

        const updateSizeInfo = updateArraySize(this.document, text, position.slice(0, position.length - 2), 1);
        edit.replace(
            this.document.uri,
            updateSizeInfo.range,
            updateSizeInfo.newText
        );

        return vscode.workspace.applyEdit(edit);
    }

    public deleteValue(position: any[]): Thenable<boolean> {

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();

        const deleteInfo = deleteValue(this.document, text, position);
        edit.delete(
            this.document.uri,
            deleteInfo.range
        );

        const updateSizeInfo = updateArraySize(this.document, text, position.slice(0, position.length - 2), -1);
        edit.replace(
            this.document.uri,
            updateSizeInfo.range,
            updateSizeInfo.newText
        );

        return vscode.workspace.applyEdit(edit);
    }

    public updateValue(position: any[], newValue: string | number): Thenable<boolean> {

        const replaceInfo = updateValue(this.document, position, newValue);

        const edit = new vscode.WorkspaceEdit();

        edit.replace(
            this.document.uri,
            replaceInfo.range,
            replaceInfo.newText
        );

        return vscode.workspace.applyEdit(edit);
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