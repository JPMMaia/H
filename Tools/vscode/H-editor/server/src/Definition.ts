import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";

import * as Core from "@core/Core_intermediate_representation";
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

    const after_cursor = Scan_new_changes.get_node_after_text_position(
        root,
        document.getText(),
        document.offsetAt(parameters.position)
    );
    if (after_cursor === undefined) {
        return [];
    }
    const after_cursor_node_position = after_cursor.node_position;

    const get_core_module = Server_data.create_get_core_module(server_data, workspace_uri);
    const core_module = await get_core_module(document_state.module.name);
    if (core_module === undefined) {
        return [];
    }

    const ancestor_type = Parser_node.get_ancestor_with_name(root, after_cursor_node_position, "Type");
    if (ancestor_type !== undefined) {
        const type_reference = Parse_tree_analysis.get_type_reference_from_node(server_data.language_description, core_module, ancestor_type.node);
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

    const ancestor_declaration_name = Parser_node.get_first_ancestor_with_name(root, after_cursor_node_position, [
        "Alias_name", "Enum_name", "Function_name", "Struct_name", "Union_name"
    ]);
    if (ancestor_declaration_name !== undefined && after_cursor.node !== undefined) {
        const declaration_name = after_cursor.node.word.value;
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

    const before_cursor = Scan_new_changes.get_node_before_text_position(
        root,
        document.getText(),
        document.offsetAt(parameters.position)
    );
    if (before_cursor === undefined) {
        return [];
    }

    const function_value_and_parameter_index = Parse_tree_analysis.get_function_value_and_parameter_index_at_declaration(core_module, root, before_cursor.node_position);
    if (function_value_and_parameter_index !== undefined) {
        const location = Helpers.location_to_vscode_location(
            Helpers.get_function_parameter_source_location(core_module, function_value_and_parameter_index.function_value.declaration, function_value_and_parameter_index.parameter_index, function_value_and_parameter_index.is_input)
        );
        if (location !== undefined) {
            return [location];
        }
    }

    const ancestor = Parse_tree_analysis.get_first_ancestor_with_name_at_cursor_position(root, before_cursor.node_position, after_cursor.node_position, [
        "Expression_access",
        "Expression_call",
        "Expression_instantiate"
    ]);

    if (ancestor !== undefined) {
        if (ancestor.node.word.value === "Expression_access") {
            const expression = Parse_tree_analysis.get_expression_from_node(server_data.language_description, core_module, ancestor.node);
            if (expression.data.type === Core.Expression_enum.Access_expression) {
                const access_expression = expression.data.value as Core.Access_expression;
                const components = await Parse_tree_analysis.get_access_expression_components(core_module, access_expression, root, ancestor.node, ancestor.position, get_core_module);
                if (components.length === 0) {
                    return [];
                }

                const selected_component = Parse_tree_analysis.select_access_expression_component(components, before_cursor.node, before_cursor.node_position, after_cursor.node_position);
                if (selected_component.type === Parse_tree_analysis.Component_type.Declaration) {
                    const module_declaration = selected_component.value as { core_module: Core.Module, declaration: Core.Declaration };
                    const location = Helpers.location_to_vscode_location(
                        Helpers.get_declaration_source_location(module_declaration.core_module, module_declaration.declaration)
                    );
                    if (location !== undefined) {
                        return [location];
                    }
                }
                else if (selected_component.type === Parse_tree_analysis.Component_type.Member_name) {
                    const previous_component = components[components.length - 2];
                    if (previous_component !== undefined && previous_component.type === Parse_tree_analysis.Component_type.Declaration) {
                        const module_declaration = previous_component.value as { core_module: Core.Module, declaration: Core.Declaration };
                        const underlying_module_declaration = await Parse_tree_analysis.get_underlying_type_declaration(module_declaration.core_module, module_declaration.declaration, get_core_module);
                        if (underlying_module_declaration !== undefined) {
                            const location = Helpers.location_to_vscode_location(
                                Helpers.get_declaration_member_source_location(underlying_module_declaration.core_module, underlying_module_declaration.declaration, selected_component.value as string)
                            );
                            if (location !== undefined) {
                                return [location];
                            }
                        }
                    }
                }
            }
        }
        else if (ancestor.node.word.value === "Expression_call") {
            const module_function = await Parse_tree_analysis.get_function_value_from_node(server_data.language_description, core_module, ancestor.node.children[0], get_core_module);
            if (module_function !== undefined) {
                const location = Helpers.location_to_vscode_location(
                    Helpers.get_function_declaration_source_location(module_function.core_module, module_function.function_value.declaration)
                );
                if (location !== undefined) {
                    return [location];
                }
            }
        }
        else if (ancestor.node.word.value === "Expression_instantiate") {
            const instantiate_struct_member_info = await Parse_tree_analysis.find_instantiate_struct_member_from_node(server_data.language_description, core_module, root, before_cursor.node_position, false, get_core_module);
            if (instantiate_struct_member_info !== undefined) {
                const location = Helpers.location_to_vscode_location(
                    Helpers.get_struct_member_source_location(instantiate_struct_member_info.core_module, instantiate_struct_member_info.struct_declaration, instantiate_struct_member_info.member_index)
                );
                if (location !== undefined) {
                    return [location];
                }
            }
        }
    }

    return [];
}
