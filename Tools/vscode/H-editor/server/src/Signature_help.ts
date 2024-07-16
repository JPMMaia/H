import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Comments from "@core/Comments";
import * as Core from "@core/Core_intermediate_representation";
import * as Language from "@core/Language";
import * as Parse_tree_analysis from "@core/Parse_tree_analysis";
import * as Parse_tree_convertor_mappings from "@core/Parse_tree_convertor_mappings";
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

    const expression_call_info = await Parse_tree_analysis.get_function_value_and_parameter_index_from_expression_call(
        server_data.language_description, document_state.module, root, before_cursor_iterator.node_position, get_core_module
    );
    if (expression_call_info !== undefined) {
        const function_declaration = expression_call_info.function_value.declaration;

        const function_comment = Comments.parse_function_comment(function_declaration);

        const function_label = create_function_label(document_state.module, function_declaration);

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
            activeParameter: expression_call_info.input_parameter_index
        };

        return signature_help;
    }

    const ancestor_expression_call = Parser_node.get_ancestor_with_name(root, before_cursor_iterator.node_position, "Expression_call");
    if (ancestor_expression_call !== undefined) {

        const active_input_parameter_index = Parse_tree_analysis.get_cursor_parameter_index_at_expression(
            ancestor_expression_call.position,
            before_cursor_iterator.node_position
        );
        if (active_input_parameter_index !== -1) {
            const left_hand_side_node = ancestor_expression_call.node.children[0];
            const module_function = await Parse_tree_analysis.get_function_value_from_node(server_data.language_description, document_state.module, left_hand_side_node, get_core_module);
            if (module_function !== undefined) {

            }
        }
    }

    const ancestor_expression_instantiate = Parser_node.get_ancestor_with_name(root, before_cursor_iterator.node_position, "Expression_instantiate");
    if (ancestor_expression_instantiate !== undefined) {

        const active_parameter_index = Parse_tree_analysis.get_cursor_parameter_index_at_expression(
            ancestor_expression_instantiate.position,
            before_cursor_iterator.node_position
        );
        if (active_parameter_index !== -1) {
            const custom_type_reference = await find_instantiate_custom_type_reference_from_node(server_data.language_description, document_state.module, before_cursor_iterator.root, ancestor_expression_instantiate.position, get_core_module);
            if (custom_type_reference !== undefined) {
                const module_declaration = await Parse_tree_analysis.get_custom_type_reference_declaration(custom_type_reference, get_core_module);
                if (module_declaration !== undefined) {
                    if (module_declaration.declaration.type === Core.Declaration_type.Struct) {
                        const struct_declaration = module_declaration.declaration.value as Core.Struct_declaration;

                        const struct_label = create_struct_label(document_state.module, struct_declaration);

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
                            activeParameter: active_parameter_index
                        };

                        return signature_help;
                    }
                }
            }
        }
    }

    return null;
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

