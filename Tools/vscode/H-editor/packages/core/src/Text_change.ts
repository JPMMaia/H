import * as Document from "./Document";
import * as Core from "./Core_intermediate_representation";
import * as Parser_node from "./Parser_node";
import * as Tree_sitter_parser from "./Tree_sitter_parser";
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
    parser: Tree_sitter_parser.Parser,
    state: Document.State,
    text_changes: Text_change[],
    text_after_changes: string,
    add_source_location: boolean = true
): Document.State {

    const result = full_parse_with_source_locations(parser, state.document_file_path, text_after_changes, add_source_location);

    if (result.diagnostics.length === 0) {
        state.valid = {
            module: result.module,
            parse_tree: result.parse_tree,
            tree_sitter_tree: result.tree_sitter_tree,
            text: text_after_changes
        };
        state.diagnostics = [];
        state.with_errors = undefined;
    }
    else {
        state.with_errors = {
            module: result.module !== undefined ? result.module : (state.valid.module !== undefined ? JSON.parse(JSON.stringify(state.valid.module)) : undefined),
            parse_tree: result.parse_tree !== undefined ? result.parse_tree : (state.valid.parse_tree !== undefined ? JSON.parse(JSON.stringify(state.valid.parse_tree)) : undefined),
            tree_sitter_tree: result.tree_sitter_tree,
            text: text_after_changes
        };
        state.diagnostics = result.diagnostics;
    }

    return state;
}

export function full_parse_with_source_locations(
    parser: Tree_sitter_parser.Parser,
    document_file_path: string,
    input_text: string,
    add_source_location = true
): { module: Core.Module | undefined, parse_tree: Parser_node.Node | undefined, tree_sitter_tree: Tree_sitter_parser.Tree, diagnostics: Validation.Diagnostic[] } {

    const tree = Tree_sitter_parser.parse(parser, input_text);
    const core_tree = Tree_sitter_parser.to_parser_node(tree.rootNode, add_source_location);

    const diagnostics: Validation.Diagnostic[] = [];

    if (tree.rootNode.hasError) {
        diagnostics.push(...Validation.validate_syntax_errors(document_file_path, tree.rootNode));
        return {
            module: undefined,
            parse_tree: core_tree,
            tree_sitter_tree: tree,
            diagnostics: diagnostics,
        };
    }

    {
        diagnostics.push(...Validation.validate_parser_node(document_file_path, [], core_tree));
        if (diagnostics.length > 0) {
            return {
                module: undefined,
                parse_tree: core_tree,
                tree_sitter_tree: tree,
                diagnostics: diagnostics,
            };
        }
    }

    const core_module = Tree_sitter_parser.to_core_module(core_tree);
    if (document_file_path.length > 0) {
        core_module.source_file_path = document_file_path;
    }

    return {
        module: core_module,
        parse_tree: core_tree,
        tree_sitter_tree: tree,
        diagnostics: diagnostics,
    };
}

export async function get_all_diagnostics(
    document_state: Document.State,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Validation.Diagnostic[]> {
    const diagnostics = [...document_state.diagnostics];

    if (diagnostics.length === 0 && document_state.with_errors !== undefined && document_state.with_errors.parse_tree !== undefined) {
        diagnostics.push(...Validation.validate_parser_node(document_state.document_file_path, [], document_state.with_errors.parse_tree));

        if (diagnostics.length === 0) {
            diagnostics.push(...await Validation.validate_module(document_state.document_file_path, document_state.with_errors.text, document_state.with_errors.module, document_state.with_errors.parse_tree, [], document_state.with_errors.parse_tree, get_parse_tree));
        }
    }
    else if (diagnostics.length === 0 && document_state.valid.parse_tree !== undefined) {
        diagnostics.push(...Validation.validate_parser_node(document_state.document_file_path, [], document_state.valid.parse_tree));

        if (diagnostics.length === 0) {
            diagnostics.push(...await Validation.validate_module(document_state.document_file_path, document_state.valid.text, document_state.valid.module, document_state.valid.parse_tree, [], document_state.valid.parse_tree, get_parse_tree));
        }
    }

    return diagnostics;
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
