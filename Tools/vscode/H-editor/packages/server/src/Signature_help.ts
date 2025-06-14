import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";

import * as Comments from "../../core/src/Comments";
import * as Core from "../../core/src/Core_intermediate_representation";
import * as Document from "../../core/src/Document";
import * as Parse_tree_analysis from "../../core/src/Parse_tree_analysis";
import * as Parser_node from "../../core/src/Parser_node";
import * as Scan_new_changes from "../../core/src/Scan_new_changes";
import * as Type_utilities from "../../core/src/Type_utilities";

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
    if (document_state === undefined) {
        return null;
    }
    const root = Document.get_parse_tree(document_state);
    if (root === undefined) {
        return null;
    }

    const before_cursor_iterator = Scan_new_changes.get_node_before_text_position(
        root,
        document.getText(),
        document.offsetAt(parameters.position)
    );
    if (before_cursor_iterator === undefined) {
        return null;
    }

    const get_parse_tree = Server_data.create_get_parse_tree(server_data, workspace_uri);

    const ancestor = Parser_node.get_first_ancestor_with_name(root, before_cursor_iterator.node_position, [
        "Expression_call",
        "Expression_instantiate"
    ]);

    if (ancestor === undefined || ancestor.node.word.value === "Expression_call") {
        const expression_call_info = await Parse_tree_analysis.get_function_value_and_parameter_index_from_expression_call(
            root, before_cursor_iterator.node_position, get_parse_tree
        );
        if (expression_call_info !== undefined) {
            return get_function_signature_help(root, expression_call_info.function_value.declaration, expression_call_info.input_parameter_index);
        }
    }

    if (ancestor === undefined || ancestor.node.word.value === "Expression_instantiate") {
        const signature_help = await get_struct_signature_help(before_cursor_iterator.root, before_cursor_iterator.node_position, get_parse_tree);
        if (signature_help !== undefined) {
            return signature_help;
        }
    }

    return null;
}

function get_function_signature_help(
    root: Parser_node.Node,
    function_declaration: Core.Function_declaration,
    input_parameter_index: number
): vscode.SignatureHelp {

    const function_comment = Comments.parse_function_comment(function_declaration);

    const function_label = Helpers.create_function_label(root, function_declaration);

    const signature_information: vscode.SignatureInformation = {
        label: function_label,
        parameters: function_declaration.input_parameter_names.map(
            name => {
                const range = find_parameter_range(function_label, name, "(", ")", ",");
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
        activeParameter: input_parameter_index
    };

    return signature_help;
}

async function get_struct_signature_help(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<vscode.SignatureHelp | undefined> {

    const instantiate_member_info = await Parse_tree_analysis.find_instantiate_member_from_node(root, before_cursor_node_position, true, get_parse_tree);
    if (instantiate_member_info === undefined || instantiate_member_info.declaration.type !== Core.Declaration_type.Struct) {
        return undefined;
    }

    const struct_declaration = instantiate_member_info.declaration.value as Core.Struct_declaration;

    const struct_label = create_struct_label(root, struct_declaration);

    const signature_information: vscode.SignatureInformation = {
        label: struct_label,
        parameters: struct_declaration.member_names.map(
            (member_name, member_index) => {
                const range = find_parameter_range(struct_label, member_name, "{", "}", ",");
                const parameter_information: vscode.ParameterInformation = {
                    label: range
                };

                const comment = struct_declaration.member_comments.find(value => value.index === member_index);
                if (comment !== undefined) {
                    parameter_information.documentation = comment.comment;
                }

                return parameter_information;
            }
        )
    };

    if (struct_declaration.comment !== undefined) {
        signature_information.documentation = struct_declaration.comment;
    }

    const signature_help: vscode.SignatureHelp = {
        signatures: [signature_information],
        activeSignature: 0,
        activeParameter: instantiate_member_info.member_index
    };

    return signature_help;
}

function find_parameter_range(
    label: string,
    input_parameter_name: string,
    open_character: string,
    close_character: string,
    separate_character: string
): [number, number] {
    const start_index = label.indexOf(open_character);
    const end_index = label.indexOf(close_character);

    let current_index = start_index + 1;

    const input_parameters = label.substring(current_index, end_index).split(separate_character);

    for (const input_parameter of input_parameters) {
        const parts = input_parameter.split(":");
        const name = parts[0].trim();
        if (name === input_parameter_name) {
            let whitespace_count = 0;
            for (let i = 0; i < parts[0].length; ++i) {
                if (parts[0][i] === " " || parts[0][i] === "\n") {
                    whitespace_count += 1;
                }
                else {
                    break;
                }
            }
            let whitespace_count_at_end = 0;
            for (let i = 0; i < input_parameter.length; ++i) {
                const reverse_index = input_parameter.length - 1 - i;
                if (input_parameter[reverse_index] === " " || input_parameter[reverse_index] === "\n") {
                    whitespace_count_at_end += 1;
                }
                else {
                    break;
                }
            }
            return [current_index + whitespace_count, current_index + input_parameter.length - whitespace_count_at_end];
        }

        current_index += input_parameter.length + 1;
    }

    return [start_index, start_index];
}

function create_struct_label(
    root: Parser_node.Node,
    struct_declaration: Core.Struct_declaration
): string {

    let members_string = struct_declaration.member_names.map(
        (member_name, member_index) => {
            const member_type = struct_declaration.member_types[member_index];
            const member_type_name = Type_utilities.get_type_name([member_type], Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
            const member_default_value_statement = struct_declaration.member_default_values[member_index];
            const member_default_value_text = Parse_tree_analysis.create_member_default_value_text(member_default_value_statement);
            const default_value_text = member_default_value_text !== undefined ? ` = ${member_default_value_text}` : "";
            return `    ${member_name}: ${member_type_name}${default_value_text}`;
        }
    ).join(",\n");
    if (members_string.length > 0) {
        members_string = `\n${members_string}\n`;
    }

    return `${struct_declaration.name} {${members_string}}`;
}

