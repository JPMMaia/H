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

    if (root !== undefined) {
        if (Parser.is_replacing_root(parse_result.changes)) {
            const modify_change = parse_result.changes[0].value as Parser.Modify_change;
            root = modify_change.new_node;
            cache.root = root;
        }
        else {
            Parser.apply_changes(root, [], parse_result.changes);
        }
    }

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

interface Line_and_column {
    line: number;
    column: number
}

function calculate_offset(text: string, target_line: number, target_column: number): number {

    let current_line = 1;
    let current_column = 1;
    let current_offset = 0;

    for (let index = 0; index < text.length; index++) {
        if (current_line === target_line && current_column === target_column) {
            return current_offset;
        }

        const character = text.charAt(index);
        if (character === "\n") {
            current_line += 1;
            current_column = 1;
        } else {
            current_column += 1;
        }
        current_offset += 1;
    }

    return current_offset;
}

function calculate_text_range(text: string, start_line: number, start_column: number, end_line: number, end_column: number): Text_change.Text_range {
    const start_offset = calculate_offset(text, start_line, start_column);
    const end_offset = calculate_offset(text, end_line, end_column);
    return {
        start: start_offset,
        end: end_offset
    };
}

function create_initial_cache(
    language_description: Language.Description,
    text: string
): Parse_tree_text_position_cache.Cache {

    const text_change: Parse_tree_text_position_cache.Text_change = {
        range: calculate_text_range(text, 1, 1, 1, 1),
        text: text
    };

    const cache = Parse_tree_text_position_cache.create_empty_cache();
    update_cache(cache, language_description, undefined, "", text_change);

    return cache;
}

function test_get_node_text_position(
    cache: Parse_tree_text_position_cache.Cache,
    node_and_position: { node: Parser_node.Node, position: number[] },
    expected_line_and_column: Line_and_column
): void {
    const expected_text_position: Parse_tree_text_position_cache.Text_position = {
        line: expected_line_and_column.line,
        column: expected_line_and_column.column,
        offset: calculate_offset(cache.text, expected_line_and_column.line, expected_line_and_column.column)
    };
    const actual_text_position = Parse_tree_text_position_cache.get_node_text_position(cache, node_and_position.position);
    assert.deepEqual(actual_text_position, expected_text_position);
}

