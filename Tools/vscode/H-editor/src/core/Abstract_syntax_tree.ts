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
    Module,
    Module_body,
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
    throw Error("Not implemented!");
    return [];
}

export function get_node_at_position(root: Node, position: number[]): Node {

    let current_node = root;

    for (const child_index of position) {
        current_node = current_node.children[child_index];
    }

    return current_node;
}

export function find_node_range(root: Node, position: number[]): { start: number, end: number } {
    throw Error("Not implemented!");
    return {
        start: 0,
        end: 0
    };
}

export function find_top_level_node_position(root: Node, position: number[]): number[] {
    throw Error("Not implemented!");
    // TODO find statement, code block, function declaration, function, module
    return [];
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
