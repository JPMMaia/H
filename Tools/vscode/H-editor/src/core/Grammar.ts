import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Core from "../utilities/coreModelInterface";
import * as Symbol_database from "./Symbol_database";
import { onThrowError } from "../utilities/errors";
import * as Scanner from "./Scanner";

export enum Word_type {
    Alphanumeric,
    Number,
    String,
    Symbol,
    Invalid
}

export interface Word {
    value: string;
    type: Word_type;
}

export enum Token {
    Identifier,
    Invalid,
    Keyword,
    Number,
    Operator,
    String
}

export interface Grammar {
    is_binary_operator(word: string): boolean;

    create_function_declaration_node(declaration: Core.Function_declaration, input_parameters_node: Abstract_syntax_tree.Node, output_parameters_node: Abstract_syntax_tree.Node): Abstract_syntax_tree.Node;
    create_function_parameters_node(parameter_nodes: Abstract_syntax_tree.Node[], is_input_parameters: boolean): Abstract_syntax_tree.Node;
    create_function_parameter_node(name: string, type: string): Abstract_syntax_tree.Node;
    create_code_block_node(statement_nodes: Abstract_syntax_tree.Node[]): Abstract_syntax_tree.Node;
    create_statement_node(statement: Core.Statement, symbol: Symbol_database.Symbol | undefined, expression: Abstract_syntax_tree.Node): Abstract_syntax_tree.Node;

    create_binary_expression_node(expression: Core.Binary_expression, left_operand: Abstract_syntax_tree.Node, right_operand: Abstract_syntax_tree.Node): Abstract_syntax_tree.Node;
    create_constant_expression_node(expression: Core.Constant_expression): Abstract_syntax_tree.Node;
    create_return_expression_node(expression: Core.Return_expression, what: Abstract_syntax_tree.Node | undefined): Abstract_syntax_tree.Node;
    create_variable_expression_node(expression: Core.Variable_expression, symbol: Symbol_database.Symbol | undefined): Abstract_syntax_tree.Node;
}

const g_debug = true;

export interface Production_rule {
    lhs: string;
    rhs: string[]
}

export function create_production_rules(grammar_description: string[]): Production_rule[] {

    const production_rules: Production_rule[] = [];

    for (const rule_description of grammar_description) {
        const words = get_labels(rule_description);

        const lhs = words[0];

        let word_index = 2;

        const rhs: string[] = [];

        while (word_index < words.length) {

            const word = words[word_index];

            if (word === "|") {
                production_rules.push({
                    lhs: lhs,
                    rhs: [...rhs]
                });
                rhs.splice(0, rhs.length);
            }
            else {
                rhs.push(word);
            }

            word_index += 1;
        }

        production_rules.push({
            lhs: lhs,
            rhs: rhs
        });
    }

    return production_rules;
}

export function get_non_terminals(production_rules: Production_rule[]): string[] {

    const non_terminals: string[] = [];

    for (const production_rule of production_rules) {
        if ((non_terminals.length > 0 && production_rule.lhs !== non_terminals[non_terminals.length - 1]) || non_terminals.length === 0) {
            non_terminals.push(production_rule.lhs);
        }
    }

    return non_terminals;
}

export function get_terminals(production_rules: Production_rule[], non_terminals: string[]): string[] {

    const terminals: string[] = [];

    for (const production_rule of production_rules) {
        for (const label of production_rule.rhs) {

            const non_terminal_index = non_terminals.findIndex(non_terminal => non_terminal === label);
            if (non_terminal_index === -1) {
                const terminal_index = terminals.findIndex(terminal => terminal === label);
                if (terminal_index === -1) {
                    terminals.push(label);
                }
            }
        }
    }

    const output = [
        ...terminals, "$"
    ];
    output.sort();
    return output;
}

export function first(production_rules: Production_rule[], non_terminals: string[], terminals: string[]): Map<string, string[]> {

    const output = new Map<string, string[]>();

    for (const non_terminal of non_terminals) {
        const visited_non_terminals: string[] = [];
        const first_terminals = first_auxiliary(production_rules, non_terminal, terminals, visited_non_terminals);
        output.set(non_terminal, first_terminals);
    }

    for (const terminal of terminals) {
        output.set(terminal, [terminal]);
    }

    return output;
}

function first_auxiliary(production_rules: Production_rule[], production_rule_lhs: string, terminals: string[], visited_non_terminals: string[]): string[] {

    const first_terminals = new Set<string>();

    const production_rules_indices = find_production_rules(production_rules, production_rule_lhs);

    for (const production_rule_index of production_rules_indices) {

        const production_rule = production_rules[production_rule_index];

        const first_label = production_rule.rhs[0];

        const visited_index = visited_non_terminals.findIndex(non_terminal => non_terminal === first_label);

        // If word corresponds to a non-terminal and it was already visited:
        if (visited_index !== -1) {
            continue;
        }

        if (is_terminal(first_label, terminals)) {
            first_terminals.add(first_label);
        }
        else {
            visited_non_terminals.push(first_label);

            const new_terminals = first_auxiliary(production_rules, first_label, terminals, visited_non_terminals);

            for (const new_terminal of new_terminals) {
                first_terminals.add(new_terminal);
            }
        }
    }

    return [...first_terminals];
}

export interface LR0_item {
    production_rule_index: number;
    label_index: number;
}

function are_lr0_items_equal(lhs: LR0_item, rhs: LR0_item): boolean {
    return lhs.production_rule_index === rhs.production_rule_index && lhs.label_index === rhs.label_index;
}

export function create_lr0_item_set(production_rules: Production_rule[], production_rule_index: number, label_index: number): LR0_item[] {

    const items: LR0_item[] = [
        {
            production_rule_index: production_rule_index,
            label_index: label_index
        }
    ];

    let item_index = 0;

    while (item_index < items.length) {
        const item = items[item_index];
        const production_rule = production_rules[item.production_rule_index];
        const label = production_rule.rhs[item.label_index];

        const new_production_rule_indices = find_production_rules(production_rules, label);

        for (const new_production_rule_index of new_production_rule_indices) {

            const new_item: LR0_item = {
                production_rule_index: new_production_rule_index,
                label_index: 0
            };

            const new_item_index = items.findIndex(item => are_lr0_items_equal(item, new_item));
            if (new_item_index === -1) {
                items.push(new_item);
            }
        }

        item_index += 1;
    }

    return items;
}

export function follow_of_non_terminals(production_rules: Production_rule[], non_terminals: string[], first_terminals_map: Map<string, string[]>): Map<string, string[]> {
    const follow_map = new Map<string, string[]>();

    {
        const non_terminal = non_terminals[0];
        follow_map.set(non_terminal, ["$"]);
    }

    for (let index = 1; index < non_terminals.length; ++index) {
        const non_terminal = non_terminals[index];

        const visited_non_terminals: string[] = [];
        const follow_terminals = follow_of_non_terminal(production_rules, non_terminal, first_terminals_map, visited_non_terminals);
        follow_map.set(non_terminal, follow_terminals);
    }

    return follow_map;
}

