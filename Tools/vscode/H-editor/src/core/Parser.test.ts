import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Parser from "./Parser";
import * as Scanner from "./Scanner";

function create_parse_node(value: string, text_position: Parser.Text_position, children: Parser.Node[]): Parser.Node {
    return {
        word: { value: value, type: Grammar.Word_type.Alphanumeric },
        state: -1,
        production_rule_index: undefined,
        previous_node_on_stack: undefined,
        father_node: undefined,
        index_in_father: -1,
        children: children,
        text_position: text_position
    };
}

describe("Parser.scan_new_change", () => {
    it("Scans change 0", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("modul", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Parser.Text_position = {
            line: 0,
            column: 5
        };

        const end_text_position: Parser.Text_position = {
            line: 0,
            column: 5
        };

        const new_text = "e";

        const result = Parser.scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.deepEqual(result.start_change_node_position, [0]);
        assert.deepEqual(result.new_words, [{ value: "module", type: Grammar.Word_type.Alphanumeric }]);
        assert.deepEqual(result.after_change_node_position, []);
    });

    it("Scans change 1", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Parser.Text_position = {
            line: 0,
            column: 2
        };

        const end_text_position: Parser.Text_position = {
            line: 0,
            column: 2
        };

        const new_text = " ";

        const result = Parser.scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.deepEqual(result.start_change_node_position, [0]);
        assert.deepEqual(result.new_words, [{ value: "mo", type: Grammar.Word_type.Alphanumeric }, { value: "dule", type: Grammar.Word_type.Alphanumeric }]);
        assert.deepEqual(result.after_change_node_position, []);
    });

    it("Scans change 2", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Parser.Text_position = {
            line: 0,
            column: 6
        };

        const end_text_position: Parser.Text_position = {
            line: 0,
            column: 6
        };

        const new_text = " ";

        const result = Parser.scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.deepEqual(result.start_change_node_position, []);
        assert.deepEqual(result.new_words, []);
        assert.deepEqual(result.after_change_node_position, []);
    });

    it("Scans change 3", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Parser.Text_position = {
            line: 0,
            column: 3
        };

        const end_text_position: Parser.Text_position = {
            line: 0,
            column: 5
        };

        const new_text = "";

        const result = Parser.scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.deepEqual(result.start_change_node_position, [0]);
        assert.deepEqual(result.new_words, [{ value: "mode", type: Grammar.Word_type.Alphanumeric }]);
        assert.deepEqual(result.after_change_node_position, []);
    });

    it("Scans change 4", () => {

        const parse_tree = create_parse_node(
            "S",
            { line: 0, column: 0 },
            [
                create_parse_node("module", { line: 0, column: 0 }, [])
            ]
        );

        const start_text_position: Parser.Text_position = {
            line: 0,
            column: 3
        };

        const end_text_position: Parser.Text_position = {
            line: 0,
            column: 6
        };

        const new_text = "el";

        const result = Parser.scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.deepEqual(result.start_change_node_position, [0]);
        assert.deepEqual(result.new_words, [{ value: "model", type: Grammar.Word_type.Alphanumeric }]);
        assert.deepEqual(result.after_change_node_position, []);
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

        const start_text_position: Parser.Text_position = {
            line: 0,
            column: 8
        };

        const end_text_position: Parser.Text_position = {
            line: 0,
            column: 9
        };

        const new_text = "o";

        const result = Parser.scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.deepEqual(result.start_change_node_position, [1]);
        assert.deepEqual(result.new_words, [{ value: "nome", type: Grammar.Word_type.Alphanumeric }]);
        assert.deepEqual(result.after_change_node_position, [2]);
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

        const start_text_position: Parser.Text_position = {
            line: 0,
            column: 6
        };

        const end_text_position: Parser.Text_position = {
            line: 0,
            column: 7
        };

        const new_text = "";

        const result = Parser.scan_new_change(
            parse_tree,
            start_text_position,
            end_text_position,
            new_text
        );

        assert.deepEqual(result.start_change_node_position, [0]);
        assert.deepEqual(result.new_words, [{ value: "modulename", type: Grammar.Word_type.Alphanumeric }]);
        assert.deepEqual(result.after_change_node_position, [2]);
    });
});

