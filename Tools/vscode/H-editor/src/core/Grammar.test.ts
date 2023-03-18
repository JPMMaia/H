import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";

function create_numeric_expressions_grammar_description(): string[] {

    return [
        "Statement -> Expression",
        "Expression -> Sum | Multiplication | number",
        "Sum -> Expression '+' Expression",
        "Multiplication -> Expression '*' Expression",
    ];
}

describe("Grammar.create_production_rules", () => {
    it("Creates production rules for description 0", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);

        assert.equal(production_rules.length, 4);

        {
            const production_rule = production_rules[0];
            assert.equal(production_rule.non_terminal, "Statement");
            assert.equal(production_rule.rule.length, 1);

            {
                const rule = production_rule.rule[0];
                assert.equal(rule.length, 2);
                assert.equal(rule[0], "Expression");
                assert.equal(rule[1], "$");
            }
        }

        {
            const production_rule = production_rules[1];
            assert.equal(production_rule.non_terminal, "Expression");
            assert.equal(production_rule.rule.length, 3);

            {
                const rule = production_rule.rule[0];
                assert.equal(rule.length, 1);
                assert.equal(rule[0], "Sum");
            }

            {
                const rule = production_rule.rule[1];
                assert.equal(rule.length, 1);
                assert.equal(rule[0], "Multiplication");
            }

            {
                const rule = production_rule.rule[2];
                assert.equal(rule.length, 1);
                assert.equal(rule[0], "number");
            }
        }

        {
            const production_rule = production_rules[2];
            assert.equal(production_rule.non_terminal, "Sum");
            assert.equal(production_rule.rule.length, 1);

            {
                const rule = production_rule.rule[0];
                assert.equal(rule.length, 3);
                assert.equal(rule[0], "Expression");
                assert.equal(rule[1], "'+'");
                assert.equal(rule[2], "Expression");
            }
        }

        {
            const production_rule = production_rules[3];
            assert.equal(production_rule.non_terminal, "Multiplication");
            assert.equal(production_rule.rule.length, 1);

            {
                const rule = production_rule.rule[0];
                assert.equal(rule.length, 3);
                assert.equal(rule[0], "Expression");
                assert.equal(rule[1], "'*'");
                assert.equal(rule[2], "Expression");
            }
        }
    });
});

describe("Grammar.get_non_terminals", () => {
    it("Returns non-terminals for grammar 0", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const non_terminals = Grammar.get_non_terminals(production_rules);

        assert.equal(non_terminals.length, 4);
        assert.equal(non_terminals[0], "Statement");
        assert.equal(non_terminals[1], "Expression");
        assert.equal(non_terminals[2], "Sum");
        assert.equal(non_terminals[3], "Multiplication");
    });
});

describe("Grammar.get_terminals", () => {
    it("Returns terminals for grammar 0", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const terminals = Grammar.get_terminals(production_rules);

        assert.equal(terminals.length, 4);
        assert.equal(terminals[0], "$");
        assert.equal(terminals[1], "'*'");
        assert.equal(terminals[2], "'+'");
        assert.equal(terminals[3], "number");
    });
});

describe("Grammar.first", () => {
    it("Returns first terminals for each production rule of grammar 0", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const terminals = Grammar.get_terminals(production_rules);
        const first_terminals = Grammar.first(production_rules, terminals);

        {
            const statement_first_terminals = first_terminals.get("Statement");
            assert.notEqual(statement_first_terminals, undefined);
            assert.deepEqual(statement_first_terminals, ["number"]);
        }

        {
            const expression_first_terminals = first_terminals.get("Expression");
            assert.notEqual(expression_first_terminals, undefined);
            assert.deepEqual(expression_first_terminals, ["number"]);
        }

        {
            const sum_first_terminals = first_terminals.get("Sum");
            assert.notEqual(sum_first_terminals, undefined);
            assert.deepEqual(sum_first_terminals, ["number"]);
        }

        {
            const multiplication_first_terminals = first_terminals.get("Multiplication");
            assert.notEqual(multiplication_first_terminals, undefined);
            assert.deepEqual(multiplication_first_terminals, ["number"]);
        }

        {
            const plus_first_terminals = first_terminals.get("'+'");
            assert.notEqual(plus_first_terminals, undefined);
            assert.deepEqual(plus_first_terminals, ["'+'"]);
        }

        {
            const times_first_terminals = first_terminals.get("'*'");
            assert.notEqual(times_first_terminals, undefined);
            assert.deepEqual(times_first_terminals, ["'*'"]);
        }

        {
            const number_first_terminals = first_terminals.get("number");
            assert.notEqual(number_first_terminals, undefined);
            assert.deepEqual(number_first_terminals, ["number"]);
        }
    });
});

