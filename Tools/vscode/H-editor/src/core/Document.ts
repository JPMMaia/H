import * as Core from "./Core_interface";
import * as Grammar from "./Grammar";
import * as Language from "./Language";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import * as Text_formatter from "./Text_formatter";

export interface Text_range {
    start: number;
    end: number;
}

export interface Text_change {
    range: Text_range;
    text: string;
}

export interface State {
    module: Core.Module;
    parse_tree: Parser_node.Node | undefined;
    declarations: Parse_tree_convertor.Declaration[];
    parse_tree_text_position_cache: Parse_tree_text_position_cache.Cache | undefined;
    text: string;
    pending_text_changes: Text_change[];
}

export function create_empty_state(production_rules: Grammar.Production_rule[]): State {

    const module = Module_examples.create_empty();
    const declarations = Parse_tree_convertor.create_declarations(module);
    const parse_tree = undefined;
    const text = "";
    const parse_tree_text_position_cache = undefined;

    return {
        module: module,
        parse_tree: parse_tree,
        declarations: declarations,
        parse_tree_text_position_cache: parse_tree_text_position_cache,
        text: text,
        pending_text_changes: []
    };
}

export function create_state_from_module(module: Core.Module, language_description: Language.Description, production_rules_to_cache: number[]): State {

    const declarations = Parse_tree_convertor.create_declarations(module);
    const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(language_description.production_rules);
    const mappings = Parse_tree_convertor_mappings.create_mapping(key_to_production_rule_indices);
    const parse_tree_without_state = Parse_tree_convertor.module_to_parse_tree(module, declarations, language_description.production_rules, mappings);
    const parse_tree_text_position_cache = Parse_tree_text_position_cache.create_cache();
    const text = Text_formatter.to_string(parse_tree_without_state, parse_tree_text_position_cache, production_rules_to_cache);
    const scanned_words = Scanner.scan(text, 0, text.length);
    const parse_tree = Parser.parse(scanned_words, language_description.actions_table, language_description.go_to_table, language_description.array_infos, language_description.map_word_to_terminal);

    return {
        module: module,
        parse_tree: parse_tree,
        declarations: declarations,
        parse_tree_text_position_cache: parse_tree_text_position_cache,
        text: text,
        pending_text_changes: []
    };
}
