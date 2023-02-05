import * as Abstract_syntax_tree_helpers from "./Abstract_syntax_tree_helpers";

export interface Keyboard_event {
    key: string
}

export interface Selection {
    begin: number;
    end: number;
}

export enum Action_type {
    Select
}

export interface Select_data {
    node: Abstract_syntax_tree_helpers.Node;
    selection: Selection;
}

export interface Action {
    type: Action_type;
    data: Select_data | undefined;
}

function is_node_editable(node: Abstract_syntax_tree_helpers.Node): boolean {
    switch (node.metadata.type) {
        case Abstract_syntax_tree_helpers.Metadata_type.Separator:
            return false;
        default:
            return true;
    }
}

function find_previous_editable_node(node: Abstract_syntax_tree_helpers.Node): Abstract_syntax_tree_helpers.Node | undefined {
    const do_not_skip = (_: Abstract_syntax_tree_helpers.Node) => false;
    return Abstract_syntax_tree_helpers.iterate_backward_and_skip_until(node, do_not_skip, is_node_editable).node;
}

function create_move_cursor_left_action(node: Abstract_syntax_tree_helpers.Node, selection: Selection): Action[] {

    if (selection.begin > 0) {
        const data: Select_data = {
            node: node,
            selection: {
                begin: selection.begin - 1,
                end: selection.end - 1
            }
        };

        return [
            {
                type: Action_type.Select,
                data: data
            }
        ];
    }
    else if (selection.begin === 0) {
        const previous_editable_node = find_previous_editable_node(node);
        // TODO handle collapsible node?
        if (previous_editable_node === undefined || previous_editable_node.data_type === Abstract_syntax_tree_helpers.Node_data_type.List) {
            return [];
        }

        const previous_editable_node_string_value = (previous_editable_node.data as Abstract_syntax_tree_helpers.String_data).value;

        const data: Select_data = {
            node: previous_editable_node,
            selection: {
                begin: previous_editable_node_string_value.length,
                end: previous_editable_node_string_value.length
            }
        };

        return [
            {
                type: Action_type.Select,
                data: data
            }
        ];
    }
    else {
        return [];
    }
}

export function get_key_down_actions(node: Abstract_syntax_tree_helpers.Node, event: Keyboard_event, selections: Selection[]): Action[] {

    if (event.key === "ArrowLeft") {

        const actions: Action[] = [];

        for (const selection of selections) {
            actions.push(...create_move_cursor_left_action(node, selection));
        }

        return actions;
    }

    return [];
}
