import * as Abstract_syntax_tree from "./Abstract_syntax_tree";

export function create_node(value: string, token: Abstract_syntax_tree.Token, children: Abstract_syntax_tree.Node[], relative_start: number): Abstract_syntax_tree.Node {
    return {
        value: value,
        token: token,
        children: children,
        cache: {
            relative_start: relative_start
        }
    };
}

export function create_empty(): Abstract_syntax_tree.Node {

    const module_children: Abstract_syntax_tree.Node[] = [
        create_node("", Abstract_syntax_tree.Token.Module_head, [], 0),
        create_node("", Abstract_syntax_tree.Token.Module_body, [], 0),
    ];

    return create_node("", Abstract_syntax_tree.Token.Module, module_children, 0);
}

export function create_0(): Abstract_syntax_tree.Node {

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
