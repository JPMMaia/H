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
    non_terminal: string;
    rule: string[][]
}

export function create_production_rules(grammar_description: string[]): Production_rule[] {

    const production_rules: Production_rule[] = [];

    for (const rule_description of grammar_description) {
        const words = get_words(rule_description);

        const non_terminal = words[0];

        const rules: string[][] = [];
        rules.push([]);

        let word_index = 2;

        while (word_index < words.length) {

            const word = words[word_index];

            if (word === "|") {
                rules.push([]);
            }
            else {
                rules[rules.length - 1].push(word);
            }

            word_index += 1;
        }


        production_rules.push({
            non_terminal: non_terminal,
            rule: rules
        });
    }

    // Augment grammar:
    for (const rule of production_rules[0].rule) {
        rule.push("$");
    }

    return production_rules;
}

export function get_non_terminals(production_rules: Production_rule[]): string[] {
    return production_rules.map(production_rule => production_rule.non_terminal);
}

export function get_terminals(production_rules: Production_rule[]): string[] {

    const terminals: string[] = [];

    for (const production_rule of production_rules) {
        for (const rule of production_rule.rule) {
            for (const word of rule) {
                const production_rule_index = find_production_rule(production_rules, 0, word);
                if (production_rule_index === -1) {
                    const terminal_index = terminals.findIndex(terminal => terminal === word);
                    if (terminal_index === -1) {
                        terminals.push(word);
                    }
                }
            }
        }
    }

    const output = [
        ...terminals
    ];
    output.sort();
    return output;
}

export function first(production_rules: Production_rule[], terminals: string[]): Map<string, string[]> {

    const output = new Map<string, string[]>();

    for (let production_rule_index = 0; production_rule_index < production_rules.length; ++production_rule_index) {
        const visited_non_terminals: string[] = [];
        const first_terminals = first_auxiliary(production_rules, production_rule_index, visited_non_terminals);

        const production_rule = production_rules[production_rule_index];
        output.set(production_rule.non_terminal, first_terminals);
    }

    for (const terminal of terminals) {
        output.set(terminal, [terminal]);
    }

    return output;
}

function first_auxiliary(production_rules: Production_rule[], production_rule_index: number, visited_non_terminals: string[]): string[] {

    const terminals = new Set<string>();

    const production_rule = production_rules[production_rule_index];

    for (const rule of production_rule.rule) {
        const word = rule[0];

        const index = visited_non_terminals.findIndex(non_terminal => non_terminal === word);

        // If word corresponds to a non-terminal and it was already visited:
        if (index !== -1) {
            continue;
        }

        const word_production_rule_index = find_production_rule(production_rules, 0, word);

        // If is non-terminal:
        if (word_production_rule_index !== -1) {
            visited_non_terminals.push(word);

            const new_terminals = first_auxiliary(production_rules, word_production_rule_index, visited_non_terminals);

            for (const new_terminal of new_terminals) {
                terminals.add(new_terminal);
            }
        }
        // If it is terminal:
        else {
            terminals.add(word);
        }
    }

    return [...terminals];
}

export function follow(production_rules: Production_rule[], terminals: string[], first_terminals: Map<string, string[]>): Map<string, string[]> {

    const follow_map = new Map<string, string[]>();

    for (let production_rule_index = 0; production_rule_index < production_rules.length; ++production_rule_index) {
        const production_rule = production_rules[production_rule_index];
        const follow_terminals = follow_auxiliary(production_rules, first_terminals, production_rule.non_terminal, production_rule_index === 0);
        follow_map.set(production_rule.non_terminal, follow_terminals);
    }

    for (const terminal of terminals) {
        const follow_terminals = follow_auxiliary(production_rules, first_terminals, terminal, false);
        follow_map.set(terminal, follow_terminals);
    }

    return follow_map;
}

