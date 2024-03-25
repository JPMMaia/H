import * as Core_reflection from "./Core_reflection";
import { onThrowError } from "../utilities/errors";
import * as Grammar from "./Grammar";
import * as Module_change from "./Module_change";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Object_reference from "../utilities/Object_reference";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import { get_node_at_position, Node } from "./Parser_node";

const g_debug = false;

export type Map_terminal_to_word_handler = (
    module: Core_intermediate_representation.Module,
    stack: Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_mappings
) => Grammar.Word;

export type Choose_production_rule_handler = (
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
) => { next_state: State, next_production_rule_index: number };

export type Create_module_changes_handler_data = {
    module: Core_intermediate_representation.Module,
    node: Parser_node.Node,
    node_position: number[],
    modify_change: boolean, key_to_production_rule_indices: Map<string, number[]>
};

export type Create_module_changes_handler = (
    data: Create_module_changes_handler_data
) => Module_change.Position_change_pair[];

export type Node_to_core_object_handler = (
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
) => any;

export interface Parse_tree_mappings {
    value_map: Map<string, string[]>;
    value_transforms: Map<string, (value: any) => string>;
    terminal_to_word_map: Map<string, Map_terminal_to_word_handler>;
    vector_map: Map<string, string[][]>;
    order_index_nodes: Set<string>;
    choose_production_rule: Map<string, Choose_production_rule_handler>;
    create_module_changes_map: Map<string, Create_module_changes_handler>;
    node_to_core_object_map: Map<string, Node_to_core_object_handler>;
}

function find_parent_state_index(
    current_index: number,
    predicate: (index: number) => boolean
): number {
    let index = current_index;

    while (index > 0 && !predicate(index)) {
        index = index - 1;
    }

    return index;
}

function find_parent_state_index_using_word(
    stack: Module_to_parse_tree_stack_element[],
    current_index: number,
    word: string
): number {

    const is_word = (index: number): boolean => {
        return stack[index].node.word.value === word;
    };

    return find_parent_state_index(current_index, is_word);
}

function replace_placeholders_by_values(
    module: Core_intermediate_representation.Module,
    position_with_placeholders: string[],
    production_rules: Grammar.Production_rule[],
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings
): any[] {

    const position: any[] = [];

    for (let index = 0; index < position_with_placeholders.length; ++index) {
        const value = position_with_placeholders[index];

        switch (value) {
            case "$declaration_index": {
                const declaration_state_index = find_parent_state_index_using_word(stack, stack.length - 1, "Module_body");
                const declaration_state = stack[declaration_state_index];
                const declaration_index = declaration_state.current_child_index - 1;
                position.push(declaration_index);
                break;
            }
            case "$order_index": {
                const is_order_array_node = (index: number): boolean => {
                    const element = stack[index];
                    if (!element.is_array_production_rule) {
                        return false;
                    }

                    return mappings.order_index_nodes.has(element.node.word.value);
                };
                const array_state_index = find_parent_state_index(stack.length - 1, is_order_array_node);
                const array_state = stack[array_state_index];
                const production_rule = production_rules[array_state.production_rule_index];
                const element_index = calculate_array_index(production_rule, array_state.current_child_index - 1);
                position.push(element_index);
                break;
            }
            case "$expression_index": {
                const index = find_parent_state_index(stack.length - 1, index => stack[index].state.index !== -1);
                const element = stack[index];
                position.push(element.state.index);
                break;
            }
            case "$parameter_names":
            case "$parameter_types": {
                const is_parameter_list_element = (index: number): boolean => {
                    return stack[index].node.word.value.startsWith("Function_input") || stack[index].node.word.value.startsWith("Function_output");
                };
                const stack_index = find_parent_state_index(stack.length - 1, is_parameter_list_element);
                const parameter_list_node = stack[stack_index].node;

                const prefix = parameter_list_node.word.value === "Function_input_parameters" ? "input_parameter_" : "output_parameter_";
                const suffix = value === "$parameter_names" ? "names" : "types";
                const position_value = prefix + suffix;
                position.push(position_value);
                break;
            }
            default: {
                position.push(value);
                break;
            }
        }
    }

    return position;
}

