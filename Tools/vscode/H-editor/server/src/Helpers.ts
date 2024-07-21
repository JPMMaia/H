import * as child_process from "child_process";
import * as path from "path";
import * as vscode from "vscode-languageserver/node";
import * as vscode_uri from "vscode-uri";

import * as Core from "@core/Core_intermediate_representation";
import * as Parse_tree_text_iterator from "@core/Parse_tree_text_iterator";
import * as Parser_node from "@core/Parser_node";
import * as Type_utilities from "@core/Type_utilities";

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

    const lines = [
        '```hlang',
        `module ${sanitize_input(core_module.name)}`,
        `${declaration_type} ${sanitize_input(declaration.name)}`,
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
            return value.declaration.comment;
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

    const descendant = Parser_node.find_descendant_position_if(node, node => node.children.length === 0);
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

    const range = get_declaration_source_range(declaration);
    if (range === undefined) {
        return undefined;
    }

    return {
        file_path: file_path,
        range: range
    };
}

function get_declaration_source_range(
    declaration: Core.Declaration
): Range | undefined {

    switch (declaration.type) {
        case Core.Declaration_type.Alias: {
            const value = declaration.value as Core.Alias_type_declaration;
            if (value.source_location !== undefined) {
                return {
                    start: {
                        line: value.source_location.line,
                        column: value.source_location.column
                    },
                    end: {
                        line: value.source_location.line,
                        column: value.source_location.column + value.name.length
                    }
                };
            }
        }
        case Core.Declaration_type.Enum: {
            const value = declaration.value as Core.Enum_declaration;
            if (value.source_location !== undefined) {
                return {
                    start: {
                        line: value.source_location.line,
                        column: value.source_location.column
                    },
                    end: {
                        line: value.source_location.line,
                        column: value.source_location.column + value.name.length
                    }
                };
            }
        }
        case Core.Declaration_type.Function: {
            const value = declaration.value as Core.Function;
            if (value.declaration.source_location !== undefined) {
                return {
                    start: {
                        line: value.declaration.source_location.line,
                        column: value.declaration.source_location.column
                    },
                    end: {
                        line: value.declaration.source_location.line,
                        column: value.declaration.source_location.column + value.declaration.name.length
                    }
                };
            }
        }
        case Core.Declaration_type.Struct: {
            const value = declaration.value as Core.Struct_declaration;
            if (value.source_location !== undefined) {
                return {
                    start: {
                        line: value.source_location.line,
                        column: value.source_location.column
                    },
                    end: {
                        line: value.source_location.line,
                        column: value.source_location.column + value.name.length
                    }
                };
            }
        }
        case Core.Declaration_type.Union: {
            const value = declaration.value as Core.Union_declaration;
            if (value.source_location !== undefined) {
                return {
                    start: {
                        line: value.source_location.line,
                        column: value.source_location.column
                    },
                    end: {
                        line: value.source_location.line,
                        column: value.source_location.column + value.name.length
                    }
                };
            }
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
            if (struct_declaration.member_source_locations === undefined) {
                return undefined;
            }

            const member_index = struct_declaration.member_names.findIndex(value => value === member_name);
            if (member_index === -1) {
                return undefined;
            }

            const source_location = struct_declaration.member_source_locations[member_index];
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
            if (union_declaration.member_source_locations === undefined) {
                return undefined;
            }

            const member_index = union_declaration.member_names.findIndex(value => value === member_name);
            if (member_index === -1) {
                return undefined;
            }

            const source_location = union_declaration.member_source_locations[member_index];
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
        function_declaration.input_parameter_source_locations,
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
        function_declaration.output_parameter_source_locations,
        output_parameter_index
    );
}

function get_function_parameter_source_location_given_arrays(
    core_module: Core.Module,
    parameter_names: string[],
    parameter_source_locations: Core.Source_location[] | undefined,
    parameter_index: number
): Location | undefined {

    if (parameter_source_locations === undefined || parameter_index >= parameter_source_locations.length || parameter_index >= parameter_names.length) {
        return undefined;
    }

    const file_path = core_module.source_file_path;
    if (file_path === undefined) {
        return undefined;
    }

    const parameter_name = parameter_names[parameter_index];
    const parameter_source_location = parameter_source_locations[parameter_index];

    const range: Range = {
        start: {
            line: parameter_source_location.line,
            column: parameter_source_location.column
        },
        end: {
            line: parameter_source_location.line,
            column: parameter_source_location.column + parameter_name.length
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

    if (struct_declaration.member_source_locations === undefined || member_index >= struct_declaration.member_source_locations.length) {
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

    const member_source_location = struct_declaration.member_source_locations[member_index];
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