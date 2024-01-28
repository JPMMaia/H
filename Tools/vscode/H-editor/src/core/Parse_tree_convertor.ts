import * as Core from "./Core_interface";
import * as Core_helpers from "./Core_helpers";
import * as Core_reflection from "./Core_reflection";
import { onThrowError } from "../utilities/errors";
import * as Fast_array_diff from "fast-array-diff";
import * as Grammar from "./Grammar";
import * as Module_change from "./Module_change";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Object_reference from "../utilities/Object_reference";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import * as Type_utilities from "./Type_utilities";
import { get_node_at_position, Node } from "./Parser_node";

const g_debug = false;

export type Choose_production_rule_handler = (
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
) => { next_state: State, next_production_rule_index: number };

export interface Parse_tree_mappings {
    value_map: Map<string, string[]>;
    value_transforms: Map<string, (value: any) => string>;
    vector_map: Map<string, string[][]>;
    order_index_nodes: Set<string>;
    choose_production_rule: Map<string, Choose_production_rule_handler>;
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

    const vector_position_with_placeholders = mappings.vector_map.get(production_rule.lhs);
    if (vector_position_with_placeholders === undefined) {
        const message = `Parse_tree_convertor.get_production_rule_array_rhs_length(): '${production_rule.lhs}' not found in mappings.vector_map`;
        onThrowError(message);
        throw Error(message);
    }

    if (vector_position_with_placeholders[0][0] === "$declarations") {
        return module.declarations.length;
    }

