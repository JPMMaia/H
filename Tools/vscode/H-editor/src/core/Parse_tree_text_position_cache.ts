import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";

const g_debug = true;

interface Cache_entry {
    offset: number;
    node: Parser_node.Node;
    node_position: number[];
}

export interface Cache {
    elements: Cache_entry[];
}

export function create_cache(): Cache {
    return {
        elements: []
    };
}

function are_adjacent_offsets_ordered(elements: Cache_entry[], index: number): number {

    const current_element = elements[index];

    if (index > 0) {
        const previous_element = elements[index - 1];
        if (previous_element.offset > current_element.offset) {
            return -1;
        }
    }

    if ((index + 1) < elements.length) {
        const next_element = elements[index + 1];
        if (next_element.offset < current_element.offset) {
            return 1;
        }
    }

    return 0;
}

function swap_elements(elements: Cache_entry[], first_index: number, second_index: number): void {
    const temp = elements[first_index];
    elements[first_index] = elements[second_index];
    elements[second_index] = temp;
}

function insert_to_sorted_position(elements: Cache_entry[], offset: number, node: Parser_node.Node, node_position: number[]): void {

    const new_element: Cache_entry = {
        offset: offset,
        node: node,
        node_position: node_position
    };

    for (let index = 0; index < elements.length; ++index) {
        if (elements[index].offset > offset) {
            elements.splice(index, 0, new_element);
            return;
        }
    }

    elements.push(new_element);
}

function sort_after_offset_update(elements: Cache_entry[], update_index: number): void {

    let current_index = update_index;
    let order_result = are_adjacent_offsets_ordered(elements, current_index);

    while (order_result !== 0) {

        if (order_result === -1) {
            swap_elements(elements, current_index - 1, current_index);
            current_index = current_index - 1;
        }
        else {
            swap_elements(elements, current_index, current_index + 1);
            current_index = current_index + 1;
        }

        order_result = are_adjacent_offsets_ordered(elements, current_index);
    }
}

export function set_entry(cache: Cache, offset: number, node: Parser_node.Node, node_position: number[]): void {

    const index = cache.elements.findIndex(element => element.node === node);
    if (index === -1) {
        insert_to_sorted_position(cache.elements, offset, node, node_position);
    }
    else {
        cache.elements[index].offset = offset;
        sort_after_offset_update(cache.elements, index);
    }
}

export function delete_entry(cache: Cache, node: Parser_node.Node): void {
    const index = cache.elements.findIndex(element => element.node === node);
    if (index !== -1) {
        cache.elements.splice(index, 1);
    }
}

export function has_node(cache: Cache, node: Parser_node.Node): boolean {
    const index = cache.elements.findIndex(element => element.node === node);
    return index !== -1;
}

export function update_offsets(cache: Cache, start_offset: number, delta_offset: number): void {

    const start_element_index = cache.elements.findIndex(element => element.offset >= start_offset);

    if (start_element_index === -1) {
        return;
    }

    for (let index = start_element_index; index < cache.elements.length; ++index) {
        const element = cache.elements[index];
        element.offset += delta_offset;
    }
}

function is_terminal_node_with_text(node: Parser_node.Node, position: number[]): boolean {
    return node.children.length === 0 && node.production_rule_index === undefined && node.word.value.length > 0;
}

function go_to_next_word(text: string, current_word_offset: number, current_word_length: number): number {
    let current_offset = current_word_offset + current_word_length;
    current_offset += Scanner.ignore_whitespace_or_new_lines(text, current_offset);
    return current_offset;
}

