import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";

import * as Parse_tree_analysis from "@core/Parse_tree_analysis";
import * as Parser_node from "@core/Parser_node";
import * as Scan_new_changes from "@core/Scan_new_changes";

export async function find_definition_link(
    parameters: vscode.DefinitionParams,
    server_data: Server_data.Server_data,
    workspace_uri: string | undefined
): Promise<vscode.Location[]> {

    const document = server_data.documents.get(parameters.textDocument.uri);
    if (document === undefined) {
        return [];
    }

    const document_state = server_data.document_states.get(parameters.textDocument.uri);
    if (document_state === undefined || document_state.parse_tree === undefined) {
        return [];
    }
    const root = document_state.parse_tree;

    const before_cursor = Scan_new_changes.get_node_after_text_position(
        root,
        document.getText(),
        document.offsetAt(parameters.position)
    );
    if (before_cursor === undefined) {
        return [];
    }
    const before_cursor_node_position = before_cursor.node_position;

    const after_cursor = (before_cursor !== undefined && before_cursor.node !== undefined) ? Parser_node.get_next_terminal_node(before_cursor.root, before_cursor.node, before_cursor.node_position) : undefined;
    const after_cursor_node_position = after_cursor !== undefined ? after_cursor.position : [];

    const ancestor_type = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Type");
    if (ancestor_type !== undefined) {
        const type_reference = Parse_tree_analysis.get_type_reference_from_node(server_data.language_description, document_state.module, ancestor_type.node);
        const get_core_module = Server_data.create_get_core_module(server_data, workspace_uri);
        const type_declaration = await Parse_tree_analysis.get_type_reference_declaration(type_reference, get_core_module);
        if (type_declaration !== undefined) {
            const location = Helpers.location_to_vscode_location(
                Helpers.get_declaration_source_location(type_declaration.core_module, type_declaration.declaration)
            );
            if (location !== undefined) {
                return [
                    location
                ];
            }
        }
    }

    const ancestor_struct_name = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Struct_name");
    if (ancestor_struct_name !== undefined && before_cursor.node !== undefined) {
        const core_module = await Server_data.get_core_module(server_data, workspace_uri, document_state.module.name);
        if (core_module !== undefined) {
            const declaration_name = before_cursor.node.word.value;
            const declaration = core_module.declarations.find(declaration => declaration.name === declaration_name);
            if (declaration !== undefined) {
                const location = Helpers.location_to_vscode_location(
                    Helpers.get_declaration_source_location(core_module, declaration)
                );
                if (location !== undefined) {
                    return [
                        location
                    ];
                }
            }
        }
    }

    return [];
}

