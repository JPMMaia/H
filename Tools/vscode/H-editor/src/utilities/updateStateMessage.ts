import * as vscode from 'vscode';
import { onThrowError } from './errors';

import { isNumber, fromOffsetToPosition } from './parseJSON';

function removePossibleComma(text: string): string {
    if (text[0] === ',') {
        return text.substring(1, text.length);
    }

    if (text[text.length - 1] === ',') {
        return text.substring(0, text.length - 1);
    }

    return text;
}

function isInitializeChange(change: vscode.TextDocumentContentChangeEvent): boolean {
    return change.range.start.line === 0 && change.range.start.character === 0;
}

function isDeleteChange(change: vscode.TextDocumentContentChangeEvent): boolean {
    return change.rangeLength !== 0 && change.text.length === 0;
}

function isUpdateChange(change: vscode.TextDocumentContentChangeEvent): boolean {
    return change.rangeLength !== 0 && change.text.length !== 0;
}

function isInsertChange(change: vscode.TextDocumentContentChangeEvent): boolean {
    return change.rangeLength === 0 && change.text.length !== 0;
}

function getUpdateValue(text: string): any {
    if (text.charAt(0) === '"') {
        return text.substring(1, text.length - 1);
    }
    else if (text.charAt(0) === '{') {
        return JSON.parse(text);
    }
    else if (isNumber(text.charAt(0))) {
        return Number(text);
    }
    else {
        const message = "Unrecognized update value type!";
        onThrowError(message);
        throw Error(message);
    }
}

export function createUpdateStateMessage(change: vscode.TextDocumentContentChangeEvent, document: vscode.TextDocument, documentJSONProvider: any): any {

    if (isInitializeChange(change)) {
        const message = {
            command: "initialize",
            data: documentJSONProvider.getDocumentAsJson()
        };

        return message;
    }
    else if (isUpdateChange(change)) {
        const documentText = document.getText(undefined);

        const startOffset = document.offsetAt(change.range.start);

        // TODO cache
        const position = fromOffsetToPosition(documentText, startOffset);

        const value = getUpdateValue(change.text);

        const message = {
            command: "update",
            data: {
                hPosition: position,
                value: value
            }
        };

        return message;
    }
    else if (isInsertChange(change)) {

        const documentText = document.getText(undefined);

        const startOffset = document.offsetAt(change.range.start);
        const startOffsetAfterComma = documentText[startOffset] === ',' ? startOffset + 1 : startOffset;

        // TODO cache
        const position = fromOffsetToPosition(documentText, startOffsetAfterComma);

        const jsonValue = removePossibleComma(change.text);
        const value = JSON.parse(jsonValue);

        const message = {
            command: "insert",
            data: {
                hPosition: position,
                value: value
            }
        };

        return message;
    }
    else if (isDeleteChange(change)) {

        const documentText = document.getText(undefined);

        const startOffset = document.offsetAt(change.range.start);
        const startOffsetAfterComma = documentText[startOffset] === ',' ? startOffset + 1 : startOffset;

        // TODO cache
        const position = fromOffsetToPosition(documentText, startOffsetAfterComma);

        const message = {
            command: "delete",
            data: {
                hPosition: position
            }
        };

        return message;
    }
    else {
        const message = "Unrecognized change!";
        onThrowError(message);
        throw Error(message);
    }
}
    }
}