function iterate_forward_until_offset(root: Parser_node.Node, start_offset: number, start_node: Parser_node.Node, start_node_position: number[], target_offset: number, text: string): { node: Parser_node.Node, position: number[] } | undefined {

    let current_offset = start_offset;
    let current_node = start_node;
    let current_node_position = start_node_position;

    const is_node_at_offset = (node: Parser_node.Node, offset: number): boolean => {
        return target_offset < (offset + node.word.value.length);
    };

    if (!is_terminal_node_with_text(current_node, current_node_position)) {
        let result = Parser_node.get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node_with_text);
        if (result === undefined) {
            return { node: current_node, position: current_node_position };
        }

        current_node = result.node;
        current_node_position = result.position;
    }

    if (is_node_at_offset(current_node, current_offset)) {
        return { node: current_node, position: current_node_position };
    }

    let result = Parser_node.get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node_with_text);

    while (result !== undefined) {

        current_offset = go_to_next_word(text, current_offset, current_node.word.value.length);
        current_node = result.node;
        current_node_position = result.position;

        if (g_debug) {
            const range = Scanner.get_next_word_range(text, current_offset);
            if (range.start !== current_offset) {
                throw Error("Error: expected range.start === current_offset");
            }
            const current_word = text.substring(range.start, range.end);
            if (current_node.word.value !== current_word) {
                throw Error("Error: expected current_node.word.value === current_word");
            }
        }

        if (is_node_at_offset(current_node, current_offset)) {
            return { node: current_node, position: current_node_position };
        }

        result = Parser_node.get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node_with_text);
    }

    return undefined;
}

export function get_node(cache: Cache, offset: number, root: Parser_node.Node, text: string): { node: Parser_node.Node, position: number[] } | undefined {

    const index = cache.elements.findIndex(element => element.offset >= offset);

    if (index !== -1) {
        const cached_element = cache.elements[index];

        if (offset === cached_element.offset) {
            const node_and_position = iterate_forward_until_offset(root, cached_element.offset, cached_element.node, cached_element.node_position, offset, text);
            return node_and_position;
        }
        else if (index === 0 && offset < cached_element.offset) {
            const node_and_position = iterate_forward_until_offset(root, 0, root, [], offset, text);
            return node_and_position;
        }
    }

    const cached_element = index > 0 ? cache.elements[index - 1] : cache.elements[cache.elements.length - 1];

    const node_and_position = iterate_forward_until_offset(root, cached_element.offset, cached_element.node, cached_element.node_position, offset, text);
    return node_and_position;
}

function find_closest_element_index_to_offset(elements: Cache_entry[], node_position: number[]): number {

    let element_index = 0;

    for (let position_index = 0; position_index < node_position.length; ++position_index) {

        const child_index = node_position[position_index];

        while (element_index < elements.length) {
            const element = elements[element_index];
            const cached_child_index = element.node_position[position_index];

            for (let index = 0; index < position_index; ++index) {
                if (node_position[index] !== element.node_position[index]) {
                    return element_index - 1;
                }
            }

            // If is ancestor:
            if (cached_child_index === undefined) {
                return element_index;
            }

            if (child_index === cached_child_index) {
                break;
            }

            if (child_index < cached_child_index) {
                return element_index - 1;
            }

            element_index += 1;
        }
    }

    return node_position.length - 1;
}

export function get_offset(cache: Cache, root: Parser_node.Node, node: Parser_node.Node, node_position: number[], text: string): number {

    {
        const index = cache.elements.findIndex(element => element.node === node);

        if (index !== -1) {
            const cached_element = cache.elements[index];
            return cached_element.offset;
        }
    }

    const closest_element_index = find_closest_element_index_to_offset(cache.elements, node_position);
    const closest_element = cache.elements[closest_element_index];

    let current_node = closest_element.node;
    let current_node_position = closest_element.node_position;
    let current_offset = closest_element.offset;

    if (!is_terminal_node_with_text(current_node, current_node_position)) {
        let result = Parser_node.get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node_with_text);
        if (result === undefined) {
            throw Error("Could not find offset of node!");
        }
        current_node = result.node;
        current_node_position = result.position;

        if (Parser_node.is_same_position(node_position, current_node_position) || Parser_node.is_node_ancestor_of(node_position, current_node_position)) {
            return current_offset;
        }
    }

    let result = Parser_node.get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node_with_text);

    while (result !== undefined) {
        current_offset = go_to_next_word(text, current_offset, current_node.word.value.length);
        current_node = result.node;
        current_node_position = result.position;

        if (Parser_node.is_same_position(node_position, current_node_position) || Parser_node.is_node_ancestor_of(node_position, current_node_position)) {
            return current_offset;
        }

        result = Parser_node.get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node_with_text);
    }

    throw Error("Could not find offset of node!");
}
