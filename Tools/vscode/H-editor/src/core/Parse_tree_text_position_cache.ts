import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";

const g_debug = false;

export interface Text_range_offset {
    start: number;
    end: number;
}

export interface Text_change {
    range: Text_range_offset;
    text: string;
}

export interface Text_position {
    line: number;
    column: number;
    offset: number;
}

interface Cache_entry {
    text_position: Text_position;
    node: Parser_node.Node;
    node_position: number[];
}

export interface Cache {
    elements: Cache_entry[];
    root: Parser_node.Node;
    text: string;
}

const nodes_to_cache = [
    "Module",
    "Declaration"
];

export function create_empty_cache(): Cache {
    return {
        elements: [],
        root: Parser_node.create_empty_node(),
        text: ""
    };
}

export function update_cache(cache: Cache, parser_changes: Parser.Change[], text_change: Text_change, text_after_changes: string): void {


    for (const change of parser_changes) {
        if (change.type === Parser.Change_type.Modify) {
            const modify_change = change.value as Parser.Modify_change;
            if (modify_change.position.length === 0) {
                const iterator = Parse_tree_text_iterator.begin(modify_change.new_node, text_after_changes);
                update_cache_entries(cache, modify_change.new_node, modify_change.position, text_after_changes, iterator, true);
            }
        }
    }

    cache.text = text_after_changes;
}

function update_cache_entries(cache: Cache, new_node: Parser_node.Node, new_node_position: number[], text_after_changes: string, iterator: Parse_tree_text_iterator.Iterator, is_modify: boolean): void {
    // TODO Delete entries

    if (new_node.word.value === "Module") {
        cache.root = new_node;
    }

    if (new_node_position.length !== 0) {
        iterator = Parse_tree_text_iterator.go_to_next_node_position(iterator, new_node_position);
    }

    if (nodes_to_cache.find(value => value === new_node.word.value) !== undefined) {
        add_cache_entry(cache, new_node, new_node_position, iterator, is_modify);
    }

    if (new_node.word.value === "Module" || new_node.word.value === "Module_body") {
        for (let child_index = 0; child_index < new_node.children.length; ++child_index) {
            update_cache_entries(cache, new_node.children[child_index], [...new_node_position, child_index], text_after_changes, iterator, is_modify);
        }
    }

    // TODO update next entries text positions and node positions
}

function add_cache_entry(cache: Cache, new_node: Parser_node.Node, new_node_position: number[], iterator: Parse_tree_text_iterator.Iterator, is_modify: boolean): void {

    const cache_entry: Cache_entry = {
        text_position: {
            line: iterator.line,
            column: iterator.column,
            offset: iterator.offset
        },
        node: new_node,
        node_position: new_node_position
    };

    if (new_node_position.length === 0 && cache.elements.length > 0) {
        cache.elements[0] = cache_entry;
    }
    else if (new_node_position.length === 3) {
        const declaration_index = new_node_position[2];
        const index = cache.elements.findIndex(entry => entry.node_position.length === 3 && entry.node_position[2] >= declaration_index);
        if (index !== -1) {
            if (is_modify) {
                cache.elements[index] = cache_entry;
            }
            else {
                cache.elements.splice(index, 0, cache_entry);
            }
        }
        else {
            cache.elements.push(cache_entry);
        }
    }
    else {
        cache.elements.push(cache_entry);
    }
}

export function get_iterator_at_node_position(cache: Cache, node_position: number[]): Parse_tree_text_iterator.Iterator {

    if (node_position.length === 0) {
        return Parse_tree_text_iterator.begin(cache.root, cache.text);
    }

    if (node_position[0] === 0) {
        return create_text_iterator_at_node_position(cache, cache.elements[0], node_position);
    }

    if (node_position.length === 1 && node_position[0] === 1) {
        if (cache.elements.length >= 2) {
            return create_text_iterator_at_node_position(cache, cache.elements[1], node_position);
        }
        else {
            return create_text_iterator_at_node_position(cache, cache.elements[0], node_position);
        }
    }

    const cache_entry = cache.elements.find(entry => entry.node_position[1] >= node_position[1]);
    if (cache_entry === undefined || cache_entry.node_position[1] > node_position[1]) {
        return create_text_iterator_at_node_position(cache, cache.elements[cache.elements.length - 1], node_position);
    }

    return create_text_iterator_at_node_position(cache, cache_entry, node_position);
}

export function get_node_text_position(cache: Cache, node_position: number[]): Text_position {
    const iterator = get_iterator_at_node_position(cache, node_position);
    return {
        line: iterator.line,
        column: iterator.column,
        offset: iterator.offset
    };
}

function create_text_iterator_at_node_position(cache: Cache, cache_entry: Cache_entry, node_position: number[]): Parse_tree_text_iterator.Iterator {
    const begin: Parse_tree_text_iterator.Iterator = {
        root: cache.root,
        text: cache.text,
        node: cache_entry.node,
        node_position: cache_entry.node_position,
        offset: cache_entry.text_position.offset,
        line: cache_entry.text_position.line,
        column: cache_entry.text_position.column
    };
    return Parse_tree_text_iterator.go_to_next_node_position(begin, node_position);
}

export function get_node_that_contains_text_position(cache: Cache, line: number, column: number): { node: Parser_node.Node, position: number[] } {
    return {
        node: Parser_node.create_empty_node(),
        position: []
    };
}

export function get_node_that_contains_text_offset(cache: Cache, offset: number): { node: Parser_node.Node, position: number[] } {
    return {
        node: Parser_node.create_empty_node(),
        position: []
    };
}
