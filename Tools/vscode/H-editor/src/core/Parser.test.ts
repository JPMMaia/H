import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Parser from "./Parser";
import * as Scanner from "./Scanner";

describe("Parser.parse", () => {
    it("Parses '1 + 1' with a parsing table", () => {

        const action_table: Grammar.Action_column[][] = [
            [ // 0
                { label: "0", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Shift, value: { next_state: 2 } } }
            ],
            [ // 1
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } }
            ],
            [ // 2
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 1, lhs: "B", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } }
            ],
            [ // 3
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "$", action: { type: Grammar.Action_type.Accept, value: { lhs: "S", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
            ],
            [ // 4
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 2, lhs: "E", rhs_count: 1, production_rule_flags: Grammar.Production_rule_flags.None } } }
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
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } }
            ],
            [ // 8
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { production_rule_index: 3, lhs: "E", rhs_count: 3, production_rule_flags: Grammar.Production_rule_flags.None } } }
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

        const array_infos = new Map<string, Grammar.Array_info>();

        const input = "1 + 1";
        const scanned_words = Scanner.scan(input, 0, input.length);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const output_node = Parser.parse(scanned_words, action_table, go_to_table, array_infos, map_word_to_terminal);

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
        const array_infos = Grammar.create_array_infos(production_rules);

        const input = "1 + 2 * 3";
        const scanned_words = Scanner.scan(input, 0, input.length);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {

            if (word.type === Grammar.Word_type.Number) {
                return "number";
            }

            return word.value;
        };

        const output_node = Parser.parse(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, array_infos, map_word_to_terminal);

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

    it("Parses a list of elements", () => {

        const grammar_description = Grammar_examples.create_test_grammar_10_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const input = "id id id";
        const scanned_words = Scanner.scan(input, 0, input.length);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const output_node = Parser.parse(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, array_infos, map_word_to_terminal);

        assert.notEqual(output_node, undefined);

        if (output_node !== undefined) {

            assert.equal(output_node.word.value, "S");

            assert.equal(output_node.children.length, 1);

            {
                const list_node = output_node.children[0];
                assert.equal(list_node.word.value, "List");
                assert.equal(list_node.children.length, 3);

                for (const child of list_node.children) {
                    assert.equal(child.word.value, "Element");
                    assert.equal(child.children.length, 1);
                    assert.equal(child.children[0].word.value, "id");
                }
            }
        }
    });

    it("Parses a list of elements with separator", () => {

        const grammar_description = Grammar_examples.create_test_grammar_11_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const input = "id, id, id";
        const scanned_words = Scanner.scan(input, 0, input.length);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const output_node = Parser.parse(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, array_infos, map_word_to_terminal);

        assert.notEqual(output_node, undefined);

        if (output_node !== undefined) {

            assert.equal(output_node.word.value, "S");

            assert.equal(output_node.children.length, 1);

            {
                const list_node = output_node.children[0];
                assert.equal(list_node.word.value, "List");
                assert.equal(list_node.children.length, 5);

                for (let index = 0; index < list_node.children.length; ++index) {
                    const child = list_node.children[index];

                    const is_element = (index % 2) === 0;

                    if (is_element) {
                        assert.equal(child.word.value, "Element");
                        assert.equal(child.children.length, 1);
                        assert.equal(child.children[0].word.value, "id");
                    }
                    else {
                        assert.equal(child.word.value, ",");
                        assert.equal(child.children.length, 0);
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
        const array_infos = Grammar.create_array_infos(production_rules);

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
            array_infos,
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

        // Expected steps:
        // shift [[0,$], [2,a], [2,a], [8,A], [17,b] | [26,g]] 
        // shift [[0,$], [2,a], [2,a], [8,A], [17,b] | [26,g], [33,g]] 
        // reduce E -> g g [[0,$], [2,a], [2,a], [8,A], [17,b] | [24,E]] c 
        // reduce D -> b E [[0,$], [2,a], [2,a], [8,A] | [16,D]] c 
        // shift [[0,$], [2,a], [2,a], [8,A] | [16,D], [22,c]] 
        // reduce C -> D c [[0,$], [2,a], [2,a], [8,A] | [15,C]] b 
        // accept matching condition at position [0,1]: A -> a A C [[0,$], [2,a], [2,a], [8,A] | [15,C]]
        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
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

    it("Parses 'module module_name;' and subsequent change", () => {

        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {

            if (word.value === "enum" || word.value === "export" || word.value === "function" || word.value === "module" || word.value === "struct" || word.value === "using") {
                return word.value;
            }

            if (word.type === Grammar.Word_type.Alphanumeric) {
                return "identifier";
            }

            return word.value;
        };

        const first_input = "module module_name;";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.equal(first_parse_result.status, Parser.Parse_status.Accept);

        const second_input = "module_name_2";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 0, 1, 0];
        const after_change_node_position: number[] = [0, 0, 2];

        // Expected steps:
        // shift [[0,$], [3,module] | [14,module_name_2]] 
        // reduce Module_name -> module_name_2 [[0,$], [3,module] | [13,Module_name]] ; 
        // shift [[0,$], [3,module] | [13,Module_name], [22,;]] 
        // accept matching condition at position [0,0]: Module_declaration -> module Module_name ; [[0,$], [3,module] | [13,Module_name], [22,;]]
        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);
        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];
        assert.equal(change.type, Parser.Change_type.Modify);

        const modify_change = change.value as Parser.Modify_change;

        assert.deepEqual(modify_change.position, [0, 0]);

        const module_declaration_node = modify_change.new_node;
        assert.equal(module_declaration_node.word.value, "Module_declaration");
        assert.equal(module_declaration_node.children.length, 3);

        {
            const module_keyword_node = module_declaration_node.children[0];
            assert.equal(module_keyword_node.word.value, "module");
            assert.equal(module_keyword_node.children.length, 0);
        }

        {
            const module_name_node = module_declaration_node.children[1];
            assert.equal(module_name_node.word.value, "Module_name");
            assert.equal(module_name_node.children.length, 1);

            {
                const identifier_with_dots_node = module_name_node.children[0];
                assert.equal(identifier_with_dots_node.word.value, "Identifier_with_dots");
                assert.equal(identifier_with_dots_node.children.length, 1);

                {
                    const identifier_node = identifier_with_dots_node.children[0];
                    assert.equal(identifier_node.word.value, "module_name_2");
                    assert.equal(identifier_node.children.length, 0);
                }
            }
        }

        {
            const semicolon_node = module_declaration_node.children[2];
            assert.equal(semicolon_node.word.value, ";");
            assert.equal(semicolon_node.children.length, 0);
        }
    });

    it("Parses long list and subsequent change", () => {

        const grammar_description = Grammar_examples.create_test_grammar_12_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {

            if (word.type === Grammar.Word_type.Number) {
                return "number";
            }

            return word.value;
        };

        const first_input = "0 1 2 3 4 5";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.equal(first_parse_result.status, Parser.Parse_status.Accept);

        // This is important to test the skip to rightmost brother incremental parser part.
        const second_input = "10";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 1];
        const after_change_node_position: number[] = [0, 2];

        // Expected steps:
        // shift [[0,$], [2,0] | [3,10]] 
        // shift [[0,$], [2,0] | [3,10], [4,2]] 
        // skip 3 nodes to rightmost brother: [[0,$], [2,0] | [3,10], [4,2], [5,3], [6,4], [7,5]]
        // accept matching condition at position [0]: List -> 0 10 2 3 4 5 [[0,$], [2,0] | [3,10], [4,2], [5,3], [6,4], [7,5]]
        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);
        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];
        assert.equal(change.type, Parser.Change_type.Modify);

        const modify_change = change.value as Parser.Modify_change;

        assert.deepEqual(modify_change.position, [0]);

        const list_node = modify_change.new_node;
        assert.equal(list_node.word.value, "List");

        const expected_values = ["0", "10", "2", "3", "4", "5"];
        assert.equal(list_node.children.length, expected_values.length);

        for (let index = 0; index < list_node.children.length; ++index) {
            const node = list_node.children[index];
            const expected_value = expected_values[index];

            assert.equal(node.word.value, expected_value);
            assert.equal(node.children.length, 0);
        }
    });
});

