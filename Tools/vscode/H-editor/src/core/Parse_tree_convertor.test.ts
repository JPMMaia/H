import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Symbol_database from "./Symbol_database";

describe("Parse_tree_convertor.module_to_parse_tree", () => {

    it("Creates module parse tree from grammar 9", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const module = Module_examples.create_0();
        const symbol_database = Symbol_database.create_edit_database(module);
        const declarations = Parse_tree_convertor.create_declarations(module);
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, symbol_database, declarations, production_rules);

        assert.equal(parse_tree.word.value, "Module");

        {
            const node_0 = parse_tree.children[0];
            assert.equal(node_0.word.value, "Module_head");

            {
                const node_1 = node_0.children[0];
                assert.equal(node_1.word.value, "Module_declaration");

                {
                    const node_2 = node_1.children[0];
                    assert.equal(node_2.word.value, "module");
                }

                {
                    const node_3 = node_1.children[1];
                    assert.equal(node_3.word.value, "Module_name");

                    {
                        const node_4 = node_3.children[0];
                        assert.equal(node_4.word.value, "module_name");
                    }
                }

                {
                    const node_5 = node_1.children[2];
                    assert.equal(node_5.word.value, ";");
                }
            }
        }
    });
});
