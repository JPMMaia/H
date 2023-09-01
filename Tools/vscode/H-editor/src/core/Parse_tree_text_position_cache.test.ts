import "mocha";

import * as assert from "assert";
import * as Grammar from "./Grammar";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";

function create_parse_node(value: string, production_rule_index: number | undefined, children: Parser_node.Node[]): Parser_node.Node {
    return {
        word: { value: value, type: Grammar.Word_type.Alphanumeric },
        state: -1,
        production_rule_index: production_rule_index,
        children: children
    };
}

function create_test_parse_tree(): Parser_node.Node {
    const root = create_parse_node(
        "S", 0,
        [
            create_parse_node("Declaration", 1, [
                create_parse_node("Function", 2, [
                    create_parse_node("Function_declaration", 3, [
                        create_parse_node("function", undefined, []),
                        create_parse_node("name_0", undefined, []),
                        create_parse_node("(", undefined, []),
                        create_parse_node(")", undefined, []),
                        create_parse_node("->", undefined, []),
                        create_parse_node("(", undefined, []),
                        create_parse_node(")", undefined, []),
                    ]),
                    create_parse_node("Function_definition", 4, [
                        create_parse_node("{", undefined, []),
                        create_parse_node("}", undefined, []),
                    ]),
                ]),
            ]),
            create_parse_node("Declaration", 1, [
                create_parse_node("Function", 2, [
                    create_parse_node("Function_declaration", 3, [
                        create_parse_node("function", undefined, []),
                        create_parse_node("name_1", undefined, []),
                        create_parse_node("(", undefined, []),
                        create_parse_node(")", undefined, []),
                        create_parse_node("->", undefined, []),
                        create_parse_node("(", undefined, []),
                        create_parse_node(")", undefined, []),
                    ]),
                    create_parse_node("Function_definition", 4, [
                        create_parse_node("{", undefined, []),
                        create_parse_node("}", undefined, []),
                    ]),
                ]),
            ]),
            create_parse_node("Declaration", 1, [
                create_parse_node("Struct_declaration", 5, [
                    create_parse_node("struct", undefined, []),
                    create_parse_node("name_2", undefined, []),
                    create_parse_node("{", undefined, []),
                    create_parse_node("Members", 6, [
                        create_parse_node("Member", 7, [
                            create_parse_node("member_0", undefined, []),
                            create_parse_node(":", undefined, []),
                            create_parse_node("type_0", undefined, []),
                            create_parse_node(";", undefined, []),
                        ]),
                        create_parse_node("Member", 7, [
                            create_parse_node("member_1", undefined, []),
                            create_parse_node(":", undefined, []),
                            create_parse_node("type_1", undefined, []),
                            create_parse_node(";", undefined, []),
                        ]),
                    ]),
                    create_parse_node("}", undefined, []),
                ]),
            ])
        ]
    );

    return root;
}

