import * as Document from "./Document";
import * as Module_change from "./Module_change";
import * as Language from "./Language";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import { scan_new_change } from "./Scan_new_changes";
import * as Scanner from "./Scanner";

export interface Text_range {
    start: number;
    end: number;
}

export interface Text_change {
    range: Text_range;
    text: string;
}

export function update(
    language_description: Language.Description,
    state: Document.State,
    text_changes: Text_change[],
    text_after_changes: string
): Document.State {

    const text_change = aggregate_text_changes(text_after_changes, [...state.pending_text_changes, ...text_changes]);

    const scanned_input_change = scan_new_change(
        state.parse_tree,
        state.text,
        text_change.range.start,
        text_change.range.end,
        text_change.text
    );

    if (scanned_input_change.new_words.length > 0) {

        const start_change_node_position = (scanned_input_change.start_change !== undefined && scanned_input_change.start_change.node !== undefined) ? scanned_input_change.start_change.node_position : undefined;
        const after_change_node_position = (scanned_input_change.after_change !== undefined && scanned_input_change.after_change.node !== undefined) ? scanned_input_change.after_change.node_position : undefined;

        const parse_result = Parser.parse_incrementally(
            state.parse_tree,
            start_change_node_position,
            scanned_input_change.new_words,
            after_change_node_position,
            language_description.actions_table,
            language_description.go_to_table,
            language_description.array_infos,
            language_description.map_word_to_terminal
        );

        if (parse_result.status === Parser.Parse_status.Accept) {

            if (is_replacing_root(parse_result.changes)) {
                const modify_change = parse_result.changes[0].value as Parser.Modify_change;
                const new_parse_tree = modify_change.new_node;

                // TODO can be cached:
                const production_rule_to_value_map = Parse_tree_convertor.create_production_rule_to_value_map(language_description.production_rules);
                const key_to_production_rule_index = Parse_tree_convertor.create_key_to_production_rule_indices_map(language_description.production_rules);

                state.parse_tree = new_parse_tree;
                state.module = Parse_tree_convertor.parse_tree_to_module(new_parse_tree, language_description.production_rules, production_rule_to_value_map, key_to_production_rule_index);
            }
            else if (state.parse_tree !== undefined) {
                // TODO can be cached
                const production_rule_to_value_map = Parse_tree_convertor.create_production_rule_to_value_map(language_description.production_rules);
                const production_rule_to_change_action_map = Parse_tree_convertor.create_production_rule_to_change_action_map(language_description.production_rules);
                const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(language_description.production_rules);

                const module_changes = Parse_tree_convertor.create_module_changes(
                    state.module,
                    state.declarations,
                    language_description.production_rules,
                    production_rule_to_value_map,
                    production_rule_to_change_action_map,
                    state.parse_tree,
                    parse_result.changes,
                    key_to_production_rule_indices
                );

                Parser.apply_changes(state.parse_tree, parse_result.changes);
                Module_change.update_module(state.module, module_changes);
            }

            state.text = text_after_changes;
            state.pending_text_changes = [];
        }
        else {
            state.pending_text_changes = [text_change];
        }
    }

    return state;
}

function is_replacing_root(changes: Parser.Change[]): boolean {
    if (changes.length === 1 && changes[0].type === Parser.Change_type.Modify) {
        const modify_change = changes[0].value as Parser.Modify_change;
        if (modify_change.new_node.production_rule_index === 0) {
            return true;
        }
    }

    return false;
}

function aggregate_text_changes(after_changes_text: string, text_changes: Text_change[]): Text_change {

    if (text_changes.length === 1) {
        return text_changes[0];
    }

    let global_start_offset = Infinity;
    let global_change_length = 0;

    for (const change of text_changes) {

        const range_start_offset = change.range.start;

        if (range_start_offset < global_start_offset) {
            global_start_offset = range_start_offset;
        }

        global_change_length += change.text.length;
    }

    const changed_text = after_changes_text.substring(global_start_offset, global_start_offset + global_change_length);
    const global_end_offset = global_start_offset + global_change_length;

    return {
        range: {
            start: global_start_offset,
            end: global_end_offset
        },
        text: changed_text
    };
}

function update_parse_tree_text_position_cache(cache: Parse_tree_text_position_cache.Cache, text: string, text_change: Text_change, parse_tree: Parser_node.Node, parse_tree_changes: Parser.Change[]): void {

    // TODO

    // Go through the deletes and modify changes.
    // If deleting a declaration or modifying the parent of a declaration, then remove cached node

    // Then update all cached elements after end-after-changes

    // Then add new cached elements
    // If modify changes have children declarations, then cache those
    // If add changes have declarations, then cache those
}
