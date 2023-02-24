import "mocha";

import * as assert from "assert";
import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Abstract_syntax_tree_change from "./Abstract_syntax_tree_change";
import * as Abstract_syntax_tree_examples from "./Abstract_syntax_tree_examples";

describe("Abstract_syntax_tree_change.update", () => {


    it("Replaces r", () => {

        const root = Abstract_syntax_tree_examples.create_0();

        const new_node: Abstract_syntax_tree.Node = {
            value: "",
            token: Abstract_syntax_tree.Token.Module,
            children: [],
            cache: {
                relative_start: 1
            }
        };

        assert.notDeepEqual(root, new_node);

        const change = Abstract_syntax_tree_change.create_replace_change([], new_node);
        Abstract_syntax_tree_change.update(root, change);

        assert.deepEqual(root, new_node);
    });

    it("Replaces r.0", () => {

        const root = Abstract_syntax_tree_examples.create_0();

        const new_node: Abstract_syntax_tree.Node = {
            value: "r.0.new",
            token: Abstract_syntax_tree.Token.Statement,
            children: [],
            cache: {
                relative_start: 2
            }
        };

        const change = Abstract_syntax_tree_change.create_replace_change([0], new_node);
        Abstract_syntax_tree_change.update(root, change);

        assert.deepEqual(root.children[0], new_node);
    });
});