function follow_of_non_terminal(production_rules: Production_rule[], non_terminal: string, first_terminals_map: Map<string, string[]>, visited_non_terminals: string[]): string[] {

    if (non_terminal === production_rules[0].lhs) {
        return ["$"];
    }

    const follow_terminals = new Set<string>();

    visited_non_terminals.push(non_terminal);

    for (let production_rule_index = 0; production_rule_index < production_rules.length; ++production_rule_index) {
        const production_rule = production_rules[production_rule_index];

        for (let label_index = 0; label_index < production_rule.rhs.length; ++label_index) {
            const label = production_rule.rhs[label_index];

            if (label === non_terminal) {

                const next_label_index = label_index + 1;

                // If there is a next label, add first of next label:
                if (next_label_index < production_rule.rhs.length) {
                    const next_label = production_rule.rhs[next_label_index];
                    const first_terminals = first_terminals_map.get(next_label);
                    if (first_terminals === undefined) {
                        const message = "Failed to find first terminals! first_terminals_map must contain label!";
                        onThrowError(message);
                        throw Error(message);
                    }

                    for (const first_terminal of first_terminals) {
                        follow_terminals.add(first_terminal);
                    }
                }
                // If label is at the end of rhs, then add all terminals of follow(lhs):
                else if (next_label_index === production_rule.rhs.length && production_rule.lhs !== label) {

                    const visited_index = visited_non_terminals.findIndex(visited => visited === production_rule.lhs);
                    if (visited_index === -1) {
                        const new_follow_terminals = follow_of_non_terminal(production_rules, production_rule.lhs, first_terminals_map, visited_non_terminals);
                        for (const terminal of new_follow_terminals) {
                            follow_terminals.add(terminal);
                        }
                    }
                }
            }
        }
    }

    const output = [...follow_terminals];
    output.sort();
    return output;
}

export function follow_of_item_set(production_rules: Production_rule[], items: LR0_item[], non_terminals: string[], non_terminals_follow: Map<string, string[]>): Map<string, string[]> {

    const follow_map = new Map<string, string[]>();

    {
        const non_terminal = non_terminals[0];
        follow_map.set(non_terminal, ["$"]);
    }

    for (let index = 1; index < non_terminals.length; ++index) {
        const non_terminal = non_terminals[index];

        const follow_terminals = follow_union_of_items(production_rules, items, non_terminal, non_terminals_follow);
        follow_map.set(non_terminal, follow_terminals);
    }

    return follow_map;
}

function follow_union_of_items(production_rules: Production_rule[], items: LR0_item[], label: string, non_terminals_follow: Map<string, string[]>): string[] {

    const follow_terminals = new Set<string>();

    for (const item of items) {

        const item_production_rule = production_rules[item.production_rule_index];
        const item_label = item_production_rule.rhs[item.label_index];

        if (item_label === label) {
            const new_follow_terminals = non_terminals_follow.get(item_label);

            if (new_follow_terminals === undefined) {
                const message = "Failed to find new follow terminals! non_terminals_follow must contain label!";
                onThrowError(message);
                throw Error(message);
            }

            for (const terminal of new_follow_terminals) {
                follow_terminals.add(terminal);
            }
        }
    }

    const output = [...follow_terminals];
    output.sort();
    return output;
}

export interface LR1_item {
    production_rule_index: number;
    label_index: number;
    follow_terminal: string;
}

function are_lr1_items_equal(lhs: LR1_item, rhs: LR1_item): boolean {
    return lhs.production_rule_index === rhs.production_rule_index && lhs.label_index === rhs.label_index && lhs.follow_terminal === rhs.follow_terminal;
}

function compare_lr1_items(lhs: LR1_item, rhs: LR1_item): number {

    if (lhs.label_index > rhs.label_index) {
        return -1;
    }
    else if (lhs.label_index < rhs.label_index) {
        return 1;
    }

    if (lhs.production_rule_index < rhs.production_rule_index) {
        return -1;
    }
    else if (lhs.production_rule_index > rhs.production_rule_index) {
        return 1;
    }

    if (lhs.follow_terminal < rhs.follow_terminal) {
        return -1;
    }
    else if (lhs.follow_terminal > rhs.follow_terminal) {
        return 1;
    }

    return 0;
}

function are_lr1_states_equal(lhs: LR1_item[], rhs: LR1_item[]): boolean {
    if (lhs.length !== rhs.length) {
        return false;
    }

    for (let index = 0; index < lhs.length; ++index) {
        if (!are_lr1_items_equal(lhs[index], rhs[index])) {
            return false;
        }
    }

    return true;
}

export function create_start_lr1_item_set(production_rules: Production_rule[], first_terminals: Map<string, string[]>): LR1_item[] {

    const first_lr1_item: LR1_item = {
        production_rule_index: 0,
        label_index: 0,
        follow_terminal: "$"
    };

    const lr1_item_set = compute_lr1_closure(production_rules, first_terminals, [first_lr1_item]);

    return lr1_item_set;
}

function compute_lr1_closure(production_rules: Production_rule[], first_terminals_map: Map<string, string[]>, lr1_item_set: LR1_item[]): LR1_item[] {

    const debug = false;

    if (debug) {
        console.log("------");
    }

    const closure_item_set: LR1_item[] = [...lr1_item_set];

    for (let index = 0; index < closure_item_set.length; ++index) {

        const item = closure_item_set[index];

        if (debug) {
            console.log(lr1_item_to_string(production_rules, item));
        }

        const production_rule = production_rules[item.production_rule_index];
        if (item.label_index >= production_rule.rhs.length) {
            break;
        }

        const label = production_rule.rhs[item.label_index];

        const next_label = (item.label_index + 1) < production_rule.rhs.length ? production_rule.rhs[item.label_index + 1] : item.follow_terminal;
        const next_label_first = first_terminals_map.get(next_label);
        const look_aheads = next_label_first !== undefined ? next_label_first : [];

        const production_rule_indices = find_production_rules(production_rules, label);

        for (const new_production_rule_index of production_rule_indices) {
            for (const look_ahead of look_aheads) {
                const new_item: LR1_item = {
                    production_rule_index: new_production_rule_index,
                    label_index: 0,
                    follow_terminal: look_ahead
                };

                const existing_item_index = closure_item_set.findIndex(closure_item => are_lr1_items_equal(closure_item, new_item));
                if (existing_item_index === -1) {
                    closure_item_set.push(new_item);
                }
            }
        }
    }

    closure_item_set.sort(compare_lr1_items);

    return closure_item_set;
}

