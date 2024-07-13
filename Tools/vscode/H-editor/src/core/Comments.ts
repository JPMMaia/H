import * as Core from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Scanner from "./Scanner";

export interface Function_parameter_comment {
    parameter_name: string;
    description?: string;
}

export interface Function_comment {
    short_description?: string;
    long_description?: string;
    input_parameters: Function_parameter_comment[];
    output_parameters: Function_parameter_comment[];
}

export function parse_function_comment(
    function_declaration: Core.Function_declaration
): Function_comment {
    const output: Function_comment = {
        input_parameters: [],
        output_parameters: []
    };

    if (function_declaration.comment === undefined) {
        return output;
    }

    const parts = split_comment(function_declaration.comment);

    const short_description = get_short_description(parts);
    if (short_description !== undefined) {
        output.short_description = short_description;
    }

    const long_description = get_long_description(parts);
    if (long_description !== undefined) {
        output.long_description = long_description;
    }

    output.input_parameters = get_parameters(parts, "@input_parameter");
    output.output_parameters = get_parameters(parts, "@output_parameter");

    return output;
}

function split_comment(input: string): string[] {
    const regex = /(\n\n|@)/;
    const parts = input.split(regex);

    const result: string[] = [];
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (result.length > 0 && result[result.length - 1].startsWith("@") && !part.startsWith("@")) {
            result[result.length - 1] += part.trim();
        }
        else {
            part.trim();
            if (part.length > 0 && part !== "\n\n") {
                result.push(part);
            }
        }
    }

    return result;
}

function get_short_description(parts: string[]): string | undefined {
    if (parts.length > 0 && !parts[0].startsWith("@")) {
        return parts[0];
    }
    else {
        return undefined;
    }
}

function get_long_description(parts: string[]): string | undefined {

    const index = parts.findIndex(part => part.startsWith("@"));
    if (index === 0 || index === 1) {
        return undefined;
    }

    const end = index !== -1 ? index : parts.length;
    const long_description_parts = parts.slice(1, end);
    return long_description_parts.join("\n\n");
}

function get_parameters(parts: string[], keyword: string): Function_parameter_comment[] {
    const parameters: Function_parameter_comment[] = [];

    for (const part of parts) {
        if (part.startsWith(keyword)) {

            let current_offset = keyword.length + 1;

            const parameter_name_result = Scanner.scan_word(part, current_offset, { line: 1, column: 1 });
            if (parameter_name_result.type === Grammar.Word_type.Invalid) {
                continue;
            }

            const parameter_name = parameter_name_result.word;
            current_offset += parameter_name_result.processed_characters;

            const colon_result = Scanner.scan_word(part, current_offset, { line: 1, column: 1 });
            if (colon_result.word === ":") {
                current_offset += 1;
            }

            const description = part.substring(current_offset, part.length).trim();

            const comment: Function_parameter_comment = {
                parameter_name: parameter_name,
            };
            if (description.length > 0) {
                comment.description = description;
            }

            parameters.push(comment);
        }
    }

    return parameters;
}

export function generate_function_comment(
    function_declaration: Core.Function_declaration
): string {
    const short_description = "A short description";

    const input_parameters: string[] = function_declaration.input_parameter_names.map(
        name => `@input_parameter ${name}: A description`
    );

    const output_parameters: string[] = function_declaration.output_parameter_names.map(
        name => `@output_parameter ${name}: A description`
    );

    return `${short_description}\n\n${input_parameters.join("\n")}\n${output_parameters.join("\n")}`;
}

export function update_function_comment(
    function_declaration: Core.Function_declaration
): string {

    const default_description = "TODO documentation";

    const comment = parse_function_comment(function_declaration);

    const input_parameters: string[] = function_declaration.input_parameter_names.map(
        name => {
            const original_parameter_comment = comment.input_parameters.find(comment => comment.parameter_name === name);
            const description = original_parameter_comment?.description !== undefined ? original_parameter_comment.description : default_description;
            return `@input_parameter ${name}: ${description}`;
        }
    );

    const output_parameters: string[] = function_declaration.output_parameter_names.map(
        name => {
            const original_parameter_comment = comment.output_parameters.find(comment => comment.parameter_name === name);
            const description = original_parameter_comment?.description !== undefined ? original_parameter_comment.description : default_description;
            return `@output_parameter ${name}: ${description}`;
        }
    );

    const lines: string[] = [];

    if (comment.short_description !== undefined) {
        lines.push(comment.short_description);
    }

    if (comment.long_description !== undefined) {
        if (lines.length > 0) {
            lines.push("\n\n" + comment.long_description);
        }
    }

    if (lines.length > 0 && (input_parameters.length > 0 || output_parameters.length > 0)) {
        lines.push("\n");
    }

    lines.push(...input_parameters);
    lines.push(...output_parameters);

    const comment_string = lines.join("\n");
    return comment_string;
}