export interface State {
    index: number;
    value: any;
}

export interface Module_to_parse_tree_stack_element {
    production_rule_index: number;
    state: State;
    node: Node;
    rhs_length: number;
    current_child_index: number;
    is_array_production_rule: boolean;
}

export function module_to_parse_tree(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    mappings: Parse_tree_mappings
): Node {

    const key_to_production_rule_indices = create_key_to_production_rule_indices_map(production_rules);

    const stack: Module_to_parse_tree_stack_element[] = [
        {
            production_rule_index: 0,
            state: {
                index: 0,
                value: module
            },
            node: {
                word: { value: production_rules[0].lhs, type: Grammar.Word_type.Symbol },
                state: -1,
                production_rule_index: 0,
                children: []
            },
            rhs_length: production_rules[0].rhs.length,
            current_child_index: 0,
            is_array_production_rule: false
        }
    ];

    while (stack.length > 1 || stack[0].current_child_index < stack[0].rhs_length) {

        const top = stack[stack.length - 1];

        if (top.current_child_index >= top.rhs_length) {
            stack.pop();
            continue;
        }

        const current_production_rule = production_rules[top.production_rule_index];

        const label_index = top.current_child_index;
        const label = get_production_rule_rhs(current_production_rule, label_index, top.is_array_production_rule);

        if (g_debug) {
            const stack_production_rules = stack.map(element => production_rules[element.production_rule_index]);
            const lhs_string = stack_production_rules.map(production_rule => production_rule.lhs);
            lhs_string.join(", ");
            console.log(`[${lhs_string}] ${label}`);
        }

        if (current_production_rule.rhs.length === 0) {
            stack.pop();
            continue;
        }

        const next_production_rule_indices = Grammar.find_production_rules(production_rules, label);

        const is_terminal = next_production_rule_indices.length === 0;

        const parent_node = top.node;

        if (is_terminal) {

            const word = map_terminal_to_word(module, stack, production_rules, key_to_production_rule_indices, label, mappings);

            const child_node: Node = {
                word: word,
                state: -1,
                production_rule_index: undefined,
                children: []
            };

            parent_node.children.push(child_node);
        }
        else {

            const { next_state, next_production_rule_index } = choose_production_rule_index(module, production_rules, next_production_rule_indices, label, stack, mappings, key_to_production_rule_indices);
            const next_production_rule = production_rules[next_production_rule_index];
            if (next_production_rule === undefined) {
                const message = `Parse_tree_convertor.module_to_parse_tree(): choose_production_rule_index for label '${label}' returned an undefined production rule!`;
                onThrowError(message);
                throw Error(message);
            }

            const is_next_production_rule_array = (next_production_rule.flags & (Grammar.Production_rule_flags.Is_array | Grammar.Production_rule_flags.Is_array_set)) !== 0;
            const rhs_length = is_next_production_rule_array ? get_production_rule_array_rhs_length(module, production_rules, next_production_rule, stack, mappings, key_to_production_rule_indices) : next_production_rule.rhs.length;

            const child_stack_element: Module_to_parse_tree_stack_element =
            {
                production_rule_index: next_production_rule_index,
                state: next_state,
                node: {
                    word: { value: next_production_rule.lhs, type: Grammar.Word_type.Symbol },
                    state: -1,
                    production_rule_index: next_production_rule_index,
                    children: []
                },
                rhs_length: rhs_length,
                current_child_index: 0,
                is_array_production_rule: is_next_production_rule_array
            };
            stack.push(child_stack_element);

            parent_node.children.push(child_stack_element.node);
        }

        top.current_child_index += 1;
    }

    return stack[0].node;
}

