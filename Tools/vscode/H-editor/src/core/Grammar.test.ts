import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Scanner from "./Scanner";

function create_test_grammar_0_description(): string[] {
    return [
        "S -> E",
        "E -> T",
        "E -> ( E )",
        "T -> n",
        "T -> + T",
        "T -> T + n"
    ];
}

function create_test_grammar_1_description(): string[] {

    return [
        "Statement -> Expression",
        "Expression -> Sum | Multiplication | number",
        "Sum -> Expression + Expression",
        "Multiplication -> Expression * Expression",
    ];
}

describe("Grammar.create_production_rules", () => {


    it("Creates production rules for description 0", () => {

        const grammar_description = create_test_grammar_0_description();
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
        const grammar_description = create_test_grammar_1_description();
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
});

describe("Grammar.get_non_terminals", () => {
    it("Returns non-terminals for grammar 0", () => {
        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);

        assert.deepEqual(non_terminals, ["S", "E", "T"]);
    });

    it("Returns non-terminals for grammar 1", () => {
        const grammar_description = create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);

        assert.deepEqual(non_terminals, ["Statement", "Expression", "Sum", "Multiplication"]);
    });
});

describe("Grammar.get_terminals", () => {
    it("Returns terminals for grammar 0", () => {
        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);

        assert.deepEqual(terminals, ["$", "(", ")", "+", "n"]);
    });

    it("Returns terminals for grammar 1", () => {
        const grammar_description = create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);

        assert.deepEqual(terminals, ["$", "*", "+", "number"]);
    });
});

describe("Grammar.first", () => {

    it("Returns first terminals for each production rule of grammar 0", () => {
        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);

        {
            const first_terminals = rules_first_terminals.get("S");
            assert.deepEqual(first_terminals, ["n", "+", "("]);
        }

        {
            const first_terminals = rules_first_terminals.get("E");
            assert.deepEqual(first_terminals, ["n", "+", "("]);
        }

        {
            const first_terminals = rules_first_terminals.get("T");
            assert.deepEqual(first_terminals, ["n", "+"]);
        }

        {
            const first_terminals = rules_first_terminals.get("$");
            assert.deepEqual(first_terminals, ["$"]);
        }

        {
            const first_terminals = rules_first_terminals.get("(");
            assert.deepEqual(first_terminals, ["("]);
        }

        {
            const first_terminals = rules_first_terminals.get(")");
            assert.deepEqual(first_terminals, [")"]);
        }

        {
            const first_terminals = rules_first_terminals.get("+");
            assert.deepEqual(first_terminals, ["+"]);
        }

        {
            const first_terminals = rules_first_terminals.get("n");
            assert.deepEqual(first_terminals, ["n"]);
        }
    });

    it("Returns first terminals for each production rule of grammar 1", () => {
        const grammar_description = create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);

        {
            const first_terminals = rules_first_terminals.get("Statement");
            assert.deepEqual(first_terminals, ["number"]);
        }

        {
            const first_terminals = rules_first_terminals.get("Expression");
            assert.deepEqual(first_terminals, ["number"]);
        }

        {
            const first_terminals = rules_first_terminals.get("Sum");
            assert.deepEqual(first_terminals, ["number"]);
        }

        {
            const first_terminals = rules_first_terminals.get("Multiplication");
            assert.deepEqual(first_terminals, ["number"]);
        }

        {
            const first_terminals = rules_first_terminals.get("$");
            assert.deepEqual(first_terminals, ["$"]);
        }

        {
            const first_terminals = rules_first_terminals.get("*");
            assert.deepEqual(first_terminals, ["*"]);
        }

        {
            const first_terminals = rules_first_terminals.get("+");
            assert.deepEqual(first_terminals, ["+"]);
        }

        {
            const first_terminals = rules_first_terminals.get("number");
            assert.deepEqual(first_terminals, ["number"]);
        }
    });
});

describe("Grammar.create_lr0_item_set", () => {
    it("Creates LR0 item set for grammar 0 starting at production rule 0 label index 0", () => {

        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const lr0_items = Grammar.create_lr0_item_set(production_rules, 0, 0);

        assert.equal(lr0_items.length, 6);

        {
            // S -> .E
            const item = lr0_items[0];
            assert.equal(item.production_rule_index, 0);
            assert.equal(item.label_index, 0);
        }

        {
            // E -> .T
            const item = lr0_items[1];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.label_index, 0);
        }

        {
            // E -> .( E )
            const item = lr0_items[2];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.label_index, 0);
        }

        {
            // T -> .n
            const item = lr0_items[3];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
        }

        {
            // T -> .+ T
            const item = lr0_items[4];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
        }

        {
            // T -> .T + n
            const item = lr0_items[5];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
        }
    });

    it("Creates LR0 item set for grammar 1 starting at production rule 0 label index 0", () => {

        const grammar_description = create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const lr0_items = Grammar.create_lr0_item_set(production_rules, 0, 0);

        assert.equal(lr0_items.length, 6);

        {
            // Statement -> .Expression
            const item = lr0_items[0];
            assert.equal(item.production_rule_index, 0);
            assert.equal(item.label_index, 0);
        }

        {
            // Expression -> .Sum
            const item = lr0_items[1];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.label_index, 0);
        }

        {
            // Expression -> .Multiplication
            const item = lr0_items[2];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.label_index, 0);
        }

        {
            // Expression -> .number
            const item = lr0_items[3];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
        }

        {
            // Sum -> .Expression + Expression
            const item = lr0_items[4];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
        }

        {
            // Multiplication -> .Expression * Expression
            const item = lr0_items[5];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
        }
    });
});

