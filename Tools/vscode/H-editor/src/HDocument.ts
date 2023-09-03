import * as vscode from 'vscode';
import { findNumber, findEndOfString, fromPositionToOffset, findEndOfCurrentObject, ParserState, getObjectAtPosition } from './utilities/parseJSON';
import * as hCoreReflectionInfo from './utilities/h_core_reflection.json';
import { create_default_element, create_empty_module } from './core/Core_reflection';
import * as coreModel from './core/Core_reflection';
import * as core from './core/Core_interface';
import * as Change from "./utilities/Change";
import * as Change_update from "./utilities/Change_update";
import { onThrowError } from './utilities/errors';

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

function insertVectorElement(document: vscode.TextDocument, text: string, position: any[], value?: any, defaultValueOptions?: coreModel.Default_value_options): InsertInfo {

    const reflectionInfo = { enums: hCoreReflectionInfo.enums, structs: hCoreReflectionInfo.structs };
    const newElement = value !== undefined ? value : create_default_element(reflectionInfo, position, defaultValueOptions);
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

function deleteVectorElement(document: vscode.TextDocument, text: string, position: any[]): DeleteInfo {

    // TODO cache

    let parserState: ParserState = {
        stack: [],
        expectKey: false
    };

    const startOffsetResult = fromPositionToOffset(parserState, text, 0, [], position);
    const endOffsetResult = findEndOfCurrentObject(startOffsetResult.newState, text, startOffsetResult.offset);

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

function insertVectorElementAndUpdateArraySize(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, position: any[], value?: any, defaultValueOptions?: coreModel.Default_value_options): void {

    const insertInfo = insertVectorElement(document, text, position, value, defaultValueOptions);
    edit.insert(
        document.uri,
        insertInfo.position,
        insertInfo.newText
    );

    const updateSizeInfo = updateArraySize(document, text, position.slice(0, position.length - 2), 1);
    edit.replace(
        document.uri,
        updateSizeInfo.range,
        updateSizeInfo.newText
    );
}

function deleteVectorElementsAndUpdateArraySize(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, vectorPosition: any[], indices: number[]): void {

    indices.sort((first, second) => second - first);

    for (const index of indices) {

        const position = vectorPosition.concat("elements", index);

        const deleteInfo = deleteVectorElement(document, text, position);
        edit.delete(
            document.uri,
            deleteInfo.range
        );
    }

    const updateSizeInfo = updateArraySize(document, text, vectorPosition, -1 * indices.length);
    edit.replace(
        document.uri,
        updateSizeInfo.range,
        updateSizeInfo.newText
    );
}

function updateObject(document: vscode.TextDocument, text: string, position: any[], newElement: any): ReplaceInfo {

    // TODO cache

    let parserState: ParserState = {
        stack: [],
        expectKey: false
    };

    const startOffsetResult = fromPositionToOffset(parserState, text, 0, [], position);
    const endOffsetResult = findEndOfCurrentObject(startOffsetResult.newState, text, startOffsetResult.offset);

    const startOffset = startOffsetResult.offset;
    const endOffset = endOffsetResult.offset;

    const range = new vscode.Range(
        document.positionAt(startOffset),
        document.positionAt(endOffset)
    );

    return {
        range: range,
        newText: JSON.stringify(newElement)
    };
}


function doAddElementOfVectorChange(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, change: Change.Add_element_to_vector, position: any[]): void {

    const elementPosition = position.concat(change.vector_name, "elements", change.index);
    insertVectorElementAndUpdateArraySize(edit, document, text, elementPosition, change.value);
}

function doRemoveElementOfVectorChange(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, change: Change.Remove_element_of_vector, position: any[]): void {

    const vectorPosition = position.concat(change.vector_name);
    deleteVectorElementsAndUpdateArraySize(edit, document, text, vectorPosition, [change.index]);
}

function doSetElementOfVectorChange(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, change: Change.Set_element_of_vector, position: any[]): void {

    const elementPosition = position.concat(change.vector_name, "elements", change.index);

    const replaceInfo = updateObject(document, text, elementPosition, change.value);

    edit.replace(
        document.uri,
        replaceInfo.range,
        replaceInfo.newText
    );
}

function doMoveElementOfVectorChange(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, module: core.Module, change: Change.Move_element_of_vector, position: any[]): void {

    if (change.from_index === change.to_index) {
        return;
    }

    const currentElementPosition = position.concat(change.vector_name, "elements", change.from_index);
    const elementReference = getObjectAtPosition(module, currentElementPosition);
    const element = JSON.parse(JSON.stringify(elementReference.value));

    const targetElementPosition = position.concat(change.vector_name, "elements", change.to_index + 1);

    const insertInfo = insertVectorElement(document, text, targetElementPosition, element);

    edit.insert(
        document.uri,
        insertInfo.position,
        insertInfo.newText
    );

    const deleteInfo = deleteVectorElement(document, text, currentElementPosition);

    edit.delete(
        document.uri,
        deleteInfo.range
    );
}

function doAddNumberChange(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, module: core.Module, change: Change.Add_number, position: any[]): void {

    const valuePosition = position.concat(change.key);
    const elementReference = getObjectAtPosition(module, valuePosition);
    const element: number = JSON.parse(JSON.stringify(elementReference.value));

    const replaceInfo = updateObject(document, text, valuePosition, element + change.value);

    edit.replace(document.uri, replaceInfo.range, replaceInfo.newText);
}

function doUpdateChange(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, change: Change.Update, position: any[]): void {

    const targetPosition = position.concat(change.key);

    const replaceInfo = updateObject(document, text, targetPosition, change.value);

    edit.replace(
        document.uri,
        replaceInfo.range,
        replaceInfo.newText
    );
}

function updateWithNewChanges(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, module: core.Module, newChanges: Change.Hierarchy, position: any[]): void {

    const text = document.getText(undefined);

    for (const change of newChanges.changes) {
        switch (change.type) {
            case Change.Type.Add_element_to_vector:
                doAddElementOfVectorChange(edit, document, text, change.value as Change.Add_element_to_vector, position);
                break;
            case Change.Type.Remove_element_of_vector:
                doRemoveElementOfVectorChange(edit, document, text, change.value as Change.Remove_element_of_vector, position);
                break;
            case Change.Type.Set_element_of_vector:
                doSetElementOfVectorChange(edit, document, text, change.value as Change.Set_element_of_vector, position);
                break;
            case Change.Type.Move_element_of_vector:
                doMoveElementOfVectorChange(edit, document, text, module, change.value as Change.Move_element_of_vector, position);
                break;
            case Change.Type.Add_number:
                doAddNumberChange(edit, document, text, module, change.value as Change.Add_number, position);
                break;
            case Change.Type.Update:
                doUpdateChange(edit, document, text, change.value as Change.Update, position);
                break;
        }
    }

    for (const pair of newChanges.children) {
        const childrenPosition = position.concat(...pair.position);
        const childrenChanges = pair.hierarchy;
        updateWithNewChanges(edit, document, module, childrenChanges, childrenPosition);
    }
}

export class HDocument {

    private state: core.Module;
    private reflectionInfo: coreModel.Reflection_info;

    constructor(private document: vscode.TextDocument) {
        this.state = this.getDocumentAsJson();
        this.reflectionInfo = coreModel.create_reflection_info();
    }

    public getDocumentUri(): vscode.Uri {
        return this.document.uri;
    }

    public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent, changes: Change.Hierarchy[]): void {

        this.updateState(changes);
        this.document = e.document;
    }

    public getState(): core.Module {
        return this.state;
    }

    public updateState(changes: Change.Hierarchy[]): void {

        const self = this;

        const module_pointer = {
            get value() {
                return self.state;
            },
            set value(value: any) {
                self.state = value;
            }
        };

        for (const change of changes) {
            Change_update.update_object_with_change(module_pointer, change, []);
        }
    }

    public replaceByDefaultModule(): void {

        const filePath = this.document.uri.fsPath;
        const fileName = filePath.replace(/^.*[\\\/]/, '');
        const moduleName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

        const defaultModule = create_empty_module(this.reflectionInfo);
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

    public update(newChanges: Change.Hierarchy): Thenable<boolean> {

        const edit = new vscode.WorkspaceEdit();

        updateWithNewChanges(edit, this.document, this.state, newChanges, []);

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
            const message = "Could not get document as json. Content is not valid json";
            onThrowError(message);
            throw Error(message);
        }
    }
}