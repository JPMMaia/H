import * as child_process from "child_process";
import * as path from "path";
import * as vscode from "vscode-languageserver/node";
import * as vscode_uri from "vscode-uri";

import * as Comments from "../../core/src/Comments";
import * as Core from "../../core/src/Core_intermediate_representation";
import * as Parse_tree_analysis from "../../core/src/Parse_tree_analysis";
import * as Parse_tree_text_iterator from "../../core/src/Parse_tree_text_iterator";
import * as Parser_node from "../../core/src/Parser_node";
import * as Type_utilities from "../../core/src/Type_utilities";

export interface Position {
    line: number;
    column: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Location {
    file_path: string;
    range: Range;
}

export function location_to_vscode_location(location: Location | undefined): vscode.Location | undefined {

    if (location === undefined) {
        return undefined;
    }

    const uri = vscode_uri.URI.file(location.file_path).toString();

    return vscode.Location.create(
        uri,
        range_to_vscode_range(location.range)
    );
}

export function range_to_vscode_range(range: Range): vscode.Range {
    return vscode.Range.create(
        vscode.Position.create(range.start.line - 1, range.start.column - 1),
        vscode.Position.create(range.end.line - 1, range.end.column - 1)
    );
}

export function create_vscode_range(start_line: number, start_column: number, end_line: number, end_column: number): vscode.Range {
    return vscode.Range.create(
        vscode.Position.create(start_line - 1, start_column - 1),
        vscode.Position.create(end_line - 1, end_column - 1)
    );
}

export function get_tooltip_of_module(
    core_module: Core.Module
): vscode.MarkupContent {

    const lines = [
        '```hlang',
        `module ${sanitize_input(core_module.name)}`,
        '```'
    ];

    const is_c_header = core_module.source_file_path !== undefined && core_module.source_file_path.endsWith(".h");
    if (is_c_header) {
        lines.push("C Header");
    }

    const comment = core_module.comment;
    if (comment !== undefined) {
        lines.push(sanitize_input(comment));
    }

    const tooltip: vscode.MarkupContent = {
        kind: vscode.MarkupKind.Markdown,
        value: lines.join('\n')
    };

    return tooltip;
}

export function get_tooltip_of_declaration(
    core_module: Core.Module,
    declaration: Core.Declaration
): vscode.MarkupContent {

    const declaration_type = Core.Declaration_type[declaration.type].toLowerCase();
    const declaration_label = create_declaration_label(core_module, declaration);

    const lines = [
        '```hlang',
        `module ${sanitize_input(core_module.name)}`,
        `${declaration_type} ${declaration_label}`,
        '```'
    ];

    const comment = get_declaration_comment(declaration);
    if (comment !== undefined) {
        lines.push(sanitize_input(comment));
    }

    const tooltip: vscode.MarkupContent = {
        kind: vscode.MarkupKind.Markdown,
        value: lines.join('\n')
    };

    return tooltip;
}

export function get_tooltip_of_declaration_member(
    core_module: Core.Module,
    declaration: Core.Declaration,
    member_index: number
): vscode.MarkupContent | undefined {
    switch (declaration.type) {
        case Core.Declaration_type.Enum: {
            const enum_declaration = declaration.value as Core.Enum_declaration;
            const enum_value = enum_declaration.values[member_index];

            // TODO add value of enum

            const lines = [
                '```hlang',
                `${sanitize_input(declaration.name)}.${sanitize_input(enum_value.name)}`,
                '```'
            ];

            if (enum_value.comment !== undefined) {
                lines.push(sanitize_input(enum_value.comment));
            }

            const tooltip: vscode.MarkupContent = {
                kind: vscode.MarkupKind.Markdown,
                value: lines.join('\n')
            };

            return tooltip;

        }
        case Core.Declaration_type.Struct:
        case Core.Declaration_type.Union: {
            const member_info = get_declaration_member_info(declaration, member_index);
            if (member_info !== undefined) {
                const type_name = Type_utilities.get_type_name([member_info.member_type], core_module);

                const default_value = member_info.member_default_value !== undefined ? Parse_tree_analysis.create_member_default_value_text(member_info.member_default_value) : undefined;
                const default_value_text = default_value !== undefined ? ` = ${sanitize_input(default_value)}` : "";

                const lines = [
                    '```hlang',
                    `${sanitize_input(declaration.name)}.${sanitize_input(member_info.member_name)}: ${sanitize_input(type_name)}${default_value_text}`,
                    '```'
                ];

                if (member_info.member_comment !== undefined) {
                    lines.push(sanitize_input(member_info.member_comment));
                }

                const tooltip: vscode.MarkupContent = {
                    kind: vscode.MarkupKind.Markdown,
                    value: lines.join('\n')
                };

                return tooltip;
            }
        }
    }

    return undefined;
}

export interface Member_info {
    member_name: string;
    member_type: Core.Type_reference;
    member_comment: string | undefined;
    member_default_value: Core.Statement | undefined;
}

export function get_declaration_member_info(
    declaration: Core.Declaration,
    member_index: number
): Member_info | undefined {

    switch (declaration.type) {
        case Core.Declaration_type.Struct: {
            const struct_declaration = declaration.value as Core.Struct_declaration;
            const member_name = struct_declaration.member_names[member_index];
            const member_type = struct_declaration.member_types[member_index];
            const member_comment = struct_declaration.member_comments.find(value => value.index === member_index);
            const member_default_value = struct_declaration.member_default_values[member_index];

            return {
                member_name: member_name,
                member_type: member_type,
                member_comment: member_comment?.comment,
                member_default_value: member_default_value
            };
        }
        case Core.Declaration_type.Union: {
            const union_declaration = declaration.value as Core.Union_declaration;
            const member_name = union_declaration.member_names[member_index];
            const member_type = union_declaration.member_types[member_index];

            const member_comment = union_declaration.member_comments.find(value => value.index === member_index);
            return {
                member_name: member_name,
                member_type: member_type,
                member_comment: member_comment?.comment,
                member_default_value: undefined
            };
        }
    }

    return undefined;
}

export function get_declaration_member_index(
    declaration: Core.Declaration,
    member_name: string
): number | undefined {
    switch (declaration.type) {
        case Core.Declaration_type.Enum: {
            const enum_declaration = declaration.value as Core.Enum_declaration;
            const index = enum_declaration.values.findIndex(value => value.name === member_name);
            return index !== -1 ? index : undefined;
        }
        case Core.Declaration_type.Struct: {
            const struct_declaration = declaration.value as Core.Struct_declaration;
            const index = struct_declaration.member_names.findIndex(name => name === member_name);
            return index !== -1 ? index : undefined;
        }
        case Core.Declaration_type.Union: {
            const union_declaration = declaration.value as Core.Union_declaration;
            const index = union_declaration.member_names.findIndex(name => name === member_name);
            return index !== -1 ? index : undefined;
        }
    }

    return undefined;
}

export function get_declaration_member_infos(
    declaration: Core.Declaration
): Member_info[] {

    switch (declaration.type) {
        case Core.Declaration_type.Struct: {
            const struct_declaration = declaration.value as Core.Struct_declaration;

            return struct_declaration.member_names.map((member_name, member_index): Member_info => {
                const member_type = struct_declaration.member_types[member_index];
                const member_comment = struct_declaration.member_comments.find(value => value.index === member_index);
                const member_default_value = struct_declaration.member_default_values[member_index];

                return {
                    member_name: member_name,
                    member_type: member_type,
                    member_comment: member_comment?.comment,
                    member_default_value: member_default_value
                };
            });
        }
        case Core.Declaration_type.Union: {
            const union_declaration = declaration.value as Core.Union_declaration;

            return union_declaration.member_names.map((member_name, member_index): Member_info => {
                const member_type = union_declaration.member_types[member_index];

                const member_comment = union_declaration.member_comments.find(value => value.index === member_index);
                return {
                    member_name: member_name,
                    member_type: member_type,
                    member_comment: member_comment?.comment,
                    member_default_value: undefined
                };
            });
        }
    }

    return [];
}

export function get_tooltip_of_function_input_parameter(
    function_declaration: Core.Function_declaration,
    input_parameter_index: number
): vscode.MarkupContent {

    const input_parameter_name = sanitize_input(function_declaration.input_parameter_names[input_parameter_index]);
    const input_parameter_type = Type_utilities.get_type_name([function_declaration.type.input_parameter_types[input_parameter_index]]);

    const lines = [
        '```hlang',
        `${input_parameter_name}: ${input_parameter_type}`,
        '```'
    ];

    const tooltip: vscode.MarkupContent = {
        kind: vscode.MarkupKind.Markdown,
        value: lines.join('\n')
    };

    return tooltip;
}

function sanitize_input(input: string): string {
    return input.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function get_tooltip_of_fundamental_type(
    type: Core.Fundamental_type
): string {
    return `Built-in type: ${type.toString()}`;
}

export function get_tooltip_of_integer_type(
    type: Core.Integer_type
): string {
    const integer_name = Type_utilities.get_integer_name(type);
    return `Built-in type: ${integer_name}`;
}

function get_declaration_comment(
    declaration: Core.Declaration
): string | undefined {
    switch (declaration.type) {
        case Core.Declaration_type.Alias: {
            const value = declaration.value as Core.Alias_type_declaration;
            return value.comment;
        }
        case Core.Declaration_type.Enum: {
            const value = declaration.value as Core.Enum_declaration;
            return value.comment;
        }
        case Core.Declaration_type.Function: {
            const value = declaration.value as Core.Function;
            const function_comment = Comments.parse_function_comment(value.declaration);

            const comments: string[] = [];
            if (function_comment.short_description !== undefined) {
                comments.push(function_comment.short_description);
            }
            if (function_comment.long_description !== undefined) {
                comments.push(function_comment.long_description);
            }

            return comments.join("\n\n");
        }
        case Core.Declaration_type.Struct: {
            const value = declaration.value as Core.Struct_declaration;
            return value.comment;
        }
        case Core.Declaration_type.Union: {
            const value = declaration.value as Core.Union_declaration;
            return value.comment;
        }
    }
}

export function get_terminal_node_vscode_range(
    root: Parser_node.Node,
    text: string,
    node_position: number[]
): vscode.Range | undefined {
    const source_location = Parse_tree_text_iterator.get_node_source_location(root, text, node_position);
    if (source_location === undefined) {
        return undefined;
    }

    const node = Parser_node.get_node_at_position(root, node_position);
    if (node.children.length === 0) {
        return create_vscode_range(source_location.line, source_location.column, source_location.line, source_location.column + node.word.value.length);
    }

    const descendant = Parser_node.find_descendant_position_if({ node: node, position: node_position }, node => node.children.length === 0);
    if (descendant === undefined) {
        return undefined;
    }

    return create_vscode_range(source_location.line, source_location.column, source_location.line, source_location.column + descendant.node.word.value.length);
}

export function get_module_source_location(
    core_module: Core.Module
): Location | undefined {

    const file_path = core_module.source_file_path;
    if (file_path === undefined) {
        return undefined;
    }

    const range: Range = {
        start: {
            line: 1,
            column: 1
        },
        end: {
            line: 1,
            column: 1
        }
    };

    return {
        file_path: file_path,
        range: range
    };
}

export function get_declaration_source_location(
    core_module: Core.Module,
    declaration: Core.Declaration
): Location | undefined {

    const file_path = core_module.source_file_path;
    if (file_path === undefined) {
        return undefined;
    }

    const core_source_location = get_declaration_core_source_location(declaration);
    if (core_source_location === undefined) {
        return undefined;
    }

    return {
        file_path: core_source_location.file_path !== undefined ? core_source_location.file_path : file_path,
        range: {
            start: {
                line: core_source_location.line,
                column: core_source_location.column
            },
            end: {
                line: core_source_location.line,
                column: core_source_location.column + declaration.name.length
            }
        }
    };
}

function get_declaration_core_source_location(
    declaration: Core.Declaration
): Core.Source_location | undefined {
    switch (declaration.type) {
        case Core.Declaration_type.Alias: {
            const value = declaration.value as Core.Alias_type_declaration;
            return value.source_location;
        }
        case Core.Declaration_type.Enum: {
            const value = declaration.value as Core.Enum_declaration;
            return value.source_location;
        }
        case Core.Declaration_type.Function: {
            const value = declaration.value as Core.Function;
            return value.declaration.source_location;
        }
        case Core.Declaration_type.Global_variable: {
            const value = declaration.value as Core.Global_variable_declaration;
            return value.source_location;
        }
        case Core.Declaration_type.Struct: {
            const value = declaration.value as Core.Struct_declaration;
            return value.source_location;
        }
        case Core.Declaration_type.Union: {
            const value = declaration.value as Core.Union_declaration;
            return value.source_location;
        }
    }

    return undefined;
}

export function get_declaration_member_source_location(
    core_module: Core.Module,
    declaration: Core.Declaration,
    member_name: string
): Location | undefined {

    const file_path = core_module.source_file_path;
    if (file_path === undefined) {
        return undefined;
    }

    switch (declaration.type) {
        case Core.Declaration_type.Enum: {
            const enum_declaration = declaration.value as Core.Enum_declaration;
            const enum_member = enum_declaration.values.find(value => value.name === member_name);
            if (enum_member === undefined || enum_member.source_location === undefined) {
                return undefined;
            }

            const source_location = enum_member.source_location;
            const range = {
                start: {
                    line: source_location.line,
                    column: source_location.column
                },
                end: {
                    line: source_location.line,
                    column: source_location.column + member_name.length
                }
            };

            return {
                file_path: file_path,
                range: range
            };
        }
        case Core.Declaration_type.Struct: {
            const struct_declaration = declaration.value as Core.Struct_declaration;
            if (struct_declaration.member_source_positions === undefined) {
                return undefined;
            }

            const member_index = struct_declaration.member_names.findIndex(value => value === member_name);
            if (member_index === -1) {
                return undefined;
            }

            const source_location = struct_declaration.member_source_positions[member_index];
            const range = {
                start: {
                    line: source_location.line,
                    column: source_location.column
                },
                end: {
                    line: source_location.line,
                    column: source_location.column + member_name.length
                }
            };

            return {
                file_path: file_path,
                range: range
            };
        }
        case Core.Declaration_type.Union: {
            const union_declaration = declaration.value as Core.Union_declaration;
            if (union_declaration.member_source_positions === undefined) {
                return undefined;
            }

            const member_index = union_declaration.member_names.findIndex(value => value === member_name);
            if (member_index === -1) {
                return undefined;
            }

            const source_location = union_declaration.member_source_positions[member_index];
            const range = {
                start: {
                    line: source_location.line,
                    column: source_location.column
                },
                end: {
                    line: source_location.line,
                    column: source_location.column + member_name.length
                }
            };

            return {
                file_path: file_path,
                range: range
            };
        }
    }

    return undefined;
}

export function get_function_declaration_source_location(
    core_module: Core.Module,
    function_declaration: Core.Function_declaration
): Location | undefined {

    if (function_declaration.source_location === undefined || core_module.source_file_path === undefined) {
        return undefined;
    }

    const range: Range = {
        start: {
            line: function_declaration.source_location.line,
            column: function_declaration.source_location.column
        },
        end: {
            line: function_declaration.source_location.line,
            column: function_declaration.source_location.column + function_declaration.name.length
        }
    };

    return {
        file_path: core_module.source_file_path,
        range: range
    };
}

export function get_function_parameter_source_location(
    core_module: Core.Module,
    function_declaration: Core.Function_declaration,
    parameter_index: number,
    is_input: boolean
): Location | undefined {
    if (is_input) {
        return get_function_input_parameter_source_location(
            core_module,
            function_declaration,
            parameter_index
        );
    }
    else {
        return get_function_output_parameter_source_location(
            core_module,
            function_declaration,
            parameter_index
        );
    }
}

export function get_function_input_parameter_source_location(
    core_module: Core.Module,
    function_declaration: Core.Function_declaration,
    input_parameter_index: number
): Location | undefined {
    return get_function_parameter_source_location_given_arrays(
        core_module,
        function_declaration.input_parameter_names,
        function_declaration.input_parameter_source_positions,
        input_parameter_index
    );
}

export function get_function_output_parameter_source_location(
    core_module: Core.Module,
    function_declaration: Core.Function_declaration,
    output_parameter_index: number
): Location | undefined {
    return get_function_parameter_source_location_given_arrays(
        core_module,
        function_declaration.output_parameter_names,
        function_declaration.output_parameter_source_positions,
        output_parameter_index
    );
}

function get_function_parameter_source_location_given_arrays(
    core_module: Core.Module,
    parameter_names: string[],
    parameter_source_positions: Core.Source_position[] | undefined,
    parameter_index: number
): Location | undefined {

    if (parameter_source_positions === undefined || parameter_index >= parameter_source_positions.length || parameter_index >= parameter_names.length) {
        return undefined;
    }

    const file_path = core_module.source_file_path;
    if (file_path === undefined) {
        return undefined;
    }

    const parameter_name = parameter_names[parameter_index];
    const parameter_source_position = parameter_source_positions[parameter_index];

    const range: Range = {
        start: {
            line: parameter_source_position.line,
            column: parameter_source_position.column
        },
        end: {
            line: parameter_source_position.line,
            column: parameter_source_position.column + parameter_name.length
        }
    };

    return {
        file_path: file_path,
        range: range
    };
}

export function get_struct_member_source_location(
    core_module: Core.Module,
    struct_declaration: Core.Struct_declaration,
    member_index: number
): Location | undefined {

    if (struct_declaration.member_source_positions === undefined || member_index >= struct_declaration.member_source_positions.length) {
        return undefined;
    }

    const file_path = core_module.source_file_path;
    if (file_path === undefined) {
        return undefined;
    }

    const member_name = struct_declaration.member_names[member_index];
    if (member_name === undefined) {
        return undefined;
    }

    const member_source_location = struct_declaration.member_source_positions[member_index];
    if (member_source_location === undefined) {
        return undefined;
    }

    const range: Range = {
        start: {
            line: member_source_location.line,
            column: member_source_location.column
        },
        end: {
            line: member_source_location.line,
            column: member_source_location.column + member_name.length
        }
    };

    return {
        file_path: file_path,
        range: range
    };
}

export function create_declaration_label(
    core_module: Core.Module,
    declaration: Core.Declaration
): string {
    switch (declaration.type) {
        case Core.Declaration_type.Function: {
            const function_value = declaration.value as Core.Function;
            return create_function_label(core_module, function_value.declaration);
        }
        default: {
            return sanitize_input(declaration.name);
        }
    }
}

export function create_function_label(
    core_module: Core.Module,
    function_declaration: Core.Function_declaration
): string {
    const input_parameters_string = format_function_parameters(core_module, function_declaration.input_parameter_names, function_declaration.type.input_parameter_types);
    const output_parameters_string = format_function_parameters(core_module, function_declaration.output_parameter_names, function_declaration.type.output_parameter_types);
    return `${function_declaration.name}(${input_parameters_string}) -> (${output_parameters_string})`;
}

function format_function_parameters(
    core_module: Core.Module,
    names: string[],
    types: Core.Type_reference[]
): string {
    return names.map(
        (value, index) => {
            const type_name = sanitize_input(Type_utilities.get_type_name([types[index]], core_module));
            return `${sanitize_input(value)}: ${type_name}`;
        }
    ).join(", ");
}

export function validate_input(input: string): boolean {
    const regex = /^[a-zA-Z0-9\.\_]+$/;
    return regex.test(input);
}

export function validate_path(input: string): boolean {
    const regex = /[;|&><$\\'\"`(){}*?[\]~#]/;
    return !regex.test(input);
}

export function normalize_path(value: string): string {
    const normalized_path = path.normalize(value);
    return normalized_path.replace(/\\/g, "/");
}

export async function execute_command(
    executable_file_path: string,
    command: string,
    args: string[],
    on_stdout?: (data: any) => void
): Promise<boolean> {
    return new Promise((resolve, reject) => {

        const process = child_process.spawn(executable_file_path, [command, ...args]);

        process.stdout.on("data", on_stdout ? on_stdout : (data: any) => {
            const message = data.toString("utf-8");
            console.log(message);
        });

        process.stderr.on("data", (data: Buffer) => {
            const message = data.toString("utf-8");
            console.log(message);
        });

        process.on("close", (code: number) => {
            if (code === 0) {
                return resolve(true);
            } else {
                return resolve(false);
            }
        });
    });
}
