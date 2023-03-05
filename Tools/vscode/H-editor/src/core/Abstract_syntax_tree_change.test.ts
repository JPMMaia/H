import "mocha";

import * as assert from "assert";
import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Abstract_syntax_tree_change from "./Abstract_syntax_tree_change";
import * as Abstract_syntax_tree_examples from "./Abstract_syntax_tree_examples";
import * as Default_grammar from "./Default_grammar";

describe("Abstract_syntax_tree_change.create_changes", () => {

    const grammar = Default_grammar.create_grammar();

    it("Creates add change from adding single character", () => {

        const root = Abstract_syntax_tree_examples.create_empty();

        const text_after_change = "f";
        const text_change: Abstract_syntax_tree_change.Text_change = {
            range_offset: 0,
            range_length: 0,
            new_text: "f"
        };

        const changes = Abstract_syntax_tree_change.create_changes(root, text_after_change, text_change, grammar);

        assert.equal(changes.length, 1);

        {
            const change = changes[0];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Add);

            const add_change = change.value as Abstract_syntax_tree_change.Add_change;
            assert.deepEqual(add_change.position, [0, 0]);
            assert.equal(add_change.new_node.value, "f");
            assert.equal(add_change.new_node.token, Abstract_syntax_tree.Token.Invalid);
        }
    });

    it("Creates modify change from adding single character", () => {

        const root = Abstract_syntax_tree_examples.create_empty();
        root.children[0].children = [
            Abstract_syntax_tree_examples.create_node("f", Abstract_syntax_tree.Token.Invalid, [], 0)
        ];
        root.children[1].cache.relative_start = 1;

        const text_after_change = "fu";
        const text_change: Abstract_syntax_tree_change.Text_change = {
            range_offset: 1,
            range_length: 0,
            new_text: "u"
        };

        const changes = Abstract_syntax_tree_change.create_changes(root, text_after_change, text_change, grammar);

        assert.equal(changes.length, 1);

        {
            const change = changes[0];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Modify);

            const modify_change = change.value as Abstract_syntax_tree_change.Modify_change;
            assert.deepEqual(modify_change.position, [0, 0]);
            assert.equal(modify_change.new_node.value, "fu");
            assert.equal(modify_change.new_node.token, Abstract_syntax_tree.Token.Invalid);
        }
    });

    it("Creates modify change from remove single character", () => {

        const root = Abstract_syntax_tree_examples.create_empty();
        root.children[0].children = [
            Abstract_syntax_tree_examples.create_node("fu", Abstract_syntax_tree.Token.Invalid, [], 0)
        ];
        root.children[1].cache.relative_start = 2;

        const text_after_change = "f";
        const text_change: Abstract_syntax_tree_change.Text_change = {
            range_offset: 1,
            range_length: 1,
            new_text: ""
        };

        const changes = Abstract_syntax_tree_change.create_changes(root, text_after_change, text_change, grammar);

        assert.equal(changes.length, 1);

        {
            const change = changes[0];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Modify);

            const modify_change = change.value as Abstract_syntax_tree_change.Modify_change;
            assert.deepEqual(modify_change.position, [0, 0]);
            assert.equal(modify_change.new_node.value, "f");
            assert.equal(modify_change.new_node.token, Abstract_syntax_tree.Token.Invalid);
        }
    });

    it("Creates remove change from removing single word", () => {

        const root = Abstract_syntax_tree_examples.create_empty();
        root.children[0].children = [
            Abstract_syntax_tree_examples.create_node("f", Abstract_syntax_tree.Token.Invalid, [], 0)
        ];
        root.children[1].cache.relative_start = 1;

        const text_after_change = "";
        const text_change: Abstract_syntax_tree_change.Text_change = {
            range_offset: 0,
            range_length: 1,
            new_text: ""
        };

        const changes = Abstract_syntax_tree_change.create_changes(root, text_after_change, text_change, grammar);

        assert.equal(changes.length, 1);

        {
            const change = changes[0];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Remove);

            const remove_change = change.value as Abstract_syntax_tree_change.Remove_change;
            assert.deepEqual(remove_change.position, [0, 0]);
        }
    });

    it("Creates remove change from removing single word 2", () => {

        const root = Abstract_syntax_tree_examples.create_empty();
        root.children[0].children = [
            Abstract_syntax_tree_examples.create_node("f", Abstract_syntax_tree.Token.Invalid, [], 0),
            Abstract_syntax_tree_examples.create_node("+", Abstract_syntax_tree.Token.Invalid, [], 1)
        ];
        root.children[1].cache.relative_start = 2;

        const text_after_change = "f";
        const text_change: Abstract_syntax_tree_change.Text_change = {
            range_offset: 1,
            range_length: 1,
            new_text: ""
        };

        const changes = Abstract_syntax_tree_change.create_changes(root, text_after_change, text_change, grammar);

        assert.equal(changes.length, 1);

        {
            const change = changes[0];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Remove);

            const remove_change = change.value as Abstract_syntax_tree_change.Remove_change;
            assert.deepEqual(remove_change.position, [0, 1]);
        }
    });

    it("Creates remove change from removing single word 3", () => {

        const root = Abstract_syntax_tree_examples.create_empty();
        root.children[0].children = [
            Abstract_syntax_tree_examples.create_node("f", Abstract_syntax_tree.Token.Invalid, [], 0),
            Abstract_syntax_tree_examples.create_node("+", Abstract_syntax_tree.Token.Invalid, [], 1)
        ];
        root.children[1].cache.relative_start = 2;

        const text_after_change = "+";
        const text_change: Abstract_syntax_tree_change.Text_change = {
            range_offset: 0,
            range_length: 1,
            new_text: ""
        };

        const changes = Abstract_syntax_tree_change.create_changes(root, text_after_change, text_change, grammar);

        assert.equal(changes.length, 1);

        {
            const change = changes[0];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Remove);

            const remove_change = change.value as Abstract_syntax_tree_change.Remove_change;
            assert.deepEqual(remove_change.position, [0, 0]);
        }
    });

    it("Creates remove and add changes from adding space in middle of word", () => {

        const root = Abstract_syntax_tree_examples.create_empty();
        root.children[0].children = [
            Abstract_syntax_tree_examples.create_node("fu", Abstract_syntax_tree.Token.Invalid, [], 0)
        ];
        root.children[1].cache.relative_start = 2;

        const text_after_change = "f u";
        const text_change: Abstract_syntax_tree_change.Text_change = {
            range_offset: 1,
            range_length: 0,
            new_text: " "
        };

        const changes = Abstract_syntax_tree_change.create_changes(root, text_after_change, text_change, grammar);

        assert.equal(changes.length, 2);

        {
            const change = changes[0];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Modify);

            const modify_change = change.value as Abstract_syntax_tree_change.Modify_change;
            assert.deepEqual(modify_change.position, [0, 0]);
            assert.equal(modify_change.new_node.value, "f");
            assert.equal(modify_change.new_node.token, Abstract_syntax_tree.Token.Invalid);
        }

        {
            const change = changes[1];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Add);

            const add_change = change.value as Abstract_syntax_tree_change.Add_change;
            assert.deepEqual(add_change.position, [0, 1]);
            assert.equal(add_change.new_node.value, "u");
            assert.equal(add_change.new_node.token, Abstract_syntax_tree.Token.Invalid);
        }
    });

    it("Creates remove and add changes from removing space separating two words", () => {

        const root = Abstract_syntax_tree_examples.create_empty();
        root.children[0].children = [
            Abstract_syntax_tree_examples.create_node("f", Abstract_syntax_tree.Token.Invalid, [], 0),
            Abstract_syntax_tree_examples.create_node("u", Abstract_syntax_tree.Token.Invalid, [], 2)
        ];
        root.children[1].cache.relative_start = 3;

        const text_after_change = "fu";
        const text_change: Abstract_syntax_tree_change.Text_change = {
            range_offset: 1,
            range_length: 1,
            new_text: ""
        };

        const changes = Abstract_syntax_tree_change.create_changes(root, text_after_change, text_change, grammar);

        assert.equal(changes.length, 2);

        {
            const change = changes[0];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Modify);

            const add_change = change.value as Abstract_syntax_tree_change.Add_change;
            assert.deepEqual(add_change.position, [0, 0]);
            assert.equal(add_change.new_node.value, "fu");
            assert.equal(add_change.new_node.token, Abstract_syntax_tree.Token.Invalid);
        }

        {
            const change = changes[1];
            assert.equal(change.type, Abstract_syntax_tree_change.Type.Remove);

            const remove_change = change.value as Abstract_syntax_tree_change.Remove_change;
            assert.deepEqual(remove_change.position, [0, 1]);
        }
    });
});

