import * as vscode from 'vscode';

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

export function createUpdateStateMessage(change: vscode.TextDocumentContentChangeEvent, document: vscode.TextDocument, documentJSONProvider: any): any {
    if (change.range.start.line === 0 && change.range.start.character === 0) {
        const message = {
            command: "initialize",
            data: documentJSONProvider.getDocumentAsJson()
        };

        return message;
    }
    else if (change.text[0] === '"' || isNumber(change.text)) {
        const startOffset = document.offsetAt(change.range.start);

        // TODO cache
        const documentText = document.getText(undefined);
        const position = fromOffsetToPosition(documentText, startOffset);

        const value = change.text[0] === '"' ? change.text.substring(1, change.text.length - 1) : Number(change.text);

        const message = {
            command: "update",
            data: {
                hPosition: position,
                text: value
            }
        };

        return message;
    }
    else if (change.text[0] === '{' || change.text[0] === ',') {

        const startOffset = document.offsetAt(change.range.start);

        // TODO cache
        const documentText = document.getText(undefined);
        const position = fromOffsetToPosition(documentText, startOffset);

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
    else if (change.text.length === 0) {

        const startOffset = document.offsetAt(change.range.start);

        // TODO cache
        const documentText = document.getText(undefined);
        const position = fromOffsetToPosition(documentText, startOffset);

        const message = {
            command: "delete",
            data: {
                hPosition: position
            }
        };

        return message;
    }
    else {
        throw Error("Unrecognized change!");
    }
}