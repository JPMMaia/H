import * as Abstract_syntax_tree from "./Abstract_syntax_tree";

export function to_string(root: Abstract_syntax_tree.Node): string {

    const buffer: string[] = [];

    const indentation_width = 4;
    let indentation_count = 0;

    let total_size = 0;
    const stack: number[] = [0];

    let current_node: Abstract_syntax_tree.Node | undefined = root;
    let current_position: number[] = [];
    let current_direction = Abstract_syntax_tree.Iterate_direction.Down;

    while (current_node !== undefined) {

        if (current_direction === Abstract_syntax_tree.Iterate_direction.Down) {

            switch (current_node.token) {
                case Abstract_syntax_tree.Token.Code_block_open_keyword:
                    total_size += add_word(buffer, create_indentation(indentation_width, indentation_count));
                    ++indentation_count;
                    break;
                case Abstract_syntax_tree.Token.Code_block_close_keyword:
                    --indentation_count;
                    break;
                case Abstract_syntax_tree.Token.Statement:
                    total_size += add_word(buffer, create_indentation(indentation_width, indentation_count));
                    break;
                case Abstract_syntax_tree.Token.Expression_binary_operation_keyword:
                case Abstract_syntax_tree.Token.Expression_variable_declaration_assignment:
                case Abstract_syntax_tree.Token.Function_declaration_parameters_separator:
                    total_size += add_word(buffer, ' ');
                    break;
                default:
                    break;
            }

            current_node.cache.relative_start = total_size - stack[stack.length - 1];

            const word = current_node.value;
            total_size += add_word(buffer, word);

            switch (current_node.token) {
                case Abstract_syntax_tree.Token.Code_block_open_keyword:
                case Abstract_syntax_tree.Token.Code_block_close_keyword:
                case Abstract_syntax_tree.Token.Statement_end:
                    total_size += add_word(buffer, '\n');
                    break;
                case Abstract_syntax_tree.Token.Expression_binary_operation_keyword:
                case Abstract_syntax_tree.Token.Expression_return_keyword:
                case Abstract_syntax_tree.Token.Expression_variable_declaration_keyword:
                case Abstract_syntax_tree.Token.Expression_variable_declaration_assignment:
                case Abstract_syntax_tree.Token.Function_declaration_keyword:
                case Abstract_syntax_tree.Token.Function_declaration_parameters_separator:
                case Abstract_syntax_tree.Token.Function_parameter_separator:
                case Abstract_syntax_tree.Token.Function_parameters_separator:
                    total_size += add_word(buffer, ' ');
                    break;
                default:
                    break;
            }
        }
        else if (current_direction === Abstract_syntax_tree.Iterate_direction.Up) {
            if (current_node.token === Abstract_syntax_tree.Token.Function) {
                total_size += add_word(buffer, '\n');
            }
            else if (current_node.token === Abstract_syntax_tree.Token.Function_declaration) {
                total_size += add_word(buffer, '\n');
            }
        }

        const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
        if (result === undefined) {
            break;
        }

        {
            const is_next_node_a_child = result.direction === Abstract_syntax_tree.Iterate_direction.Down && result.next_position.length > current_position.length;

            if (is_next_node_a_child) {
                stack.push(total_size);
            }
            else if (result.direction === Abstract_syntax_tree.Iterate_direction.Up) {
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
