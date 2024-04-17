import "mocha";

import * as assert from "assert";
import * as Grammar from "./Grammar";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";

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
    `;

    return text;
}

describe("Parse_tree_text_iterator", () => {

    const root = create_test_parse_tree();
    const text = create_test_text();

    const expected_word: string[] = [
        "function",
        "name_0",
        "(",
        ")",
        "->",
        "(",
        ")",
        "{",
        "}"
    ];

    const first_word_offset = text.indexOf("function");

    const expected_offset: number[] = [
        first_word_offset,
        first_word_offset + 9,
        first_word_offset + 15,
        first_word_offset + 16,
        first_word_offset + 18,
        first_word_offset + 21,
        first_word_offset + 22,
        text.indexOf("{"),
        text.indexOf("}"),
    ];

    it("Can iterate forward", () => {

        let iterator = Parse_tree_text_iterator.begin(root, text);

        assert.notEqual(iterator.node, undefined);
        if (iterator.node !== undefined) {
            assert.equal(iterator.node.word.value, expected_word[0]);
            assert.equal(iterator.offset, expected_offset[0]);
        }

        for (let index = 1; index < expected_word.length; ++index) {

            iterator = Parse_tree_text_iterator.next(iterator);

            assert.notEqual(iterator.node, undefined);
            if (iterator.node !== undefined) {
                assert.equal(iterator.node.word.value, expected_word[index]);
                assert.equal(iterator.offset, expected_offset[index]);
            }
        }

        iterator = Parse_tree_text_iterator.next(iterator);
        assert.equal(iterator.node, undefined);
        assert.equal(iterator.offset, text.length);
    });

    it("Can iterate back", () => {

        let iterator: Parse_tree_text_iterator.Iterator | undefined = Parse_tree_text_iterator.end(root, text);

        assert.notEqual(iterator, undefined);
        if (iterator !== undefined) {
            assert.equal(iterator.node, undefined);
            assert.equal(iterator.offset, text.length);

            for (let index = expected_offset.length - 1; index >= 0; --index) {
                if (iterator !== undefined) {
                    iterator = Parse_tree_text_iterator.previous(iterator);

                    assert.notEqual(iterator, undefined);
                    if (iterator !== undefined) {
                        assert.notEqual(iterator.node, undefined);
                        if (iterator.node !== undefined) {
                            assert.equal(iterator.node.word.value, expected_word[index]);
                            assert.equal(iterator.offset, expected_offset[index]);
                        }
                    }
                }
            }
        }
    });
});
