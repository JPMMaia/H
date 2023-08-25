import * as Core from "../utilities/coreModelInterface";
import * as Module_change from "./Module_change";
import * as Language from "./Language";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import { scan_new_change } from "./Scan_new_changes";
import * as Symbol_database from "./Symbol_database";

export interface Text_position {
    line: number;
    character: number;
}

export interface Text_range {
    start: Text_position;
    end: Text_position;
}

export interface Text_change {
    range: Text_range;
    text: string;
}

export interface Document_state {
    text: string;
    parse_tree: Parser_node.Node;
    module: Core.Module;
    symbol_database: Symbol_database.Edit_module_database;
    declarations: Parse_tree_convertor.Declaration[];
}

export function update(
    language_description: Language.Description,
    state: Document_state,
    text_changes: Text_change[]
): Document_state {

    // TODO handle other text changes
    const text_change = text_changes[0];

    const parse_tree_root = state.parse_tree;

    const scanned_input_change = scan_new_change(
        parse_tree_root,
        { line: text_change.range.start.line, column: text_change.range.start.character },
        { line: text_change.range.end.line, column: text_change.range.end.character },
        text_change.text
    );

    if (scanned_input_change.new_words.length > 0) {

        const start_change_node_position = scanned_input_change.start_change !== undefined ? scanned_input_change.start_change.position : undefined;
        const after_change_node_position = scanned_input_change.after_change !== undefined ? scanned_input_change.after_change.position : undefined;

        const parse_result = Parser.parse_incrementally(
            parse_tree_root,
            start_change_node_position,
            scanned_input_change.new_words,
            after_change_node_position,
            language_description.actions_table,
            language_description.go_to_table,
            language_description.array_infos,
            language_description.map_word_to_terminal
        );

        // TODO figure out errors

        if (parse_result.status === Parser.Parse_status.Accept) {
            // TODO can be cached
            const production_rule_to_value_map = Parse_tree_convertor.create_production_rule_to_value_map(language_description.production_rules);
            const production_rule_to_change_action_map = Parse_tree_convertor.create_production_rule_to_change_action_map(language_description.production_rules);

            const module_changes = Parse_tree_convertor.create_module_changes(
                state.module,
                state.symbol_database,
                state.declarations,
                language_description.production_rules,
                production_rule_to_value_map,
                production_rule_to_change_action_map,
                state.parse_tree,
                parse_result.changes
            );

            // TODO Create symbol changes ?

            Parser.apply_changes(parse_tree_root, parse_result.changes);

            Module_change.update_module(state.module, module_changes);

            // TODO Apply module changes
            /*const module_pointer = {
                value: module
            };
            Module_change_update.update_object_with_change(module_pointer, module_changes);*/

            // TODO Apply symbol changes

            // TODO update parse tree text position

            // TODO update new text
        }
    }

    return state; // TODO also return changes that were not applied?
}