async function find_instantiate_custom_type_reference_from_node(
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Core.Custom_type_reference | undefined> {

    const ancestor_expression_instantiate = Parser_node.get_ancestor_with_name(root, node_position, "Expression_instantiate");
    if (ancestor_expression_instantiate !== undefined) {
        const custom_type_reference = await find_instantiate_custom_type_reference_from_node(language_description, core_module, root, ancestor_expression_instantiate.position, get_core_module);
        if (custom_type_reference !== undefined) {
            const declaration = await Parse_tree_analysis.get_custom_type_reference_declaration(custom_type_reference, get_core_module);
            if (declaration !== undefined && declaration.declaration.type === Core.Declaration_type.Struct) {
                const struct_declaration = declaration.declaration.value as Core.Struct_declaration;
                const parameter_index = Parse_tree_analysis.get_cursor_parameter_index_at_expression(ancestor_expression_instantiate.position, node_position);
                if (parameter_index !== -1) {
                    const type = struct_declaration.member_types[parameter_index];
                    if (type.data.type === Core.Type_reference_enum.Custom_type_reference) {
                        return type.data.value as Core.Custom_type_reference;
                    }
                }
            }
        }
    }

    const ancestor_variable_declaration_with_type = Parser_node.get_ancestor_with_name(root, node_position, "Expression_variable_declaration_with_type");
    if (ancestor_variable_declaration_with_type !== undefined) {
        const declaration_type_node = ancestor_variable_declaration_with_type.node.children[3];
        const type_reference = Parse_tree_analysis.get_type_reference_from_node(language_description, core_module, declaration_type_node.children[0]);
        if (type_reference.length > 0) {
            if (type_reference[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                return type_reference[0].data.value as Core.Custom_type_reference;
            }
        }
    }

    const ancestor_struct_member = Parser_node.get_ancestor_with_name(root, node_position, "Struct_member");
    if (ancestor_struct_member !== undefined) {
        const struct_declaration = Parse_tree_analysis.get_struct_declaration_that_contains_node_position(core_module, root, node_position);
        if (struct_declaration !== undefined) {
            const member_index = ancestor_struct_member.position[ancestor_struct_member.position.length - 1];
            const member_type = struct_declaration.member_types[member_index];
            if (member_type !== undefined) {
                if (member_type.data.type === Core.Type_reference_enum.Custom_type_reference) {
                    return member_type.data.value as Core.Custom_type_reference;
                }
            }
        }
    }

    const ancestor_return_expression = Parser_node.get_ancestor_with_name(root, node_position, "Expression_return");
    if (ancestor_return_expression !== undefined) {
        const function_value = Parse_tree_analysis.get_function_value_that_contains_node_position(core_module, root, node_position);
        if (function_value !== undefined) {
            if (function_value.declaration.type.output_parameter_types.length > 0) {
                // TODO multiple return types
                const return_type = function_value.declaration.type.output_parameter_types[0];
                if (return_type.data.type === Core.Type_reference_enum.Custom_type_reference) {
                    return return_type.data.value as Core.Custom_type_reference;
                }
            }
        }
    }

    const expression_call_info = await Parse_tree_analysis.get_function_value_and_parameter_index_from_expression_call(
        language_description, core_module, root, node_position, get_core_module
    );
    if (expression_call_info !== undefined) {
        const function_declaration = expression_call_info.function_value.declaration;
        const parameter_type = function_declaration.type.input_parameter_types[expression_call_info.input_parameter_index];
        if (parameter_type !== undefined && parameter_type.data.type === Core.Type_reference_enum.Custom_type_reference) {
            const custom_type_reference = parameter_type.data.value as Core.Custom_type_reference;
            const declaration = await Parse_tree_analysis.get_custom_type_reference_declaration(custom_type_reference, get_core_module);
            if (declaration !== undefined && declaration.declaration.type === Core.Declaration_type.Struct) {
                const struct_declaration = declaration.declaration.value as Core.Struct_declaration;

            }
        }
    }

    return undefined;
}

function create_struct_label(
    core_module: Core.Module,
    struct_declaration: Core.Struct_declaration
): string {

    let members_string = struct_declaration.member_names.map(
        (member_name, member_index) => {
            const member_type = struct_declaration.member_types[member_index];
            const member_type_name = Type_utilities.get_type_name([member_type], core_module);
            const member_default_value_statement = struct_declaration.member_default_values[member_index];
            const member_default_value_text = create_struct_member_default_value_text(member_default_value_statement);
            const default_value_text = member_default_value_text !== undefined ? ` = ${member_default_value_text}` : "";
            return `    ${member_name}: ${member_type_name}${default_value_text}`;
        }
    ).join(",\n");
    if (members_string.length > 0) {
        members_string = `\n${members_string}\n`;
    }

    return `${struct_declaration.name} {${members_string}}`;
}

function create_struct_member_default_value_text(
    statement: Core.Statement
): string | undefined {
    if (statement.expression.data.type === Core.Expression_enum.Constant_expression) {
        const word = Parse_tree_convertor_mappings.constant_expression_to_word(statement.expression.data.value as Core.Constant_expression);
        return word.value;
    }

    return undefined;
}
