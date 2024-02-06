import * as Document from "./Document";
import * as Module_change from "./Module_change";
import * as Language from "./Language";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import { has_meaningful_content, scan_new_change } from "./Scan_new_changes";
import * as Scanner from "./Scanner";

const g_debug_validate = false;

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

    const text_change = aggregate_text_changes(state.text, [...state.pending_text_changes, ...text_changes]);

    const scanned_input_change = scan_new_change(
        state.parse_tree,
        state.text,
        text_change.range.start,
        text_change.range.end,
        text_change.text
    );

    if (has_meaningful_content(scanned_input_change)) {

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

                state.parse_tree = new_parse_tree;
                state.module = Parse_tree_convertor.parse_tree_to_module(new_parse_tree, language_description.production_rules, language_description.mappings, language_description.key_to_production_rule_indices);
            }
            else if (state.parse_tree !== undefined) {
                const simplified_changes = Parser.simplify_changes(state.parse_tree, parse_result.changes);

                const module_changes = Parse_tree_convertor.create_module_changes(
                    state.module,
                    language_description.production_rules,
                    state.parse_tree,
                    simplified_changes,
                    language_description.mappings,
                    language_description.key_to_production_rule_indices
                );

                Parser.apply_changes(state.parse_tree, parse_result.changes);
                Module_change.update_module(state.module, module_changes);
            }

            state.text = text_after_changes;
            state.pending_text_changes = [];
            state.messages = [];
        }
        else {
            state.pending_text_changes = [text_change];
            state.messages = parse_result.messages;
        }

        if (g_debug_validate) {
            const scanned_words = Scanner.scan(text_after_changes, 0, text_after_changes.length);
            const expected_parse_tree = Parser.parse(scanned_words, language_description.actions_table, language_description.go_to_table, language_description.array_infos, language_description.map_word_to_terminal);

            if ((state.parse_tree === undefined && expected_parse_tree !== undefined) || (state.parse_tree !== undefined && expected_parse_tree === undefined)) {
                console.log("Error: state.parse_tree does not match expected_parse_tree");
            }

            if (state.parse_tree !== undefined && expected_parse_tree !== undefined && !Parser_node.are_equal(state.parse_tree, expected_parse_tree)) {
                console.log("Error: state.parse_tree does not match expected_parse_tree");
            }

            if (expected_parse_tree !== undefined) {
                const expected_module = Parse_tree_convertor.parse_tree_to_module(expected_parse_tree, language_description.production_rules, language_description.mappings, language_description.key_to_production_rule_indices);

                const expected_module_string = expected_module.toString();
                const actual_module_string = state.module.toString();
                if (actual_module_string !== expected_module_string) {
                    console.log("Error: state.module does not match expected_module");
                }
            }
            else {
                // TODO compare module with empty
            }
        }
    }
    else {
        state.text = text_after_changes;
        state.pending_text_changes = [];
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

function compose_text_changes(original_text: string, first: Text_change, second: Text_change): Text_change {

    const end = (first.range.start + first.text.length) <= second.range.end ? second.range.end - first.text.length + (first.range.end - first.range.start) : first.range.end;

    if (first.range.start <= second.range.start) {
        const text_v0 = first.text + original_text.substring(first.range.end, first.range.end + Math.max(0, second.range.start - first.range.end - first.text.length));
        const text_v1 = text_v0.substring(0, second.range.start - first.range.start) + second.text + text_v0.substring(second.range.end - first.range.start, text_v0.length);
        const start = first.range.start;
        return {
            range: {
                start: start,
                end: end
            },
            text: text_v1
        };
    }
    else {
        const text_v0 = original_text.substring(second.range.end, second.range.end + Math.max(0, first.range.start - second.range.end)) + first.text;
        const text_v1 = second.text + text_v0.substring(second.range.end - first.range.start, text_v0.length);
        const start = second.range.start;
        return {
            range: {
                start: start,
                end: end
            },
            text: text_v1
        };
    }
}

export function aggregate_text_changes(original_text: string, text_changes: Text_change[]): Text_change {

    if (text_changes.length === 1) {
        return text_changes[0];
    }

    let composed = text_changes[0];

    for (let index = 1; index < text_changes.length; ++index) {
        const next_change = text_changes[index];
        composed = compose_text_changes(original_text, composed, next_change);
    }

    return composed;
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
