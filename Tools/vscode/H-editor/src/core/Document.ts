import * as Core from "../utilities/coreModelInterface";
import * as Grammar from "./Grammar";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Parser_node from "./Parser_node";
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

export function create_state_from_module(module: Core.Module, production_rules: Grammar.Production_rule[], production_rules_to_cache: number[]): State {

    const declarations = Parse_tree_convertor.create_declarations(module);
    const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, declarations, production_rules);
    const parse_tree_text_position_cache = Parse_tree_text_position_cache.create_cache();
    const text = Text_formatter.to_string(parse_tree, parse_tree_text_position_cache, production_rules_to_cache);

    return {
        module: module,
        parse_tree: parse_tree,
        declarations: declarations,
        parse_tree_text_position_cache: parse_tree_text_position_cache,
        text: text,
        pending_text_changes: []
    };
}
