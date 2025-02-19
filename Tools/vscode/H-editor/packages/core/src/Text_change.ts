import * as Document from "./Document";
import * as Core from "./Core_intermediate_representation";
import * as Language from "./Language";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";
import { has_meaningful_content, scan_new_change } from "./Scan_new_changes";
import * as Scanner from "./Scanner";
import * as Validation from "./Validation";

const g_debug_validate = false;

export interface Text_range {
    start: number;
    end: number;
}

export interface Text_change {
    range: Text_range;
    text: string;
}

export function apply_text_changes(text: string, changes: Text_change[]): string {
    let new_text = text;

    for (const change of changes) {
        const before_text = new_text.substring(0, change.range.start);
        const after_text = new_text.substring(change.range.end, new_text.length);
        new_text = before_text + change.text + after_text;
    }

    return new_text;
}

export function update(
    language_description: Language.Description,
    state: Document.State,
    text_changes: Text_change[],
    text_after_changes: string,
    use_incremental: boolean = false
): Document.State {

    if (!use_incremental) {
        const result = full_parse_with_source_locations(language_description, state.document_file_path, text_after_changes);

        if (result.diagnostics.length === 0) {
            state.valid = {
                module: result.module,
                parse_tree: result.parse_tree,
                parse_tree_text_position_cache: result.position_cache,
                text: text_after_changes
            };
            state.diagnostics = [];
            state.with_errors = undefined;
        }
        else {
            state.with_errors = {
                module: result.module !== undefined ? result.module : (state.valid.module !== undefined ? JSON.parse(JSON.stringify(state.valid.module)) : undefined),
                parse_tree: result.parse_tree !== undefined ? result.parse_tree : (state.valid.parse_tree !== undefined ? JSON.parse(JSON.stringify(state.valid.parse_tree)) : undefined),
                parse_tree_text_position_cache: result.parse_tree !== undefined ? result.position_cache : state.valid.parse_tree_text_position_cache,
                text: text_after_changes
            };
            state.diagnostics = result.diagnostics;
        }

        return state;
    }

    const text_change = aggregate_text_changes(state.valid.text, [...state.pending_text_changes, ...text_changes]);
    state.pending_text_changes = [text_change];

    const scanned_input_change = scan_new_change(
        state.valid.parse_tree,
        state.valid.text,
        text_change.range.start,
        text_change.range.end,
        text_change.text
    );

    {
        const diagnostics = Validation.validate_scanned_input(state.document_file_path, scanned_input_change.new_words);
        if (diagnostics.length > 0) {
            state.diagnostics = diagnostics;
            return state;
        }
    }

    if (has_meaningful_content(scanned_input_change)) {

        const start_change_node_position = (scanned_input_change.start_change !== undefined && scanned_input_change.start_change.node !== undefined) ? scanned_input_change.start_change.node_position : undefined;
        const after_change_node_position = (scanned_input_change.after_change !== undefined && scanned_input_change.after_change.node !== undefined) ? scanned_input_change.after_change.node_position : undefined;

        const parse_result = Parser.parse_incrementally(
            state.document_file_path,
            state.valid.parse_tree,
            start_change_node_position,
            scanned_input_change.new_words,
            after_change_node_position,
            language_description.actions_table,
            language_description.go_to_table,
            language_description.array_infos,
            language_description.map_word_to_terminal
        );
        state.diagnostics = parse_result.diagnostics;

        if (parse_result.status === Parser.Parse_status.Accept) {

            {
                const cache_for_validation = Parse_tree_text_position_cache.clone_cache(state.valid.parse_tree_text_position_cache);
                Parse_tree_text_position_cache.update_cache(cache_for_validation, parse_result.changes, text_change, text_after_changes);

                const diagnostics = validate_parse_changes(state.document_file_path, parse_result.changes, cache_for_validation);
                if (diagnostics.length > 0) {
                    state.diagnostics.push(...diagnostics);
                    return state;
                }
            }

            if (Parser.is_replacing_root(parse_result.changes)) {
                const modify_change = parse_result.changes[0].value as Parser.Modify_change;
                const new_parse_tree = modify_change.new_node;

                const new_module = Parse_tree_convertor.parse_tree_to_module(new_parse_tree, language_description.mappings);
                if (state.document_file_path.length > 0) {
                    new_module.source_file_path = state.document_file_path;
                }

                if (state.diagnostics.length === 0) {
                    state.valid.parse_tree = new_parse_tree;
                    state.valid.module = new_module;
                    Parse_tree_text_position_cache.update_cache(state.valid.parse_tree_text_position_cache, parse_result.changes, text_change, text_after_changes);
                    state.valid.text = text_after_changes;
                    state.pending_text_changes = [];
                    state.with_errors = undefined;
                }
                else {
                    const new_cache = Parse_tree_text_position_cache.clone_cache(state.valid.parse_tree_text_position_cache);
                    Parse_tree_text_position_cache.update_cache(new_cache, parse_result.changes, text_change, text_after_changes);

                    state.with_errors = {
                        module: new_module,
                        parse_tree: new_parse_tree,
                        parse_tree_text_position_cache: new_cache,
                        text: text_after_changes
                    };
                }
            }
            else if (state.valid.parse_tree !== undefined) {
                const simplified_changes = Parser.simplify_changes(state.valid.parse_tree, parse_result.changes);

                const module_changes = Parse_tree_convertor.create_module_changes(
                    state.valid.module,
                    language_description.production_rules,
                    state.valid.parse_tree,
                    simplified_changes,
                    language_description.mappings
                );

                if (state.diagnostics.length === 0) {
                    Parser.apply_changes(state.valid.parse_tree, [], parse_result.changes);
                    Parse_tree_convertor.apply_module_changes(state.valid.module, module_changes);
                    Parse_tree_text_position_cache.update_cache(state.valid.parse_tree_text_position_cache, parse_result.changes, text_change, text_after_changes);
                    state.valid.text = text_after_changes;
                    state.pending_text_changes = [];
                    state.with_errors = undefined;
                }
                else {
                    const parse_tree_with_errors = Parser_node.deep_clone_node(state.valid.parse_tree);
                    Parser.apply_changes(parse_tree_with_errors, [], parse_result.changes);

                    const module_with_errors = JSON.parse(JSON.stringify(state.valid.module));
                    Parse_tree_convertor.apply_module_changes(module_with_errors, module_changes);

                    const new_cache = Parse_tree_text_position_cache.clone_cache(state.valid.parse_tree_text_position_cache);
                    Parse_tree_text_position_cache.update_cache(new_cache, parse_result.changes, text_change, text_after_changes);

                    state.with_errors = {
                        module: module_with_errors,
                        parse_tree: parse_tree_with_errors,
                        parse_tree_text_position_cache: new_cache,
                        text: text_after_changes
                    };
                }
            }
        }

        if (g_debug_validate) {
            const scanned_words = Scanner.scan(text_after_changes, 0, text_after_changes.length, { line: 1, column: 1 });
            const expected_parse_result = Parser.parse(state.document_file_path, scanned_words, language_description.actions_table, language_description.go_to_table, language_description.array_infos, language_description.map_word_to_terminal);
            if (expected_parse_result.diagnostics.length === 0) {
                const expected_parse_tree = expected_parse_result.parse_tree;

                if ((state.valid.parse_tree === undefined && expected_parse_tree !== undefined) || (state.valid.parse_tree !== undefined && expected_parse_tree === undefined)) {
                    console.log("Error: state.parse_tree does not match expected_parse_tree");
                }

                if (state.valid.parse_tree !== undefined && expected_parse_tree !== undefined && !Parser_node.are_equal(state.valid.parse_tree, expected_parse_tree)) {
                    console.log("Error: state.parse_tree does not match expected_parse_tree");
                }

                if (expected_parse_tree !== undefined) {
                    const expected_module = Parse_tree_convertor.parse_tree_to_module(expected_parse_tree, language_description.mappings);

                    const expected_module_string = expected_module.toString();
                    const actual_module_string = state.valid.module.toString();
                    if (actual_module_string !== expected_module_string) {
                        console.log("Error: state.module does not match expected_module");
                    }
                }
                else {
                    // TODO compare module with empty
                }
            }
        }
    }
    else {
        Parse_tree_text_position_cache.update_cache(state.valid.parse_tree_text_position_cache, [], text_change, text_after_changes);
        state.valid.text = text_after_changes;
        state.pending_text_changes = [];
        state.with_errors = undefined;
        state.diagnostics = [];
    }

    return state;
}

