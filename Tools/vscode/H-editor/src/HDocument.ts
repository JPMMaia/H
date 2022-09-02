import * as vscode from 'vscode';
import { findNumber, findEndOfString, fromPositionToOffset, findEndOfCurrentObject, ParserState } from './utilities/parseJSON';
import { updateState } from './utilities/updateState';
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

function insertValue(document: vscode.TextDocument, text: string, position: any[], defaultValueOptions?: coreModel.DefaultValueOptions): InsertInfo {

    const reflectionInfo = { enums: hCoreReflectionInfo.enums, structs: hCoreReflectionInfo.structs };
    const newElement = createDefaultElement(reflectionInfo, position, defaultValueOptions);
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

// findElementWithIdIndexOnArrays([{name: "export_declarations", array: this.state.export_declarations[arrayName].elements}, {name: "internal_declarations", array: this.state.internal_declarations[arrayName].elements}])

interface NamedArray {
    name: string;
    array: any[];
}

function createDeclarationsNamedArrays(state: core.Module, arrayName: string): NamedArray[] {
    if (arrayName === "alias_type_declarations" || arrayName === "enum_declarations" || arrayName === "struct_declarations" || arrayName === "function_declarations") {
        return [
            { name: "export_declarations", array: state.export_declarations[arrayName].elements },
            { name: "internal_declarations", array: state.internal_declarations[arrayName].elements }
        ];
    }
    else {
        const message = "Invalid '" + arrayName + "' declarations array";
        onThrowError(message);
        throw Error(message);
    }
}

function findElementWithIdIndexOnArrays(namedArrays: NamedArray[], id: number): { name: string, index: number } | undefined {

    for (const namedArray of namedArrays) {

        const index = namedArray.array.findIndex((value: any) => value.id === id);

        if (index !== -1) {
            return { name: namedArray.name, index: index };
        }
    }

    return undefined;
}

export class HDocument {

    private state: core.Module;
    private reflectionInfo: coreModel.ReflectionInfo;

    constructor(private document: vscode.TextDocument) {
        this.state = this.getDocumentAsJson();
        this.reflectionInfo = coreModel.createReflectionInfo();
    }

    public getDocumentUri(): vscode.Uri {
        return this.document.uri;
    }

    public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent, messages: any): void {
        for (const message of messages) {
            this.updateState(message);
        }
        this.document = e.document;
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

    private addInsertValueEdits(edit: vscode.WorkspaceEdit, text: string, position: any[], defaultValueOptions?: coreModel.DefaultValueOptions): void {

        const insertInfo = insertValue(this.document, text, position, defaultValueOptions);
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

    public addDeclaration(arrayName: string, name: string, isExport: boolean): Thenable<boolean> {

        if (arrayName === "function_declarations") {
            const message = "Do not use addDeclaration to add function declarations. Use addFunctionDeclarationAndDefinition() instead";
            onThrowError(message);
            throw Error(message);
        }

        const declarationName = isExport ? "export_declarations" : "internal_declarations";
        const declarationsLength = getDeclarationsArrayLength(this.state[declarationName], arrayName);
        const declarationID = this.state.next_unique_id;

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();

        const defaultValueOptions = {
            id: declarationID,
            name: name
        };

        this.addInsertValueEdits(edit, text, [declarationName, arrayName, "elements", declarationsLength], defaultValueOptions);

        const updateNextUniqueIdInfo = updateValue(this.document, ["next_unique_id"], declarationID + 1);
        edit.replace(
            this.document.uri,
            updateNextUniqueIdInfo.range,
            updateNextUniqueIdInfo.newText
        );

        return vscode.workspace.applyEdit(edit);
    }

    public deleteDeclarations(ids: number[]): void {

    }

    public addFunctionDeclarationAndDefinition(name: string, isExport: boolean): Thenable<boolean> {

        const declarationID = this.state.next_unique_id;

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();

        {
            const declarationName = isExport ? "export_declarations" : "internal_declarations";
            const declarationsLength = getDeclarationsArrayLength(this.state[declarationName], "function_declarations");

            const defaultValueOptions = {
                id: declarationID,
                name: name
            };

            this.addInsertValueEdits(edit, text, [declarationName, "function_declarations", "elements", declarationsLength], defaultValueOptions);
        }

        {
            const definitionsLength = this.state.definitions.function_definitions.elements.length;

            const defaultValueOptions = {
                id: declarationID
            };

            this.addInsertValueEdits(edit, text, ["definitions", "function_definitions", "elements", definitionsLength], defaultValueOptions);
        }

        {
            const updateNextUniqueIdInfo = updateValue(this.document, ["next_unique_id"], declarationID + 1);

            edit.replace(
                this.document.uri,
                updateNextUniqueIdInfo.range,
                updateNextUniqueIdInfo.newText
            );
        }

        return vscode.workspace.applyEdit(edit);
    }

    public deleteFunctionDefinitionAndDeclaration(id: number): void {
        // TODO
    }

    public updateDeclarationName(arrayName: string, id: number, newName: string): Thenable<boolean> {

        const result = findElementWithIdIndexOnArrays(
            createDeclarationsNamedArrays(this.state, arrayName),
            id
        );

        if (result === undefined) {
            return Promise.reject();
        }

        return this.updateValue([result.name, arrayName, "elements", result.index, "name"], newName);
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