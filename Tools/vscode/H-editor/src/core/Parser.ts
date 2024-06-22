import * as Grammar from "./Grammar";
import * as Fast_array_diff from "fast-array-diff";
import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";
import * as Scanner from "./Scanner";
import * as Validation from "./Validation";
import { clone_node, find_descendant_position_if, find_node_common_root, get_next_terminal_node, get_next_sibling_terminal_node, get_node_at_position, get_parent_position, get_rightmost_brother, get_rightmost_terminal_descendant, have_same_parent, is_same_position, is_terminal_node, is_valid_position, join_all_child_node_values, Node, iterate_backward, } from "./Parser_node";

const g_debug = false;

function get_all_stack_elements_on_tree(
    original_node_tree: Node | undefined,
    mark_position: number[] | undefined,
    mark: Node
): Parsing_stack_element[] {

    if (original_node_tree === undefined || mark_position === undefined) {
        return [
            {
                original_tree_position: [-1],
                node: create_bottom_of_stack_node()
            }
        ];
    }

    const elements: Parsing_stack_element[] = [];

    let current_position = mark_position;
    let current_node = mark;

    while (true) {
        elements.push({
            original_tree_position: current_position,
            node: current_node
        });

        const previous = get_previous_node_on_stack(original_node_tree, current_position);
        if (previous === undefined) {
            break;
        }
        current_position = previous.position;
        current_node = previous.node;
    }

    return elements.reverse();
}

function node_stack_to_string(
    original_node_tree: Node | undefined,
    mark_position: number[] | undefined,
    mark: Node,
    stack: Parsing_stack_element[]
): string {
    const tree_stack = get_all_stack_elements_on_tree(original_node_tree, mark_position, mark);

    const stack_strings = stack.map(element => `[${element.node.state},${element.node.word.value}]`).join(", ");
    const tree_strings = tree_stack.map(element => `[${element.node.state},${element.node.word.value}]`).join(", ");

    const all = [
        "[",
        tree_strings,
        " | ",
        stack_strings,
        "]"
    ].join("");

    return all;
}



function get_element_from_stack(
    original_node_tree: Node | undefined,
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    index: number
): Parsing_stack_element | undefined {

    if (index < stack.length) {
        const index_on_stack = (stack.length - 1) - index;
        return stack[index_on_stack];
    }
    else if (index >= stack.length && original_node_tree !== undefined && mark.original_tree_position !== undefined) {

        const count = index - stack.length;

        let current_position = mark.original_tree_position;
        let current_node = mark.node;

        for (let i = 0; i < count; ++i) {
            const previous = get_previous_node_on_stack(original_node_tree, current_position);
            if (previous === undefined) {
                return (i + 1) === count ? { original_tree_position: [-1], node: create_bottom_of_stack_node() } : undefined;
            }

            current_position = previous.position;
            current_node = previous.node;
        }

        return {
            original_tree_position: current_position,
            node: current_node
        };
    }
    else {
        return { original_tree_position: [-1], node: create_bottom_of_stack_node() };
    }
}

function get_top_of_stack(
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element
): Parsing_stack_element {

    if (stack.length > 0) {
        return stack[stack.length - 1];
    }
    else {
        return mark;
    }
}
function get_stack_elements_on_tree(
    original_node_tree: Node,
    position: number[],
    count: number
): Parsing_stack_element[] | undefined {

    const elements: Parsing_stack_element[] = [];

    let current_position = position;
    let current_node = get_node_at_position(original_node_tree, current_position);

    for (let index = 0; index < count; ++index) {

        elements.push({
            original_tree_position: current_position,
            node: current_node
        });

        const previous = get_previous_node_on_stack(original_node_tree, current_position);
        if (previous === undefined) {
            if (index + 1 !== count) {
                return undefined;
            }
            else {
                break;
            }
        }
        current_position = previous.position;
        current_node = previous.node;
    }

    return elements;
}

function get_top_elements_from_stack(
    original_node_tree: Node | undefined,
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    count: number,
    array_info: Grammar.Array_info | undefined,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): Parsing_stack_element[] | undefined {

    if (array_info !== undefined) {

        const is_node_part_of_array = (element_count: number, has_separator: boolean, node: Node): boolean => {

            const current_node_label = node.production_rule_index === undefined ? map_word_to_terminal(node.word) : node.word.value;

            if (has_separator) {
                if ((element_count % 2) === 0) {
                    const is_element = current_node_label === array_info.element_label;
                    return is_element;
                }
                else {
                    const is_separator = current_node_label === array_info.separator_label;
                    return is_separator;
                }
            }
            else {
                return current_node_label === array_info.element_label;
            }
        };

        const top_elements: Parsing_stack_element[] = [];
        const has_separator = array_info.separator_label.length > 0;

        // Iterate stack elements:
        for (let index = 0; index < stack.length; ++index) {

            const index_on_stack = stack.length - 1 - index;
            const current = stack[index_on_stack];

            if (!is_node_part_of_array(top_elements.length, has_separator, current.node)) {
                return top_elements;
            }

            top_elements.push(current);
        }

        // When the stack elements run out, check all sibling nodes of mark
        if (original_node_tree !== undefined && mark.original_tree_position !== undefined) {
            // TODO mark is already included in the stack?
            const mark_parent_position = get_parent_position(mark.original_tree_position);
            const mark_parent = get_node_at_position(original_node_tree, mark_parent_position);

            const mark_index = mark.original_tree_position[mark.original_tree_position.length - 1];

            for (let index_plus_one = mark_index + 1; index_plus_one > 0; --index_plus_one) {
                const index = index_plus_one - 1;

                const current_node_position = [...mark_parent_position, index];
                const current_node = mark_parent.children[index];

                if (!is_node_part_of_array(top_elements.length, has_separator, current_node)) {
                    return top_elements;
                }

                top_elements.push({
                    original_tree_position: current_node_position,
                    node: current_node
                });
            }
        }

        return top_elements;
    }
    else {
        const top_elements: Parsing_stack_element[] = [];

        const stack_node_count = count < stack.length ? count : stack.length;

        for (let index = 0; index < stack_node_count; ++index) {
            const index_on_stack = stack.length - 1 - index;
            const current_node = stack[index_on_stack];
            top_elements.push(current_node);
        }

        const tree_node_count = count - stack_node_count;

        if (original_node_tree !== undefined && mark.original_tree_position !== undefined) {

            const elements_on_tree = get_stack_elements_on_tree(original_node_tree, mark.original_tree_position, tree_node_count);
            if (elements_on_tree === undefined) {
                return undefined;
            }

            top_elements.push(...elements_on_tree);
        }

        return top_elements;
    }
}

function elements_have_same_parent(elements: Parsing_stack_element[]): boolean {

    if (elements.length <= 1) {
        return true;
    }

    const positions = elements.filter(element => element.original_tree_position !== undefined).map(element => element.original_tree_position) as number[][];
    return have_same_parent(positions);
}