describe("Grammar.follow_of_non_terminals", () => {
    it("Returns follow terminals for each non-terminal of grammar 0", () => {

        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const non_terminals_follow = Grammar.follow_of_non_terminals(production_rules, non_terminals, rules_first_terminals);

        {
            const follow_terminals = non_terminals_follow.get("S");
            assert.deepEqual(follow_terminals, ["$"]);
        }

        {
            const follow_terminals = non_terminals_follow.get("E");
            assert.deepEqual(follow_terminals, ["$", ")"]);
        }

        {
            const follow_terminals = non_terminals_follow.get("T");
            assert.deepEqual(follow_terminals, ["$", ")", "+"]);
        }
    });

    it("Returns follow terminals for each non-terminal of grammar 1", () => {

        const grammar_description = create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const non_terminals_follow = Grammar.follow_of_non_terminals(production_rules, non_terminals, rules_first_terminals);

        {
            const follow_terminals = non_terminals_follow.get("Statement");
            assert.deepEqual(follow_terminals, ["$"]);
        }

        {
            const follow_terminals = non_terminals_follow.get("Expression");
            assert.deepEqual(follow_terminals, ["$", "*", "+"]);
        }

        {
            const follow_terminals = non_terminals_follow.get("Sum");
            assert.deepEqual(follow_terminals, ["$", "*", "+"]);
        }

        {
            const follow_terminals = non_terminals_follow.get("Multiplication");
            assert.deepEqual(follow_terminals, ["$", "*", "+"]);
        }
    });
});

describe("Grammar.follow_of_item_set", () => {
    it("Returns follow terminals for item set 0.0 of grammar 0", () => {

        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr0_items = Grammar.create_lr0_item_set(production_rules, 0, 0);
        const non_terminals_follow = Grammar.follow_of_non_terminals(production_rules, non_terminals, rules_first_terminals);
        const item_set_follow = Grammar.follow_of_item_set(production_rules, lr0_items, non_terminals, non_terminals_follow);

        {
            const follow_terminals = item_set_follow.get("S");
            assert.deepEqual(follow_terminals, ["$"]);
        }

        {
            const follow_terminals = item_set_follow.get("E");
            assert.deepEqual(follow_terminals, ["$", ")"]);
        }

        {
            const follow_terminals = item_set_follow.get("T");
            assert.deepEqual(follow_terminals, ["$", ")", "+"]);
        }
    });

    it("Returns follow terminals for item set 0.0 of grammar 1", () => {

        const grammar_description = create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr0_items = Grammar.create_lr0_item_set(production_rules, 0, 0);
        const non_terminals_follow = Grammar.follow_of_non_terminals(production_rules, non_terminals, rules_first_terminals);
        const item_set_follow = Grammar.follow_of_item_set(production_rules, lr0_items, non_terminals, non_terminals_follow);

        {
            const follow_terminals = item_set_follow.get("Statement");
            assert.deepEqual(follow_terminals, ["$"]);
        }

        {
            const follow_terminals = item_set_follow.get("Expression");
            assert.deepEqual(follow_terminals, ["$", "*", "+"]);
        }

        {
            const follow_terminals = item_set_follow.get("Sum");
            assert.deepEqual(follow_terminals, ["$", "*", "+"]);
        }

        {
            const follow_terminals = item_set_follow.get("Multiplication");
            assert.deepEqual(follow_terminals, ["$", "*", "+"]);
        }
    });
});

