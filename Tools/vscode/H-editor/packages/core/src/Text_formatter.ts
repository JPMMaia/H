import * as Grammar from "./Grammar";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";

const g_debug = false;

export function to_string(root: Parser_node.Node, cache: Parse_tree_text_position_cache.Cache | undefined, production_rules_to_cache: number[], initial_state_stack?: State[]): string {
    return node_to_string(root, { node: root, position: [] }, undefined, undefined);
}

export interface Options {
    indentation_width: number;
    add_new_line_before_open_brackets: boolean;
}

function create_default_options(): Options {
    return {
        indentation_width: 4,
        add_new_line_before_open_brackets: true
    };
}

interface Source_location_state {
    save_next_source_location: boolean;
    add_new_lines: boolean;
    actual_source_location: Parser_node.Source_location;
    expected_source_location: Parser_node.Source_location;
    previous_expected_source_location: Parser_node.Source_location;
}

interface State {
    buffer: string[];
    indentation_count: number;
    symbol_stack: string[];
    previous_symbol: string | undefined;
    source_location: Parser_node.Source_location;
    source_location_state_stack: Source_location_state[];
}

export function node_to_string(
    root: Parser_node.Node,
    value: { node: Parser_node.Node, position: number[] },
    before_character: string | undefined,
    after_character: string | undefined
): string {

    const state = calculate_initial_state(root, value);

    const options = create_default_options();

    let iterator: Parser_node.Forward_repeat_iterator | undefined = {
        root: value.node,
        current_node: value.node,
        current_position: [],
        current_direction: Parser_node.Iterate_direction.Down
    };

    if (before_character !== undefined) {
        state.buffer.push(before_character);
    }

    while (iterator !== undefined) {

        if (g_debug) {
            console.log(iterator.current_node.word.value);
        }

        update_state(
            state,
            iterator.current_node.word.value,
            iterator.current_node.word.type,
            iterator.current_node.production_rule_index,
            iterator.current_node.source_location,
            iterator.current_direction,
            options
        );

        iterator = Parser_node.next_iterator(iterator);
    }

    if (after_character !== undefined) {
        update_state(
            state,
            after_character,
            Scanner.get_word_type(after_character),
            undefined,
            undefined,
            Parser_node.Iterate_direction.Down,
            options
        );

        state.buffer.pop();
    }

    if (before_character !== undefined) {
        state.buffer.splice(0, 1);
    }

    const output = state.buffer.join("");
    return output;
}

function update_state(
    state: State,
    word_value: string,
    word_type: Grammar.Word_type,
    production_rule_index: number | undefined,
    node_source_location: Parser_node.Source_location | undefined,
    current_direction: Parser_node.Iterate_direction,
    options: Options
): void {
    if (production_rule_index !== undefined) {
        state.indentation_count += calculate_indentation_difference(word_value, current_direction);

        const action = calculate_stack_symbol_action(word_value, current_direction);
        if (action === Stack_symbol_action.Push) {
            state.symbol_stack.push(word_value);
        }
        else if (action === Stack_symbol_action.Pop) {
            state.previous_symbol = state.symbol_stack.pop();
        }

        update_source_location_state(state, node_source_location, word_value, current_direction);
    }
    else if (word_value.length > 0) {

        if (should_add_new_line(state.symbol_stack, state.previous_symbol, state.buffer, word_value, options)) {
            add_new_line(state);
        }
        if (should_add_new_line(state.symbol_stack, state.previous_symbol, state.buffer, word_value, options)) {
            add_new_line(state);
        }

        add_new_lines_to_preserve_expected_new_lines(state);

        if (word_type === Grammar.Word_type.Comment) {
            const comments = word_value.split("\n");
            for (const comment of comments) {
                const spaces = create_indentation(options.indentation_width, state.indentation_count);
                const line = `${spaces}${comment}`;
                add_text(state, line);
                add_new_line(state);
            }
        }
        else {

            if (should_add_indentation(state.buffer, state.indentation_count)) {
                const indentation = create_indentation(options.indentation_width, state.indentation_count);
                add_text(state, indentation);
            }
            else if (should_add_space_2(state.symbol_stack, state.buffer, word_value, options)) {
                add_text(state, " ");
            }

            state.buffer.push(word_value);
            add_additional_new_lines(state, word_type);
        }

        state.previous_symbol = undefined;
    }
}

