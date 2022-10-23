import * as vscode from 'vscode';
import { findNumber, findEndOfString, fromPositionToOffset, findEndOfCurrentObject, ParserState, getObjectAtPosition } from './utilities/parseJSON';
import { updateState } from './utilities/updateState';
import * as hCoreReflectionInfo from './utilities/h_core_reflection.json';
import { createDefaultElement, createEmptyModule } from './utilities/coreModel';
import * as coreModel from './utilities/coreModel';
import * as core from './utilities/coreModelInterface';
import * as coreHelpers from './utilities/coreModelInterfaceHelpers';
import * as Change from "./utilities/Change";
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

function insertVectorElement(document: vscode.TextDocument, text: string, position: any[], value?: any, defaultValueOptions?: coreModel.DefaultValueOptions): InsertInfo {

    const reflectionInfo = { enums: hCoreReflectionInfo.enums, structs: hCoreReflectionInfo.structs };
    const newElement = value !== undefined ? value : createDefaultElement(reflectionInfo, position, defaultValueOptions);
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

function setVectorElement(document: vscode.TextDocument, text: string, position: any[], newElement: any): ReplaceInfo {

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

function moveVectorElementUp(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, vectorPosition: any[], module: core.Module, elementIndex: number): void {

    if (elementIndex === 0) {
        return;
    }

    const elementPosition = vectorPosition.concat("elements", elementIndex);
    const elementReference = getObjectAtPosition(module, elementPosition);
    const element = JSON.parse(JSON.stringify(elementReference.value));

    const deleteInfo = deleteVectorElement(document, text, elementPosition);

    const newElementPosition = vectorPosition.concat("elements", elementIndex - 1);
    const insertInfo = insertVectorElement(document, text, newElementPosition, element);

    edit.delete(
        document.uri,
        deleteInfo.range
    );

    edit.insert(
        document.uri,
        insertInfo.position,
        insertInfo.newText
    );
}

function moveVectorElementDown(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, vectorPosition: any[], module: core.Module, elementIndex: number): void {

    const vectorReference = getObjectAtPosition(module, vectorPosition);
    if ((elementIndex + 1) === vectorReference.value.elements.length) {
        return;
    }

    moveVectorElementUp(edit, document, text, vectorPosition, module, elementIndex + 1);
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

function getStateFromPosition(state: any, position: any[]): any {
    if (position.length === 0) {
        return state;
    }

    return getStateFromPosition(state[position[0]], position.slice(1));
}

interface ElementWithID {
    id: number;
}

function findElementIndicesWithID(elements: ElementWithID[], ids: number[]): number[] {
    const indices: number[] = [];
    for (let index = 0; index < elements.length; ++index) {
        const element = elements[index];
        for (const id of ids) {
            if (element.id === id) {
                indices.push(index);
            }
        }
    }
    return indices;
}

function deleteVectorElementsWithID(
    edit: vscode.WorkspaceEdit,
    ids: number[],
    elements: ElementWithID[],
    vectorPosition: any[],
    document: vscode.TextDocument,
    text: string
): void {

    const indices = findElementIndicesWithID(elements, ids);
    indices.sort((first, second) => second - first);

    for (const index of indices) {

        const deleteInfo = deleteVectorElement(document, text, vectorPosition.concat("elements", index));
        edit.delete(
            document.uri,
            deleteInfo.range
        );
    }

    const updateSizeInfo = updateArraySize(document, text, vectorPosition, -indices.length);
    edit.replace(
        document.uri,
        updateSizeInfo.range,
        updateSizeInfo.newText
    );
}

function insertVectorElementAndUpdateArraySize(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, text: string, position: any[], value?: any, defaultValueOptions?: coreModel.DefaultValueOptions): void {

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

function updateFunctionDeclaration(edit: vscode.WorkspaceEdit, document: vscode.TextDocument, module: core.Module, functionDeclaration: core.Function_declaration): void {

    const result = coreHelpers.findFunctionDeclarationIndexWithId(module, functionDeclaration.id);
    const functionIndex = result.index;
    const isExportDeclaration = result.isExportDeclaration;

    const declarationName = isExportDeclaration ? "export_declarations" : "internal_declarations";
    const text = document.getText(undefined);

    const position = [declarationName, "function_declarations", "elements", functionIndex];
    const replaceInfo = setVectorElement(document, text, position, functionDeclaration);

    edit.replace(
        document.uri,
        replaceInfo.range,
        replaceInfo.newText
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

    private addInsertValueEdits(edit: vscode.WorkspaceEdit, text: string, position: any[], value?: any, defaultValueOptions?: coreModel.DefaultValueOptions): void {

        const insertInfo = insertVectorElement(this.document, text, position, value, defaultValueOptions);
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

    public insertVectorElement(position: any[], value: any): Thenable<boolean> {

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();
        this.addInsertValueEdits(edit, text, position, value);

        return vscode.workspace.applyEdit(edit);
    }

    public deleteVectorElement(position: any[]): Thenable<boolean> {

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();

        const deleteInfo = deleteVectorElement(this.document, text, position);
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

        this.addInsertValueEdits(edit, text, [declarationName, arrayName, "elements", declarationsLength], undefined, defaultValueOptions);

        const updateNextUniqueIdInfo = updateValue(this.document, ["next_unique_id"], declarationID + 1);
        edit.replace(
            this.document.uri,
            updateNextUniqueIdInfo.range,
            updateNextUniqueIdInfo.newText
        );

        return vscode.workspace.applyEdit(edit);
    }

    public deleteDeclarations(ids: number[]): Thenable<boolean> {

        const text = this.document.getText(undefined);

        const edit = new vscode.WorkspaceEdit();

        const internalExportValues = [
            "export_declarations",
            "internal_declarations"
        ];

        const declarationTypeValues = [
            "alias_type_declarations",
            "enum_declarations",
            "struct_declarations",
            "function_declarations"
        ];

        for (const internalExportValue of internalExportValues) {
            for (const declarationTypeValue of declarationTypeValues) {
                deleteVectorElementsWithID(
                    edit,
                    ids,
                    getStateFromPosition(this.state, [internalExportValue, declarationTypeValue, "elements"]),
                    [internalExportValue, declarationTypeValue],
                    this.document,
                    text
                );
            }
        }

        deleteVectorElementsWithID(
            edit,
            ids,
            this.state.definitions.function_definitions.elements,
            ["definitions", "function_definitions"],
            this.document,
            text
        );

        return vscode.workspace.applyEdit(edit);
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

            this.addInsertValueEdits(edit, text, [declarationName, "function_declarations", "elements", declarationsLength], undefined, defaultValueOptions);
        }

        {
            const definitionsLength = this.state.definitions.function_definitions.elements.length;

            const defaultValueOptions = {
                id: declarationID
            };

            this.addInsertValueEdits(edit, text, ["definitions", "function_definitions", "elements", definitionsLength], undefined, defaultValueOptions);
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

    public update(newChanges: Change.Hierarchy): Thenable<boolean> {

        const edit = new vscode.WorkspaceEdit();

        updateWithNewChanges(edit, this.document, this.state, newChanges, []);

        return vscode.workspace.applyEdit(edit);
    }

    public updateAliasTypeDeclaration(aliasTypeDeclaration: core.Alias_type_declaration): Thenable<boolean> {

        const edit = new vscode.WorkspaceEdit();

        updateAliasTypeDeclaration(edit, this.document, this.state, aliasTypeDeclaration);

        return vscode.workspace.applyEdit(edit);
    }

    public updateFunctionDeclaration(functionDeclaration: core.Function_declaration): Thenable<boolean> {

        const edit = new vscode.WorkspaceEdit();

        updateFunctionDeclaration(edit, this.document, this.state, functionDeclaration);

        return vscode.workspace.applyEdit(edit);
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