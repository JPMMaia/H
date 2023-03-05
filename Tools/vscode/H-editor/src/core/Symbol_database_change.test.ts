import "mocha";

import * as assert from "assert";
import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Module_examples from "./Module_examples";
import * as Symbol_database from "./Symbol_database";
import * as Symbol_database_change from "./Symbol_database_change";

describe("Symbol_database_change.update", () => {

    it("Deletes all content symbols if root is replaced by empty", () => {

        const module = Module_examples.create_0();
        const symbol_database = Symbol_database.create_edit_database(module);

        const new_abstract_syntax_tree_root: Abstract_syntax_tree.Node = {
            value: "",
            token: Abstract_syntax_tree.Token.Module,
            children: [],
            cache: {
                relative_start: 0
            }
        };

        const change = Symbol_database_change.create_replace_change([], new_abstract_syntax_tree_root);
        Symbol_database_change.update(symbol_database, new_abstract_syntax_tree_root, change);

        assert.equal(symbol_database.function_definitions.length, 0);
        assert.equal(symbol_database.internal_declarations.alias.length, 0);
        assert.equal(symbol_database.internal_declarations.enums.length, 0);
        assert.equal(symbol_database.internal_declarations.functions.length, 0);
        assert.equal(symbol_database.internal_declarations.structs.length, 0);
    });

    it("Adds new statement symbols if root is replaced by empty", () => {

        const module = Module_examples.create_0();
        const symbol_database = Symbol_database.create_edit_database(module);

        const new_abstract_syntax_tree_root: Abstract_syntax_tree.Node = {
            value: "",
            token: Abstract_syntax_tree.Token.Module,
            children: [],
            cache: {
                relative_start: 0
            }
        };

        const change = Symbol_database_change.create_replace_change([], new_abstract_syntax_tree_root);
        Symbol_database_change.update(symbol_database, new_abstract_syntax_tree_root, change);

        assert.equal(symbol_database.function_definitions.length, 0);
        assert.equal(symbol_database.internal_declarations.alias.length, 0);
        assert.equal(symbol_database.internal_declarations.enums.length, 0);
        assert.equal(symbol_database.internal_declarations.functions.length, 0);
        assert.equal(symbol_database.internal_declarations.structs.length, 0);
    });
});
