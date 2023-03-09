import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Grammar from "./Grammar";
import * as Parser from "./Parser";
import * as Scanner from "./Scanner";

export enum Type {
    Add,
    Remove,
    Modify
}

export interface Change {
    type: Type,
    value: Add_change | Remove_change | Modify_change
}

export interface Add_change {
    position: number[];
    new_node: Abstract_syntax_tree.Node;
}

function create_add_change(position: number[], new_node: Abstract_syntax_tree.Node): Change {
    return {
        type: Type.Add,
        value: {
            position: position,
            new_node: new_node
        }
    };
}

export interface Remove_change {
    position: number[];
}

function create_remove_change(position: number[]): Change {
    return {
        type: Type.Remove,
        value: {
            position: position
        }
    };
}

export interface Modify_change {
    position: number[];
    new_node: Abstract_syntax_tree.Node;
}

function create_modify_change(position: number[], new_node: Abstract_syntax_tree.Node): Change {
    return {
        type: Type.Modify,
        value: {
            position: position,
            new_node: new_node
        }
    };
}

export interface Text_change {
    range_offset: number;
    range_length: number;
    new_text: string;
}

function get_position_to_add(main_node_position: number[], main_node: Abstract_syntax_tree.Node, new_node: Abstract_syntax_tree.Node): number[] {

    switch (new_node.token) {
        case Abstract_syntax_tree.Token.Module:
            return [];
        case Abstract_syntax_tree.Token.Module_head:
            return [0];
        case Abstract_syntax_tree.Token.Module_body:
            return [1];
        default:
            break;
    }

    switch (main_node.token) {
        case Abstract_syntax_tree.Token.Module:
        case Abstract_syntax_tree.Token.Module_head:
        case Abstract_syntax_tree.Token.Module_body:
            return [...main_node_position, 0];
        default:
            return [...main_node_position];
    }
}

function compare_and_create_changes(old_node: Abstract_syntax_tree.Node, old_node_position: number[], new_node: Abstract_syntax_tree.Node): Change[] {

    if (!Abstract_syntax_tree.is_shallow_equal(old_node, new_node)) {
        const modify_change = create_modify_change([...old_node_position], new_node);
        return [modify_change];
    }

    const changes: Change[] = [];

    const iterations = Math.max(old_node.children.length, new_node.children.length);

    for (let child_index = 0; child_index < iterations; ++child_index) {

        if (child_index < old_node.children.length && child_index < new_node.children.length) {
            const child_changes = compare_and_create_changes(old_node.children[child_index], [...old_node_position, child_index], new_node.children[child_index]);
            changes.push(...child_changes);
        }
        else if (child_index < old_node.children.length && child_index >= new_node.children.length) {
            const remove_change = create_remove_change([...old_node_position, child_index]);
            changes.push(remove_change);
        }
        else if (child_index >= old_node.children.length && child_index < new_node.children.length) {
            const add_change = create_add_change([...old_node_position, child_index], new_node.children[child_index]);
            changes.push(add_change);
        }
    }

    return changes;
}

function is_adding_characters_to_previous_node(text_after_change: string, text_change: Text_change): boolean {

    if (text_change.new_text.length === 0) {
        return false;
    }

    const character_offset = text_change.range_offset;

    if (character_offset === 0) {
        return false;
    }

    const character_before_offset = character_offset - 1;
    const character_before = text_after_change.charAt(character_before_offset);

    const character_after_offset = character_offset;
    if (character_after_offset >= text_after_change.length) {
        return false;
    }

    const character_after = text_after_change.charAt(character_after_offset);

    return Scanner.is_same_word(character_before, character_after);
}

function is_deleting_characters_from_previous_node(root: Abstract_syntax_tree.Node, text_after_change: string, text_change: Text_change): boolean {

    if (text_change.range_length === 0) {
        return false;
    }

    const character_offset = text_change.range_offset;

    if (character_offset === 0) {
        return false;
    }

    const current_character_node_position = Abstract_syntax_tree.find_node_position(root, character_offset);
    const current_character_node_and_offset = Abstract_syntax_tree.get_node_and_offset_at_position(root, current_character_node_position);
    const current_character_before_changes_offset = character_offset - current_character_node_and_offset.offset;
    const current_character_before_changes = current_character_node_and_offset.node.value.substring(current_character_before_changes_offset, current_character_before_changes_offset + 1);

    const character_before_offset = character_offset - 1;
    const character_before = text_after_change.charAt(character_before_offset);

    return Scanner.is_same_word(character_before, current_character_before_changes);
}