describe("Parser.parse_incrementally array without separator", () => {

    it("Parses adding element in the middle of an array", () => {

        const grammar_description = Grammar_examples.create_test_grammar_10_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id id id id id id id id id id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "id id";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 1, 0];
        const after_change_node_position: number[] = [0, 1, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Add);

        const add_change = change.value as Parser.Add_change;

        assert.deepEqual(add_change.parent_position, [0]);
        assert.equal(add_change.index, 1);
        assert.equal(add_change.new_nodes.length, 2);

        {
            const new_node = add_change.new_nodes[0];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }

        {
            const new_node = add_change.new_nodes[1];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }
    });

    it("Parses adding element at the beginning of an array", () => {

        const grammar_description = Grammar_examples.create_test_grammar_10_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id id id id id id id id id id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "id";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 0, 0];
        const after_change_node_position: number[] = [0, 0, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Add);

        const add_change = change.value as Parser.Add_change;

        assert.deepEqual(add_change.parent_position, [0]);
        assert.equal(add_change.index, 0);
        assert.equal(add_change.new_nodes.length, 1);

        {
            const new_node = add_change.new_nodes[0];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }
    });

    it("Parses adding element at the end of an array", () => {

        const grammar_description = Grammar_examples.create_test_grammar_10_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id id id id id id id id id id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "id id";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 10, 0];
        const after_change_node_position: number[] = [0, 10, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Add);

        const add_change = change.value as Parser.Add_change;

        assert.deepEqual(add_change.parent_position, [0]);
        assert.equal(add_change.index, 10);
        assert.equal(add_change.new_nodes.length, 2);

        {
            const new_node = add_change.new_nodes[0];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }

        {
            const new_node = add_change.new_nodes[1];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }
    });

    it("Parses removing element in the middle of an array", () => {

        const grammar_description = Grammar_examples.create_test_grammar_10_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id id id id id id id id id id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 3, 0];
        const after_change_node_position: number[] = [0, 5, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Remove);

        const remove_change = change.value as Parser.Remove_change;

        assert.deepEqual(remove_change.parent_position, [0]);
        assert.equal(remove_change.index, 3);
        assert.equal(remove_change.count, 2);
    });

    it("Parses removing element at the beginning of an array", () => {

        const grammar_description = Grammar_examples.create_test_grammar_10_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id id id id id id id id id id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 0, 0];
        const after_change_node_position: number[] = [0, 2, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Remove);

        const remove_change = change.value as Parser.Remove_change;

        assert.deepEqual(remove_change.parent_position, [0]);
        assert.equal(remove_change.index, 0);
        assert.equal(remove_change.count, 2);
    });

    it("Parses removing element at the end of an array", () => {

        const grammar_description = Grammar_examples.create_test_grammar_10_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id id id id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 3, 0];
        const after_change_node_position: number[] = [0, 4, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Remove);

        const remove_change = change.value as Parser.Remove_change;

        assert.deepEqual(remove_change.parent_position, [0]);
        assert.equal(remove_change.index, 3);
        assert.equal(remove_change.count, 1);
    });

    it("Parses adding and removing element in the middle of an array", () => {

        const grammar_description = Grammar_examples.create_test_grammar_10_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id id id id id id id id id id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "id id";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 1, 0];
        const after_change_node_position: number[] = [0, 2, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 2);

        {
            const change = second_parse_result.changes[0];

            assert.equal(change.type, Parser.Change_type.Remove);

            const remove_change = change.value as Parser.Remove_change;

            assert.deepEqual(remove_change.parent_position, [0]);
            assert.equal(remove_change.index, 1);
            assert.equal(remove_change.count, 1);
        }

        {
            const change = second_parse_result.changes[1];

            assert.equal(change.type, Parser.Change_type.Add);

            const add_change = change.value as Parser.Add_change;

            assert.deepEqual(add_change.parent_position, [0]);
            assert.equal(add_change.index, 1);
            assert.equal(add_change.new_nodes.length, 2);

            {
                const new_node = add_change.new_nodes[0];
                assert.equal(new_node.word.value, "Element");

                const child_node = new_node.children[0];
                assert.equal(child_node.word.value, "id");
            }

            {
                const new_node = add_change.new_nodes[1];
                assert.equal(new_node.word.value, "Element");

                const child_node = new_node.children[0];
                assert.equal(child_node.word.value, "id");
            }
        }
    });
});

