import "mocha";

import * as assert from "assert";
import * as Abstract_syntax_tree from "./Abstract_syntax_tree";

function create_node(value: string, token: Abstract_syntax_tree.Token, children: Abstract_syntax_tree.Node[]): Abstract_syntax_tree.Node {
    return {
        value: value,
        token: token,
        children: children,
        cache: {
            relative_start: 0
        }
    };
}

function create_example_0(): Abstract_syntax_tree.Node {

    const children_0_0: Abstract_syntax_tree.Node[] = [
        create_node("r.0.0", Abstract_syntax_tree.Token.Expression_return, []),
        create_node("r.0.1", Abstract_syntax_tree.Token.Expression_constant, []),
    ];

    const children_0_1: Abstract_syntax_tree.Node[] = [
        create_node("r.1.0", Abstract_syntax_tree.Token.Expression_constant, []),
    ];

    const children_0: Abstract_syntax_tree.Node[] = [
        create_node("r.0", Abstract_syntax_tree.Token.Statement, children_0_0),
        create_node("r.1", Abstract_syntax_tree.Token.Statement, children_0_1),
    ];

    return create_node("r", Abstract_syntax_tree.Token.Code_block, children_0);
}

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
