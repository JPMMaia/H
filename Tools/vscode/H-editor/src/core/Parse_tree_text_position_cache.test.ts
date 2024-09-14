import "mocha";

import * as assert from "assert";
import * as Language from "./Language";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Scan_new_changes from "./Scan_new_changes";
import * as Storage_cache from "./Storage_cache";
import * as Text_change from "./Text_change";

function update_cache(
    cache: Parse_tree_text_position_cache.Cache,
    language_description: Language.Description,
    root: Parser_node.Node | undefined,
    original_text: string,
    text_change: Parse_tree_text_position_cache.Text_change
): void {

    const scanned_input_change = Scan_new_changes.scan_new_change(
        root,
        original_text,
        text_change.range.start,
        text_change.range.end,
        text_change.text
    );


    const start_change_node_position = (scanned_input_change.start_change !== undefined && scanned_input_change.start_change.node !== undefined) ? scanned_input_change.start_change.node_position : undefined;
    const after_change_node_position = (scanned_input_change.after_change !== undefined && scanned_input_change.after_change.node !== undefined) ? scanned_input_change.after_change.node_position : undefined;

    const parse_result = Parser.parse_incrementally(
        "",
        root,
        start_change_node_position,
        scanned_input_change.new_words,
        after_change_node_position,
        language_description.actions_table,
        language_description.go_to_table,
        language_description.array_infos,
        language_description.map_word_to_terminal
    );

    assert.equal(parse_result.status, Parser.Parse_status.Accept);

    const text_after_changes = Text_change.apply_text_changes(original_text, [text_change]);
    Parse_tree_text_position_cache.update_cache(cache, parse_result.changes, text_change, text_after_changes);
}

function find_declaration_node(
    root: Parser_node.Node,
    name: string
): { node: Parser_node.Node, position: number[] } {
    const descendant_name = Parser_node.find_descendant_position_if({ node: root, position: [] }, node => node.word.value === name) as { node: Parser_node.Node, position: number[] };
    const ancestor = Parser_node.get_ancestor_with_name(root, descendant_name.position, "Declaration") as { node: Parser_node.Node, position: number[] };
    return ancestor;
}

function find_node(
    root: Parser_node.Node,
    name: string
): { node: Parser_node.Node, position: number[] } {
    return Parser_node.find_descendant_position_if({ node: root, position: [] }, node => node.word.value === name) as { node: Parser_node.Node, position: number[] };
}

function test_get_node_text_position(
    cache: Parse_tree_text_position_cache.Cache,
    node_and_position: { node: Parser_node.Node, position: number[] },
    expected_text_position: Parse_tree_text_position_cache.Text_position
): void {
    const actual_text_position = Parse_tree_text_position_cache.get_node_text_position(cache, node_and_position.position);
    assert.deepEqual(actual_text_position, expected_text_position);
}

describe("Parse_tree_text_position_cache.get_node_text_position()", () => {
    const storage_cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const language = Language.create_default_description(storage_cache);

    const text = `module My_module;

function name_0() -> ()
{
}

function name_1() -> ()
{
}

struct name_2
{
    member_0: type_0;
    member_1: type_1;
}
`;

    const text_change: Parse_tree_text_position_cache.Text_change = {
        range: {
            start: 0,
            end: 0
        },
        text: text
    };

    const cache = Parse_tree_text_position_cache.create_empty_cache();
    update_cache(cache, language, undefined, "", text_change);

    it("Retrieves the correct node text position of 'module'", () => {
        test_get_node_text_position(cache, find_node(cache.root, "module"), { line: 1, column: 1, offset: 0 });
    });

    it("Retrieves the correct node text position of 'My_module'", () => {
        test_get_node_text_position(cache, find_node(cache.root, "My_module"), { line: 1, column: 8, offset: 7 });
    });

    it("Retrieves the correct node text position of 'name_0' declaration", () => {
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_0"), { line: 3, column: 1, offset: 19 });
    });

    it("Retrieves the correct node text position of 'name_0'", () => {
        test_get_node_text_position(cache, find_node(cache.root, "name_0"), { line: 3, column: 10, offset: 28 });
    });

    it("Retrieves the correct node text position of 'name_2' declaration", () => {
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_2"), { line: 11, column: 1, offset: 77 });
    });

    it("Retrieves the correct node text position of 'member_0'", () => {
        test_get_node_text_position(cache, find_node(cache.root, "member_0"), { line: 13, column: 5, offset: 97 });
    });
});
