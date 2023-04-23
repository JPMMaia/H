import * as Grammar from "./Grammar";
import * as Parser from "./Parser";

export function to_string(root: Parser.Node): string {

    const buffer: string[] = [];

    const indentation_width = 4;
    let indentation_count = 0;

    let current_text_position: Parser.Text_position = {
        line: 0,
        column: 0
    };
    root.text_position = {
        line: 0,
        column: 0
    };

    let current_node: Parser.Node | undefined = root;
    let current_position: number[] = [];
    let current_direction = Parser.Iterate_direction.Down;
    let is_symbol = true;

    while (current_node !== undefined) {

        if (current_direction === Parser.Iterate_direction.Down) {

            // If node corresponds to terminal:
            if (current_node.production_rule_index === undefined) {
                const word = current_node.word;

                if (current_node.word.value === "{") {
                    current_text_position = add_new_line(buffer, current_text_position);
                }
                else if (current_node.word.value === "}") {
                    current_text_position = add_new_line(buffer, current_text_position);
                }

                const add_space = !is_symbol && word.type !== Grammar.Word_type.Symbol;
                is_symbol = word.type === Grammar.Word_type.Symbol;

                current_node.text_position = {
                    line: current_text_position.line,
                    column: add_space ? current_text_position.column + 1 : current_text_position.column
                };
                add_text_position_to_parent_nodes(current_node, current_node.text_position);

                current_text_position.column += add_word(buffer, add_space ? ` ${word.value}` : word.value);

                if (current_node.word.value === "{") {
                    current_text_position = add_new_line(buffer, current_text_position);
                }
                else if (current_node.word.value === "}") {
                    current_text_position = add_new_line(buffer, current_text_position);
                }
                else if (current_node.word.value === ";") {
                    current_text_position = add_new_line(buffer, current_text_position);
                }
            }
        }

        const result = Parser.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
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

function add_new_line(buffer: string[], current_text_position: Parser.Text_position): Parser.Text_position {
    buffer.push("\n");
    return {
        line: current_text_position.line + 1,
        column: 0
    };
}

function add_text_position_to_parent_nodes(node: Parser.Node, text_position: Parser.Text_position): void {

    let current_node = node;

    while (current_node.father_node !== undefined && current_node.index_in_father === 0) {
        current_node.father_node.text_position = {
            line: text_position.line,
            column: text_position.column
        };
        current_node = current_node.father_node;
    }
}