function get_character_at_position_or_space(text: string, character_position: number): string {
    return (character_position < 0 || character_position >= text.length) ? " " : text.charAt(character_position);
}

function get_character_before_changes(root: Abstract_syntax_tree.Node, character_offset: number): string {
    const character_node_position = Abstract_syntax_tree.find_node_position(root, character_offset);
    const character_node_and_offset = Abstract_syntax_tree.get_node_and_offset_at_position(root, character_node_position);
    const character_before_changes_offset = character_offset - character_node_and_offset.offset;
    const character_before_changes = get_character_at_position_or_space(character_node_and_offset.node.value, character_before_changes_offset);
    return character_before_changes;
}

function is_modifying_previous_node(root: Abstract_syntax_tree.Node, text_after_change: string, text_change: Text_change): boolean {

    const character_offset = text_change.range_offset;

    const current_character_before_changes = get_character_before_changes(root, character_offset);

    const character_before_offset = character_offset - 1;
    const character_before = get_character_at_position_or_space(text_after_change, character_before_offset);

    const current_character = get_character_at_position_or_space(text_after_change, character_offset);

    const text_before = character_before + current_character_before_changes;
    const text_after = character_before + current_character;

    const word_count_before = Scanner.count_words(text_before, 0, text_before.length);
    const word_count_after = Scanner.count_words(text_after, 0, text_after.length);

    return word_count_before === word_count_after && text_before !== text_after;
}

function create_add_changes_from_parsed_nodes(parent_position: number[], start_child_index: number, parsed_nodes: Abstract_syntax_tree.Node[]): Change[] {

    const changes: Change[] = [];

    for (let node_index = 0; node_index < parsed_nodes.length; ++node_index) {
        const child_index = start_child_index + node_index;
        const node = parsed_nodes[child_index];
        const add_change = create_add_change([...parent_position, child_index], node);
        changes.push(add_change);
    }

    return changes;
}

function find_start_of_parsing_child_index(top_level_node_position: number[], start_node_position: number[]): number {

    if (top_level_node_position.length >= start_node_position.length) {
        return 0;
    }

    const child_index = start_node_position[top_level_node_position.length];
    return child_index;
}

function find_start_of_parsing(root: Abstract_syntax_tree.Node, start_node_position: number[]): { context_token: Abstract_syntax_tree.Token, parent_position: number[], child_index: number } {

    if (start_node_position.length === 0 || (start_node_position.length === 1 && (start_node_position[0] === 0 || start_node_position[0] === 1))) {
        return {
            context_token: Abstract_syntax_tree.Token.Module_head,
            parent_position: [0],
            child_index: 0
        };
    }

    const top_level_node_position = Abstract_syntax_tree.find_top_level_node_position(root, start_node_position);

    const parent_position = top_level_node_position.slice(0, top_level_node_position.length - 1);
    const parent_node = Abstract_syntax_tree.get_node_at_position(root, parent_position);
    const child_index = find_start_of_parsing_child_index(parent_position, top_level_node_position);

    return {
        context_token: parent_node.token,
        parent_position: parent_position,
        child_index: child_index
    };
}

function create_add_changes(root: Abstract_syntax_tree.Node, text_after_change: string, text_change: Text_change, grammar: Grammar.Grammar): Change[] {

    const modify_previous_node = text_change.range_offset > 0 && is_modifying_previous_node(root, text_after_change, text_change);

    const first_character_index = modify_previous_node ? text_change.range_offset - 1 : text_change.range_offset;

    const first_character_node_position = Abstract_syntax_tree.find_node_position(root, first_character_index);
    const start_parsing_state = find_start_of_parsing(root, first_character_node_position);

    const parent_node = Abstract_syntax_tree.get_node_at_position(root, start_parsing_state.parent_position);
    const start_node_position = start_parsing_state.child_index < parent_node.children.length ? [...start_parsing_state.parent_position, start_parsing_state.child_index] : [...start_parsing_state.parent_position];
    const start_node_and_offset = Abstract_syntax_tree.get_node_and_offset_at_position(root, start_node_position);

    const first_added_character = text_after_change.charAt(text_change.range_offset);
    const include_next_word = Scanner.is_whitespace_or_new_line(first_added_character);
    const next_word_range = Scanner.get_next_word_range(text_after_change, text_change.range_offset);

    const text_start_offset = start_node_and_offset.offset;
    const text_end_offset = include_next_word ? next_word_range.end : text_change.range_offset + text_change.new_text.length;

    const scanned_words = Scanner.scan(text_after_change, text_start_offset, text_end_offset);

    const changes: Change[] = [];
    let current_parsing_state = start_parsing_state;
    let current_word_index = 0;

    while (current_word_index < scanned_words.length) {
        const parse_result = Parser.parse(scanned_words, current_word_index, grammar, current_parsing_state.context_token);

        const add_changes = create_add_changes_from_parsed_nodes(current_parsing_state.parent_position, current_parsing_state.child_index, parse_result.node.children);
        changes.push(...add_changes);

        switch (current_parsing_state.context_token) {
            case Abstract_syntax_tree.Token.Module_head:
                current_parsing_state = {
                    context_token: Abstract_syntax_tree.Token.Module_body,
                    parent_position: [1],
                    child_index: 0
                };
                break;
            default:
                break;
        }

        current_word_index += parse_result.processed_words;
    }

    return changes;
}