export function create_next_lr1_item_set(production_rules: Production_rule[], first_terminals_map: Map<string, string[]>, lr1_item_set: LR1_item[], label: string): LR1_item[] {

    // Get items that contain label at label_index:
    const items_at_label = lr1_item_set.filter(item => {
        const production_rule = production_rules[item.production_rule_index];

        if (item.label_index >= production_rule.rhs.length) {
            return false;
        }

        const label_at_index = production_rule.rhs[item.label_index];
        return label_at_index === label;
    });

    // Increment label index:
    const new_item_set = items_at_label.map(item => {
        const new_item: LR1_item = {
            production_rule_index: item.production_rule_index,
            label_index: item.label_index + 1,
            follow_terminal: item.follow_terminal
        };

        return new_item;
    });

    // Compute closure:
    const new_item_set_closure = compute_lr1_closure(production_rules, first_terminals_map, new_item_set);

    const debug = false;

    if (debug) {
        console.log("------ LR1 Item Set ------");
        for (const item of new_item_set_closure) {
            console.log(lr1_item_to_string(production_rules, item));
        }
    }

    return new_item_set_closure;
}

export interface Edge {
    from_state: number;
    to_state: number;
    label: string;
}

export function create_lr1_graph(production_rules: Production_rule[], first_terminals_map: Map<string, string[]>, lr1_item_set_0: LR1_item[]): { states: LR1_item[][], edges: Edge[] } {

    const states: LR1_item[][] = [lr1_item_set_0];
    const edges: Edge[] = [];

    for (let current_state_index = 0; current_state_index < states.length; ++current_state_index) {
        const current_state = states[current_state_index];

        const current_labels = current_state.map(item => {
            const production_rule = production_rules[item.production_rule_index];
            return item.label_index < production_rule.rhs.length ? production_rule.rhs[item.label_index] : "";
        }).filter(label => label.length > 0);
        current_labels.sort();

        const unique_current_labels = current_labels.filter((label, index) => index > 0 ? label !== current_labels[index - 1] : true);

        const next_states = unique_current_labels.map(label => create_next_lr1_item_set(production_rules, first_terminals_map, current_state, label));

        for (let index = 0; index < next_states.length; ++index) {
            const next_state = next_states[index];
            const label = unique_current_labels[index];

            const next_state_index = states.findIndex(state => are_lr1_states_equal(next_state, state));
            if (next_state_index === -1) {
                states.push(next_state);
            }

            const valid_next_state_index = next_state_index === -1 ? states.length - 1 : next_state_index;
            edges.push({
                from_state: current_state_index,
                to_state: valid_next_state_index,
                label: label
            });
        }
    }

    for (let state_index = 0; state_index < states.length; ++state_index) {
        console.log(`State ${state_index}`);
        for (const item of states[state_index]) {
            console.log(lr1_item_to_string(production_rules, item));
        }
        console.log("");
    }

    for (let edge_index = 0; edge_index < edges.length; ++edge_index) {
        const edge = edges[edge_index];
        console.log(`Edge ${edge_index}: ${edge.from_state} -> ${edge.to_state} (${edge.label})`);
    }

    return {
        states: states,
        edges: edges
    };
}

export enum Action_type {
    Accept,
    Go_to,
    Reduce,
    Shift,
}

export interface Go_to_column {
    label: string;
    next_state: number;
}

export interface Accept_action {
    lhs: string;
    rhs_count: number;
}

export interface Reduce_action {
    lhs: string;
    rhs_count: number;
}

export interface Shift_action {
    next_state: number;
}

export interface Action {
    type: Action_type;
    value: Accept_action | Reduce_action | Shift_action;
}

export interface Action_column {
    label: string;
    action: Action;
}

export interface Parse_node {
    value: string;
    children: Parse_node[];
}

export interface Node {
    word: Scanner.Scanned_word;
    state: number;
    previous_node_on_stack: Node | undefined;
    father_node: Node | undefined;
    index_in_father: number;
    children: Node[];
}

export function get_node_at_position(root: Node, position: number[]): Node {

    let current_node = root;

    for (const child_index of position) {
        current_node = current_node.children[child_index];
    }

    return current_node;
}

export enum Iterate_direction {
    Down,
    Up
}

export function iterate_forward_with_repetition(root: Node, current_node: Node, current_position: number[], direction: Iterate_direction): { next_node: Node, next_position: number[], direction: Iterate_direction } | undefined {

    if (direction === Iterate_direction.Down && current_node.children.length > 0) {
        return {
            next_node: current_node.children[0],
            next_position: [...current_position, 0],
            direction: Iterate_direction.Down
        };
    }

    if (current_position.length === 0) {
        return undefined;
    }

    const current_node_index = current_position[current_position.length - 1];

    const parent_position = current_position.slice(0, current_position.length - 1);
    const parent_node = get_node_at_position(root, parent_position);

    const next_sibling_node_index = current_node_index + 1;
    if (next_sibling_node_index < parent_node.children.length) {
        return {
            next_node: parent_node.children[next_sibling_node_index],
            next_position: [...parent_position, next_sibling_node_index],
            direction: Iterate_direction.Down
        };
    }

    return {
        next_node: parent_node,
        next_position: parent_position,
        direction: Iterate_direction.Up
    };
}

export function iterate_forward(root: Node, current_node: Node, current_position: number[]): { next_node: Node, next_position: number[] } | undefined {

    let result = iterate_forward_with_repetition(root, current_node, current_position, Iterate_direction.Down);

    while (result !== undefined && result.direction === Iterate_direction.Up) {
        result = iterate_forward_with_repetition(root, result.next_node, result.next_position, result.direction);
    }

    if (result === undefined) {
        return result;
    }

    return {
        next_node: result.next_node,
        next_position: result.next_position
    };
}

