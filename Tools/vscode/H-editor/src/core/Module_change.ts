import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Core from "../utilities/coreModelInterface";

export interface Change {

}

export function create_change(node: Abstract_syntax_tree.Node): Change {
    throw Error("Not implemented!");
    return {};
}

export function update(module: Core.Module, change: Change): void {
    throw Error("Not implemented!");
}