describe("Parser.parse", () => {
    it("Parses '1 + 1' with a parsing table", () => {

        const action_table: Grammar.Action_column[][] = [
            [ // 0
                { label: "0", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Shift, value: { next_state: 2 } } }
            ],
            [ // 1
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } }
            ],
            [ // 2
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1 } } }
            ],
            [ // 3
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "$", action: { type: Grammar.Action_type.Accept, value: { lhs: "S", rhs_count: 1 } } },
            ],
            [ // 4
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1 } } }
            ],
            [ // 5
                { label: "0", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Shift, value: { next_state: 2 } } }
            ],
            [ // 6
                { label: "0", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Shift, value: { next_state: 2 } } }
            ],
            [ // 7
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } }
            ],
            [ // 8
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3 } } }
            ],
        ];

        const go_to_table: Grammar.Go_to_column[][] = [
            [ // 0
                { label: "E", next_state: 3 },
                { label: "B", next_state: 4 }
            ],
            [ // 1
            ],
            [ // 2
            ],
            [ // 3
            ],
            [ // 4
            ],
            [ // 5
                { label: "B", next_state: 7 }
            ],
            [ // 6
                { label: "B", next_state: 8 }
            ],
            [ // 7
            ],
            [ // 8
            ],
        ];

        const input = "1 + 1";
        const scanned_words = Scanner.scan(input, 0, input.length);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const output_node = Parser.parse(scanned_words, action_table, go_to_table, map_word_to_terminal);

        assert.notEqual(output_node, undefined);

        if (output_node !== undefined) {

            assert.equal(output_node.word.value, "S");
            assert.equal(output_node.production_rule_index, 0);
            assert.equal(output_node.children.length, 1);

            const node_0 = output_node.children[0];
            assert.equal(node_0.word.value, "E");
            assert.equal(node_0.production_rule_index, 3);
            assert.equal(node_0.children.length, 3);

            {
                const node_1 = node_0.children[0];
                assert.equal(node_1.word.value, "E");
                assert.equal(node_1.production_rule_index, 2);
                assert.equal(node_1.children.length, 1);

                {
                    const node_2 = node_1.children[0];
                    assert.equal(node_2.word.value, "B");
                    assert.equal(node_2.production_rule_index, 1);
                    assert.equal(node_2.children.length, 1);

                    {
                        const node_3 = node_2.children[0];
                        assert.equal(node_3.word.value, "1");
                        assert.equal(node_3.production_rule_index, undefined);
                        assert.equal(node_3.children.length, 0);
                    }
                }
            }

            {
                const node_1 = node_0.children[1];
                assert.equal(node_1.word.value, "+");
                assert.equal(node_1.production_rule_index, undefined);
                assert.equal(node_1.children.length, 0);
            }

            {
                const node_1 = node_0.children[2];
                assert.equal(node_1.word.value, "B");
                assert.equal(node_1.production_rule_index, 1);
                assert.equal(node_1.children.length, 1);

                {
                    const node_2 = node_1.children[0];
                    assert.equal(node_2.word.value, "1");
                    assert.equal(node_2.production_rule_index, undefined);
                    assert.equal(node_2.children.length, 0);
                }
            }
        }

    });

    it("Parses '1 + 2 * 3'", () => {

        const grammar_description = Grammar_examples.create_test_grammar_3_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);

        const input = "1 + 2 * 3";
        const scanned_words = Scanner.scan(input, 0, input.length);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {

            if (word.type === Grammar.Word_type.Number) {
                return "number";
            }

            return word.value;
        };

        const output_node = Parser.parse(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, map_word_to_terminal);

        assert.notEqual(output_node, undefined);

        if (output_node !== undefined) {

            assert.equal(output_node.word.value, "Start");

            assert.equal(output_node.children.length, 1);

            {
                const node_0 = output_node.children[0];
                assert.equal(node_0.word.value, "Addition");
                assert.equal(node_0.children.length, 3);

                {
                    const node_1 = node_0.children[0];
                    assert.equal(node_1.word.value, "Addition");
                    assert.equal(node_1.children.length, 1);

                    {
                        const node_2 = node_1.children[0];
                        assert.equal(node_2.word.value, "Multiplication");
                        assert.equal(node_2.children.length, 1);

                        {
                            const node_3 = node_2.children[0];
                            assert.equal(node_3.word.value, "Basic");
                            assert.equal(node_3.children.length, 1);

                            {
                                const node_4 = node_3.children[0];
                                assert.equal(node_4.word.value, "1");
                                assert.equal(node_4.children.length, 0);
                            }
                        }
                    }
                }

                {
                    const node_5 = node_0.children[1];
                    assert.equal(node_5.word.value, "+");
                    assert.equal(node_5.children.length, 0);
                }

                {
                    const node_6 = node_0.children[2];
                    assert.equal(node_6.word.value, "Multiplication");
                    assert.equal(node_6.children.length, 3);

                    {
                        const node_7 = node_6.children[0];
                        assert.equal(node_7.word.value, "Multiplication");
                        assert.equal(node_7.children.length, 1);

                        {
                            const node_8 = node_7.children[0];
                            assert.equal(node_8.word.value, "Basic");
                            assert.equal(node_8.children.length, 1);

                            {
                                const node_9 = node_8.children[0];
                                assert.equal(node_9.word.value, "2");
                                assert.equal(node_9.children.length, 0);
                            }
                        }
                    }

                    {
                        const node_10 = node_6.children[1];
                        assert.equal(node_10.word.value, "*");
                        assert.equal(node_10.children.length, 0);
                    }

                    {
                        const node_11 = node_6.children[2];
                        assert.equal(node_11.word.value, "Basic");
                        assert.equal(node_11.children.length, 1);

                        {
                            const node_12 = node_11.children[0];
                            assert.equal(node_12.word.value, "3");
                            assert.equal(node_12.children.length, 0);
                        }
                    }
                }
            }
        }

    });
});

