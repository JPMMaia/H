import "mocha";

import * as assert from "assert";
import * as Abstract_syntax_tree_from_module from "./Abstract_syntax_tree_from_module";
import * as Default_grammar from "./Default_grammar";
import * as Module_examples from "./Module_examples";
import * as Symbol_database from "./Symbol_database";
import * as Text_change from "./Text_change";

describe("Text_change.update", () => {

    const module = Module_examples.create_empty();
    const symbol_database = Symbol_database.create_edit_database(module);
    const grammar = Default_grammar.create_grammar();
    const abstract_syntax_tree = Abstract_syntax_tree_from_module.create_module_node(module, symbol_database, grammar);

    it("Handles add first character", () => {

        const text_after_change = "f";
        const change: Text_change.Change = {
            range_offset: 0,
            range_length: 0,
            new_text: "f"
        };

        Text_change.update(text_after_change, change, module, symbol_database, grammar, abstract_syntax_tree);


    });
});
