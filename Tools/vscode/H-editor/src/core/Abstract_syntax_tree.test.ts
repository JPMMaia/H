import "mocha";

import * as assert from "assert";
import * as Abstract_syntax_tree from "./Abstract_syntax_tree";

function create_node(value: string, token: Abstract_syntax_tree.Token, children: Abstract_syntax_tree.Node[], relative_start: number): Abstract_syntax_tree.Node {
    return {
        value: value,
        token: token,
        children: children,
        cache: {
            relative_start: relative_start
        }
    };
}

function create_example_0(): Abstract_syntax_tree.Node {

    const children_0_0: Abstract_syntax_tree.Node[] = [
        create_node("r.0.0", Abstract_syntax_tree.Token.Expression_return, [], 4),
        create_node("r.0.1", Abstract_syntax_tree.Token.Expression_constant, [], 10),
    ];

    const children_0_1: Abstract_syntax_tree.Node[] = [
        create_node("r.1.0", Abstract_syntax_tree.Token.Expression_constant, [], 4),
    ];

    const children_0: Abstract_syntax_tree.Node[] = [
        create_node("r.0", Abstract_syntax_tree.Token.Statement, children_0_0, 1),
        create_node("r.1", Abstract_syntax_tree.Token.Statement, children_0_1, 17),
    ];

    return create_node("r", Abstract_syntax_tree.Token.Code_block, children_0, 0);
}


describe("Abstract_syntax_tree.find_node_position", () => {

    const root = create_example_0();

    it("Finds r", () => {
        const position = Abstract_syntax_tree.find_node_position(root, 0);
        assert.deepEqual(position, []);
    });

    it("Finds r.0", () => {
        const position = Abstract_syntax_tree.find_node_position(root, 4);
        assert.deepEqual(position, [0]);
    });

    it("Finds r.0.0", () => {
        const position = Abstract_syntax_tree.find_node_position(root, 5);
        assert.deepEqual(position, [0, 0]);
    });

    it("Finds r.0.1", () => {
        const position = Abstract_syntax_tree.find_node_position(root, 12);
        assert.deepEqual(position, [0, 1]);
    });

    it("Finds r.1", () => {
        const position = Abstract_syntax_tree.find_node_position(root, 18);
        assert.deepEqual(position, [1]);
    });

    it("Finds r.1.0", () => {
        const position = Abstract_syntax_tree.find_node_position(root, 21);
        assert.deepEqual(position, [1, 0]);
    });
});

describe("Abstract_syntax_tree.find_node_common_root", () => {

    it("Finds common root of r.1 and r.0", () => {
        const position = Abstract_syntax_tree.find_node_common_root([1], [0]);
        assert.deepEqual(position, []);
    });

    it("Finds common root of r.0.0 and r.0.1", () => {
        const position = Abstract_syntax_tree.find_node_common_root([0, 0], [0, 1]);
        assert.deepEqual(position, [0]);
    });

    it("Finds common root of r.1.0 and r.0.0", () => {
        const position = Abstract_syntax_tree.find_node_common_root([1, 0], [0, 0]);
        assert.deepEqual(position, []);
    });


    it("Finds common root of r.1.0.2.3 and r.1.0.4.3", () => {
        const position = Abstract_syntax_tree.find_node_common_root([1, 0, 2, 3], [1, 0, 4, 3]);
        assert.deepEqual(position, [1, 0]);
    });

    it("Finds common root of r.1 and r.1.0.4.3", () => {
        const position = Abstract_syntax_tree.find_node_common_root([1], [1, 0, 4, 3]);
        assert.deepEqual(position, [1]);
    });
});