describe("Grammar.create_lr1_item_set", () => {
    it("Creates LR0 item set for grammar 0 starting at production rule 0 label index 0", () => {

        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr0_items = Grammar.create_lr0_item_set(production_rules, 0, 0);
        const non_terminals_follow = Grammar.follow_of_non_terminals(production_rules, non_terminals, rules_first_terminals);
        const lr1_items = Grammar.create_lr1_item_set(production_rules, lr0_items, non_terminals_follow);

        // S -> .E, $
        // E -> .T, $
        // E -> .T, )
        // E -> .( E ), $
        // E -> .( E ), )
        // T -> .n, $
        // T -> .n, )
        // T -> .n, +
        // T -> .+ T, $
        // T -> .+ T, )
        // T -> .+ T, +
        // T -> .T + n, $
        // T -> .T + n, )
        // T -> .T + n, +
        assert.equal(lr1_items.length, 14);

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
            // E -> .T, )
            const item = lr1_items[2];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, ")");
        }

        {
            // E -> .( E ), $
            const item = lr1_items[3];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // E -> .( E ), )
            const item = lr1_items[4];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, ")");
        }

        {
            // T -> .n, $
            const item = lr1_items[5];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // T -> .n, )
            const item = lr1_items[6];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, ")");
        }

        {
            // T -> .n, +
            const item = lr1_items[7];
            assert.equal(item.production_rule_index, 3);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }

        {
            // T -> .+ T, $
            const item = lr1_items[8];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // T -> .+ T, )
            const item = lr1_items[9];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, ")");
        }

        {
            // T -> .+ T, +
            const item = lr1_items[10];
            assert.equal(item.production_rule_index, 4);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }

        {
            // T -> .T + n, $
            const item = lr1_items[11];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "$");
        }

        {
            // T -> .T + n, )
            const item = lr1_items[12];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, ")");
        }

        {
            // T -> .T + n, +
            const item = lr1_items[13];
            assert.equal(item.production_rule_index, 5);
            assert.equal(item.label_index, 0);
            assert.equal(item.follow_terminal, "+");
        }
    });

    it("Creates LR0 item set for grammar 1 starting at production rule 0 label index 0", () => {

        const grammar_description = create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr0_items = Grammar.create_lr0_item_set(production_rules, 0, 0);
        const non_terminals_follow = Grammar.follow_of_non_terminals(production_rules, non_terminals, rules_first_terminals);
        const lr1_items = Grammar.create_lr1_item_set(production_rules, lr0_items, non_terminals_follow);

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
    it("Creates LR1 item set after set 0 for grammar 0 starting at production rule 0 label index 0", () => {

        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr0_items = Grammar.create_lr0_item_set(production_rules, 0, 0);
        const non_terminals_follow = Grammar.follow_of_non_terminals(production_rules, non_terminals, rules_first_terminals);
        const lr1_item_set_0 = Grammar.create_lr1_item_set(production_rules, lr0_items, non_terminals_follow);

        // S -> .E, $
        // E -> .T, $
        // E -> .T, )
        // E -> .( E ), $
        // E -> .( E ), )
        // T -> .n, $
        // T -> .n, )
        // T -> .n, +
        // T -> .+ T, $
        // T -> .+ T, )
        // T -> .+ T, +
        // T -> .T + n, $
        // T -> .T + n, )
        // T -> .T + n, +

        {
            const lr1_item_set_1 = Grammar.create_next_lr1_item_set(production_rules, lr1_item_set_0, lr1_item_set_0, "E", non_terminals_follow);

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
            const lr1_item_set_2 = Grammar.create_next_lr1_item_set(production_rules, lr1_item_set_0, lr1_item_set_0, "T", non_terminals_follow);

            // E -> T., $
            // E -> T., )
            // T -> T .+ n, $
            // T -> T .+ n, )
            // T -> T .+ n, +
            assert.equal(lr1_item_set_2.length, 5);

            {
                // E -> T., $
                const item = lr1_item_set_2[0];
                assert.equal(item.production_rule_index, 1);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // E -> T., )
                const item = lr1_item_set_2[1];
                assert.equal(item.production_rule_index, 1);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> T. + n, $
                const item = lr1_item_set_2[2];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> T. + n, )
                const item = lr1_item_set_2[3];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> T. + n, +
                const item = lr1_item_set_2[4];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "+");
            }
        }

        {
            const lr1_item_set_3 = Grammar.create_next_lr1_item_set(production_rules, lr1_item_set_0, lr1_item_set_0, "n", non_terminals_follow);

            // T -> n., $
            // T -> n., )
            // T -> n., +
            assert.equal(lr1_item_set_3.length, 3);

            {
                // T -> n., $
                const item = lr1_item_set_3[0];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> n., )
                const item = lr1_item_set_3[1];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> n., +
                const item = lr1_item_set_3[2];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "+");
            }
        }

        {
            const lr1_item_set_4 = Grammar.create_next_lr1_item_set(production_rules, lr1_item_set_0, lr1_item_set_0, "+", non_terminals_follow);

            // T -> + .T, $
            // T -> + .T, )
            // T -> + .T, +
            // T -> .n, $
            // T -> .n, )
            // T -> .n, +
            // T -> .+ T, $
            // T -> .+ T, )
            // T -> .+ T, +
            // T -> .T + n, $
            // T -> .T + n, )
            // T -> .T + n, +
            assert.equal(lr1_item_set_4.length, 12);

            {
                // T -> + .T, $
                const item = lr1_item_set_4[0];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> + .T, )
                const item = lr1_item_set_4[1];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> + .T, +
                const item = lr1_item_set_4[2];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .n, $
                const item = lr1_item_set_4[3];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .n, )
                const item = lr1_item_set_4[4];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .n, +
                const item = lr1_item_set_4[5];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .+ T, $
                const item = lr1_item_set_4[6];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .+ T, )
                const item = lr1_item_set_4[7];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .+ T, +
                const item = lr1_item_set_4[8];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .T + n, $
                const item = lr1_item_set_4[9];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .T + n, )
                const item = lr1_item_set_4[10];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .T + n, +
                const item = lr1_item_set_4[11];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }
        }

        {
            const lr1_item_set_5 = Grammar.create_next_lr1_item_set(production_rules, lr1_item_set_0, lr1_item_set_0, "(", non_terminals_follow);

            // E -> ( .E ), $
            // E -> ( .E ), )
            // E -> .T, $
            // E -> .T, )
            // E -> .( E ), $
            // E -> .( E ), )
            // T -> .n, $
            // T -> .n, )
            // T -> .n, +
            // T -> .+ T, $
            // T -> .+ T, )
            // T -> .+ T, +
            // T -> .T + n, $
            // T -> .T + n, )
            // T -> .T + n, +
            assert.equal(lr1_item_set_5.length, 15);

            {
                // E -> ( .E ), $
                const item = lr1_item_set_5[0];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // E -> ( .E ), )
                const item = lr1_item_set_5[1];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 1);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // E -> .T, $
                const item = lr1_item_set_5[2];
                assert.equal(item.production_rule_index, 1);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // E -> .T, )
                const item = lr1_item_set_5[3];
                assert.equal(item.production_rule_index, 1);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // E -> .( E ), $
                const item = lr1_item_set_5[4];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // E -> .( E ), )
                const item = lr1_item_set_5[5];
                assert.equal(item.production_rule_index, 2);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .n, $
                const item = lr1_item_set_5[6];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .n, )
                const item = lr1_item_set_5[7];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .n, +
                const item = lr1_item_set_5[8];
                assert.equal(item.production_rule_index, 3);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .+ T, $
                const item = lr1_item_set_5[9];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .+ T, )
                const item = lr1_item_set_5[10];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .+ T, +
                const item = lr1_item_set_5[11];
                assert.equal(item.production_rule_index, 4);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }

            {
                // T -> .T + n, $
                const item = lr1_item_set_5[12];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "$");
            }

            {
                // T -> .T + n, )
                const item = lr1_item_set_5[13];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, ")");
            }

            {
                // T -> .T + n, +
                const item = lr1_item_set_5[14];
                assert.equal(item.production_rule_index, 5);
                assert.equal(item.label_index, 0);
                assert.equal(item.follow_terminal, "+");
            }
        }
    });
});

