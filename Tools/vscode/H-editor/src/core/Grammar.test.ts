import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";

describe("Grammar.create_production_rules", () => {

    it("Creates production rules for description 0", () => {

        const grammar_description = Grammar_examples.create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);

        assert.equal(production_rules.length, 6);

        {
            const production_rule = production_rules[0];
            assert.equal(production_rule.lhs, "S");
            assert.deepEqual(production_rule.rhs, ["E"]);
        }

        {
            const production_rule = production_rules[1];
            assert.equal(production_rule.lhs, "E");
            assert.deepEqual(production_rule.rhs, ["T"]);
        }

        {
            const production_rule = production_rules[2];
            assert.equal(production_rule.lhs, "E");
            assert.deepEqual(production_rule.rhs, ["(", "E", ")"]);
        }

        {
            const production_rule = production_rules[3];
            assert.equal(production_rule.lhs, "T");
            assert.deepEqual(production_rule.rhs, ["n"]);
        }


        {
            const production_rule = production_rules[4];
            assert.equal(production_rule.lhs, "T");
            assert.deepEqual(production_rule.rhs, ["+", "T"]);
        }

        {
            const production_rule = production_rules[5];
            assert.equal(production_rule.lhs, "T");
            assert.deepEqual(production_rule.rhs, ["T", "+", "n"]);
        }
    });

    it("Creates production rules for description 1", () => {
        const grammar_description = Grammar_examples.create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);

        assert.equal(production_rules.length, 6);

        {
            const production_rule = production_rules[0];
            assert.equal(production_rule.lhs, "Statement");
            assert.deepEqual(production_rule.rhs, ["Expression"]);
        }

        {
            const production_rule = production_rules[1];
            assert.equal(production_rule.lhs, "Expression");
            assert.deepEqual(production_rule.rhs, ["Sum"]);
        }

        {
            const production_rule = production_rules[2];
            assert.equal(production_rule.lhs, "Expression");
            assert.deepEqual(production_rule.rhs, ["Multiplication"]);
        }

        {
            const production_rule = production_rules[3];
            assert.equal(production_rule.lhs, "Expression");
            assert.deepEqual(production_rule.rhs, ["number"]);
        }

        {
            const production_rule = production_rules[4];
            assert.equal(production_rule.lhs, "Sum");
            assert.deepEqual(production_rule.rhs, ["Expression", "+", "Expression"]);
        }

        {
            const production_rule = production_rules[5];
            assert.equal(production_rule.lhs, "Multiplication");
            assert.deepEqual(production_rule.rhs, ["Expression", "*", "Expression"]);
        }
    });

    it("Creates production rules for description 6", () => {
        const grammar_description = Grammar_examples.create_test_grammar_6_description();
        const production_rules = Grammar.create_production_rules(grammar_description);

        assert.equal(production_rules.length, 10);

        {
            const production_rule = production_rules[0];
            assert.equal(production_rule.lhs, "S");
            assert.deepEqual(production_rule.rhs, ["Function"]);
        }

        {
            const production_rule = production_rules[1];
            assert.equal(production_rule.lhs, "Function");
            assert.deepEqual(production_rule.rhs, ["Export", "Inline", "function", "(", "Arguments", ")"]);
        }

        {
            const production_rule = production_rules[2];
            assert.equal(production_rule.lhs, "Export");
            assert.deepEqual(production_rule.rhs, ["export"]);
        }

        {
            const production_rule = production_rules[3];
            assert.equal(production_rule.lhs, "Export");
            assert.deepEqual(production_rule.rhs, []);
        }

        {
            const production_rule = production_rules[4];
            assert.equal(production_rule.lhs, "Inline");
            assert.deepEqual(production_rule.rhs, ["inline"]);
        }

        {
            const production_rule = production_rules[5];
            assert.equal(production_rule.lhs, "Inline");
            assert.deepEqual(production_rule.rhs, []);
        }

        {
            const production_rule = production_rules[6];
            assert.equal(production_rule.lhs, "Arguments");
            assert.deepEqual(production_rule.rhs, []);
        }

        {
            const production_rule = production_rules[7];
            assert.equal(production_rule.lhs, "Arguments");
            assert.deepEqual(production_rule.rhs, ["Argument"]);
        }

        {
            const production_rule = production_rules[8];
            assert.equal(production_rule.lhs, "Argument");
            assert.deepEqual(production_rule.rhs, ["name", ":", "type"]);
        }

        {
            const production_rule = production_rules[9];
            assert.equal(production_rule.lhs, "Argument");
            assert.deepEqual(production_rule.rhs, ["name", ":", "type", ",", "Argument"]);
        }
    });
});

