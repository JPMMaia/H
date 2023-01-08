import * as vscode from 'vscode';

import * as Change from "./Change";
import { onThrowError } from './errors';

import { isNumber, fromOffsetToPosition } from './parseJSON';

function remove_possible_comma(text: string): string {
    if (text[0] === ',') {
        return text.substring(1, text.length);
    }

    if (text[text.length - 1] === ',') {
        return text.substring(0, text.length - 1);
    }

    return text;
}

interface TextDocumentContentChange {
    range: vscode.Range;
    rangeOffset: number;
    rangeLength: number;
    text: string;
}

function is_initialize_change(change: TextDocumentContentChange): boolean {
    return change.range.start.line === 0 && change.range.start.character === 0;
}

function is_delete_change(change: TextDocumentContentChange): boolean {
    return change.rangeLength !== 0 && change.text.length === 0;
}

function is_update_change(change: TextDocumentContentChange): boolean {
    return change.rangeLength !== 0 && change.text.length !== 0;
}

function is_insert_change(change: TextDocumentContentChange): boolean {
    return change.rangeLength === 0 && change.text.length !== 0;
}

function is_vector_size_update(position: any[]): boolean {
    // This is not very robust and might require some changes if we have a member named "size" that is not inside a vector
    return position.length >= 2 && position[position.length - 1] === "size";
}

function is_vector_set_element_update(position: any[]): boolean {
    return position.length >= 3 && isNumber(position[position.length - 1]) && position[position.length - 2] === "elements";
}


function get_update_value(text: string): any {
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

export function create_change_update_from_text_change(change: TextDocumentContentChange, document: vscode.TextDocument, document_JSON_provider: any): Change.Hierarchy[] {

    if (is_initialize_change(change)) {

        const initial_value = document_JSON_provider.getDocumentAsJson();

        const change_hierarchy: Change.Hierarchy = {
            changes: [
                Change.create_initialize(initial_value)
            ],
            children: []
        };

        return [change_hierarchy];
    }
    else if (is_update_change(change)) {
        const document_text = document.getText(undefined);

        const start_offset = document.offsetAt(change.range.start);

        // TODO cache
        const position = fromOffsetToPosition(document_text, start_offset);

        // Ignore vector size updates as these are handled automatically by the insert and delete changes:
        if (is_vector_size_update(position)) {
            return [];
        }

        const value = get_update_value(change.text);

        const change_update: Change.Change =
            is_vector_set_element_update(position) ?
                Change.create_set_element_of_vector(position[position.length - 3], position[position.length - 1], value) :
                Change.create_update(position[position.length - 1], value);

        if (position.length === 1) {
            const change_hierarchy: Change.Hierarchy = {
                changes: [
                    change_update
                ],
                children: []
            };

            return [change_hierarchy];
        }
        else if (position.length > 1) {
            const change_hierarchy: Change.Hierarchy = {
                changes: [],
                children: [
                    {
                        position: position.slice(0, -1),
                        hierarchy: {
                            changes: [
                                change_update
                            ],
                            children: []
                        }
                    }
                ]
            };

            return [change_hierarchy];
        }
        else {
            const message = "Position.length is 0!";
            onThrowError(message);
            throw Error(message);
        }
    }
    else if (is_insert_change(change)) {

        const document_text = document.getText(undefined);

        const start_offset = document.offsetAt(change.range.start);
        const start_offset_after_comma = document_text[start_offset] === ',' ? start_offset + 1 : start_offset;

        // TODO cache
        const position = fromOffsetToPosition(document_text, start_offset_after_comma);

        const json_value = remove_possible_comma(change.text);
        const element_to_insert = JSON.parse(json_value);

        const vector_name = position[position.length - 3];
        const insert_index = position[position.length - 1];

        if (position.length === 3) {
            const change_hierarchy: Change.Hierarchy = {
                changes: [
                    Change.create_add_element_to_vector(vector_name, insert_index, element_to_insert)
                ],
                children: []
            };

            return [change_hierarchy];
        }
        else if (position.length > 3) {
            const change_hierarchy: Change.Hierarchy = {
                changes: [],
                children: [
                    {
                        position: position.slice(0, -3),
                        hierarchy: {
                            changes: [
                                Change.create_add_element_to_vector(vector_name, insert_index, element_to_insert)
                            ],
                            children: []
                        }
                    }
                ]
            };

            return [change_hierarchy];
        }
        else {
            const message = "Position.length is less than 3!";
            onThrowError(message);
            throw Error(message);
        }
    }
    else if (is_delete_change(change)) {

        const document_text = document.getText(undefined);

        const start_offset = document.offsetAt(change.range.start);
        const start_offset_after_comma = document_text[start_offset] === ',' ? start_offset + 1 : start_offset;

        // TODO cache
        const position = fromOffsetToPosition(document_text, start_offset_after_comma);

        const vector_name = position[position.length - 3];
        const delete_index = position[position.length - 1];

        if (position.length === 3) {
            const change_hierarchy: Change.Hierarchy = {
                changes: [
                    Change.create_remove_element_of_vector(vector_name, delete_index)
                ],
                children: []
            };

            return [change_hierarchy];
        }
        else if (position.length > 3) {
            const change_hierarchy: Change.Hierarchy = {
                changes: [],
                children: [
                    {
                        position: position.slice(0, -3),
                        hierarchy: {
                            changes: [
                                Change.create_remove_element_of_vector(vector_name, delete_index)
                            ],
                            children: []
                        }
                    }
                ]
            };

            return [change_hierarchy];
        }
        else {
            const message = "Position.length is less than 3!";
            onThrowError(message);
            throw Error(message);
        }
    }
    else {
        const message = "Unrecognized change!";
        onThrowError(message);
        throw Error(message);
    }
}

export function create_change_updates_from_text_changes(content_changes: readonly vscode.TextDocumentContentChangeEvent[], document: vscode.TextDocument, document_JSON_provider: any): Change.Hierarchy[] {
    const change_updates: Change.Hierarchy[] = [];

    let offset = 0;
    for (let index = content_changes.length; index > 0; index -= 1) {
        const change = content_changes[index - 1];

        if (change.range.start.line !== 0 && change.range.end.line !== 0) {
            const message = "Document is not well formatted! Please remove all JSON spaces and new lines.";
            onThrowError(message);
            throw Error(message);
        }

        const change_with_offset = {
            range: new vscode.Range(
                new vscode.Position(0, change.range.start.character + offset),
                new vscode.Position(0, change.range.end.character + offset)
            ),
            rangeOffset: change.rangeOffset + offset,
            rangeLength: change.rangeLength,
            text: change.text
        };

        const change_update = create_change_update_from_text_change(change_with_offset, document, document_JSON_provider);
        change_updates.push(...change_update);

        offset += (change.text.length - change.rangeLength);
    }

    return change_updates;
}
