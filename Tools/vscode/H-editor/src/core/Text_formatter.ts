import * as Grammar from "./Grammar";
import * as Parser from "./Parser";
import { get_node_at_position, iterate_forward_with_repetition, Iterate_direction, Node, Text_position } from "./Parser_node";

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

export function to_string(root: Node): string {

    const buffer: string[] = [];

    const indentation_width = 4;
    let indentation_count = 0;

    let current_text_position: Text_position = {
        line: 0,
        column: 0
    };
    root.text_position = {
        line: 0,
        column: 0
    };

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
                    current_text_position = add_new_line(buffer, current_text_position);
                }

                const added_new_line = buffer[buffer.length - 1] === "\n";
                const adding_space = added_new_line ? false : should_add_space(word, previous_word);

                current_node.text_position = {
                    line: current_text_position.line,
                    column: adding_space ? current_text_position.column + 1 : current_text_position.column
                };

                add_text_position_to_parent_nodes(root, current_position, current_node.text_position);

                current_text_position.column += add_word(buffer, adding_space ? ` ${word.value}` : word.value);

                if (current_node.word.value === "{") {
                    current_text_position = add_new_line(buffer, current_text_position);
                }
                else if (current_node.word.value === "}") {
                    current_text_position = add_new_line(buffer, current_text_position);
                }
                else if (current_node.word.value === ";") {
                    current_text_position = add_new_line(buffer, current_text_position);
                }

                previous_word = current_node.word;
            }
            else {
                if (current_node.word.value === "Declaration") {
                    current_text_position = add_new_line(buffer, current_text_position);
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

function add_word(buffer: string[], word: string): number {
    buffer.push(word);
    return word.length;
}

function add_new_line(buffer: string[], current_text_position: Text_position): Text_position {
    buffer.push("\n");
    return {
        line: current_text_position.line + 1,
        column: 0
    };
}

function add_text_position_to_parent_nodes(root: Node, position: number[], text_position: Text_position): void {

    let current_position = position;

    for (let index = 0; index < position.length; ++index) {

        const index_in_parent = current_position[current_position.length - 1];
        if (index_in_parent !== 0) {
            return;
        }

        const parent_position = current_position.slice(0, current_position.length - 1);
        const parent_node = get_node_at_position(root, parent_position);

        parent_node.text_position = {
            line: text_position.line,
            column: text_position.column
        };

        current_position = parent_position;
    }
}