export function get_previous_node_on_stack(root: Node, current_position: number[]): { node: Node, position: number[] } | undefined {

    // If bottom of stack:
    if (current_position.length === 1 && current_position[0] === -1) {
        return undefined;
    }

    while (current_position.length > 0) {
        const parent_node_position = current_position.slice(0, current_position.length - 1);
        const parent_node = get_node_at_position(root, parent_node_position);

        const current_child_index = current_position[current_position.length - 1];
        if (current_child_index > 0) {
            const previous_sibling_index = current_child_index - 1;
            const previous_sibling_node_position = [...parent_node_position, previous_sibling_index];
            const previous_sibling_node = parent_node.children[previous_sibling_index];

            return {
                node: previous_sibling_node,
                position: previous_sibling_node_position
            };
        }

        current_position = parent_node_position;
    }

    return {
        node: create_bottom_of_stack_node(),
        position: [-1]
    };
}

export function parse(document_uri: string, input: Scanner.Scanned_word[], parsing_table: Grammar.Action_column[][], go_to_table: Grammar.Go_to_column[][], array_infos: Map<string, Grammar.Array_info>, map_word_to_terminal: (word: Scanner.Scanned_word) => string): { parse_tree: Node | undefined, diagnostics: Validation.Diagnostic[] } {

    const result = parse_incrementally(
        document_uri,
        undefined,
        undefined,
        input,
        undefined,
        parsing_table,
        go_to_table,
        array_infos,
        map_word_to_terminal
    );

    if (result.status !== Parse_status.Accept) {
        return {
            parse_tree: undefined,
            diagnostics: result.diagnostics
        };
    }

    const change = result.changes[0].value as Modify_change;
    return {
        parse_tree: change.new_node,
        diagnostics: result.diagnostics
    };
}

export enum Parse_status {
    Accept,
    Failed,
    Continue
}

export enum Change_type {
    Add,
    Remove,
    Modify
}

export interface Change {
    type: Change_type,
    value: Add_change | Remove_change | Modify_change
}

export interface Add_change {
    parent_position: number[];
    index: number;
    new_nodes: Node[];
}

export function create_add_change(parent_position: number[], child_index: number, new_nodes: Node[]): Change {
    return {
        type: Change_type.Add,
        value: {
            parent_position: parent_position,
            index: child_index,
            new_nodes: new_nodes
        }
    };
}

export interface Remove_change {
    parent_position: number[];
    index: number;
    count: number;
}

export function create_remove_change(parent_position: number[], child_index: number, count: number): Change {
    return {
        type: Change_type.Remove,
        value: {
            parent_position: parent_position,
            index: child_index,
            count: count
        }
    };
}

export interface Modify_change {
    position: number[];
    new_node: Node;
}

export function create_modify_change(position: number[], new_node: Node): Change {
    return {
        type: Change_type.Modify,
        value: {
            position: position,
            new_node: new_node
        }
    };
}

function can_be_modiy_change(first: Change, second: Change): boolean {

    if (first.type === Change_type.Remove && second.type === Change_type.Add) {
        const remove_change = first.value as Remove_change;
        const add_change = second.value as Add_change;

        if (is_same_position(remove_change.parent_position, add_change.parent_position)) {
            if (remove_change.index === add_change.index && remove_change.count === 1 && add_change.new_nodes.length === 1) {
                return true;
            }
        }
    }

    return false;
}

export function simplify_changes(root: Node, changes: Change[]): Change[] {

    const simplified_changes: Change[] = [];

    for (let index = 0; index < changes.length; ++index) {
        const change = changes[index];

        if (change.type === Change_type.Remove && index + 1 < changes.length) {
            const next_change = changes[index + 1];
            if (can_be_modiy_change(change, next_change)) {
                const add_change = next_change.value as Add_change;
                const set_change = create_modify_change([...add_change.parent_position, add_change.index], add_change.new_nodes[0]);
                simplified_changes.push(set_change);
                index += 1;
                continue;
            }
        }

        simplified_changes.push(change);
    }

    const simplified_changes_2 = apply_module_change_simplications(root, simplified_changes);
    return simplified_changes_2;
}


function get_value_of_node_in_trees(node_0: Node, node_1: Node, key: string, transform: (node: Node) => any): { value_0: any, value_1: any, position: number[] } {

    const value_node_0 = find_descendant_position_if(node_0, node => node.word.value === key) as { node: Node, position: number[] };
    const value_node_1 = get_node_at_position(node_1, value_node_0.position);

    const value_0 = transform(value_node_0.node);
    const value_1 = transform(value_node_1);

    return {
        value_0: value_0,
        value_1: value_1,
        position: value_node_0.position
    };
}

function apply_patch(children_0: Node[], children_1: Node[], parent_position: number[]): Change[] {

    const changes: Change[] = [];

    const patches = Fast_array_diff.getPatch(children_0, children_1, deep_equal);

    for (const patch of patches) {
        if (patch.type === "add") {
            const new_change = create_add_change(parent_position, patch.newPos, patch.items);
            changes.push(new_change);
        }
        else if (patch.type === "remove") {
            const new_change = create_remove_change(parent_position, patch.newPos, patch.items.length);
            changes.push(new_change);
        }
    }

    return changes;
}

function apply_module_change_simplications(root: Node, parse_tree_changes: Change[]): Change[] {

    if (parse_tree_changes.length === 0) {
        return parse_tree_changes;
    }

    if (parse_tree_changes[0].type === Change_type.Modify) {
        const change = parse_tree_changes[0].value as Modify_change;

        const new_node = change.new_node;

        if (new_node.word.value === "Module") {
            const new_changes: Change[] = [];

            {
                const values = get_value_of_node_in_trees(root, new_node, "Module_name", join_all_child_node_values);
                if (values.value_0 !== values.value_1) {
                    const new_change = create_modify_change(values.position, values.value_1);
                    new_changes.push(new_change);
                }
            }

            {
                const root_imports = find_descendant_position_if(root, node => node.word.value === "Imports") as { node: Node, position: number[] };
                const new_imports_node = get_node_at_position(new_node, root_imports.position);

                const patch_changes = apply_patch(root_imports.node.children, new_imports_node.children, root_imports.position);
                new_changes.push(...patch_changes);
            }

            {
                const root_declarations = find_descendant_position_if(root, node => node.word.value === "Module_body") as { node: Node, position: number[] };
                const new_declarations_node = get_node_at_position(new_node, root_declarations.position);

                const patch_changes = apply_patch(root_declarations.node.children, new_declarations_node.children, root_declarations.position);
                new_changes.push(...patch_changes);
            }

            return new_changes;
        }
    }

    return parse_tree_changes;
}

