import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parser from "./Parser";
import * as Scanner from "./Scanner";
import * as Symbol_database from "./Symbol_database";
import * as Text_formatter from "./Text_formatter";

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

describe("Parse_tree_convertor.module_to_parse_tree", () => {

    it("Creates module parse tree from grammar 9", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const module = Module_examples.create_0();
        const symbol_database = Symbol_database.create_edit_database(module);
        const declarations = Parse_tree_convertor.create_declarations(module);
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, symbol_database, declarations, production_rules);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.production_rule_index, 0);

        {
            const node_0 = parse_tree.children[0];
            assert.equal(node_0.word.value, "Module_head");
            assert.equal(node_0.production_rule_index, 1);

            {
                const node_1 = node_0.children[0];
                assert.equal(node_1.word.value, "Module_declaration");
                assert.equal(node_1.production_rule_index, 2);

                {
                    const node_2 = node_1.children[0];
                    assert.equal(node_2.word.value, "module");
                    assert.equal(node_2.production_rule_index, undefined);
                }

                {
                    const node_3 = node_1.children[1];
                    assert.equal(node_3.word.value, "Module_name");
                    assert.equal(node_3.production_rule_index, 3);

                    {
                        const node_4 = node_3.children[0];
                        assert.equal(node_4.word.value, "module_name");
                        assert.equal(node_4.production_rule_index, undefined);
                    }
                }

                {
                    const node_5 = node_1.children[2];
                    assert.equal(node_5.word.value, ";");
                    assert.equal(node_5.production_rule_index, undefined);
                }
            }
        }
    });
});

describe("Parse_tree_convertor.create_module_changes", () => {

    it("Creates module changes from parse tree of grammar 9", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const module = Module_examples.create_0();
        const symbol_database = Symbol_database.create_edit_database(module);
        const declarations = Parse_tree_convertor.create_declarations(module);
        const initial_parse_tree = Parse_tree_convertor.module_to_parse_tree(module, symbol_database, declarations, production_rules);

        const map_word_to_terminal = (word: Grammar.Word): string => {
            if (word.value === "enum" || word.value === "export" || word.value === "function" || word.value === "module" || word.value === "struct" || word.value === "using") {
                return word.value;
            }

            if (word.type === Grammar.Word_type.Alphanumeric) {
                return "identifier";
            }

            return word.value;
        };

        const initial_parse_tree_text = Text_formatter.to_string(initial_parse_tree);
        const scanned_words = Scanner.scan(initial_parse_tree_text, 0, initial_parse_tree_text.length);

        const parsing_tables = Grammar.create_parsing_tables_from_production_rules(production_rules);
        const parse_tree = Parser.parse(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, map_word_to_terminal);

        assert.notEqual(parse_tree, undefined);
        if (parse_tree === undefined) {
            return;
        }

        // Also sets parse_tree Text_position:
        const text = Text_formatter.to_string(parse_tree);
        console.log(text);

        const scanned_input_change = Parser.scan_new_change(
            parse_tree,
            { line: 0, column: 18 },
            { line: 0, column: 18 },
            "_2"
        );

        const parse_result = Parser.parse_incrementally(
            parse_tree,
            scanned_input_change.start_change_node_position,
            scanned_input_change.new_words,
            scanned_input_change.after_change_node_position,
            parsing_tables.action_table,
            parsing_tables.go_to_table,
            map_word_to_terminal
        );

        assert.equal(parse_result.status, Parser.Parse_status.Accept);

        const module_changes = Parse_tree_convertor.create_module_changes(module, symbol_database, declarations, production_rules, parse_tree, parse_result.changes[0].value as Parser.Modify_change);


    });
});