    const vector_position = replace_placeholders_by_values(
        module,
        vector_position_with_placeholders[0],
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
        const vector_position_with_placeholders = mappings.vector_map.get(label);
        if (vector_position_with_placeholders !== undefined) {

            if (vector_position_with_placeholders.length > 0 && vector_position_with_placeholders[0][0] === "$declarations") {
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

            const vector_position = replace_placeholders_by_values(module, vector_position_with_placeholders[0], production_rules, stack, mappings);
            const vector_array_reference = Object_reference.get_object_reference_at_position(module, [...vector_position]);
            const length = Array.isArray(vector_array_reference.value) ? vector_array_reference.value.length : vector_array_reference.value.elements.length;
            const index = length > 1 ? 2 : length;
            return {
                next_state: {
                    index: 0,
                    value: vector_array_reference.value
                },
                next_production_rule_index: next_production_rule_indices[index]
            };
        }
    }

    const message = "Not implemented! Got: " + label;
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

    if (label === "Identifier_with_dots") {
        const index = stack[stack.length - 1].current_child_index;
        if (index % 2 !== 0) {
            return { value: ".", type: Grammar.Word_type.Symbol };
        }

        const word = map_terminal_to_word(module, stack.slice(0, stack.length - 1), production_rules, key_to_production_rule_indices, "identifier", mappings);
        const split = word.value.split(".");
        return { value: split[index / 2], type: Grammar.Word_type.Alphanumeric };
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

        const new_value = node_to_core_object(new_node, key_to_production_rule_indices);

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

function get_value_of_node_in_trees(node_0: Parser_node.Node, node_1: Parser_node.Node, key: string, transform: (node: Parser_node.Node) => any): { value_0: any, value_1: any, position: number[] } {

    const value_node_0 = find_descendant_position_if(node_0, node => node.word.value === key) as { node: Parser_node.Node, position: number[] };
    const value_node_1 = Parser_node.get_node_at_position(node_1, value_node_0.position);

    const value_0 = transform(value_node_0.node);
    const value_1 = transform(value_node_1);

    return {
        value_0: value_0,
        value_1: value_1,
        position: value_node_0.position
    };
}

function apply_patch(children_0: Parser_node.Node[], children_1: Parser_node.Node[], parent_position: number[]): Parser.Change[] {

    const changes: Parser.Change[] = [];

    const patches = Fast_array_diff.getPatch(children_0, children_1, deep_equal);

    for (const patch of patches) {
        if (patch.type === "add") {
            const new_change = Parser.create_add_change(parent_position, patch.newPos, patch.items);
            changes.push(new_change);
        }
        else if (patch.type === "remove") {
            const new_change = Parser.create_remove_change(parent_position, patch.newPos, patch.items.length);
            changes.push(new_change);
        }
    }

    return changes;
}

function simplify_changes(root: Parser_node.Node, parse_tree_changes: Parser.Change[]): Parser.Change[] {

    if (parse_tree_changes.length === 0) {
        return parse_tree_changes;
    }

    if (parse_tree_changes[0].type === Parser.Change_type.Modify) {
        const change = parse_tree_changes[0].value as Parser.Modify_change;

        const new_node = change.new_node;

        if (new_node.word.value === "Module") {
            const new_changes: Parser.Change[] = [];

            {
                const values = get_value_of_node_in_trees(root, new_node, "Module_name", join_all_child_node_values);
                if (values.value_0 !== values.value_1) {
                    const new_change = Parser.create_modify_change(values.position, values.value_1);
                    new_changes.push(new_change);
                }
            }

            {
                const root_imports = find_descendant_position_if(root, node => node.word.value === "Imports") as { node: Parser_node.Node, position: number[] };
                const new_imports_node = Parser_node.get_node_at_position(new_node, root_imports.position);

                const patch_changes = apply_patch(root_imports.node.children, new_imports_node.children, root_imports.position);
                new_changes.push(...patch_changes);
            }

            {
                const root_declarations = find_descendant_position_if(root, node => node.word.value === "Module_body") as { node: Parser_node.Node, position: number[] };
                const new_declarations_node = Parser_node.get_node_at_position(new_node, root_declarations.position);

                const patch_changes = apply_patch(root_declarations.node.children, new_declarations_node.children, root_declarations.position);
                new_changes.push(...patch_changes);
            }

            return new_changes;
        }
    }

    return parse_tree_changes;
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

    const simplified_changes = simplify_changes(parse_tree, parse_tree_changes);

    // TODO use fast-array-diff
    // TODO if delete and add are consecutive, convert to set change

    for (const parse_tree_change of simplified_changes) {

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

function find_descendant_if(node: Parser_node.Node, predicate: (node: Parser_node.Node) => boolean): Parser_node.Node | undefined {

    const list: Parser_node.Node[] = [];

    for (let index = 0; index < node.children.length; ++index) {
        const child = node.children[index];
        list.push(child);
    }

    while (list.length > 0) {
        const node = list.splice(0, 1)[0];

        if (predicate(node)) {
            return node;
        }

        for (let index = 0; index < node.children.length; ++index) {
            const child = node.children[index];
            list.push(child);
        }
    }

    return undefined;
}

function find_descendant_position_if(node: Parser_node.Node, predicate: (node: Parser_node.Node) => boolean): { node: Parser_node.Node, position: number[] } | undefined {

    const list: Parser_node.Node[] = [];
    const positions: number[][] = [];

    for (let index = 0; index < node.children.length; ++index) {
        const child = node.children[index];
        list.push(child);
        positions.push([index]);
    }

    while (list.length > 0) {
        const node = list.splice(0, 1)[0];
        const position = positions.splice(0, 1)[0];

        if (predicate(node)) {
            return {
                node: node,
                position: position
            };
        }

        for (let index = 0; index < node.children.length; ++index) {
            const child = node.children[index];
            list.push(child);
            positions.push([...position, index]);

        }
    }

    return undefined;
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

function find_node_with_production_rule_indices(node: Node, production_rule_indices: number[]): Node | undefined {

    const has_production_rule = (element: Node): boolean => {
        return element.production_rule_index !== undefined && production_rule_indices.indexOf(element.production_rule_index) !== -1;
    };

    if (has_production_rule(node)) {
        return node;
    }

    {
        const child = node.children.find(child => has_production_rule(child));
        if (child !== undefined) {
            return child;
        }
    }

    for (const child of node.children) {
        const found = find_node_with_production_rule_indices(child, production_rule_indices);
        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

function find_nodes_with_production_rule_indices(node: Node, production_rule_indices: number[]): Node[] {

    const nodes: Node[] = [];

    const has_production_rule = (element: Node): boolean => {
        return element.production_rule_index !== undefined && production_rule_indices.indexOf(element.production_rule_index) !== -1;
    };

    if (has_production_rule(node)) {
        nodes.push(node);
    }

    {
        const found_nodes = node.children.filter(child => has_production_rule(child));
        nodes.push(...found_nodes);
    }

    // Avoid exploring child nodes for sake of optimization as production rules are usually at the same level in the node tree.
    if (nodes.length > 0) {
        return nodes;
    }

    for (const child of node.children) {
        const found_nodes = find_nodes_with_production_rule_indices(child, production_rule_indices);
        nodes.push(...found_nodes);
    }

    return nodes;
}

export function get_terminal_value(node: Node): string {
    if (node.production_rule_index === undefined && node.children.length === 0) {
        return node.word.value;
    }

    if (node.children.length === 0) {
        return "";
    }

    if (node.word.value === "Identifier_with_dots") {
        const values: string[] = [];
        for (const child of node.children) {
            values.push(child.word.value);
        }
        return values.join("");
    }

    return get_terminal_value(node.children[0]);
}

function find_node(node: Node, key: string, key_to_production_rule_indices: Map<string, number[]>): Node | undefined {
    const production_rule_indices = key_to_production_rule_indices.get(key) as number[];
    if (production_rule_indices === undefined) {
        return undefined;
    }

    const found_node = find_node_with_production_rule_indices(node, production_rule_indices);
    return found_node;
}

function find_nodes(node: Node, key: string, key_to_production_rule_indices: Map<string, number[]>): Node[] {
    const production_rule_indices = key_to_production_rule_indices.get(key) as number[];
    if (production_rule_indices === undefined) {
        return [];
    }

    const found_nodes = find_nodes_with_production_rule_indices(node, production_rule_indices);
    return found_nodes;
}

function find_node_value(node: Node, key: string, key_to_production_rule_indices: Map<string, number[]>): string {
    const found_node = find_node(node, key, key_to_production_rule_indices);
    if (found_node === undefined) {
        return "";
    }
    return get_terminal_value(found_node);
}

function find_nodes_inside_parent(node: Node, parent_key: string, child_key: string, key_to_production_rule_indices: Map<string, number[]>): Node[] {
    const parent_node = find_node(node, parent_key, key_to_production_rule_indices);
    if (parent_node === undefined) {
        return [];
    }

    const child_nodes = find_nodes(parent_node, child_key, key_to_production_rule_indices);
    return child_nodes;
}

function find_node_child_index(node: Node, key: string, key_to_production_rule_indices: Map<string, number[]>): number {
    const production_rule_indices = key_to_production_rule_indices.get(key) as number[];
    return node.children.findIndex(child => production_rule_indices.find(index => index === child.production_rule_index) !== undefined);
}

function node_to_function_declaration(node: Node, key_to_production_rule_indices: Map<string, number[]>): Core.Function_declaration {

    const name = find_node_value(node, "Function_name", key_to_production_rule_indices);

    const input_parameter_nodes = find_nodes_inside_parent(node, "Function_input_parameters", "Function_parameter", key_to_production_rule_indices);
    const input_parameter_names = input_parameter_nodes.map(node => find_node_value(node, "Function_parameter_name", key_to_production_rule_indices));
    const input_parameter_types = input_parameter_nodes.map(node => find_node_value(node, "Function_parameter_type", key_to_production_rule_indices)).map(name => Type_utilities.parse_type_name(name)[0]);

    const output_parameter_nodes = find_nodes_inside_parent(node, "Function_output_parameters", "Function_parameter", key_to_production_rule_indices);
    const output_parameter_names = output_parameter_nodes.map(node => find_node_value(node, "Function_parameter_name", key_to_production_rule_indices));
    const output_parameter_types = output_parameter_nodes.map(node => find_node_value(node, "Function_parameter_type", key_to_production_rule_indices)).map(name => Type_utilities.parse_type_name(name)[0]);

    const export_value = find_node_value(node, "Export", key_to_production_rule_indices);
    const linkage = export_value.length > 0 ? Core.Linkage.External : Core.Linkage.Private;

    return {
        name: name,
        type: {
            input_parameter_types: {
                size: input_parameter_types.length,
                elements: input_parameter_types
            },
            output_parameter_types: {
                size: output_parameter_types.length,
                elements: output_parameter_types
            },
            is_variadic: false // TODO
        },
        input_parameter_names: {
            size: input_parameter_names.length,
            elements: input_parameter_names
        },
        output_parameter_names: {
            size: output_parameter_names.length,
            elements: output_parameter_names
        },
        linkage: linkage
    };
}

function node_to_function_definition(node: Node, function_name: string, key_to_production_rule_indices: Map<string, number[]>): Core.Function_definition {

    const block_node = find_node(node, "Block", key_to_production_rule_indices);
    if (block_node !== undefined) {
        const statements_node = find_node(block_node, "Statements", key_to_production_rule_indices);
        if (statements_node !== undefined) {
            const statements = statements_node.children.map(node => node_to_statement(node, key_to_production_rule_indices));
            return {
                name: function_name,
                statements: {
                    size: statements.length,
                    elements: statements
                }
            };
        }
    }

    return {
        name: function_name,
        statements: {
            size: 0,
            elements: []
        }
    };
}

function node_to_statement(node: Node, key_to_production_rule_indices: Map<string, number[]>): Core.Statement {

    const expressions: Core.Expression[] = [];

    const call_production_rule_indices = key_to_production_rule_indices.get("Expression_call") as number[];
    const return_production_rule_indices = key_to_production_rule_indices.get("Expression_return") as number[];
    const variable_assignment_production_rule_indices = key_to_production_rule_indices.get("Expression_variable_assignment") as number[];
    const variable_declaration_and_assignment_production_rule_indices = key_to_production_rule_indices.get("Expression_variable_declaration_and_assignment") as number[];

    for (let index = 0; index < node.children.length; ++index) {
        const child = node.children[index];

        if (child.production_rule_index === undefined) {
            continue;
        }

        if (return_production_rule_indices.indexOf(child.production_rule_index) !== -1) {
            add_expression_return(child, expressions, key_to_production_rule_indices);
            break;
        }
        else {
            const message = "node_to_statement: case not handled!";
            onThrowError(message);
            throw Error(message);
        }
    }

    return {
        name: "",
        expressions: {
            size: expressions.length,
            elements: expressions
        }
    };
}

function add_expression_return(node: Node, expressions: Core.Expression[], key_to_production_rule_indices: Map<string, number[]>): void {

    const return_expression: Core.Return_expression = {
        expression: {
            expression_index: expressions.length + 1
        }
    };
    expressions.push({ data: { type: Core.Expression_enum.Return_expression, value: return_expression } });

    const generic_expression_node = find_node(node, "Generic_expression", key_to_production_rule_indices);
    if (generic_expression_node !== undefined) {
        add_expression_generic(generic_expression_node, expressions, key_to_production_rule_indices);
    }
}

function add_expression_generic(node: Node, expressions: Core.Expression[], key_to_production_rule_indices: Map<string, number[]>): void {

    const child = node.children[0];

    switch (child.word.value) {
        case "Expression_binary":
            add_expression_binary(child, expressions, key_to_production_rule_indices);
            break;
        case "Expression_variable":
            add_expression_variable_name(child, expressions);
            break;
        default:
            const message = "add_expression_generic: case not handled!";
            onThrowError(message);
            throw Error(message);
    }
}

function add_expression_binary(node: Node, expressions: Core.Expression[], key_to_production_rule_indices: Map<string, number[]>): void {

    const generic_expressions = find_nodes(node, "Generic_expression", key_to_production_rule_indices);
    const operation_node = find_node(node, "Expression_binary_symbol", key_to_production_rule_indices);

    if (generic_expressions.length !== 2 || operation_node === undefined) {
        const message = "add_expression_binary: could not process node!";
        onThrowError(message);
        throw Error(message);
    }

    const left_hand_side = generic_expressions[0];
    const right_hand_size = generic_expressions[1];

    const operation_node_child = operation_node.children[0];
    const operation = map_production_rule_label_to_binary_operation(operation_node_child.word.value);

    const binary_expression: Core.Binary_expression = {
        left_hand_side: {
            expression_index: -1
        },
        operation: operation,
        right_hand_side: {
            expression_index: -1
        }
    };

    expressions.push({ data: { type: Core.Expression_enum.Binary_expression, value: binary_expression } });

    binary_expression.left_hand_side.expression_index = expressions.length;
    add_expression_generic(left_hand_side, expressions, key_to_production_rule_indices);

    binary_expression.right_hand_side.expression_index = expressions.length;
    add_expression_generic(right_hand_size, expressions, key_to_production_rule_indices);
}

function map_production_rule_label_to_binary_operation(label: string): Core.Binary_operation {
    const value = label.substring(26, label.length);
    const str = label[25].toLocaleUpperCase() + value;
    const operation = str as keyof typeof Core.Binary_operation;
    return Core.Binary_operation[operation];
}

function add_expression_variable_name(node: Node, expressions: Core.Expression[]): void {
    const name = get_terminal_value(node);
    const variable_expression: Core.Variable_expression = {
        name: name
    };
    expressions.push({ data: { type: Core.Expression_enum.Variable_expression, value: variable_expression } });
}

function node_to_alias_type_declaration(node: Node, key_to_production_rule_indices: Map<string, number[]>): Core.Alias_type_declaration {
    const name = find_node_value(node, "Alias_name", key_to_production_rule_indices);

    const type_name = find_node_value(node, "Alias_type", key_to_production_rule_indices);
    const type_reference = Type_utilities.parse_type_name(type_name);

    return {
        name: name,
        type: {
            size: type_reference.length,
            elements: type_reference
        }
    };
}

function node_to_enum_declaration(node: Node, key_to_production_rule_indices: Map<string, number[]>): Core.Enum_declaration {
    const name = find_node_value(node, "Enum_name", key_to_production_rule_indices);

    const value_nodes = find_nodes_inside_parent(node, "Enum_values", "Enum_value", key_to_production_rule_indices);

    const values: Core.Enum_value[] = [];

    for (let index = 0; index < value_nodes.length; ++index) {
        const value_node = value_nodes[index];

        const value_name = find_node_value(value_node, "Enum_value_name", key_to_production_rule_indices);
        const value_value = find_node_value(value_node, "Enum_value_value", key_to_production_rule_indices);

        values.push(
            {
                name: value_name,
                value: Number(value_value)
            }
        );
    }

    return {
        name: name,
        values: {
            size: values.length,
            elements: values
        }
    };
}

function node_to_struct_declaration(node: Node, key_to_production_rule_indices: Map<string, number[]>): Core.Struct_declaration {
    const name = find_node_value(node, "Struct_name", key_to_production_rule_indices);

    const member_nodes = find_nodes_inside_parent(node, "Struct_members", "Struct_member", key_to_production_rule_indices);

    const member_names: string[] = [];
    const member_types: Core.Type_reference[] = [];

    for (let index = 0; index < member_nodes.length; ++index) {
        const member_node = member_nodes[index];

        const member_name = find_node_value(member_node, "Struct_member_name", key_to_production_rule_indices);
        const member_type_name = find_node_value(member_node, "Struct_member_type", key_to_production_rule_indices);
        const member_type = Type_utilities.parse_type_name(member_type_name);

        member_names.push(member_name);
        member_types.push(member_type[0]);
    }

    return {
        name: name,
        member_names: {
            size: member_names.length,
            elements: member_names
        },
        member_types: {
            size: member_types.length,
            elements: member_types
        },
        is_packed: false,
        is_literal: false
    };
}

function is_export_node(node: Node, key_to_production_rule_indices: Map<string, number[]>): boolean {
    const export_value = find_node_value(node, "Export", key_to_production_rule_indices);
    return export_value.length > 0;
}

function node_to_import_module_with_alias(
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): Core.Import_module_with_alias {
    const module_name = find_node_value(node, "Import_name", key_to_production_rule_indices);
    const alias = find_node_value(node, "Import_alias", key_to_production_rule_indices);
    return {
        module_name: module_name,
        alias: alias
    };
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

    return module;
}

function node_to_declaration(
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): Core_intermediate_representation.Declaration {

    const is_export = is_export_node(node, key_to_production_rule_indices);

    switch (node.word.value) {
        case "Alias": {
            const value = node_to_alias_type_declaration(node, key_to_production_rule_indices);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Alias,
                is_export: is_export,
                value: value,
            };
        }
        case "Enum": {
            const value = node_to_enum_declaration(node, key_to_production_rule_indices);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Enum,
                is_export: is_export,
                value: value,
            };
        }
        case "Function": {
            const declaration_node_index = find_node_child_index(node, "Function_declaration", key_to_production_rule_indices);
            const definition_node_index = find_node_child_index(node, "Function_definition", key_to_production_rule_indices);
            const declaration = node_to_function_declaration(node.children[declaration_node_index], key_to_production_rule_indices);
            const definition = node_to_function_definition(node.children[definition_node_index], declaration.name, key_to_production_rule_indices);
            const value: Core_intermediate_representation.Function = {
                declaration: declaration,
                definition: definition
            };
            return {
                name: declaration.name,
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: is_export,
                value: value,
            };
        }
        case "Struct": {
            const value = node_to_struct_declaration(node, key_to_production_rule_indices);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Struct,
                is_export: is_export,
                value: value,
            };
        }
        default: {
            const message = "Parse_tree_convertor.node_to_declaration(): failed to handle node";
            onThrowError(message);
            throw message;
        }
    }
}

function join_all_child_node_values(node: Parser_node.Node): string {

    const values: string[] = [];

    const stack: Parser_node.Node[] = [];
    stack.push(node);

    while (stack.length > 0) {
        const current_node = stack.pop() as Parser_node.Node;
        if (current_node.children.length === 0 && current_node.production_rule_index === undefined) {
            values.push(current_node.word.value);
        }

        for (let index = 0; index < current_node.children.length; ++index) {
            const child_index = current_node.children.length - 1 - index;
            stack.push(current_node.children[child_index]);
        }
    }

    const value = values.join("");
    return value;
}

function node_to_core_object(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): any {
    switch (node.word.value) {
        case "Import": {
            const value = node_to_import_module_with_alias(node, key_to_production_rule_indices);
            return value;
        }
        case "Declaration": {
            const child = node.children[0];
            const value = node_to_declaration(child, key_to_production_rule_indices);
            return value;
        }
        case "Alias":
        case "Enum":
        case "Function":
        case "Struct": {
            const value = node_to_declaration(node, key_to_production_rule_indices);
            return value;
        }
    }
}

function create_new_module_change(
    new_value: any,
    name_node_id: string,
    array_name: string,
    find_index: (name: string) => number,
    modify_index: number,
    node: Parser_node.Node,
    is_modify_change: boolean
): { position: any[], change: Module_change.Change } {
    if (is_modify_change) {
        const index = modify_index;
        const change = index === -1 ? Module_change.create_add_element_to_vector(array_name, index, new_value) : Module_change.create_set_element_of_vector(array_name, index, new_value);
        return { position: [], change: change };
    }
    else {
        const name_node = find_descendant_if(node, node => node.word.value === name_node_id) as Parser_node.Node;
        const name = join_all_child_node_values(name_node);

        const index = find_index(name);

        if (index === -1) {
            const index = modify_index;
            return { position: [], change: Module_change.create_add_element_to_vector(array_name, index, new_value) };
        }
        else {
            return { position: [], change: Module_change.create_set_element_of_vector(array_name, index, new_value) };
        }
    }
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

        if (node.word.value === "Module_name") {
            const module_name = join_all_child_node_values(node);
            if (module.name !== module_name) {
                new_changes.push({ position: [], change: Module_change.create_update("name", module_name) });
            }
            continue;
        }
        else if (node.word.value === "Import") {

            const new_import = node_to_core_object(node, key_to_production_rule_indices);

            const new_change = create_new_module_change(
                new_import,
                "Import_name",
                "imports",
                (name: string) => module.imports.findIndex(value => value.module_name === name),
                node_position[node_position.length - 1],
                node,
                modify_change
            );
            new_changes.push(new_change);

            continue;
        }
        else if (node.word.value === "Alias" || node.word.value === "Enum" || node.word.value === "Function" || node.word.value === "Struct") {

            const new_declaration = node_to_core_object(node, key_to_production_rule_indices);

            const new_change = create_new_module_change(
                new_declaration,
                `${node.word.value}_name`,
                "declarations",
                (name: string) => module.declarations.findIndex(value => value.name === name),
                node_position[node_position.length - 2],
                node,
                modify_change
            );
            new_changes.push(new_change);

            continue;
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

function deep_equal(obj1: any, obj2: any): boolean {

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        return obj1 === obj2;
    }

    if (obj1 === null && obj2 === null) {
        return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (!deep_equal(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}