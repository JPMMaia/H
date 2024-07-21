import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";

import * as Core from "@core/Core_intermediate_representation";
import * as Parse_tree_analysis from "@core/Parse_tree_analysis";
import * as Parser_node from "@core/Parser_node";
import * as Scan_new_changes from "@core/Scan_new_changes";

export async function get_hover(
    parameters: vscode.HoverParams,
    server_data: Server_data.Server_data,
    workspace_uri: string | undefined
): Promise<vscode.Hover | undefined> {

    const document = server_data.documents.get(parameters.textDocument.uri);
    if (document === undefined) {
        return undefined;
    }

    const document_state = server_data.document_states.get(parameters.textDocument.uri);
    if (document_state === undefined || document_state.parse_tree === undefined) {
        return undefined;
    }
    const root = document_state.parse_tree;

    const after_cursor = Scan_new_changes.get_node_after_text_position(
        root,
        document.getText(),
        document.offsetAt(parameters.position)
    );
    if (after_cursor === undefined) {
        return undefined;
    }
    const after_cursor_node_position = after_cursor.node_position;

    const get_core_module = Server_data.create_get_core_module(server_data, workspace_uri);
    const core_module = await get_core_module(document_state.module.name);
    if (core_module === undefined) {
        return undefined;
    }

    const ancestor_type = Parser_node.get_ancestor_with_name(root, after_cursor_node_position, "Type_name");
    if (ancestor_type !== undefined) {
        const parent_node = Parser_node.get_node_at_position(root, Parser_node.get_parent_position(ancestor_type.position));
        const type_reference = Parse_tree_analysis.get_type_reference_from_node(server_data.language_description, core_module, parent_node);
        const type_declaration = await Parse_tree_analysis.get_type_reference_declaration(type_reference, get_core_module);
        if (type_declaration !== undefined) {
            const content = Helpers.get_tooltip_of_declaration(type_declaration.core_module, type_declaration.declaration);
            const range = Helpers.get_terminal_node_vscode_range(root, after_cursor.text, after_cursor.node_position);
            return {
                contents: content,
                range: range
            };
        }
    }

    const ancestor_declaration_name = Parser_node.get_first_ancestor_with_name(root, after_cursor_node_position, [
        "Alias_name", "Enum_name", "Function_name", "Struct_name", "Union_name"
    ]);
    if (ancestor_declaration_name !== undefined && after_cursor.node !== undefined) {
        const declaration_name = after_cursor.node.word.value;
        const declaration = core_module.declarations.find(declaration => declaration.name === declaration_name);
        if (declaration !== undefined) {
            const content = Helpers.get_tooltip_of_declaration(core_module, declaration);
            const range = Helpers.get_terminal_node_vscode_range(root, after_cursor.text, after_cursor.node_position);
            return {
                contents: content,
                range: range
            };
        }
    }

    return undefined;
}
