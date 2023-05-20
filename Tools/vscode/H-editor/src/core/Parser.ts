import * as Grammar from "./Grammar";
import * as Scanner from "./Scanner";

const g_debug = true;

export interface Text_position {
    line: number;
    column: number;
}

export interface Node {
    word: Scanner.Scanned_word;
    state: number;
    production_rule_index: number | undefined;
    previous_node_on_stack: Node | undefined;
    father_node: Node | undefined;
    index_in_father: number;
    children: Node[];
    text_position: Text_position | undefined;
}

function get_node_at_position(root: Node, position: number[]): Node {

    let current_node = root;

    for (const child_index of position) {
        current_node = current_node.children[child_index];
    }

    return current_node;
}

function find_node_common_root(first_position: number[], second_position: number[]): number[] {

    const smallest_length = Math.min(first_position.length, second_position.length);

    for (let index = 0; index < smallest_length; ++index) {
        if (first_position[index] !== second_position[index]) {
            return first_position.slice(0, index);
        }
    }

    return first_position.slice(0, smallest_length);
}

function is_valid_position(root: Node, position: number[]): boolean {
    let current_node = root;

    for (const child_index of position) {
        if (child_index >= current_node.children.length) {
            return false;
        }

        current_node = current_node.children[child_index];
    }

    return true;
}

function find_child_at_text_position(children: Node[], text_position: Text_position): number {

    const get_child_index = (child_index: number): number => {

        // Return previous child if text position is at the end of the word:
        if (child_index - 1 > 0) {
            const sibling = children[child_index - 1];
            const sibling_text_position = sibling.text_position as Text_position;
            if (sibling_text_position.line === text_position.line && sibling_text_position.column + sibling.word.value.length === text_position.column) {
                return child_index - 1;
            }
        }

        return child_index;
    };

    for (let child_index = 0; child_index < children.length; ++child_index) {
        const child_node = children[child_index];

        const child_text_position = child_node.text_position as Text_position;
        if (child_text_position.line > text_position.line) {
            return get_child_index(child_index - 1);
        }

        if (child_text_position.line === text_position.line && child_text_position.column > text_position.column) {
            return get_child_index(child_index - 1);
        }
    }

    return get_child_index(children.length - 1);
}

function get_closest_node_position_to_text_position(root: Node, text_position: Text_position): number[] {

    const current_node_position: number[] = [];
    let current_node = root;

    while (current_node.children.length > 0) {
        const child_index = find_child_at_text_position(current_node.children, text_position);
        current_node_position.push(child_index);
        current_node = current_node.children[child_index];
    }

    return current_node_position;
}

function get_next_node_position(root: Node, current_node: Node, current_node_position: number[]): number[] {
    const result = iterate_forward(root, current_node, current_node_position);
    return result !== undefined ? result.next_position : [];
}

export function scan_new_change(
    root: Node,
    start_text_position: Text_position,
    end_text_position: Text_position,
    new_text: string
): { start_change_node_position: number[], after_change_node_position: number[], new_words: Scanner.Scanned_word[] } {

    const start_node_position = get_closest_node_position_to_text_position(root, start_text_position);
    const start_node = get_node_at_position(root, start_node_position);

    const end_node_position = get_closest_node_position_to_text_position(root, end_text_position);
    const end_node = get_node_at_position(root, end_node_position);

    const start_node_text_column = (start_node.text_position as Text_position).column;
    const begin_text_end = start_text_position.column - start_node_text_column;
    const begin_text = start_node.word.value.substring(0, begin_text_end);

    const end_node_text_column = (end_node.text_position as Text_position).column;
    const end_text_begin = end_text_position.column - end_node_text_column;
    const end_text = end_node.word.value.substring(end_text_begin, end_node.word.value.length);

    const whole_new_text = begin_text + new_text + end_text;

    const new_words = Scanner.scan(whole_new_text, 0, whole_new_text.length);

    const is_same_first_word = new_words.length > 0 && new_words[0].value === start_node.word.value && new_words[0].type === start_node.word.type;
    const start_change_node_position = is_same_first_word ? get_next_node_position(root, start_node, start_node_position) : start_node_position;

    const after_end_node_result = get_next_leaf_node(root, end_node, end_node_position);
    const after_change_node_position = after_end_node_result !== undefined ? after_end_node_result.position : [];

    return {
        start_change_node_position: start_change_node_position,
        after_change_node_position: after_change_node_position,
        new_words: is_same_first_word ? new_words.slice(1, new_words.length) : new_words
    };
}

function get_node_stack(node: Node): Node[] {

    const nodes: Node[] = [];

    let current_node: Node | undefined = node;

    while (current_node !== undefined) {
        nodes.push(current_node);
        current_node = current_node.previous_node_on_stack;
    }

    return nodes.reverse();
}

function node_stack_to_string(node: Node): string {
    const stack = get_node_stack(node);
    const strings = stack.map(element => `[${element.state}, ${element.word.value}]`).join(",");
    return `[${strings}]`;
}

