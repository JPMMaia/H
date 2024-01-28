import * as Default_grammar from "./Default_grammar";
import * as Grammar from "./Grammar";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";

export interface Description {
    production_rules: Grammar.Production_rule[];
    actions_table: Grammar.Action_column[][];
    go_to_table: Grammar.Go_to_column[][];
    array_infos: Map<string, Grammar.Array_info>;
    map_word_to_terminal: (word: Grammar.Word) => string;
    key_to_production_rule_indices: Map<string, number[]>;
    mappings: Parse_tree_convertor.Parse_tree_mappings;
}

export function create_description(
    grammar_description: string[],
    map_word_to_terminal: (word: Grammar.Word) => string
): Description {

    const production_rules = Grammar.create_production_rules(grammar_description);
    const non_terminals = Grammar.get_non_terminals(production_rules);
    const terminals = Grammar.get_terminals(production_rules, non_terminals);
    const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
    const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
    const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
    const array_infos = Grammar.create_array_infos(production_rules);
    const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(production_rules);
    const mappings = Parse_tree_convertor_mappings.create_mapping();

    return {
        production_rules: production_rules,
        actions_table: parsing_tables.action_table,
        go_to_table: parsing_tables.go_to_table,
        array_infos: array_infos,
        map_word_to_terminal,
        key_to_production_rule_indices,
        mappings
    };
}

export function create_default_description(): Description {

    const grammar_description = Default_grammar.create_description();

    const map_word_to_terminal = (word: Grammar.Word): string => {
        if (word.value === "enum" || word.value === "export" || word.value === "function" || word.value === "module" || word.value === "struct" || word.value === "using") {
            return word.value;
        }

        if (word.type === Grammar.Word_type.Alphanumeric) {
            return "identifier";
        }

        return word.value;
    };

    return create_description(grammar_description, map_word_to_terminal);
}
