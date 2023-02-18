import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Symbol_database from "./Symbol_database";

export interface Change {

}

export function create_change(node: Abstract_syntax_tree.Node): Change {
    throw Error("Not implemented!");
    return {};
}

export function update(database: Symbol_database.Edit_module_database, change: Change): void {
    throw Error("Not implemented!");
}