export function create_parsing_tables(production_rules: Production_rule[], terminals: string[], states: LR1_item[][], edges: Edge[]): { action_table: Action_column[][], go_to_table: Go_to_column[][] } {

    const action_table: Action_column[][] = [];
    const go_to_table: Go_to_column[][] = [];

    for (const _ of states) {
        action_table.push([]);
        go_to_table.push([]);
    }

    for (let state_index = 0; state_index < states.length; ++state_index) {
        const state = states[state_index];

        const items_to_reduce = state.filter(item => {
            const production_rule = production_rules[item.production_rule_index];
            return production_rule.rhs.length === item.label_index;
        });

        const action_row = action_table[state_index];
        for (const item of items_to_reduce) {

            const production_rule = production_rules[item.production_rule_index];

            if (item.production_rule_index > 0) {
                action_row.push({
                    label: item.follow_terminal,
                    action: {
                        type: Action_type.Reduce,
                        value: {
                            lhs: production_rule.lhs,
                            rhs_count: production_rule.rhs.length
                        }
                    }
                });
            }
            else {
                action_row.push({
                    label: item.follow_terminal,
                    action: {
                        type: Action_type.Accept,
                        value: {
                            lhs: production_rule.lhs,
                            rhs_count: production_rule.rhs.length
                        }
                    }
                });
            }
        }
    }

    for (const edge of edges) {
        if (is_terminal(edge.label, terminals)) {
            const action_row = action_table[edge.from_state];
            action_row.push({
                label: edge.label,
                action: {
                    type: Action_type.Shift,
                    value: {
                        next_state: edge.to_state
                    }
                }
            });
        }
        else {
            const go_to_row = go_to_table[edge.from_state];
            go_to_row.push({
                label: edge.label,
                next_state: edge.to_state
            });
        }
    }

    for (const action_row of action_table) {
        action_row.sort((lhs: Action_column, rhs: Action_column) => {
            if (lhs.label < rhs.label) {
                return -1;
            }
            else if (lhs.label > rhs.label) {
                return 1;
            }
            else {
                return 0;
            }
        });
    }

    return {
        action_table: action_table,
        go_to_table: go_to_table
    };
}

export function parse(input: Scanner.Scanned_word[], parsing_table: Action_column[][], go_to_table: Go_to_column[][], map_word_to_terminal: (word: Scanner.Scanned_word) => string): Parse_node | undefined {

    const state_stack: number[] = [];
    state_stack.push(0);

    const nodes_stack: Parse_node[] = [];

    let current_word_index = 0;

    while (current_word_index <= input.length) {

        const current_word = current_word_index < input.length ? input[current_word_index] : { value: "$", type: Word_type.Symbol };

        const current_state = state_stack[state_stack.length - 1];
        const row = parsing_table[current_state];
        const column = row.find(column => column.label === map_word_to_terminal(current_word));

        if (column !== undefined) {
            const action = column.action;

            switch (action.type) {
                case Action_type.Accept:
                    {
                        const accept_action = action.value as Accept_action;

                        if (g_debug) {
                            console.log(`accept`);
                        }

                        const new_node: Parse_node = {
                            value: accept_action.lhs,
                            children: [nodes_stack[0]]
                        };

                        return new_node;
                    }
                case Action_type.Shift:
                    {
                        const shift_action = action.value as Shift_action;
                        state_stack.push(shift_action.next_state);

                        if (g_debug) {
                            console.log(`shift ${shift_action.next_state}`);
                        }

                        const new_node: Parse_node = {
                            value: current_word.value,
                            children: []
                        };

                        nodes_stack.push(new_node);

                        current_word_index += 1;
                        break;
                    }
                case Action_type.Reduce:
                    {
                        const reduce_action = action.value as Reduce_action;

                        if (reduce_action.rhs_count > nodes_stack.length) {
                            // TODO error
                            const message = "Syntax error!";
                            onThrowError(message);
                            throw Error(message);
                        }

                        const new_node_children = nodes_stack.splice(nodes_stack.length - reduce_action.rhs_count, reduce_action.rhs_count);

                        if (g_debug) {
                            const rhs = new_node_children.map(node => node.value).join(" ");
                            console.log(`reduce ${reduce_action.lhs} -> ${rhs}`);
                        }

                        const new_node: Parse_node = {
                            value: reduce_action.lhs,
                            children: new_node_children
                        };

                        nodes_stack.push(new_node);

                        state_stack.splice(state_stack.length - reduce_action.rhs_count, reduce_action.rhs_count);
                        const previous_state = state_stack[state_stack.length - 1];

                        const go_to_row = go_to_table[previous_state];
                        const go_to_column = go_to_row.find(column => column.label === reduce_action.lhs);
                        if (go_to_column !== undefined) {
                            state_stack.push(go_to_column.next_state);
                        }
                        else {
                            // TODO error
                            const message = "Syntax error!";
                            onThrowError(message);
                            throw Error(message);
                        }

                        break;
                    }
                default:
                    break;
            }
        }
    }

    return undefined;
}

/*export function parse_2(input: Scanner.Scanned_word[], parsing_table: Action_column[][], go_to_table: Go_to_column[][], map_word_to_terminal: (word: Scanner.Scanned_word) => string): Node | undefined {

    let last_state_stack: number[] = [0];
    let last_nodes_stack: Node[] = [];

    let current_state_stack: number[] = [0];
    let current_nodes_stack: Node[] = [];

    let current_word_index = 0;

    while (current_word_index < input.length) {
        const result = parse_incrementally(input, current_word_index, current_state_stack, current_nodes_stack, parsing_table, go_to_table, map_word_to_terminal);

        if (result.status === Parse_status.Continue) { // TODO remove
            current_word_index += result.processed_words;
        }
        else if (result.status === Parse_status.Failed) {
            current_word_index += 1;
            current_state_stack = [...last_state_stack];
            current_nodes_stack = [...last_nodes_stack];
        }
        else if (result.status === Parse_status.Accept) {
            return current_nodes_stack[0];
        }
    }
}*/

export enum Parse_status {
    Accept,
    Failed,
    Continue
}

function get_node_stack(node: Node): Node[] {

    const nodes: Node[] = [];

    let current_node: Node | undefined = node;

    while (current_node !== undefined) {
        nodes.push(current_node);
        current_node = current_node.previous_node_on_stack;
    }

    return nodes.reverse();
}

function node_stack_to_string(node: Node): string {
    const stack = get_node_stack(node);
    const strings = stack.map(element => `[${element.state}, ${element.word.value}]`).join(",");
    return `[${strings}]`;
}

export enum Change_type {
    Add,
    Remove,
    Modify
}

export interface Change {
    type: Change_type,
    value: Add_change | Remove_change
}

export interface Add_change {
    position: number[];
    new_node: Node;
}

function create_add_change(position: number[], new_node: Node): Change {
    return {
        type: Change_type.Add,
        value: {
            position: position,
            new_node: new_node
        }
    };
}

export interface Remove_change {
    position: number[];
}

function create_remove_change(position: number[]): Change {
    return {
        type: Change_type.Remove,
        value: {
            position: position
        }
    };
}

export interface Modify_change {
    position: number[];
    new_node: Node;
}

function create_modify_change(position: number[], new_node: Node): Change {
    return {
        type: Change_type.Modify,
        value: {
            position: position,
            new_node: new_node
        }
    };
}

export interface Words_change {
    range_offset: number;
    range_length: number;
    new_words: Scanner.Scanned_word[];
}

function create_bottom_of_stack_node(): Node {
    return {
        word: { value: "$", type: Word_type.Symbol },
        state: 0,
        previous_node_on_stack: undefined,
        father_node: undefined,
        index_in_father: -1,
        children: []
    };
}