function deep_equal(obj1: any, obj2: any): boolean {

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        return obj1 === obj2;
    }

    if (obj1 === null && obj2 === null) {
        return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (!deep_equal(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}

export interface Words_change {
    range_offset: number;
    range_length: number;
    new_words: Scanner.Scanned_word[];
}

function create_bottom_of_stack_node(): Node {
    return {
        word: { value: "$", type: Grammar.Word_type.Symbol, source_location: { line: 1, column: 1 } },
        state: 0,
        production_rule_index: undefined,
        children: []
    };
}

function get_next_word(
    new_words: Scanner.Scanned_word[],
    current_word_index: number,
    original_node_tree: Node | undefined,
    after_change_node_position: number[] | undefined
): Scanner.Scanned_word {

    if (current_word_index < new_words.length) {
        return new_words[current_word_index];
    }

    if (original_node_tree !== undefined && after_change_node_position !== undefined && is_valid_position(original_node_tree, after_change_node_position)) {
        const node = get_node_at_position(original_node_tree, after_change_node_position);
        return node.word;
    }

    return { value: "$", type: Grammar.Word_type.Symbol, source_location: { line: 1, column: 1 } };
}

function get_end_of_tree(root: Node): { position: number[], node: Node } | undefined {

    let current_position: number[] = [];
    let current_node = root;

    while (current_node.children.length > 0) {
        current_position.push(current_node.children.length - 1);
        current_node = current_node.children[current_node.children.length - 1];
    }

    while (current_node.word.value === "" || current_node.production_rule_index !== undefined) {
        const result = iterate_backward(root, current_node, current_position);
        if (result === undefined) {
            return undefined;
        }

        current_node = result.previous_node;
        current_position = result.previous_position;
    }

    return {
        position: current_position,
        node: current_node
    };
}

interface Parsing_stack_element {
    original_tree_position: number[] | undefined;
    node: Node;
}

function adjust_mark_and_stack(original_node_tree: Node | undefined, stack: Parsing_stack_element[], mark: Parsing_stack_element, elements_to_reduce: Parsing_stack_element[]): { success: boolean, new_mark: Parsing_stack_element } {

    const mark_index = elements_to_reduce.findIndex(element => element.node === mark.node);
    if (mark_index !== -1) {
        const new_mark = get_element_from_stack(original_node_tree, stack, mark, elements_to_reduce.length);
        if (new_mark === undefined) {
            return {
                success: false,
                new_mark: mark
            };
        }

        const elements_to_add_to_stack = elements_to_reduce.slice(mark_index, elements_to_reduce.length);
        elements_to_add_to_stack.reverse();
        stack.splice(0, 0, ...elements_to_add_to_stack);

        return {
            success: true,
            new_mark: new_mark
        };
    }

    return {
        success: true,
        new_mark: mark
    };
}

function is_last_descendant_empty(node: Node): boolean {

    if (node.children.length === 0) {
        return node.production_rule_index !== undefined;
    }

    const child = node.children[node.children.length - 1];
    return is_last_descendant_empty(child);
}

function get_initial_mark_node(original_node_tree: Node | undefined, start_change_node_position: number[] | undefined, array_infos: Map<string, Grammar.Array_info>): Parsing_stack_element {

    if (original_node_tree === undefined) {
        return {
            original_tree_position: undefined,
            node: create_bottom_of_stack_node()
        };
    }

    const start_at_end_position = start_change_node_position === undefined || !is_valid_position(original_node_tree, start_change_node_position);

    if (start_at_end_position) {
        const end = get_end_of_tree(original_node_tree);
        if (end === undefined) {
            return {
                original_tree_position: undefined,
                node: create_bottom_of_stack_node()
            };
        }
        return {
            original_tree_position: end.position,
            node: end.node
        };
    }
    else {
        let previous = get_previous_node_on_stack(original_node_tree, start_change_node_position) as { node: Node, position: number[] };

        while (true) {

            if (is_terminal_node(previous.node) && !array_infos.has(previous.node.word.value)) {
                break;
            }

            if (previous.node.children.length > 0) {
                previous = {
                    node: previous.node.children[previous.node.children.length - 1],
                    position: [...previous.position, previous.node.children.length - 1]
                };
            }
            else {
                previous = get_previous_node_on_stack(original_node_tree, previous.position) as { node: Node, position: number[] };
            }
        }

        return {
            original_tree_position: previous.position,
            node: previous.node
        };
    }
}

function print_array_changes(changes: Change[]): void {

    if (changes.length === 0) {
        return;
    }

    const has_delete_changes = changes[0].type === Change_type.Remove;
    if (has_delete_changes) {
        const delete_change = changes[0].value as Remove_change;
        console.log(`- delete ${delete_change.count} nodes at position [${delete_change.parent_position},${delete_change.index}]`);
    }

    const has_add_changes = changes[0].type === Change_type.Add || (changes.length === 2 && changes[1].type === Change_type.Add);
    if (has_add_changes) {
        const add_change = changes[changes.length - 1].value as Add_change;
        const nodes_string = add_change.new_nodes.map(node => node.word.value).join(" ");
        console.log(`- add ${add_change.new_nodes.length} nodes at position [${add_change.parent_position},${add_change.index}]: ${nodes_string}`);
    }
}

export function get_allowed_labels(
    original_node_tree: Node | undefined,
    start_change_node_position: number[] | undefined,
    array_infos: Map<string, Grammar.Array_info>,
    parsing_table: Grammar.Action_column[][]
): string[] {
    const mark = get_initial_mark_node(original_node_tree, start_change_node_position, array_infos);
    const top_of_stack = get_top_of_stack([], mark);
    const row = parsing_table[top_of_stack.node.state];
    const allowed_labels = row.map(value => value.label);
    return allowed_labels;
}

export function parse_incrementally(
    document_uri: string,
    original_node_tree: Node | undefined,
    start_change_node_position: number[] | undefined,
    new_words: Scanner.Scanned_word[],
    after_change_node_position: number[] | undefined,
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[], diagnostics: Validation.Diagnostic[] } {

    let mark = get_initial_mark_node(original_node_tree, start_change_node_position, array_infos);

    const stack: Parsing_stack_element[] = [];

    let current_word_index = 0;

    while (current_word_index <= new_words.length) {

        const top_of_stack = get_top_of_stack(stack, mark);

        const current_word = get_next_word(new_words, current_word_index, original_node_tree, after_change_node_position);

        const row = parsing_table[top_of_stack.node.state];
        const terminal = map_word_to_terminal(current_word);
        const column = row.find(column => column.label === terminal);

        if (column === undefined) {

            const error_message = `Did not expect '${current_word.value}'.`;

            const diagnostic: Validation.Diagnostic = {
                location: {
                    uri: document_uri,
                    range: {
                        start: {
                            line: current_word.source_location.line,
                            column: current_word.source_location.column
                        },
                        end: {
                            line: current_word.source_location.line,
                            column: current_word.source_location.column + current_word.value.length
                        }
                    }
                },
                source: Validation.Source.Parser,
                severity: Validation.Diagnostic_severity.Error,
                message: error_message,
                related_information: []
            };

            return {
                status: Parse_status.Failed,
                processed_words: current_word_index,
                changes: [],
                diagnostics: [diagnostic]
            };
        }

        const action = column.action;

        switch (action.type) {
            case Grammar.Action_type.Accept:
                {
                    const accept_action = action.value as Grammar.Accept_action;

                    // Handle add/delete elements at the end of an array:
                    {
                        const array_info = array_infos.get(top_of_stack.node.word.value);
                        if (array_info !== undefined && original_node_tree !== undefined) {

                            const has_separator = array_info.separator_label.length > 0;
                            const element_labels = has_separator ? [array_info.element_label, array_info.separator_label] : [array_info.element_label];

                            const initial_mark_node = get_initial_mark_node(original_node_tree, start_change_node_position, array_infos);
                            const before_start_element = initial_mark_node.original_tree_position !== undefined ? get_parent_node_with_labels_in_original_tree(original_node_tree, initial_mark_node.original_tree_position, element_labels, map_word_to_terminal) : undefined;
                            const start_element = (start_change_node_position !== undefined && is_valid_position(original_node_tree, start_change_node_position)) ? get_parent_node_with_labels_in_original_tree(original_node_tree, start_change_node_position, element_labels, map_word_to_terminal) : undefined;

                            const is_after_change_end_of_tree = after_change_node_position === undefined || !is_valid_position(original_node_tree, after_change_node_position);
                            const after_change_element = !is_after_change_end_of_tree ? get_parent_node_with_labels_in_original_tree(original_node_tree, after_change_node_position, element_labels, map_word_to_terminal) : undefined;

                            if (before_start_element !== undefined && (after_change_element !== undefined || is_after_change_end_of_tree)) {

                                const parent_position = get_parent_position(before_start_element.position);

                                const changes: Change[] = [];

                                // Handle deletes:
                                {
                                    const parent_node = get_node_at_position(original_node_tree, parent_position);
                                    const start_index = (start_element === undefined) ? parent_node.children.length : start_element.position[start_element.position.length - 1];
                                    const end_index = (after_change_element === undefined) ? parent_node.children.length : after_change_element.position[after_change_element.position.length - 1];
                                    const count = end_index - start_index;

                                    if (count > 0) {
                                        const delete_change = create_remove_change(parent_position, start_index, end_index - start_index);
                                        changes.push(delete_change);
                                    }
                                }

                                // Handle additions:
                                {
                                    const start_index = before_start_element.position[before_start_element.position.length - 1] + 1;
                                    const end_index = top_of_stack.node.children.length;

                                    const new_nodes = top_of_stack.node.children.slice(start_index, end_index);

                                    if (new_nodes.length > 0) {
                                        const add_change = create_add_change(parent_position, start_index, new_nodes);
                                        changes.push(add_change);
                                    }
                                }

                                if (changes.length > 0) {

                                    if (g_debug) {
                                        console.log(`accept array changes:`);
                                        print_array_changes(changes);
                                    }

                                    return {
                                        status: Parse_status.Accept,
                                        processed_words: current_word_index,
                                        changes: changes,
                                        diagnostics: []
                                    };
                                }
                            }
                        }
                    }

                    const children = get_top_elements_from_stack(original_node_tree, stack, mark, accept_action.rhs_count, array_infos.get(accept_action.lhs), map_word_to_terminal) as Parsing_stack_element[];
                    children.reverse();

                    const source_location: Scanner.Source_location =
                        children.length > 0 ?
                            children[0].node.word.source_location :
                            { line: 1, column: 1 };

                    const new_node: Node = {
                        word: { value: accept_action.lhs, type: Grammar.Word_type.Symbol, source_location: source_location },
                        state: -1,
                        production_rule_index: 0,
                        children: children.map(element => element.node)
                    };

                    if (g_debug) {
                        const stack_description = node_stack_to_string(original_node_tree, mark.original_tree_position, mark.node, stack);
                        const rhs_string = new_node.children.map(node => node.word.value).join(" ");
                        console.log(`accept ${accept_action.lhs} -> ${rhs_string} ${stack_description}`);
                    }

                    return {
                        status: Parse_status.Accept,
                        processed_words: current_word_index,
                        changes: [
                            create_modify_change([], new_node)
                        ],
                        diagnostics: []
                    };
                }
            case Grammar.Action_type.Shift:
                {
                    {
                        const result = parse_incrementally_after_changes_if_ready(original_node_tree, start_change_node_position, new_words, current_word_index, after_change_node_position, stack, mark, undefined, parsing_table, go_to_table, array_infos, map_word_to_terminal);
                        if (result !== undefined) {
                            return result;
                        }
                    }

                    const shift_action = action.value as Grammar.Shift_action;

                    const node_to_shift = create_bottom_of_stack_node();
                    node_to_shift.word = current_word;
                    apply_shift(stack, node_to_shift, undefined, shift_action.next_state, original_node_tree, mark);
                    current_word_index += 1;

                    break;
                }
            case Grammar.Action_type.Reduce:
                {
                    const reduce_action = action.value as Grammar.Reduce_action;

                    const elements_to_reduce = get_top_elements_from_stack(original_node_tree, stack, mark, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);
                    if (elements_to_reduce === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: [],
                            diagnostics: []
                        };
                    }

                    {
                        const result = parse_incrementally_after_changes_if_ready(original_node_tree, start_change_node_position, new_words, current_word_index, after_change_node_position, stack, mark, elements_to_reduce, parsing_table, go_to_table, array_infos, map_word_to_terminal);
                        if (result !== undefined) {
                            return result;
                        }
                    }

                    {
                        const result = adjust_mark_and_stack(original_node_tree, stack, mark, elements_to_reduce);
                        if (result === undefined) {
                            return {
                                status: Parse_status.Failed,
                                processed_words: 1,
                                changes: [],
                                diagnostics: []
                            };
                        }
                        mark = result.new_mark;
                    }

                    const new_node = create_bottom_of_stack_node();

                    const result = apply_reduction(
                        new_node,
                        reduce_action.production_rule_index,
                        reduce_action.lhs,
                        reduce_action.rhs_count,
                        array_infos.get(reduce_action.lhs),
                        original_node_tree,
                        stack,
                        mark,
                        go_to_table,
                        current_word,
                        undefined,
                        map_word_to_terminal
                    );

                    if (!result.success) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: [],
                            diagnostics: []
                        };
                    }

                    break;
                }
            default:
                break;
        }
    }

    return {
        status: Parse_status.Failed,
        processed_words: current_word_index,
        changes: [],
        diagnostics: []
    };
}