describe("Abstract_syntax_tree.find_node_range", () => {

    it("Finds range of r.0", () => {
        const root = create_example_0();
        const range = Abstract_syntax_tree.find_node_range(root, -1, [0]);
        assert.equal(range.start, 1);
        assert.equal(range.end, 17);
    });

    it("Finds range of r.0.0", () => {
        const root = create_example_0();
        const range = Abstract_syntax_tree.find_node_range(root, -1, [0, 0]);
        assert.equal(range.start, 5);
        assert.equal(range.end, 11);
    });

    it("Finds range of r.0.1", () => {
        const root = create_example_0();
        const range = Abstract_syntax_tree.find_node_range(root, -1, [0, 1]);
        assert.equal(range.start, 11);
        assert.equal(range.end, 17);
    });

    it("Finds range of r.1", () => {
        const root = create_example_0();
        const range = Abstract_syntax_tree.find_node_range(root, -1, [1]);
        assert.equal(range.start, 17);
        assert.equal(range.end, -1);
    });

    it("Finds range of r.1.0", () => {
        const root = create_example_0();
        const range = Abstract_syntax_tree.find_node_range(root, -1, [1, 0]);
        assert.equal(range.start, 21);
        assert.equal(range.end, -1);
    });
});

describe("Abstract_syntax_tree.find_nodes_of_range", () => {

    it("Finds nodes of range [0, 1]", () => {
        const root = create_example_0();
        const result = Abstract_syntax_tree.find_nodes_of_range(root, 0, 1);

        assert.equal(result.parent_position, undefined);
        assert.equal(result.child_indices.start, 0);
        assert.equal(result.child_indices.end, 1);
    });

    it("Finds nodes of range [1, 2]", () => {
        const root = create_example_0();
        const result = Abstract_syntax_tree.find_nodes_of_range(root, 1, 2);

        assert.notEqual(result.parent_position, undefined);
        if (result.parent_position !== undefined) {
            assert.deepEqual(result.parent_position, []);
            assert.equal(result.child_indices.start, 0);
            assert.equal(result.child_indices.end, 1);
        }
    });

    it("Finds nodes of range [6, 10]", () => {
        const root = create_example_0();
        const result = Abstract_syntax_tree.find_nodes_of_range(root, 6, 10);

        assert.notEqual(result.parent_position, undefined);
        if (result.parent_position !== undefined) {
            assert.deepEqual(result.parent_position, []);
            assert.equal(result.child_indices.start, 0);
            assert.equal(result.child_indices.end, 1);
        }
    });

    it("Finds nodes of range [5, 11]", () => {
        const root = create_example_0();
        const result = Abstract_syntax_tree.find_nodes_of_range(root, 5, 11);

        assert.notEqual(result.parent_position, undefined);
        if (result.parent_position !== undefined) {
            assert.deepEqual(result.parent_position, []);
            assert.equal(result.child_indices.start, 0);
            assert.equal(result.child_indices.end, 1);
        }
    });

    it("Finds nodes of range [10, 15]", () => {
        const root = create_example_0();
        const result = Abstract_syntax_tree.find_nodes_of_range(root, 10, 15);

        assert.notEqual(result.parent_position, undefined);
        if (result.parent_position !== undefined) {
            assert.deepEqual(result.parent_position, []);
            assert.equal(result.child_indices.start, 0);
            assert.equal(result.child_indices.end, 1);
        }
    });

    it("Finds nodes of range [10, 19]", () => {
        const root = create_example_0();
        const result = Abstract_syntax_tree.find_nodes_of_range(root, 10, 19);

        assert.notEqual(result.parent_position, undefined);
        if (result.parent_position !== undefined) {
            assert.deepEqual(result.parent_position, []);
            assert.equal(result.child_indices.start, 0);
            assert.equal(result.child_indices.end, 2);
        }
    });

    it("Finds nodes of range [17, 10]", () => {
        const root = create_example_0();
        const result = Abstract_syntax_tree.find_nodes_of_range(root, 17, 19);

        assert.notEqual(result.parent_position, undefined);
        if (result.parent_position !== undefined) {
            assert.deepEqual(result.parent_position, []);
            assert.equal(result.child_indices.start, 1);
            assert.equal(result.child_indices.end, 2);
        }
    });
});

