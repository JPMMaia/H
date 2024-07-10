import * as vscode from "vscode-languageserver/node";
import * as vscode_uri from "vscode-uri";

import * as Core from "@core/Core_intermediate_representation";
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

    const range: vscode.Range = {
        start: {
            line: location.range.start.line - 1,
            character: location.range.start.column - 1,
        },
        end: {
            line: location.range.end.line - 1,
            character: location.range.end.column - 1,
        }
    };

    const uri = vscode_uri.URI.file(location.file_path).toString();

    return vscode.Location.create(uri, range);
}

export function get_tooltip_of_declaration(
    core_module: Core.Module,
    declaration: Core.Declaration
): vscode.MarkupContent {

    const declaration_type = Core.Declaration_type[declaration.type].toLowerCase();
    const comment = get_declaration_comment(declaration);

    const tooltip: vscode.MarkupContent = {
        kind: vscode.MarkupKind.Markdown,
        value: [
            '```hlang',
            `module ${sanitize_input(core_module.name)}`,
            `${declaration_type} ${sanitize_input(declaration.name)}`,
            '```',
            comment !== undefined ? `${sanitize_input(comment)}` : ''
        ].join('\n')
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