function get_production_rule_array_rhs_length(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule: Grammar.Production_rule,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): number {

    if (production_rule.lhs === "Identifier_with_dots") {
        const word = map_terminal_to_word(module, stack, production_rules, key_to_production_rule_indices, "identifier", mappings);
        const split = word.value.split(".");
        const has_separator = production_rule.rhs.length === 3;
        const array_rhs_length = has_separator ? split.length * 2 - 1 : split.length;
        return array_rhs_length;
    }

    const array_position_with_placeholders = mappings.vector_map.get(production_rule.lhs);
    if (array_position_with_placeholders === undefined) {
        const message = `Parse_tree_convertor.get_production_rule_array_rhs_length(): '${production_rule.lhs}' not found in mappings.vector_map`;
        onThrowError(message);
        throw Error(message);
    }

    if (array_position_with_placeholders[0][0] === "$declarations") {
        return module.declarations.length;
    }
    else if (array_position_with_placeholders.length > 0 && array_position_with_placeholders[0][0] === "$top.state.value") {
        const top = stack[stack.length - 1];
        const state_value = top.state.value;
        const array_position = array_position_with_placeholders[0].slice(1, array_position_with_placeholders[0].length);
        const array_reference = Object_reference.get_object_reference_at_position(state_value, array_position);
        const length = array_reference.value.length;
        const has_separator = production_rule.rhs.length === 3;
        const array_rhs_length = has_separator ? length * 2 - 1 : length;
        return array_rhs_length;
    }

    const vector_position = replace_placeholders_by_values(
        module,
        array_position_with_placeholders[0],
        production_rules,
        stack,
        mappings
    );

    const vector_array_reference = Object_reference.get_object_reference_at_position(module, [...vector_position]);
    const length: number = Array.isArray(vector_array_reference.value) ? vector_array_reference.value.length : vector_array_reference.value.elements.length;
    const has_separator = production_rule.rhs.length === 3;
    const array_rhs_length = has_separator ? length * 2 - 1 : length;
    return array_rhs_length;
}

function get_production_rule_rhs(production_rule: Grammar.Production_rule, index: number, is_array: boolean): string {
    if (is_array) {
        const has_separator = production_rule.rhs.length === 3;
        const rhs_index = has_separator ? index % 2 : 0;
        return production_rule.rhs[rhs_index];
    }
    else {
        return production_rule.rhs[index];
    }
}

export function calculate_array_index(production_rule: Grammar.Production_rule, label_index: number): number {
    const is_production_rule_array = (production_rule.flags & Grammar.Production_rule_flags.Is_array);
    const array_index = is_production_rule_array ? (production_rule.rhs.length === 3 ? label_index / 2 : label_index) : label_index;
    return array_index;
}

function choose_production_rule_index(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    next_production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    if (next_production_rule_indices.length === 1) {
        return {
            next_state: top.state,
            next_production_rule_index: next_production_rule_indices[0]
        };
    }

    {
        const handler = mappings.choose_production_rule.get(label);
        if (handler !== undefined) {
            const result = handler(
                module,
                production_rules,
                next_production_rule_indices,
                label,
                stack,
                mappings,
                key_to_production_rule_indices
            );
            return result;
        }
    }

    {
        const array_position_with_placeholders = mappings.vector_map.get(label);
        if (array_position_with_placeholders !== undefined) {

            if (array_position_with_placeholders.length > 0 && array_position_with_placeholders[0][0] === "$declarations") {
                const length = module.declarations.length;
                const index = length > 1 ? 2 : length;
                return {
                    next_state: {
                        index: 0,
                        value: module.declarations
                    },
                    next_production_rule_index: next_production_rule_indices[index]
                };
            }
            else if (array_position_with_placeholders.length > 0 && array_position_with_placeholders[0][0] === "$top.state.value") {
                const state_value = top.state.value;
                const array_position = array_position_with_placeholders[0].slice(1, array_position_with_placeholders[0].length);
                const array_reference = Object_reference.get_object_reference_at_position(state_value, array_position);
                const length = array_reference.value.length;
                const index = length > 1 ? 2 : length;
                return {
                    next_state: {
                        index: 0,
                        value: top.state.value
                    },
                    next_production_rule_index: next_production_rule_indices[index]
                };
            }

            const array_position = replace_placeholders_by_values(module, array_position_with_placeholders[0], production_rules, stack, mappings);
            const array_reference = Object_reference.get_object_reference_at_position(module, [...array_position]);
            const length = array_reference.value.length;
            const index = length > 1 ? 2 : length;
            return {
                next_state: {
                    index: 0,
                    value: array_reference.value
                },
                next_production_rule_index: next_production_rule_indices[index]
            };
        }
    }

    const message = `Parse_tree_convertor.choose_production_rule_index(): not implemented for '${label}'`;
    onThrowError(message);
    throw Error(message);
}