function get_next_word(
    new_words: Scanner.Scanned_word[],
    current_word_index: number,
    original_node_tree: Node | undefined,
    after_change_node_position: number[]
): Scanner.Scanned_word {

    if (current_word_index < new_words.length) {
        return new_words[current_word_index];
    }

    if (original_node_tree !== undefined) {
        const node = get_node_at_position(original_node_tree, after_change_node_position);
        return node.word;
    }

    return { value: "$", type: Word_type.Symbol };
}

export function parse_incrementally(
    original_node_tree: Node | undefined,
    start_change_node_position: number[],
    new_words: Scanner.Scanned_word[],
    after_change_node_position: number[],
    parsing_table: Action_column[][],
    go_to_table: Go_to_column[][],
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[] } {

    let top_of_stack: Node = original_node_tree === undefined ? create_bottom_of_stack_node() : get_node_from_stack(get_node_at_position(original_node_tree, start_change_node_position), 1) as Node;
    let mark = top_of_stack;

    let current_word_index = 0;

    while (current_word_index <= new_words.length) {

        const current_word = get_next_word(new_words, current_word_index, original_node_tree, after_change_node_position);

        const row = parsing_table[top_of_stack.state];
        const column = row.find(column => column.label === map_word_to_terminal(current_word));

        if (column === undefined) {
            return {
                status: Parse_status.Failed,
                processed_words: current_word_index,
                changes: []
            };
        }

        const action = column.action;

        switch (action.type) {
            case Action_type.Accept:
                {
                    const accept_action = action.value as Accept_action;

                    if (g_debug) {
                        console.log(`accept`);
                    }

                    const children = get_top_nodes_from_stack(top_of_stack, accept_action.rhs_count) as Node[];
                    children.reverse();

                    const new_node: Node = {
                        word: { value: accept_action.lhs, type: Word_type.Symbol },
                        state: -1,
                        previous_node_on_stack: top_of_stack,
                        father_node: undefined,
                        index_in_father: -1,
                        children: children
                    };

                    for (let index = 0; index < children.length; ++index) {
                        const child = children[index];
                        child.father_node = new_node;
                        child.index_in_father = index;
                    }

                    return {
                        status: Parse_status.Accept,
                        processed_words: current_word_index,
                        changes: [
                            create_modify_change([], new_node)
                        ]
                    };
                }
            case Action_type.Shift:
                {
                    if (current_word_index === new_words.length && original_node_tree !== undefined && after_change_node_position.length > 0) {

                        const result = parse_incrementally_after_change(
                            original_node_tree,
                            after_change_node_position,
                            top_of_stack,
                            mark,
                            parsing_table,
                            go_to_table,
                            map_word_to_terminal
                        );

                        if (result.status === Parse_status.Accept) {
                            return {
                                status: Parse_status.Accept,
                                processed_words: new_words.length + result.processed_words,
                                changes: result.changes
                            };
                        }
                        else {
                            return {
                                status: Parse_status.Failed,
                                processed_words: 1,
                                changes: []
                            };
                        }
                    }

                    const shift_action = action.value as Shift_action;

                    const node_to_shift = create_bottom_of_stack_node();
                    node_to_shift.word = current_word;
                    const result = apply_shift(node_to_shift, shift_action.next_state, top_of_stack);
                    top_of_stack = result;
                    current_word_index += 1;

                    break;
                }
            case Action_type.Reduce:
                {
                    const reduce_action = action.value as Reduce_action;

                    const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count);
                    if (nodes_to_reduce === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    const found = nodes_to_reduce.find(node => node === mark);
                    if (found !== undefined) {
                        const new_mark = get_node_from_stack(top_of_stack, reduce_action.rhs_count);
                        if (new_mark === undefined) {
                            return {
                                status: Parse_status.Failed,
                                processed_words: 1,
                                changes: []
                            };
                        }
                        mark = new_mark;
                    }

                    const new_node = create_bottom_of_stack_node();

                    const result = apply_reduction(
                        new_node,
                        reduce_action.lhs,
                        reduce_action.rhs_count,
                        top_of_stack,
                        go_to_table,
                        current_word
                    );

                    if (!result.success) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    top_of_stack = result.new_top_of_stack;
                    break;
                }
            default:
                break;
        }
    }

    return {
        status: Parse_status.Failed,
        processed_words: current_word_index,
        changes: []
    };
}

function clone_node(node: Node): Node {
    return {
        word: { value: node.word.value, type: node.word.type },
        state: node.state,
        previous_node_on_stack: node.previous_node_on_stack,
        father_node: node.father_node,
        index_in_father: node.index_in_father,
        children: node.children
    };
}

function get_node_from_stack(top_of_stack: Node, index: number): Node | undefined {
    if (index === 0) {
        return top_of_stack;
    }

    if (top_of_stack.previous_node_on_stack === undefined) {
        return undefined;
    }

    return get_node_from_stack(top_of_stack.previous_node_on_stack, index - 1);
}

function get_top_nodes_from_stack(top_of_stack: Node, count: number): Node[] | undefined {

    const nodes: Node[] = [];

    let current_node = top_of_stack;

    for (let index = 0; index < count; ++index) {
        nodes.push(current_node);

        if (current_node.previous_node_on_stack === undefined) {
            return undefined;
        }

        current_node = current_node.previous_node_on_stack;
    }

    return nodes;
}

function get_next_leaf_node(root: Node, current_node: Node, current_input_node_position: number[]): { node: Node, position: number[] } | undefined {
    let result = iterate_forward(root, current_node, current_input_node_position);

    while (result !== undefined) {
        if (result.next_node.children.length === 0) {
            return {
                node: result.next_node,
                position: result.next_position
            };
        }

        result = iterate_forward(root, result.next_node, result.next_position);
    }

    return undefined;
}

function get_node_position(node: Node): number[] {

    const position: number[] = [];

    let current_node = node;

    while (current_node.father_node !== undefined) {
        position.push(current_node.index_in_father);
        current_node = current_node.father_node;
    }

    return position.reverse();
}

function get_rightmost_brother(node: Node): Node | undefined {

    if (node.father_node === undefined) {
        return undefined;
    }

    return node.father_node.children[node.father_node.children.length - 1];
}

function get_rightmost_terminal_descendant(node: Node): Scanner.Scanned_word {

    if (node.children.length === 0) {
        return node.word;
    }

    return get_rightmost_terminal_descendant(node.children[node.children.length - 1]);
}

function apply_shift(
    node_to_shift: Node,
    state: number,
    top_of_stack: Node
): Node {
    node_to_shift.previous_node_on_stack = top_of_stack;
    node_to_shift.state = state;

    if (g_debug) {
        const node_description = node_stack_to_string(node_to_shift);
        console.log(`shift ${node_description}`);
    }

    return node_to_shift;
}

