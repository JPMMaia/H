import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";

export interface Iterator {
    root: Parser_node.Node;
    text: string;
    node: Parser_node.Node | undefined;
    node_position: number[];
    offset: number;
}

function is_terminal_node_with_text(node: Parser_node.Node, position: number[]): boolean {
    return node.children.length === 0 && node.production_rule_index === undefined && node.word.value.length > 0;
}

export function begin(root: Parser_node.Node, text: string): Iterator {

    if (is_terminal_node_with_text(root, [])) {

        const offset = Scanner.ignore_whitespace_or_new_lines(text, 0);

        return {
            root: root,
            text: text,
            node: root,
            node_position: [],
            offset: offset
        };
    }

    const next = Parser_node.get_next_node_with_condition(root, root, [], is_terminal_node_with_text);

    if (next === undefined) {
        return end(root, text);
    }

    const offset = Scanner.ignore_whitespace_or_new_lines(text, 0);

    return {
        root: root,
        text: text,
        node: next.node,
        node_position: next.position,
        offset: offset
    };
}

export function end(root: Parser_node.Node, text: string): Iterator {
    return {
        root: root,
        text: text,
        node: undefined,
        node_position: [],
        offset: text.length
    };
}

function go_to_next_word(text: string, current_word_offset: number, current_word_length: number): number {
    let current_offset = current_word_offset + current_word_length;
    current_offset += Scanner.ignore_whitespace_or_new_lines(text, current_offset);
    return current_offset;
}

export function next(iterator: Iterator): Iterator {

    if (iterator.node === undefined) {
        return end(iterator.root, iterator.text);
    }

    const next_offset = go_to_next_word(iterator.text, iterator.offset, iterator.node.word.value.length);

    const next = Parser_node.get_next_node_with_condition(iterator.root, iterator.node, iterator.node_position, is_terminal_node_with_text);

    if (next === undefined) {
        return end(iterator.root, iterator.text);
    }

    return {
        root: iterator.root,
        text: iterator.text,
        node: next.node,
        node_position: next.position,
        offset: next_offset
    };
}

function go_to_previous_word(text: string, current_offset: number, previous_node_length: number): number {

    for (let index = current_offset; index > 0; --index) {
        const character_index = index - 1;
        const character = text[character_index];
        if (!Scanner.is_whitespace_or_new_line(character)) {
            return index - previous_node_length;
        }
    }

    return 0;
}

export function previous(iterator: Iterator): Iterator | undefined {

    if (iterator.node === undefined) {
        const rightmost_descendant = Parser_node.get_rightmost_descendant(iterator.root, []);

        if (is_terminal_node_with_text(rightmost_descendant.node, rightmost_descendant.position)) {

            const previous_offset = go_to_previous_word(iterator.text, iterator.text.length, rightmost_descendant.node.word.value.length);

            return {
                root: iterator.root,
                text: iterator.text,
                node: rightmost_descendant.node,
                node_position: rightmost_descendant.position,
                offset: previous_offset
            };
        }

        const previous = Parser_node.get_previous_node_with_condition(iterator.root, rightmost_descendant.node, rightmost_descendant.position, is_terminal_node_with_text);

        if (previous === undefined) {
            return undefined;
        }

        const previous_offset = go_to_previous_word(iterator.text, iterator.offset, previous.node.word.value.length);

        return {
            root: iterator.root,
            text: iterator.text,
            node: previous.node,
            node_position: previous.position,
            offset: previous_offset
        };
    }

    const previous = Parser_node.get_previous_node_with_condition(iterator.root, iterator.node, iterator.node_position, is_terminal_node_with_text);
    if (previous === undefined) {
        return undefined;
    }

    const previous_offset = go_to_previous_word(iterator.text, iterator.offset, previous.node.word.value.length);

    return {
        root: iterator.root,
        text: iterator.text,
        node: previous.node,
        node_position: previous.position,
        offset: previous_offset
    };
}
