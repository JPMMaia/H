import "mocha";

import * as assert from "assert";
import * as Grammar from "./Grammar";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";

function create_parse_node(value: string, production_rule_index: number | undefined, children: Parser_node.Node[]): Parser_node.Node {
    return {
        word: { value: value, type: Grammar.Word_type.Alphanumeric, source_location: { line: 0, column: 0 } },
        state: -1,
        production_rule_index: production_rule_index,
        children: children
    };
}

function create_comment_parse_node(value: string, production_rule_index: number | undefined, children: Parser_node.Node[]): Parser_node.Node {
    return {
        word: { value: value, type: Grammar.Word_type.Comment, source_location: { line: 0, column: 0 } },
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

    it("Can iterate forward", () => {

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

        const expected_line: number[] = [
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            3,
            4,
        ];

        const expected_column: number[] = [
            9,
            18,
            24,
            25,
            27,
            30,
            31,
            9,
            9,
        ];

        test_iterate_forward(root, text, expected_word, expected_offset, expected_line, expected_column);
    });

    it("Can iterate forward with comments", () => {

        const root = create_parse_node("Root", 1, [
            create_comment_parse_node("// A comment\n // Another line", undefined, []),
            create_parse_node("var", undefined, [])
        ]);
        const text = "// A comment\r\n    // Another line\r\n    var";

        const expected_word: string[] = [
            "// A comment\n // Another line",
            "var"
        ];

        const first_word_offset = 0;

        const expected_offset: number[] = [
            first_word_offset,
            first_word_offset + 39,
        ];

        const expected_line: number[] = [
            1,
            3,
        ];

        const expected_column: number[] = [
            1,
            5,
        ];

        test_iterate_forward(root, text, expected_word, expected_offset, expected_line, expected_column);
    });

    it("Can iterate back", () => {

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

        const expected_line: number[] = [
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            3,
            4,
        ];

        const expected_column: number[] = [
            9,
            18,
            24,
            25,
            27,
            30,
            31,
            9,
            9,
        ];

        test_iterate_back(root, text, expected_word, expected_offset, expected_line, expected_column, 5, 5);
    });

    it("Can iterate back with comments", () => {

        const root = create_parse_node("Root", 1, [
            create_comment_parse_node("// A comment\n // Another line", undefined, []),
            create_parse_node("var", undefined, [])
        ]);
        const text = "// A comment\r\n    // Another line\r\n    var";

        const expected_word: string[] = [
            "// A comment\n // Another line",
            "var"
        ];

        const first_word_offset = 0;

        const expected_offset: number[] = [
            first_word_offset,
            first_word_offset + 39,
        ];

        const expected_line: number[] = [
            1,
            3,
        ];

        const expected_column: number[] = [
            1,
            5,
        ];

        test_iterate_back(root, text, expected_word, expected_offset, expected_line, expected_column, 3, 8);
    });
});

function test_iterate_forward(
    root: Parser_node.Node,
    text: string,
    expected_word: string[],
    expected_offset: number[],
    expected_line: number[],
    expected_column: number[]
): void {
    let iterator = Parse_tree_text_iterator.begin(root, text);

    assert.notEqual(iterator.node, undefined);
    if (iterator.node !== undefined) {
        assert.equal(iterator.node.word.value, expected_word[0]);
        assert.equal(iterator.offset, expected_offset[0]);
        assert.equal(iterator.line, expected_line[0]);
        assert.equal(iterator.column, expected_column[0]);
    }

    for (let index = 1; index < expected_word.length; ++index) {

        iterator = Parse_tree_text_iterator.next(iterator);

        assert.notEqual(iterator.node, undefined);
        if (iterator.node !== undefined) {
            assert.equal(iterator.node.word.value, expected_word[index]);
            assert.equal(iterator.offset, expected_offset[index]);
            assert.equal(iterator.line, expected_line[index]);
            assert.equal(iterator.column, expected_column[index]);
        }
    }

    iterator = Parse_tree_text_iterator.next(iterator);
    assert.equal(iterator.node, undefined);
    assert.equal(iterator.offset, text.length);
    assert.equal(iterator.line, -1);
    assert.equal(iterator.column, -1);
}

function test_iterate_back(
    root: Parser_node.Node,
    text: string,
    expected_word: string[],
    expected_offset: number[],
    expected_line: number[],
    expected_column: number[],
    expected_end_line: number,
    expected_end_column: number
): void {
    let iterator: Parse_tree_text_iterator.Iterator | undefined = Parse_tree_text_iterator.end(root, text, true);

    assert.notEqual(iterator, undefined);
    if (iterator !== undefined) {
        assert.equal(iterator.node, undefined);
        assert.equal(iterator.offset, text.length);
        assert.equal(iterator.line, expected_end_line);
        assert.equal(iterator.column, expected_end_column);

        for (let index = expected_offset.length - 1; index >= 0; --index) {
            if (iterator !== undefined) {
                iterator = Parse_tree_text_iterator.previous(iterator);

                assert.notEqual(iterator, undefined);
                if (iterator !== undefined) {
                    assert.notEqual(iterator.node, undefined);
                    if (iterator.node !== undefined) {
                        assert.equal(iterator.node.word.value, expected_word[index]);
                        assert.equal(iterator.offset, expected_offset[index]);
                        assert.equal(iterator.line, expected_line[index]);
                        assert.equal(iterator.column, expected_column[index]);
                    }
                }
            }
        }
    }
}
