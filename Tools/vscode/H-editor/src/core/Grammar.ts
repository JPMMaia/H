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

export function create_lr1_item_set(production_rules: Production_rule[], lr0_item_set: LR0_item[], non_terminals_follow: Map<string, string[]>): LR1_item[] {

    const lr1_item_set: LR1_item[] = [];

    for (const lr0_item of lr0_item_set) {
        const production_rule = production_rules[lr0_item.production_rule_index];
        const lhs = production_rule.lhs;
        const lhs_follow = non_terminals_follow.get(lhs);

        if (lhs_follow === undefined) {
            const message = "Failed to find new follow terminals! non_terminals_follow must contain label!";
            onThrowError(message);
            throw Error(message);
        }

        for (const follow_terminal of lhs_follow) {
            lr1_item_set.push({
                production_rule_index: lr0_item.production_rule_index,
                label_index: lr0_item.label_index,
                follow_terminal: follow_terminal
            });
        }
    }

    return lr1_item_set;
}

function compute_lr1_closure(production_rules: Production_rule[], all_lr1_items: LR1_item[], lr1_item_set: LR1_item[]): LR1_item[] {

    const closure_item_set: LR1_item[] = [...lr1_item_set];

    for (let index = 0; index < closure_item_set.length; ++index) {

        const item = closure_item_set[index];

        const production_rule = production_rules[item.production_rule_index];
        const label = production_rule.rhs[item.label_index];

        const new_item_indices = find_lr1_items(production_rules, all_lr1_items, label);

        for (const new_item_index of new_item_indices) {

            const new_item = all_lr1_items[new_item_index];

            const existing_item_index = closure_item_set.findIndex(closure_item => are_lr1_items_equal(closure_item, new_item));

            if (existing_item_index === -1) {
                closure_item_set.push(new_item);
            }
        }
    }

    closure_item_set.sort(compare_lr1_items);

    return closure_item_set;
}

export function create_next_lr1_item_set(production_rules: Production_rule[], all_lr1_items: LR1_item[], lr1_item_set: LR1_item[], label: string, non_terminals_follow: Map<string, string[]>): LR1_item[] {

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
    const new_item_set_closure = compute_lr1_closure(production_rules, all_lr1_items, new_item_set);

    return new_item_set_closure;
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
