import { get_next_node_with_condition, get_previous_node_with_condition, Node, Text_position } from "./Parser_node";
import * as Scanner from "./Scanner";

function find_child_at_text_position(children: Node[], text_position: Text_position, prefer_before_node: boolean): number | undefined {

    for (let child_index = 0; child_index < children.length; ++child_index) {
        const child_node = children[child_index];

        const child_text_position = child_node.text_position as Text_position;
        if (text_position.line < child_text_position.line) {
            if (prefer_before_node) {
                return child_index > 0 ? child_index - 1 : undefined;
            }
            else {
                return child_index;
            }
        }

        //             Prefer before       Prefer after
        // abc | def   0                   1
        // abc |def    0                   1
        // abc| def    0                   1
        // ab|c        0                   0
        // |abc        undefined           0
        // abc|        0                   undefined

        if (text_position.line === child_text_position.line) {
            if ((child_text_position.column < text_position.column) && (child_text_position.column + child_node.word.value.length) > text_position.column) {
                return child_index;
            }
            else if (child_text_position.column >= text_position.column) {
                if (prefer_before_node) {
                    return child_index > 0 ? child_index - 1 : undefined;
                }
                else {
                    return child_index;
                }
            }
        }
    }

    return prefer_before_node ? children.length - 1 : undefined;
}

export function get_node_before_text_position(root: Node, text_position: Text_position): { node: Node, position: number[] } | undefined {

    const current_node_position: number[] = [];
    let current_node = root;

    while (current_node.children.length > 0) {
        const child_index = find_child_at_text_position(current_node.children, text_position, true);
        if (child_index === undefined) {
            return undefined;
        }

        current_node_position.push(child_index);
        current_node = current_node.children[child_index];
    }

    if (!is_terminal_node_with_text(current_node, current_node_position)) {
        return get_previous_node_with_condition(root, current_node, current_node_position, is_terminal_node_with_text);
    }

    return {
        node: current_node,
        position: current_node_position
    };
}

export function get_node_after_text_position(root: Node, text_position: Text_position): { node: Node, position: number[] } | undefined {

    const current_node_position: number[] = [];
    let current_node = root;

    while (current_node.children.length > 0) {
        const child_index = find_child_at_text_position(current_node.children, text_position, true);
        if (child_index === undefined) {
            current_node_position.splice(0, current_node_position.length);
            current_node = root;
            break;
        }

        current_node_position.push(child_index);
        current_node = current_node.children[child_index];
    }

    const is_terminal_node_with_text_after = (node: Node, position: number[]): boolean => {

        if (!is_terminal_node_with_text(node, position)) {
            return false;
        }

        const node_text_position = node.text_position as Text_position;

        if (text_position.line < node_text_position.line) {
            return true;
        }

        if (text_position.line === node_text_position.line && text_position.column < node_text_position.column + node.word.value.length) {
            return true;
        }

        return false;
    };

    if (!is_terminal_node_with_text_after(current_node, current_node_position)) {
        return get_next_node_with_condition(root, current_node, current_node_position, is_terminal_node_with_text_after);
    }

    return {
        node: current_node,
        position: current_node_position
    };
}

export function get_text_before_start(
    start_text_position: Text_position,
    start_node: Node | undefined,
): string {

    if (start_node === undefined) {
        return "";
    }

    const node_text_position = start_node.text_position as Text_position;

    if (node_text_position.line < start_text_position.line) {
        return start_node.word.value + "\n".repeat(start_text_position.line - node_text_position.line);
    }

    const node_end_position = node_text_position.column + start_node.word.value.length;

    if (node_end_position <= start_text_position.column) {
        return start_node.word.value + " ".repeat(start_text_position.column - node_end_position);
    }

    const new_length = start_node.word.value.length - (node_end_position - start_text_position.column);
    return start_node.word.value.substring(0, new_length);
}

export function get_text_after_end(
    end_text_position: Text_position,
    end_node: Node | undefined
): string {

    if (end_node === undefined) {
        return "";
    }

    const node_text_position = end_node.text_position as Text_position;

    if (node_text_position.line > end_text_position.line) {
        return "\n".repeat(node_text_position.line - end_text_position.line) + end_node.word.value;
    }

    if (end_text_position.column <= node_text_position.column) {
        return " ".repeat(node_text_position.column - end_text_position.column) + end_node.word.value;
    }

    const new_start = end_text_position.column - node_text_position.column;
    return end_node.word.value.substring(new_start, end_node.word.value.length);
}

function is_terminal_node_with_text(node: Node, position: number[]): boolean {
    return node.children.length === 0 && node.production_rule_index === undefined && node.word.value.length > 0;
}

function try_to_skip_first_word_and_calulate_start_change_node(root: Node, before: { node: Node, position: number[] } | undefined, after: { node: Node, position: number[] } | undefined, new_words: Scanner.Scanned_word[]): { node: Node, position: number[] } | undefined {
    if (before !== undefined && new_words.length > 0 && new_words[0].value === before.node.word.value) {
        new_words.splice(0, 1);

        const new_before = get_previous_node_with_condition(root, before.node, before.position, is_terminal_node_with_text);
        return new_before !== undefined ? new_before : after;
    }

    return before !== undefined ? before : after;
}

function try_to_skip_last_word_and_calculate_after_change_node(root: Node, before: { node: Node, position: number[] } | undefined, after: { node: Node, position: number[] } | undefined, new_words: Scanner.Scanned_word[]): { node: Node, position: number[] } | undefined {
    if (after !== undefined) {
        // Only skip if before and after nodes are not the same:
        if (before === undefined || before.node !== after.node) {
            if (new_words.length > 0 && new_words[new_words.length - 1].value === after.node.word.value) {
                new_words.splice(new_words.length - 1, 1);
                return after;
            }
        }

        const new_after = get_next_node_with_condition(root, after.node, after.position, is_terminal_node_with_text);
        return new_after;
    }

    return after;
}

export function scan_new_change(
    root: Node,
    start_text_position: Text_position,
    end_text_position: Text_position,
    new_text: string
): { start_change: { node: Node, position: number[] } | undefined, after_change: { node: Node, position: number[] } | undefined, new_words: Scanner.Scanned_word[] } {

    // Find node before start text position:
    const before = get_node_before_text_position(root, start_text_position);

    // Find node after end text position:
    const after = get_node_after_text_position(root, end_text_position);

    // Concatenate text before start + new text + text after end:
    const text_before = get_text_before_start(start_text_position, before ? before.node : undefined);
    const text_after = get_text_after_end(end_text_position, after ? after.node : undefined);
    const text = text_before + new_text + text_after;

    // Scan new words:
    const new_words = Scanner.scan(text, 0, text.length);

    // Skip unchanged words and calculate start and after change nodes:
    const start_change = try_to_skip_first_word_and_calulate_start_change_node(root, before, after, new_words);
    const after_change = try_to_skip_last_word_and_calculate_after_change_node(root, before, after, new_words);

    return {
        start_change: start_change,
        after_change: after_change,
        new_words: new_words
    };
}