function clone_node(node: Node): Node {
    return {
        word: { value: node.word.value, type: node.word.type },
        state: node.state,
        production_rule_index: node.production_rule_index,
        previous_node_on_stack: node.previous_node_on_stack,
        father_node: node.father_node,
        index_in_father: node.index_in_father,
        children: node.children,
        text_position: node.text_position
    };
}

function get_node_position(node: Node): number[] {

    const position: number[] = [];

    let current_node = node;

    while (current_node.father_node !== undefined) {
        position.push(current_node.index_in_father);
        current_node = current_node.father_node;
    }

    return position.reverse();
}

function get_next_leaf_node(root: Node, current_node: Node, current_node_position: number[]): { node: Node, position: number[] } | undefined {
    let result = iterate_forward(root, current_node, current_node_position);

    while (result !== undefined) {
        if (result.next_node.children.length === 0) {
            return {
                node: result.next_node,
                position: result.next_position
            };
        }

        result = iterate_forward(root, result.next_node, result.next_position);
    }

    return undefined;
}

function get_node_from_stack(top_of_stack: Node, index: number): Node | undefined {
    if (index === 0) {
        return top_of_stack;
    }

    if (top_of_stack.previous_node_on_stack === undefined) {
        return undefined;
    }

    return get_node_from_stack(top_of_stack.previous_node_on_stack, index - 1);
}

function get_top_nodes_from_stack(top_of_stack: Node, count: number, array_info: Grammar.Array_info | undefined, map_word_to_terminal: (word: Scanner.Scanned_word) => string): Node[] | undefined {

    const nodes: Node[] = [];

    let current_node = top_of_stack;

    if (array_info !== undefined) {

        const has_separator = array_info.separator_label.length > 0;

        while (true) {

            const current_node_label = current_node.production_rule_index === -1 ? map_word_to_terminal(current_node.word) : current_node.word.value;

            if (has_separator) {
                if ((nodes.length % 2) === 0) {
                    const is_element = current_node_label === array_info.element_label;
                    if (!is_element) {
                        return nodes;
                    }
                }
                else {
                    const is_separator = current_node_label === array_info.separator_label;
                    if (!is_separator) {
                        return nodes;
                    }
                }
            }
            else if (current_node_label !== array_info.element_label) {
                return nodes;
            }

            nodes.push(current_node);

            if (current_node.previous_node_on_stack === undefined) {
                return nodes;
            }

            current_node = current_node.previous_node_on_stack;
        }
    }
    else {
        for (let index = 0; index < count; ++index) {
            nodes.push(current_node);

            if (current_node.previous_node_on_stack === undefined) {
                return undefined;
            }

            current_node = current_node.previous_node_on_stack;
        }

        return nodes;
    }
}

function get_rightmost_brother(node: Node): Node | undefined {

    if (node.father_node === undefined) {
        return undefined;
    }

    return node.father_node.children[node.father_node.children.length - 1];
}

function get_rightmost_terminal_descendant(node: Node): Scanner.Scanned_word {

    if (node.children.length === 0) {
        return node.word;
    }

    return get_rightmost_terminal_descendant(node.children[node.children.length - 1]);
}

function have_same_father(nodes: Node[]): boolean {

    if (nodes.length <= 1) {
        return true;
    }

    const father = nodes[0].father_node;

    for (let index = 1; index < nodes.length; ++index) {
        if (nodes[index].father_node !== father) {
            return false;
        }
    }

    return true;
}

export enum Iterate_direction {
    Down,
    Up
}

export function iterate_forward_with_repetition(root: Node, current_node: Node, current_position: number[], direction: Iterate_direction): { next_node: Node, next_position: number[], direction: Iterate_direction } | undefined {

    if (direction === Iterate_direction.Down && current_node.children.length > 0) {
        return {
            next_node: current_node.children[0],
            next_position: [...current_position, 0],
            direction: Iterate_direction.Down
        };
    }

    if (current_position.length === 0) {
        return undefined;
    }

    const current_node_index = current_position[current_position.length - 1];

    const parent_position = current_position.slice(0, current_position.length - 1);
    const parent_node = get_node_at_position(root, parent_position);

    const next_sibling_node_index = current_node_index + 1;
    if (next_sibling_node_index < parent_node.children.length) {
        return {
            next_node: parent_node.children[next_sibling_node_index],
            next_position: [...parent_position, next_sibling_node_index],
            direction: Iterate_direction.Down
        };
    }

    return {
        next_node: parent_node,
        next_position: parent_position,
        direction: Iterate_direction.Up
    };
}

export function iterate_forward(root: Node, current_node: Node, current_position: number[]): { next_node: Node, next_position: number[] } | undefined {

    let result = iterate_forward_with_repetition(root, current_node, current_position, Iterate_direction.Down);

    while (result !== undefined && result.direction === Iterate_direction.Up) {
        result = iterate_forward_with_repetition(root, result.next_node, result.next_position, result.direction);
    }

    if (result === undefined) {
        return result;
    }

    return {
        next_node: result.next_node,
        next_position: result.next_position
    };
}

