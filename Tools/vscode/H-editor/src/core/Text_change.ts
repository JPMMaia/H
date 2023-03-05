import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Core from "../utilities/coreModelInterface";
import * as Symbol_database from "./Symbol_database";
import * as Grammar from "./Grammar";

export interface Change {
    range_offset: number;
    range_length: number;
    new_text: string;
}

export function update(
    text_after_change: string,
    change: Change,
    module: Core.Module,
    symbol_database: Symbol_database.Edit_module_database,
    grammar: Grammar.Grammar,
    abstract_syntax_tree: Abstract_syntax_tree.Node
): void {

}
