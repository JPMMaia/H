import * as Scanner from "./Scanner";

export interface Node {
    word: Scanner.Scanned_word;
    state: number;
    production_rule_index: number | undefined;
    children: Node[];
}

export function clone_node(node: Node): Node {
    return {
        word: { value: node.word.value, type: node.word.type },
        state: node.state,
        production_rule_index: node.production_rule_index,
        children: node.children,
    };
}

export function get_node_at_position(root: Node, position: number[]): Node {

    let current_node = root;

    for (const child_index of position) {
        current_node = current_node.children[child_index];
    }

    return current_node;
}

export function find_node_common_root(first_position: number[], second_position: number[]): number[] {

    const smallest_length = Math.min(first_position.length, second_position.length);

    for (let index = 0; index < smallest_length; ++index) {
        if (first_position[index] !== second_position[index]) {
            return first_position.slice(0, index);
        }
    }

    return first_position.slice(0, smallest_length);
}

export function is_node_ancestor_of(ancestor_position: number[], node_position: number[]): boolean {

    if (ancestor_position.length >= node_position.length) {
        return false;
    }

    for (let index = 0; index < ancestor_position.length; ++index) {
        if (ancestor_position[index] !== node_position[index]) {
            return false;
        }
    }

    return true;
}

export function is_valid_position(root: Node, position: number[]): boolean {

    if (position === undefined) {
        return false;
    }

    let current_node = root;

    for (const child_index of position) {
        if (child_index >= current_node.children.length) {
            return false;
        }

        current_node = current_node.children[child_index];
    }

    return true;
}

export function is_same_position(first: number[], second: number[]): boolean {
    if (first.length !== second.length) {
        return false;
    }

    for (let index = 0; index < first.length; ++index) {
        if (first[index] !== second[index]) {
            return false;
        }
    }

    return true;
}

export function is_terminal_node(node: Node): boolean {
    return node.children.length === 0 && node.production_rule_index === undefined;
}

export function get_next_terminal_node(root: Node, current_node: Node, current_node_position: number[]): { node: Node, position: number[] } | undefined {

    const is_terminal_node = (node: Node, position: number[]): boolean => {
        return node.children.length === 0 && node.production_rule_index === undefined;
    };

    return get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node);
}

export function get_next_sibling_terminal_node(root: Node, current_node: Node, current_node_position: number[]): { node: Node, position: number[] } | undefined {
    const is_terminal_node = (node: Node, position: number[]): boolean => {
        return node.children.length === 0 && node.production_rule_index === undefined;
    };

    return get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node, Iterate_direction.Up);
}

export function get_next_node_with_condition(root: Node, current_node: Node, current_node_position: number[], condition: (node: Node, position: number[]) => boolean, initial_direction?: Iterate_direction): { node: Node, position: number[] } | undefined {
    let result = iterate_forward(root, current_node, current_node_position, initial_direction);

    while (result !== undefined) {
        if (condition(result.next_node, result.next_position)) {
            return {
                node: result.next_node,
                position: result.next_position
            };
        }

        result = iterate_forward(root, result.next_node, result.next_position);
    }

    return undefined;
}

export function get_previous_node_with_condition(root: Node, current_node: Node, current_node_position: number[], condition: (node: Node, position: number[]) => boolean): { node: Node, position: number[] } | undefined {
    let result = iterate_backward(root, current_node, current_node_position);

    while (result !== undefined) {
        if (condition(result.previous_node, result.previous_position)) {
            return {
                node: result.previous_node,
                position: result.previous_position
            };
        }

        result = iterate_backward(root, result.previous_node, result.previous_position);
    }

    return undefined;
}

export function get_parent_position(position: number[]): number[] {
    return [...position.slice(0, position.length - 1)];
}

export function have_same_parent(node_positions: number[][]): boolean {

    if (node_positions.length <= 1) {
        return true;
    }

    const parent_position = node_positions[0].slice(0, node_positions[0].length - 1);

    for (let node_index = 1; node_index < node_positions.length; ++node_index) {
        const current_node_position = node_positions[node_index];

        if ((parent_position.length + 1) !== current_node_position.length) {
            return false;
        }

        for (let position_index = 0; position_index < parent_position.length; ++position_index) {
            if (parent_position[position_index] !== current_node_position[position_index]) {
                return false;
            }
        }
    }

    return true;
}

export function get_rightmost_brother(root: Node, position: number[]): { node: Node, position: number[] } {

    if (position.length === 0) {
        return {
            node: root,
            position: []
        };
    }

    const parent_node_position = position.slice(0, position.length - 1);
    const parent_node = get_node_at_position(root, parent_node_position);

    const rightmost_brother_position = [...position.slice(0, position.length - 1), parent_node.children.length - 1];
    const rightmost_brother = parent_node.children[parent_node.children.length - 1];

    return {
        node: rightmost_brother,
        position: rightmost_brother_position
    };
}

