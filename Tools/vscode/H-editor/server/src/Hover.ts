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

    return undefined;
}