describe("Grammar.follow", () => {
    it("Returns follow terminals for each production rule of grammar 0", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const terminals = Grammar.get_terminals(production_rules);
        const first_terminals = Grammar.first(production_rules, terminals);
        const follow_terminals = Grammar.follow(production_rules, terminals, first_terminals);

        {
            const statement_follow_terminals = follow_terminals.get("Statement");
            assert.deepEqual(statement_follow_terminals, ["$"]);
        }

        {
            const expression_follow_terminals = follow_terminals.get("Expression");
            assert.deepEqual(expression_follow_terminals, ["$", "'*'", "'+'"]);
        }

        {
            const sum_follow_terminals = follow_terminals.get("Sum");
            assert.deepEqual(sum_follow_terminals, ["$", "'*'", "'+'"]);
        }

        {
            const multiplication_follow_terminals = follow_terminals.get("Multiplication");
            assert.deepEqual(multiplication_follow_terminals, ["$", "'*'", "'+'"]);
        }

        {
            const plus_follow_terminals = follow_terminals.get("'+'");
            assert.deepEqual(plus_follow_terminals, ["number"]);
        }

        {
            const multiply_follow_terminals = follow_terminals.get("'*'");
            assert.deepEqual(multiply_follow_terminals, ["number"]);
        }

        {
            const number_follow_terminals = follow_terminals.get("number");
            assert.deepEqual(number_follow_terminals, ["$", "'*'", "'+'"]);
        }
    });
});

describe("Grammar.create_lr0_items", () => {
    it("Creates LR0 items for grammar 0 production rules 0,0,0", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const lr0_items = Grammar.create_lr0_items(production_rules, 0, 0, 0);

        assert.equal(lr0_items.length, 6);

        {
            // Statement -> .Expression
            const item = lr0_items[0];
            assert.equal(item.production_rule_index, 0);
            assert.equal(item.rule_index, 0);
            assert.equal(item.word_index, 0);
        }

        {
            // Expression -> .Sum
            const item = lr0_items[1];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.rule_index, 0);
            assert.equal(item.word_index, 0);
        }

        {
            // Expression -> .Multiplication
            const item = lr0_items[2];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.rule_index, 1);
            assert.equal(item.word_index, 0);
        }

        {
            // Expression -> .number
            const item = lr0_items[3];
            assert.equal(item.production_rule_index, 1);
            assert.equal(item.rule_index, 2);
            assert.equal(item.word_index, 0);
        }

        {
            // Sum -> .Expression '+' Expression
            const item = lr0_items[4];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.rule_index, 0);
            assert.equal(item.word_index, 0);
        }

        {
            // Multiplication -> .Expression '*' Expression
            const item = lr0_items[4];
            assert.equal(item.production_rule_index, 2);
            assert.equal(item.rule_index, 0);
            assert.equal(item.word_index, 0);
        }
    });
});

describe("Grammar.create_lr1_items", () => {
    it("Creates LR0 items for grammar 0 production rules 0,0,0", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const terminals = Grammar.get_terminals(production_rules);
        const first_terminals = Grammar.first(production_rules, terminals);
        const follow_terminals = Grammar.follow(production_rules, terminals, first_terminals);
        const lr1_items = Grammar.create_lr1_items(production_rules, follow_terminals, 0, 0, 0);

        assert.equal(lr1_items.length, 6);

        {
            // Statement -> .Expression, 
            const item = lr1_items[0];
            assert.deepEqual(item.follow_terminals, ["$", "'*'", "'+'"]);
        }

        {
            // Expression -> .Sum
            const item = lr1_items[1];
            assert.deepEqual(item.follow_terminals, ["$", "'*'", "'+'"]);
        }

        {
            // Expression -> .Multiplication
            const item = lr1_items[2];
            assert.deepEqual(item.follow_terminals, ["$", "'*'", "'+'"]);
        }

        {
            // Expression -> .number
            const item = lr1_items[3];
            assert.deepEqual(item.follow_terminals, ["$", "'*'", "'+'"]);
        }

        {
            // Sum -> .Expression '+' Expression
            const item = lr1_items[4];
            assert.deepEqual(item.follow_terminals, ["$", "'*'", "'+'"]);
        }

        {
            // Multiplication -> .Expression '*' Expression
            const item = lr1_items[5];
            assert.deepEqual(item.follow_terminals, ["$", "'*'", "'+'"]);
        }
    });

    it("Creates LR0 items for grammar 0 production rules 2,0,1", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const terminals = Grammar.get_terminals(production_rules);
        const first_terminals = Grammar.first(production_rules, terminals);
        const follow_terminals = Grammar.follow(production_rules, terminals, first_terminals);
        const lr1_items = Grammar.create_lr1_items(production_rules, follow_terminals, 2, 0, 1);

        assert.equal(lr1_items.length, 1);

        {
            // Sum -> Expression .'+' Expression
            const item = lr1_items[0];
            assert.deepEqual(item.follow_terminals, ["number"]);
        }
    });

    it("Creates LR0 items for grammar 0 production rules 3,0,1", () => {
        const grammar_description = create_numeric_expressions_grammar_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const terminals = Grammar.get_terminals(production_rules);
        const first_terminals = Grammar.first(production_rules, terminals);
        const follow_terminals = Grammar.follow(production_rules, terminals, first_terminals);
        const lr1_items = Grammar.create_lr1_items(production_rules, follow_terminals, 3, 0, 1);

        assert.equal(lr1_items.length, 1);

        {
            // Multiplication -> Expression '*' Expression
            const item = lr1_items[0];
            assert.deepEqual(item.follow_terminals, ["number"]);
        }
    });
});