function follow_auxiliary(production_rules: Production_rule[], first_terminals_map: Map<string, string[]>, word: string, is_first_production_rule: boolean): string[] {

    if (is_first_production_rule) {
        return ["$"];
    }

    const terminals = new Set<string>();

    for (let current_production_rule_index = 0; current_production_rule_index < production_rules.length; ++current_production_rule_index) {
        const current_production_rule = production_rules[current_production_rule_index];
        for (const rule of current_production_rule.rule) {

            const word_index = rule.findIndex(word_in_rule => word_in_rule === word);

            // If the next word is in the rule and it's not the last:
            if (word_index !== -1 && (word_index + 1) < rule.length) {
                const next_word = rule[word_index + 1];

                const first_terminals = first_terminals_map.get(next_word);
                if (first_terminals !== undefined) {
                    for (const terminal of first_terminals) {
                        terminals.add(terminal);
                    }
                }
            }
            // If next word is the last word in the rule:
            else if (word_index + 1 === rule.length) {
                const current_production_rule_non_terminal = current_production_rule.non_terminal;
                const first_terminals = follow_auxiliary(production_rules, first_terminals_map, current_production_rule_non_terminal, current_production_rule_index === 0);
                for (const terminal of first_terminals) {
                    terminals.add(terminal);
                }
            }
        }
    }

    const output = [...terminals];
    output.sort();
    return output;
}

export interface LR0_item {
    production_rule_index: number;
    rule_index: number;
    word_index: number;
}

export interface LR1_item {
    production_rule_index: number;
    rule_index: number;
    word_index: number;
    follow_terminals: string[];
}

function are_lr0_item_equal(lhs: LR0_item, rhs: LR0_item): boolean {
    return lhs.production_rule_index === rhs.production_rule_index && lhs.rule_index === rhs.rule_index && lhs.word_index === rhs.word_index;
}

export function create_lr0_items(production_rules: Production_rule[], production_rule_index: number, rule_index: number, word_index: number): LR0_item[] {

    const items: LR0_item[] = [
        {
            production_rule_index: production_rule_index,
            rule_index: rule_index,
            word_index: word_index
        }
    ];

    let item_index = 0;

    while (item_index < items.length) {
        const item = items[item_index];
        const production_rule = production_rules[item.production_rule_index];
        const rule = production_rule.rule[item.rule_index];
        const word = rule[word_index];

        const next_production_rule_index = find_production_rule(production_rules, item.production_rule_index, word);

        if (next_production_rule_index === -1) {
            item_index += 1;
            continue;
        }

        const next_production_rule = production_rules[next_production_rule_index];

        for (let rule_index = 0; rule_index < next_production_rule.rule.length; ++rule_index) {

            const new_item: LR0_item = {
                production_rule_index: next_production_rule_index,
                rule_index: rule_index,
                word_index: 0
            };

            const item_index = items.findIndex(item => are_lr0_item_equal(item, new_item));

            if (item_index === -1) {
                items.push(new_item);
            }
        }

        item_index += 1;
    }

    return items;
}

export function create_lr1_items(production_rules: Production_rule[], follow_terminals_map: Map<string, string[]>, production_rule_index: number, rule_index: number, word_index: number): LR1_item[] {

    const lr0_items = create_lr0_items(production_rules, production_rule_index, rule_index, word_index);

    const lr1_items = lr0_items.map(
        lr0_item => {

            const current_word = get_word(production_rules, lr0_item);
            const follow_terminals = follow_terminals_map.get(current_word);
            if (follow_terminals === undefined) {
                const message = "Failed to find follow terminals! follow_terminals_map must contain current_word!";
                onThrowError(message);
                throw Error(message);
            }

            const lr1_item: LR1_item = {
                production_rule_index: lr0_item.production_rule_index,
                rule_index: lr0_item.rule_index,
                word_index: lr0_item.word_index,
                follow_terminals: [...follow_terminals]
            };

            return lr1_item;
        }
    );

    return lr1_items;
}

function get_words(description: string): string[] {
    return description.split(" ");
}

function find_production_rule(production_rules: Production_rule[], start_index: number, non_terminal: string): number {

    for (let index = start_index; index < production_rules.length; ++index) {
        if (production_rules[index].non_terminal === non_terminal) {
            return index;
        }
    }

    return -1;
}

function get_word(production_rules: Production_rule[], item: LR0_item): string {
    const production_rule = production_rules[item.production_rule_index];
    const rule = production_rule.rule[item.rule_index];
    const word = item.word_index < rule.length ? rule[item.word_index] : "$";
    return word;
}