function apply_reduction(
    node: Node,
    production_lhs: string,
    production_rhs_count: number,
    top_of_stack: Node,
    go_to_table: Go_to_column[][],
    current_word: Scanner.Scanned_word
): { success: boolean, new_top_of_stack: Node } {

    const children = get_top_nodes_from_stack(top_of_stack, production_rhs_count);
    if (children === undefined) {
        return {
            success: false,
            new_top_of_stack: top_of_stack
        };
    }
    children.reverse();

    const previous_node_after_reduction = get_node_from_stack(top_of_stack, production_rhs_count);
    if (previous_node_after_reduction === undefined) {
        return {
            success: false,
            new_top_of_stack: top_of_stack
        };
    }

    const go_to_row = go_to_table[previous_node_after_reduction.state];
    const go_to_column = go_to_row.find(column => column.label === production_lhs);
    if (go_to_column === undefined) {
        return {
            success: false,
            new_top_of_stack: top_of_stack
        };
    }

    node.children = children;
    for (let index = 0; index < children.length; ++index) {
        const child = children[index];
        child.father_node = node;
        child.index_in_father = index;
    }

    node.previous_node_on_stack = previous_node_after_reduction;
    node.word = { value: production_lhs, type: Word_type.Symbol };
    node.state = go_to_column.next_state;

    if (g_debug) {
        const node_description = node_stack_to_string(node);
        const rhs = children.map(node => node.word.value).join(" ");
        console.log(`reduce ${production_lhs} -> ${rhs} ${node_description} ${current_word.value}`);
    }

    return {
        success: true,
        new_top_of_stack: node
    };
}

function matching_condition_holds(
    top_of_stack: Node,
    mark: Node,
    production_lhs: string,
    production_rhs_count: number
): boolean {

    const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, production_rhs_count);
    if (nodes_to_reduce === undefined) {
        return false;
    }

    const mark_index = nodes_to_reduce.findIndex(node => node === mark);
    if (mark_index === -1) {
        return false;
    }

    const nodes_to_reduce_before_mark = get_top_nodes_from_stack(mark, production_rhs_count - mark_index);
    if (nodes_to_reduce_before_mark === undefined) {
        return false;
    }

    for (const node of nodes_to_reduce_before_mark) {
        if (node.father_node !== mark.father_node) {
            return false;
        }
    }

    // TODO check this
    const node_before_mark = get_node_from_stack(mark, production_rhs_count - mark_index);
    if (node_before_mark === undefined || mark.father_node === node_before_mark) {
        return false;
    }

    if (mark.father_node === undefined || (mark.father_node.word.value !== production_lhs)) {
        return false;
    }

    const top_rightmost_descendant = get_rightmost_terminal_descendant(top_of_stack);
    const mark_father_rightmost_descendant = get_rightmost_terminal_descendant(mark.father_node);

    if (top_rightmost_descendant.value !== mark_father_rightmost_descendant.value || top_rightmost_descendant.type !== mark_father_rightmost_descendant.type) {
        return false;
    }

    return true;
}

function create_apply_matching_changes(
    top_of_stack: Node,
    mark: Node,
    mark_node_position: number[],
    production_rhs_count: number
): Change[] {

    const mark_father = mark.father_node as Node;

    const top_nodes = get_top_nodes_from_stack(top_of_stack, production_rhs_count) as Node[];
    top_nodes.reverse();

    const cloned_top_nodes = top_nodes.map(node => clone_node(node));

    const mark_father_clone: Node = {
        word: { value: mark_father.word.value, type: mark_father.word.type },
        state: mark_father.state,
        previous_node_on_stack: mark_father.previous_node_on_stack,
        father_node: mark_father.father_node,
        index_in_father: mark_father.index_in_father,
        children: cloned_top_nodes
    };

    for (let index = 0; index < cloned_top_nodes.length; ++index) {
        const node = cloned_top_nodes[index];
        node.father_node = mark_father_clone;
        node.index_in_father = index;
    }

    const modify_change = create_modify_change(mark_node_position.slice(0, mark_node_position.length - 1), mark_father_clone);
    return [modify_change];
}

function have_same_father(nodes: Node[]): boolean {

    if (nodes.length <= 1) {
        return true;
    }

    const father = nodes[0].father_node;

    for (let index = 1; index < nodes.length; ++index) {
        if (nodes[index].father_node !== father) {
            return false;
        }
    }

    return true;
}

function parse_incrementally_after_change(
    original_node_tree: Node,
    after_change_node_position: number[],
    top_of_stack: Node,
    mark: Node,
    parsing_table: Action_column[][],
    go_to_table: Go_to_column[][],
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, processed_words: number, changes: Change[] } {

    let next_word_node = clone_node(get_node_at_position(original_node_tree, after_change_node_position));
    let next_word_node_position = after_change_node_position;
    let current_word_index = 0;

    let old_table = next_word_node.state;

    {
        const row = parsing_table[top_of_stack.state];
        const column = row.find(column => column.label === map_word_to_terminal(next_word_node.word)) as Action_column;
        const shift_action = column.action.value as Shift_action;

        top_of_stack = apply_shift(next_word_node, shift_action.next_state, top_of_stack);

        {
            const iterate_result = get_next_leaf_node(original_node_tree, next_word_node, next_word_node_position);
            next_word_node = iterate_result !== undefined ? clone_node(iterate_result.node) : create_bottom_of_stack_node();
            next_word_node_position = iterate_result !== undefined ? iterate_result.position : [];
            current_word_index += 1;
        }
    }

    while (true) {

        if (old_table === top_of_stack.state) {

            const rightmost_brother = get_rightmost_brother(top_of_stack);
            if (rightmost_brother === undefined) {
                return {
                    status: Parse_status.Failed,
                    processed_words: 1,
                    changes: []
                };
            }
            top_of_stack = rightmost_brother;

            const next_word = next_word_node.word;
            const row = parsing_table[top_of_stack.state];
            const column = row.find(column => column.label === map_word_to_terminal(next_word));

            if (column === undefined || column.action.type !== Action_type.Reduce) {
                return {
                    status: Parse_status.Failed,
                    processed_words: 1,
                    changes: []
                };
            }

            const reduce_action = column.action.value as Reduce_action;

            const matching_condition = matching_condition_holds(top_of_stack, mark, reduce_action.lhs, reduce_action.rhs_count);

            if (matching_condition) {
                const mark_node_position = get_node_position(mark);
                const changes = create_apply_matching_changes(top_of_stack, mark, mark_node_position, reduce_action.rhs_count);

                return {
                    status: Parse_status.Accept,
                    processed_words: current_word_index,
                    changes: changes
                };
            }
            else {
                const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count);
                if (nodes_to_reduce === undefined) {
                    return {
                        status: Parse_status.Failed,
                        processed_words: 1,
                        changes: []
                    };
                }

                const mark_index = nodes_to_reduce.findIndex(node => node === mark);
                if (mark_index !== -1) {
                    const next_mark = get_node_from_stack(top_of_stack, reduce_action.rhs_count);
                    if (next_mark === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    mark = next_mark;
                }

                const father_node = top_of_stack.father_node as Node;
                old_table = father_node.state;

                if (have_same_father(nodes_to_reduce)) {
                    next_word_node = clone_node(top_of_stack.father_node as Node);
                    next_word_node_position = get_node_position(next_word_node);

                    const previous_node_on_stack = get_node_from_stack(top_of_stack, reduce_action.rhs_count) as Node;
                    next_word_node.previous_node_on_stack = previous_node_on_stack;

                    const go_to_row = go_to_table[previous_node_on_stack.state];
                    const go_to_column = go_to_row.find(column => column.label === reduce_action.lhs);
                    if (go_to_column === undefined) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    next_word_node.state = go_to_column.next_state;
                }
                else {
                    const new_node = create_bottom_of_stack_node();
                    const result = apply_reduction(new_node, reduce_action.lhs, reduce_action.rhs_count, top_of_stack, go_to_table, next_word);

                    if (!result.success) {
                        return {
                            status: Parse_status.Failed,
                            processed_words: 1,
                            changes: []
                        };
                    }

                    top_of_stack = result.new_top_of_stack;
                }
            }
        }
        else {
            const result = perform_actions(
                next_word_node,
                top_of_stack,
                mark,
                old_table,
                parsing_table,
                go_to_table,
                map_word_to_terminal
            );

            if (result.status === Parse_status.Continue) {

                const iterate_result = get_next_leaf_node(original_node_tree, next_word_node, next_word_node_position);
                next_word_node = iterate_result !== undefined ? clone_node(iterate_result.node) : create_bottom_of_stack_node();
                next_word_node_position = iterate_result !== undefined ? iterate_result.position : [];
                current_word_index += 1;

                top_of_stack = result.top_of_stack;
                mark = result.mark;
                old_table = result.old_table;
            }
            else if (result.status === Parse_status.Accept) {
                return {
                    status: Parse_status.Accept,
                    processed_words: current_word_index,
                    changes: result.changes
                };
            }
            else {
                return {
                    status: Parse_status.Failed,
                    processed_words: 1,
                    changes: []
                };
            }
        }
    }
}

