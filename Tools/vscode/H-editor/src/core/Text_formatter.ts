import * as Grammar from "./Grammar";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import { get_node_at_position, iterate_forward_with_repetition, Iterate_direction, Node } from "./Parser_node";

function should_add_space(current_word: Grammar.Word, previous_word: Grammar.Word): boolean {

    if (previous_word.type === Grammar.Word_type.Invalid && current_word.value === "module") {
        return false;
    }

    switch (previous_word.value) {
        case "->":
            return true;
    }

    switch (current_word.value) {
        case "(":
        case ")":
        case "{":
        case "}":
        case "[":
        case "]":
        case ";":
        case ":":
        case ",":
            return false;
        case "->":
            return true;
    }

    switch (previous_word.value) {
        case "(":
        case ")":
        case "{":
        case "}":
        case "[":
        case "]":
            return false;
    }

    return true;
}

export function to_string(root: Node, cache: Parse_tree_text_position_cache.Cache, production_rules_to_cache: number[]): string {

    const buffer: string[] = [];

    const indentation_width = 4;
    let indentation_count = 0;

    let current_line = 0;
    let current_column = 0;
    let current_text_offset = 0;

    let current_node: Node | undefined = root;
    let current_position: number[] = [];
    let current_direction = Iterate_direction.Down;
    let previous_word: Grammar.Word = { value: "", type: Grammar.Word_type.Invalid };

    while (current_node !== undefined) {

        if (current_direction === Iterate_direction.Down) {

            // If node corresponds to terminal:
            if (current_node.production_rule_index === undefined) {
                const word = current_node.word;

                const adding_new_line = current_node.word.value === "{" || (current_node.word.value === "}" && previous_word.value !== "{");

                if (adding_new_line) {
                    add_new_line(buffer);
                    current_line += 1;
                    current_column = 0;
                    current_text_offset += 1;
                }

                const added_new_line = buffer[buffer.length - 1] === "\n";
                const adding_space = added_new_line ? false : should_add_space(word, previous_word);

                const new_word = adding_space ? ` ${word.value}` : word.value;

                if (should_cache_node(current_node, production_rules_to_cache)) {
                    const new_word_offset = adding_space ? current_text_offset + 1 : current_text_offset;
                    Parse_tree_text_position_cache.set_entry(cache, new_word_offset, current_node, current_position);
                }

                add_word(buffer, new_word);
                current_text_offset += new_word.length;
                current_column += new_word.length;

                const add_another_line = current_node.word.value === "{" || current_node.word.value === "}" || current_node.word.value === ";";

                if (add_another_line) {
                    add_new_line(buffer);
                    current_line += 1;
                    current_column = 0;
                    current_text_offset += 1;
                }

                previous_word = current_node.word;
            }
            else {
                if (current_node.word.value === "Declaration") {
                    add_new_line(buffer);
                    current_line += 1;
                    current_column = 0;
                    current_text_offset += 1;
                }
            }
        }

        const result = iterate_forward_with_repetition(root, current_node, current_position, current_direction);
        if (result === undefined) {
            break;
        }

        current_node = result.next_node;
        current_position = result.next_position;
        current_direction = result.direction;
    }

    const output = buffer.join("");
    return output;
}

function create_indentation(indentation_width: number, indentation_count: number): string {
    return " ".repeat(indentation_width * indentation_count);
}

function add_word(buffer: string[], word: string): void {
    buffer.push(word);
}

function add_new_line(buffer: string[]): void {
    buffer.push("\n");
}

function should_cache_node(node: Node, production_rules_to_cache: number[]): boolean {
    const production_rule_index = production_rules_to_cache.find(element => element === node.production_rule_index);
    return production_rule_index !== undefined;
}
