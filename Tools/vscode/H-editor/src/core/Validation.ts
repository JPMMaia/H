import * as Grammar from "./Grammar";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import { onThrowError } from "../utilities/errors";

export interface Position {
    line: number;
    column: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Location {
    uri: string;
    range: Range;
}

export enum Diagnostic_severity {
    Error = 1,
    Warning = 2,
    Information = 3,
    Hint = 4,
}

function severity_to_string(severity: Diagnostic_severity): string {
    switch (severity) {
        case Diagnostic_severity.Error:
            return "Error";
        case Diagnostic_severity.Warning:
            return "Warning";
        case Diagnostic_severity.Information:
            return "Information";
        case Diagnostic_severity.Hint:
            return "Hint";
    }
}

export enum Source {
    Parser = "Parser",
    Parse_tree_validation = "Parse Tree Validation"
}

export interface Related_information {
    location: Location;
    message: string;
}

export interface Diagnostic {
    location: Location;
    source: Source;
    severity: Diagnostic_severity;
    message: string;
    related_information: Related_information[];
}

export function to_string(diagnostics: Diagnostic[]): string[] {
    const array: string[] = [];

    for (const diagnostic of diagnostics) {
        const location = `${diagnostic.location.uri}#L${diagnostic.location.range.start.line}:${diagnostic.location.range.start.column}`;
        const severity = severity_to_string(diagnostic.severity);
        const message = `${severity}: ${diagnostic.message} (${location})`;
        array.push(message);
    }

    return array;
}

export function validate_parser_node(
    uri: string,
    new_node_position: number[],
    new_node: Parser_node.Node
): Diagnostic[] {

    const node_queue = [new_node];
    const node_position_queue = [new_node_position];

    while (node_queue.length > 0) {
        const current_node = node_queue.shift() as Parser_node.Node;
        const current_node_position = node_position_queue.shift() as number[];

        const diagnostics = validate_current_parser_node(uri, current_node);
        if (diagnostics.length > 0) {
            return diagnostics;
        }

        for (let child_index = 0; child_index < current_node.children.length; ++child_index) {
            node_queue.push(current_node.children[child_index]);
            node_position_queue.push(current_node_position);
        }
    }

    return [];
}

function validate_current_parser_node(
    uri: string,
    new_node: Parser_node.Node
): Diagnostic[] {

    switch (new_node.word.value) {
        case "Expression_constant": {
            const terminal_node = new_node.children[0];
            const word = terminal_node.word;
            switch (word.type) {
                case Grammar.Word_type.Number: {
                    const suffix = Scanner.get_suffix(word);
                    const first_character = suffix.charAt(0);

                    const is_float = first_character === "f";
                    if (is_float) {
                        const number_of_bits = Number(suffix.substring(1, suffix.length));
                        if (number_of_bits !== 16 && number_of_bits !== 32 && number_of_bits !== 64) {
                            return [
                                {
                                    location: get_parser_node_source_location(uri, terminal_node),
                                    source: Source.Parse_tree_validation,
                                    severity: Diagnostic_severity.Error,
                                    message: `Did not expect '${suffix}' suffix. Did you mean 'f16', 'f32' or 'f64'?`,
                                    related_information: [],
                                }
                            ];
                        }
                    }
                }
            }
        }
    }

    return [];
}

function get_parser_node_source_location(
    uri: string,
    node: Parser_node.Node
): Location {
    const source_location = node.word.source_location;

    return {
        uri: uri,
        range: {
            start: {
                line: source_location.line,
                column: source_location.column,
            },
            end: {
                line: source_location.line,
                column: source_location.column + node.word.value.length,
            },
        }
    }
}
