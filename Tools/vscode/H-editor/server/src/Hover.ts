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

    const before_cursor = Scan_new_changes.get_node_before_text_position(
        root,
        document.getText(),
        document.offsetAt(parameters.position)
    );
    if (before_cursor === undefined) {
        return undefined;
    }

    const ancestor_expression = Parser_node.get_first_ancestor_with_name(root, after_cursor.node_position, [
        "Expression_access",
        "Expression_instantiate_member_name",
        "Expression_variable"
    ]);
    if (ancestor_expression !== undefined) {
        if (ancestor_expression.node.word.value === "Expression_access") {
            const expression = Parse_tree_analysis.get_expression_from_node(server_data.language_description, core_module, ancestor_expression.node);
            if (expression.data.type === Core.Expression_enum.Access_expression) {
                const access_expression = expression.data.value as Core.Access_expression;
                const components = await Parse_tree_analysis.get_access_expression_components(core_module, access_expression, root, ancestor_expression.node, ancestor_expression.position, get_core_module);
                const member_name_component = Parse_tree_analysis.select_access_expression_component(components, before_cursor.node, before_cursor.node_position, after_cursor.node_position);
                if (member_name_component.type === Parse_tree_analysis.Component_type.Member_name) {
                    const declaration_component = components[components.length - 2];
                    if (declaration_component !== undefined && declaration_component.type === Parse_tree_analysis.Component_type.Declaration) {
                        const module_declaration = declaration_component.value as { core_module: Core.Module, declaration: Core.Declaration };
                        const member_name = member_name_component.value as string;
                        const member_index = Helpers.get_declaration_member_index(module_declaration.declaration, member_name);
                        if (member_index !== undefined) {
                            const content = Helpers.get_tooltip_of_declaration_member(module_declaration.core_module, module_declaration.declaration, member_index);
                            if (content !== undefined) {
                                const range = Helpers.get_terminal_node_vscode_range(root, before_cursor.text, member_name_component.node_position);
                                return {
                                    contents: content,
                                    range: range
                                };
                            }
                        }
                    }
                }
            }
        }
        else if (ancestor_expression.node.word.value === "Expression_instantiate_member_name") {
            const instantiate_member_info = await Parse_tree_analysis.find_instantiate_member_from_node(server_data.language_description, core_module, root, before_cursor.node_position, false, get_core_module);
            if (instantiate_member_info !== undefined) {
                const content = Helpers.get_tooltip_of_declaration_member(core_module, instantiate_member_info.declaration, instantiate_member_info.member_index);
                if (content !== undefined) {
                    const range = Helpers.get_terminal_node_vscode_range(root, before_cursor.text, ancestor_expression.position);
                    return {
                        contents: content,
                        range: range
                    };
                }
            }
        }
        else if (ancestor_expression.node.word.value === "Expression_variable") {
            const module_function = await Parse_tree_analysis.get_function_value_from_node(server_data.language_description, core_module, ancestor_expression.node, get_core_module);
            if (module_function !== undefined) {
                const declaration: Core.Declaration = {
                    type: Core.Declaration_type.Function,
                    value: module_function.function_value,
                    name: module_function.function_value.declaration.name,
                    is_export: false
                };
                const content = Helpers.get_tooltip_of_declaration(module_function.core_module, declaration);
                const range = Helpers.get_terminal_node_vscode_range(root, before_cursor.text, ancestor_expression.position);
                return {
                    contents: content,
                    range: range
                };
            }
        }
    }

    return undefined;
}
