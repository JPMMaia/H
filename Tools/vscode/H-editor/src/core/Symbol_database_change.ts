import { onThrowError } from "../utilities/errors";
import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Symbol_database from "./Symbol_database";

export enum Type {
    Replace
}

interface Replace_change {
    position: number[];
    new_node: Abstract_syntax_tree.Node
}

export interface Change {
    type: Type,
    value: Replace_change
}

export function create_replace_change(position: number[], node: Abstract_syntax_tree.Node): Change {
    const change: Replace_change = {
        position: position,
        new_node: node
    };

    return {
        type: Type.Replace,
        value: change
    };
}

export function update(database: Symbol_database.Edit_module_database, root: Abstract_syntax_tree.Node, change: Change): void {
    if (change.type === Type.Replace) {
        const replace_change = change.value as Replace_change;
        if (replace_change.position.length === 0) {

            const new_node = change.value.new_node;
            if (new_node.token !== Abstract_syntax_tree.Token.Module) {
                const message = "Expected Module token when replacing root!";
                onThrowError(message);
                throw Error(message);
            }

            Abstract_syntax_tree.find_child_with_token(new_node, Abstract_syntax_tree.Token.Module_body);

            return;
        }

        const node_that_will_be_replaced = Abstract_syntax_tree.get_node_at_position(root, replace_change.position);
        Abstract_syntax_tree.shallow_copy(node_that_will_be_replaced, replace_change.new_node);
    }
}

function handle_module_body_update(): void {

}

function handle_statement_update(statement_index: number): void {

}