function perform_actions(
    next_word_node: Node,
    top_of_stack: Node,
    mark: Node,
    old_table: number,
    parsing_table: Action_column[][],
    go_to_table: Go_to_column[][],
    map_word_to_terminal: (word: Scanner.Scanned_word) => string
): { status: Parse_status, top_of_stack: Node, mark: Node, old_table: number, changes: Change[] } {

    while (true) {

        const row = parsing_table[top_of_stack.state];
        const column = row.find(column => column.label === map_word_to_terminal(next_word_node.word));

        if (column === undefined) {
            return {
                status: Parse_status.Failed,
                top_of_stack: top_of_stack,
                mark: mark,
                old_table: old_table,
                changes: []
            };
        }

        const action = column.action;

        switch (action.type) {
            case Action_type.Accept:
                {
                    return {
                        status: Parse_status.Accept,
                        top_of_stack: top_of_stack,
                        mark: mark,
                        old_table: old_table,
                        changes: []
                    };
                }
            case Action_type.Shift:
                {
                    old_table = next_word_node.state;

                    const shift_action = action.value as Shift_action;
                    top_of_stack = apply_shift(next_word_node, shift_action.next_state, top_of_stack);

                    return {
                        status: Parse_status.Continue,
                        top_of_stack: top_of_stack,
                        mark: mark,
                        old_table: old_table,
                        changes: []
                    };
                }
            case Action_type.Reduce:
                {
                    const reduce_action = action.value as Reduce_action;

                    const matching_condition = matching_condition_holds(top_of_stack, mark, reduce_action.lhs, reduce_action.rhs_count);

                    if (matching_condition) {
                        const mark_node_position = get_node_position(mark);
                        const changes = create_apply_matching_changes(top_of_stack, mark, mark_node_position, reduce_action.rhs_count);

                        return {
                            status: Parse_status.Accept,
                            top_of_stack: top_of_stack,
                            mark: mark,
                            old_table: old_table,
                            changes: changes
                        };
                    }
                    else {

                        const nodes_to_reduce = get_top_nodes_from_stack(top_of_stack, reduce_action.rhs_count);

                        if (nodes_to_reduce === undefined) {
                            return {
                                status: Parse_status.Failed,
                                top_of_stack: top_of_stack,
                                mark: mark,
                                old_table: old_table,
                                changes: []
                            };
                        }

                        const mark_index = nodes_to_reduce.findIndex(node => node === mark);
                        if (mark_index !== -1) {
                            mark = get_node_from_stack(top_of_stack, reduce_action.rhs_count) as Node;
                        }

                        const new_node = create_bottom_of_stack_node();
                        const result = apply_reduction(new_node, reduce_action.lhs, reduce_action.rhs_count, top_of_stack, go_to_table, next_word_node.word);

                        if (!result.success) {
                            return {
                                status: Parse_status.Failed,
                                top_of_stack: top_of_stack,
                                mark: mark,
                                old_table: old_table,
                                changes: []
                            };
                        }

                        top_of_stack = result.new_top_of_stack;
                    }
                    break;
                }
        }
    }
}

export function node_to_string(node: Node): string {
    return JSON.stringify(node);
}

function get_labels(description: string): string[] {
    return description.split(" ");
}

function find_production_rules(production_rules: Production_rule[], lhs: string): number[] {

    for (let index = 0; index < production_rules.length; ++index) {
        if (production_rules[index].lhs === lhs) {

            const indices: number[] = [index];

            for (let same_rule_index = index + 1; same_rule_index < production_rules.length; ++same_rule_index) {
                if (production_rules[same_rule_index].lhs === lhs) {
                    indices.push(same_rule_index);
                }
                else {
                    break;
                }
            }

            return indices;
        }
    }

    return [];
}

function find_lr1_items(production_rules: Production_rule[], lr1_items: LR1_item[], lhs: string): number[] {

    const indices: number[] = [];

    for (let index = 0; index < lr1_items.length; ++index) {

        const item = lr1_items[index];
        const production_rule = production_rules[item.production_rule_index];
        if (production_rule.lhs === lhs) {
            indices.push(index);
        }
    }

    return indices;
}

function is_terminal(label: string, terminals: string[]): boolean {
    const index = terminals.findIndex(terminal => terminal === label);
    return index !== -1;
}

