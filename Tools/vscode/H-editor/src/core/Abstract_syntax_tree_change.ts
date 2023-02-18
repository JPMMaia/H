import * as Abstract_syntax_tree from "./Abstract_syntax_tree";

interface Change {

}

export function create_change(node: Abstract_syntax_tree.Node): Change {
    throw Error("Not implemented!");
    return {};
}

export function update(root: Abstract_syntax_tree.Node, change: Change): void {
    throw Error("Not implemented!");
}
