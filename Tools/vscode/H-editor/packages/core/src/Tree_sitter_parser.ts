import * as Core from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";

import * as Tree_sitter_parser from "tree-sitter";
import * as Tree_sitter_hlang from "tree-sitter-hlang";

export type Parser = Tree_sitter_parser;
export type Tree = Tree_sitter_parser.Tree;
export type Node = Tree_sitter_parser.SyntaxNode;

const g_debug = false;

export async function create_parser(): Promise<Parser> {
    const parser = new Tree_sitter_parser();
    parser.setLanguage(Tree_sitter_hlang as Tree_sitter_parser.Language);
    return parser;
}

export function parse(parser: Parser, text: string): Tree {
    const tree = parser.parse(text);
    return tree;
}

function get_scanned_word(node: Node): Scanner.Scanned_word {

    const source_location = {
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1,
    };

    if (node.childCount > 0) {
        return {
            value: node.grammarType,
            type: Grammar.Word_type.Symbol,
            source_location: source_location
        };
    }

    const word_type = Scanner.get_word_type(node.text);

    return {
        value: node.text,
        type: word_type,
        source_location: source_location,
    };
}

export function to_parser_node(node: Node, add_source_location = true): Parser_node.Node {

    const children = node.children.map(child => to_parser_node(child, add_source_location));

    const scanned_word = get_scanned_word(node);

    return {
        word: scanned_word,
        state: node.parseState,
        production_rule_index: scanned_word.type === Grammar.Word_type.Symbol ? node.grammarId : undefined,
        children: children,
        source_range: add_source_location ? {
            start: {
                line: node.startPosition.row + 1,
                column: node.startPosition.column + 1,
            },
            end: {
                line: node.endPosition.row + 1,
                column: node.endPosition.column + 1,
            }
        } : undefined
    };
}

export function to_core_module(root: Parser_node.Node): Core.Module {
    const core_module = Parse_tree_convertor_mappings.node_to_module(root);
    Parse_tree_convertor.update_import_module_usages(core_module);
    return core_module;
}

export function get_lookaheads(parser: Parser, tree: Tree, source_location: { line: number, column: number }): string[] {
    const cursor = tree.walk();

    if (contains_source_location(cursor.startPosition, cursor.endPosition, source_location)) {
        return get_lookaheads_of_iterator(parser, cursor, source_location);
    }

    return [];
}

function get_lookaheads_of_iterator(parser: Parser, cursor: Tree_sitter_parser.TreeCursor, source_location: { line: number, column: number }): string[] {

    //cursor = cursor.copy();

    const goal_position: { row: number, column: number } = {
        row: source_location.line,
        column: source_location.column
    };

    /*let target_node = cursor.currentNode;
    while (cursor.gotoFirstChildForPosition(goal_position)) {
        target_node = cursor.currentNode;
    }*/

    const went_to_first_child = cursor.gotoFirstChild();
    if (went_to_first_child) {

        if (g_debug) {
            console.log(cursor.currentNode.grammarType);
        }

        if (contains_source_location(cursor.startPosition, cursor.endPosition, source_location)) {
            return get_lookaheads_of_iterator(parser, cursor, source_location);
        }

        let went_to_next_sibling = cursor.gotoNextSibling();
        while (went_to_next_sibling) {

            if (g_debug) {
                console.log(cursor.currentNode.grammarType);
            }

            if (contains_source_location(cursor.startPosition, cursor.endPosition, source_location)) {
                return get_lookaheads_of_iterator(parser, cursor, source_location);
            }

            went_to_next_sibling = cursor.gotoNextSibling();
        }
    }

    const target_leaf_node = cursor.currentNode;
    const target_parent_node = target_leaf_node.parent;
    const next_leaf_or_missing_node = get_next_leaf_or_missing_node(target_leaf_node);

    const lookaheads: string[] = [];

    if (is_valid_state(target_leaf_node.nextParseState)) {
        lookaheads.push(...get_lookaheads_from_node(parser, target_leaf_node.nextParseState));
    }
    else if (is_valid_state(target_parent_node.nextParseState)) {
        lookaheads.push(...get_lookaheads_from_node(parser, target_parent_node.nextParseState));
    }
    else {
        lookaheads.push("Identifier");
    }

    if (next_leaf_or_missing_node !== null && next_leaf_or_missing_node.isMissing) {
        lookaheads.push(next_leaf_or_missing_node.grammarType);
    }

    return lookaheads;
}

function get_next_leaf_or_missing_node(node: Node): Node | null {

    let current_node = node;

    while (current_node.childCount > 0) {
        current_node = current_node.children[0];
        if (current_node.childCount === 0 || current_node.isMissing) {
            return current_node;
        }
    }

    const next_sibling = get_next_sibling_node(current_node);
    if (next_sibling !== null) {
        if (next_sibling.childCount === 0 || current_node.isMissing) {
            return next_sibling;
        }

        return get_next_leaf_or_missing_node(next_sibling);
    }

    current_node = current_node.parent;
    while (true) {
        if (current_node === null) {
            return null;
        }

        const next_sibling = get_next_sibling_node(current_node);
        if (next_sibling !== null) {
            if (next_sibling.childCount === 0 || next_sibling.isMissing) {
                return next_sibling;
            }

            return get_next_leaf_or_missing_node(next_sibling);
        }

        current_node = current_node.parent;
    }
}

function get_next_sibling_node(node: Node): Node | null {
    if (node.parent === null) {
        return null;
    }

    const child_id = node.id;
    const child_index = node.parent.children.findIndex(child => child.id === child_id);
    if (child_index !== -1 && child_index + 1 < node.parent.childCount) {
        const next_sibling = node.parent.children[child_index + 1];
        return next_sibling;
    }

    return null;
}

function is_valid_state(state: number): boolean {
    return state !== 0 && state !== 65535;
}

function get_lookaheads_from_node(parser: Parser, parse_state: number): string[] {

    if (!is_valid_state(parse_state)) {
        return [];
    }

    const lookaheads: string[] = [];

    const lookahead_iterator = new Tree_sitter_parser.LookaheadIterator(parser.getLanguage(), parse_state);
    if (lookahead_iterator !== null) {
        for (const lookahead of lookahead_iterator) {
            lookaheads.push(lookahead);
        }
    }

    return lookaheads;
}

function contains_source_location(start_position: Tree_sitter_parser.Point, end_position: Tree_sitter_parser.Point, source_location: { line: number, column: number }): boolean {

    const converted_source_location: { line: number, column: number } = {
        line: source_location.line - 1,
        column: source_location.column - 1
    };

    if ((start_position.row < converted_source_location.line) || (start_position.row === converted_source_location.line && start_position.column <= converted_source_location.column)) {
        if ((converted_source_location.line < end_position.row) || (converted_source_location.line === end_position.row && converted_source_location.column < end_position.column)) {
            return true;
        }
    }

    return false;
}
