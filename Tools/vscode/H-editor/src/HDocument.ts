import * as vscode from 'vscode';
import { findNumber, findEndOfString, fromPositionToOffset, findEndOfCurrentObject, ParserState } from './utilities/parseJSON';
import { updateState } from './utilities/updateState';
import { createUpdateStateMessage } from './utilities/updateStateMessage';
import * as hCoreReflectionInfo from './utilities/h_core_reflection.json';
import { createDefaultElement, createEmptyModule } from './utilities/coreModel';
import * as coreModel from './utilities/coreModel';
import * as core from './utilities/coreModelInterface';
import { onThrowError } from './utilities/errors';

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

function generateId(exportCollection: any[], internalCollection: any[]): number {

    const exportIds: number[] = exportCollection.map(value => value.id);
    const internalIds: number[] = internalCollection.map(value => value.id);

    return 0; // TODO
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

function updateVariant(reflectionInfo: coreModel.ReflectionInfo, document: vscode.TextDocument, position: any[], newVariantTypeValue: any): ReplaceInfo {

    const variantValueTypeName = newVariantTypeValue.charAt(0).toUpperCase() + newVariantTypeValue.slice(1);
    const variantValueType = {
        name: variantValueTypeName
    };
    const newValue = coreModel.createDefaultValue(reflectionInfo, variantValueType);
    const newElement = {
        type: variantValueTypeName,
        value: newValue
    };

    const text = document.getText(undefined);

    // TODO cache

    const parserState = {
        stack: [],
        expectKey: false
    };

    const beginOffsetResult = fromPositionToOffset(parserState, text, 0, [], position.slice(0, position.length - 1));
    const endOffsetResult = findEndOfCurrentObject(parserState, text, beginOffsetResult.offset);

    const range = new vscode.Range(
        document.positionAt(beginOffsetResult.offset),
        document.positionAt(endOffsetResult.offset)
    );

    return {
        range: range,
        newText: JSON.stringify(newElement)
    };
}

function getDeclarationsArrayLength(declarations: any, name: string) {
    return declarations[name].elements.length;
}

export class HDocument {

    private state: core.Module;
    private reflectionInfo: coreModel.ReflectionInfo;
    private changeDocumentSubscription: vscode.Disposable;

    constructor(private document: vscode.TextDocument) {
        this.state = this.getDocumentAsJson();
        this.reflectionInfo = coreModel.createReflectionInfo();

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

    public getState(): core.Module {
        return this.state;
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

        const reflectionInfo = { enums: hCoreReflectionInfo.enums, structs: hCoreReflectionInfo.structs };

        const defaultModule = createEmptyModule(reflectionInfo);
        defaultModule.name = moduleName;
        defaultModule.language_version.major = 0;
        defaultModule.language_version.minor = 1;
        defaultModule.language_version.patch = 0;

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

    private addInsertValueEdits(edit: vscode.WorkspaceEdit, text: string, position: any[]): void {
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
    }

    public insertValue(position: any[]): Thenable<boolean> {

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();
        this.addInsertValueEdits(edit, text, position);

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

    public updateVariant(position: any[], newVariantType: any): Thenable<boolean> {

        const replaceInfo = updateVariant(this.reflectionInfo, this.document, position, newVariantType);

        const edit = new vscode.WorkspaceEdit();

        edit.replace(
            this.document.uri,
            replaceInfo.range,
            replaceInfo.newText
        );

        return vscode.workspace.applyEdit(edit);
    }

    public addDeclaration(arrayName: string, isExport: boolean): Thenable<boolean> {
        const declarationName = isExport ? "export_declarations" : "internal_declarations";
        const declarationsLength = getDeclarationsArrayLength(this.state[declarationName], arrayName);
        return this.insertValue(["internal_declarations", arrayName, "elements", declarationsLength]);
    }

    public deleteDeclarations(ids: number[]): void {

    }

    public addFunctionDeclarationAndDefinition(id: number, isExport: boolean): void {

        const declarationName = isExport ? "export_declarations" : "internal_declarations";
        const declarations = this.state[declarationName]["function_declarations"];

        const position = ["internal_declarations", "function_declarations", "elements", declarations.elements.length];

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();
        this.addInsertValueEdits(edit, text, position);

        // TODO
    }

    public deleteFunctionDefinitionAndDeclaration(id: number): void {
        // TODO
    }

    public updateDeclarationName(id: number, newName: string): void {

    }

    public getDocumentAsJson(): any | null {
        const text = this.document.getText();
        if (text.trim().length === 0) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            const message = "Could not get document as json. Content is not valid json";
            onThrowError(message);
            throw Error(message);
        }
    }
}