function create_remove_changes(root: Abstract_syntax_tree.Node, text_after_change: string, text_change: Text_change, grammar: Grammar.Grammar): Change[] {

    const changes: Change[] = [];

    const modify_previous_node = text_change.range_offset > 0 && is_modifying_previous_node(root, text_after_change, text_change);

    let current_offset = modify_previous_node ? text_change.range_offset - 1 : text_change.range_offset;

    const character_at_offset_before_changes = get_character_before_changes(root, text_change.range_offset);
    const include_next_word = text_change.range_length > 0 && Scanner.is_whitespace_or_new_line(character_at_offset_before_changes);

    const end_offset = include_next_word ? text_change.range_offset + text_change.range_length + 1 : text_change.range_offset + text_change.range_length;

    while (current_offset < end_offset) {
        const node_position = Abstract_syntax_tree.find_node_position(root, current_offset);

        const remove_change = create_remove_change(node_position);
        changes.push(remove_change);

        const node = Abstract_syntax_tree.get_node_at_position(root, node_position);
        const iterate_forward_result = Abstract_syntax_tree.iterate_forward(root, node, node_position);
        if (iterate_forward_result !== undefined) {
            const next_node_offset = Abstract_syntax_tree.get_node_and_offset_at_position(root, iterate_forward_result.next_position).offset;
            current_offset = next_node_offset;
        }
        else {
            break;
        }
    }

    return changes;
}

function are_arrays_equal(first: number[], second: number[]): boolean {
    if (first.length !== second.length) {
        return false;
    }

    for (let index = 0; index < first.length; ++index) {
        if (first[index] !== second[index]) {
            return false;
        }
    }

    return true;
}

function compare_position(first: number[], second: number[]): number {

    const count = Math.min(first.length, second.length);

    for (let index = 0; index < count; ++index) {
        if (first[index] < second[index]) {
            return -1;
        }
        else if (first[index] > second[index]) {
            return 1;
        }
    }

    return first.length < second.length ? -1 : first.length > second.length ? 1 : 0;
}

export function create_changes(root: Abstract_syntax_tree.Node, text_after_change: string, text_change: Text_change, grammar: Grammar.Grammar): Change[] {

    const remove_changes = create_remove_changes(root, text_after_change, text_change, grammar);
    const add_changes = create_add_changes(root, text_after_change, text_change, grammar);

    const modify_changes: Change[] = [];

    {
        let add_change_index = 0;

        while (add_change_index < add_changes.length) {
            const add_change = add_changes[add_change_index];

            const remove_change_index = remove_changes.findIndex(remove_change => are_arrays_equal(remove_change.value.position, add_change.value.position));

            if (remove_change_index === -1) {
                add_change_index += 1;
                continue;
            }

            modify_changes.push(create_modify_change(add_change.value.position, (add_change.value as Add_change).new_node));

            add_changes.splice(add_change_index, 1);
            remove_changes.splice(remove_change_index, 1);
        }
    }

    const changes = [
        ...remove_changes,
        ...modify_changes,
        ...add_changes
    ];

    changes.sort((first, second) => compare_position(first.value.position, second.value.position));

    return changes;
}

export function update(root: Abstract_syntax_tree.Node, changes: Change[]): void {

    for (const change of changes) {
        if (change.type === Type.Add) {
            const add_change = change.value as Add_change;
        }
        else if (change.type === Type.Remove) {
            const remove_change = change.value as Remove_change;
        }
        else if (change.type === Type.Modify) {
            const modify_change = change.value as Modify_change;
        }
    }
}