describe("Grammar.parse", () => {
    it("Creates LR1 item set after set 0 for grammar 0 starting at production rule 0 label index 0", () => {

        const action_table: Grammar.Action_column[][] = [
            [ // 0
                { label: "0", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Shift, value: { next_state: 2 } } }
            ],
            [ // 1
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } }
            ],
            [ // 2
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1, rhs_non_terminal_count: 1 } } }
            ],
            [ // 3
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "$", action: { type: Grammar.Action_type.Accept, value: undefined } },
            ],
            [ // 4
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1, rhs_non_terminal_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1, rhs_non_terminal_count: 1 } } }
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
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } }
            ],
            [ // 8
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3, rhs_non_terminal_count: 2 } } }
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

        const output_node = Grammar.parse(scanned_words, action_table, go_to_table);

        assert.notEqual(output_node, undefined);

        if (output_node !== undefined) {

            assert.equal(output_node.value, "E");

            assert.equal(output_node.children.length, 3);

            {
                const node_0 = output_node.children[0];
                assert.equal(node_0.value, "E");
                assert.equal(node_0.children.length, 1);

                {
                    const node_1 = node_0.children[0];
                    assert.equal(node_1.value, "B");
                    assert.equal(node_1.children.length, 1);

                    {
                        const node_2 = node_1.children[0];
                        assert.equal(node_2.value, "1");
                        assert.equal(node_2.children.length, 0);
                    }
                }
            }

            {
                const node_0 = output_node.children[1];
                assert.equal(node_0.value, "+");
                assert.equal(node_0.children.length, 0);
            }

            {
                const node_0 = output_node.children[2];
                assert.equal(node_0.value, "B");
                assert.equal(node_0.children.length, 1);

                {
                    const node_1 = node_0.children[0];
                    assert.equal(node_1.value, "1");
                    assert.equal(node_1.children.length, 0);
                }
            }
        }

    });
});
