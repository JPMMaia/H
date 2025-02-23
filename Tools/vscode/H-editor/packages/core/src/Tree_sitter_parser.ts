import * as Core from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";

import * as fs from "fs";
import * as web_tree_sitter from "web-tree-sitter";
import { onThrowError } from "./errors";

export type Parser = web_tree_sitter.Parser;
export type Tree = web_tree_sitter.Tree;
export type Node = web_tree_sitter.Node;

function find_wasm_file_path(): string {

    const working_directory = process.cwd();
    const candidate_directories = [
        `${working_directory}`,
        `${working_directory}/dist`,
    ];

    for (const directory of candidate_directories) {
        const wasm_file_path = `${directory}/tree-sitter-hlang.wasm`;
        if (fs.existsSync(wasm_file_path)) {
            return wasm_file_path;
        }
    }

    const message = "Could not find language wasm file!";
    onThrowError(message);
    throw new Error(message);
}

export async function create_parser(): Promise<Parser> {
    await web_tree_sitter.Parser.init();
    const parser = new web_tree_sitter.Parser();

    const wasm_file_path = find_wasm_file_path();
    console.log(`Loading wasm language file from: ${wasm_file_path}`);

    const hlang_language = await web_tree_sitter.Language.load(wasm_file_path);
    parser.setLanguage(hlang_language);

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
    const mappings = Parse_tree_convertor_mappings.create_mapping();
    return Parse_tree_convertor.parse_tree_to_module(root, mappings);
}