function update_source_location_state(
    state: State,
    node_source_location: Parser_node.Source_location | undefined,
    word_value: string,
    current_direction: Parser_node.Iterate_direction
): void {

    switch (word_value) {
        case "Statements":
        case "Expression_block_statements":
        case "Expression_for_loop_statements":
        case "Expression_if_statements":
        case "Expression_switch_case_statements":
        case "Expression_while_loop_statements": {
            if (current_direction === Parser_node.Iterate_direction.Down) {
                state.source_location_state_stack.push({
                    save_next_source_location: false,
                    add_new_lines: false,
                    actual_source_location: { line: 1, column: 1 },
                    expected_source_location: { line: 1, column: 1 },
                    previous_expected_source_location: { line: 1, column: 1 },
                });
            }
            else {
                state.source_location_state_stack.pop();
            }
            break;
        }
    }

    if (state.previous_symbol === "Statement" && word_value === "Statement" && node_source_location !== undefined) {
        const source_location_state = state.source_location_state_stack[state.source_location_state_stack.length - 1];
        source_location_state.add_new_lines = true;
    }

    if (word_value === "Statement" && node_source_location !== undefined) {
        const source_location_state = state.source_location_state_stack[state.source_location_state_stack.length - 1];
        source_location_state.save_next_source_location = true;
        source_location_state.previous_expected_source_location = source_location_state.expected_source_location;
        source_location_state.expected_source_location = {
            line: node_source_location.line,
            column: node_source_location.column
        };
    }
}

function add_new_lines_to_preserve_expected_new_lines(
    state: State
): void {

    if (state.source_location_state_stack.length === 0) {
        return;
    }

    const source_location_state = state.source_location_state_stack[state.source_location_state_stack.length - 1];

    if (source_location_state.add_new_lines) {
        source_location_state.add_new_lines = false;

        const actual_line_difference = state.source_location.line - source_location_state.actual_source_location.line;
        const expected_line_difference = source_location_state.expected_source_location.line - source_location_state.previous_expected_source_location.line;

        if (expected_line_difference > actual_line_difference) {
            const new_lines_to_add = expected_line_difference - actual_line_difference;
            for (let i = 0; i < new_lines_to_add; i++) {
                add_new_line(state);
            }
        }
    }

    if (source_location_state.save_next_source_location) {
        source_location_state.save_next_source_location = false;
        source_location_state.actual_source_location = {
            line: state.source_location.line,
            column: state.source_location.column
        };
    }
}

function add_new_line(
    state: State
): void {
    state.buffer.push("\n");
    state.source_location.line += 1;
    state.source_location.column = 1;
}

function add_text(
    state: State,
    text: string
): void {
    state.buffer.push(text);
    state.source_location.column += text.length;
}

function calculate_initial_state(
    root: Parser_node.Node,
    value: { node: Parser_node.Node, position: number[] }
): State {


    let current_node = value.node;
    let current_position: number[] = [...value.position];

    let indentation_count = 0;
    const symbol_stack: string[] = [];
    let previous_symbol: string | undefined = undefined;

    while (current_position.length > 0) {
        current_position = Parser_node.get_parent_position(current_position);
        current_node = Parser_node.get_node_at_position(root, current_position);

        indentation_count += calculate_indentation_difference(current_node.word.value, Parser_node.Iterate_direction.Down);

        const action = calculate_stack_symbol_action(current_node.word.value, Parser_node.Iterate_direction.Down);
        if (action === Stack_symbol_action.Push) {
            symbol_stack.push(current_node.word.value);
        }
    }

    // TODO calculate previous symbol ?

    return {
        buffer: [],
        indentation_count: indentation_count,
        symbol_stack: symbol_stack.reverse(),
        previous_symbol: previous_symbol,
        source_location: { line: 1, column: 1 },
        source_location_state_stack: []
    };
}

function calculate_indentation_difference(
    current_value: string,
    current_direction: Parser_node.Iterate_direction
): number {
    switch (current_value) {
        case "Enum_values":
        case "Struct_members":
        case "Union_members":
        case "Statements":
        case "Expression_block_statements":
        case "Expression_for_loop_statements":
        case "Expression_if_statements":
        case "Expression_instantiate_members":
        case "Expression_switch_cases":
        case "Expression_switch_case_statements":
        case "Expression_while_loop_statements": {
            const indentation_difference = current_direction === Parser_node.Iterate_direction.Down ? 1 : -1;
            return indentation_difference;
        }
        default: {
            return 0;
        }
    }
}

enum Stack_symbol_action {
    None,
    Push,
    Pop
}

function calculate_stack_symbol_action(
    current_value: string,
    current_direction: Parser_node.Iterate_direction
): Stack_symbol_action {
    switch (current_value) {
        case "Module_head":
        case "Module_declaration":
        case "Import":
        case "Module_body":
        case "Declaration":
        case "Enum_values":
        case "Statement":
        case "Expression_call_arguments":
        case "Expression_instantiate":
        case "Expression_instantiate_members":
            if (current_direction === Parser_node.Iterate_direction.Down) {
                return Stack_symbol_action.Push;
            }
            else {
                return Stack_symbol_action.Pop;
            }
        default: {
            return Stack_symbol_action.None;
        }
    }
}

