import * as Default_grammar from "./Default_grammar";
import * as Grammar from "./Grammar";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Storage_cache from "./Storage_cache";

export interface Description {
    production_rules: Grammar.Production_rule[];
    actions_table: Grammar.Action_column[][];
    go_to_table: Grammar.Go_to_column[][];
    array_infos: Map<string, Grammar.Array_info>;
    map_word_to_terminal: (word: Grammar.Word) => string[];
    key_to_production_rule_indices: Map<string, number[]>;
    mappings: Parse_tree_convertor.Parse_tree_mappings;
    terminals: Set<string>;
}

function create_parsing_tables(
    production_rules: Grammar.Production_rule[],
    terminals: string[],
    cache?: Storage_cache.Storage_cache,
    graphviz_output_path?: string
): Grammar.Parsing_tables {

    if (cache !== undefined) {
        const parsing_tables_string = Storage_cache.read(cache, "parsing_tables", production_rules);
        if (parsing_tables_string !== undefined) {
            const parsing_tables = JSON.parse(parsing_tables_string) as Grammar.Parsing_tables;
            return parsing_tables;
        }
    }

    const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
    const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);

    const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges, graphviz_output_path);

    if (cache !== undefined) {
        const parsing_tables_string = JSON.stringify(parsing_tables);
        Storage_cache.write(cache, "parsing_tables", production_rules, parsing_tables_string);
    }

    return parsing_tables;
}

function is_non_keyword_terminal(label: string): boolean {
    switch (label) {
        case "boolean":
        case "comment":
        case "identifier":
        case "number":
        case "string":
            return true;
        default:
            return false;
    }
}

function delete_non_keyword_terminals(terminals_set: Set<string>): void {
    terminals_set.delete("boolean");
    terminals_set.delete("comment");
    terminals_set.delete("identifier");
    terminals_set.delete("number");
    terminals_set.delete("string");
}

export function is_keyword(language_description: Description, label: string): boolean {
    if (is_non_keyword_terminal(label)) {
        return false;
    }
    if (language_description.terminals.has(label)) {
        return true;
    }
    switch (label) {
        case "true":
        case "false": {
            return true;
        }
        default: {
            return false;
        }
    }
}

export function create_description(
    grammar_description: string[],
    map_word_to_terminal: (word: Grammar.Word) => string[],
    cache?: Storage_cache.Storage_cache,
    graphviz_output_path?: string
): Description {
    const production_rules = Grammar.create_production_rules(grammar_description);
    const non_terminals = Grammar.get_non_terminals(production_rules);
    const terminals = Grammar.get_terminals(production_rules, non_terminals);
    const parsing_tables = create_parsing_tables(production_rules, terminals, cache, graphviz_output_path);
    const array_infos = Grammar.create_array_infos(production_rules);
    const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(production_rules);
    const mappings = Parse_tree_convertor_mappings.create_mapping();

    const terminals_set = new Set<string>(terminals);

    return {
        production_rules: production_rules,
        actions_table: parsing_tables.action_table,
        go_to_table: parsing_tables.go_to_table,
        array_infos: array_infos,
        map_word_to_terminal,
        key_to_production_rule_indices,
        mappings,
        terminals: terminals_set
    };
}

export function create_default_description(
    cache?: Storage_cache.Storage_cache,
    graphviz_output_path?: string
): Description {

    const grammar_description = Default_grammar.create_description();
    const production_rules = Grammar.create_production_rules(grammar_description);
    const non_terminals = Grammar.get_non_terminals(production_rules);
    const terminals = Grammar.get_terminals(production_rules, non_terminals);
    const parsing_tables = create_parsing_tables(production_rules, terminals, cache, graphviz_output_path);
    const array_infos = Grammar.create_array_infos(production_rules);
    const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(production_rules);
    const mappings = Parse_tree_convertor_mappings.create_mapping();

    const terminals_set = new Set<string>(terminals);
    delete_non_keyword_terminals(terminals_set);

    const map_word_to_terminal = (word: Grammar.Word): string[] => {

        const possible_terminals: string[] = [];

        if (word.type === Grammar.Word_type.Comment) {
            possible_terminals.push("comment");
        }
        else if (word.type === Grammar.Word_type.String) {
            possible_terminals.push("string");
        }
        else if (word.type === Grammar.Word_type.Number) {
            possible_terminals.push("number");
        }
        else if (word.type === Grammar.Word_type.Alphanumeric && (word.value === "true" || word.value === "false")) {
            possible_terminals.push("boolean");
        }
        else if (terminals_set.has(word.value)) {
            possible_terminals.push(word.value);
        }

        if (can_be_identifier(word)) {
            possible_terminals.push("identifier");
        }
        else if (word.type === Grammar.Word_type.Symbol || word.type === Grammar.Word_type.Invalid) {
            possible_terminals.push(word.value);
        }

        return possible_terminals;
    };

    return {
        production_rules: production_rules,
        actions_table: parsing_tables.action_table,
        go_to_table: parsing_tables.go_to_table,
        array_infos: array_infos,
        map_word_to_terminal,
        key_to_production_rule_indices,
        mappings,
        terminals: new Set<string>(terminals)
    };
}

function can_be_identifier(word: Grammar.Word): boolean {

    if (word.type !== Grammar.Word_type.Alphanumeric) {
        return false;
    }

    switch (word.value) {
        case "export":
        case "function":
        case "enum":
        case "struct":
        case "union":
        case "as":
        case "break":
        case "case":
        case "continue":
        case "default":
        case "else":
        case "for":
        case "has":
        case "in":
        case "if":
        case "mutable":
        case "null":
        case "step_by":
        case "switch":
        case "return":
        case "var":
        case "while":
            return false;
        default:
            return true;
    }
}
