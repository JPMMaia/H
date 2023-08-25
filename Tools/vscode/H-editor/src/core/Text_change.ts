import * as Document from "./Document";
import * as Module_change from "./Module_change";
import * as Language from "./Language";
import * as Parser from "./Parser";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import { scan_new_change } from "./Scan_new_changes";

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

export function update(
    language_description: Language.Description,
    state: Document.State,
    text_changes: Text_change[],
    text_after_changes: string
): Document.State {

    const text_change = aggregate_text_changes(state.text, text_after_changes, text_changes);

    const scanned_input_change = scan_new_change(
        state.parse_tree,
        { line: text_change.range.start.line, column: text_change.range.start.character },
        { line: text_change.range.end.line, column: text_change.range.end.character },
        text_change.text
    );

    if (scanned_input_change.new_words.length > 0) {

        const start_change_node_position = scanned_input_change.start_change !== undefined ? scanned_input_change.start_change.position : undefined;
        const after_change_node_position = scanned_input_change.after_change !== undefined ? scanned_input_change.after_change.position : undefined;

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

        // TODO figure out errors

        if (parse_result.status === Parser.Parse_status.Accept) {
            // TODO can be cached
            const production_rule_to_value_map = Parse_tree_convertor.create_production_rule_to_value_map(language_description.production_rules);
            const production_rule_to_change_action_map = Parse_tree_convertor.create_production_rule_to_change_action_map(language_description.production_rules);

            if (state.parse_tree === undefined) {
                state.parse_tree = Parse_tree_convertor.module_to_parse_tree(state.module, state.symbol_database, state.declarations, language_description.production_rules);
            }

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

            // TODO Create symbol changes

            Parser.apply_changes(state.parse_tree, parse_result.changes);
            // TODO Apply symbol changes
            Module_change.update_module(state.module, module_changes);

            // TODO update parse tree text position

            state.text = text_after_changes;
        }
    }

    return state; // TODO also return changes that were not applied?
}

function text_position_to_text_offset(text: string, position: Text_position): number {

    // TODO this is temporary, use vscode builtin function later

    let offset = 0;

    for (let line = 0; line < position.line; ++line) {
        const next_offset = text.indexOf("\n", offset);
        if (next_offset === -1) {
            break;
        }

        offset = next_offset + 1;
        if (offset >= text.length) {
            break;
        }
    }

    offset += position.character;

    return offset;
}

function text_offset_to_text_position(text: string, offset: number): Text_position {

    // TODO this is temporary, use vscode builtin function later

    const target_offset = Math.min(text.length, offset);

    let current_offset = 0;

    let line = 0;
    let character = 0;

    while (current_offset < target_offset) {

        const next_line_offset = text.indexOf("\n", current_offset);
        if (next_line_offset === -1) {
            character = offset - current_offset;
            break;
        }

        if (next_line_offset <= offset) {
            line += 1;
        }
        else {
            character = offset - current_offset;
            break;
        }

        current_offset = next_line_offset + 1;
    }

    return {
        line: line,
        character: character
    };
}

function aggregate_text_changes(before_changes_text: string, after_changes_text: string, text_changes: Text_change[]): Text_change {

    if (text_changes.length === 1) {
        return text_changes[0];
    }

    let global_start_offset = after_changes_text.length;
    let global_change_length = 0;

    for (const change of text_changes) {

        const range_start_offset = text_position_to_text_offset(before_changes_text, change.range.start);

        if (range_start_offset < global_start_offset) {
            global_start_offset = range_start_offset;
        }

        global_change_length += change.text.length;
    }

    const changed_text = after_changes_text.substring(global_start_offset, global_start_offset + global_change_length);
    const global_start = text_offset_to_text_position(after_changes_text, global_start_offset);
    const global_end = text_offset_to_text_position(after_changes_text, global_start_offset + global_change_length);

    return {
        range: {
            start: global_start,
            end: global_end
        },
        text: changed_text
    };
}