describe("Parser.parse_incrementally array with separators", () => {

    it("Parses adding element in the middle of an array with separators", () => {

        const grammar_description = Grammar_examples.create_test_grammar_11_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id, id, id, id, id, id, id, id, id, id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "id, id,";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 2, 0];
        const after_change_node_position: number[] = [0, 2, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Add);

        const add_change = change.value as Parser.Add_change;

        assert.deepEqual(add_change.parent_position, [0]);
        assert.equal(add_change.index, 2);
        assert.equal(add_change.new_nodes.length, 4);

        {
            const new_node = add_change.new_nodes[0];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }

        {
            const new_node = add_change.new_nodes[1];
            assert.equal(new_node.word.value, ",");
            assert.equal(new_node.children.length, 0);
        }

        {
            const new_node = add_change.new_nodes[2];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }

        {
            const new_node = add_change.new_nodes[3];
            assert.equal(new_node.word.value, ",");
            assert.equal(new_node.children.length, 0);
        }
    });

    it("Parses adding element at the beginning of an array with separators", () => {

        const grammar_description = Grammar_examples.create_test_grammar_11_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id, id, id, id, id, id, id, id, id, id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "id,";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 0, 0];
        const after_change_node_position: number[] = [0, 0, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Add);

        const add_change = change.value as Parser.Add_change;

        assert.deepEqual(add_change.parent_position, [0]);
        assert.equal(add_change.index, 0);
        assert.equal(add_change.new_nodes.length, 2);

        {
            const new_node = add_change.new_nodes[0];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }

        {
            const new_node = add_change.new_nodes[1];
            assert.equal(new_node.word.value, ",");
            assert.equal(new_node.children.length, 0);
        }
    });

    it("Parses adding element at the end of an array with separators", () => {

        const grammar_description = Grammar_examples.create_test_grammar_11_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id, id, id, id, id, id, id, id, id, id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = ", id, id";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 19];
        const after_change_node_position: number[] = [0, 19];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Add);

        const add_change = change.value as Parser.Add_change;

        assert.deepEqual(add_change.parent_position, [0]);
        assert.equal(add_change.index, 19);
        assert.equal(add_change.new_nodes.length, 4);

        {
            const new_node = add_change.new_nodes[0];
            assert.equal(new_node.word.value, ",");
            assert.equal(new_node.children.length, 0);
        }

        {
            const new_node = add_change.new_nodes[1];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }

        {
            const new_node = add_change.new_nodes[2];
            assert.equal(new_node.word.value, ",");
            assert.equal(new_node.children.length, 0);
        }

        {
            const new_node = add_change.new_nodes[3];
            assert.equal(new_node.word.value, "Element");

            const child_node = new_node.children[0];
            assert.equal(child_node.word.value, "id");
        }
    });

    it("Parses removing element in the middle of an array with separators", () => {

        const grammar_description = Grammar_examples.create_test_grammar_11_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id, id, id, id, id, id, id, id, id, id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 3];
        const after_change_node_position: number[] = [0, 7];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Remove);

        const remove_change = change.value as Parser.Remove_change;

        assert.deepEqual(remove_change.parent_position, [0]);
        assert.equal(remove_change.index, 3);
        assert.equal(remove_change.count, 4);
    });

    it("Parses removing element at the beginning of an array with separators", () => {

        const grammar_description = Grammar_examples.create_test_grammar_11_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id, id, id, id, id, id, id, id, id, id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 0, 0];
        const after_change_node_position: number[] = [0, 2, 0];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Remove);

        const remove_change = change.value as Parser.Remove_change;

        assert.deepEqual(remove_change.parent_position, [0]);
        assert.equal(remove_change.index, 0);
        assert.equal(remove_change.count, 2);
    });

    it("Parses removing element at the end of an array with separators", () => {

        const grammar_description = Grammar_examples.create_test_grammar_11_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id, id, id, id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = "";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 5];
        const after_change_node_position: number[] = [0, 7];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 1);

        const change = second_parse_result.changes[0];

        assert.equal(change.type, Parser.Change_type.Remove);

        const remove_change = change.value as Parser.Remove_change;

        assert.deepEqual(remove_change.parent_position, [0]);
        assert.equal(remove_change.index, 5);
        assert.equal(remove_change.count, 2);
    });

    it("Parses adding and removing element in the middle of an array with separators", () => {

        const grammar_description = Grammar_examples.create_test_grammar_11_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const array_infos = Grammar.create_array_infos(production_rules);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "id, id, id, id, id, id, id, id, id, id";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Parser.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        const second_input = ", id";
        const second_scanned_words = Scanner.scan(second_input, 0, second_input.length);
        const start_change_node_position: number[] = [0, 1];
        const after_change_node_position: number[] = [0, 3];

        const second_parse_result = Parser.parse_incrementally(
            (first_parse_result.changes[0].value as Parser.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            array_infos,
            map_word_to_terminal
        );

        assert.notEqual(second_parse_result, undefined);

        assert.equal(second_parse_result.status, Parser.Parse_status.Accept);

        assert.equal(second_parse_result.changes.length, 2);

        {
            const change = second_parse_result.changes[0];

            assert.equal(change.type, Parser.Change_type.Remove);

            const remove_change = change.value as Parser.Remove_change;

            assert.deepEqual(remove_change.parent_position, [0]);
            assert.equal(remove_change.index, 1);
            assert.equal(remove_change.count, 2);
        }

        {
            const change = second_parse_result.changes[1];

            assert.equal(change.type, Parser.Change_type.Add);

            const add_change = change.value as Parser.Add_change;

            assert.deepEqual(add_change.parent_position, [0]);
            assert.equal(add_change.index, 1);
            assert.equal(add_change.new_nodes.length, 2);

            {
                const new_node = add_change.new_nodes[0];
                assert.equal(new_node.word.value, ",");
                assert.equal(new_node.children.length, 0);
            }

            {
                const new_node = add_change.new_nodes[1];
                assert.equal(new_node.word.value, "Element");

                const child_node = new_node.children[0];
                assert.equal(child_node.word.value, "id");
            }
        }
    });
});
