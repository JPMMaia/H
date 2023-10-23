import { get_next_node_with_condition, get_previous_node_with_condition, is_same_position, Node } from "./Parser_node";
import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";
import * as Scanner from "./Scanner";

export function get_node_before_text_position(root: Node, text: string, offset: number): Parse_tree_text_iterator.Iterator | undefined {

    let previous = undefined;
    let iterator = Parse_tree_text_iterator.begin(root, text);

    while (iterator.node !== undefined && iterator.offset < offset) {
        previous = iterator;
        iterator = Parse_tree_text_iterator.next(iterator);
    }

    return previous;
}

export function get_node_after_text_position(root: Node, text: string, offset: number): Parse_tree_text_iterator.Iterator {

    let previous = undefined;
    let iterator = Parse_tree_text_iterator.begin(root, text);

    while (iterator.node !== undefined && iterator.offset < offset) {
        previous = iterator;
        iterator = Parse_tree_text_iterator.next(iterator);
    }

    if (previous !== undefined && previous.node !== undefined && offset < (previous.offset + previous.node.word.value.length)) {
        return previous;
    }

    return iterator;
}

export function get_text_before_start(
    start_text_offset: number,
    start_iterator: Parse_tree_text_iterator.Iterator | undefined,
): string {

    if (start_iterator === undefined || start_iterator.node === undefined) {
        return "";
    }

    const node = start_iterator.node;

    if ((start_iterator.offset + node.word.value.length) < start_text_offset) {
        return node.word.value + " ";
    }

    const new_length = start_text_offset - start_iterator.offset;
    return node.word.value.substring(0, new_length);
}

export function get_text_after_end(
    end_text_offset: number,
    end_iterator: Parse_tree_text_iterator.Iterator
): string {

    if (end_iterator.node === undefined) {
        return "";
    }

    const node = end_iterator.node;

    if (end_text_offset < end_iterator.offset) {
        return " " + node.word.value;
    }

    const new_start = end_text_offset - end_iterator.offset;
    return node.word.value.substring(new_start, node.word.value.length);
}

function is_terminal_node_with_text(node: Node, position: number[]): boolean {
    return node.children.length === 0 && node.production_rule_index === undefined && node.word.value.length > 0;
}

function try_to_skip_first_word_and_calulate_start_change_node(root: Node, before: Parse_tree_text_iterator.Iterator | undefined, after: Parse_tree_text_iterator.Iterator, new_words: Scanner.Scanned_word[]): Parse_tree_text_iterator.Iterator | undefined {
    if (before !== undefined && before.node !== undefined && new_words.length > 0 && new_words[0].value === before.node.word.value) {
        new_words.splice(0, 1);

        const new_before = Parse_tree_text_iterator.next(before);
        return new_before;
    }

    return before !== undefined && before.node !== undefined ? before : after;
}

function try_to_skip_last_word_and_calculate_after_change_node(root: Node, before: Parse_tree_text_iterator.Iterator | undefined, after: Parse_tree_text_iterator.Iterator, new_words: Scanner.Scanned_word[]): Parse_tree_text_iterator.Iterator {
    if (after.node !== undefined) {
        // Only skip if before and after nodes are not the same:
        if (before === undefined || before.node !== after.node) {
            if (new_words.length > 0 && new_words[new_words.length - 1].value === after.node.word.value) {
                new_words.splice(new_words.length - 1, 1);
                return after;
            }
        }

        const new_after = Parse_tree_text_iterator.next(after);
        return new_after;
    }

    return after;
}

export function scan_new_change(
    root: Node | undefined,
    text: string,
    start_text_offset: number,
    end_text_offset: number,
    new_text: string
): { start_change: Parse_tree_text_iterator.Iterator | undefined, after_change: Parse_tree_text_iterator.Iterator | undefined, new_words: Scanner.Scanned_word[] } {

    if (root === undefined) {
        const new_words = Scanner.scan(new_text, 0, new_text.length);
        return {
            start_change: undefined,
            after_change: undefined,
            new_words: new_words
        };
    }

    // Find iterator before start text position:
    const before_iterator = get_node_before_text_position(root, text, start_text_offset);

    // Find iterator after end text position:
    const after_iterator = get_node_after_text_position(root, text, end_text_offset);

    // Concatenate text before start + new text + text after end:
    const text_before = get_text_before_start(start_text_offset, before_iterator);
    const text_after = get_text_after_end(end_text_offset, after_iterator);
    const concatenated_text = text_before + new_text + text_after;

    // Scan new words:
    const new_words = Scanner.scan(concatenated_text, 0, concatenated_text.length);

    // Skip unchanged words and calculate start and after change nodes:
    const start_change = try_to_skip_first_word_and_calulate_start_change_node(root, before_iterator, after_iterator, new_words);
    const after_change = try_to_skip_last_word_and_calculate_after_change_node(root, before_iterator, after_iterator, new_words);

    return {
        start_change: start_change,
        after_change: after_change,
        new_words: new_words
    };
}

export function has_meaningful_content(changes: { start_change: Parse_tree_text_iterator.Iterator | undefined, after_change: Parse_tree_text_iterator.Iterator | undefined, new_words: Scanner.Scanned_word[] }): boolean {

    if (changes.new_words.length > 0) {
        return true;
    }

    if (changes.start_change === undefined && changes.after_change === undefined) {
        return false;
    }

    if ((changes.start_change !== undefined && changes.after_change === undefined) || (changes.start_change === undefined && changes.after_change !== undefined)) {
        return true;
    }

    return changes.start_change?.offset !== changes.after_change?.offset;
}
