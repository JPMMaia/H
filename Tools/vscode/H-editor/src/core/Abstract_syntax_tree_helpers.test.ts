import "mocha"

import * as assert from "assert";
import * as AST_helpers from "./Abstract_syntax_tree_helpers";

function create_node_tree_1(parent?: AST_helpers.Node, index_in_parent?: number): AST_helpers.Node {
    const root = AST_helpers.create_list_node(
        parent,
        index_in_parent !== undefined ? index_in_parent : -1,
        [
        ],
        {
            type: AST_helpers.Metadata_type.Expression
        }
    );

    root.data = {
        elements: [
            AST_helpers.create_string_node(root, 0, "hello", "span", false, { type: AST_helpers.Metadata_type.Expression }),
            AST_helpers.create_string_node(root, 1, " ", "span", false, { type: AST_helpers.Metadata_type.Expression }),
            AST_helpers.create_string_node(root, 2, "world", "span", false, { type: AST_helpers.Metadata_type.Expression })
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

function create_node_tree_2(): AST_helpers.Node {
    const root = AST_helpers.create_list_node(
        undefined,
        -1,
        [
        ],
        {
            type: AST_helpers.Metadata_type.Expression
        }
    );

    root.data = {
        elements: [
            create_node_tree_1(root, 0),
            create_node_tree_1(root, 1),
            create_node_tree_1(root, 2)
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

describe("Find previous sibling node", () => {
    test("Previous sibling of child 0", () => {

        const node_tree = create_node_tree_1();
        const list_data = (node_tree.data as AST_helpers.List_data);

        const child_0 = list_data.elements[0];
        const result = AST_helpers.find_previous_sibling_node(child_0);
        assert.equal(result.node, undefined);
        assert.equal(result.iteration_actions.length, 0);
    });

    test("Previous sibling of child 1", () => {

        const node_tree = create_node_tree_1();
        const list_data = (node_tree.data as AST_helpers.List_data);

        const child_1 = list_data.elements[1];
        const result = AST_helpers.find_previous_sibling_node(child_1);

        const child_0 = list_data.elements[0];
        assert.equal(result.node, child_0);
        assert.equal(result.iteration_actions.length, 2);
        assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
        assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
        assert.equal(result.iteration_actions[1].index, 0);
    });

    test("Previous sibling of child 2", () => {

        const node_tree = create_node_tree_1();
        const list_data = (node_tree.data as AST_helpers.List_data);

        const child_2 = list_data.elements[2];
        const result = AST_helpers.find_previous_sibling_node(child_2);

        const child_1 = list_data.elements[1];
        assert.equal(result.node, child_1);
        assert.equal(result.iteration_actions.length, 2);
        assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
        assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
        assert.equal(result.iteration_actions[1].index, 1);
    });
});

describe("Find next sibling node", () => {
    test("Next sibling of child 0", () => {

        const node_tree = create_node_tree_1();
        const list_data = (node_tree.data as AST_helpers.List_data);

        const child_0 = list_data.elements[0];
        const result = AST_helpers.find_next_sibling_node(child_0);

        const child_1 = list_data.elements[1];
        assert.equal(result.node, child_1);
        assert.equal(result.iteration_actions.length, 2);
        assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
        assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
        assert.equal(result.iteration_actions[1].index, 1);
    });

    test("Next sibling of child 1", () => {

        const node_tree = create_node_tree_1();
        const list_data = (node_tree.data as AST_helpers.List_data);

        const child_1 = list_data.elements[1];
        const result = AST_helpers.find_next_sibling_node(child_1);

        const child_2 = list_data.elements[2];
        assert.equal(result.node, child_2);
        assert.equal(result.iteration_actions.length, 2);
        assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
        assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
        assert.equal(result.iteration_actions[1].index, 2);
    });

    test("Next sibling of child 2", () => {

        const node_tree = create_node_tree_1();
        const list_data = (node_tree.data as AST_helpers.List_data);

        const child_2 = list_data.elements[2];
        const result = AST_helpers.find_next_sibling_node(child_2);
        assert.equal(result.node, undefined);
        assert.equal(result.iteration_actions.length, 0);
    });
});

describe("Find left most leaf node", () => {
    test("Tree 2", () => {

        const node_tree = create_node_tree_2();
        const result = AST_helpers.find_left_most_leaf_node(node_tree);

        const children = (node_tree.data as AST_helpers.List_data).elements;
        const left_most_grand_children = (children[0].data as AST_helpers.List_data).elements;
        const left_most_grand_child = left_most_grand_children[0];
        assert.equal(result.node, left_most_grand_child);
        assert.equal(result.iteration_actions.length, 2);
        assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_child);
        assert.equal(result.iteration_actions[0].index, 0);
        assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
        assert.equal(result.iteration_actions[1].index, 0);
    });
});

describe("Find right most leaf node", () => {
    test("Tree 2", () => {

        const node_tree = create_node_tree_2();
        const result = AST_helpers.find_right_most_leaf_node(node_tree);

        const children = (node_tree.data as AST_helpers.List_data).elements;
        const right_most_grand_children = (children[children.length - 1].data as AST_helpers.List_data).elements;
        const right_most_grand_child = right_most_grand_children[right_most_grand_children.length - 1];
        assert.equal(result.node, right_most_grand_child);
        assert.equal(result.iteration_actions.length, 2);
        assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_child);
        assert.equal(result.iteration_actions[0].index, children.length - 1);
        assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
        assert.equal(result.iteration_actions[1].index, right_most_grand_children.length - 1);
    });
});

describe("Iterate backward", () => {
    test("Tree 2", () => {

        const node_tree = create_node_tree_2();

        const children = (node_tree.data as AST_helpers.List_data).elements;
        const child_0_children = (children[0].data as AST_helpers.List_data).elements;

        {
            const result = AST_helpers.iterate_backward(children[1]);
            assert.equal(result.node, child_0_children[2]);
            assert.equal(result.iteration_actions.length, 3);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[0].index, -1);
            assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[1].index, 0);
            assert.equal(result.iteration_actions[2].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[2].index, 2);
        }

        {
            const result = AST_helpers.iterate_backward(child_0_children[2]);
            assert.equal(result.node, child_0_children[1]);
            assert.equal(result.iteration_actions.length, 2);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[0].index, -1);
            assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[1].index, 1);
        }

        {
            const result = AST_helpers.iterate_backward(child_0_children[1]);
            assert.equal(result.node, child_0_children[0]);
            assert.equal(result.iteration_actions.length, 2);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[0].index, -1);
            assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[1].index, 0);
        }

        {
            const result = AST_helpers.iterate_backward(child_0_children[0]);
            assert.equal(result.node, children[0]);
            assert.equal(result.iteration_actions.length, 1);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[0].index, -1);
        }

        {
            const result = AST_helpers.iterate_backward(children[0]);
            assert.equal(result.node, node_tree);
            assert.equal(result.iteration_actions.length, 1);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[0].index, -1);
        }

        {
            const result = AST_helpers.iterate_backward(node_tree);
            assert.equal(result.node, undefined);
        }
    });
});


