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

function create_test_grammar_2_description(): string[] {
    return [
        "Start -> S",
        "S -> A A",
        "A -> a A",
        "A -> b"
    ];
}


function create_test_grammar_3_description(): string[] {
    return [
        "Start -> Addition",
        "Addition -> Addition + Multiplication",
        "Addition -> Multiplication",
        "Multiplication -> Multiplication * Basic",
        "Multiplication -> Basic",
        "Basic -> number",
        "Basic -> ( Addition )",
    ];
}

function create_test_grammar_4_description(): string[] {
    return [
        "Start -> Addition",
        "Addition -> Addition + Multiplication",
        "Addition -> Addition - Multiplication",
        "Addition -> Multiplication",
        "Multiplication -> Multiplication * Basic",
        "Multiplication -> Multiplication / Basic",
        "Multiplication -> Basic",
        "Basic -> number",
        "Basic -> identifier",
        "Basic -> ( Expression )",
    ];
}

function create_test_grammar_5_description(): string[] {
    return [
        "S -> A B",
        "A -> a A B",
        "A -> a A C",
        "A -> h A h",
        "A -> l",
        "B -> b B",
        "B -> c",
        "C -> D c",
        "D -> b E",
        "E -> g g",
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

describe("Grammar.create_start_lr1_item_set", () => {
    it("Creates starter item set for grammar 0", () => {

        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_items = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);

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

        const grammar_description = create_test_grammar_1_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_items = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);

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

        const grammar_description = create_test_grammar_0_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);

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
            const lr1_item_set_1 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "E");

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
            const lr1_item_set_2 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "T");

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
            const lr1_item_set_3 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "n");

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
            const lr1_item_set_4 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "+");

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
            const lr1_item_set_5 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "(");

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

        const grammar_description = create_test_grammar_2_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);

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
            const lr1_item_set_1 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "S");

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
            const lr1_item_set_2 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "A");

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
            const lr1_item_set_3 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "a");

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
            const lr1_item_set_4 = Grammar.create_next_lr1_item_set(production_rules, rules_first_terminals, lr1_item_set_0, "b");

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

        const grammar_description = create_test_grammar_2_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);
        const graph = Grammar.create_lr1_graph(production_rules, rules_first_terminals, lr1_item_set_0);
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

        const grammar_description = create_test_grammar_3_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);
        const graph = Grammar.create_lr1_graph(production_rules, rules_first_terminals, lr1_item_set_0);
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

        const grammar_description = create_test_grammar_3_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);
        const graph = Grammar.create_lr1_graph(production_rules, rules_first_terminals, lr1_item_set_0);

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

