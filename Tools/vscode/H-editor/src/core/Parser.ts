import * as Grammar from "./Grammar";
import * as Scanner from "./Scanner";

const g_debug = false;

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

function get_next_leaf_node(root: Node, current_node: Node, current_input_node_position: number[]): { node: Node, position: number[] } | undefined {
    let result = iterate_forward(root, current_node, current_input_node_position);

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

function get_top_nodes_from_stack(top_of_stack: Node, count: number): Node[] | undefined {

    const nodes: Node[] = [];

    let current_node = top_of_stack;

    for (let index = 0; index < count; ++index) {
        nodes.push(current_node);

        if (current_node.previous_node_on_stack === undefined) {
            return undefined;
        }

        current_node = current_node.previous_node_on_stack;
    }

    return nodes;
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

export function parse(input: Scanner.Scanned_word[], parsing_table: Grammar.Action_column[][], go_to_table: Grammar.Go_to_column[][], map_word_to_terminal: (word: Scanner.Scanned_word) => string): Node | undefined {

    const result = parse_incrementally(
        undefined,
        [],
        input,
        [],
        parsing_table,
        go_to_table,
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
    value: Add_change | Remove_change
}

export interface Add_change {
    position: number[];
    new_node: Node;
}

function create_add_change(position: number[], new_node: Node): Change {
    return {
        type: Change_type.Add,
        value: {
            position: position,
            new_node: new_node
        }
    };
}

export interface Remove_change {
    position: number[];
}

function create_remove_change(position: number[]): Change {
    return {
        type: Change_type.Remove,
        value: {
            position: position
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

    if (original_node_tree !== undefined) {
        const node = get_node_at_position(original_node_tree, after_change_node_position);
        return node.word;
    }

    return { value: "$", type: Grammar.Word_type.Symbol };
}

export function parse_incrementally(
    original_node_tree: Node | undefined,
    start_change_node_position: number[],
    new_words: Scanner.Scanned_word[],
    after_change_node_position: number[],
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[] } {

    let top_of_stack: Node = original_node_tree === undefined ? create_bottom_of_stack_node() : get_node_from_stack(get_node_at_position(original_node_tree, start_change_node_position), 1) as Node;
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

                    const children = get_top_nodes_from_stack(top_of_stack, accept_action.rhs_count) as Node[];
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
                            after_change_node_position,
                            top_of_stack,
                            mark,
                            parsing_table,
                            go_to_table,
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

                    const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count);
                    if (nodes_to_reduce === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    const found = nodes_to_reduce.find(node => node === mark);
                    if (found !== undefined) {
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
                        top_of_stack,
                        go_to_table,
                        current_word
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
    top_of_stack: Node,
    go_to_table: Grammar.Go_to_column[][],
    current_word: Scanner.Scanned_word
): { success: boolean, new_top_of_stack: Node } {

    const children = get_top_nodes_from_stack(top_of_stack, production_rhs_count);
    if (children === undefined) {
        return {
            success: false,
            new_top_of_stack: top_of_stack
        };
    }
    children.reverse();

    const previous_node_after_reduction = get_node_from_stack(top_of_stack, production_rhs_count);
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

    node.children = children;
    for (let index = 0; index < children.length; ++index) {
        const child = children[index];
        child.father_node = node;
        child.index_in_father = index;
    }

    node.previous_node_on_stack = previous_node_after_reduction;
    node.word = { value: production_lhs, type: Grammar.Word_type.Symbol };
    node.state = go_to_column.next_state;
    node.production_rule_index = production_rule_index;

    if (g_debug) {
        const node_description = node_stack_to_string(node);
        const rhs = children.map(node => node.word.value).join(" ");
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
    production_rhs_count: number
): boolean {

    const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, production_rhs_count);
    if (nodes_to_reduce === undefined) {
        return false;
    }

    const mark_index = nodes_to_reduce.findIndex(node => node === mark);
    if (mark_index === -1) {
        return false;
    }

    const nodes_to_reduce_before_mark = get_top_nodes_from_stack(mark, production_rhs_count - mark_index);
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
    production_rhs_count: number
): Change[] {

    const mark_father = mark.father_node as Node;

    const top_nodes = get_top_nodes_from_stack(top_of_stack, production_rhs_count) as Node[];
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

function parse_incrementally_after_change(
    original_node_tree: Node,
    after_change_node_position: number[],
    top_of_stack: Node,
    mark: Node,
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[] } {

    let next_word_node = clone_node(get_node_at_position(original_node_tree, after_change_node_position));
    let next_word_node_position = after_change_node_position;
    let current_word_index = 0;

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
            top_of_stack = rightmost_brother;

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

            const matching_condition = matching_condition_holds(top_of_stack, mark, reduce_action.lhs, reduce_action.rhs_count);

            if (matching_condition) {
                const mark_node_position = get_node_position(mark);
                const changes = create_apply_matching_changes(top_of_stack, mark, mark_node_position, reduce_action.rhs_count);

                return {
                    status: Parse_status.Accept,
                    processed_words: current_word_index,
                    changes: changes
                };
            }
            else {
                const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count);
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
                    next_word_node = clone_node(top_of_stack.father_node as Node);
                    next_word_node_position = get_node_position(next_word_node);

                    const previous_node_on_stack = get_node_from_stack(top_of_stack, reduce_action.rhs_count) as Node;
                    next_word_node.previous_node_on_stack = previous_node_on_stack;

                    const go_to_row = go_to_table[previous_node_on_stack.state];
                    const go_to_column = go_to_row.find(column => column.label === reduce_action.lhs);
                    if (go_to_column === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    next_word_node.state = go_to_column.next_state;
                }
                else {
                    const new_node = create_bottom_of_stack_node();
                    const result = apply_reduction(new_node, reduce_action.production_rule_index, reduce_action.lhs, reduce_action.rhs_count, top_of_stack, go_to_table, next_word);

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
                old_table,
                parsing_table,
                go_to_table,
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
    old_table: number,
    parsing_table: Grammar.Action_column[][],
    go_to_table: Grammar.Go_to_column[][],
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

                    const matching_condition = matching_condition_holds(top_of_stack, mark, reduce_action.lhs, reduce_action.rhs_count);

                    if (matching_condition) {
                        const mark_node_position = get_node_position(mark);
                        const changes = create_apply_matching_changes(top_of_stack, mark, mark_node_position, reduce_action.rhs_count);

                        return {
                            status: Parse_status.Accept,
                            top_of_stack: top_of_stack,
                            mark: mark,
                            old_table: old_table,
                            changes: changes
                        };
                    }
                    else {

                        const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count);

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
                        const result = apply_reduction(new_node, reduce_action.production_rule_index, reduce_action.lhs, reduce_action.rhs_count, top_of_stack, go_to_table, next_word_node.word);

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
