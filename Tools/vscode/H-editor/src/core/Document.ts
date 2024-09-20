import * as Core from "./Core_interface";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
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
import * as Validation from "./Validation";

export interface Text_range {
    start: number;
    end: number;
}

export interface Text_change {
    range: Text_range;
    text: string;
}

export interface State {
    document_file_path: string;
    module: Core_intermediate_representation.Module;
    parse_tree: Parser_node.Node | undefined;
    parse_tree_text_position_cache: Parse_tree_text_position_cache.Cache;
    text: string;
    pending_text_changes: Text_change[];
    diagnostics: Validation.Diagnostic[];
}

export function create_empty_state(document_file_path: string, production_rules: Grammar.Production_rule[]): State {

    const module = Module_examples.create_empty();
    module.source_file_path = document_file_path;

    const parse_tree = undefined;
    const text = "";
    const parse_tree_text_position_cache = Parse_tree_text_position_cache.create_empty_cache();


    return {
        document_file_path: document_file_path,
        module: module,
        parse_tree: parse_tree,
        parse_tree_text_position_cache: parse_tree_text_position_cache,
        text: text,
        pending_text_changes: [],
        diagnostics: []
    };
}

export function create_state_from_module(document_file_path: string, core_module: Core.Module, language_description: Language.Description, production_rules_to_cache: number[]): State {

    const module = Core_intermediate_representation.create_intermediate_representation(core_module);
    module.source_file_path = document_file_path;

    const mappings = Parse_tree_convertor_mappings.create_mapping();
    const parse_tree_without_state = Parse_tree_convertor.module_to_parse_tree(module, language_description.production_rules, mappings);
    const text = Text_formatter.to_string(parse_tree_without_state, Parse_tree_text_position_cache.create_empty_cache(), production_rules_to_cache);
    const scanned_words = Scanner.scan(text, 0, text.length, { line: 1, column: 1 });
    const parse_tree = Parser.parse(document_file_path, scanned_words, language_description.actions_table, language_description.go_to_table, language_description.array_infos, language_description.map_word_to_terminal).parse_tree;
    const parse_tree_text_position_cache = parse_tree !== undefined ? Parse_tree_text_position_cache.create_cache(parse_tree, text) : Parse_tree_text_position_cache.create_empty_cache();

    return {
        document_file_path: document_file_path,
        module: module,
        parse_tree: parse_tree,
        parse_tree_text_position_cache: parse_tree_text_position_cache,
        text: text,
        pending_text_changes: [],
        diagnostics: []
    };
}