export function lr1_item_to_string(production_rules: Production_rule[], item: LR1_item): string {

    const production_rule = production_rules[item.production_rule_index];

    const rhs = [...production_rule.rhs];

    if (item.label_index < rhs.length) {
        rhs[item.label_index] = "." + rhs[item.label_index];
    }
    else {
        rhs.push(".");
    }

    const formatted_rhs = rhs.join(" ");

    return `${production_rule.lhs} -> ${formatted_rhs}, ${item.follow_terminal}`;
}
/*
interface Parse_node {
    value: string | undefined;
    table: any[];
    address: number;
    pushdown: number | undefined;
    father: number | undefined;
    rightmost_brother: number | undefined;
    rightmost_descendant: number;
}

function take(values: string[], bellow: number[], father: number[], rightmost_brother: number[], rightmost_descendant: number[]): number {
    const address = values.length;
    values.push("");
    bellow.push(-1);
    father.push(-1);
    rightmost_brother.push(-1);
    rightmost_descendant.push(values.length);
    return address;
}

function get_nth_node_bellow(bellow_nodes: number[], current_node: number, index: number): number {

    if (index === 0) {
        return current_node;
    }

    const bellow = get_nth_node_bellow(bellow_nodes, current_node, index - 1);
    return bellow_nodes[bellow];
}

function apply_shift(stack: number[], current_node: number, bellow_nodes: number[]): void {
    const top = stack[stack.length - 1];
    bellow_nodes[current_node] = top;
    stack.push(current_node);
}

function apply_reduction(
    stack: number[],
    values: string[],
    father_nodes: number[],
    bellow_nodes: number[],
    rightmost_brothers: number[],
    rightmost_descendants: number[],
    production_rule_lhs: string,
    production_rule_rhs_count: number,
    current_node: number
): void {

    const top = stack[stack.length - 1];

    for (let index = 0; index < production_rule_rhs_count; ++index) {
        const bellow = get_nth_node_bellow(bellow_nodes, current_node, index);
        father_nodes[bellow] = current_node;
        rightmost_brothers[bellow] = top;
    }
    bellow_nodes[current_node] = get_nth_node_bellow(bellow_nodes, top, production_rule_rhs_count);
    values[current_node] = production_rule_lhs;
    // TODO table

    rightmost_descendants[current_node] = rightmost_descendants[top];

    stack.push(current_node);
}

function matching_condition(
    stack: number[],
    values: string[],
    father_nodes: number[],
    bellow_nodes: number[],
    rightmost_descendants: number[],
    production_rule: Production_rule,
    mark: number
): boolean {

    const top = stack[stack.length - 1];

    const production_rule_rhs_count = production_rule.rhs.length;

    let mark_index = -1;
    {
        for (let index = 0; index < production_rule_rhs_count; ++index) {
            if (mark === get_nth_node_bellow(bellow_nodes, top, index)) {
                mark_index = index;
                break;
            }
        }

        if (mark_index === -1) {
            return false;
        }
    }

    {
        const mark_father = father_nodes[mark];
        for (let index = 0; index < production_rule_rhs_count - mark_index; ++index) {
            const current_node = get_nth_node_bellow(bellow_nodes, mark, index);
            const current_node_father = father_nodes[current_node];
            if (mark_father !== current_node_father) {
                return false;
            }
        }
    }

    {
        const mark_father = father_nodes[mark];

        const next_node = get_nth_node_bellow(bellow_nodes, mark, production_rule_rhs_count - mark_index);
        const next_node_father = father_nodes[next_node];
        if (mark_father === next_node_father) {
            return false;
        }
    }

    if (values[father_nodes[mark]] !== production_rule.lhs) {
        return false;
    }

    if (rightmost_descendants[top] !== rightmost_descendants[father_nodes[mark]]) {
        return false;
    }

    return true;
}

function apply_matching(
    stack: number[],
    father_nodes: number[],
    bellow_nodes: number[],
    rightmost_descendants: number[],
    production_rule: Production_rule,
    mark: number
): void {
    const top = stack[stack.length - 1];

    const production_rule_rhs_count = production_rule.rhs.length;

    for (let index = 0; index < production_rule_rhs_count; ++index) {
        const current_node = get_nth_node_bellow(bellow_nodes, top, index);
        father_nodes[current_node] = father_nodes[mark];
        rightmost_descendants[current_node] = top;
    }
}

function initialize(input: Scanner.Scanned_word[], start_word_index: number, new_words: Scanner.Scanned_word[], values: string[], bellow_nodes: number[]): void {

    const bottom_of_stack = -1;

    // If not parsing from scratch:
    if (input.length > 0) {
        const first_word = input[start_word_index];
        const current_node = values.findIndex(value => value === first_word.value);
        const mark = get_nth_node_bellow(bellow_nodes, current_node, 1);
        const top = mark;


    }
    // If parsing from scratch
    else {
        const mark = bottom_of_stack;
        const top = mark;
    }
}

// first_label_after_change == y
function analysis_of_change(
    top: number,
    top_state: number,
    mark: number,
    current_label: string,
    first_label_after_change: string,
    action_table: Action_column[][],
    stack: number[],
    values: string[],
    bellow_nodes: number[],
    father_nodes: number[],
    rightmost_brother_nodes: number[],
    rightmost_descendant_nodes: number[]
): void {

    // TODO for loop

    const action_row = action_table[top_state];
    const action_column = action_row.find(action => action.label === current_label);

    if (action_column !== undefined) {
        switch (action_column.action.type) {
            case Action_type.Shift:
                {
                    if (current_label === first_label_after_change) {
                        // Go to step 3:
                        return;
                    }
                    const shift_action = action_column.action.value as Shift_action;
                    const current_node = take(values, bellow_nodes, father_nodes, rightmost_brother_nodes, rightmost_descendant_nodes);
                    values[current_node] = current_label;
                    apply_shift(stack, current_node, bellow_nodes);
                    break;
                }
            case Action_type.Reduce:
                {
                    const reduce_action = action_column.action.value as Reduce_action;

                    for (let index = 0; index < reduce_action.rhs_count; ++index) {
                        const current_node = get_nth_node_bellow(bellow_nodes, top, index);
                        if (mark === current_node) {
                            mark = get_nth_node_bellow(bellow_nodes, top, reduce_action.rhs_count);
                            current_node = take(values, bellow_nodes, father_nodes, rightmost_brother_nodes, rightmost_descendant_nodes);
                            apply_reduction(stack, values, father_nodes, bellow_nodes, rightmost_brother_nodes, rightmost_descendant_nodes, reduce_action.lhs, reduce_action.rhs_count, current_node);
                            // TODO return and update mark, current_node, etc
                        }
                    }
break;
                }
            case Action_type.Accept:
{
    // Accept the string
}
        }

    }
}
*/

/*export function parse_incrementally_2(input: Scanner.Scanned_word[], start_word_index: number, state_stack: number[], nodes_stack: Node[], parsing_table: Action_column[][], go_to_table: Go_to_column[][], map_word_to_terminal: (word: Scanner.Scanned_word) => string): { status: Parse_status, processed_words: number } {

}*/
