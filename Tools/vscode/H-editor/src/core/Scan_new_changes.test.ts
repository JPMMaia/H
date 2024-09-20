import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import { Node } from "./Parser_node";
import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";
import { get_node_before_text_position, get_node_after_text_position, get_text_before_start, get_text_after_end, scan_new_change } from "./Scan_new_changes";

function create_parse_node(value: string, children: Node[], production_rule_index?: number): Node {
    return {
        word: { value: value, type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 0, column: 0 } },
        state: -1,
        production_rule_index: production_rule_index,
        children: children
    };
}

describe("Scan_new_changes.get_node_before_text_position", () => {
    it("Returns undefined if before first word", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const result = get_node_before_text_position(root, text, 0);
        assert.equal(result, undefined);
    });

    it("Returns the node itself if in the middle of word", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const result = get_node_before_text_position(root, text, 1);
        assert.notEqual(result, undefined);

        if (result !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.node_position, [0]);
        }
    });

    it("Returns the node itself if at the end of word", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const result = get_node_before_text_position(root, text, 6);
        assert.notEqual(result, undefined);

        if (result !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.node_position, [0]);
        }
    });

    it("Returns the node before if in the middle of words", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", []),
                create_parse_node("Foo", [])
            ]
        );
        const text = "module   Foo";

        const result = get_node_before_text_position(root, text, 8);
        assert.notEqual(result, undefined);

        if (result !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.node_position, [0]);
        }
    });

    it("Returns the last node if after last word", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const result = get_node_before_text_position(root, text, 10);
        assert.notEqual(result, undefined);

        if (result !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.node_position, [0]);
        }
    });
});

describe("Scan_new_changes.get_node_after_text_position", () => {
    it("Returns undefined if after last word", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const result = get_node_after_text_position(root, text, 6);
        assert.equal(result.node, undefined);
    });

    it("Returns the node itself if in the middle of word", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const result = get_node_after_text_position(root, text, 1);
        assert.notEqual(result.node, undefined);

        if (result.node !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.node_position, [0]);
        }
    });

    it("Returns the node itself if at the start of word", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const result = get_node_after_text_position(root, text, 0);
        assert.notEqual(result.node, undefined);

        if (result.node !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.node_position, [0]);
        }
    });

    it("Returns the node after if in the middle of words", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", []),
                create_parse_node("Foo", [])
            ]
        );
        const text = "module   Foo";

        const result = get_node_after_text_position(root, text, 8);
        assert.notEqual(result.node, undefined);

        if (result.node !== undefined) {
            assert.equal(result.node, root.children[1]);
            assert.deepEqual(result.node_position, [1]);
        }
    });

    it("Returns the first node if before first word", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "     module";

        const result = get_node_after_text_position(root, text, 2);
        assert.notEqual(result.node, undefined);

        if (result.node !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.node_position, [0]);
        }
    });

    it("Returns the correct node in a deep hierarchy", () => {

        const root = create_parse_node(
            "S",
            [
                create_parse_node("Head", [
                    create_parse_node("module", []),
                    create_parse_node("name", []),
                    create_parse_node(";", []),
                ]),
                create_parse_node("Body", [
                    create_parse_node("export", []),
                ])
            ]
        );
        const text = "module name;\nexport";

        const result = get_node_after_text_position(root, text, 11);
        assert.notEqual(result.node, undefined);

        if (result.node !== undefined) {
            assert.equal(result.node, root.children[0].children[2]);
            assert.deepEqual(result.node_position, [0, 2]);
        }
    });
});

describe("Scan_new_changes.get_text_before_start", () => {
    it("Cuts the word", () => {
        const node = create_parse_node("module", []);
        const text = "module";
        const iterator = Parse_tree_text_iterator.begin(node, text);
        const value = get_text_before_start(text, 2, iterator);
        assert.equal(value, "mo");
    });

    it("Returns the whole word", () => {
        const node = create_parse_node("module", []);
        const text = "module";
        const iterator = Parse_tree_text_iterator.begin(node, text);
        const value = get_text_before_start(text, 6, iterator);
        assert.equal(value, "module");
    });

    it("Includes ending text", () => {
        const node = create_parse_node("module", []);
        const text = "module\n \n \n";
        const iterator = Parse_tree_text_iterator.begin(node, text);
        const value = get_text_before_start(text, 9, iterator);
        assert.equal(value, "module\n \n");
    });
});

describe("Scan_new_changes.get_text_after_end", () => {
    it("Cuts the word", () => {
        const node = create_parse_node("module", []);
        const text = "module";
        const iterator = Parse_tree_text_iterator.begin(node, text);
        const value = get_text_after_end(2, iterator);
        assert.equal(value, "dule");
    });

    it("Returns the whole word", () => {
        const node = create_parse_node("module", []);
        const text = "module";
        const iterator = Parse_tree_text_iterator.begin(node, text);
        const value = get_text_after_end(0, iterator);
        assert.equal(value, "module");
    });

    it("Adds space at the start", () => {
        const node = create_parse_node("module", []);
        const text = "   module";
        const iterator = Parse_tree_text_iterator.begin(node, text);
        const value = get_text_after_end(0, iterator);
        assert.equal(value, " module");
    });
});