describe("Grammar.get_non_terminals", () => {
    it("Returns non-terminals for grammar 0", () => {
        const grammar_description = Grammar_examples.create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);

        assert.deepEqual(non_terminals, ["S", "E", "T"]);
    });

    it("Returns non-terminals for grammar 1", () => {
        const grammar_description = Grammar_examples.create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);

        assert.deepEqual(non_terminals, ["Statement", "Expression", "Sum", "Multiplication"]);
    });

    it("Returns non-terminals for grammar 6", () => {
        const grammar_description = Grammar_examples.create_test_grammar_6_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);

        assert.deepEqual(non_terminals, ["S", "Function", "Export", "Inline", "Arguments", "Argument"]);
    });
});

describe("Grammar.get_terminals", () => {
    it("Returns terminals for grammar 0", () => {
        const grammar_description = Grammar_examples.create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);

        assert.deepEqual(terminals, ["$", "(", ")", "+", "n"]);
    });

    it("Returns terminals for grammar 1", () => {
        const grammar_description = Grammar_examples.create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);

        assert.deepEqual(terminals, ["$", "*", "+", "number"]);
    });

    it("Returns terminals for grammar 6", () => {
        const grammar_description = Grammar_examples.create_test_grammar_6_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);

        assert.deepEqual(terminals, ["$", "(", ")", ",", ":", "export", "function", "inline", "name", "type"]);
    });
});

describe("Grammar.create_start_lr1_item_set", () => {
    it("Creates starter item set for grammar 0", () => {

        const grammar_description = Grammar_examples.create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_items = Grammar.create_start_lr1_item_set(production_rules, terminals);

        // S -> .E, $
        // E -> .T, $
        // E -> .( E ), $
        // T -> .n, $
        // T -> .n, +
        // T -> .+ T, $
        // T -> .+ T, +
        // T -> .T + n, $
        // T -> .T + n, +
        assert.equal(lr1_items.length, 9);

        {
            // S -> .E, $
            const item = lr1_items[0];
            assert.equal(item.production_rule_index, 0);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // E -> .T, $
            const item = lr1_items[1];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // E -> .( E ), $
            const item = lr1_items[2];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // T -> .n, $
            const item = lr1_items[3];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // T -> .n, +
            const item = lr1_items[4];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }

        {
            // T -> .+ T, $
            const item = lr1_items[5];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // T -> .+ T, +
            const item = lr1_items[6];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }

        {
            // T -> .T + n, $
            const item = lr1_items[7];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // T -> .T + n, +
            const item = lr1_items[8];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }
    });

    it("Creates starter item set for grammar 1", () => {

        const grammar_description = Grammar_examples.create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_items = Grammar.create_start_lr1_item_set(production_rules, terminals);

        assert.equal(lr1_items.length, 16);

        {
            // Statement -> .Expression, $
            const item = lr1_items[0];
            assert.equal(item.production_rule_index, 0);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // Expression -> .Sum, $
            const item = lr1_items[1];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // Expression -> .Sum, *
            const item = lr1_items[2];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "*");
        }

        {
            // Expression -> .Sum, +
            const item = lr1_items[3];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }

        {
            // Expression -> .Multiplication, $
            const item = lr1_items[4];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // Expression -> .Multiplication, *
            const item = lr1_items[5];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "*");
        }

        {
            // Expression -> .Multiplication, +
            const item = lr1_items[6];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }

        {
            // Expression -> .number, $
            const item = lr1_items[7];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // Expression -> .number, *
            const item = lr1_items[8];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "*");
        }

        {
            // Expression -> .number, +
            const item = lr1_items[9];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }

        {
            // Sum -> .Expression + Expression, $
            const item = lr1_items[10];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // Sum -> .Expression + Expression, *
            const item = lr1_items[11];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "*");
        }

        {
            // Sum -> .Expression + Expression, +
            const item = lr1_items[12];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }

        {
            // Multiplication -> .Expression * Expression, $
            const item = lr1_items[13];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // Multiplication -> .Expression * Expression, *
            const item = lr1_items[14];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "*");
        }

        {
            // Multiplication -> .Expression * Expression, +
            const item = lr1_items[15];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }
    });
});

