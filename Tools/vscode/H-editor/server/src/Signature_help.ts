import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Comments from "@core/Comments";
import * as Core from "@core/Core_intermediate_representation";
import * as Parse_tree_analysis from "@core/Parse_tree_analysis";
import * as Parse_tree_text_iterator from "@core/Parse_tree_text_iterator";
import * as Parser_node from "@core/Parser_node";
import * as Scan_new_changes from "@core/Scan_new_changes";
import * as Type_utilities from "@core/Type_utilities";

export async function create(
    parameters: vscode.SignatureHelpParams,
    server_data: Server_data.Server_data,
    workspace_uri: string | undefined
): Promise<vscode.SignatureHelp | null> {

    const document = server_data.documents.get(parameters.textDocument.uri);
    if (document === undefined) {
        return null;
    }

    const document_state = server_data.document_states.get(parameters.textDocument.uri);
    if (document_state === undefined || document_state.parse_tree === undefined) {
        return null;
    }

    const root = document_state.parse_tree;

    const before_cursor_iterator = Scan_new_changes.get_node_before_text_position(
        root,
        document.getText(),
        document.offsetAt(parameters.position)
    );
    if (before_cursor_iterator === undefined) {
        return null;
    }

    const get_core_module = (module_name: string): Promise<Core.Module | undefined> => {
        return Server_data.get_core_module(server_data, workspace_uri, module_name);
    };

    const ancestor_expression_call = Parser_node.get_ancestor_with_name(root, before_cursor_iterator.node_position, "Expression_call");
    if (ancestor_expression_call !== undefined) {

        const active_input_parameter_index = get_cursor_parameter_index_at_expression_call_arguments(
            ancestor_expression_call.position,
            before_cursor_iterator
        );
        if (active_input_parameter_index !== -1) {
            const left_hand_side_node = ancestor_expression_call.node.children[0];
            const module_function = await Parse_tree_analysis.get_function_value_from_node(server_data.language_description, document_state.module, left_hand_side_node, get_core_module);
            if (module_function !== undefined) {
                const function_declaration = module_function.function_value.declaration;

                const function_comment = Comments.parse_function_comment(function_declaration);

                const function_label = create_function_label(document_state.module, function_declaration);

                const signature_information: vscode.SignatureInformation = {
                    label: function_label,
                    parameters: function_declaration.input_parameter_names.map(
                        name => {
                            const range = find_parameter_range(function_label, name);
                            const parameter_information: vscode.ParameterInformation = {
                                label: range
                            };

                            const comment = function_comment.input_parameters.find(value => value.parameter_name === name);
                            if (comment !== undefined && comment.description !== undefined) {
                                parameter_information.documentation = comment.description;
                            }

                            return parameter_information;
                        }
                    )
                };

                if (function_comment.short_description !== undefined || function_comment.long_description !== undefined) {
                    const parts: string[] = [];
                    if (function_comment.short_description !== undefined) {
                        parts.push(function_comment.short_description);
                    }
                    if (function_comment.long_description !== undefined) {
                        parts.push(function_comment.long_description);
                    }
                    signature_information.documentation = parts.join("\n\n");
                }

                const signature_help: vscode.SignatureHelp = {
                    signatures: [signature_information],
                    activeSignature: 0,
                    activeParameter: active_input_parameter_index
                };

                return signature_help;
            }
        }
    }

    return null;
}

function get_cursor_parameter_index_at_expression_call_arguments(
    expression_call_node_position: number[],
    iterator: Parse_tree_text_iterator.Iterator
): number {
    const child_index = iterator.node_position[expression_call_node_position.length];
    if (child_index === 1) {
        return 0;
    }
    else if (child_index === 2) {
        const argument_index = iterator.node_position[expression_call_node_position.length + 1];
        return Math.ceil(argument_index / 2);
    }
    else {
        return -1;
    }
}

function find_parameter_range(
    function_label: string,
    input_parameter_name: string
): [number, number] {
    const start_index = function_label.indexOf("(");
    const end_index = function_label.indexOf(")");

    let current_index = start_index + 1;

    const input_parameters = function_label.substring(current_index, end_index).split(",");

    for (const input_parameter of input_parameters) {
        const parts = input_parameter.split(":");
        const name = parts[0].trim();
        if (name === input_parameter_name) {
            let whitespace_count = 0;
            for (let i = 0; i < parts[0].length; ++i) {
                if (parts[0][i] === " ") {
                    whitespace_count += 1;
                }
                else {
                    break;
                }
            }
            return [current_index + whitespace_count, current_index + input_parameter.length];
        }

        current_index += input_parameter.length + 1;
    }

    return [start_index, start_index];
}

function create_function_label(
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
            const type_name = Type_utilities.get_type_name([types[index]], core_module);
            return `${value}: ${type_name}`;
        }
    ).join(", ");
}

function get_start_iterator(
    document: TextDocument,
    range: vscode.Range,
    parse_tree: Parser_node.Node
): Parse_tree_text_iterator.Iterator {
    const start_node_iterator = Scan_new_changes.get_node_before_text_position(
        parse_tree,
        document.getText(),
        document.offsetAt(range.start)
    );
    if (start_node_iterator !== undefined) {
        return start_node_iterator;
    }

    return Parse_tree_text_iterator.begin(parse_tree, document.getText());
}

