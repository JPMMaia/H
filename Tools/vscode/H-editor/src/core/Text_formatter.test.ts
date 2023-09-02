import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Text_formatter from "./Text_formatter";

describe("Text_formatter.to_string", () => {

    it("Creates text from parse tree from module 0 using grammar 9", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const module = Module_examples.create_0();
        const declarations = Parse_tree_convertor.create_declarations(module);
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, declarations, production_rules);
        const text_cache = Parse_tree_text_position_cache.create_cache();

        const text = Text_formatter.to_string(parse_tree, text_cache, []);

        assert(text.length > 0);
    });
});
