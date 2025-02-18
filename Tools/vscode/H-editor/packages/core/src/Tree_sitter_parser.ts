import * as fs from "fs";
import * as web_tree_sitter from "web-tree-sitter";
import { onThrowError } from "./errors";

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

export async function create_parser(): Promise<web_tree_sitter.Parser> {
    await web_tree_sitter.Parser.init();
    const parser = new web_tree_sitter.Parser();

    const wasm_file_path = find_wasm_file_path();
    console.log(`Loading wasm language file from: ${wasm_file_path}`);

    const hlang_language = await web_tree_sitter.Language.load(wasm_file_path);
    parser.setLanguage(hlang_language);

    return parser;
}

export function parse(parser: web_tree_sitter.Parser, text: string): web_tree_sitter.Tree {
    const tree = parser.parse(text);
    return tree;
}
