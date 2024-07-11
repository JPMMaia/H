import * as Grammar from "./Grammar";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";

export interface Iterator {
    root: Parser_node.Node;
    text: string;
    node: Parser_node.Node | undefined;
    node_position: number[];
    offset: number;
    line: number;
    column: number;
}

export interface Character_position {
    offset: number;
    line: number;
    column: number;
}

function is_terminal_node_with_text(node: Parser_node.Node, position: number[]): boolean {
    return node.children.length === 0 && node.production_rule_index === undefined && node.word.value.length > 0;
}

export function begin(root: Parser_node.Node, text: string): Iterator {

    if (is_terminal_node_with_text(root, [])) {

        const ignored_characters = Scanner.ignore_whitespace_or_new_lines_and_count(text, 0);

        return {
            root: root,
            text: text,
            node: root,
            node_position: [],
            offset: ignored_characters.character_count,
            line: 1 + ignored_characters.new_line_count,
            column: 1 + ignored_characters.characters_since_last_newline
        };
    }

    const next = Parser_node.get_next_node_with_condition(root, root, [], is_terminal_node_with_text);

    if (next === undefined) {
        return end(root, text, false);
    }

    const ignored_characters = Scanner.ignore_whitespace_or_new_lines_and_count(text, 0);

    return {
        root: root,
        text: text,
        node: next.node,
        node_position: next.position,
        offset: ignored_characters.character_count,
        line: 1 + ignored_characters.new_line_count,
        column: 1 + ignored_characters.characters_since_last_newline
    };
}

export function find_end_line_and_column(text: string): Character_position {

    let offset = 0;
    let line = 1;
    let column = 1;

    for (let index = 0; index < text.length; ++index) {
        const character = text[index];
        if (Scanner.is_new_line(character)) {
            line += 1;
            column = 1;
        }
        else {
            column += 1;
        }

        offset += 1;
    }

    return {
        offset: offset,
        line: line,
        column: column
    };
}

export function end(root: Parser_node.Node, text: string, calculate_line_and_column: boolean): Iterator {

    const last_character_position: Character_position =
        calculate_line_and_column ?
            find_end_line_and_column(text) :
            { offset: text.length, line: -1, column: -1 };

    return {
        root: root,
        text: text,
        node: undefined,
        node_position: [],
        offset: text.length,
        line: last_character_position.line,
        column: last_character_position.column
    };
}

function go_to_next_word(
    iterator: Iterator
): Character_position {
    if (iterator.node === undefined) {
        return {
            offset: iterator.text.length,
            line: -1,
            column: -1
        };
    }

    let current_line = iterator.line;
    let current_column = iterator.column;
    let current_offset = iterator.offset;
    if (iterator.node.word.type === Grammar.Word_type.Comment) {
        const comments = iterator.node.word.value.split("\n");
        current_line += comments.length;
        current_column = 1;

        for (let index = 0; index < comments.length; ++index) {
            current_offset = iterator.text.indexOf("\n", current_offset) + 1;
        }
    }
    else {
        current_offset += iterator.node.word.value.length;
        current_column += iterator.node.word.value.length;
    }

    const ignored_characters = Scanner.ignore_whitespace_or_new_lines_and_count(iterator.text, current_offset);
    return {
        offset: current_offset + ignored_characters.character_count,
        line: current_line + ignored_characters.new_line_count,
        column: ignored_characters.new_line_count > 0 ?
            1 + ignored_characters.characters_since_last_newline :
            current_column + ignored_characters.characters_since_last_newline
    };
}

export function next(iterator: Iterator): Iterator {

    if (iterator.node === undefined) {
        return end(iterator.root, iterator.text, false);
    }

    const next_word_position = go_to_next_word(iterator);

    const next = Parser_node.get_next_node_with_condition(iterator.root, iterator.node, iterator.node_position, is_terminal_node_with_text);

    if (next === undefined) {
        return end(iterator.root, iterator.text, false);
    }

    return {
        root: iterator.root,
        text: iterator.text,
        node: next.node,
        node_position: next.position,
        offset: next_word_position.offset,
        line: next_word_position.line,
        column: next_word_position.column
    };
}

function find_column_value(text: string, current_offset: number): number {
    for (let index = current_offset; index > 0; --index) {
        const character_index = index - 1;
        const character = text[character_index];

        if (Scanner.is_new_line(character)) {
            return current_offset - index + 1;
        }
    }

    return current_offset + 1;
}

