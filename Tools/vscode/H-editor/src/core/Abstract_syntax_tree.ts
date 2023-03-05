export enum Token {
    Code_block,
    Code_block_close_keyword,
    Code_block_open_keyword,
    Expression_binary_operation,
    Expression_binary_operation_keyword,
    Expression_constant,
    Expression_defer,
    Expression_defer_keyword,
    Expression_return,
    Expression_return_keyword,
    Expression_variable_declaration,
    Expression_variable_declaration_assignment,
    Expression_variable_declaration_keyword,
    Expression_variable_declaration_name,
    Expression_variable_reference,
    Function,
    Function_declaration,
    Function_declaration_keyword,
    Function_declaration_input_parameters,
    Function_declaration_name,
    Function_declaration_output_parameters,
    Function_declaration_parameters_separator,
    Function_declaration_end,
    Function_parameter,
    Function_parameter_name,
    Function_parameter_separator,
    Function_parameter_type,
    Function_parameters_close_keyword,
    Function_parameters_open_keyword,
    Function_parameters_separator,
    Invalid,
    Module,
    Module_body,
    Module_head,
    Statement,
    Statement_end,
}

export interface Cache {
    relative_start: number;
}

export interface Node {
    value: string;
    token: Token;
    children: Node[];
    cache: Cache;
}

export function find_node_position(root: Node, offset: number): number[] {

    const current_position: number[] = [];

    let current_node = root;
    let current_offset = 0;

    while (current_node.children.length > 0) {

        const overflow_child_index = current_node.children.findIndex(node => (current_offset + node.cache.relative_start) > offset);

        if (overflow_child_index === 0) {
            return current_position;
        }

        const child_index = overflow_child_index === -1 ? current_node.children.length - 1 : overflow_child_index - 1;
        const child = current_node.children[child_index];

        current_node = child;
        current_position.push(child_index);
        current_offset += child.cache.relative_start;
    }

    return current_position;
}

export function find_node_common_root(first_position: number[], second_position: number[]): number[] {

    const smallest_length = Math.min(find_node_position.length, second_position.length);

    for (let index = 0; index < smallest_length; ++index) {
        if (first_position[index] !== second_position[index]) {
            return first_position.slice(0, index);
        }
    }

    return first_position.slice(0, smallest_length);
}

export function get_node_at_position(root: Node, position: number[]): Node {

    let current_node = root;

    for (const child_index of position) {
        current_node = current_node.children[child_index];
    }

    return current_node;
}

export function get_node_and_offset_at_position(root: Node, position: number[]): { node: Node, offset: number } {

    let current_node = root;
    let offset = root.cache.relative_start;

    for (const child_index of position) {
        current_node = current_node.children[child_index];
        offset += current_node.cache.relative_start;
    }

    return {
        node: current_node,
        offset: offset
    };
}

export function find_node_range(root: Node, end: number, position: number[]): { start: number, end: number } {

    const node_and_offset = get_node_and_offset_at_position(root, position);

    let iteration_result = iterate_forward_with_repetition(root, node_and_offset.node, position, Iterate_direction.Up);
    while (iteration_result !== undefined && iteration_result.direction === Iterate_direction.Up) {
        iteration_result = iterate_forward_with_repetition(root, iteration_result.next_node, iteration_result.next_position, iteration_result.direction);
    }

    return {
        start: node_and_offset.offset,
        end: iteration_result !== undefined ? get_node_and_offset_at_position(root, iteration_result.next_position).offset : end
    };
}

export function is_top_level_token(token: Token): boolean {
    switch (token) {
        case Token.Code_block:
        case Token.Function:
        case Token.Function_declaration:
        case Token.Module:
        case Token.Module_body:
        case Token.Statement:
            return true;
        default:
            return false;
    }
}

export function find_top_level_node_position(root: Node, position: number[]): number[] {

    const current_position = [...position];
    let current_node = get_node_at_position(root, current_position);

    while (!is_top_level_token(current_node.token) && current_position.length > 0) {

        current_position.pop();
        current_node = get_node_at_position(root, current_position);
    }

    return current_position;
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

export function find_nodes_of_range(root: Node, start: number, end: number): { parent_position: number[] | undefined, child_indices: { start: number, end: number } } {

    const start_position = find_node_position(root, start);
    const start_top_position = find_top_level_node_position(root, start_position);

    const end_position = find_node_position(root, end - 1);
    const end_top_position = find_top_level_node_position(root, end_position);

    if (start_top_position.length === 0 || end_top_position.length === 0) {
        return {
            parent_position: undefined,
            child_indices: {
                start: 0,
                end: 1
            }
        };
    }

    const common_position = find_node_common_root(start_top_position, end_top_position);
    const should_get_parent = (common_position.length === start_top_position.length || common_position.length === end_top_position.length) && common_position.length > 0;
    const parent_position = should_get_parent ? common_position.slice(0, common_position.length - 1) : common_position;

    return {
        parent_position: parent_position,
        child_indices: {
            start: start_top_position[start_top_position.length - 1],
            end: end_top_position[end_top_position.length - 1] + 1
        }
    };
}

export function shallow_copy(to: Node, from: Node): void {
    to.value = from.value;
    to.token = from.token;
    to.children = [...from.children];
    to.cache.relative_start = from.cache.relative_start;
}

export function find_child_index_with_token(node: Node, token: Token): number {
    return node.children.findIndex(child => child.token === token);
}

export function find_child_with_token(node: Node, token: Token): Node | undefined {
    return node.children.find(child => child.token === token);
}

export function is_shallow_equal(first: Node, second: Node): boolean {
    return first.value === second.value && first.token === second.token;
}