describe("Abstract_syntax_tree.find_top_level_node_position", () => {

    it("Finds statement r.0.0", () => {
        const root = create_example_0();
        const position = Abstract_syntax_tree.find_top_level_node_position(root, [0, 0]);
        assert.deepEqual(position, [0]);
    });

    it("Finds statement r.1", () => {
        const root = create_example_0();
        const position = Abstract_syntax_tree.find_top_level_node_position(root, [1]);
        assert.deepEqual(position, [1]);
    });

    it("Finds code block r", () => {
        const root = create_example_0();
        const position = Abstract_syntax_tree.find_top_level_node_position(root, []);
        assert.deepEqual(position, []);
    });
});

describe("Abstract_syntax_tree.iterate_forward_with_repetition", () => {
    it("Visits example_0 nodes correctly", () => {

        const root = create_example_0();

        let current_node = root;
        let current_position: number[] = [];
        let current_direction = Abstract_syntax_tree.Iterate_direction.Down;

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.notEqual(result, undefined);
            if (result !== undefined) {
                assert.equal(result.next_node.value, "r.0");
                assert.deepEqual(result.next_position, [0]);
                assert.equal(result.direction, Abstract_syntax_tree.Iterate_direction.Down);

                current_node = result.next_node;
                current_position = result.next_position;
                current_direction = result.direction;
            }
        }

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.notEqual(result, undefined);
            if (result !== undefined) {
                assert.equal(result.next_node.value, "r.0.0");
                assert.deepEqual(result.next_position, [0, 0]);
                assert.equal(result.direction, Abstract_syntax_tree.Iterate_direction.Down);

                current_node = result.next_node;
                current_position = result.next_position;
                current_direction = result.direction;
            }
        }

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.notEqual(result, undefined);
            if (result !== undefined) {
                assert.equal(result.next_node.value, "r.0.1");
                assert.deepEqual(result.next_position, [0, 1]);
                assert.equal(result.direction, Abstract_syntax_tree.Iterate_direction.Down);

                current_node = result.next_node;
                current_position = result.next_position;
                current_direction = result.direction;
            }
        }

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.notEqual(result, undefined);
            if (result !== undefined) {
                assert.equal(result.next_node.value, "r.0");
                assert.deepEqual(result.next_position, [0]);
                assert.equal(result.direction, Abstract_syntax_tree.Iterate_direction.Up);

                current_node = result.next_node;
                current_position = result.next_position;
                current_direction = result.direction;
            }
        }

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.notEqual(result, undefined);
            if (result !== undefined) {
                assert.equal(result.next_node.value, "r.1");
                assert.deepEqual(result.next_position, [1]);
                assert.equal(result.direction, Abstract_syntax_tree.Iterate_direction.Down);

                current_node = result.next_node;
                current_position = result.next_position;
                current_direction = result.direction;
            }
        }

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.notEqual(result, undefined);
            if (result !== undefined) {
                assert.equal(result.next_node.value, "r.1.0");
                assert.deepEqual(result.next_position, [1, 0]);
                assert.equal(result.direction, Abstract_syntax_tree.Iterate_direction.Down);

                current_node = result.next_node;
                current_position = result.next_position;
                current_direction = result.direction;
            }
        }

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.notEqual(result, undefined);
            if (result !== undefined) {
                assert.equal(result.next_node.value, "r.1");
                assert.deepEqual(result.next_position, [1]);
                assert.equal(result.direction, Abstract_syntax_tree.Iterate_direction.Up);

                current_node = result.next_node;
                current_position = result.next_position;
                current_direction = result.direction;
            }
        }

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.notEqual(result, undefined);
            if (result !== undefined) {
                assert.equal(result.next_node.value, "r");
                assert.deepEqual(result.next_position, []);
                assert.equal(result.direction, Abstract_syntax_tree.Iterate_direction.Up);

                current_node = result.next_node;
                current_position = result.next_position;
                current_direction = result.direction;
            }
        }

        {
            const result = Abstract_syntax_tree.iterate_forward_with_repetition(root, current_node, current_position, current_direction);
            assert.equal(result, undefined);
        }
    });
});