function parse_incrementally_after_changes_if_ready(
    original_node_tree: Node | undefined,
    start_change_node_position: number[] | undefined,
    new_words: Scanner.Scanned_word[],
    current_word_index: number,
    after_change_node_position: number[] | undefined,
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    elements_to_reduce: Parsing_stack_element[] | undefined,
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[], diagnostics: Validation.Diagnostic[] } | undefined {
    if (current_word_index === new_words.length && original_node_tree !== undefined && start_change_node_position !== undefined && after_change_node_position !== undefined && after_change_node_position.length > 0) {
        if (elements_to_reduce === undefined || elements_to_reduce.length === 0) {
            const result = parse_incrementally_after_change(
                original_node_tree,
                start_change_node_position,
                after_change_node_position,
                stack,
                mark,
                parsing_table,
                go_to_table,
                array_infos,
                map_word_to_terminal
            );

            if (result.status === Parse_status.Accept) {
                return {
                    status: Parse_status.Accept,
                    processed_words: new_words.length + result.processed_words,
                    changes: result.changes,
                    diagnostics: []
                };
            }
            else {
                return {
                    status: Parse_status.Failed,
                    processed_words: 1,
                    changes: [],
                    diagnostics: []
                };
            }
        }
    }
    else {
        return undefined;
    }
}

