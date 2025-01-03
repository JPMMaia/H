import * as fs from "fs";

import { onThrowError } from "./errors";

const g_debug = false;

export enum Word_type {
    Alphanumeric,
    Comment,
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

export enum Production_rule_flags {
    None = 0,
    Is_array = 1,
    Is_array_set = 2
}

export interface Production_rule {
    lhs: string;
    rhs: string[];
    flags: Production_rule_flags
}

function create_0_or_more_production_rule(lhs: string, rhs: string[]): Production_rule[] {

    const array_element = rhs[0];
    const has_separator = rhs.length === 2;

    return [
        {
            lhs: lhs,
            rhs: [],
            flags: Production_rule_flags.Is_array_set
        },
        {
            lhs: lhs,
            rhs: [array_element],
            flags: Production_rule_flags.Is_array_set
        },
        {
            lhs: lhs,
            rhs: has_separator ? [array_element, rhs[1], array_element] : [array_element, array_element],
            flags: Production_rule_flags.Is_array | Production_rule_flags.Is_array_set
        }
    ];
}

function create_1_or_more_production_rule(lhs: string, rhs: string[]): Production_rule[] {

    const array_element = rhs[0];
    const has_separator = rhs.length === 2;

    return [
        {
            lhs: lhs,
            rhs: [array_element],
            flags: Production_rule_flags.Is_array_set
        },
        {
            lhs: lhs,
            rhs: has_separator ? [array_element, rhs[1], array_element] : [array_element, array_element],
            flags: Production_rule_flags.Is_array | Production_rule_flags.Is_array_set
        }
    ];
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

                if (word_index - 1 > 0 && words[word_index - 1] === "$0_or_more") {
                    const new_production_rules = create_0_or_more_production_rule(lhs, rhs);
                    production_rules.push(...new_production_rules);
                }
                else if (word_index - 1 > 0 && words[word_index - 1] === "$1_or_more") {
                    const new_production_rules = create_1_or_more_production_rule(lhs, rhs);
                    production_rules.push(...new_production_rules);
                }
                else {
                    production_rules.push({
                        lhs: lhs,
                        rhs: [...rhs],
                        flags: Production_rule_flags.None
                    });
                }
                rhs.splice(0, rhs.length);
            }
            else if (word !== "" && word !== "$0_or_more" && word !== "$1_or_more") {
                if (word === "$single_or") {
                    rhs.push("|");
                }
                else {
                    rhs.push(word);
                }
            }

            word_index += 1;
        }

        if (words.length > 0 && words[words.length - 1] === "$0_or_more") {
            const new_production_rules = create_0_or_more_production_rule(lhs, rhs);
            production_rules.push(...new_production_rules);
        }
        else if (words.length > 0 && words[words.length - 1] === "$1_or_more") {
            const new_production_rules = create_1_or_more_production_rule(lhs, rhs);
            production_rules.push(...new_production_rules);
        }
        else {
            production_rules.push({
                lhs: lhs,
                rhs: rhs,
                flags: Production_rule_flags.None
            });
        }
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

export function are_lr1_items_equal(lhs: LR1_item, rhs: LR1_item): boolean {
    return lhs.production_rule_index === rhs.production_rule_index && lhs.label_index === rhs.label_index && lhs.follow_terminal === rhs.follow_terminal;
}

