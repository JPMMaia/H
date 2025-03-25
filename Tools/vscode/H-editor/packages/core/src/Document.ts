import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_analysis from "../../core/src/Parse_tree_analysis";
import * as Parser_node from "./Parser_node";
import * as Tree_sitter_parser from "./Tree_sitter_parser";
import * as Validation from "./Validation";

export interface Text_range {
    start: number;
    end: number;
}

export interface Text_change {
    range: Text_range;
    text: string;
}

export interface Module_state {
    module: Core_intermediate_representation.Module;
    parse_tree: Parser_node.Node | undefined;
    tree_sitter_tree: Tree_sitter_parser.Tree | undefined;
    text: string;
}

export function clone_module_state(state: Module_state): Module_state {
    return JSON.parse(JSON.stringify(state));
}

export interface State {
    document_file_path: string;
    valid: Module_state;
    with_errors: Module_state | undefined;
    pending_text_changes: Text_change[];
    diagnostics: Validation.Diagnostic[];
}

export function get_module(state: State): Core_intermediate_representation.Module {
    return state.with_errors !== undefined ? state.with_errors.module : state.valid.module;
}

export function get_parse_tree(state: State): Parser_node.Node | undefined {
    return state.with_errors !== undefined ? state.with_errors.parse_tree : state.valid.parse_tree;
}

export function get_module_name(state: State): string {
    const parse_tree = get_parse_tree(state);
    const module_name = Parse_tree_analysis.get_module_name_from_tree(parse_tree);
    return module_name;
}

export function get_text(state: State): string {
    return state.with_errors !== undefined ? state.with_errors.text : state.valid.text;
}

export function create_empty_state(document_file_path: string): State {

    const module = Module_examples.create_empty();
    module.source_file_path = document_file_path;

    const parse_tree = undefined;
    const text = "";

    return {
        document_file_path: document_file_path,
        valid: {
            module: module,
            parse_tree: parse_tree,
            tree_sitter_tree: undefined,
            text: text,
        },
        with_errors: undefined,
        pending_text_changes: [],
        diagnostics: []
    };
}