describe("Grammar.create_next_lr1_item_set", () => {
    it("Creates LR1 item sets from grammar 0", () => {

        const grammar_description = Grammar_examples.create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);

        // S -> .E, $
        // E -> .T, $
        // E -> .( E ), $
        // T -> .n, $
        // T -> .n, +
        // T -> .+ T, $
        // T -> .+ T, +
        // T -> .T + n, $
        // T -> .T + n, +

        for (const item of lr1_item_set_0) {
            console.log(Grammar.lr1_item_to_string(production_rules, item));
        }

        {
            const lr1_item_set_1 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "E");

            // S -> E., $
            assert.equal(lr1_item_set_1.length, 1);

            {
                // S -> E., $
                const item = lr1_item_set_1[0];
                assert.equal(item.production_rule_index, 0);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }
        }

        {
            const lr1_item_set_2 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "T");

            // E -> T., $
            // T -> T .+ n, $
            // T -> T .+ n, +
            assert.equal(lr1_item_set_2.length, 3);

            {
                // E -> T., $
                const item = lr1_item_set_2[0];
                assert.equal(item.production_rule_index, 1);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> T. + n, $
                const item = lr1_item_set_2[1];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> T. + n, +
                const item = lr1_item_set_2[2];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "+");
            }
        }

        {
            const lr1_item_set_3 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "n");

            // T -> n., $
            // T -> n., +
            assert.equal(lr1_item_set_3.length, 2);

            {
                // T -> n., $
                const item = lr1_item_set_3[0];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> n., +
                const item = lr1_item_set_3[1];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "+");
            }
        }

        {
            const lr1_item_set_4 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "+");

            // T -> + .T, $
            // T -> + .T, +
            // T -> .n, $
            // T -> .n, +
            // T -> .+ T, $
            // T -> .+ T, +
            // T -> .T + n, $
            // T -> .T + n, +
            assert.equal(lr1_item_set_4.length, 8);

            {
                // T -> + .T, $
                const item = lr1_item_set_4[0];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> + .T, +
                const item = lr1_item_set_4[1];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .n, $
                const item = lr1_item_set_4[2];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .n, +
                const item = lr1_item_set_4[3];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .+ T, $
                const item = lr1_item_set_4[4];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .+ T, +
                const item = lr1_item_set_4[5];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .T + n, $
                const item = lr1_item_set_4[6];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .T + n, +
                const item = lr1_item_set_4[7];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }
        }

        {
            const lr1_item_set_5 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "(");

            // E -> ( .E ), $
            // E -> .T, )
            // E -> .( E ), )
            // T -> .n, )
            // T -> .n, +
            // T -> .+ T, )
            // T -> .+ T, +
            // T -> .T + n, )
            // T -> .T + n, +
            assert.equal(lr1_item_set_5.length, 9);

            {
                // E -> ( .E ), $
                const item = lr1_item_set_5[0];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // E -> .T, )
                const item = lr1_item_set_5[1];
                assert.equal(item.production_rule_index, 1);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // E -> .( E ), )
                const item = lr1_item_set_5[2];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .n, )
                const item = lr1_item_set_5[3];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .n, +
                const item = lr1_item_set_5[4];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .+ T, )
                const item = lr1_item_set_5[5];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .+ T, +
                const item = lr1_item_set_5[6];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .T + n, )
                const item = lr1_item_set_5[7];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .T + n, +
                const item = lr1_item_set_5[8];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }
        }
    });

    it("Creates LR1 item sets from grammar 2", () => {

        const grammar_description = Grammar_examples.create_test_grammar_2_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);

        // 0 Start -> S
        // 1 S -> A A
        // 2 A -> a A
        // 3 A -> b

        // Start -> .S , $
        // S -> .A A, $
        // A -> .a A, a
        // A -> .a A, b
        // A -> .b, a
        // A -> .b, b

        {
            const lr1_item_set_1 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "S");

            // Start -> S., $
            assert.equal(lr1_item_set_1.length, 1);

            {
                const item = lr1_item_set_1[0];
                assert.equal(item.production_rule_index, 0);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }
        }

        {
            const lr1_item_set_2 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "A");

            // S -> A .A, $
            // A -> .a A, $
            // A -> .b, $
            assert.equal(lr1_item_set_2.length, 3);

            {
                const item = lr1_item_set_2[0];
                assert.equal(item.production_rule_index, 1);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                const item = lr1_item_set_2[1];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                const item = lr1_item_set_2[2];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }
        }

        {
            const lr1_item_set_3 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "a");

            // A -> a .A, a
            // A -> a .A, b
            // A -> .a A, a
            // A -> .a A, b
            // A -> .b, a
            // A -> .b, b

            assert.equal(lr1_item_set_3.length, 6);

            {
                const item = lr1_item_set_3[0];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "a");
            }

            {
                const item = lr1_item_set_3[1];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "b");
            }

            {
                const item = lr1_item_set_3[2];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "a");
            }

            {
                const item = lr1_item_set_3[3];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "b");
            }

            {
                const item = lr1_item_set_3[4];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "a");
            }

            {
                const item = lr1_item_set_3[5];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "b");
            }
        }

        {
            const lr1_item_set_4 = Grammar.create_next_lr1_item_set(production_rules, terminals, lr1_item_set_0, "b");

            // A -> b., a
            // A -> b., b
            assert.equal(lr1_item_set_4.length, 2);

            {
                const item = lr1_item_set_4[0];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "a");
            }

            {
                const item = lr1_item_set_4[1];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "b");
            }
        }
    });
});