describe("Grammar.parse", () => {
    it("Parses '1 + 1' with a parsing table", () => {

        const action_table: Grammar.Action_column[][] = [
            [ // 0
                { label: "0", action: { type: Grammar.Action_type.Shift, value: { next_state: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Shift, value: { next_state: 2 } } }
            ],
            [ // 1
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } }
            ],
            [ // 2
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "B", rhs_count: 1 } } }
            ],
            [ // 3
                { label: "*", action: { type: Grammar.Action_type.Shift, value: { next_state: 5 } } },
                { label: "+", action: { type: Grammar.Action_type.Shift, value: { next_state: 6 } } },
                { label: "$", action: { type: Grammar.Action_type.Accept, value: { lhs: "S", rhs_count: 1 } } },
            ],
            [ // 4
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 1 } } }
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
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } }
            ],
            [ // 8
                { label: "*", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } },
                { label: "+", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } },
                { label: "0", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } },
                { label: "1", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } },
                { label: "$", action: { type: Grammar.Action_type.Reduce, value: { lhs: "E", rhs_count: 3 } } }
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

        const output_node = Grammar.parse(scanned_words, action_table, go_to_table, map_word_to_terminal);

        assert.notEqual(output_node, undefined);

        if (output_node !== undefined) {

            assert.equal(output_node.value, "S");
            assert.equal(output_node.children.length, 1);

            const node_0 = output_node.children[0];
            assert.equal(node_0.value, "E");
            assert.equal(node_0.children.length, 3);

            {
                const node_1 = node_0.children[0];
                assert.equal(node_1.value, "E");
                assert.equal(node_1.children.length, 1);

                {
                    const node_2 = node_1.children[0];
                    assert.equal(node_2.value, "B");
                    assert.equal(node_2.children.length, 1);

                    {
                        const node_3 = node_2.children[0];
                        assert.equal(node_3.value, "1");
                        assert.equal(node_3.children.length, 0);
                    }
                }
            }

            {
                const node_1 = node_0.children[1];
                assert.equal(node_1.value, "+");
                assert.equal(node_1.children.length, 0);
            }

            {
                const node_1 = node_0.children[2];
                assert.equal(node_1.value, "B");
                assert.equal(node_1.children.length, 1);

                {
                    const node_2 = node_1.children[0];
                    assert.equal(node_2.value, "1");
                    assert.equal(node_2.children.length, 0);
                }
            }
        }

    });

    it("Parses '1 + 2 * 3'", () => {

        const grammar_description = create_test_grammar_3_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);
        const graph = Grammar.create_lr1_graph(production_rules, rules_first_terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);

        const input = "1 + 2 * 3";
        const scanned_words = Scanner.scan(input, 0, input.length);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {

            if (word.type === Grammar.Word_type.Number) {
                return "number";
            }

            return word.value;
        };

        const output_node = Grammar.parse(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, map_word_to_terminal);

        assert.notEqual(output_node, undefined);

        if (output_node !== undefined) {

            assert.equal(output_node.value, "Start");

            assert.equal(output_node.children.length, 1);

            {
                const node_0 = output_node.children[0];
                assert.equal(node_0.value, "Addition");
                assert.equal(node_0.children.length, 3);

                {
                    const node_1 = node_0.children[0];
                    assert.equal(node_1.value, "Addition");
                    assert.equal(node_1.children.length, 1);

                    {
                        const node_2 = node_1.children[0];
                        assert.equal(node_2.value, "Multiplication");
                        assert.equal(node_2.children.length, 1);

                        {
                            const node_3 = node_2.children[0];
                            assert.equal(node_3.value, "Basic");
                            assert.equal(node_3.children.length, 1);

                            {
                                const node_4 = node_3.children[0];
                                assert.equal(node_4.value, "1");
                                assert.equal(node_4.children.length, 0);
                            }
                        }
                    }
                }

                {
                    const node_5 = node_0.children[1];
                    assert.equal(node_5.value, "+");
                    assert.equal(node_5.children.length, 0);
                }

                {
                    const node_6 = node_0.children[2];
                    assert.equal(node_6.value, "Multiplication");
                    assert.equal(node_6.children.length, 3);

                    {
                        const node_7 = node_6.children[0];
                        assert.equal(node_7.value, "Multiplication");
                        assert.equal(node_7.children.length, 1);

                        {
                            const node_8 = node_7.children[0];
                            assert.equal(node_8.value, "Basic");
                            assert.equal(node_8.children.length, 1);

                            {
                                const node_9 = node_8.children[0];
                                assert.equal(node_9.value, "2");
                                assert.equal(node_9.children.length, 0);
                            }
                        }
                    }

                    {
                        const node_10 = node_6.children[1];
                        assert.equal(node_10.value, "*");
                        assert.equal(node_10.children.length, 0);
                    }

                    {
                        const node_11 = node_6.children[2];
                        assert.equal(node_11.value, "Basic");
                        assert.equal(node_11.children.length, 1);

                        {
                            const node_12 = node_11.children[0];
                            assert.equal(node_12.value, "3");
                            assert.equal(node_12.children.length, 0);
                        }
                    }
                }
            }
        }

    });

    /*it("Test parsing", () => {

        const grammar_description = create_test_grammar_3_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);
        const graph = Grammar.create_lr1_graph(production_rules, rules_first_terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {

            if (word.type === Grammar.Word_type.Number) {
                return "number";
            }

            return word.value;
        };

        {
            const input = "1 + 2 + 3 * 4";
            const scanned_words = Scanner.scan(input, 0, input.length);
            console.log(input);
            const output_node = Grammar.parse_2(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, map_word_to_terminal);
        }

        {
            const input = "1 + 2 + 3 + 4";
            const scanned_words = Scanner.scan(input, 0, input.length);
            console.log(input);
            const output_node = Grammar.parse_2(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, map_word_to_terminal);
        }

        {
            const input = "1 2 + 3 * 4";
            const scanned_words = Scanner.scan(input, 0, input.length);
            console.log(input);
            const output_node = Grammar.parse_2(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, map_word_to_terminal);
        }

        {
            const input = "1 * 2 + 3 * 4";
            const scanned_words = Scanner.scan(input, 0, input.length);
            console.log(input);
            const output_node = Grammar.parse_2(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, map_word_to_terminal);
        }

        {
            const input = "1 + 2 * 3 * 4";
            const scanned_words = Scanner.scan(input, 0, input.length);
            console.log(input);
            const output_node = Grammar.parse_2(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, map_word_to_terminal);
        }
    });*/
});

describe("Grammar.parse_incrementally", () => {

    it("Parses 'a a h h h l h h h b b c b c c' and then handles replace second 'b' by 'g g'", () => {

        const grammar_description = create_test_grammar_5_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);
        const terminals = Grammar.get_terminals(production_rules, non_terminals);
        const rules_first_terminals = Grammar.first(production_rules, non_terminals, terminals);
        const lr1_item_set_0 = Grammar.create_start_lr1_item_set(production_rules, rules_first_terminals);
        const graph = Grammar.create_lr1_graph(production_rules, rules_first_terminals, lr1_item_set_0);
        const parsing_tables = Grammar.create_parsing_tables(production_rules, terminals, graph.states, graph.edges);

        const map_word_to_terminal = (word: Scanner.Scanned_word): string => {
            return word.value;
        };

        const first_input = "a a h h h l h h h b b c b c c";
        const first_scanned_words = Scanner.scan(first_input, 0, first_input.length);
        const first_parse_result = Grammar.parse_incrementally(
            undefined,
            [],
            first_scanned_words,
            [],
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            map_word_to_terminal
        );

        {
            assert.equal(first_parse_result.status, Grammar.Parse_status.Accept);
            assert.equal(first_parse_result.processed_words, 15);
            assert.equal(first_parse_result.changes.length, 1);

            const change = first_parse_result.changes[0];
            assert.equal(change.type, Grammar.Change_type.Modify);

            const modify_change = change.value as Grammar.Modify_change;
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

        const second_parse_result = Grammar.parse_incrementally(
            (first_parse_result.changes[0].value as Grammar.Modify_change).new_node,
            start_change_node_position,
            second_scanned_words,
            after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            map_word_to_terminal
        );

        {
            assert.equal(second_parse_result.status, Grammar.Parse_status.Accept);
            assert.equal(second_parse_result.processed_words, 3);
            assert.equal(second_parse_result.changes.length, 1);

            const change = second_parse_result.changes[0];
            assert.equal(change.type, Grammar.Change_type.Modify);

            const modify_change = change.value as Grammar.Add_change;

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
