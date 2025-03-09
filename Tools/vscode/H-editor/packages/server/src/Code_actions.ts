import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Core from "../../core/src/Core_intermediate_representation";
import * as Document from "../../core/src/Document";
import * as Language from "../../core/src/Language";
import * as Parse_tree_analysis from "../../core/src/Parse_tree_analysis";
import * as Parse_tree_convertor_mappings from "../../core/src/Parse_tree_convertor_mappings";
import * as Parse_tree_text_iterator from "../../core/src/Parse_tree_text_iterator";
import * as Parser_node from "../../core/src/Parser_node";
import * as Scan_new_changes from "../../core/src/Scan_new_changes";
import * as Text_formatter from "../../core/src/Text_formatter";

export async function get_code_actions(
    parameters: vscode.CodeActionParams,
    server_data: Server_data.Server_data,
    workspace_uri: string | undefined
): Promise<vscode.CodeAction[]> {

    const document = server_data.documents.get(parameters.textDocument.uri);
    if (document === undefined) {
        return [];
    }

    const document_state = server_data.document_states.get(parameters.textDocument.uri);
    if (document_state === undefined) {
        return [];
    }
    const root = Document.get_parse_tree(document_state);
    if (root === undefined) {
        return [];
    }

    const get_core_module = Server_data.create_get_core_module(server_data, workspace_uri);
    const core_module = await get_core_module(Document.get_module(document_state).name);
    if (core_module === undefined) {
        return [];
    }

    const code_actions: vscode.CodeAction[] = [];

    const start_iterator = get_start_iterator(document, parameters.range, root);

    if (parameters.range.start.line === parameters.range.end.line && parameters.range.start.character === parameters.range.end.character) {

        const ancestor = Parser_node.get_first_ancestor_with_name(root, start_iterator.node_position, [
            "Expression_instantiate"
        ]);

        if (ancestor !== undefined) {
            if (ancestor.node.word.value === "Expression_instantiate") {

                const expression_iterator = Parse_tree_text_iterator.go_to_previous_node_position(start_iterator, ancestor.position);

                const add_missing_members_code_action = await create_add_missing_members_to_instantiate_expression(
                    parameters.textDocument.uri,
                    document_state,
                    document.getText(),
                    core_module,
                    root,
                    { node: ancestor.node, position: [...ancestor.position] },
                    expression_iterator.offset,
                    parameters.context.diagnostics,
                    get_core_module
                );
                if (add_missing_members_code_action !== undefined) {
                    code_actions.push(add_missing_members_code_action);
                }
            }
        }
    }
    else {
        /*const is_within_range = (iterator: Parse_tree_text_iterator.Iterator): boolean => {
    
            if (iterator.line === -1 || iterator.column === -1) {
                return false;
            }
    
            if (iterator.line - 1 < parameters.range.end.line) {
                return true;
            }
    
            if (iterator.line - 1 > parameters.range.end.line) {
                return false;
            }
    
            return iterator.column - 1 < parameters.range.end.character;
        };

        let iterator = start_iterator;
    
        while (is_within_range(iterator)) {
    
            if (iterator.node !== undefined) {
                if (Parser_node.has_ancestor_with_name(iterator.root, iterator.node_position, ["Statement"])) {
    
                    const result = Parse_tree_analysis.find_statement(core_module, iterator.root, iterator.node_position);
                    if (result !== undefined) {
    
                        const function_value = result.function_value;
                        const statement = result.statement;
                        const statement_node_position = result.node_position;
                        const statement_node = result.node;
    
                        const descendants = Parser_node.find_descendants_if(result.node, node => node.word.value === "Expression_");
                        for (const descendant of descendants) {
                        }
    
                        const rightmost_descendant = Parser_node.get_rightmost_descendant(result.node, result.node_position);
                        iterator = Parse_tree_text_iterator.go_to_next_node_position(iterator, rightmost_descendant.position);
                    }
                }
            }
    
            iterator = Parse_tree_text_iterator.next(iterator);
        }*/
    }

    return code_actions;
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

async function create_add_missing_members_to_instantiate_expression(
    document_uri: vscode.DocumentUri,
    document_state: Document.State,
    text: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_instantiate_expression: { node: Parser_node.Node, position: number[] },
    instantiate_expression_source_offset: number,
    diagnostics: vscode.Diagnostic[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<vscode.CodeAction | undefined> {

    const module_declaration = await Parse_tree_analysis.find_instantiate_declaration_from_node(core_module, root, descendant_instantiate_expression.position, get_core_module);
    if (module_declaration === undefined || module_declaration.declaration.type !== Core.Declaration_type.Struct) {
        return undefined;
    }

    const member_infos = Helpers.get_declaration_member_infos(module_declaration.declaration);
    if (member_infos.length === 0) {
        return undefined;
    }

    const instantiate_expression = Parse_tree_convertor_mappings.node_to_expression_instantiate(descendant_instantiate_expression.node);

    {
        let are_all_members_present = true;
        for (const member_info of member_infos) {
            const instantiate_member = instantiate_expression.members.find(value => value.member_name === member_info.member_name);
            if (instantiate_member === undefined) {
                are_all_members_present = false;
                break;
            }
        }

        if (are_all_members_present) {
            return undefined;
        }
    }

    for (let member_index = 0; member_index < member_infos.length; ++member_index) {
        const member_info = member_infos[member_index];

        const instantiate_member = instantiate_expression.members.find(value => value.member_name === member_info.member_name);

        if (instantiate_member === undefined) {
            if (member_info.member_default_value === undefined) {
                continue;
            }

            instantiate_expression.members.splice(member_index, 0, { member_name: member_info.member_name, value: member_info.member_default_value });
        }
    }

    const original_text_range = Parse_tree_analysis.find_node_range(root, descendant_instantiate_expression.node, descendant_instantiate_expression.position, Document.get_text(document_state));
    if (original_text_range === undefined) {
        return undefined;
    }

    const indentation = Text_formatter.calculate_current_indentation(text, instantiate_expression_source_offset);
    const formatted_text = Text_formatter.format_expression_instantiate(instantiate_expression, indentation);

    const edit: vscode.TextEdit = {
        range: {
            start: {
                line: original_text_range.start.line - 1,
                character: original_text_range.start.column - 1
            },
            end: {
                line: original_text_range.end.line - 1,
                character: original_text_range.end.column - 1
            }
        },
        newText: formatted_text
    };

    const title = "Add missing instantiate members";
    const changes: { [uri: vscode.DocumentUri]: vscode.TextEdit[]; } = {};
    changes[document_uri] = [edit];
    const workspace_edit: vscode.WorkspaceEdit = { changes: changes };

    const is_explicit = instantiate_expression.type === Core.Instantiate_expression_type.Explicit;

    const code_action_kind = is_explicit ? vscode.CodeActionKind.QuickFix : vscode.CodeActionKind.RefactorRewrite;
    const code_action = vscode.CodeAction.create(title, workspace_edit, code_action_kind);

    if (is_explicit && root !== undefined) {
        const instantiate_expression_node_range = Parse_tree_analysis.find_node_range(root, descendant_instantiate_expression.node, descendant_instantiate_expression.position, Document.get_text(document_state));
        if (instantiate_expression_node_range !== undefined) {
            const diagnostics_to_fix: vscode.Diagnostic[] = [];
            for (const diagnostic of diagnostics) {
                if (diagnostic.range.start.line === instantiate_expression_node_range.start.line - 1 &&
                    diagnostic.range.start.character === instantiate_expression_node_range.start.column - 1 &&
                    diagnostic.range.end.line === instantiate_expression_node_range.end.line - 1 &&
                    diagnostic.range.end.character === instantiate_expression_node_range.end.column - 1
                ) {
                    diagnostics_to_fix.push(diagnostic);
                }
            }
            code_action.diagnostics = diagnostics_to_fix;
        }
    }

    return code_action;
}
