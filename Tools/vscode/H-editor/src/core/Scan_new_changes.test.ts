import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import { Node, Text_position } from "./Parser_node";
import { get_node_before_text_position, get_node_after_text_position, get_text_before_start, get_text_after_end, scan_new_change } from "./Scan_new_changes";

function create_parse_node(value: string, text_position: Text_position, children: Node[], production_rule_index?: number): Node {
    return {
        word: { value: value, type: Grammar.Word_type.Alphanumeric },
        state: -1,
        production_rule_index: production_rule_index,
        children: children,
        text_position: text_position
    };
}

describe("Scan_new_changes.get_node_before_text_position", () => {
    it("Returns undefined if before first word", () => {

        const root = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const result = get_node_before_text_position(root, { line: 0, column: 0 });
        assert.equal(result, undefined);
    });

    it("Returns the node itself if in the middle of word", () => {

        const root = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const result = get_node_before_text_position(root, { line: 0, column: 1 });
        assert.notEqual(result, undefined);

        if (result !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.position, [0]);
        }
    });

    it("Returns the node itself if at the end of word", () => {

        const root = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const result = get_node_before_text_position(root, { line: 0, column: 6 });
        assert.notEqual(result, undefined);

        if (result !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.position, [0]);
        }
    });

    it("Returns the node before if in the middle of words", () => {

        const root = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, []),
                create_parse_node("Foo", { line: 0, column: 9 }, [])
            ]
        );

        const result = get_node_before_text_position(root, { line: 0, column: 8 });
        assert.notEqual(result, undefined);

        if (result !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.position, [0]);
        }
    });

    it("Returns the last node if after last word", () => {

        const root = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const result = get_node_before_text_position(root, { line: 0, column: 10 });
        assert.notEqual(result, undefined);

        if (result !== undefined) {
            assert.equal(result.node, root.children[0]);
            assert.deepEqual(result.position, [0]);
        }
    });
});

describe("Scan_new_changes.get_text_before_start", () => {
    it("Cuts the word", () => {
        const node = create_parse_node("module", { line: 0, column: 0 }, []);
        const value = get_text_before_start({ line: 0, column: 2 }, node);
        assert.equal(value, "mo");
    });

    it("Returns the whole word", () => {
        const node = create_parse_node("module", { line: 0, column: 0 }, []);
        const value = get_text_before_start({ line: 0, column: 6 }, node);
        assert.equal(value, "module");
    });

    it("Adds spaces at the end", () => {
        const node = create_parse_node("module", { line: 0, column: 0 }, []);
        const value = get_text_before_start({ line: 0, column: 9 }, node);
        assert.equal(value, "module   ");
    });
});

describe("Scan_new_changes.get_text_after_end", () => {
    it("Cuts the word", () => {
        const node = create_parse_node("module", { line: 0, column: 0 }, []);
        const value = get_text_after_end({ line: 0, column: 2 }, node);
        assert.equal(value, "dule");
    });

    it("Returns the whole word", () => {
        const node = create_parse_node("module", { line: 0, column: 0 }, []);
        const value = get_text_after_end({ line: 0, column: 0 }, node);
        assert.equal(value, "module");
    });

    it("Adds spaces at the start", () => {
        const node = create_parse_node("module", { line: 0, column: 3 }, []);
        const value = get_text_after_end({ line: 0, column: 0 }, node);
        assert.equal(value, "   module");
    });
});

