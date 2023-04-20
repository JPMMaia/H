import * as Grammar from "./Grammar";
import * as Parser from "./Parser";

export function to_string(root: Parser.Node): string {

    const buffer: string[] = [];

    const indentation_width = 4;
    let indentation_count = 0;

    let total_size = 0;
    const stack: number[] = [0];

    let current_node: Parser.Node | undefined = root;
    let current_position: number[] = [];
    let current_direction = Parser.Iterate_direction.Down;
    let is_symbol = true;

    while (current_node !== undefined) {

        if (current_direction === Parser.Iterate_direction.Down) {

            if (current_node.children.length === 0) {
                const word = current_node.word;

                const add_space = !is_symbol && word.type !== Grammar.Word_type.Symbol;
                is_symbol = word.type === Grammar.Word_type.Symbol;

                total_size += add_word(buffer, add_space ? ` ${word.value}` : word.value);
            }
        }
        else if (current_direction === Parser.Iterate_direction.Up) {


        }

        const result = Parser.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
        if (result === undefined) {
            break;
        }

        {
            const is_next_node_a_child = result.direction === Parser.Iterate_direction.Down && result.next_position.length > current_position.length;

            if (is_next_node_a_child) {
                stack.push(total_size);
            }
            else if (result.direction === Parser.Iterate_direction.Up) {
                stack.pop();
            }
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