describe("Grammar.create_lr1_graph", () => {
    it("Creates graph edges for grammar 2", () => {

        const grammar_description = Grammar_examples.create_test_grammar_2_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const edges = graph.edges;

        assert.equal(edges.length, 13);

        assert.deepEqual(edges[0], { from_state: 0, to_state: 1, label: "A" });
        assert.deepEqual(edges[1], { from_state: 0, to_state: 2, label: "S" });
        assert.deepEqual(edges[2], { from_state: 0, to_state: 3, label: "a" });
        assert.deepEqual(edges[3], { from_state: 0, to_state: 4, label: "b" });
        assert.deepEqual(edges[4], { from_state: 1, to_state: 5, label: "A" });
        assert.deepEqual(edges[5], { from_state: 1, to_state: 6, label: "a" });
        assert.deepEqual(edges[6], { from_state: 1, to_state: 7, label: "b" });
        assert.deepEqual(edges[7], { from_state: 3, to_state: 8, label: "A" });
        assert.deepEqual(edges[8], { from_state: 3, to_state: 3, label: "a" });
        assert.deepEqual(edges[9], { from_state: 3, to_state: 4, label: "b" });
        assert.deepEqual(edges[10], { from_state: 6, to_state: 9, label: "A" });
        assert.deepEqual(edges[11], { from_state: 6, to_state: 6, label: "a" });
        assert.deepEqual(edges[12], { from_state: 6, to_state: 7, label: "b" });
    });

    it("Creates graph edges for grammar 3", () => {

        const grammar_description = Grammar_examples.create_test_grammar_3_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);
        const edges = graph.edges;

        assert.equal(edges.length, 38);

        assert.deepEqual(edges[0], { from_state: 0, to_state: 1, label: "(" });
        assert.deepEqual(edges[1], { from_state: 0, to_state: 2, label: "Addition" });
        assert.deepEqual(edges[2], { from_state: 0, to_state: 3, label: "Basic" });
        assert.deepEqual(edges[3], { from_state: 0, to_state: 4, label: "Multiplication" });
        assert.deepEqual(edges[4], { from_state: 0, to_state: 5, label: "number" });
        assert.deepEqual(edges[5], { from_state: 1, to_state: 6, label: "(" });
        assert.deepEqual(edges[6], { from_state: 1, to_state: 7, label: "Addition" });
        assert.deepEqual(edges[7], { from_state: 1, to_state: 8, label: "Basic" });
        assert.deepEqual(edges[8], { from_state: 1, to_state: 9, label: "Multiplication" });
        assert.deepEqual(edges[9], { from_state: 1, to_state: 10, label: "number" });
        assert.deepEqual(edges[10], { from_state: 2, to_state: 11, label: "+" });
        assert.deepEqual(edges[11], { from_state: 4, to_state: 12, label: "*" });
        assert.deepEqual(edges[12], { from_state: 6, to_state: 6, label: "(" });
        assert.deepEqual(edges[13], { from_state: 6, to_state: 13, label: "Addition" });
        assert.deepEqual(edges[14], { from_state: 6, to_state: 8, label: "Basic" });
        assert.deepEqual(edges[15], { from_state: 6, to_state: 9, label: "Multiplication" });
        assert.deepEqual(edges[16], { from_state: 6, to_state: 10, label: "number" });
        assert.deepEqual(edges[17], { from_state: 7, to_state: 14, label: ")" });
        assert.deepEqual(edges[18], { from_state: 7, to_state: 15, label: "+" });
        assert.deepEqual(edges[19], { from_state: 9, to_state: 16, label: "*" });
        assert.deepEqual(edges[20], { from_state: 11, to_state: 1, label: "(" });
        assert.deepEqual(edges[21], { from_state: 11, to_state: 3, label: "Basic" });
        assert.deepEqual(edges[22], { from_state: 11, to_state: 17, label: "Multiplication" });
        assert.deepEqual(edges[23], { from_state: 11, to_state: 5, label: "number" });
        assert.deepEqual(edges[24], { from_state: 12, to_state: 1, label: "(" });
        assert.deepEqual(edges[25], { from_state: 12, to_state: 18, label: "Basic" });
        assert.deepEqual(edges[26], { from_state: 12, to_state: 5, label: "number" });
        assert.deepEqual(edges[27], { from_state: 13, to_state: 19, label: ")" });
        assert.deepEqual(edges[28], { from_state: 13, to_state: 15, label: "+" });
        assert.deepEqual(edges[29], { from_state: 15, to_state: 6, label: "(" });
        assert.deepEqual(edges[30], { from_state: 15, to_state: 8, label: "Basic" });
        assert.deepEqual(edges[31], { from_state: 15, to_state: 20, label: "Multiplication" });
        assert.deepEqual(edges[32], { from_state: 15, to_state: 10, label: "number" });
        assert.deepEqual(edges[33], { from_state: 16, to_state: 6, label: "(" });
        assert.deepEqual(edges[34], { from_state: 16, to_state: 21, label: "Basic" });
        assert.deepEqual(edges[35], { from_state: 16, to_state: 10, label: "number" });
        assert.deepEqual(edges[36], { from_state: 17, to_state: 12, label: "*" });
        assert.deepEqual(edges[37], { from_state: 20, to_state: 16, label: "*" });
    });
});