describe("Parser.parse_incrementally", () => {

    it("Parses 'a a h h h l h h h b b c b c c' and then handles replace second 'b' by 'g g'", () => {

        const grammar_description = Grammar_examples.create_test_grammar_5_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "a a h h h l h h h b b c b c c";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            map_word_to_terminal
        );

        {
            assert.equal(first_parse_result.status, Parser.Parse_status.Accept);
            assert.equal(first_parse_result.processed_words, 15);
            assert.equal(first_parse_result.changes.length, 1);

            const change = first_parse_result.changes[0];
            assert.equal(change.type, Parser.Change_type.Modify);

            const modify_change = change.value as Parser.Modify_change;
            assert.deepEqual(modify_change.position, []);

            const node_0 = modify_change.new_node;

            assert.equal(node_0.word.value, "S");
            assert.equal(node_0.children.length, 2);

            {
                const node_1 = node_0.children[0];
                assert.equal(node_1.word.value, "A");
                assert.equal(node_1.children.length, 3);

                {
                    const node_2 = node_1.children[0];
                    assert.equal(node_2.word.value, "a");
                    assert.equal(node_2.children.length, 0);
                }

                {
                    const node_3 = node_1.children[1];
                    assert.equal(node_3.word.value, "A");
                    assert.equal(node_3.children.length, 3);

                    {
                        const node_4 = node_3.children[0];
                        assert.equal(node_4.word.value, "a");
                        assert.equal(node_4.children.length, 0);
                    }

                    {
                        const node_5 = node_3.children[1];
                        assert.equal(node_5.word.value, "A");
                        assert.equal(node_5.children.length, 3);

                        {
                            const node_6 = node_5.children[0];
                            assert.equal(node_6.word.value, "h");
                            assert.equal(node_6.children.length, 0);
                        }

                        {
                            const node_7 = node_5.children[1];
                            assert.equal(node_7.word.value, "A");
                            assert.equal(node_7.children.length, 3);

                            {
                                const node_8 = node_7.children[0];
                                assert.equal(node_8.word.value, "h");
                                assert.equal(node_8.children.length, 0);
                            }

                            {
                                const node_9 = node_7.children[1];
                                assert.equal(node_9.word.value, "A");
                                assert.equal(node_9.children.length, 3);

                                {
                                    const node_10 = node_9.children[0];
                                    assert.equal(node_10.word.value, "h");
                                    assert.equal(node_10.children.length, 0);
                                }

                                {
                                    const node_11 = node_9.children[1];
                                    assert.equal(node_11.word.value, "A");
                                    assert.equal(node_11.children.length, 1);

                                    {
                                        const node_12 = node_11.children[0];
                                        assert.equal(node_12.word.value, "l");
                                        assert.equal(node_12.children.length, 0);
                                    }
                                }

                                {
                                    const node_13 = node_9.children[2];
                                    assert.equal(node_13.word.value, "h");
                                    assert.equal(node_13.children.length, 0);
                                }
                            }

                            {
                                const node_14 = node_7.children[2];
                                assert.equal(node_14.word.value, "h");
                                assert.equal(node_14.children.length, 0);
                            }
                        }

                        {
                            const node_15 = node_5.children[2];
                            assert.equal(node_15.word.value, "h");
                            assert.equal(node_15.children.length, 0);
                        }
                    }

                    {
                        const node_16 = node_3.children[2];
                        assert.equal(node_16.word.value, "B");
                        assert.equal(node_16.children.length, 2);

                        {
                            const node_17 = node_16.children[0];
                            assert.equal(node_17.word.value, "b");
                            assert.equal(node_17.children.length, 0);
                        }

                        {
                            const node_18 = node_16.children[1];
                            assert.equal(node_18.word.value, "B");
                            assert.equal(node_18.children.length, 2);

                            {
                                const node_19 = node_18.children[0];
                                assert.equal(node_19.word.value, "b");
                                assert.equal(node_19.children.length, 0);
                            }

                            {
                                const node_19 = node_18.children[1];
                                assert.equal(node_19.word.value, "B");
                                assert.equal(node_19.children.length, 1);

                                {
                                    const node_20 = node_19.children[0];
                                    assert.equal(node_20.word.value, "c");
                                    assert.equal(node_20.children.length, 0);
                                }
                            }
                        }
                    }
                }

                {
                    const node_21 = node_1.children[2];
                    assert.equal(node_21.word.value, "B");
                    assert.equal(node_21.children.length, 2);

                    {
                        const node_22 = node_21.children[0];
                        assert.equal(node_22.word.value, "b");
                        assert.equal(node_22.children.length, 0);
                    }

                    {
                        const node_23 = node_21.children[1];
                        assert.equal(node_23.word.value, "B");
                        assert.equal(node_23.children.length, 1);

                        {
                            const node_24 = node_23.children[0];
                            assert.equal(node_24.word.value, "c");
                            assert.equal(node_24.children.length, 0);
                        }
                    }
                }
            }

            {
                const node_25 = node_0.children[1];
                assert.equal(node_25.word.value, "B");
                assert.equal(node_25.children.length, 1);

                {
                    const node_26 = node_25.children[0];
                    assert.equal(node_26.word.value, "c");
                    assert.equal(node_26.children.length, 0);
                }
            }
        }

        const second_input = "g g";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 1, 2, 1, 0];
        const after_change_node_position: number[] = [0, 1, 2, 1, 1, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            map_word_to_terminal
        );

        {
            assert.equal(second_parse_result.status, Parser.Parse_status.Accept);
            assert.equal(second_parse_result.processed_words, 3);
            assert.equal(second_parse_result.changes.length, 1);

            const change = second_parse_result.changes[0];
            assert.equal(change.type, Parser.Change_type.Modify);

            const modify_change = change.value as Parser.Modify_change;

            assert.deepEqual(modify_change.position, [0, 1]);
            const node_0 = modify_change.new_node;
            assert.equal(node_0.word.value, "A");

            {
                const node_1 = node_0.children[0];
                assert.equal(node_1.word.value, "a");
                assert.equal(node_1.children.length, 0);
            }

            {
                const node_2 = node_0.children[1];
                assert.equal(node_2.word.value, "A");
                assert.equal(node_2.children.length, 3);

                {
                    const node_3 = node_2.children[0];
                    assert.equal(node_3.word.value, "h");
                    assert.equal(node_3.children.length, 0);
                }

                {
                    const node_4 = node_2.children[1];
                    assert.equal(node_4.word.value, "A");
                    assert.equal(node_4.children.length, 3);

                    {
                        const node_5 = node_4.children[0];
                        assert.equal(node_5.word.value, "h");
                        assert.equal(node_5.children.length, 0);
                    }

                    {
                        const node_6 = node_4.children[1];
                        assert.equal(node_6.word.value, "A");
                        assert.equal(node_6.children.length, 3);

                        {
                            const node_7 = node_6.children[0];
                            assert.equal(node_7.word.value, "h");
                            assert.equal(node_7.children.length, 0);
                        }

                        {
                            const node_8 = node_6.children[1];
                            assert.equal(node_8.word.value, "A");
                            assert.equal(node_8.children.length, 1);

                            {
                                const node_9 = node_8.children[0];
                                assert.equal(node_9.word.value, "l");
                                assert.equal(node_9.children.length, 0);
                            }
                        }

                        {
                            const node_10 = node_6.children[2];
                            assert.equal(node_10.word.value, "h");
                            assert.equal(node_10.children.length, 0);
                        }
                    }

                    {
                        const node_11 = node_4.children[2];
                        assert.equal(node_11.word.value, "h");
                        assert.equal(node_11.children.length, 0);
                    }
                }

                {
                    const node_12 = node_2.children[2];
                    assert.equal(node_12.word.value, "h");
                    assert.equal(node_12.children.length, 0);
                }
            }

            {
                const node_13 = node_0.children[2];
                assert.equal(node_13.word.value, "C");
                assert.equal(node_13.children.length, 2);

                {
                    const node_14 = node_13.children[0];
                    assert.equal(node_14.word.value, "D");
                    assert.equal(node_14.children.length, 2);

                    {
                        const node_15 = node_14.children[0];
                        assert.equal(node_15.word.value, "b");
                        assert.equal(node_15.children.length, 0);
                    }

                    {
                        const node_16 = node_14.children[1];
                        assert.equal(node_16.word.value, "E");
                        assert.equal(node_16.children.length, 2);

                        {
                            const node_17 = node_16.children[0];
                            assert.equal(node_17.word.value, "g");
                            assert.equal(node_17.children.length, 0);
                        }

                        {
                            const node_18 = node_16.children[1];
                            assert.equal(node_18.word.value, "g");
                            assert.equal(node_18.children.length, 0);
                        }
                    }
                }

                {
                    const node_19 = node_13.children[1];
                    assert.equal(node_19.word.value, "c");
                    assert.equal(node_19.children.length, 0);
                }
            }
        }
    });
});
