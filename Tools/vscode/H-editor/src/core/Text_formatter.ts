import * as Grammar from "./Grammar";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import { iterate_forward_with_repetition, Iterate_direction, Node } from "./Parser_node";

const g_debug = false;

enum State {
    Global,
    Module_declaration,
    Imports,
    Alias,
    Enum,
    Struct,
    Function
}

function should_add_space(current_word: Grammar.Word, previous_word: Grammar.Word): number {

    if (previous_word.type === Grammar.Word_type.Invalid && current_word.value === "module") {
        return 0;
    }

    switch (previous_word.value) {
        case ".":
            return 0;
        case "->":
            return 1;
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
        case ".":
            return 0;
        case "->":
            return 1;
    }

    switch (previous_word.value) {
        case "(":
        case ")":
        case "{":
        case "}":
        case "[":
        case "]":
            return 0;
    }

    return 1;
}

function should_add_new_line_before(state: State, current_word: Grammar.Word, previous_word: Grammar.Word): number {

    if (state === State.Enum) {
        if (current_word.value === "}" && previous_word.value === ",") {
            return 0;
        }
    }
    else if (state === State.Struct || state === State.Function) {
        if (current_word.value === "}" && previous_word.value === ";") {
            return 0;
        }
    }

    return current_word.value === "{" || (current_word.value === "}" && previous_word.value !== "{") ? 1 : 0;
}

function should_add_new_line_after(state: State, current_word: Grammar.Word, previous_word: Grammar.Word): number {

    if (state === State.Global) {
        if (current_word.value === ";") {
            return 1;
        }
    }
    else if (state === State.Module_declaration) {
        if (current_word.value === ";") {
            return 2;
        }
    }
    else if (state === State.Imports) {
        if (current_word.value === ";") {
            return 1;
        }
    }
    else if (state === State.Alias) {
        if (current_word.value === ";") {
            return 2;
        }
    }
    else if (state === State.Enum) {
        if (current_word.value === ",") {
            return 1;
        }
        else if (current_word.value === "}") {
            return 2;
        }
    }
    else if (state === State.Function) {
        if (current_word.value === ";") {
            return 1;
        }
        else if (current_word.value === "}") {
            return 2;
        }
    }
    else if (state === State.Struct) {
        if (current_word.value === ";") {
            return 1;
        }
        else if (current_word.value === "}") {
            return 2;
        }
    }

    return (current_word.value === "{" || current_word.value === "}") ? 1 : 0;
}

export function to_string(root: Node, cache: Parse_tree_text_position_cache.Cache | undefined, production_rules_to_cache: number[]): string {

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

    const state_stack: State[] = [State.Global];

    while (current_node !== undefined) {

        if (g_debug) {
            console.log(current_node.word.value);
        }

        const previous_state = state_stack[state_stack.length - 1];

        if (current_node.word.value === "Module_declaration") {
            if (current_direction === Iterate_direction.Down) {
                state_stack.push(State.Module_declaration);
            }
            else {
                state_stack.pop();
            }
        }
        else if (current_node.word.value === "Imports") {
            if (current_direction === Iterate_direction.Down) {
                state_stack.push(State.Imports);
            }
            else {
                state_stack.pop();
            }
        }
        else if (current_node.word.value === "Alias") {
            if (current_direction === Iterate_direction.Down) {
                state_stack.push(State.Alias);
            }
            else {
                state_stack.pop();
            }
        }
        else if (current_node.word.value === "Enum") {
            if (current_direction === Iterate_direction.Down) {
                state_stack.push(State.Enum);
            }
            else {
                state_stack.pop();
            }
        }
        else if (current_node.word.value === "Function") {
            if (current_direction === Iterate_direction.Down) {
                state_stack.push(State.Function);
            }
            else {
                state_stack.pop();
            }
        }
        else if (current_node.word.value === "Struct") {
            if (current_direction === Iterate_direction.Down) {
                state_stack.push(State.Struct);
            }
            else {
                state_stack.pop();
            }
        }

        const current_state = state_stack[state_stack.length - 1];

        if (previous_state === State.Imports && current_state === State.Global) {
            add_new_line(buffer);
            current_line += 1;
            current_column = 0;
            current_text_offset += 1;
        }

        if (current_direction === Iterate_direction.Down) {

            // If node corresponds to terminal:
            if (current_node.production_rule_index === undefined) {
                const word = current_node.word;

                const new_lines_to_add_before = should_add_new_line_before(current_state, current_node.word, previous_word);

                for (let index = 0; index < new_lines_to_add_before; ++index) {
                    add_new_line(buffer);
                    current_line += 1;
                    current_column = 0;
                    current_text_offset += 1;
                }

                if (current_node.word.value === "}") {
                    indentation_count -= 1;
                }

                for (const comment of word.comments) {
                    const spaces = " ".repeat(indentation_count * indentation_width);
                    const line = `${spaces}// ${comment}`;
                    add_word(buffer, line);
                    add_new_line(buffer);
                    current_line += 1;
                    current_column = 0;
                    current_text_offset += line.length;
                }

                const added_new_line = buffer[buffer.length - 1] === "\n";
                const spaces_to_add_before = added_new_line ? indentation_count * indentation_width : should_add_space(word, previous_word);

                const new_word = " ".repeat(spaces_to_add_before) + format_word(word);

                if (cache !== undefined && should_cache_node(current_node, production_rules_to_cache)) {
                    const new_word_offset = current_text_offset + spaces_to_add_before;
                    Parse_tree_text_position_cache.set_entry(cache, new_word_offset, current_node, current_position);
                }

                add_word(buffer, new_word);
                current_text_offset += new_word.length;
                current_column += new_word.length;

                if (current_node.word.value === "{") {
                    indentation_count += 1;
                }

                const new_lines_to_add_after = should_add_new_line_after(current_state, current_node.word, previous_word);

                for (let index = 0; index < new_lines_to_add_after; ++index) {
                    add_new_line(buffer);
                    current_line += 1;
                    current_column = 0;
                    current_text_offset += 1;
                }

                previous_word = current_node.word;
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

function format_word(word: Grammar.Word): string {
    switch (word.type) {
        default: {
            return word.value;
        }
    }
}