function go_to_previous_word(text: string, current_offset: number, previous_word: Grammar.Word, current_line: number, current_column: number): Character_position {

    let previous_word_line = current_line;
    let previous_word_column = current_column;

    for (let index = current_offset; index > 0; --index) {
        const character_index = index - 1;
        const character = text[character_index];

        if (Scanner.is_new_line(character)) {
            previous_word_line -= 1;
            previous_word_column = find_column_value(text, index - 1);
            continue;
        }

        if (!Scanner.is_whitespace_or_new_line(character)) {
            if (previous_word.type === Grammar.Word_type.Comment) {
                const comments = previous_word.value.split("\n");
                previous_word_line -= comments.length - 1;

                let offset = index - 1;
                for (let comment_index = 0; comment_index < comments.length; ++comment_index) {
                    const column = find_column_value(text, offset - 1);
                    offset -= column;
                }

                previous_word_column = find_column_value(text, offset);

                return {
                    offset: offset,
                    line: previous_word_line,
                    column: previous_word_column
                };
            }
            else {
                return {
                    offset: index - previous_word.value.length,
                    line: previous_word_line,
                    column: previous_word_column - previous_word.value.length
                };
            }
        }

        previous_word_column -= 1;
    }

    return {
        offset: 0,
        line: 0,
        column: 0
    };
}

export function previous(iterator: Iterator): Iterator | undefined {

    if (iterator.node === undefined) {
        const rightmost_descendant = Parser_node.get_rightmost_descendant(iterator.root, []);

        if (is_terminal_node_with_text(rightmost_descendant.node, rightmost_descendant.position)) {

            const previous_word_position = go_to_previous_word(iterator.text, iterator.text.length, rightmost_descendant.node.word, iterator.line, iterator.column);

            return {
                root: iterator.root,
                text: iterator.text,
                node: rightmost_descendant.node,
                node_position: rightmost_descendant.position,
                offset: previous_word_position.offset,
                line: previous_word_position.line,
                column: previous_word_position.column
            };
        }

        const previous = Parser_node.get_previous_node_with_condition(iterator.root, rightmost_descendant.node, rightmost_descendant.position, is_terminal_node_with_text);

        if (previous === undefined) {
            return undefined;
        }

        const previous_word_position = go_to_previous_word(iterator.text, iterator.offset, previous.node.word, iterator.line, iterator.column);

        return {
            root: iterator.root,
            text: iterator.text,
            node: previous.node,
            node_position: previous.position,
            offset: previous_word_position.offset,
            line: previous_word_position.line,
            column: previous_word_position.column
        };
    }

    const previous = Parser_node.get_previous_node_with_condition(iterator.root, iterator.node, iterator.node_position, is_terminal_node_with_text);
    if (previous === undefined) {
        return undefined;
    }

    const previous_word_position = go_to_previous_word(iterator.text, iterator.offset, previous.node.word, iterator.line, iterator.column);

    return {
        root: iterator.root,
        text: iterator.text,
        node: previous.node,
        node_position: previous.position,
        offset: previous_word_position.offset,
        line: previous_word_position.line,
        column: previous_word_position.column
    };
}

function is_first_child_with_text(
    root: Parser_node.Node,
    parent_node: Parser_node.Node,
    parent_node_position: number[],
    target_node: Parser_node.Node
): boolean {
    const result = Parser_node.get_next_terminal_node(root, parent_node, parent_node_position);
    return result !== undefined ? result.node === target_node : false;
}

export function add_source_locations_to_parse_tree_nodes(
    root: Parser_node.Node,
    text: string
): void {
    for (let iterator = begin(root, text); iterator.node !== undefined; iterator = next(iterator)) {
        iterator.node.source_location = { line: iterator.line, column: iterator.column };

        for (let node_position_index = iterator.node_position.length - 1; node_position_index >= 0; --node_position_index) {
            const ancestor_node_position = iterator.node_position.slice(0, node_position_index);
            const ancestor_node = Parser_node.get_node_at_position(root, ancestor_node_position);

            if (is_first_child_with_text(root, ancestor_node, ancestor_node_position, iterator.node)) {
                ancestor_node.source_location = { line: iterator.line, column: iterator.column };
            }
            else {
                break;
            }
        }
    }
}

export function get_node_source_location(
    root: Parser_node.Node,
    text: string,
    node_position: number[]
): Parser_node.Source_location | undefined {
    for (let iterator = begin(root, text); iterator.node !== undefined; iterator = next(iterator)) {

        if (is_same_position(iterator.node_position, node_position)) {
            return {
                line: iterator.line,
                column: iterator.column
            };
        }
        else if (node_position.length < iterator.node_position.length) {
            if (is_same_position(node_position, iterator.node_position.slice(0, node_position.length))) {
                return {
                    line: iterator.line,
                    column: iterator.column
                };
            }
        }
    }

    return undefined;
}

export function go_to_next_node_position(
    start_iterator: Iterator,
    node_position: number[]
): Iterator {

    let iterator = next(start_iterator);

    while (iterator.node !== undefined) {
        if (is_same_position(iterator.node_position, node_position)) {
            break;
        }

        if (node_position.length < iterator.node_position.length) {
            if (is_same_position(node_position, iterator.node_position.slice(0, node_position.length))) {
                break;
            }
        }

        iterator = next(iterator);
    }

    return iterator;
}

function is_same_position(lhs: number[], rhs: number[]): boolean {
    if (lhs.length !== rhs.length) {
        return false;
    }

    for (let index = 0; index < lhs.length; ++index) {
        if (lhs[index] !== rhs[index]) {
            return false;
        }
    }

    return true;
}