export function get_rightmost_terminal_descendant(node: Node): Scanner.Scanned_word {

    if (node.children.length === 0) {
        return node.word;
    }

    return get_rightmost_terminal_descendant(node.children[node.children.length - 1]);
}

export function get_rightmost_descendant(node: Node, position: number[]): { node: Node, position: number[] } {
    if (node.children.length === 0) {
        return {
            node: node,
            position: position
        };
    }

    const current_position = [...position];
    let current_node = node;

    while (current_node.children.length > 0) {
        current_position.push(current_node.children.length - 1);
        current_node = current_node.children[current_node.children.length - 1];
    }

    return {
        node: current_node,
        position: current_position
    };
}

export function get_leftmost_descendant(node: Node, position: number[]): { node: Node, position: number[] } {
    if (node.children.length === 0) {
        return {
            node: node,
            position: position
        };
    }

    const current_position = [...position];
    let current_node = node;

    while (current_node.children.length > 0) {
        current_position.push(0);
        current_node = current_node.children[0];
    }

    return {
        node: current_node,
        position: current_position
    };
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

export function iterate_forward(root: Node, current_node: Node, current_position: number[], initial_direction?: Iterate_direction): { next_node: Node, next_position: number[] } | undefined {

    let result = iterate_forward_with_repetition(root, current_node, current_position, initial_direction ? initial_direction : Iterate_direction.Down);

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

export function iterate_backward_with_repetition(root: Node, current_node: Node, current_position: number[], direction: Iterate_direction): { previous_node: Node, previous_position: number[], direction: Iterate_direction } | undefined {

    if (direction === Iterate_direction.Down && current_node.children.length > 0) {
        return {
            previous_node: current_node.children[current_node.children.length - 1],
            previous_position: [...current_position, current_node.children.length - 1],
            direction: Iterate_direction.Down
        };
    }

    if (current_position.length === 0) {
        return undefined;
    }

    const current_node_index = current_position[current_position.length - 1];

    const parent_position = current_position.slice(0, current_position.length - 1);
    const parent_node = get_node_at_position(root, parent_position);

    if (current_node_index > 0) {
        const previous_sibling_node_index = current_node_index - 1;
        return {
            previous_node: parent_node.children[previous_sibling_node_index],
            previous_position: [...parent_position, previous_sibling_node_index],
            direction: Iterate_direction.Down
        };
    }

    return {
        previous_node: parent_node,
        previous_position: parent_position,
        direction: Iterate_direction.Up
    };
}

export function iterate_backward(root: Node, current_node: Node, current_position: number[]): { previous_node: Node, previous_position: number[] } | undefined {

    let result = iterate_backward_with_repetition(root, current_node, current_position, Iterate_direction.Down);

    while (result !== undefined && result.direction === Iterate_direction.Up) {
        result = iterate_backward_with_repetition(root, result.previous_node, result.previous_position, result.direction);
    }

    if (result === undefined) {
        return result;
    }

    return {
        previous_node: result.previous_node,
        previous_position: result.previous_position
    };
}

export function are_equal(lhs: Node, rhs: Node): boolean {

    if (lhs.word.value !== rhs.word.value || lhs.word.type !== rhs.word.type) {
        return false;
    }

    if (lhs.state !== rhs.state) {
        return false;
    }

    if (lhs.production_rule_index !== rhs.production_rule_index) {
        return false;
    }

    if (lhs.children.length !== rhs.children.length) {
        return false;
    }

    for (let child_index = 0; child_index < lhs.children.length; ++child_index) {
        const lhs_child = lhs.children[child_index];
        const rhs_child = rhs.children[child_index];

        if (!are_equal(lhs_child, rhs_child)) {
            return false;
        }
    }

    return true;
}

export function join_all_child_node_values(node: Node): string {

    const values: string[] = [];

    const stack: Node[] = [];
    stack.push(node);

    while (stack.length > 0) {
        const current_node = stack.pop() as Node;
        if (current_node.children.length === 0 && current_node.production_rule_index === undefined) {
            values.push(current_node.word.value);
        }

        for (let index = 0; index < current_node.children.length; ++index) {
            const child_index = current_node.children.length - 1 - index;
            stack.push(current_node.children[child_index]);
        }
    }

    const value = values.join("");
    return value;
}

export function find_descendant_position_if(node: Node, predicate: (node: Node) => boolean): { node: Node, position: number[] } | undefined {

    const list: Node[] = [];
    const positions: number[][] = [];

    for (let index = 0; index < node.children.length; ++index) {
        const child = node.children[index];
        list.push(child);
        positions.push([index]);
    }

    while (list.length > 0) {
        const node = list.splice(0, 1)[0];
        const position = positions.splice(0, 1)[0];

        if (predicate(node)) {
            return {
                node: node,
                position: position
            };
        }

        for (let index = 0; index < node.children.length; ++index) {
            const child = node.children[index];
            list.push(child);
            positions.push([...position, index]);

        }
    }

    return undefined;
}