function create_test_text(): string {
    const text = `
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

    return text;
}

function create_test_cache(parse_tree: Parser_node.Node, text: string): Parse_tree_text_position_cache.Cache {

    const declaration_0 = parse_tree.children[0];
    const declaration_0_offset = text.indexOf("function");

    const declaration_2 = parse_tree.children[2];
    const declaration_2_offset = text.indexOf("struct");

    const cache = Parse_tree_text_position_cache.create_cache();
    Parse_tree_text_position_cache.set_entry(cache, declaration_0_offset, declaration_0, [0]);
    Parse_tree_text_position_cache.set_entry(cache, declaration_2_offset, declaration_2, [2]);
    return cache;
}

describe("Parse_tree_text_position_cache", () => {

    const root = create_test_parse_tree();
    const text = create_test_text();

    const declaration_0 = root.children[0];
    const declaration_0_offset = text.indexOf("function");

    const declaration_1 = root.children[1];

    const declaration_2 = root.children[2];
    const declaration_2_offset = text.indexOf("struct");

    it("Contains the cached nodes after insertions", () => {
        const cache = create_test_cache(root, text);

        assert.equal(Parse_tree_text_position_cache.has_node(cache, declaration_0), true);
        assert.equal(Parse_tree_text_position_cache.has_node(cache, declaration_1), false);
        assert.equal(Parse_tree_text_position_cache.has_node(cache, declaration_2), true);
    });

    it("Returns the offset of a cached node", () => {
        const cache = create_test_cache(root, text);

        {
            const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, declaration_0, [0], text);
            assert.equal(actual_offset, declaration_0_offset);
        }
        {
            const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, declaration_2, [2], text);
            assert.equal(actual_offset, declaration_2_offset);
        }
    });

    it("Returns the offset of the non-cached node [0,0,0,0]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [0, 0, 0, 0];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [0,0,0,1]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [0, 0, 0, 1];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [1]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [1];
        const expected_offset = text.lastIndexOf("function");
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [1,0,0,1]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [1, 0, 0, 1];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [2,0,0]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 0];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [2,0,1]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 1];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [2,0,3,0,0]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 3, 0, 0];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [2,0,3,0,2]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 3, 0, 2];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [2,0,3,1,0]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 3, 1, 0];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the offset of the non-cached node [2,0,3,1,2]", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 3, 1, 2];
        const node = Parser_node.get_node_at_position(root, node_position);
        const expected_offset = text.indexOf(node.word.value);
        const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, root, node_position, text);
        assert.equal(actual_offset, expected_offset);
    });

    it("Returns the non-cached node [0,0,0,0] at the offset", () => {
        const cache = create_test_cache(root, text);

        const node_position = [0, 0, 0, 0];
        const node = Parser_node.get_node_at_position(root, node_position);
        const node_offset = text.indexOf(node.word.value);

        {
            const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset, root, text);

            assert.notEqual(actual_node_and_position, undefined);
            if (actual_node_and_position !== undefined) {
                assert.equal(actual_node_and_position.node, node);
                assert.deepEqual(actual_node_and_position.position, node_position);
            }
        }

        {
            const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, 0, root, text);

            assert.notEqual(actual_node_and_position, undefined);
            if (actual_node_and_position !== undefined) {
                assert.equal(actual_node_and_position.node, node);
                assert.deepEqual(actual_node_and_position.position, node_position);
            }
        }
    });

    it("Returns the non-cached node [0,0,0,1] at the offset", () => {
        const cache = create_test_cache(root, text);

        const node_position = [0, 0, 0, 1];
        const node = Parser_node.get_node_at_position(root, node_position);
        const node_offset = text.indexOf(node.word.value);

        {
            const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset, root, text);

            assert.notEqual(actual_node_and_position, undefined);
            if (actual_node_and_position !== undefined) {
                assert.equal(actual_node_and_position.node, node);
                assert.deepEqual(actual_node_and_position.position, node_position);
            }
        }

        {
            const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset - 1, root, text);

            assert.notEqual(actual_node_and_position, undefined);
            if (actual_node_and_position !== undefined) {
                assert.equal(actual_node_and_position.node, node);
                assert.deepEqual(actual_node_and_position.position, node_position);
            }
        }
    });

    it("Returns the non-cached node [2,0,0] at the offset", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 0];
        const node = Parser_node.get_node_at_position(root, node_position);
        const node_offset = text.indexOf(node.word.value);
        const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset, root, text);

        assert.notEqual(actual_node_and_position, undefined);
        if (actual_node_and_position !== undefined) {
            assert.equal(actual_node_and_position.node, node);
            assert.deepEqual(actual_node_and_position.position, node_position);
        }
    });

    it("Returns the non-cached node [2,0,1] at the offset", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 1];
        const node = Parser_node.get_node_at_position(root, node_position);
        const node_offset = text.indexOf(node.word.value);
        const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset, root, text);

        assert.notEqual(actual_node_and_position, undefined);
        if (actual_node_and_position !== undefined) {
            assert.equal(actual_node_and_position.node, node);
            assert.deepEqual(actual_node_and_position.position, node_position);
        }
    });

    it("Returns the non-cached node [2,0,3,0,0] at the offset", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 3, 0, 0];
        const node = Parser_node.get_node_at_position(root, node_position);
        const node_offset = text.indexOf(node.word.value);
        const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset, root, text);

        assert.notEqual(actual_node_and_position, undefined);
        if (actual_node_and_position !== undefined) {
            assert.equal(actual_node_and_position.node, node);
            assert.deepEqual(actual_node_and_position.position, node_position);
        }
    });

    it("Returns the non-cached node [2,0,3,0,2] at the offset", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 3, 0, 2];
        const node = Parser_node.get_node_at_position(root, node_position);
        const node_offset = text.indexOf(node.word.value);
        const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset, root, text);

        assert.notEqual(actual_node_and_position, undefined);
        if (actual_node_and_position !== undefined) {
            assert.equal(actual_node_and_position.node, node);
            assert.deepEqual(actual_node_and_position.position, node_position);
        }
    });

    it("Returns the non-cached node [2,0,3,1,0] at the offset", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 3, 1, 0];
        const node = Parser_node.get_node_at_position(root, node_position);
        const node_offset = text.indexOf(node.word.value);
        const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset, root, text);

        assert.notEqual(actual_node_and_position, undefined);
        if (actual_node_and_position !== undefined) {
            assert.equal(actual_node_and_position.node, node);
            assert.deepEqual(actual_node_and_position.position, node_position);
        }
    });

    it("Returns the non-cached node [2,0,3,1,2] at the offset", () => {
        const cache = create_test_cache(root, text);

        const node_position = [2, 0, 3, 1, 2];
        const node = Parser_node.get_node_at_position(root, node_position);
        const node_offset = text.indexOf(node.word.value);
        const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, node_offset, root, text);

        assert.notEqual(actual_node_and_position, undefined);
        if (actual_node_and_position !== undefined) {
            assert.equal(actual_node_and_position.node, node);
            assert.deepEqual(actual_node_and_position.position, node_position);
        }
    });

    it("Returns undefined if getting node offset after last word", () => {
        const cache = create_test_cache(root, text);

        {
            const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, text.length, root, text);
            assert.equal(actual_node_and_position, undefined);
        }
        {
            const actual_node_and_position = Parse_tree_text_position_cache.get_node(cache, text.length - 1, root, text);
            assert.equal(actual_node_and_position, undefined);
        }
    });

    it("Updates cached offsets 0", () => {
        const cache = create_test_cache(root, text);

        Parse_tree_text_position_cache.update_offsets(cache, 0, 5);
        const new_text = " ".repeat(5) + text;

        {
            const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, declaration_0, [0], new_text);
            assert.equal(actual_offset, declaration_0_offset + 5);
        }
        {
            const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, declaration_2, [2], new_text);
            assert.equal(actual_offset, declaration_2_offset + 5);
        }
    });

    it("Updates cached offsets 1", () => {
        const cache = create_test_cache(root, text);

        Parse_tree_text_position_cache.update_offsets(cache, declaration_0_offset + 8, 20);
        const new_text = text.substring(0, declaration_0_offset + 8) + " ".repeat(20) + text.substring(declaration_0_offset + 8, text.length);

        {
            const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, declaration_0, [0], new_text);
            assert.equal(actual_offset, declaration_0_offset);
        }
        {
            const actual_offset = Parse_tree_text_position_cache.get_offset(cache, root, declaration_2, [2], new_text);
            assert.equal(actual_offset, declaration_2_offset + 20);
        }
    });
});
