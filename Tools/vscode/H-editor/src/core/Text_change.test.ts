import "mocha";

import * as assert from "assert";
import * as Abstract_syntax_tree_from_module from "./Abstract_syntax_tree_from_module";
import * as Default_grammar from "./Default_grammar";
import * as Grammar from "./Grammar";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Language from "./Language";
import * as Symbol_database from "./Symbol_database";
import * as Text_change from "./Text_change";

describe("Text_change.update", () => {

    const language_description = Language.create_default_description();

    const module = Module_examples.create_empty();
    const symbol_database = Symbol_database.create_edit_database(module);
    const declarations = Parse_tree_convertor.create_declarations(module);
    const initial_parse_tree = Parse_tree_convertor.module_to_parse_tree(module, symbol_database, declarations, language_description.production_rules);

    it("Handles add first character", () => {

        const document_state: Text_change.Document_state = {
            text: "",
            parse_tree: initial_parse_tree,
            module: module,
            symbol_database: symbol_database,
            declarations: declarations
        };

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                },
                text: "m"
            }
        ];

        Text_change.update(
            language_description,
            document_state,
            text_changes
        );
    });
});