describe("Scan_new_changes.scan_new_change", () => {
    it("Scans change 0", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("modul", [])
            ]
        );
        const text = "modul";

        const start_text_offset = 5;
        const end_text_offset = 5;

        const new_text = "e";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "module", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 1 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.equal(result.after_change.node, undefined);
        }
    });

    it("Scans change 1", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const start_text_offset = 2;
        const end_text_offset = 2;

        const new_text = " ";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "mo", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 1 } }, { value: "dule", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 4 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.equal(result.after_change.node, undefined);
        }
    });

    it("Scans change 2", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const start_text_offset = 6;
        const end_text_offset = 6;

        const new_text = " ";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.equal(result.start_change.node, undefined);
        }
        assert.deepEqual(result.new_words, []);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.equal(result.after_change.node, undefined);
        }
    });

    it("Scans change 3", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const start_text_offset = 3;
        const end_text_offset = 5;

        const new_text = "";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "mode", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 1 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.equal(result.after_change.node, undefined);
        }
    });

    it("Scans change 4", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const start_text_offset = 3;
        const end_text_offset = 6;

        const new_text = "el";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "model", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 1 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.equal(result.after_change.node, undefined);
        }
    });

    it("Scans change 5", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", []),
                create_parse_node("name", []),
                create_parse_node(";", []),
            ]
        );
        const text = "module name;";

        const start_text_offset = 8;
        const end_text_offset = 9;

        const new_text = "o";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [1]);
        }
        assert.deepEqual(result.new_words, [{ value: "nome", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 8 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, [2]);
        }
    });

    it("Scans change 6", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", []),
                create_parse_node("name", []),
                create_parse_node(";", []),
            ]
        );
        const text = "module name;";

        const start_text_offset = 6;
        const end_text_offset = 7;

        const new_text = "";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "modulename", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 1 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, [2]);
        }
    });

    it("Scans change 7", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", []),
                create_parse_node("name", []),
                create_parse_node(";", []),
            ]
        );
        const text = "module name;";

        const start_text_offset = 11;
        const end_text_offset = 11;

        const new_text = "_";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [1]);
        }
        assert.deepEqual(result.new_words, [{ value: "name_", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 8 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, [2]);
        }
    });

    it("Scans change 8", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("Export", [
                    create_parse_node("export", [])
                ]),
                create_parse_node("struct", [])
            ]
        );
        const text = "export struct";

        const start_text_offset = 0;
        const end_text_offset = 0;

        const new_text = "_";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0, 0]);
        }
        assert.deepEqual(result.new_words, [{ value: "_export", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 1 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, [1]);
        }
    });

    it("Scans change 9", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("Export", [], 0),
                create_parse_node("struct", []),
                create_parse_node("Struct_name", [
                    create_parse_node("name", []),
                ], 1),
            ]
        );
        const text = "struct name";

        const start_text_offset = 0;
        const end_text_offset = 0;

        const new_text = "_";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [1]);
        }
        assert.deepEqual(result.new_words, [{ value: "_struct", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 1 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, [2, 0]);
        }
    });

    it("Scans change 10", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("Declaration_0", []),
                create_parse_node("Declaration_1", []),
            ]
        );
        const text = "Declaration_0\n\nDeclaration_1";

        const start_text_offset = 14;
        const end_text_offset = 14;

        const new_text = "Declaration_0_5";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [1]);
        }
        assert.deepEqual(result.new_words, [{ value: "Declaration_0_5", type: Grammar.Word_type.Alphanumeric, newlines_after: 1, source_location: { line: 2, column: 1 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, [1]);
        }
    });

    it("Scans change 11", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "     module";

        const start_text_offset = 1;
        const end_text_offset = 1;

        const new_text = "another";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "another", type: Grammar.Word_type.Alphanumeric, newlines_after: 0, source_location: { line: 1, column: 2 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, [0]);
        }
    });

    it("Scans change 12", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "     module";

        const start_text_offset = 0;
        const end_text_offset = 11;

        const new_text = "";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0]);
        }
        assert.deepEqual(result.new_words, []);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, []);
            assert.deepEqual(result.after_change.offset, 11);
        }
    });

    it("Scans change with comments", () => {

        const parse_tree = create_parse_node(
            "S",
            [
                create_parse_node("module", [])
            ]
        );
        const text = "module";

        const start_text_offset = 0;
        const end_text_offset = 0;

        const new_text = "// A comment\n// Another comment\n";

        const result = scan_new_change(
            parse_tree,
            text,
            start_text_offset,
            end_text_offset,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.node_position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "// A comment\n// Another comment", type: Grammar.Word_type.Comment, newlines_after: 1, source_location: { line: 1, column: 1 } }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.node_position, [0]);
        }
    });
});