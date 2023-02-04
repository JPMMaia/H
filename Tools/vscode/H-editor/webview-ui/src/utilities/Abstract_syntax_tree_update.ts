import * as Abstract_syntax_tree_helpers from "./Abstract_syntax_tree_helpers";
import type * as Core from "../../../src/utilities/coreModelInterface";
import * as Change from "../../../src/utilities/Change";

function get_node_child_elements(node_tree: Abstract_syntax_tree_helpers.Node): Abstract_syntax_tree_helpers.Node[] {
    if (node_tree.data_type === Abstract_syntax_tree_helpers.Node_data_type.List) {
        const data = node_tree.data as Abstract_syntax_tree_helpers.List_data;
        return data.elements;
    }

    return [];
}

function update_declarations_node_tree(module: Core.Module, declarations: Core.Module_declarations, parent_node: Abstract_syntax_tree_helpers.Node[], declaration_nodes: Abstract_syntax_tree_helpers.Node[], change_hierarchy: Change.Hierarchy, position: any[]): void {

    for (const change of change_hierarchy.changes) {

        if (change.type === Change.Type.Add_element_to_vector) {
            const change_value = change.value as Change.Add_element_to_vector;

            // Add new node tree element to the end
            //Abstract_syntax_tree_helpers.create_function_node_tree(parent, declaration_nodes.length, module,)
        }
        else if (change.type === Change.Type.Remove_element_of_vector) {
            // Find node tree element and remove it
        }
    }
}

function update_definitions_node_tree(definitions: Core.Module_definitions, declaration_nodes: Abstract_syntax_tree_helpers.Node[], change_hierarchy: Change.Hierarchy, position: any[]): void {
}

export function update_module_node_tree(module: Core.Module, module_node_tree_reference: any, change_hierarchy: Change.Hierarchy): void {
    for (const change of change_hierarchy.changes) {
        if (change.type === Change.Type.Initialize) {
            module_node_tree_reference.value = Abstract_syntax_tree_helpers.create_module_code_tree(module);
        }
    }

    for (const pair of change_hierarchy.children) {
        const child_changes = pair.hierarchy;
        const child_position = pair.position;

        if (child_position[0] === "export_declarations" || child_position[0] === "internal_declarations") {
            const declarations = child_position[0] === "export_declarations" ? module.export_declarations : module.internal_declarations;
            const declaration_nodes = get_node_child_elements(module_node_tree_reference.value);
            //update_declarations_node_tree(declarations, declaration_nodes, child_changes, child_position);
        }
        else if (child_position[0] === "definitions") {
            const declaration_nodes = get_node_child_elements(module_node_tree_reference.value);
            update_definitions_node_tree(module.definitions, declaration_nodes, child_changes, child_position);
        }
    }
}