describe("Iterate forward", () => {
    test("Tree 2", () => {

        const node_tree = create_node_tree_2();

        const children = (node_tree.data as AST_helpers.List_data).elements;

        {
            const result = AST_helpers.iterate_forward(node_tree);
            assert.equal(result.node, children[0]);
            assert.equal(result.iteration_actions.length, 1);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[0].index, 0);
        }

        const child_0_children = (children[0].data as AST_helpers.List_data).elements;

        {
            const result = AST_helpers.iterate_forward(children[0]);
            assert.equal(result.node, child_0_children[0]);
            assert.equal(result.iteration_actions.length, 1);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[0].index, 0);
        }

        {
            const result = AST_helpers.iterate_forward(child_0_children[0]);
            assert.equal(result.node, child_0_children[1]);
            assert.equal(result.iteration_actions.length, 2);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[0].index, -1);
            assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[1].index, 1);
        }

        {
            const result = AST_helpers.iterate_forward(child_0_children[1]);
            assert.equal(result.node, child_0_children[2]);
            assert.equal(result.iteration_actions.length, 2);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[0].index, -1);
            assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[1].index, 2);
        }

        {
            const result = AST_helpers.iterate_forward(child_0_children[2]);
            assert.equal(result.node, children[1]);
            assert.equal(result.iteration_actions.length, 3);
            assert.equal(result.iteration_actions[0].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[0].index, -1);
            assert.equal(result.iteration_actions[1].type, AST_helpers.Iteration_action_type.Go_to_parent);
            assert.equal(result.iteration_actions[1].index, -1);
            assert.equal(result.iteration_actions[2].type, AST_helpers.Iteration_action_type.Go_to_child);
            assert.equal(result.iteration_actions[2].index, 1);
        }
    });
});
