import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Core from "../utilities/coreModelInterface";
import * as Grammar from "./Grammar";

export function create_module_node(module: Core.Module, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {
    throw Error("Not implemented!");
    return {
        value: "",
        token: Abstract_syntax_tree.Token.Module,
        children: [],
        cache: {
            relative_start: 0
        }
    };
}
