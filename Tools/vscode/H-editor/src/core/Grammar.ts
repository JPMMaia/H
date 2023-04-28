import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Core from "../utilities/coreModelInterface";
import * as Symbol_database from "./Symbol_database";
import { onThrowError } from "../utilities/errors";

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
            else if (word !== "") {
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

function get_labels(description: string): string[] {
    return description.split(" ");
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

export function find_production_rules(production_rules: Production_rule[], lhs: string): number[] {

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

function is_terminal(label: string, terminals: string[]): boolean {
    const index = terminals.findIndex(terminal => terminal === label);
    return index !== -1;
}

function add_unique(array: any, element: any, predicate: any): void {
    const index = array.findIndex((current: any) => predicate(current, element));
    if (index === -1) {
        array.push(element);
    }
}

interface LR0_item {
    production_rule_index: number;
    label_index: number;
}

function are_lr0_items_equal(lhs: LR0_item, rhs: LR0_item): boolean {
    return lhs.production_rule_index === rhs.production_rule_index && lhs.label_index === rhs.label_index;
}

function find_item_sets_at_label(production_rules: Production_rule[], item_set: LR0_item[], label: string): LR0_item[] {
    return item_set.filter(item => {
        const production_rule = production_rules[item.production_rule_index];
        const item_label = production_rule.rhs[item.label_index];
        return item_label === label;
    });
}

export interface LR1_item {
    production_rule_index: number;
    label_index: number;
    follow_terminal: string;
}

function are_lr1_items_equal(lhs: LR1_item, rhs: LR1_item): boolean {
    return lhs.production_rule_index === rhs.production_rule_index && lhs.label_index === rhs.label_index && lhs.follow_terminal === rhs.follow_terminal;
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

function first_terminals_of_lr1_item(production_rules: Production_rule[], start_item: LR1_item, terminals: string[]): string[] {

    const item_set: LR0_item[] = [start_item];

    for (let item_index = 0; item_index < item_set.length; ++item_index) {
        const item = item_set[item_index];

        const production_rule = production_rules[item.production_rule_index];
        if (item.label_index === production_rule.rhs.length) {

            const previous_items = find_item_sets_at_label(production_rules, item_set, production_rule.lhs);
            const next_items = previous_items.map((current: LR0_item): LR0_item => { return { production_rule_index: current.production_rule_index, label_index: current.label_index + 1 }; });

            for (const next_item of next_items) {
                add_unique(item_set, next_item, are_lr0_items_equal);
            }

            continue;
        }

        const label = production_rule.rhs[item.label_index];

        const production_rule_indices = find_production_rules(production_rules, label);

        for (const new_production_rule_index of production_rule_indices) {
            const new_item: LR0_item = { production_rule_index: new_production_rule_index, label_index: 0 };
            add_unique(item_set, new_item, are_lr0_items_equal);
        }
    }

    const output: string[] = [];

    for (const item of item_set) {
        const production_rule = production_rules[item.production_rule_index];
        const label = production_rule.rhs[item.label_index];
        if (is_terminal(label, terminals)) {
            add_unique(output, label, (current: string) => current === label);
        }
        else if (item.production_rule_index === start_item.production_rule_index && item.label_index === production_rule.rhs.length) {
            add_unique(output, start_item.follow_terminal, (current: string) => current === label);
        }
    }

    output.sort();

    return output;

}

export function create_start_lr1_item_set(production_rules: Production_rule[], terminals: string[]): LR1_item[] {

    const first_lr1_item: LR1_item = {
        production_rule_index: 0,
        label_index: 0,
        follow_terminal: "$"
    };

    const lr1_item_set = compute_lr1_closure(production_rules, terminals, [first_lr1_item]);

    return lr1_item_set;
}

function compute_lr1_closure(production_rules: Production_rule[], terminals: string[], lr1_item_set: LR1_item[]): LR1_item[] {

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
            continue;
        }

        const label = production_rule.rhs[item.label_index];

        const next_label_item: LR1_item = { production_rule_index: item.production_rule_index, label_index: item.label_index + 1, follow_terminal: item.follow_terminal };
        const look_aheads = first_terminals_of_lr1_item(production_rules, next_label_item, terminals);

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

export function create_next_lr1_item_set(production_rules: Production_rule[], terminals: string[], lr1_item_set: LR1_item[], label: string): LR1_item[] {

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
    const new_item_set_closure = compute_lr1_closure(production_rules, terminals, new_item_set);

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

export function create_lr1_graph(production_rules: Production_rule[], terminals: string[], lr1_item_set_0: LR1_item[]): { states: LR1_item[][], edges: Edge[] } {

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

        const next_states = unique_current_labels.map(label => create_next_lr1_item_set(production_rules, terminals, current_state, label));

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
    production_rule_index: number;
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
                            production_rule_index: item.production_rule_index,
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

export function create_parsing_tables_from_production_rules(production_rules: Production_rule[]): { action_table: Action_column[][], go_to_table: Go_to_column[][] } {
    const non_terminals = get_non_terminals(production_rules);
    const terminals = get_terminals(production_rules, non_terminals);
    const lr1_item_set_0 = create_start_lr1_item_set(production_rules, terminals);
    const graph = create_lr1_graph(production_rules, terminals, lr1_item_set_0);
    const parsing_tables = create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
    return parsing_tables;
}
