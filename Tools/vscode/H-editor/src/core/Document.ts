import * as Core from "../utilities/coreModelInterface";
import * as Grammar from "./Grammar";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parser_node from "./Parser_node";
import * as Symbol_database from "./Symbol_database";
import * as Text_formatter from "./Text_formatter";

export interface State {
    module: Core.Module;
    symbol_database: Symbol_database.Edit_module_database;
    parse_tree: Parser_node.Node | undefined;
    declarations: Parse_tree_convertor.Declaration[];
    text: string;
}

export function create_empty_state(production_rules: Grammar.Production_rule[]): State {

    const module = Module_examples.create_empty();
    const symbol_database = Symbol_database.create_edit_database(module);
    const declarations = Parse_tree_convertor.create_declarations(module);
    const parse_tree = undefined;
    const text = "";

    return {
        module: module,
        symbol_database: symbol_database,
        parse_tree: parse_tree,
        declarations: declarations,
        text: text
    };
}

export function create_state_from_module(module: Core.Module, production_rules: Grammar.Production_rule[]): State {

    const symbol_database = Symbol_database.create_edit_database(module);
    const declarations = Parse_tree_convertor.create_declarations(module);
    const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, symbol_database, declarations, production_rules);
    const text = Text_formatter.to_string(parse_tree);

    return {
        module: module,
        symbol_database: symbol_database,
        parse_tree: parse_tree,
        declarations: declarations,
        text: text
    };
}