function apply_shift(
    stack: Parsing_stack_element[],
    node_to_shift: Node,
    original_node_position: number[] | undefined,
    state: number,
    original_node_tree: Node | undefined,
    mark: Parsing_stack_element
): void {

    node_to_shift.state = state;

    stack.push({
        original_tree_position: original_node_position,
        node: node_to_shift
    });

    if (g_debug) {
        const stack_description = node_stack_to_string(original_node_tree, mark.original_tree_position, mark.node, stack);
        console.log(`shift ${stack_description} `);
    }
}

function find_original_node_position_of_reduced_node(
    original_node_tree: Node | undefined,
    next_word_position: number[] | undefined,
    production_rule_index: number,
    children_elements: Parsing_stack_element[]
): number[] | undefined {

    if (children_elements.length === 0) {
        if (original_node_tree !== undefined && next_word_position !== undefined) {
            const previous = get_previous_node_on_stack(original_node_tree, next_word_position);
            if (previous !== undefined) {
                if (previous.node.production_rule_index === production_rule_index) {
                    return previous.position;
                }
            }
        }
    }
    else if (children_elements.length === 1) {
        const position = children_elements[0].original_tree_position;
        if (position !== undefined) {
            const parent_position = get_parent_position(position);
            return parent_position;
        }
    }
    else if (elements_have_same_parent(children_elements)) {

        const child_position = children_elements.find(element => element.original_tree_position !== undefined);
        if (child_position === undefined) {
            return undefined;
        }

        const parent_position = get_parent_position(child_position.original_tree_position as number[]);
        return parent_position;
    }

    return undefined;
}

