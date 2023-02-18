import "mocha";
import * as assert from "assert";

import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Abstract_syntax_tree_from_module from "./Abstract_syntax_tree_from_module";
import * as Default_grammar from "./Default_grammar";
import * as Module_examples from "../core/Module_examples";
import * as Symbol_database from "../core/Symbol_database";

describe("Abstract_syntax_tree_from_module", () => {
    it("creates module nodes", () => {

        const module = Module_examples.create_default();
        const symbol_database = Symbol_database.create_edit_database(module);
        const grammar = Default_grammar.create_grammar();

        const node = Abstract_syntax_tree_from_module.create_module_node(module, symbol_database, grammar);

        assert.equal(node.token, Abstract_syntax_tree.Token.Module);
    });
});
