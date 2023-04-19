import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Symbol_database from "./Symbol_database";
import * as Text_formatter from "./Text_formatter";

describe("Text_formatter.to_string", () => {

    it("Creates text from parse tree from module 0 using grammar 9", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const module = Module_examples.create_0();
        const symbol_database = Symbol_database.create_edit_database(module);
        const declarations = Parse_tree_convertor.create_declarations(module);
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, symbol_database, declarations, production_rules);

        const text = Text_formatter.to_string(parse_tree);

        assert(text.length > 0);
    });
});