export function parse(input: Scanner.Scanned_word[], parsing_table: Grammar.Action_column[][], go_to_table: Grammar.Go_to_column[][], array_infos: Map<string, Grammar.Array_info>, map_word_to_terminal: (word: Scanner.Scanned_word) => string): Node | undefined {

    const result = parse_incrementally(
        undefined,
        [],
        input,
        [],
        parsing_table,
        go_to_table,
        array_infos,
        map_word_to_terminal
    );

    if (result.status !== Parse_status.Accept) {
        return undefined;
    }

    const change = result.changes[0].value as Modify_change;
    return change.new_node;
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

function create_add_change(parent_position: number[], child_index: number, new_nodes: Node[]): Change {
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

function create_remove_change(parent_position: number[], child_index: number, count: number): Change {
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

function create_modify_change(position: number[], new_node: Node): Change {
    return {
        type: Change_type.Modify,
        value: {
            position: position,
            new_node: new_node
        }
    };
}

export interface Words_change {
    range_offset: number;
    range_length: number;
    new_words: Scanner.Scanned_word[];
}

function create_bottom_of_stack_node(): Node {
    return {
        word: { value: "$", type: Grammar.Word_type.Symbol },
        state: 0,
        production_rule_index: undefined,
        previous_node_on_stack: undefined,
        father_node: undefined,
        index_in_father: -1,
        children: [],
        text_position: undefined
    };
}

function get_next_word(
    new_words: Scanner.Scanned_word[],
    current_word_index: number,
    original_node_tree: Node | undefined,
    after_change_node_position: number[]
): Scanner.Scanned_word {

    if (current_word_index < new_words.length) {
        return new_words[current_word_index];
    }

    if (original_node_tree !== undefined && is_valid_position(original_node_tree, after_change_node_position)) {
        const node = get_node_at_position(original_node_tree, after_change_node_position);
        return node.word;
    }

    return { value: "$", type: Grammar.Word_type.Symbol };
}

function get_end_position(root: Node): Node {
    let current_node = root;

    while (current_node.children.length > 0) {
        current_node = current_node.children[current_node.children.length - 1];
    }

    return current_node;
}

function get_start_top_of_stack_node(original_node_tree: Node | undefined, start_change_node_position: number[]): Node {

    if (original_node_tree === undefined) {
        return create_bottom_of_stack_node();
    }

    const start_at_end_position = !is_valid_position(original_node_tree, start_change_node_position);

    if (start_at_end_position) {
        return get_end_position(original_node_tree);
    }
    else {
        return get_node_from_stack(get_node_at_position(original_node_tree, start_change_node_position), 1) as Node;
    }
}

export function parse_incrementally(
    original_node_tree: Node | undefined,
    start_change_node_position: number[],
    new_words: Scanner.Scanned_word[],
    after_change_node_position: number[],
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[] } {

    let top_of_stack = get_start_top_of_stack_node(original_node_tree, start_change_node_position);
    let mark = top_of_stack;

    let current_word_index = 0;

    while (current_word_index <= new_words.length) {

        const current_word = get_next_word(new_words, current_word_index, original_node_tree, after_change_node_position);

        const row = parsing_table[top_of_stack.state];
        const column = row.find(column => column.label === map_word_to_terminal(current_word));

        if (column === undefined) {
            return {
                status: Parse_status.Failed,
                processed_words: current_word_index,
                changes: []
            };
        }

        const action = column.action;

        switch (action.type) {
            case Grammar.Action_type.Accept:
                {
                    const accept_action = action.value as Grammar.Accept_action;

                    if (g_debug) {
                        console.log(`accept`);
                    }

                    // Handle add/delete elements at the end of an array:
                    {
                        const array_info = array_infos.get(top_of_stack.word.value);
                        if (array_info !== undefined && original_node_tree !== undefined) {

                            const has_separator = array_info.separator_label.length > 0;
                            const element_labels = has_separator ? [array_info.element_label, array_info.separator_label] : [array_info.element_label];

                            const before_start_node = get_start_top_of_stack_node(original_node_tree, start_change_node_position);
                            const before_start_element = get_parent_node_with_labels(before_start_node, element_labels, map_word_to_terminal);

                            const is_start_node_end_of_tree = !is_valid_position(original_node_tree, start_change_node_position);
                            const start_node = !is_start_node_end_of_tree ? get_node_at_position(original_node_tree, start_change_node_position) : undefined;
                            const start_element = start_node !== undefined ? get_parent_node_with_labels(start_node, element_labels, map_word_to_terminal) : undefined;

                            const is_after_change_end_of_tree = !is_valid_position(original_node_tree, after_change_node_position);
                            const after_change_node = !is_after_change_end_of_tree ? get_node_at_position(original_node_tree, after_change_node_position) : undefined;
                            const after_change_element = after_change_node !== undefined ? get_parent_node_with_labels(after_change_node, element_labels, map_word_to_terminal) : undefined;

                            if (before_start_element !== undefined && (after_change_element !== undefined || is_after_change_end_of_tree)) {

                                const before_start_element_position = get_node_position(before_start_element);
                                const parent_position = before_start_element_position.slice(0, before_start_element_position.length - 1);

                                const changes: Change[] = [];

                                // Handle deletes:
                                {
                                    const parent_node = (before_start_element.father_node as Node);
                                    const start_index = (start_element === undefined) ? parent_node.children.length : start_element.index_in_father;
                                    const end_index = (after_change_element === undefined) ? parent_node.children.length : after_change_element.index_in_father;
                                    const count = end_index - start_index;

                                    if (count > 0) {
                                        const delete_change = create_remove_change(parent_position, start_index, end_index - start_index);
                                        changes.push(delete_change);
                                    }
                                }

                                // Handle additions:
                                {
                                    const start_index = before_start_element.index_in_father + 1;
                                    const end_index = top_of_stack.children.length;

                                    const new_nodes = top_of_stack.children.slice(start_index, end_index);

                                    if (new_nodes.length > 0) {
                                        const add_change = create_add_change(parent_position, start_index, new_nodes);
                                        changes.push(add_change);
                                    }
                                }

                                if (changes.length > 0) {
                                    return {
                                        status: Parse_status.Accept,
                                        processed_words: current_word_index,
                                        changes: changes
                                    };
                                }
                            }
                        }
                    }

                    const children = get_top_nodes_from_stack(top_of_stack, accept_action.rhs_count, array_infos.get(accept_action.lhs), map_word_to_terminal) as Node[];
                    children.reverse();

                    const new_node: Node = {
                        word: { value: accept_action.lhs, type: Grammar.Word_type.Symbol },
                        state: -1,
                        production_rule_index: 0,
                        previous_node_on_stack: top_of_stack,
                        father_node: undefined,
                        index_in_father: -1,
                        children: children,
                        text_position: undefined
                    };

                    for (let index = 0; index < children.length; ++index) {
                        const child = children[index];
                        child.father_node = new_node;
                        child.index_in_father = index;
                    }

                    return {
                        status: Parse_status.Accept,
                        processed_words: current_word_index,
                        changes: [
                            create_modify_change([], new_node)
                        ]
                    };
                }
            case Grammar.Action_type.Shift:
                {
                    if (current_word_index === new_words.length && original_node_tree !== undefined && after_change_node_position.length > 0) {

                        const result = parse_incrementally_after_change(
                            original_node_tree,
                            start_change_node_position,
                            after_change_node_position,
                            top_of_stack,
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

                    const shift_action = action.value as Grammar.Shift_action;

                    const node_to_shift = create_bottom_of_stack_node();
                    node_to_shift.word = current_word;
                    const result = apply_shift(node_to_shift, shift_action.next_state, top_of_stack);
                    top_of_stack = result;
                    current_word_index += 1;

                    break;
                }
            case Grammar.Action_type.Reduce:
                {
                    const reduce_action = action.value as Grammar.Reduce_action;

                    const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);
                    if (nodes_to_reduce === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    const mark_index = nodes_to_reduce.findIndex(node => node === mark);
                    if (mark_index !== -1) {
                        const new_mark = get_node_from_stack(top_of_stack, reduce_action.rhs_count);
                        if (new_mark === undefined) {
                            return {
                                status: Parse_status.Failed,
                                processed_words: 1,
                                changes: []
                            };
                        }
                        mark = new_mark;
                    }

                    const new_node = create_bottom_of_stack_node();

                    const result = apply_reduction(
                        new_node,
                        reduce_action.production_rule_index,
                        reduce_action.lhs,
                        reduce_action.rhs_count,
                        array_infos.get(reduce_action.lhs),
                        top_of_stack,
                        mark_index,
                        go_to_table,
                        current_word,
                        map_word_to_terminal
                    );

                    if (!result.success) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    top_of_stack = result.new_top_of_stack;
                    break;
                }
            default:
                break;
        }
    }

    return {
        status: Parse_status.Failed,
        processed_words: current_word_index,
        changes: []
    };
}

function apply_shift(
    node_to_shift: Node,
    state: number,
    top_of_stack: Node
): Node {
    node_to_shift.previous_node_on_stack = top_of_stack;
    node_to_shift.state = state;

    if (g_debug) {
        const node_description = node_stack_to_string(node_to_shift);
        console.log(`shift ${node_description}`);
    }

    return node_to_shift;
}

function apply_reduction(
    node: Node,
    production_rule_index: number,
    production_lhs: string,
    production_rhs_count: number,
    production_array_info: Grammar.Array_info | undefined,
    top_of_stack: Node,
    mark_index: number,
    go_to_table: Grammar.Go_to_column[][],
    current_word: Scanner.Scanned_word,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { success: boolean, new_top_of_stack: Node } {

    const children = get_top_nodes_from_stack(top_of_stack, production_rhs_count, production_array_info, map_word_to_terminal);
    if (children === undefined) {
        return {
            success: false,
            new_top_of_stack: top_of_stack
        };
    }

    // Clone nodes that belong to the original tree:
    if (mark_index !== -1) {
        for (let index = mark_index; mark_index < children.length; ++mark_index) {
            children[index] = clone_node(children[index]);
        }
    }

    children.reverse();

    const previous_node_after_reduction = get_node_from_stack(top_of_stack, children.length);
    if (previous_node_after_reduction === undefined) {
        return {
            success: false,
            new_top_of_stack: top_of_stack
        };
    }

    const go_to_row = go_to_table[previous_node_after_reduction.state];
    const go_to_column = go_to_row.find(column => column.label === production_lhs);
    if (go_to_column === undefined) {
        return {
            success: false,
            new_top_of_stack: top_of_stack
        };
    }

    for (let index = 0; index < children.length; ++index) {
        const child = children[index];
        child.father_node = node;
        child.index_in_father = index;
    }

    node.children = children;
    node.previous_node_on_stack = previous_node_after_reduction;
    node.word = { value: production_lhs, type: Grammar.Word_type.Symbol };
    node.state = go_to_column.next_state;
    node.production_rule_index = production_rule_index;

    if (g_debug) {
        const node_description = node_stack_to_string(node);
        const rhs = node.children.map(node => node.word.value).join(" ");
        console.log(`reduce ${production_lhs} -> ${rhs} ${node_description} ${current_word.value}`);
    }

    return {
        success: true,
        new_top_of_stack: node
    };
}

function matching_condition_holds(
    top_of_stack: Node,
    mark: Node,
    production_lhs: string,
    production_rhs_count: number,
    production_array_info: Grammar.Array_info | undefined,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): boolean {

    const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, production_rhs_count, production_array_info, map_word_to_terminal);
    if (nodes_to_reduce === undefined) {
        return false;
    }

    const mark_index = nodes_to_reduce.findIndex(node => node === mark);
    if (mark_index === -1) {
        return false;
    }

    const nodes_to_reduce_before_mark = get_top_nodes_from_stack(mark, production_rhs_count - mark_index, undefined, map_word_to_terminal);
    if (nodes_to_reduce_before_mark === undefined) {
        return false;
    }

    for (const node of nodes_to_reduce_before_mark) {
        if (node.father_node !== mark.father_node) {
            return false;
        }
    }

    // TODO check this
    const node_before_mark = get_node_from_stack(mark, production_rhs_count - mark_index);
    if (node_before_mark === undefined || mark.father_node === node_before_mark) {
        return false;
    }

    if (mark.father_node === undefined || (mark.father_node.word.value !== production_lhs)) {
        return false;
    }

    const top_rightmost_descendant = get_rightmost_terminal_descendant(top_of_stack);
    const mark_father_rightmost_descendant = get_rightmost_terminal_descendant(mark.father_node);

    if (top_rightmost_descendant.value !== mark_father_rightmost_descendant.value || top_rightmost_descendant.type !== mark_father_rightmost_descendant.type) {
        return false;
    }

    return true;
}

function create_apply_matching_changes(
    top_of_stack: Node,
    mark: Node,
    mark_node_position: number[],
    production_rhs_count: number,
    production_array_info: Grammar.Array_info | undefined,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): Change[] {

    const mark_father = mark.father_node as Node;

    const top_nodes = get_top_nodes_from_stack(top_of_stack, production_rhs_count, production_array_info, map_word_to_terminal) as Node[];
    top_nodes.reverse();

    const cloned_top_nodes = top_nodes.map(node => clone_node(node));

    const mark_father_clone: Node = {
        word: { value: mark_father.word.value, type: mark_father.word.type },
        state: mark_father.state,
        production_rule_index: mark_father.production_rule_index,
        previous_node_on_stack: mark_father.previous_node_on_stack,
        father_node: mark_father.father_node,
        index_in_father: mark_father.index_in_father,
        children: cloned_top_nodes,
        text_position: mark_father.text_position
    };

    for (let index = 0; index < cloned_top_nodes.length; ++index) {
        const node = cloned_top_nodes[index];
        node.father_node = mark_father_clone;
        node.index_in_father = index;
    }

    const modify_change = create_modify_change(mark_node_position.slice(0, mark_node_position.length - 1), mark_father_clone);
    return [modify_change];
}

function get_parent_node_array_info(node: Node, array_infos: Map<string, Grammar.Array_info>): Grammar.Array_info | undefined {
    if (node.father_node === undefined) {
        return undefined;
    }

    const array_info = array_infos.get(node.father_node.word.value);
    return array_info;
}

function get_array_from_stack_until_mark(top_of_stack: Node, mark: Node | undefined, array_info: Grammar.Array_info, map_word_to_terminal: (word: Scanner.Scanned_word) => string): Node[] {
    const nodes: Node[] = [];

    let current_node = top_of_stack;

    const has_separator = array_info.separator_label.length > 0;
    let expect_separator = has_separator ? map_word_to_terminal(current_node.word) === array_info.separator_label : false;

    while (true) {

        const terminal = map_word_to_terminal(current_node.word);

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

        nodes.push(current_node);

        if (current_node === mark) {
            break;
        }

        if (current_node.previous_node_on_stack === undefined) {
            break;
        }

        current_node = current_node.previous_node_on_stack;
    }

    nodes.reverse();

    return nodes;
}

function get_parent_node_with_labels(node: Node, labels: string[], map_word_to_terminal: (word: Scanner.Scanned_word) => string): Node | undefined {

    let current_node = node;

    while (true) {
        const current_node_label = current_node.production_rule_index !== -1 ? map_word_to_terminal(current_node.word) : current_node.word.value;

        const found = labels.findIndex(label => current_node_label === label);
        if (found !== -1) {
            return current_node;
        }

        if (current_node.father_node === undefined) {
            return undefined;
        }

        current_node = current_node.father_node;
    }
}

function get_parent_array_element(
    target_label: string,
    original_node_tree: Node,
    mark: Node,
    start_change_original_node: Node | undefined,
    top_of_stack: Node,
    after_change_original_node: Node,
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { parent: Node, array_info: Grammar.Array_info } | undefined {

    const child_node_at_add_location = start_change_original_node !== undefined ? start_change_original_node : mark;
    const node_at_add_location = get_parent_node_with_labels(child_node_at_add_location, [target_label], map_word_to_terminal);

    if (node_at_add_location !== undefined && node_at_add_location.father_node !== undefined) {
        const parent_node = node_at_add_location.father_node;

        const array_info = array_infos.get(parent_node.word.value);
        if (array_info !== undefined && (array_info.element_label === target_label || (array_info.separator_label === target_label))) {
            return {
                parent: parent_node,
                array_info: array_info
            };
        }
    }
    else {
        const previous_node_on_stack = top_of_stack.previous_node_on_stack;
        if (previous_node_on_stack !== undefined) {
            const previous_node_label = map_word_to_terminal(previous_node_on_stack.word);

            const next_node = get_parent_node_with_labels(after_change_original_node, [previous_node_label], map_word_to_terminal);
            if (next_node !== undefined) {
                const result = get_parent_array_element(previous_node_label, original_node_tree, mark, start_change_original_node, next_node, after_change_original_node, array_infos, map_word_to_terminal);
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

    return undefined;
}

function find_array_element_child_index(array_node: Node, child_node: Node): number {

    let current_node = child_node;

    while (current_node.father_node !== undefined) {
        if (current_node.father_node === array_node) {
            return current_node.index_in_father;
        }
        current_node = current_node.father_node;
    }

    return -1;
}

function handle_array_changes(
    original_node_tree: Node,
    mark: Node,
    start_change_original_node: Node | undefined,
    top_of_stack: Node,
    after_change_original_node: Node,
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): Change[] | undefined {

    const changes: Change[] = [];

    // Handle deletes:
    if (start_change_original_node !== undefined && start_change_original_node !== after_change_original_node) {

        const start_change_original_node_position = get_node_position(start_change_original_node);
        const after_change_original_node_position = get_node_position(after_change_original_node);
        const parent_node_position = find_node_common_root(start_change_original_node_position, after_change_original_node_position);
        const parent_node = get_node_at_position(original_node_tree, parent_node_position);

        const array_info = array_infos.get(parent_node.word.value);
        if (array_info !== undefined) {

            const element_labels = array_info.separator_label.length > 0 ? [array_info.element_label, array_info.separator_label] : [array_info.element_label];

            const start_change_original_node_element = get_parent_node_with_labels(start_change_original_node, element_labels, map_word_to_terminal);
            const after_change_element = get_parent_node_with_labels(after_change_original_node, element_labels, map_word_to_terminal);

            if (start_change_original_node_element !== undefined && after_change_element !== undefined) {

                const start_index = start_change_original_node_element.index_in_father;
                const end_index = after_change_element.index_in_father;
                const count = end_index - start_index;

                if (count > 0) {

                    const parent_node = start_change_original_node_element.father_node as Node;
                    const parent_node_position = get_node_position(parent_node);

                    const remove_change = create_remove_change(parent_node_position, start_index, count);
                    changes.push(remove_change);
                }
            }
        }
    }

    // Handle additions:
    {
        const top_of_stack_label = map_word_to_terminal(top_of_stack.word);
        const result = get_parent_array_element(top_of_stack_label, original_node_tree, mark, start_change_original_node, top_of_stack, after_change_original_node, array_infos, map_word_to_terminal);
        if (result !== undefined) {
            const parent_node = result.parent;
            const array_info = result.array_info;

            const mark_element_child_index = find_array_element_child_index(parent_node, mark);
            const mark_element = parent_node.children[mark_element_child_index];
            const array_nodes = get_array_from_stack_until_mark(top_of_stack, mark_element, array_info, map_word_to_terminal);

            const is_mark_included = array_nodes[0] === mark_element;
            const after_change_original_node_index = array_nodes.findIndex(node => node === after_change_original_node);

            const start_index = is_mark_included ? 1 : 0;
            const end_index = after_change_original_node_index !== -1 ? after_change_original_node_index : array_nodes.length;

            const new_nodes = array_nodes.slice(start_index, end_index);
            const insert_index_in_parent = is_mark_included ? mark.index_in_father + 1 : 0;

            if (new_nodes.length > 0) {
                const parent_node_position = get_node_position(parent_node);
                const add_change = create_add_change(parent_node_position, insert_index_in_parent, new_nodes);
                changes.push(add_change);
            }
        }
    }

    return changes.length > 0 ? changes : undefined;
}

export function apply_changes(node_tree: Node, changes: Change[]): void {

    for (const change of changes) {
        if (change.type === Change_type.Add) {
            const add_change = change.value as Add_change;
            // TODO
        }
    }

}

function parse_incrementally_after_change(
    original_node_tree: Node,
    start_change_node_position: number[],
    after_change_node_position: number[],
    top_of_stack: Node,
    mark: Node,
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[] } {

    const after_change_node = get_node_at_position(original_node_tree, after_change_node_position);

    let next_word_node = clone_node(after_change_node);
    let next_word_node_position = after_change_node_position;
    let current_word_index = 0;

    // Check if adding an element to an array:
    {
        const is_start_change_end_of_tree = !is_valid_position(original_node_tree, start_change_node_position);
        const start_change_original_node = !is_start_change_end_of_tree ? get_node_at_position(original_node_tree, start_change_node_position) : undefined;

        const changes = handle_array_changes(original_node_tree, mark, start_change_original_node, top_of_stack, after_change_node, array_infos, map_word_to_terminal);
        if (changes !== undefined) {
            return {
                status: Parse_status.Accept,
                processed_words: 0,
                changes: changes
            };
        }
    }

    let old_table = next_word_node.state;

    {
        const row = parsing_table[top_of_stack.state];
        const column = row.find(column => column.label === map_word_to_terminal(next_word_node.word)) as Grammar.Action_column;
        const shift_action = column.action.value as Grammar.Shift_action;

        top_of_stack = apply_shift(next_word_node, shift_action.next_state, top_of_stack);

        {
            const iterate_result = get_next_leaf_node(original_node_tree, next_word_node, next_word_node_position);
            next_word_node = iterate_result !== undefined ? clone_node(iterate_result.node) : create_bottom_of_stack_node();
            next_word_node_position = iterate_result !== undefined ? iterate_result.position : [];
            current_word_index += 1;
        }
    }

    while (true) {

        if (old_table === top_of_stack.state) {

            const rightmost_brother = get_rightmost_brother(top_of_stack);
            if (rightmost_brother === undefined) {
                return {
                    status: Parse_status.Failed,
                    processed_words: 1,
                    changes: []
                };
            }
            //rightmost_brother.previous_node_on_stack = top_of_stack.previous_node_on_stack;
            top_of_stack = rightmost_brother;

            // Get node after rightmost brother:
            {
                const rightmost_brother_position = get_node_position(rightmost_brother);
                const iterate_result = get_next_leaf_node(original_node_tree, rightmost_brother, rightmost_brother_position);
                next_word_node = iterate_result !== undefined ? clone_node(iterate_result.node) : create_bottom_of_stack_node();
                next_word_node_position = iterate_result !== undefined ? iterate_result.position : [];
                current_word_index += 1; // TODO
            }

            const next_word = next_word_node.word;
            const row = parsing_table[top_of_stack.state];
            const column = row.find(column => column.label === map_word_to_terminal(next_word));

            if (column === undefined || column.action.type !== Grammar.Action_type.Reduce) {
                return {
                    status: Parse_status.Failed,
                    processed_words: 1,
                    changes: []
                };
            }

            const reduce_action = column.action.value as Grammar.Reduce_action;

            const matching_condition = matching_condition_holds(top_of_stack, mark, reduce_action.lhs, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

            if (matching_condition) {
                const mark_node_position = get_node_position(mark);
                const changes = create_apply_matching_changes(top_of_stack, mark, mark_node_position, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

                return {
                    status: Parse_status.Accept,
                    processed_words: current_word_index,
                    changes: changes
                };
            }
            else {
                const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);
                if (nodes_to_reduce === undefined) {
                    return {
                        status: Parse_status.Failed,
                        processed_words: 1,
                        changes: []
                    };
                }

                const mark_index = nodes_to_reduce.findIndex(node => node === mark);
                if (mark_index !== -1) {
                    const next_mark = get_node_from_stack(top_of_stack, reduce_action.rhs_count);
                    if (next_mark === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    mark = next_mark;
                }

                const father_node = top_of_stack.father_node as Node;
                old_table = father_node.state;

                if (have_same_father(nodes_to_reduce)) {
                    const new_father_node = clone_node(top_of_stack.father_node as Node);

                    const previous_node_on_stack = get_node_from_stack(top_of_stack, reduce_action.rhs_count) as Node;
                    new_father_node.previous_node_on_stack = previous_node_on_stack;

                    const go_to_row = go_to_table[previous_node_on_stack.state];
                    const go_to_column = go_to_row.find(column => column.label === reduce_action.lhs);
                    if (go_to_column === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    new_father_node.state = go_to_column.next_state;

                    for (const child of new_father_node.children) {
                        child.father_node = new_father_node;
                    }
                }
                else {
                    const new_node = create_bottom_of_stack_node();
                    const result = apply_reduction(new_node, reduce_action.production_rule_index, reduce_action.lhs, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), top_of_stack, mark_index, go_to_table, next_word, map_word_to_terminal);

                    if (!result.success) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    top_of_stack = result.new_top_of_stack;
                }
            }
        }
        else {
            const result = perform_actions(
                next_word_node,
                top_of_stack,
                mark,
                after_change_node,
                old_table,
                parsing_table,
                go_to_table,
                array_infos,
                map_word_to_terminal
            );

            if (result.status === Parse_status.Continue) {

                const iterate_result = get_next_leaf_node(original_node_tree, next_word_node, next_word_node_position);
                next_word_node = iterate_result !== undefined ? clone_node(iterate_result.node) : create_bottom_of_stack_node();
                next_word_node_position = iterate_result !== undefined ? iterate_result.position : [];
                current_word_index += 1;

                top_of_stack = result.top_of_stack;
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
    next_word_node: Node,
    top_of_stack: Node,
    mark: Node,
    after_change_node: Node,
    old_table: number,
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    array_infos: Map<string, Grammar.Array_info>,
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, top_of_stack: Node, mark: Node, old_table: number, changes: Change[] } {

    while (true) {

        const row = parsing_table[top_of_stack.state];
        const column = row.find(column => column.label === map_word_to_terminal(next_word_node.word));

        if (column === undefined) {
            return {
                status: Parse_status.Failed,
                top_of_stack: top_of_stack,
                mark: mark,
                old_table: old_table,
                changes: []
            };
        }

        const action = column.action;

        switch (action.type) {
            case Grammar.Action_type.Accept:
                {
                    return {
                        status: Parse_status.Accept,
                        top_of_stack: top_of_stack,
                        mark: mark,
                        old_table: old_table,
                        changes: []
                    };
                }
            case Grammar.Action_type.Shift:
                {
                    old_table = next_word_node.state;

                    const shift_action = action.value as Grammar.Shift_action;
                    top_of_stack = apply_shift(next_word_node, shift_action.next_state, top_of_stack);

                    return {
                        status: Parse_status.Continue,
                        top_of_stack: top_of_stack,
                        mark: mark,
                        old_table: old_table,
                        changes: []
                    };
                }
            case Grammar.Action_type.Reduce:
                {
                    const reduce_action = action.value as Grammar.Reduce_action;

                    const matching_condition = matching_condition_holds(top_of_stack, mark, reduce_action.lhs, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

                    if (matching_condition) {
                        const mark_node_position = get_node_position(mark);
                        const changes = create_apply_matching_changes(top_of_stack, mark, mark_node_position, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

                        return {
                            status: Parse_status.Accept,
                            top_of_stack: top_of_stack,
                            mark: mark,
                            old_table: old_table,
                            changes: changes
                        };
                    }
                    else {

                        const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), map_word_to_terminal);

                        if (nodes_to_reduce === undefined) {
                            return {
                                status: Parse_status.Failed,
                                top_of_stack: top_of_stack,
                                mark: mark,
                                old_table: old_table,
                                changes: []
                            };
                        }

                        const mark_index = nodes_to_reduce.findIndex(node => node === mark);
                        if (mark_index !== -1) {
                            mark = get_node_from_stack(top_of_stack, reduce_action.rhs_count) as Node;
                        }

                        const new_node = create_bottom_of_stack_node();
                        const result = apply_reduction(new_node, reduce_action.production_rule_index, reduce_action.lhs, reduce_action.rhs_count, array_infos.get(reduce_action.lhs), top_of_stack, mark_index, go_to_table, next_word_node.word, map_word_to_terminal);

                        if (!result.success) {
                            return {
                                status: Parse_status.Failed,
                                top_of_stack: top_of_stack,
                                mark: mark,
                                old_table: old_table,
                                changes: []
                            };
                        }

                        top_of_stack = result.new_top_of_stack;
                    }
                    break;
                }
        }
    }
}