describe("Scan_new_changes.scan_new_change", () => {
    it("Scans change 0", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("modul", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 5
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 5
        };

        const new_text = "e";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "module", type: Grammar.Word_type.Alphanumeric }]);
        assert.equal(result.after_change, undefined);
    });

    it("Scans change 1", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 2
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 2
        };

        const new_text = " ";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "mo", type: Grammar.Word_type.Alphanumeric }, { value: "dule", type: Grammar.Word_type.Alphanumeric }]);
        assert.equal(result.after_change, undefined);
    });

    it("Scans change 2", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 6
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 6
        };

        const new_text = " ";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.equal(result.start_change, undefined);
        assert.deepEqual(result.new_words, []);
        assert.equal(result.after_change, undefined);
    });

    it("Scans change 3", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 3
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 5
        };

        const new_text = "";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "mode", type: Grammar.Word_type.Alphanumeric }]);
        assert.equal(result.after_change, undefined);
    });

    it("Scans change 4", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 3
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 6
        };

        const new_text = "el";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "model", type: Grammar.Word_type.Alphanumeric }]);
        assert.equal(result.after_change, undefined);
    });

    it("Scans change 5", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, []),
                create_parse_node("name", { line: 0, column: 7 }, []),
                create_parse_node(";", { line: 0, column: 11 }, []),
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 8
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 9
        };

        const new_text = "o";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [1]);
        }
        assert.deepEqual(result.new_words, [{ value: "nome", type: Grammar.Word_type.Alphanumeric }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.position, [2]);
        }
    });

    it("Scans change 6", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, []),
                create_parse_node("name", { line: 0, column: 7 }, []),
                create_parse_node(";", { line: 0, column: 11 }, []),
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 6
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 7
        };

        const new_text = "";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "modulename", type: Grammar.Word_type.Alphanumeric }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.position, [2]);
        }
    });

    it("Scans change 7", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, []),
                create_parse_node("name", { line: 0, column: 7 }, []),
                create_parse_node(";", { line: 0, column: 11 }, []),
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 11
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 11
        };

        const new_text = "_";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [1]);
        }
        assert.deepEqual(result.new_words, [{ value: "name_", type: Grammar.Word_type.Alphanumeric }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.position, [2]);
        }
    });

    it("Scans change 8", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("Export", { line: 0, column: 0 }, [
                    create_parse_node("export", { line: 0, column: 0 }, [])
                ]),
                create_parse_node("struct", { line: 0, column: 7 }, [])
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 0
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 0
        };

        const new_text = "_";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [0, 0]);
        }
        assert.deepEqual(result.new_words, [{ value: "_export", type: Grammar.Word_type.Alphanumeric }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.position, [1]);
        }
    });

    it("Scans change 9", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("Export", { line: 0, column: 0 }, [], 0),
                create_parse_node("struct", { line: 0, column: 0 }, []),
                create_parse_node("Struct_name", { line: 0, column: 7 }, [
                    create_parse_node("name", { line: 0, column: 7 }, []),
                ], 1),
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 0
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 0
        };

        const new_text = "_";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [1]);
        }
        assert.deepEqual(result.new_words, [{ value: "_struct", type: Grammar.Word_type.Alphanumeric }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.position, [2, 0]);
        }
    });

    it("Scans change 10", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("Declaration_0", { line: 0, column: 0 }, []),
                create_parse_node("Declaration_1", { line: 2, column: 0 }, []),
            ]
        );

        const start_text_position: Text_position = {
            line: 1,
            column: 0
        };

        const end_text_position: Text_position = {
            line: 1,
            column: 0
        };

        const new_text = "Declaration_0_5";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [1]);
        }
        assert.deepEqual(result.new_words, [{ value: "Declaration_0_5", type: Grammar.Word_type.Alphanumeric }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.position, [1]);
        }
    });

    it("Scans change 11", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 5 }, [])
            ]
        );

        const start_text_position: Text_position = {
            line: 0,
            column: 1
        };

        const end_text_position: Text_position = {
            line: 0,
            column: 1
        };

        const new_text = "another";

        const result = scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.notEqual(result.start_change, undefined);
        if (result.start_change !== undefined) {
            assert.deepEqual(result.start_change.position, [0]);
        }
        assert.deepEqual(result.new_words, [{ value: "another", type: Grammar.Word_type.Alphanumeric }]);
        assert.notEqual(result.after_change, undefined);
        if (result.after_change !== undefined) {
            assert.deepEqual(result.after_change.position, [0]);
        }
    });
});