import "mocha";

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

function create_root_node_tree(): AST_helpers.Node {
    const root = AST_helpers.create_list_node(
        undefined,
        -1,
        [
        ],
        {
            type: AST_helpers.Metadata_type.Module
        }
    );

    root.data = {
        elements: [],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

function create_module_with_functions(function_count: number): AST_helpers.Node {
    const root = create_root_node_tree();

    const elements: AST_helpers.Node[] = [];

    for (let index = 0; index < function_count; ++index) {
        elements.push(
            create_function_node_tree(root, index)
        );
    }

    root.data = {
        elements: elements,
        html_tag: "span",
        html_class: ""
    };

    return root;
}

function create_function_node_tree(parent: AST_helpers.Node, index_in_parent: number): AST_helpers.Node {
    const root = AST_helpers.create_list_node(
        parent,
        index_in_parent,
        [
        ],
        {
            type: AST_helpers.Metadata_type.Function
        }
    );

    root.data = {
        elements: [
            create_function_declaration_node_tree(root, 0),
            create_function_definition_node_tree(root, 1)
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

function create_function_declaration_node_tree(parent: AST_helpers.Node, index_in_parent: number): AST_helpers.Node {
    const root = AST_helpers.create_list_node(
        parent,
        index_in_parent,
        [
        ],
        {
            type: AST_helpers.Metadata_type.Function_declaration
        }
    );

    root.data = {
        elements: [
            AST_helpers.create_string_node(root, 0, "function", "span", false, { type: AST_helpers.Metadata_type.Function_keyword }),
            AST_helpers.create_string_node(root, 1, " ", "span", false, { type: AST_helpers.Metadata_type.Space }),
            AST_helpers.create_string_node(root, 2, "foo", "span", false, { type: AST_helpers.Metadata_type.Function_name }),
            AST_helpers.create_string_node(root, 3, "(", "span", false, { type: AST_helpers.Metadata_type.Parenthesis_open }),
            AST_helpers.create_string_node(root, 4, ")", "span", false, { type: AST_helpers.Metadata_type.Parenthesis_close }),
            AST_helpers.create_string_node(root, 5, "->", "span", false, { type: AST_helpers.Metadata_type.Separator }),
            AST_helpers.create_string_node(root, 6, "(", "span", false, { type: AST_helpers.Metadata_type.Parenthesis_open }),
            AST_helpers.create_string_node(root, 7, ")", "span", false, { type: AST_helpers.Metadata_type.Parenthesis_close }),
            AST_helpers.create_string_node(root, 8, "", "span", false, { type: AST_helpers.Metadata_type.Function_declaration_end }),
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

function create_function_definition_node_tree(parent: AST_helpers.Node, index_in_parent: number): AST_helpers.Node {
    const root = AST_helpers.create_list_node(
        parent,
        index_in_parent,
        [
        ],
        {
            type: AST_helpers.Metadata_type.Function_definition
        }
    );

    root.data = {
        elements: [
            AST_helpers.create_string_node(root, 0, "{", "span", false, { type: AST_helpers.Metadata_type.Curly_braces_open }),
            create_simple_expression_node_tree(root, 1),
            AST_helpers.create_string_node(root, 2, "}", "span", false, { type: AST_helpers.Metadata_type.Curly_braces_close }),
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

function create_simple_expression_node_tree(parent: AST_helpers.Node, index_in_parent: number): AST_helpers.Node {
    const root = AST_helpers.create_list_node(
        parent,
        index_in_parent,
        [
        ],
        {
            type: AST_helpers.Metadata_type.Expression
        }
    );

    root.data = {
        elements: [
            AST_helpers.create_string_node(root, 0, "return", "span", false, { type: AST_helpers.Metadata_type.Expression_return }),
            AST_helpers.create_string_node(root, 1, " ", "span", false, { type: AST_helpers.Metadata_type.Space }),
            AST_helpers.create_string_node(root, 2, "0", "span", false, { type: AST_helpers.Metadata_type.Expression_constant }),
            AST_helpers.create_string_node(root, 3, ";", "span", false, { type: AST_helpers.Metadata_type.Statement_end }),
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

describe("Find previous sibling node", () => {
    it("Previous sibling of child 0", () => {

        const node_tree = create_node_tree_1();
        const list_data = (node_tree.data as AST_helpers.List_data);

        const child_0 = list_data.elements[0];
        const result = AST_helpers.find_previous_sibling_node(child_0);
        assert.equal(result.node, undefined);
        assert.equal(result.iteration_actions.length, 0);
    });

    it("Previous sibling of child 1", () => {

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

    it("Previous sibling of child 2", () => {

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
    it("Next sibling of child 0", () => {

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

    it("Next sibling of child 1", () => {

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

    it("Next sibling of child 2", () => {

        const node_tree = create_node_tree_1();
        const list_data = (node_tree.data as AST_helpers.List_data);

        const child_2 = list_data.elements[2];
        const result = AST_helpers.find_next_sibling_node(child_2);
        assert.equal(result.node, undefined);
        assert.equal(result.iteration_actions.length, 0);
    });
});

describe("Find left most leaf node", () => {
    it("Tree 2", () => {

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
    it("Tree 2", () => {

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
    it("Tree 2", () => {

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
    it("Tree 2", () => {

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

describe("to_string", () => {
    it("function tree", () => {

        const node_tree = create_module_with_functions(1);

        const text = AST_helpers.to_string(node_tree);

        {
            assert.equal(node_tree.cache.relative_start, 0);
        }

        const function_node_tree = (node_tree.data as AST_helpers.List_data).elements[0];

        {
            assert.equal(function_node_tree.cache.relative_start, 0);
        }

        const children = (function_node_tree.data as AST_helpers.List_data).elements;
        const function_declaration_node_tree = children[0];
        const function_definition_node_tree = children[1];

        {
            assert.equal(function_declaration_node_tree.cache.relative_start, 0);
            assert.equal(function_definition_node_tree.cache.relative_start, text.indexOf("{") - node_tree.cache.relative_start);
        }

        {
            const declaration_children = (function_declaration_node_tree.data as AST_helpers.List_data).elements;
            assert.equal(declaration_children[0].cache.relative_start, 0); // function
            assert.equal(declaration_children[1].cache.relative_start, 8); // <space>
            assert.equal(declaration_children[2].cache.relative_start, 9); // foo
            assert.equal(declaration_children[3].cache.relative_start, 12); // (
            assert.equal(declaration_children[4].cache.relative_start, 13); // )
            assert.equal(declaration_children[5].cache.relative_start, 14); // ->
            assert.equal(declaration_children[6].cache.relative_start, 16); // (
            assert.equal(declaration_children[7].cache.relative_start, 17); // )
            assert.equal(declaration_children[8].cache.relative_start, 18); // <end>
        }

        {
            const parent_global_start = text.indexOf("{");

            const definition_children = (function_definition_node_tree.data as AST_helpers.List_data).elements;

            assert.equal(definition_children[0].cache.relative_start, 0); // {

            assert.equal(definition_children[1].cache.relative_start, text.indexOf("return") - parent_global_start); // start of expression
            {
                const expression_children = (definition_children[1].data as AST_helpers.List_data).elements;
                assert.equal(expression_children[0].cache.relative_start, 0); // return
                assert.equal(expression_children[1].cache.relative_start, 6); // <space>
                assert.equal(expression_children[2].cache.relative_start, 7); // 0
                assert.equal(expression_children[3].cache.relative_start, 8); // ;
            }

            assert.equal(definition_children[2].cache.relative_start, text.indexOf("}") - parent_global_start); // }
        }
    });
});

describe("get_node_position", () => {
    it("returns position of '0'", () => {
        const node_tree = create_module_with_functions(1);
        const text = AST_helpers.to_string(node_tree);

        const index_of_0 = text.indexOf("0");
        const node_position = AST_helpers.get_node_position(node_tree, index_of_0);

        assert.equal(node_position.indices.length, 4);
        assert.equal(node_position.indices[0], 0);
        assert.equal(node_position.indices[1], 1);
        assert.equal(node_position.indices[2], 1);
        assert.equal(node_position.indices[3], 2);

        assert.equal(node_position.offset, 0);
    });

    it("returns position of 'turn'", () => {
        const node_tree = create_module_with_functions(1);
        const text = AST_helpers.to_string(node_tree);

        const index_of_return = text.indexOf("return");
        const node_position = AST_helpers.get_node_position(node_tree, index_of_return + 2);

        assert.equal(node_position.indices.length, 4);
        assert.equal(node_position.indices[0], 0);
        assert.equal(node_position.indices[1], 1);
        assert.equal(node_position.indices[2], 1);
        assert.equal(node_position.indices[3], 0);

        assert.equal(node_position.offset, 2);
    });
});