describe("Parse_tree_text_position_cache.get_node_text_position", async () => {
    const storage_cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const language = await Language.create_default_description(storage_cache);

    const text = `// A comment
// describing the module.
module My_module;

// Another comment
// describing the function.
function name_0() -> ()
{
    // A comment
    // inside the function.
}

function name_1() -> ()
{
}

// Another comment
// describing the struct.
struct name_2
{
    member_0: type_0;
    member_1: type_1;
}
`;

    it("Retrieves the correct node text position of 'module'", () => {
        const cache = create_initial_cache(language, text);
        test_get_node_text_position(cache, find_node(cache.root, "module"), { line: 3, column: 1 });
    });

    it("Retrieves the correct node text position of 'My_module'", () => {
        const cache = create_initial_cache(language, text);
        test_get_node_text_position(cache, find_node(cache.root, "My_module"), { line: 3, column: 8 });
    });

    it("Retrieves the correct node text position of 'name_0' declaration", () => {
        const cache = create_initial_cache(language, text);
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_0"), { line: 5, column: 1 });
    });

    it("Retrieves the correct node text position of 'name_0'", () => {
        const cache = create_initial_cache(language, text);
        test_get_node_text_position(cache, find_node(cache.root, "name_0"), { line: 7, column: 10 });
    });

    it("Retrieves the correct node text position of 'name_2' declaration", () => {
        const cache = create_initial_cache(language, text);
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_2"), { line: 17, column: 1 });
    });

    it("Retrieves the correct node text position of 'member_0'", () => {
        const cache = create_initial_cache(language, text);
        test_get_node_text_position(cache, find_node(cache.root, "member_0"), { line: 21, column: 5 });
    });

    it("Retrieves the correct node text position after incremental change 0", () => {
        const cache = create_initial_cache(language, text);

        const incremental_text_change: Parse_tree_text_position_cache.Text_change = {
            range: calculate_text_range(text, 1, 1, 1, 1),
            text: "// One more comment\n"
        };
        update_cache(cache, language, cache.root, cache.text, incremental_text_change);

        test_get_node_text_position(cache, find_node(cache.root, "module"), { line: 4, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "My_module"), { line: 4, column: 8 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_0"), { line: 6, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "name_0"), { line: 8, column: 10 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_2"), { line: 18, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "member_0"), { line: 22, column: 5 });
    });

    it("Retrieves the correct node text position after incremental change 1", () => {
        const cache = create_initial_cache(language, text);

        const incremental_text_change: Parse_tree_text_position_cache.Text_change = {
            range: calculate_text_range(text, 13, 1, 13, 1),
            text: "function name_3() -> ()\n{\n}\n\n"
        };
        update_cache(cache, language, cache.root, cache.text, incremental_text_change);

        test_get_node_text_position(cache, find_node(cache.root, "module"), { line: 3, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "My_module"), { line: 3, column: 8 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_0"), { line: 5, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "name_0"), { line: 7, column: 10 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_3"), { line: 13, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "name_3"), { line: 13, column: 10 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_2"), { line: 21, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "member_0"), { line: 25, column: 5 });
    });

    it("Retrieves the correct node text position after incremental change 2", () => {
        const cache = create_initial_cache(language, text);

        const incremental_text_change: Parse_tree_text_position_cache.Text_change = {
            range: calculate_text_range(text, 5, 1, 13, 1),
            text: ""
        };
        update_cache(cache, language, cache.root, cache.text, incremental_text_change);

        test_get_node_text_position(cache, find_node(cache.root, "module"), { line: 3, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "My_module"), { line: 3, column: 8 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_1"), { line: 5, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "name_1"), { line: 5, column: 10 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_2"), { line: 9, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "member_0"), { line: 13, column: 5 });
    });

    it("Retrieves the correct node text position after incremental change 3", () => {
        const cache = create_initial_cache(language, text);

        const incremental_text_change: Parse_tree_text_position_cache.Text_change = {
            range: calculate_text_range(text, 7, 10, 7, 16),
            text: "name_4"
        };
        update_cache(cache, language, cache.root, cache.text, incremental_text_change);

        test_get_node_text_position(cache, find_node(cache.root, "module"), { line: 3, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "My_module"), { line: 3, column: 8 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_4"), { line: 5, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "name_4"), { line: 7, column: 10 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_2"), { line: 17, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "member_0"), { line: 21, column: 5 });
    });

    it("Retrieves the correct node text position after incremental change 4", () => {
        const cache = create_initial_cache(language, text);

        const incremental_text_change: Parse_tree_text_position_cache.Text_change = {
            range: calculate_text_range(text, 5, 1, 5, 1),
            text: "function name_3() -> ()\n{\n}\n\n"
        };
        update_cache(cache, language, cache.root, cache.text, incremental_text_change);

        test_get_node_text_position(cache, find_node(cache.root, "module"), { line: 3, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "My_module"), { line: 3, column: 8 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_3"), { line: 5, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "name_3"), { line: 5, column: 10 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_0"), { line: 9, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "name_0"), { line: 11, column: 10 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_2"), { line: 21, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "member_0"), { line: 25, column: 5 });
    });

    it("Retrieves the correct node text position after incremental change 5", () => {
        const cache = create_initial_cache(language, text);

        const incremental_text_change: Parse_tree_text_position_cache.Text_change = {
            range: calculate_text_range(text, 5, 1, 24, 1),
            text: "function name_0() -> ()\n{\n}\n\n"
        };
        update_cache(cache, language, cache.root, cache.text, incremental_text_change);

        assert.equal(cache.elements.length, 2);

        test_get_node_text_position(cache, find_node(cache.root, "module"), { line: 3, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "My_module"), { line: 3, column: 8 });
        test_get_node_text_position(cache, find_declaration_node(cache.root, "name_0"), { line: 5, column: 1 });
        test_get_node_text_position(cache, find_node(cache.root, "name_0"), { line: 5, column: 10 });
    });
});