export function full_parse_with_source_locations(
    language_description: Language.Description,
    document_file_path: string,
    input_text: string
): { module: Core.Module | undefined, parse_tree: Parser_node.Node | undefined, diagnostics: Validation.Diagnostic[], position_cache: Parse_tree_text_position_cache.Cache } {
    const scanned_words = Scanner.scan(input_text, 0, input_text.length, { line: 1, column: 1 });

    const parse_tree_result = Parser.parse_incrementally(
        document_file_path,
        undefined,
        undefined,
        scanned_words,
        undefined,
        language_description.actions_table,
        language_description.go_to_table,
        language_description.array_infos,
        language_description.map_word_to_terminal
    );

    if (parse_tree_result.status !== Parser.Parse_status.Accept) {
        return { module: undefined, parse_tree: undefined, diagnostics: parse_tree_result.diagnostics, position_cache: undefined };
    }

    const parse_tree = (parse_tree_result.changes[0].value as Parser.Modify_change).new_node;
    Parse_tree_text_iterator.add_source_locations_to_parse_tree_nodes(parse_tree, input_text);

    const position_cache = Parse_tree_text_position_cache.create_empty_cache();
    Parse_tree_text_position_cache.update_cache(position_cache, parse_tree_result.changes, { range: { start: 0, end: 0 }, text: input_text }, input_text);

    {
        const diagnostics = validate_parse_changes(document_file_path, parse_tree_result.changes, position_cache);
        if (diagnostics.length > 0) {
            return { module: undefined, parse_tree: parse_tree, diagnostics: diagnostics, position_cache: position_cache };
        }
    }

    const module = Parse_tree_convertor.parse_tree_to_module(parse_tree, language_description.mappings);
    module.source_file_path = document_file_path.replace(/\\/g, "/");

    return { module: module, parse_tree: parse_tree, diagnostics: parse_tree_result.diagnostics, position_cache: position_cache };
}