export function are_lr1_item_sets_equal(lhs: LR1_item[], rhs: LR1_item[]): boolean {
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

    if (g_debug) {
        console.log("------");
    }

    const closure_item_set: LR1_item[] = [...lr1_item_set];

    for (let index = 0; index < closure_item_set.length; ++index) {

        const item = closure_item_set[index];

        if (g_debug) {
            console.log(lr1_item_to_string(production_rules, item));
        }

        const production_rule = production_rules[item.production_rule_index];
        if (item.label_index >= production_rule.rhs.length) {
            continue;
        }

        const label = production_rule.rhs[item.label_index];

        {
            const next_label_item: LR1_item = { production_rule_index: item.production_rule_index, label_index: item.label_index + 1, follow_terminal: item.follow_terminal };
            const look_aheads = first_terminals_of_lr1_item(production_rules, next_label_item, terminals);

            if ((production_rule.flags & Production_rule_flags.Is_array) && item.label_index === production_rule.rhs.length - 1) {
                const reset_item: LR1_item = {
                    production_rule_index: item.production_rule_index,
                    label_index: 1,
                    follow_terminal: item.follow_terminal
                };
                const array_look_aheads = first_terminals_of_lr1_item(production_rules, reset_item, terminals);
                look_aheads.push(...array_look_aheads);
            }

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

    // Add array items:
    /*for (const item of items_at_label) {
        const production_rule = production_rules[item.production_rule_index];
        if ((production_rule.flags & Production_rule_flags.Is_array) && item.label_index === production_rule.rhs.length - 1) {

            const has_separator = production_rule.rhs.length === 3;
            if (has_separator) {
                const reset_item: LR1_item = {
                    production_rule_index: item.production_rule_index,
                    label_index: 0,
                    follow_terminal: item.follow_terminal
                };
                add_unique(new_item_set, reset_item, are_lr1_items_equal);
            }
            else {
                add_unique(new_item_set, item, are_lr1_items_equal);
            }
        }
    }*/
    for (const item of new_item_set) {
        const production_rule = production_rules[item.production_rule_index];
        if ((production_rule.flags & Production_rule_flags.Is_array) && item.label_index === 2) {
            const has_separator = production_rule.rhs.length === 3;

            const reset_item: LR1_item = {
                production_rule_index: item.production_rule_index,
                label_index: has_separator ? 0 : 1,
                follow_terminal: item.follow_terminal
            };
            add_unique(new_item_set, reset_item, are_lr1_items_equal);
        }
    }

    // Compute closure:
    const new_item_set_closure = compute_lr1_closure(production_rules, terminals, new_item_set);

    if (g_debug) {
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

    if (g_debug) {
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
    }

    return {
        states: states,
        edges: edges
    };
}

function escape_html_string(value: string): string {
    const characters = [];

    for (let index = 0; index < value.length; ++index) {
        characters.push(`&#${value.charCodeAt(index)};`);
    }

    return characters.join("");
}

function create_state_format(
    state_index: number,
    state: LR1_item[],
    production_rules: Production_rule[]
): string {

    const style = state_index === 0 ? "filled, bold" : "filled";
    const penwidth = state_index === 0 ? 1 : 5;
    const style_string = `style = "${style}" penwidth = ${penwidth} fillcolor = "white" fontname = "Courier New" shape = "Mrecord"`;

    const table_parts: string[] = [];
    table_parts.push(`<table border="0" cellborder="0" cellpadding="3" bgcolor="white">`);

    table_parts.push(`<tr>`);
    {
        table_parts.push(`<td bgcolor="black" align="center" colspan="2">`);
        {
            table_parts.push(`<font color="white">State #${state_index}</font>`);
        }
        table_parts.push(`</td>`);
    }
    table_parts.push(`</tr>`);

    const aggregated_items = new Map<string, [LR0_item, [string]]>();
    for (const item of state) {
        const key = `${item.production_rule_index}@${item.label_index}`;
        const follow_array = aggregated_items.get(key);
        if (follow_array !== undefined) {
            follow_array[1].push(item.follow_terminal);
        }
        else {
            const lr0_item: LR0_item = {
                production_rule_index: item.production_rule_index,
                label_index: item.label_index
            };
            aggregated_items.set(key, [lr0_item, [item.follow_terminal]]);
        }
    }

    let index = 0;
    aggregated_items.forEach((value: [LR0_item, [string]], key: string) => {
        const item = value[0];
        const follow_set = value[1];

        const production_rule = production_rules[item.production_rule_index];

        table_parts.push(`<tr>`);
        {
            const rhs_array = [];
            for (const label of production_rule.rhs) {
                rhs_array.push(escape_html_string(label));
            }
            if (item.label_index < rhs_array.length) {
                rhs_array[item.label_index] = `&bull;${rhs_array[item.label_index]}`;
            }
            else {
                rhs_array.push(` &bull;`);
            }

            const rhs_array_string = rhs_array.join(" ");

            const follow_set_string = escape_html_string(`{ ${follow_set.join(", ")} }`);

            table_parts.push(`<td align="left" port="r${index}">&#40;P#${item.production_rule_index}&#41; ${production_rule.lhs} -&gt; ${rhs_array_string} follow_set: ${follow_set_string} </td>`);
        }
        table_parts.push(`</tr>`);

        index += 1;
    });

    table_parts.push(`</table>`);

    const table_string = table_parts.join("");

    return `${style_string} label =<${table_string}>`;
}

function create_edge_format(
    label: string,
    is_shift: boolean
): string {
    if (is_shift) {
        return `penwidth = 5 fontsize = 28 fontcolor = "black" label = "${label}"`;
    }
    else {
        return `penwidth = 1 fontsize = 14 fontcolor = "grey28" label = "'${label}'"`;
    }
}

export function create_graphviz(
    graph: { states: LR1_item[][], edges: Edge[] },
    production_rules: Production_rule[],
    terminals: string[],
    state_names?: Map<number, number>
): string {

    const output: string[] = [
        `digraph G {`,
        `  fontname="Helvetica,Arial,sans-serif"`,
        `  node [fontname="Helvetica,Arial,sans-serif"]`,
        `  edge [fontname="Helvetica,Arial,sans-serif"]`,
        `  graph [fontsize=30 labelloc="t" label="" splines=true overlap=false rankdir = "LR"];`,
        `  ratio = auto;`,
    ];

    for (let state_index = 0; state_index < graph.states.length; ++state_index) {
        const state_name = state_names !== undefined ? state_names.get(state_index) as number : state_index;
        const format_string = create_state_format(state_name, graph.states[state_index], production_rules);
        output.push(`  "state${state_name}" [ ${format_string} ];`);
    }

    for (const edge of graph.edges) {
        const is_shift = !is_terminal(edge.label, terminals);
        const format_string = create_edge_format(edge.label, is_shift);

        output.push(`  state${edge.from_state} -> state${edge.to_state} [ ${format_string} ];`);
    }

    output.push(`}`);

    const graphviz = output.join("\n");
    return graphviz;
}

export function create_small_graphviz(
    graph: { states: LR1_item[][], edges: Edge[] },
    production_rules: Production_rule[],
    terminals: string[],
    state_index_to_focus: number,
    neighboor_distance: number
): string {

    const smaller_graph: { states: LR1_item[][], edges: Edge[] } = {
        states: [],
        edges: []
    };

    const state_index_map = new Map<number, number>([]);
    const edge_index_map = new Map<number, number>([]);

    const add_new_state = (state_index: number): void => {
        if (!state_index_map.has(state_index)) {
            state_index_map.set(state_index, smaller_graph.states.length);
            smaller_graph.states.push(graph.states[state_index]);
        }
    };

    const add_new_edge = (edge_index: number): void => {
        if (!edge_index_map.has(edge_index)) {
            const edge = graph.edges[edge_index];
            edge_index_map.set(edge_index, smaller_graph.edges.length);
            smaller_graph.edges.push(edge);
        }
    };

    add_new_state(state_index_to_focus);

    const state_indices = new Set<number>([state_index_to_focus]);

    for (let iterations = 0; iterations < neighboor_distance; ++iterations) {

        const added_edges: Edge[] = [];

        for (let edge_index = 0; edge_index < graph.edges.length; ++edge_index) {
            const edge = graph.edges[edge_index];

            const has_from_state = state_indices.has(edge.from_state);
            const has_to_state = state_indices.has(edge.to_state);

            if (has_from_state || has_to_state) {
                if (!has_from_state) {
                    add_new_state(edge.from_state);
                }
                if (!has_to_state) {
                    add_new_state(edge.to_state);
                }
                add_new_edge(edge_index);

                added_edges.push(edge);
            }
        }

        for (const edge of added_edges) {
            if (!state_indices.has(edge.from_state)) {
                state_indices.add(edge.from_state);
            }
            if (!state_indices.has(edge.to_state)) {
                state_indices.add(edge.to_state);
            }
        }
    }

    const state_names = new Map<number, number>([]);
    state_index_map.forEach((value: number, key: number) => {
        state_names.set(value, key);
    });

    return create_graphviz(smaller_graph, production_rules, terminals, state_names);
}

export enum Action_type {
    Accept,
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
    production_rule_flags: Production_rule_flags;
}

export interface Reduce_action {
    production_rule_index: number;
    lhs: string;
    rhs_count: number;
    production_rule_flags: Production_rule_flags;
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

export interface Parsing_tables {
    action_table: Action_column[][];
    go_to_table: Go_to_column[][];
}

function create_action_description(
    label: string,
    action: Action,
    production_rules: Production_rule[]
): string {
    switch (action.type) {
        case Action_type.Accept: {
            const value = action.value as Accept_action;
            return `Accept: ${value.lhs}`;
        }
        case Action_type.Reduce: {
            const value = action.value as Reduce_action;
            const production_rule = production_rules[value.production_rule_index];
            const rhs_string = production_rule.rhs.join(" ");
            return `Reduce P#${value.production_rule_index}: ${value.lhs} -> ${rhs_string}`;
        }
        case Action_type.Shift: {
            const value = action.value as Shift_action;
            value.next_state;
            return `Shift: ${label} (to State #${value.next_state})`;
        }
    }
}

function create_ambiguous_grammar_message(
    state_index: number,
    new_conflicting_action: Action_column,
    action_row: Action_column[],
    production_rules: Production_rule[]
): string {

    const column_index = action_row.findIndex(value => value.label === new_conflicting_action.label);
    const table_action_column = action_row[column_index];

    const table_action_description = create_action_description(
        table_action_column.label,
        table_action_column.action,
        production_rules
    );

    const conflicting_action_description = create_action_description(
        new_conflicting_action.label,
        new_conflicting_action.action,
        production_rules
    );

    const message = `In State #${state_index}, undecided between '${table_action_description}' and '${conflicting_action_description}'`;
    return message;
}

function check_grammar_for_ambiguity(
    graph: { states: LR1_item[][], edges: Edge[] },
    production_rules: Production_rule[],
    terminals: string[],
    state_index: number,
    action_row: Action_column[],
    graphviz_output_path?: string
): void {
    const last_entry = action_row[action_row.length - 1];
    if (action_row.findIndex(value => value.label === last_entry.label) !== action_row.length - 1) {

        if (graphviz_output_path !== undefined) {
            const graphviz = create_small_graphviz(graph, production_rules, terminals, state_index, 2);
            fs.writeFileSync(graphviz_output_path, graphviz, { flag: "w" });
        }

        const message = create_ambiguous_grammar_message(state_index, action_row[action_row.length - 1], action_row, production_rules);
        onThrowError(message);
        throw Error(message);
    }
}

export function create_parsing_tables(production_rules: Production_rule[], terminals: string[], states: LR1_item[][], edges: Edge[], graphviz_output_path?: string): Parsing_tables {

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
                            rhs_count: production_rule.rhs.length,
                            production_rule_flags: production_rule.flags
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
                            rhs_count: production_rule.rhs.length,
                            production_rule_flags: production_rule.flags
                        }
                    }
                });
            }

            check_grammar_for_ambiguity({ states: states, edges: edges }, production_rules, terminals, state_index, action_row, graphviz_output_path);
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

            check_grammar_for_ambiguity({ states: states, edges: edges }, production_rules, terminals, edge.from_state, action_row, graphviz_output_path);
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

export interface Array_info {
    element_label: string;
    separator_label: string;
}

export function create_array_infos(production_rules: Production_rule[]): Map<string, Array_info> {
    const map = new Map<string, Array_info>();

    for (const production_rule of production_rules) {
        if (production_rule.flags & Production_rule_flags.Is_array) {
            const array_info: Array_info = {
                element_label: production_rule.rhs[0],
                separator_label: production_rule.rhs.length >= 3 ? production_rule.rhs[1] : ""
            };

            map.set(production_rule.lhs, array_info);
        }
    }

    return map;
}