function should_add_indentation(
    buffer: string[],
    indentation_count: number
): boolean {
    if (indentation_count > 0 && buffer.length > 0 && buffer[buffer.length - 1] === "\n") {
        return true;
    }
    else {
        return false;
    }
}

function is_space_or_newline(value: string | undefined) {
    if (value === undefined) {
        return false;
    }
    else if (value === "\n") {
        return true;
    }
    else if (value.startsWith(" ")) {
        return true;
    }
    else {
        return false;
    }
}

function should_add_new_line(
    symbol_stack: string[],
    previous_symbol: string | undefined,
    buffer: string[],
    next_value: string,
    options: Options
): boolean {

    const current_symbol = symbol_stack[symbol_stack.length - 1];
    const previous_value = buffer[buffer.length - 1];

    if (buffer.length > 0) {
        switch (previous_value) {
            case "{":
            case ";": {
                if (current_symbol === "Expression_instantiate" || current_symbol === "Expression_instantiate_members") {
                    if (next_value === "}") {
                        return false;
                    }
                }

                return true;
            }
            case "}": {
                return next_value !== ";" && next_value !== ",";
            }
            case ",": {
                switch (current_symbol) {
                    case "Enum_values":
                    case "Expression_instantiate_members": {
                        return true;
                    }
                }
                break;
            }
        }
    }

    switch (next_value) {
        case "{": {
            if (current_symbol === "Expression_instantiate" || current_symbol === "Expression_instantiate_members") {
                return false;
            }

            return !is_space_or_newline(previous_value) && options.add_new_line_before_open_brackets;
        }
        case "}": {
            return !is_space_or_newline(previous_value);
        }
    }

    switch (previous_symbol) {
        case "Module_head":
        case "Module_declaration":
        case "Declaration":
            if (buffer[buffer.length - 1] === "\n" && buffer[buffer.length - 2] === "\n") {
                return false;
            }
            else {
                return true;
            }
    }

    return false;
}

function should_add_space_2(
    symbol_stack: string[],
    buffer: string[],
    next_value: string,
    options: Options
): boolean {

    if (buffer.length > 0) {
        const previous_value = buffer[buffer.length - 1];

        switch (previous_value) {
            case " ": {
                return false;
            }
            case ":":
            case ",":
            case "=":
            case "->": {
                return true;
            }
        }

        if (is_binary_operator_symbol(previous_value) || is_assignment_symbol(previous_value)) {
            return true;
        }
    }

    switch (next_value) {
        case "{": {
            return !options.add_new_line_before_open_brackets;
        }
        case "=":
        case "->": {
            return true;
        }
    }

    if (is_binary_operator_symbol(next_value) || is_assignment_symbol(next_value)) {
        return true;
    }

    if (buffer.length === 0) {
        return false;
    }

    const is_previous_value_alphanumeric = Scanner.is_alphanumeric(buffer[buffer.length - 1]);
    const is_next_value_alphanumeric = Scanner.is_alphanumeric(next_value);
    if (is_previous_value_alphanumeric && is_next_value_alphanumeric) {
        return true;
    }

    return false;
}

function create_indentation(indentation_width: number, indentation_count: number): string {
    return " ".repeat(indentation_width * indentation_count);
}

function is_binary_operator_symbol(value: string): boolean {
    switch (value) {
        case "+":
        case "-":
        case "&":
        case "has":
        case "^":
        case "|":
        case "<<":
        case ">>":
        case "&&":
        case "||":
        case "*":
        case "/":
        case "%":
        case "<":
        case "<=":
        case ">":
        case ">=":
        case "==":
        case "!=":
            return true;
        default:
            return false;
    }
}

function is_assignment_symbol(value: string): boolean {
    switch (value) {
        case "=":
        case "+=":
        case "-=":
        case "*=":
        case "/=":
        case "%=":
        case "&=":
        case "|=":
        case "^=":
        case "<<=":
        case ">>=":
            return true;
        default:
            return false;
    }
}

function add_additional_new_lines(
    state: State,
    word_type: Grammar.Word_type
): void {
    if (word_type === Grammar.Word_type.Comment) {
        add_new_line(state);
    }
}

export function to_unformatted_text(
    node: Parser_node.Node
): string {

    const buffer: string[] = [];

    let iterator: Parser_node.Forward_repeat_iterator | undefined = {
        root: node,
        current_node: node,
        current_position: [],
        current_direction: Parser_node.Iterate_direction.Down
    };

    while (iterator !== undefined) {

        if (iterator.current_node.production_rule_index === undefined && iterator.current_node.word.value.length > 0) {
            buffer.push(iterator.current_node.word.value);
        }

        iterator = Parser_node.next_iterator(iterator);
    }

    return buffer.join(" ");
}
