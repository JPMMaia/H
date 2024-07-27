import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Core from "@core/Core_intermediate_representation";
import * as Document from "@core/Document";
import * as Language from "@core/Language";
import * as Parse_tree_analysis from "@core/Parse_tree_analysis";
import * as Parse_tree_text_iterator from "@core/Parse_tree_text_iterator";
import * as Parser_node from "@core/Parser_node";
import * as Scan_new_changes from "@core/Scan_new_changes";
import * as Text_change from "@core/Text_change";
import * as Text_formatter from "@core/Text_formatter";

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
    if (document_state === undefined || document_state.parse_tree === undefined) {
        return [];
    }
    const root = document_state.parse_tree;

    const get_core_module = Server_data.create_get_core_module(server_data, workspace_uri);
    const core_module = await get_core_module(document_state.module.name);
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
                const instantiate_members_node_array = Parser_node.find_descendant_position_if(ancestor.node, node => node.word.value === "Expression_instantiate_members");
                if (instantiate_members_node_array !== undefined) {
                    const descendant_instantiate_members = instantiate_members_node_array.node.children.map((child, index) => {
                        return {
                            node: child,
                            position: [...ancestor.position, ...instantiate_members_node_array.position, index]
                        };
                    });

                    const add_missing_members_code_action = await create_add_missing_members_to_instantiate_expression(
                        parameters.textDocument.uri,
                        server_data.language_description,
                        document_state,
                        core_module,
                        root,
                        { node: ancestor.node, position: [...ancestor.position] },
                        descendant_instantiate_members,
                        get_core_module
                    );
                    if (add_missing_members_code_action !== undefined) {
                        code_actions.push(add_missing_members_code_action);
                    }
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
    language_description: Language.Description,
    document_state: Document.State,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_instantiate_expression: { node: Parser_node.Node, position: number[] },
    descendant_instantiate_members: { node: Parser_node.Node, position: number[] }[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<vscode.CodeAction | undefined> {

    const module_declaration = await Parse_tree_analysis.find_instantiate_declaration_from_node(language_description, core_module, root, descendant_instantiate_expression.position, get_core_module);
    if (module_declaration === undefined || module_declaration.declaration.type !== Core.Declaration_type.Struct) {
        return undefined;
    }

    const member_infos = Helpers.get_declaration_member_infos(module_declaration.declaration);
    if (member_infos.length === 0) {
        return undefined;
    }

    const find_instantiate_member = (member_name: string): { node: Parser_node.Node, position: number[] } | undefined => {
        return descendant_instantiate_members.find(value => {
            if (value.node.children.length > 0 && value.node.children[0].children.length > 0) {
                return value.node.children[0].children[0].word.value === member_name;
            }
            else {
                return false;
            }
        });
    };

    {
        let are_all_members_present = true;
        for (const member_info of member_infos) {
            if (find_instantiate_member(member_info.member_name) === undefined) {
                are_all_members_present = false;
                break;
            }
        }

        if (are_all_members_present) {
            return undefined;
        }
    }

    const members_text: string[] = [];

    for (const member_info of member_infos) {
        const descendant_member = find_instantiate_member(member_info.member_name);
        if (descendant_member !== undefined) {
            const member_text = Text_formatter.to_unformatted_text(descendant_member.node);
            members_text.push(member_text);
        }
        else {
            if (member_info.member_default_value === undefined) {
                return undefined;
            }

            const member_default_value_text = Parse_tree_analysis.create_member_default_value_text(member_info.member_default_value);
            if (member_default_value_text === undefined) {
                return undefined;
            }

            const member_text = `${member_info.member_name}: ${member_default_value_text}`;
            members_text.push(member_text);
        }
    }

    const original_text_range = Parse_tree_analysis.find_node_range(root, descendant_instantiate_expression.node, descendant_instantiate_expression.position, document_state.text);
    if (original_text_range === undefined) {
        return undefined;
    }

    const descendant_instantiate_expression_type = Parser_node.find_descendant_position_if(descendant_instantiate_expression.node, node => node.word.value === "Expression_instantiate_expression_type");
    if (descendant_instantiate_expression_type === undefined) {
        return undefined;
    }

    const instantiate_type_text = descendant_instantiate_expression_type.node.children.length > 0 ? `${descendant_instantiate_expression_type.node.children[0].word.value} ` : "";

    const unformatted_text = `${instantiate_type_text}{${members_text.join(", ")}}`;

    const unformatted_text_change: Parse_tree_analysis.Text_change_2 = {
        range: original_text_range,
        text: unformatted_text
    };

    const formatted_text_change = Parse_tree_analysis.format_text(language_description, document_state, unformatted_text_change);
    if (formatted_text_change === undefined) {
        return undefined;
    }

    const edit: vscode.TextEdit = {
        range: {
            start: {
                line: formatted_text_change.range.start.line - 1,
                character: formatted_text_change.range.start.column - 1
            },
            end: {
                line: formatted_text_change.range.end.line - 1,
                character: formatted_text_change.range.end.column - 1
            }
        },
        newText: formatted_text_change.text
    };

    const title = "Add missing instantiate members";
    const changes: { [uri: vscode.DocumentUri]: vscode.TextEdit[]; } = {};
    changes[document_uri] = [edit];
    const workspace_edit: vscode.WorkspaceEdit = { changes: changes };
    const code_action_kind = vscode.CodeActionKind.RefactorRewrite;
    const code_action = vscode.CodeAction.create(title, workspace_edit, code_action_kind);

    return code_action;
}
