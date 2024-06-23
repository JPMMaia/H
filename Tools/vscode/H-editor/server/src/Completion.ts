import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";

import * as Core from "@core/Core_intermediate_representation";
import * as Document from "@core/Document";
import * as Parser from "@core/Parser";
import * as Parser_node from "@core/Parser_node";
import * as Parse_tree_text_iterator from "@core/Parse_tree_text_iterator";
import * as Scan_new_changes from "@core/Scan_new_changes";
import * as Scanner from "@core/Scanner";

export function on_completion(
    text_document_position: vscode.TextDocumentPositionParams,
    server_data: Server_data.Server_data
): vscode.CompletionItem[] {

    const document = server_data.documents.get(text_document_position.textDocument.uri);
    if (document === undefined) {
        return [];
    }

    const document_state = server_data.document_states.get(text_document_position.textDocument.uri);
    if (document_state === undefined) {
        return [];
    }

    const start_change_node_iterator =
        document_state.parse_tree !== undefined ?
            Scan_new_changes.get_node_before_text_position(
                document_state.parse_tree,
                document.getText(),
                document.offsetAt(text_document_position.position)
            ) :
            undefined;

    const node_position = start_change_node_iterator !== undefined ? Parse_tree_text_iterator.next(start_change_node_iterator).node_position : undefined;

    const allowed_labels = Parser.get_allowed_labels(
        document_state.parse_tree,
        node_position?.length === 0 ? undefined : node_position,
        server_data.language_description.array_infos,
        server_data.language_description.actions_table
    );

    const items: vscode.CompletionItem[] = [];
    items.push(...get_keyword_and_value_items(allowed_labels, server_data));

    if (is_identifier_allowed(allowed_labels) && start_change_node_iterator !== undefined && is_inside_statements_block(start_change_node_iterator.root, start_change_node_iterator.node_position)) {
        items.push(...get_function_declaration_items(document_state));
        items.push(...get_function_local_variable_items(document_state, start_change_node_iterator));
    }

    return items;
}

function get_keyword_and_value_items(
    allowed_labels: string[],
    server_data: Server_data.Server_data
): vscode.CompletionItem[] {

    const items: vscode.CompletionItem[] = [];

    for (const label of allowed_labels) {
        switch (label) {
            case "boolean":
                items.push(
                    {
                        label: "true",
                        kind: vscode.CompletionItemKind.Value,
                        data: 0
                    }
                );
                items.push(
                    {
                        label: "false",
                        kind: vscode.CompletionItemKind.Value,
                        data: 0
                    }
                );
                continue;
            case "null":
                items.push(
                    {
                        label: label,
                        kind: vscode.CompletionItemKind.Value,
                        data: 0
                    }
                );
                continue;
            case "comment":
            case "identifier":
            case "number":
            case "string":
                continue;
        }

        if (!server_data.language_description.terminals.has(label)) {
            continue;
        }

        if (!Scanner.is_alphanumeric(label)) {
            continue;
        }

        items.push(
            {
                label: label,
                kind: vscode.CompletionItemKind.Keyword,
                data: 0
            }
        );
    }

    return items;
}

function get_function_declaration_items(
    document_state: Document.State
): vscode.CompletionItem[] {

    const function_declarations = document_state.module.declarations.filter(value => value.type === Core.Declaration_type.Function);

    const items = function_declarations.map(
        (declaration, index): vscode.CompletionItem => {
            return {
                label: declaration.name,
                kind: vscode.CompletionItemKind.Function,
                data: index
            };
        }
    );

    return items;
}

function get_function_local_variable_items(
    document_state: Document.State,
    iterator: Parse_tree_text_iterator.Iterator
): vscode.CompletionItem[] {

    const declaration = get_current_function(document_state.module, iterator.root, iterator.node_position);
    if (declaration === undefined) {
        return [];
    }

    const function_value = declaration.value as Core.Function;

    const input_parameter_items = function_value.declaration.input_parameter_names.map(
        (input_parameter_name, index): vscode.CompletionItem => {
            return {
                label: input_parameter_name,
                kind: vscode.CompletionItemKind.Variable,
                data: index
            };
        }
    );

    const local_variable_items: vscode.CompletionItem[] = [];

    // TODO

    return [
        ...input_parameter_items,
        ...local_variable_items
    ];
}

function is_identifier_allowed(
    allowed_labels: string[]
): boolean {
    return allowed_labels.find(label => label === "identifier") !== undefined;
}

function is_inside_statements_block(
    root: Parser_node.Node,
    node_position: number[]
): boolean {

    let current_node_position = node_position;

    while (current_node_position.length > 0) {
        const parent_position = Parser_node.get_parent_position(current_node_position);
        const parent_node = Parser_node.get_node_at_position(root, parent_position);

        switch (parent_node.word.value) {
            case "Statements":
            case "Expression_block_statements":
            case "Expression_for_loop_statements":
            case "Expression_if_statements":
            case "Expression_switch_case_statements":
            case "Expression_while_loop_statements":
                return true;
            case "Function":
            case "Module_body":
                return false;
        }

        current_node_position = parent_position;
    }

    return false;
}

function get_current_function(
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[]
): Core.Declaration | undefined {

    let current_node_position = node_position;

    while (current_node_position.length > 0) {
        const parent_position = Parser_node.get_parent_position(current_node_position);
        const parent_node = Parser_node.get_node_at_position(root, parent_position);

        if (parent_node.word.value === "Function") {
            const declaration_node = parent_node.children.find(value => value.word.value === "Function_declaration") as Parser_node.Node;
            const declaration_name_node = declaration_node.children.find(value => value.word.value === "Function_name") as Parser_node.Node;
            const declaration_name = declaration_name_node.children[0].word.value;

            return core_module.declarations.find(value => value.name === declaration_name);
        }

        current_node_position = parent_position;
    }

    return undefined;

}