function apply_reduction(
    node: Node,
    production_rule_index: number,
    production_lhs: string,
    production_rhs_count: number,
    production_array_info: Grammar.Array_info | undefined,
    original_node_tree: Node | undefined,
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    go_to_table: Grammar.Go_to_column[][],
    next_word: Scanner.Scanned_word,
    next_word_position: number[] | undefined,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { success: boolean } {

    const children = get_top_elements_from_stack(original_node_tree, stack, mark, production_rhs_count, production_array_info, map_word_to_terminal);
    if (children === undefined) {
        return {
            success: false
        };
    }

    children.reverse();

    const previous_node_after_reduction = get_element_from_stack(original_node_tree, stack, mark, children.length);
    if (previous_node_after_reduction === undefined) {
        return {
            success: false
        };
    }

    const go_to_row = go_to_table[previous_node_after_reduction.node.state];
    const go_to_column = go_to_row.find(column => column.label === production_lhs);
    if (go_to_column === undefined) {
        return {
            success: false
        };
    }

    node.children = children.map(element => element.node);

    const source_location: Scanner.Source_location =
        children.length > 0 ?
            children[0].node.word.source_location :
            next_word.source_location;

    node.word = { value: production_lhs, type: Grammar.Word_type.Symbol, source_location: source_location };
    node.state = go_to_column.next_state;
    node.production_rule_index = production_rule_index;

    if (children.length > 0) {
        const remove_index = stack.length - children.length;
        stack.splice(remove_index, children.length);
    }

    const original_tree_position = find_original_node_position_of_reduced_node(original_node_tree, next_word_position, production_rule_index, children);

    stack.push({
        original_tree_position: original_tree_position,
        node: node
    });

    if (g_debug) {
        const stack_description = node_stack_to_string(original_node_tree, mark.original_tree_position, mark.node, stack);
        const rhs = node.children.map(node => node.word.value).join(" ");
        console.log(`reduce ${production_lhs} -> ${rhs} ${stack_description} ${next_word.value} `);
    }

    return {
        success: true
    };
}

function matching_condition_holds(
    original_node_tree: Node,
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    production_lhs: string,
    production_rhs_count: number,
    production_array_info: Grammar.Array_info | undefined,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): boolean {

    const elements_to_reduce = get_top_elements_from_stack(original_node_tree, stack, mark, production_rhs_count, production_array_info, map_word_to_terminal);
    if (elements_to_reduce === undefined) {
        return false;
    }

    const mark_index = elements_to_reduce.findIndex(element => element.node === mark.node);
    if (mark_index === -1) {
        return false;
    }

    const mark_parent_position = get_parent_position(mark.original_tree_position as number[]);
    const mark_parent_node = get_node_at_position(original_node_tree, mark_parent_position);

    const elements_to_reduce_before_mark = elements_to_reduce.slice(mark_index + 1, elements_to_reduce.length);

    for (const element of elements_to_reduce_before_mark) {
        const element_parent_position = get_parent_position(element.original_tree_position as number[]);

        if (!is_same_position(element_parent_position, mark_parent_position)) {
            return false;
        }
    }

    const element_before_reduction = get_element_from_stack(original_node_tree, stack, mark, production_rhs_count);
    if (element_before_reduction !== undefined) {
        const element_before_reduction_parent_position = get_parent_position(element_before_reduction?.original_tree_position as number[]);
        if (is_same_position(element_before_reduction_parent_position, mark_parent_position)) {
            return false;
        }
    }

    if (mark_parent_node.word.value !== production_lhs) {
        return false;
    }

    const top_of_stack = elements_to_reduce[0];
    const top_rightmost_descendant = get_rightmost_terminal_descendant(top_of_stack.node);
    const mark_parent_rightmost_descendant = get_rightmost_terminal_descendant(mark_parent_node);

    if (top_rightmost_descendant.value !== mark_parent_rightmost_descendant.value || top_rightmost_descendant.type !== mark_parent_rightmost_descendant.type) {
        return false;
    }

    return true;
}

function create_apply_matching_changes(
    original_node_tree: Node,
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    production_rhs_count: number,
    production_array_info: Grammar.Array_info | undefined,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): Change[] {

    const mark_parent_position = get_parent_position(mark.original_tree_position as number[]);
    const mark_parent_node = get_node_at_position(original_node_tree, mark_parent_position);

    const top_nodes = get_top_elements_from_stack(original_node_tree, stack, mark, production_rhs_count, production_array_info, map_word_to_terminal) as Parsing_stack_element[];
    top_nodes.reverse();

    const mark_parent_clone: Node = {
        word: { value: mark_parent_node.word.value, type: mark_parent_node.word.type, source_location: { line: mark_parent_node.word.source_location.line, column: mark_parent_node.word.source_location.column } },
        state: mark_parent_node.state,
        production_rule_index: mark_parent_node.production_rule_index,
        children: top_nodes.map(value => value.node)
    };
    if (mark_parent_clone.word.newlines_after !== undefined) {
        mark_parent_clone.word.newlines_after = mark_parent_node.word.newlines_after;
    }

    if (g_debug) {
        const stack_description = node_stack_to_string(original_node_tree, mark.original_tree_position, mark.node, stack);
        const new_node = mark_parent_clone;
        const position_string = "[" + mark_parent_position.join(",") + "]";
        const rhs_string = new_node.children.map(node => node.word.value).join(" ");
        console.log(`accept matching condition at position ${position_string}: ${new_node.word.value} -> ${rhs_string} ${stack_description}`);
    }

    const modify_change = create_modify_change(mark_parent_position, mark_parent_clone);
    return [modify_change];
}

function get_array_elements_from_stack_until_mark(original_node_tree: Node, stack: Parsing_stack_element[], mark: Parsing_stack_element, array_info: Grammar.Array_info, map_word_to_terminal: (word: Scanner.Scanned_word) => string): Parsing_stack_element[] {
    const elements: Parsing_stack_element[] = [];

    let current_element = get_top_of_stack(stack, mark);

    const has_separator = array_info.separator_label.length > 0;
    let expect_separator = has_separator ? map_word_to_terminal(current_element.node.word) === array_info.separator_label : false;

    let index = 0;

    while (true) {

        const terminal = map_word_to_terminal(current_element.node.word);

        if (has_separator) {
            if (expect_separator) {
                if (terminal !== array_info.separator_label) {
                    break;
                }
            }
            else {
                if (terminal !== array_info.element_label) {
                    break;
                }
            }

            expect_separator = !expect_separator;
        }
        else {
            if (terminal !== array_info.element_label) {
                break;
            }
        }

        elements.push(current_element);

        if (current_element.node === mark.node) {
            break;
        }

        index += 1;
        const previous_element_on_stack = get_element_from_stack(original_node_tree, stack, mark, index);
        if (previous_element_on_stack === undefined) {
            break;
        }

        current_element = previous_element_on_stack;
    }

    elements.reverse();

    return elements;
}

function get_parent_node_with_labels_in_original_tree(original_node_tree: Node, position: number[], labels: string[], map_word_to_terminal: (word: Scanner.Scanned_word) => string): { node: Node, position: number[] } | undefined {

    // If bottom of stack:
    if (position.length === 1 && position[0] === -1) {
        return undefined;
    }

    let current_node = get_node_at_position(original_node_tree, position);
    let current_position = position;

    while (true) {
        const current_node_label = current_node.production_rule_index !== -1 ? map_word_to_terminal(current_node.word) : current_node.word.value;

        const found = labels.findIndex(label => current_node_label === label);
        if (found !== -1) {
            return {
                node: current_node,
                position: current_position
            };
        }

        if (current_position.length === 0) {
            return undefined;
        }

        const parent_position = get_parent_position(current_position);

        if (parent_position === undefined) {
            return undefined;
        }

        current_node = get_node_at_position(original_node_tree, parent_position);
        current_position = parent_position;
    }
}

function get_parent_array_element(
    target_label: string,
    original_node_tree: Node,
    start_change_original_node_position: number[] | undefined,
    after_change_original_node_position: number[] | undefined,
    stack: Parsing_stack_element[],
    index_on_stack: number,
    mark: Parsing_stack_element,
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { parent: Node, position: number[], array_info: Grammar.Array_info } | undefined {

    const child_position_at_add_location = start_change_original_node_position !== undefined ? start_change_original_node_position : mark.original_tree_position as number[];
    const node_at_add_location = get_parent_node_with_labels_in_original_tree(original_node_tree, child_position_at_add_location, [target_label], map_word_to_terminal);

    if (node_at_add_location !== undefined) {
        const parent_position = get_parent_position(node_at_add_location.position);
        const parent_node = get_node_at_position(original_node_tree, parent_position);

        const array_info = array_infos.get(parent_node.word.value);
        if (array_info !== undefined && (array_info.element_label === target_label || (array_info.separator_label === target_label))) {
            return {
                parent: parent_node,
                position: parent_position,
                array_info: array_info
            };
        }
    }
    else {
        const previous_node_on_stack = get_element_from_stack(original_node_tree, stack, mark, index_on_stack);
        if (previous_node_on_stack !== undefined && after_change_original_node_position !== undefined) {
            const previous_node_label = map_word_to_terminal(previous_node_on_stack.node.word);

            const next_node = get_parent_node_with_labels_in_original_tree(original_node_tree, after_change_original_node_position, [previous_node_label], map_word_to_terminal);
            if (next_node !== undefined) {
                const result = get_parent_array_element(previous_node_label, original_node_tree, start_change_original_node_position, after_change_original_node_position, stack, index_on_stack + 1, mark, array_infos, map_word_to_terminal);
                if (result !== undefined) {
                    if (result.array_info.element_label === target_label && result.array_info.separator_label === previous_node_label) {
                        return result;
                    }
                    else if (result.array_info.element_label === previous_node_label && result.array_info.separator_label === target_label) {
                        return result;
                    }
                }
            }
        }
    }

    if (start_change_original_node_position !== undefined && after_change_original_node_position !== undefined) {
        const parent_node_position = find_node_common_root(start_change_original_node_position, after_change_original_node_position);
        const parent_node = get_node_at_position(original_node_tree, parent_node_position);
        const array_info = array_infos.get(parent_node.word.value);
        if (array_info !== undefined) {
            return {
                parent: parent_node,
                position: parent_node_position,
                array_info: array_info
            };
        }
    }

    return undefined;
}

function find_array_element_child_index(array_node_position: number[], child_node_position: number[]): number {
    return child_node_position[array_node_position.length];
}

function handle_array_changes(
    original_node_tree: Node,
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    start_change_original_node_position: number[],
    after_change_original_node_position: number[],
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): Change[] | undefined {

    const changes: Change[] = [];

    {
        const top_of_stack = get_top_of_stack(stack, mark);
        const top_of_stack_label = map_word_to_terminal(top_of_stack.node.word);

        const result = get_parent_array_element(top_of_stack_label, original_node_tree, start_change_original_node_position, after_change_original_node_position, stack, 1, mark, array_infos, map_word_to_terminal);
        if (result !== undefined) {
            const parent_node_position = result.position;
            const parent_node = result.parent;
            const array_info = result.array_info;

            const start_index_in_original = start_change_original_node_position[parent_node_position.length];
            const after_index_in_original = after_change_original_node_position[parent_node_position.length];
            const original_elements = parent_node.children.slice(start_index_in_original, after_index_in_original);

            const new_elements = stack.filter(element => {
                if (element.node.word.value === array_info.element_label || element.node.word.value === array_info.separator_label) {
                    if (element.original_tree_position !== undefined && element.original_tree_position.length >= parent_node_position.length) {
                        const index_in_original = element.original_tree_position[parent_node_position.length];
                        return start_index_in_original <= index_in_original && index_in_original < after_index_in_original;
                    }
                    else {
                        return true;
                    }
                }
            }).map(element => element.node);

            const patches = Fast_array_diff.getPatch(original_elements, new_elements, deep_equal);

            for (const patch of patches) {
                if (patch.type === "add") {
                    const new_change = create_add_change(parent_node_position, start_index_in_original + patch.newPos, patch.items);
                    changes.push(new_change);
                }
                else if (patch.type === "remove") {
                    const new_change = create_remove_change(parent_node_position, start_index_in_original + patch.newPos, patch.items.length);
                    changes.push(new_change);
                }
            }
        }
    }

    return changes.length > 0 ? changes : undefined;
}

export function apply_changes(node_tree: Node, changes: Change[]): void {

    for (const change of changes) {
        if (change.type === Change_type.Add) {
            const add_change = change.value as Add_change;
            const parent_node = get_node_at_position(node_tree, add_change.parent_position);
            parent_node.children.splice(add_change.index, 0, ...add_change.new_nodes);
        }
        else if (change.type === Change_type.Remove) {
            const remove_change = change.value as Remove_change;
            const parent_node = get_node_at_position(node_tree, remove_change.parent_position);
            parent_node.children.splice(remove_change.index, remove_change.count);
        }
        else if (change.type === Change_type.Modify) {
            const modify_change = change.value as Modify_change;
            const parent_node_position = get_parent_position(modify_change.position);
            const parent_node = get_node_at_position(node_tree, parent_node_position);
            const child_to_modify_index = modify_change.position[modify_change.position.length - 1];
            parent_node.children[child_to_modify_index] = modify_change.new_node;
        }
    }
}

function parse_incrementally_after_change(
    original_node_tree: Node,
    start_change_node_position: number[],
    after_change_node_position: number[],
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[] } {

    const after_change_node = get_node_at_position(original_node_tree, after_change_node_position);

    // Check if adding an element to an array:
    {
        const changes = handle_array_changes(original_node_tree, stack, mark, start_change_node_position, after_change_node_position, array_infos, map_word_to_terminal);
        if (changes !== undefined) {

            if (g_debug) {
                console.log(`accept incremental array changes:`);
                print_array_changes(changes);
            }

            return {
                status: Parse_status.Accept,
                processed_words: 0,
                changes: changes
            };
        }
    }

    let next_word_node = clone_node(after_change_node);
    let next_word_node_position = after_change_node_position;
    let current_word_index = 0;

    let old_table = next_word_node.state;

    {
        const top_of_stack = get_top_of_stack(stack, mark);

        const row = parsing_table[top_of_stack.node.state];
        const column = row.find(column => column.label === map_word_to_terminal(next_word_node.word)) as Grammar.Action_column;
        if (column.action.type === Grammar.Action_type.Shift) {
            const shift_action = column.action.value as Grammar.Shift_action;
            apply_shift(stack, next_word_node, next_word_node_position, shift_action.next_state, original_node_tree, mark);

            {
                const iterate_result = get_next_terminal_node(original_node_tree, next_word_node, next_word_node_position);
                next_word_node = iterate_result !== undefined ? clone_node(iterate_result.node) : create_bottom_of_stack_node();
                next_word_node_position = iterate_result !== undefined ? iterate_result.position : [];
                current_word_index += 1;
            }
        }
    }

    while (true) {

        if (old_table === get_top_of_stack(stack, mark).node.state) {

            // Skip parsing and go to rightmost brother.
            {
                const top_of_stack = get_top_of_stack(stack, mark);
                const top_of_stack_position = top_of_stack.original_tree_position as number[];
                const rightmost_brother = get_rightmost_brother(original_node_tree, top_of_stack_position);

                const rightmost_brother_index_in_parent = rightmost_brother.position[rightmost_brother.position.length - 1];
                const top_of_stack_index_in_parent = top_of_stack_position[top_of_stack_position.length - 1];
                const count = rightmost_brother_index_in_parent - top_of_stack_index_in_parent;
                if (count > 0) {
                    const nodes_after_top_of_stack = get_stack_elements_on_tree(original_node_tree, rightmost_brother.position, count);
                    if (nodes_after_top_of_stack !== undefined && nodes_after_top_of_stack.length > 0) {
                        nodes_after_top_of_stack.reverse();
                        stack.push(...nodes_after_top_of_stack);
                    }

                    if (g_debug) {
                        const stack_description = node_stack_to_string(original_node_tree, mark.original_tree_position, mark.node, stack);
                        console.log(`skip ${count} nodes to rightmost brother: ${stack_description}`);
                    }
                }
            }

            // Get node after rightmost brother:
            {
                const rightmost_brother = get_top_of_stack(stack, mark);
                const iterate_result = get_next_sibling_terminal_node(original_node_tree, rightmost_brother.node, rightmost_brother.original_tree_position as number[]);
                next_word_node = iterate_result !== undefined ? clone_node(iterate_result.node) : create_bottom_of_stack_node();
                next_word_node_position = iterate_result !== undefined ? iterate_result.position : [];
                current_word_index += 1; // TODO
            }

            const top_of_stack = get_top_of_stack(stack, mark);
            const next_word = next_word_node.word;
            const row = parsing_table[top_of_stack.node.state];
            const column = row.find(column => column.label === map_word_to_terminal(next_word));

            if (column === undefined || column.action.type !== Grammar.Action_type.Reduce) {
                return {
                    status: Parse_status.Failed,
                    processed_words: 1,
                    changes: []
                };
            }

            const reduce_action = column.action.value as Grammar.Reduce_action;

            const matching_condition = matching_condition_holds(original_node_tree, stack, mark, reduce_action.lhs, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

            if (matching_condition) {
                const changes = create_apply_matching_changes(original_node_tree, stack, mark, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

                return {
                    status: Parse_status.Accept,
                    processed_words: current_word_index,
                    changes: changes
                };
            }
            else {
                const elements_to_reduce = get_top_elements_from_stack(original_node_tree, stack, mark, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);
                if (elements_to_reduce === undefined) {
                    return {
                        status: Parse_status.Failed,
                        processed_words: 1,
                        changes: []
                    };
                }

                {
                    const result = adjust_mark_and_stack(original_node_tree, stack, mark, elements_to_reduce);
                    if (result === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }
                    mark = result.new_mark;
                }

                const top_of_stack_parent_position = get_parent_position(top_of_stack.original_tree_position as number[]);
                const top_of_stack_parent_node = get_node_at_position(original_node_tree, top_of_stack_parent_position);

                old_table = top_of_stack_parent_node.state;

                // If elements to reduce have the same parent in the original tree, then the entire subtree in parent of top is reused:
                if (elements_have_same_parent(elements_to_reduce)) {
                    const new_parent_node = clone_node(top_of_stack_parent_node);

                    const previous_element_on_stack = get_element_from_stack(original_node_tree, stack, mark, reduce_action.rhs_count) as Parsing_stack_element;

                    const go_to_row = go_to_table[previous_element_on_stack.node.state];
                    const go_to_column = go_to_row.find(column => column.label === reduce_action.lhs);
                    if (go_to_column === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    new_parent_node.state = go_to_column.next_state;
                    new_parent_node.children = elements_to_reduce.map(element => element.node);
                }
                else {
                    const new_node = create_bottom_of_stack_node();
                    const result = apply_reduction(new_node, reduce_action.production_rule_index, reduce_action.lhs, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), original_node_tree, stack, mark, go_to_table, next_word, next_word_node_position, map_word_to_terminal);

                    if (!result.success) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }
                }
            }
        }
        else {
            const result = perform_actions(
                original_node_tree,
                next_word_node,
                next_word_node_position,
                stack,
                mark,
                old_table,
                parsing_table,
                go_to_table,
                array_infos,
                map_word_to_terminal
            );

            if (result.status === Parse_status.Continue) {

                const iterate_result = get_next_terminal_node(original_node_tree, next_word_node, next_word_node_position);
                next_word_node = iterate_result !== undefined ? clone_node(iterate_result.node) : create_bottom_of_stack_node();
                next_word_node_position = iterate_result !== undefined ? iterate_result.position : [];
                current_word_index += 1;

                mark = result.mark;
                old_table = result.old_table;
            }
            else if (result.status === Parse_status.Accept) {
                return {
                    status: Parse_status.Accept,
                    processed_words: current_word_index,
                    changes: result.changes
                };
            }
            else {
                return {
                    status: Parse_status.Failed,
                    processed_words: 1,
                    changes: []
                };
            }
        }
    }
}

function perform_actions(
    original_node_tree: Node,
    next_word_node: Node,
    next_word_position: number[],
    stack: Parsing_stack_element[],
    mark: Parsing_stack_element,
    old_table: number,
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, mark: Parsing_stack_element, old_table: number, changes: Change[] } {

    while (true) {

        const top_of_stack = get_top_of_stack(stack, mark);
        const row = parsing_table[top_of_stack.node.state];
        const column = row.find(column => column.label === map_word_to_terminal(next_word_node.word));

        if (column === undefined) {
            return {
                status: Parse_status.Failed,
                mark: mark,
                old_table: old_table,
                changes: []
            };
        }

        const action = column.action;

        switch (action.type) {
            case Grammar.Action_type.Accept:
                {
                    const accept_action = action.value as Grammar.Accept_action;

                    const children = get_top_elements_from_stack(original_node_tree, stack, mark, accept_action.rhs_count, array_infos.get(accept_action.lhs), map_word_to_terminal) as Parsing_stack_element[];
                    children.reverse();

                    const source_location: Scanner.Source_location =
                        children.length > 0 ?
                            children[0].node.word.source_location :
                            { line: 1, column: 1 };

                    const new_node: Node = {
                        word: { value: accept_action.lhs, type: Grammar.Word_type.Symbol, source_location: source_location },
                        state: -1,
                        production_rule_index: 0,
                        children: children.map(element => element.node)
                    };

                    if (g_debug) {
                        const stack_description = node_stack_to_string(original_node_tree, mark.original_tree_position, mark.node, stack);
                        const rhs_string = new_node.children.map(node => node.word.value).join(" ");
                        console.log(`accept incremental change ${accept_action.lhs} -> ${rhs_string} ${stack_description}`);
                    }

                    const change = create_modify_change([], new_node);

                    return {
                        status: Parse_status.Accept,
                        mark: mark,
                        old_table: old_table,
                        changes: [change]
                    };
                }
            case Grammar.Action_type.Shift:
                {
                    old_table = next_word_node.state;

                    const shift_action = action.value as Grammar.Shift_action;
                    apply_shift(stack, next_word_node, next_word_position, shift_action.next_state, original_node_tree, mark);

                    return {
                        status: Parse_status.Continue,
                        mark: mark,
                        old_table: old_table,
                        changes: []
                    };
                }
            case Grammar.Action_type.Reduce:
                {
                    const reduce_action = action.value as Grammar.Reduce_action;

                    const matching_condition = matching_condition_holds(original_node_tree, stack, mark, reduce_action.lhs, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

                    if (matching_condition) {
                        const changes = create_apply_matching_changes(original_node_tree, stack, mark, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

                        return {
                            status: Parse_status.Accept,
                            mark: mark,
                            old_table: old_table,
                            changes: changes
                        };
                    }
                    else {

                        const elements_to_reduce = get_top_elements_from_stack(original_node_tree, stack, mark, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

                        if (elements_to_reduce === undefined) {
                            return {
                                status: Parse_status.Failed,
                                mark: mark,
                                old_table: old_table,
                                changes: []
                            };
                        }

                        {
                            const result = adjust_mark_and_stack(original_node_tree, stack, mark, elements_to_reduce);
                            if (result === undefined) {
                                return {
                                    status: Parse_status.Failed,
                                    mark: mark,
                                    old_table: old_table,
                                    changes: []
                                };
                            }
                            mark = result.new_mark;
                        }

                        const new_node = create_bottom_of_stack_node();
                        const result = apply_reduction(new_node, reduce_action.production_rule_index, reduce_action.lhs, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), original_node_tree, stack, mark, go_to_table, next_word_node.word, next_word_position, map_word_to_terminal);

                        if (!result.success) {
                            return {
                                status: Parse_status.Failed,
                                mark: mark,
                                old_table: old_table,
                                changes: []
                            };
                        }
                    }
                    break;
                }
        }
    }
}