describe("Grammar.create_parsing_tables", () => {
    it("Creates parsing tables for grammar 3", () => {

        const grammar_description = Grammar_examples.create_test_grammar_3_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);

        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const actual_action_table = parsing_tables.action_table;
        const actual_go_to_table = parsing_tables.go_to_table;

        const expected_action_table: Grammar.Action_column[][] = [
            [ // 0
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
            ],
            [ // 1
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 10 } } },
            ],
            [ // 2
                { label: "$", action: { type: Grammar.Action_type.Accept, value: { lhs: "Start", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 11 } } },
            ],
            [ // 3
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
            ],
            [ // 4
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 12 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 1 } } },
            ],
            [ // 5
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
            ],
            [ // 6
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 10 } } },
            ],
            [ // 7
                { label: ")", action: { type: Grammar.Action_type.Shift, value: { next_state: 14 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 15 } } },
            ],
            [ // 8
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
            ],
            [ // 9

                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 16 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 1 } } },
            ],
            [ // 10
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
            ],
            [ // 11
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
            ],
            [ // 12
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
            ],
            [ // 13
                { label: ")", action: { type: Grammar.Action_type.Shift, value: { next_state: 19 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 15 } } },
            ],
            [ // 14
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
            ],
            [ // 15
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 10 } } },
            ],
            [ // 16
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 10 } } },
            ],
            [ // 17
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 12 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 3 } } },
            ],
            [ // 18
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
            ],
            [ // 19
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
            ],
            [ // 20
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 16 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 3 } } },
            ],
            [ // 21
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
            ],
        ];

        const expected_go_to_table: Grammar.Go_to_column[][] = [
            [ // 0
                { label: "Addition", next_state: 2 },
                { label: "Basic", next_state: 3 },
                { label: "Multiplication", next_state: 4 },
            ],
            [ // 1
                { label: "Addition", next_state: 7 },
                { label: "Basic", next_state: 8 },
                { label: "Multiplication", next_state: 9 },
            ],
            [ // 2
            ],
            [ // 3
            ],
            [ // 4
            ],
            [ // 5
            ],
            [ // 6
                { label: "Addition", next_state: 13 },
                { label: "Basic", next_state: 8 },
                { label: "Multiplication", next_state: 9 },
            ],
            [ // 7
            ],
            [ // 8
            ],
            [ // 9
            ],
            [ // 10
            ],
            [ // 11
                { label: "Basic", next_state: 3 },
                { label: "Multiplication", next_state: 17 },
            ],
            [ // 12
                { label: "Basic", next_state: 18 },
            ],
            [ // 13
            ],
            [ // 14
            ],
            [ // 15
                { label: "Basic", next_state: 8 },
                { label: "Multiplication", next_state: 20 },
            ],
            [ // 16
                { label: "Basic", next_state: 21 },
            ],
            [ // 17
            ],
            [ // 18
            ],
            [ // 19
            ],
            [ // 20
            ],
            [ // 21
            ],
        ];

        assert.equal(actual_action_table.length, expected_action_table.length);

        for (let state_index = 0; state_index < actual_action_table.length; state_index++) {

            const actual_row = actual_action_table[state_index];
            const expected_row = expected_action_table[state_index];
            assert.equal(actual_row.length, expected_row.length);

            for (let action_index = 0; action_index < actual_row.length; ++action_index) {

                //console.log(`${state_index} ${action_index}`);

                const actual = actual_row[action_index];
                const expected = expected_row[action_index];
                assert.deepEqual(actual, expected);
            }
        }

        assert.equal(actual_go_to_table.length, expected_go_to_table.length);

        for (let state_index = 0; state_index < actual_go_to_table.length; state_index++) {

            const actual_row = actual_go_to_table[state_index];
            const expected_row = expected_go_to_table[state_index];
            assert.equal(actual_row.length, expected_row.length);

            for (let action_index = 0; action_index < actual_row.length; ++action_index) {

                //console.log(`${state_index} ${action_index}`);

                const actual = actual_row[action_index];
                const expected = expected_row[action_index];
                assert.deepEqual(actual, expected);
            }
        }
    });

    it("Creates parsing tables for grammar 6", () => {

        const grammar_description = Grammar_examples.create_test_grammar_6_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, terminals);
        const graph = Grammar.create_lr1_graph(production_rules, terminals, lr1_item_set_0);

        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);
        const actual_action_table = parsing_tables.action_table;
        const actual_go_to_table = parsing_tables.go_to_table;

        const expected_action_table: Grammar.Action_column[][] = [
            [ // 0
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
            ],
            [ // 1
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 10 } } },
            ],
            [ // 2
                { label: "$", action: { type: Grammar.Action_type.Accept, value: { lhs: "Start", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 11 } } },
            ],
            [ // 3
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
            ],
            [ // 4
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 12 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 1 } } },
            ],
            [ // 5
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
            ],
            [ // 6
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 10 } } },
            ],
            [ // 7
                { label: ")", action: { type: Grammar.Action_type.Shift, value: { next_state: 14 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 15 } } },
            ],
            [ // 8
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 1 } } },
            ],
            [ // 9

                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 16 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 1 } } },
            ],
            [ // 10
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 1 } } },
            ],
            [ // 11
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
            ],
            [ // 12
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
            ],
            [ // 13
                { label: ")", action: { type: Grammar.Action_type.Shift, value: { next_state: 19 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 15 } } },
            ],
            [ // 14
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
            ],
            [ // 15
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 10 } } },
            ],
            [ // 16
                { label: "(", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "number", action: { type: Grammar.Action_type.Shift, value: { next_state: 10 } } },
            ],
            [ // 17
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 12 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 3 } } },
            ],
            [ // 18
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
            ],
            [ // 19
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Basic", rhs_count: 3 } } },
            ],
            [ // 20
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 16 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Addition", rhs_count: 3 } } },
            ],
            [ // 21
                { label: ")", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "Multiplication", rhs_count: 3 } } },
            ],
        ];

        const expected_go_to_table: Grammar.Go_to_column[][] = [
            [ // 0
                { label: "Addition", next_state: 2 },
                { label: "Basic", next_state: 3 },
                { label: "Multiplication", next_state: 4 },
            ],
            [ // 1
                { label: "Addition", next_state: 7 },
                { label: "Basic", next_state: 8 },
                { label: "Multiplication", next_state: 9 },
            ],
            [ // 2
            ],
            [ // 3
            ],
            [ // 4
            ],
            [ // 5
            ],
            [ // 6
                { label: "Addition", next_state: 13 },
                { label: "Basic", next_state: 8 },
                { label: "Multiplication", next_state: 9 },
            ],
            [ // 7
            ],
            [ // 8
            ],
            [ // 9
            ],
            [ // 10
            ],
            [ // 11
                { label: "Basic", next_state: 3 },
                { label: "Multiplication", next_state: 17 },
            ],
            [ // 12
                { label: "Basic", next_state: 18 },
            ],
            [ // 13
            ],
            [ // 14
            ],
            [ // 15
                { label: "Basic", next_state: 8 },
                { label: "Multiplication", next_state: 20 },
            ],
            [ // 16
                { label: "Basic", next_state: 21 },
            ],
            [ // 17
            ],
            [ // 18
            ],
            [ // 19
            ],
            [ // 20
            ],
            [ // 21
            ],
        ];

        assert.equal(actual_action_table.length, expected_action_table.length);

        for (let state_index = 0; state_index < actual_action_table.length; state_index++) {

            const actual_row = actual_action_table[state_index];
            const expected_row = expected_action_table[state_index];
            assert.equal(actual_row.length, expected_row.length);

            for (let action_index = 0; action_index < actual_row.length; ++action_index) {

                //console.log(`${state_index} ${action_index}`);

                const actual = actual_row[action_index];
                const expected = expected_row[action_index];
                assert.deepEqual(actual, expected);
            }
        }

        assert.equal(actual_go_to_table.length, expected_go_to_table.length);

        for (let state_index = 0; state_index < actual_go_to_table.length; state_index++) {

            const actual_row = actual_go_to_table[state_index];
            const expected_row = expected_go_to_table[state_index];
            assert.equal(actual_row.length, expected_row.length);

            for (let action_index = 0; action_index < actual_row.length; ++action_index) {

                //console.log(`${state_index} ${action_index}`);

                const actual = actual_row[action_index];
                const expected = expected_row[action_index];
                assert.deepEqual(actual, expected);
            }
        }
    });
});