export async function get_all_diagnostics(
    language_description: Language.Description,
    document_state: Document.State,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Validation.Diagnostic[]> {
    const diagnostics = [...document_state.diagnostics];

    if (diagnostics.length === 0 && document_state.with_errors !== undefined && document_state.with_errors.parse_tree !== undefined) {
        diagnostics.push(...Validation.validate_parser_node(document_state.document_file_path, [], document_state.with_errors.parse_tree, document_state.with_errors.parse_tree_text_position_cache));

        if (diagnostics.length === 0) {
            diagnostics.push(...await Validation.validate_module(document_state.document_file_path, language_description, document_state.with_errors.text, document_state.with_errors.module, document_state.with_errors.parse_tree, [], document_state.with_errors.parse_tree, document_state.with_errors.parse_tree_text_position_cache, get_core_module));
        }
    }
    else if (diagnostics.length === 0 && document_state.valid.parse_tree !== undefined) {
        diagnostics.push(...Validation.validate_parser_node(document_state.document_file_path, [], document_state.valid.parse_tree, document_state.valid.parse_tree_text_position_cache));

        if (diagnostics.length === 0) {
            diagnostics.push(...await Validation.validate_module(document_state.document_file_path, language_description, document_state.valid.text, document_state.valid.module, document_state.valid.parse_tree, [], document_state.valid.parse_tree, document_state.valid.parse_tree_text_position_cache, get_core_module));
        }
    }

    return diagnostics;
}

function validate_parse_changes(
    document_file_path: string,
    changes: Parser.Change[],
    cache: Parse_tree_text_position_cache.Cache
): Validation.Diagnostic[] {

    for (const change of changes) {
        if (change.type === Parser.Change_type.Add) {
            const add_change = change.value as Parser.Add_change;

            for (let node_index = 0; node_index < add_change.new_nodes.length; ++node_index) {
                const new_node_position = [...add_change.parent_position, add_change.index + node_index];
                const new_node = add_change.new_nodes[node_index];

                const diagnostics = Validation.validate_parser_node(document_file_path, new_node_position, new_node, cache);
                if (diagnostics.length > 0) {
                    return diagnostics;
                }
            }
        }
        else if (change.type === Parser.Change_type.Modify) {
            const modify_change = change.value as Parser.Modify_change;

            const diagnostics = Validation.validate_parser_node(document_file_path, modify_change.position, modify_change.new_node, cache);
            if (diagnostics.length > 0) {
                return diagnostics;
            }
        }
    }

    return [];
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

    let composed: Text_change = {
        range: {
            start: text_changes[0].range.start,
            end: text_changes[0].range.end
        },
        text: text_changes[0].text
    };

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