export function map_terminal_to_word(
    module: Core_intermediate_representation.Module,
    stack: Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_mappings
): Scanner.Scanned_word {

    const label = stack[stack.length - 1].node.word.value;

    {
        const map = mappings.terminal_to_word_map.get(label);
        if (map !== undefined) {
            return map(module, stack, production_rules, key_to_production_rule_indices, terminal, mappings);
        }
    }

    if (terminal !== "identifier" && terminal !== "number") {
        return { value: terminal, type: Scanner.get_word_type(terminal) };
    }

    const position_with_placeholders = mappings.value_map.get(label);
    if (position_with_placeholders === undefined) {
        return { value: terminal, type: Scanner.get_word_type(terminal) };
    }

    const position = replace_placeholders_by_values(module, position_with_placeholders, production_rules, stack, mappings);
    const object_reference = Object_reference.get_object_reference_at_position(module, position);

    if (object_reference.value === undefined) {
        const message = `Parse_tree_convertor.map_terminal_to_word(): position for label '${label}' resulted in an undefined value`;
        onThrowError(message);
        throw message;
    }

    const transform = mappings.value_transforms.get(label);
    const transformed_value = transform !== undefined ? transform(object_reference.value) : object_reference.value.toString();
    return { value: transformed_value, type: Scanner.get_word_type(transformed_value) };
}

function get_change_parent_position(change: Parser.Change): any[] {
    if (change.type === Parser.Change_type.Add) {
        const add_change = change.value as Parser.Add_change;
        return add_change.parent_position;
    }
    else if (change.type === Parser.Change_type.Remove) {
        const remove_change = change.value as Parser.Remove_change;
        return remove_change.parent_position;
    }
    else {
        const modify_change = change.value as Parser.Modify_change;
        return modify_change.position.slice(0, modify_change.position.length - 1);
    }
}

function is_key_node(node: Node): boolean {
    switch (node.word.value) {
        case "Module":
        case "Module_head":
        case "Module_declaration":
        case "Imports":
        case "Import":
        case "Module_body":
        case "Declaration":
        case "Alias":
        case "Enum":
        case "Function":
        case "Struct":
            return true;
        default:
            return false;
    }
}

function create_add_change(
    module: Core_intermediate_representation.Module,
    root: Parser_node.Node,
    add_change: Parser.Add_change,
    parent_node: Parser_node.Node,
    production_rules: Grammar.Production_rule[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>,
    reflection_info: Core_reflection.Reflection_info
): { position: any[], change: Module_change.Change }[] {

    const new_changes: { position: any[], change: Module_change.Change }[] = [];

    for (const new_node of add_change.new_nodes) {
        const new_node_position = [...add_change.parent_position, add_change.index];
        const changes = parse_tree_to_core_object(module, root, new_node, new_node_position, production_rules, mappings, key_to_production_rule_indices, reflection_info, false);
        new_changes.push(...changes);
    }

    return new_changes;
}

function create_remove_change(
    module: Core_intermediate_representation.Module,
    remove_change: Parser.Remove_change,
    parent_node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {

    const new_changes: { position: any[], change: Module_change.Change }[] = [];

    for (let index = 0; index < remove_change.count; ++index) {
        const removed_node_index = remove_change.index + index;
        const removed_node = parent_node.children[removed_node_index];

        if (removed_node.word.value === "Import") {
            const new_change = Module_change.create_remove_element_of_vector("imports", removed_node_index);
            new_changes.push({ position: [], change: new_change });
        }
        else if (removed_node.word.value === "Declaration") {
            const new_change = Module_change.create_remove_element_of_vector("declarations", removed_node_index);
            new_changes.push({ position: [], change: new_change });
        }
    }

    return new_changes;
}

function get_key_ancestor(
    root: Parser_node.Node,
    node: Parser_node.Node,
    position: number[]
): { node: Parser_node.Node, position: number[] } {

    let current_node = node;
    let current_position = position;

    while (!is_key_node(current_node)) {
        current_position = Parser_node.get_parent_position(current_position);
        current_node = Parser_node.get_node_at_position(root, current_position);
    }

    return {
        node: current_node,
        position: current_position
    };
}

function apply_parse_tree_change(
    node: Parser_node.Node,
    position: number[],
    change: Parser.Change
): Parser_node.Node {
    if (change.type === Parser.Change_type.Add) {
        const add_change = change.value as Parser.Add_change;
        const parent_position = add_change.parent_position.slice(position.length, add_change.parent_position.length);
        const parent_node = get_node_at_position(node, parent_position);
        parent_node.children.splice(add_change.index, 0, ...add_change.new_nodes);
        return node;
    }
    else if (change.type === Parser.Change_type.Remove) {
        const remove_change = change.value as Parser.Remove_change;
        const parent_position = remove_change.parent_position.slice(position.length, remove_change.parent_position.length);
        const parent_node = get_node_at_position(node, parent_position);
        parent_node.children.splice(remove_change.index, remove_change.count);
        return node;
    }
    else if (change.type === Parser.Change_type.Modify) {
        const modify_change = change.value as Parser.Modify_change;
        if (modify_change.position.length === 0 && modify_change.new_node.word.value === "Module") {
            return JSON.parse(JSON.stringify(modify_change.new_node));
        }

        const change_position = modify_change.position.slice(position.length, modify_change.position.length);
        const parent_node_position = Parser_node.get_parent_position(change_position);
        const parent_node = get_node_at_position(node, parent_node_position);
        const child_to_modify_index = modify_change.position[modify_change.position.length - 1];
        parent_node.children[child_to_modify_index] = modify_change.new_node;
        return node;
    }
    else {
        const message = "Parse_tree_convertor.apply_parse_tree_change(): change type not handled!";
        onThrowError(message);
        throw Error(message);
    }
}

function create_modify_change(
    any_change: Parser.Change,
    root: Parser_node.Node,
    node: Parser_node.Node,
    node_position: number[],
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>,
    reflection_info: Core_reflection.Reflection_info
): { position: any[], change: Module_change.Change }[] {

    const production_rule = production_rules[node.production_rule_index as number];

    if (is_key_node(node) && (production_rule.flags & Grammar.Production_rule_flags.Is_array_set) && any_change.type === Parser.Change_type.Modify) {
        const modify_change = any_change.value as Parser.Modify_change;
        const index = modify_change.position[modify_change.position.length - 1];
        const new_node = modify_change.new_node;

        const new_value = node_to_core_object(new_node, key_to_production_rule_indices, mappings);

        const vector_name = new_node.word.value === "Import" ? "imports" : "declarations";

        return [
            { position: [], change: Module_change.create_set_element_of_vector(vector_name, index, new_value) }
        ];
    }

    const key_ancestor = get_key_ancestor(root, node, node_position);

    const key_node_clone = JSON.parse(JSON.stringify(key_ancestor.node)) as Parser_node.Node;
    const new_node = apply_parse_tree_change(key_node_clone, key_ancestor.position, any_change);

    const changes = parse_tree_to_core_object(module, root, new_node, key_ancestor.position, production_rules, mappings, key_to_production_rule_indices, reflection_info, true);

    return changes;
}

export function create_module_changes(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    parse_tree: Node,
    parse_tree_changes: Parser.Change[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {

    // TODO add as parameter
    const reflection_info = Core_reflection.create_reflection_info();

    const changes: { position: any[], change: Module_change.Change }[] = [];

    // TODO use fast-array-diff
    // TODO if delete and add are consecutive, convert to set change

    for (const parse_tree_change of parse_tree_changes) {

        const parent_position = get_change_parent_position(parse_tree_change);
        const parent_node = get_node_at_position(parse_tree, parent_position);
        const is_key = is_key_node(parent_node);

        if (is_key && parse_tree_change.type === Parser.Change_type.Add) {
            const add_change = parse_tree_change.value as Parser.Add_change;
            const new_changes = create_add_change(module, parse_tree, add_change, parent_node, production_rules, mappings, key_to_production_rule_indices, reflection_info);
            changes.push(...new_changes);
        }
        else if (is_key && parse_tree_change.type === Parser.Change_type.Remove) {
            const remove_change = parse_tree_change.value as Parser.Remove_change;
            const new_changes = create_remove_change(module, remove_change, parent_node, key_to_production_rule_indices);
            changes.push(...new_changes);
        }
        else {
            const new_changes = create_modify_change(parse_tree_change, parse_tree, parent_node, parent_position, module, production_rules, mappings, key_to_production_rule_indices, reflection_info);
            changes.push(...new_changes);
        }
    }

    return changes;
}

export function create_key_to_production_rule_indices_map(production_rules: Grammar.Production_rule[]): Map<string, number[]> {

    const keys: string[] = [production_rules[0].lhs];

    for (let index = 1; index < production_rules.length; ++index) {
        if (production_rules[index].lhs !== production_rules[index - 1].lhs) {
            keys.push(production_rules[index].lhs);
        }
    }

    const map = new Map<string, number[]>();

    for (const key of keys) {

        const indices: number[] = [];

        for (let index = 0; index < production_rules.length; ++index) {
            const production_rule = production_rules[index];
            if (production_rule.lhs === key) {
                indices.push(index);
            }
        }

        map.set(key, indices);
    }

    return map;
}

export function parse_tree_to_module(
    root: Node,
    production_rules: Grammar.Production_rule[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): Core_intermediate_representation.Module {

    const reflection_info = Core_reflection.create_reflection_info();

    const module: Core_intermediate_representation.Module = {
        name: "",
        imports: [],
        declarations: []
    };

    const new_changes = parse_tree_to_core_object(module, root, root, [], production_rules, mappings, key_to_production_rule_indices, reflection_info, false);
    Module_change.update_module(module, new_changes);

    update_import_module_usages(module);

    return module;
}

function parse_tree_to_core_object(
    module: Core_intermediate_representation.Module,
    root: Parser_node.Node,
    initial_node: Parser_node.Node,
    initial_node_position: number[],
    production_rules: Grammar.Production_rule[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>,
    reflection_info: Core_reflection.Reflection_info,
    modify_change: boolean
): { position: any[], change: Module_change.Change }[] {

    const new_changes: { position: any[], change: Module_change.Change }[] = [];

    const node_positions: number[][] = [];
    node_positions.push(initial_node_position);

    const node_stack: Node[] = [];
    node_stack.push(initial_node);

    while (node_stack.length > 0) {
        const node = node_stack.pop() as Node;
        const node_position = node_positions.pop() as number[];

        if (g_debug) {
            console.log(node.word.value);
        }

        if (!Parser_node.is_terminal_node(node)) {
            const map = mappings.create_module_changes_map.get(node.word.value);
            if (map !== undefined) {
                const changes = map({
                    module: module,
                    node: node,
                    node_position: node_position,
                    modify_change: modify_change,
                    key_to_production_rule_indices: key_to_production_rule_indices
                });

                new_changes.push(...changes);
            }
        }

        for (let index = 0; index < node.children.length; ++index) {
            const child_index = node.children.length - 1 - index;
            const child = node.children[child_index];
            node_stack.push(child);
            node_positions.push([...node_position, child_index]);
        }
    }

    return new_changes;
}

function node_to_core_object(
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>,
    mappings: Parse_tree_mappings
): any {
    const map = mappings.node_to_core_object_map.get(node.word.value) as Node_to_core_object_handler;
    return map(node, key_to_production_rule_indices);
}

function visit_expressions(expression: Core_intermediate_representation.Expression, predicate: (expression: Core_intermediate_representation.Expression) => void) {

    predicate(expression);

    switch (expression.data.type) {
        case Core_intermediate_representation.Expression_enum.Access_expression: {
            const value = expression.data.value as Core_intermediate_representation.Access_expression;
            visit_expressions(value.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Assignment_expression: {
            const value = expression.data.value as Core_intermediate_representation.Assignment_expression;
            visit_expressions(value.left_hand_side, predicate);
            visit_expressions(value.right_hand_side, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Binary_expression: {
            const value = expression.data.value as Core_intermediate_representation.Binary_expression;
            visit_expressions(value.left_hand_side, predicate);
            visit_expressions(value.right_hand_side, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Block_expression: {
            const value = expression.data.value as Core_intermediate_representation.Block_expression;
            for (const statement of value.statements) {
                visit_expressions(statement.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Call_expression: {
            const value = expression.data.value as Core_intermediate_representation.Call_expression;
            visit_expressions(value.expression, predicate);
            for (const argument of value.arguments) {
                visit_expressions(argument, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Cast_expression: {
            const value = expression.data.value as Core_intermediate_representation.Cast_expression;
            visit_expressions(value.source, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.For_loop_expression: {
            const value = expression.data.value as Core_intermediate_representation.For_loop_expression;
            visit_expressions(value.range_begin, predicate);
            visit_expressions(value.range_end.expression, predicate);
            if (value.step_by !== undefined) {
                visit_expressions(value.step_by, predicate);
            }
            visit_expressions(value.then_statement.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.If_expression: {
            const value = expression.data.value as Core_intermediate_representation.If_expression;
            for (const serie of value.series) {
                if (serie.condition !== undefined) {
                    visit_expressions(serie.condition.expression, predicate);
                }
                visit_expressions(serie.statement.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Instantiate_struct_expression: {
            const value = expression.data.value as Core_intermediate_representation.Instantiate_struct_expression;
            for (const member of value.members) {
                visit_expressions(member.value.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Parenthesis_expression: {
            const value = expression.data.value as Core_intermediate_representation.Parenthesis_expression;
            visit_expressions(value.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Return_expression: {
            const value = expression.data.value as Core_intermediate_representation.Return_expression;
            visit_expressions(value.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Switch_expression: {
            const value = expression.data.value as Core_intermediate_representation.Switch_expression;
            visit_expressions(value.value, predicate);
            for (const switch_case of value.cases) {
                if (switch_case.case_value !== undefined) {
                    visit_expressions(switch_case.case_value, predicate);
                }
                for (const statement of switch_case.statements) {
                    visit_expressions(statement.expression, predicate);
                }
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Ternary_condition_expression: {
            const value = expression.data.value as Core_intermediate_representation.Ternary_condition_expression;
            visit_expressions(value.condition, predicate);
            visit_expressions(value.then_statement.expression, predicate);
            visit_expressions(value.else_statement.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Unary_expression: {
            const value = expression.data.value as Core_intermediate_representation.Unary_expression;
            visit_expressions(value.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Variable_declaration_expression: {
            const value = expression.data.value as Core_intermediate_representation.Variable_declaration_expression;
            visit_expressions(value.right_hand_side, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Variable_declaration_with_type_expression: {
            const value = expression.data.value as Core_intermediate_representation.Variable_declaration_with_type_expression;
            visit_expressions(value.right_hand_side.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.While_loop_expression: {
            const value = expression.data.value as Core_intermediate_representation.While_loop_expression;
            visit_expressions(value.condition.expression, predicate);
            visit_expressions(value.then_statement.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Break_expression:
        case Core_intermediate_representation.Expression_enum.Constant_expression:
        case Core_intermediate_representation.Expression_enum.Continue_expression:
        case Core_intermediate_representation.Expression_enum.Invalid_expression:
        case Core_intermediate_representation.Expression_enum.Variable_expression: {
            break;
        }
        default: {
            const message = `Parse_tree_convertor.visit_expressions(): Expression type ${expression.data.type} not handled!`;
            onThrowError(message);
            throw Error(message);
        }
    }
}

export function update_import_module_usages(module: Core_intermediate_representation.Module): void {

    for (const import_module of module.imports) {
        import_module.usages = [];
    }

    const add_unique_usage = (module_name: string, usage: string): void => {
        const import_module = module.imports.find(element => element.alias === module_name);
        if (import_module !== undefined) {
            const index = import_module.usages.findIndex(value => value === usage);
            if (index === -1) {
                import_module.usages.push(usage);
            }
        }
    };

    const process_type = (type: Core_intermediate_representation.Type_reference): void => {
        switch (type.data.type) {
            case Core_intermediate_representation.Type_reference_enum.Constant_array_type: {
                const value = type.data.value as Core_intermediate_representation.Constant_array_type;
                if (value.value_type.length > 0) {
                    process_type(value.value_type[0]);
                }
                break;
            }
            case Core_intermediate_representation.Type_reference_enum.Custom_type_reference: {
                const value = type.data.value as Core_intermediate_representation.Custom_type_reference;
                add_unique_usage(value.module_reference.name, value.name);
                break;
            }
            case Core_intermediate_representation.Type_reference_enum.Function_type: {
                const value = type.data.value as Core_intermediate_representation.Function_type;
                for (const type of value.input_parameter_types) {
                    process_type(type);
                }
                for (const type of value.output_parameter_types) {
                    process_type(type);
                }
                break;
            }
            case Core_intermediate_representation.Type_reference_enum.Pointer_type: {
                const value = type.data.value as Core_intermediate_representation.Pointer_type;
                if (value.element_type.length > 0) {
                    process_type(value.element_type[0]);
                }
                break;
            }
            case Core_intermediate_representation.Type_reference_enum.Builtin_type_reference:
            case Core_intermediate_representation.Type_reference_enum.Fundamental_type:
            case Core_intermediate_representation.Type_reference_enum.Integer_type: {
                break;
            }
            default: {
                const message = `Parse_tree_convertor.update_import_module_usages(): Type '${type.data.type}' not handled!`;
                onThrowError(message);
                throw Error(message);
            }
        }
    };

    const process_expression = (expression: Core_intermediate_representation.Expression): void => {
        switch (expression.data.type) {
            case Core_intermediate_representation.Expression_enum.Access_expression: {
                const access_expression = expression.data.value as Core_intermediate_representation.Access_expression;
                if (access_expression.expression.data.type === Core_intermediate_representation.Expression_enum.Variable_expression) {
                    const variable_expression = access_expression.expression.data.value as Core_intermediate_representation.Variable_expression;
                    add_unique_usage(variable_expression.name, access_expression.member_name);
                }
                break;
            }
            case Core_intermediate_representation.Expression_enum.Cast_expression: {
                const cast_expression = expression.data.value as Core_intermediate_representation.Cast_expression;
                process_type(cast_expression.destination_type);
                break;
            }
            case Core_intermediate_representation.Expression_enum.Variable_declaration_with_type_expression: {
                const variable_declaration_with_type_expression = expression.data.value as Core_intermediate_representation.Variable_declaration_with_type_expression;
                process_type(variable_declaration_with_type_expression.type);
                break;
            }
            default: {
                break;
            }
        }
    };

    for (const declaration of module.declarations) {
        if (declaration.type === Core_intermediate_representation.Declaration_type.Alias) {
            const alias_declaration = declaration.value as Core_intermediate_representation.Alias_type_declaration;

            if (alias_declaration.type.length > 0) {
                process_type(alias_declaration.type[0]);
            }
        }
        else if (declaration.type === Core_intermediate_representation.Declaration_type.Function) {
            const function_value = declaration.value as Core_intermediate_representation.Function;

            for (const type of function_value.declaration.type.input_parameter_types) {
                process_type(type);
            }

            for (const type of function_value.declaration.type.output_parameter_types) {
                process_type(type);
            }

            for (const statement of function_value.definition.statements) {
                visit_expressions(statement.expression, process_expression);
            }
        }
        else if (declaration.type === Core_intermediate_representation.Declaration_type.Struct) {
            const struct_declaration = declaration.value as Core_intermediate_representation.Struct_declaration;

            for (const type of struct_declaration.member_types) {
                process_type(type);
            }
        }
    }

    for (const import_module of module.imports) {
        import_module.usages.sort();
    }
}
