import { onThrowError } from "./errors";
import * as Grammar from "./Grammar";
import * as Module_change from "./Module_change";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Object_reference from "./Object_reference";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import { get_node_at_position, Node } from "./Parser_node";

const g_debug = false;

export type Map_terminal_to_word_handler = (
    module: Core_intermediate_representation.Module,
    stack: Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_mappings
) => Grammar.Word;

export type Choose_production_rule_handler = (
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings
) => { next_state: State, next_production_rule_index: number };

export type Create_module_changes_handler_data = {
    module: Core_intermediate_representation.Module,
    node: Parser_node.Node,
    node_position: number[],
    modify_change: boolean
};

export type Create_module_changes_handler = (
    data: Create_module_changes_handler_data
) => Module_change.Position_change_pair[];

export type Node_to_core_object_handler = (
    node: Parser_node.Node
) => any;

export type Extract_comments_from_node_handler = (
    node: Parser_node.Node
) => string | undefined;

export type Get_node_source_location_handler = (
    node: Parser_node.Node,
    stack: Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[]
) => Parser_node.Source_location | undefined;

export interface Parse_tree_mappings {
    value_map: Map<string, string[]>;
    value_transforms: Map<string, (value: any) => string>;
    terminal_to_word_map: Map<string, Map_terminal_to_word_handler>;
    vector_map: Map<string, string[][]>;
    order_index_nodes: Set<string>;
    choose_production_rule: Map<string, Choose_production_rule_handler>;
    create_module_changes_map: Map<string, Create_module_changes_handler>;
    node_to_core_object_map: Map<string, Node_to_core_object_handler>;
    extract_comments_from_node: Extract_comments_from_node_handler;
    get_node_source_location: Get_node_source_location_handler;
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

export function get_if_serie_index(
    stack: Module_to_parse_tree_stack_element[]
): number {
    let serie_index = 0;

    for (let stack_index = 0; stack_index < stack.length; ++stack_index) {
        const state_index = stack.length - 1 - stack_index;
        const state = stack[state_index];

        if (state.node.word.value === "Expression_if_else") {
            serie_index += 1;
        }
        else if (state.node.word.value === "Statement") {
            break;
        }
    }

    return serie_index;
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
            case "$if_series_index": {
                const serie_index = get_if_serie_index(stack);
                position.push(serie_index);
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
                word: { value: production_rules[0].lhs, type: Grammar.Word_type.Symbol, source_location: { line: 0, column: 0 } },
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

            const word = map_terminal_to_word(module, stack, production_rules, label, mappings);

            const child_node: Node = {
                word: word,
                state: -1,
                production_rule_index: undefined,
                children: []
            };

            const source_location = mappings.get_node_source_location(child_node, stack, production_rules);
            if (source_location !== undefined) {
                child_node.source_range = {
                    start: source_location,
                    end: {
                        line: source_location.line,
                        column: source_location.column + word.value.length
                    }
                };
            }

            parent_node.children.push(child_node);
        }
        else {

            const { next_state, next_production_rule_index } = choose_production_rule_index(module, production_rules, next_production_rule_indices, label, stack, mappings);
            const next_production_rule = production_rules[next_production_rule_index];
            if (next_production_rule === undefined) {
                const message = `Parse_tree_convertor.module_to_parse_tree(): choose_production_rule_index for label '${label}' returned an undefined production rule!`;
                onThrowError(message);
                throw Error(message);
            }

            const is_next_production_rule_array = (next_production_rule.flags & (Grammar.Production_rule_flags.Is_array | Grammar.Production_rule_flags.Is_array_set)) !== 0;
            const rhs_length = is_next_production_rule_array ? get_production_rule_array_rhs_length(module, production_rules, next_production_rule, stack, mappings) : next_production_rule.rhs.length;

            const child_stack_element: Module_to_parse_tree_stack_element =
            {
                production_rule_index: next_production_rule_index,
                state: next_state,
                node: {
                    word: { value: next_production_rule.lhs, type: Grammar.Word_type.Symbol, source_location: { line: 0, column: 0 } },
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
): number {

    if (production_rule.lhs === "Identifier_with_dots") {
        const word = map_terminal_to_word(module, stack, production_rules, "identifier", mappings);
        const split = word.value.split(".");
        const has_separator = production_rule.rhs.length === 3;
        const array_rhs_length = has_separator ? split.length * 2 - 1 : split.length;
        return array_rhs_length;
    }
    else if (production_rule.lhs === "Function_input_parameters") {
        const declaration = stack[stack.length - 1].state.value as Core_intermediate_representation.Declaration;
        const function_value = declaration.value as Core_intermediate_representation.Function;
        const array_length = function_value.declaration.input_parameter_names.length + (function_value.declaration.type.is_variadic ? 1 : 0);
        const has_separator = array_length >= 2;
        const array_rhs_length = has_separator ? array_length * 2 - 1 : array_length;
        return array_rhs_length;
    }
    else if (production_rule.lhs === "Function_pointer_type_input_parameters" || production_rule.lhs === "Function_pointer_type_output_parameters") {
        const type_reference = stack[stack.length - 1].state.value as Core_intermediate_representation.Type_reference[];
        const function_pointer_type = type_reference[0].data.value as Core_intermediate_representation.Function_pointer_type;

        const is_input_parameters = production_rule.lhs === "Function_pointer_type_input_parameters";
        const parameter_types = is_input_parameters ? function_pointer_type.type.input_parameter_types : function_pointer_type.type.output_parameter_types;
        const array_length = parameter_types.length + (is_input_parameters && function_pointer_type.type.is_variadic ? 1 : 0);
        const has_separator = array_length >= 2;
        const array_rhs_length = has_separator ? array_length * 2 - 1 : array_length;
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
        const array_position = replace_placeholders_by_values(
            module,
            array_position_with_placeholders[0].slice(1, array_position_with_placeholders[0].length),
            production_rules,
            stack,
            mappings
        );
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
                mappings
            );
            return result;
        }
    }

    if (label === "Function_input_parameters") {
        const declaration = stack[stack.length - 1].state.value as Core_intermediate_representation.Declaration;
        const function_value = declaration.value as Core_intermediate_representation.Function;

        const length = function_value.declaration.input_parameter_names.length + (function_value.declaration.type.is_variadic ? 1 : 0);
        const index = length > 1 ? 2 : length;
        return {
            next_state: {
                index: 0,
                value: function_value.declaration.input_parameter_names,
            },
            next_production_rule_index: next_production_rule_indices[index]
        };
    }
    else if (label === "Function_pointer_type_input_parameters" || label === "Function_pointer_type_output_parameters") {
        const type_reference = stack[stack.length - 1].state.value as Core_intermediate_representation.Type_reference[];
        const function_pointer_type = type_reference[0].data.value as Core_intermediate_representation.Function_pointer_type;

        const is_input_parameters = label === "Function_pointer_type_input_parameters";
        const parameter_types = is_input_parameters ? function_pointer_type.type.input_parameter_types : function_pointer_type.type.output_parameter_types;
        const length = parameter_types.length + (function_pointer_type.type.is_variadic ? 1 : 0);
        const index = length > 1 ? 2 : length;
        return {
            next_state: {
                index: 0,
                value: parameter_types,
            },
            next_production_rule_index: next_production_rule_indices[index]
        };
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
                const array_position = replace_placeholders_by_values(
                    module,
                    array_position_with_placeholders[0].slice(1, array_position_with_placeholders[0].length),
                    production_rules,
                    stack,
                    mappings
                );
                const array_reference = Object_reference.get_object_reference_at_position(state_value, array_position);
                if (array_reference.value === undefined) {
                    const message = `Array associated with label '${label}' is undefined!`;
                    onThrowError(message);
                    throw Error(message);
                }
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
    terminal: string,
    mappings: Parse_tree_mappings
): Scanner.Scanned_word {

    const label = stack[stack.length - 1].node.word.value;

    {
        const map = mappings.terminal_to_word_map.get(label);
        if (map !== undefined) {
            const word = map(module, stack, production_rules, terminal, mappings);
            return {
                value: word.value,
                type: word.type,
                source_location: { line: 0, column: 0 }
            };
        }
    }

    if (terminal !== "identifier" && terminal !== "number") {
        return { value: terminal, type: Scanner.get_word_type(terminal), source_location: { line: 0, column: 0 } };
    }

    if (label === "Function_parameter_name" || label === "Function_parameter_type") {
        const state = stack[stack.length - 4];
        if (state.node.word.value === "Function_pointer_type") {
            const function_pointer_type = state.state.value[0].data.value as Core_intermediate_representation.Function_pointer_type;

            const parameters_array_state = stack[stack.length - 3];
            const is_input_parameters = parameters_array_state.node.word.value === "Function_pointer_type_input_parameters";
            const parameter_names = is_input_parameters ? function_pointer_type.input_parameter_names : function_pointer_type.output_parameter_names;
            const parameter_index = (parameters_array_state.current_child_index - 1) / 2;

            const parameter_name = parameter_names[parameter_index];

            return {
                value: parameter_name, type: Grammar.Word_type.Alphanumeric, source_location: { line: 0, column: 0 }
            };
        }
    }

    const position_with_placeholders = mappings.value_map.get(label);
    if (position_with_placeholders === undefined) {
        return { value: terminal, type: Scanner.get_word_type(terminal), source_location: { line: 0, column: 0 } };
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

    return {
        value: transformed_value, type: Scanner.get_word_type(transformed_value), source_location: { line: 0, column: 0 }
    };
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
            return true;
        default:
            return false;
    }
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
    mappings: Parse_tree_mappings,
): Core_intermediate_representation.Module {

    const module: Core_intermediate_representation.Module = {
        name: "",
        imports: [],
        declarations: []
    };

    const new_changes = parse_tree_to_core_object(module, root, root, [], mappings, false);
    apply_module_changes(module, new_changes);

    {
        const comments = mappings.extract_comments_from_node(root);
        if (comments !== undefined) {
            module.comment = comments;
        }
    }

    return module;
}

export function apply_module_changes(
    module: Core_intermediate_representation.Module,
    changes: { position: any[], change: Module_change.Change }[]
): void {

    const previous_module_name = module.name;

    const previous_import_modules = module.imports.map(value => { return { module_name: value.module_name, alias: value.alias }; });

    Module_change.update_module(module, changes);

    update_custom_type_references_module_name(module, previous_module_name, module.name);

    update_custom_type_references_import_module_name(module, previous_import_modules);

    update_import_module_usages(module);
}

export function parse_tree_to_core_module(
    module: Core_intermediate_representation.Module,
    changes: { position: any[], change: Module_change.Change }[]
): void {

    const previous_module_name = module.name;

    const previous_import_modules = module.imports.map(value => { return { module_name: value.module_name, alias: value.alias }; });

    Module_change.update_module(module, changes);

    update_custom_type_references_module_name(module, previous_module_name, module.name);

    update_custom_type_references_import_module_name(module, previous_import_modules);

    update_import_module_usages(module);
}

function parse_tree_to_core_object(
    module: Core_intermediate_representation.Module,
    root: Parser_node.Node,
    initial_node: Parser_node.Node,
    initial_node_position: number[],
    mappings: Parse_tree_mappings,
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
                    modify_change: modify_change
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
    mappings: Parse_tree_mappings
): any {
    const map = mappings.node_to_core_object_map.get(node.word.value) as Node_to_core_object_handler;
    return map(node);
}

function visit_expressions(expression: Core_intermediate_representation.Expression, predicate: (expression: Core_intermediate_representation.Expression) => void) {

    predicate(expression);

    switch (expression.data.type) {
        case Core_intermediate_representation.Expression_enum.Access_expression: {
            const value = expression.data.value as Core_intermediate_representation.Access_expression;
            visit_expressions(value.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Access_array_expression: {
            const value = expression.data.value as Core_intermediate_representation.Access_array_expression;
            visit_expressions(value.expression, predicate);
            visit_expressions(value.index, predicate);
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
        case Core_intermediate_representation.Expression_enum.Constant_array_expression: {
            const value = expression.data.value as Core_intermediate_representation.Constant_array_expression;
            for (const statement of value.array_data) {
                visit_expressions(statement.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Defer_expression: {
            const value = expression.data.value as Core_intermediate_representation.Defer_expression;
            visit_expressions(value.expression_to_defer, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.Dereference_and_access_expression: {
            const value = expression.data.value as Core_intermediate_representation.Dereference_and_access_expression;
            visit_expressions(value.expression, predicate);
            break;
        }
        case Core_intermediate_representation.Expression_enum.For_loop_expression: {
            const value = expression.data.value as Core_intermediate_representation.For_loop_expression;
            visit_expressions(value.range_begin, predicate);
            visit_expressions(value.range_end.expression, predicate);
            if (value.step_by !== undefined) {
                visit_expressions(value.step_by, predicate);
            }
            for (const statement of value.then_statements) {
                visit_expressions(statement.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Function_expression: {
            const value = expression.data.value as Core_intermediate_representation.Function_expression;
            for (const statement of value.definition.statements) {
                visit_expressions(statement.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.If_expression: {
            const value = expression.data.value as Core_intermediate_representation.If_expression;
            for (const serie of value.series) {
                if (serie.condition !== undefined) {
                    visit_expressions(serie.condition.expression, predicate);
                }
                for (const statement of serie.then_statements) {
                    visit_expressions(statement.expression, predicate);
                }
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Instance_call_expression: {
            const value = expression.data.value as Core_intermediate_representation.Instance_call_expression;
            visit_expressions(value.left_hand_side, predicate);
            for (const argument of value.arguments) {
                visit_expressions(argument, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Instantiate_expression: {
            const value = expression.data.value as Core_intermediate_representation.Instantiate_expression;
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
            if (value.expression !== undefined) {
                visit_expressions(value.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Struct_expression: {
            const struct_expression = expression.data.value as Core_intermediate_representation.Struct_expression;
            for (const statement of struct_expression.declaration.member_default_values) {
                visit_expressions(statement.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Switch_expression: {
            const value = expression.data.value as Core_intermediate_representation.Switch_expression;
            visit_expressions(value.value, predicate); 22
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
            for (const statement of value.then_statements) {
                visit_expressions(statement.expression, predicate);
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Break_expression:
        case Core_intermediate_representation.Expression_enum.Comment_expression:
        case Core_intermediate_representation.Expression_enum.Constant_expression:
        case Core_intermediate_representation.Expression_enum.Continue_expression:
        case Core_intermediate_representation.Expression_enum.Invalid_expression:
        case Core_intermediate_representation.Expression_enum.Null_pointer_expression:
        case Core_intermediate_representation.Expression_enum.Type_expression:
        case Core_intermediate_representation.Expression_enum.Union_expression:
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

function visit_expressions_of_module(module: Core_intermediate_representation.Module, predicate: (expression: Core_intermediate_representation.Expression) => void): void {
    for (const declaration of module.declarations) {
        if (declaration.type === Core_intermediate_representation.Declaration_type.Function) {
            const function_value = declaration.value as Core_intermediate_representation.Function;

            if (function_value.definition !== undefined) {
                for (const statement of function_value.definition.statements) {
                    visit_expressions(statement.expression, predicate);
                }
            }
        }
    }
}

export function visit_types(type: Core_intermediate_representation.Type_reference, visitor: (type: Core_intermediate_representation.Type_reference) => void): void {
    visitor(type);

    switch (type.data.type) {
        case Core_intermediate_representation.Type_reference_enum.Constant_array_type: {
            const value = type.data.value as Core_intermediate_representation.Constant_array_type;
            if (value.value_type.length > 0) {
                visit_types(value.value_type[0], visitor);
            }
            break;
        }
        case Core_intermediate_representation.Type_reference_enum.Function_pointer_type: {
            const value = type.data.value as Core_intermediate_representation.Function_pointer_type;
            for (const type of value.type.input_parameter_types) {
                visit_types(type, visitor);
            }
            for (const type of value.type.output_parameter_types) {
                visit_types(type, visitor);
            }
            break;
        }
        case Core_intermediate_representation.Type_reference_enum.Pointer_type: {
            const value = type.data.value as Core_intermediate_representation.Pointer_type;
            if (value.element_type.length > 0) {
                visit_types(value.element_type[0], visitor);
            }
            break;
        }
        case Core_intermediate_representation.Type_reference_enum.Type_instance: {
            const value = type.data.value as Core_intermediate_representation.Type_instance;

            const left_hand_side: Core_intermediate_representation.Type_reference = {
                data: {
                    type: Core_intermediate_representation.Type_reference_enum.Custom_type_reference,
                    value: value.type_constructor
                }
            };
            visit_types(left_hand_side, visitor);

            for (const statement of value.arguments) {
                visit_types_of_expression(statement.expression, visitor);
            }

            break;
        }
        case Core_intermediate_representation.Type_reference_enum.Builtin_type_reference:
        case Core_intermediate_representation.Type_reference_enum.Custom_type_reference:
        case Core_intermediate_representation.Type_reference_enum.Fundamental_type:
        case Core_intermediate_representation.Type_reference_enum.Integer_type:
        case Core_intermediate_representation.Type_reference_enum.Parameter_type: {
            break;
        }
        default: {
            const message = `Parse_tree_convertor.update_import_module_usages(): Type '${type.data.type}' not handled!`;
            onThrowError(message);
            throw Error(message);
        }
    }
}

export function visit_types_of_expression(expression: Core_intermediate_representation.Expression, visitor: (type: Core_intermediate_representation.Type_reference) => void): void {

    const process_expression = (expression: Core_intermediate_representation.Expression): void => {
        switch (expression.data.type) {
            case Core_intermediate_representation.Expression_enum.Cast_expression: {
                const cast_expression = expression.data.value as Core_intermediate_representation.Cast_expression;
                visit_types(cast_expression.destination_type, visitor);
                break;
            }
            case Core_intermediate_representation.Expression_enum.Function_expression: {
                const value = expression.data.value as Core_intermediate_representation.Function_expression;
                for (const type of value.declaration.type.input_parameter_types) {
                    visit_types(type, visitor);
                }
                for (const type of value.declaration.type.output_parameter_types) {
                    visit_types(type, visitor);
                }
                break;
            }
            case Core_intermediate_representation.Expression_enum.Struct_expression: {
                const struct_expression = expression.data.value as Core_intermediate_representation.Struct_expression;
                for (const member_type of struct_expression.declaration.member_types) {
                    visit_types(member_type, visitor);
                }
                break;
            }
            case Core_intermediate_representation.Expression_enum.Type_expression: {
                const type_expression = expression.data.value as Core_intermediate_representation.Type_expression;
                visit_types(type_expression.type, visitor);
                break;
            }
            case Core_intermediate_representation.Expression_enum.Union_expression: {
                const union_expression = expression.data.value as Core_intermediate_representation.Union_expression;
                for (const member_type of union_expression.declaration.member_types) {
                    visit_types(member_type, visitor);
                }
                break;
            }
            case Core_intermediate_representation.Expression_enum.Variable_declaration_with_type_expression: {
                const variable_declaration_with_type_expression = expression.data.value as Core_intermediate_representation.Variable_declaration_with_type_expression;
                visit_types(variable_declaration_with_type_expression.type, visitor);
                break;
            }
            default: {
                break;
            }
        }
    };

    visit_expressions(expression, process_expression);
}

function visit_types_of_module(module: Core_intermediate_representation.Module, visitor: (type: Core_intermediate_representation.Type_reference) => void): void {

    for (const declaration of module.declarations) {
        if (declaration.type === Core_intermediate_representation.Declaration_type.Alias) {
            const alias_declaration = declaration.value as Core_intermediate_representation.Alias_type_declaration;

            if (alias_declaration.type.length > 0) {
                visit_types(alias_declaration.type[0], visitor);
            }
        }
        else if (declaration.type === Core_intermediate_representation.Declaration_type.Function) {
            const function_value = declaration.value as Core_intermediate_representation.Function;

            for (const type of function_value.declaration.type.input_parameter_types) {
                visit_types(type, visitor);
            }

            for (const type of function_value.declaration.type.output_parameter_types) {
                visit_types(type, visitor);
            }
        }
        else if (declaration.type === Core_intermediate_representation.Declaration_type.Function_constructor) {
            const function_constructor_declaration = declaration.value as Core_intermediate_representation.Function_constructor;

            for (const parameter of function_constructor_declaration.parameters) {
                visit_types(parameter.type, visitor);
            }
        }
        else if (declaration.type === Core_intermediate_representation.Declaration_type.Struct) {
            const struct_declaration = declaration.value as Core_intermediate_representation.Struct_declaration;

            for (const type of struct_declaration.member_types) {
                visit_types(type, visitor);
            }
        }
        else if (declaration.type === Core_intermediate_representation.Declaration_type.Type_constructor) {
            const type_constructor_declaration = declaration.value as Core_intermediate_representation.Type_constructor;

            for (const parameter of type_constructor_declaration.parameters) {
                visit_types(parameter.type, visitor);
            }
        }
        else if (declaration.type === Core_intermediate_representation.Declaration_type.Union) {
            const union_declaration = declaration.value as Core_intermediate_representation.Union_declaration;

            for (const type of union_declaration.member_types) {
                visit_types(type, visitor);
            }
        }
    }

    const process_expression = (expression: Core_intermediate_representation.Expression): void => {
        visit_types_of_expression(expression, visitor);
    };

    visit_expressions_of_module(module, process_expression);
}

export function update_import_module_usages(module: Core_intermediate_representation.Module): void {

    for (const import_module of module.imports) {
        import_module.usages = [];
    }

    const add_unique_usage = (module_name: string, usage: string): void => {
        if (module_name === "") {
            return;
        }

        const import_module = module.imports.find(element => element.module_name === module_name);
        if (import_module !== undefined) {
            const index = import_module.usages.findIndex(value => value === usage);
            if (index === -1) {
                import_module.usages.push(usage);
            }
        }
    };

    const process_type = (type: Core_intermediate_representation.Type_reference): void => {
        if (type.data.type === Core_intermediate_representation.Type_reference_enum.Custom_type_reference) {
            const custom_type_reference = type.data.value as Core_intermediate_representation.Custom_type_reference;
            add_unique_usage(custom_type_reference.module_reference.name, custom_type_reference.name);
        }
    };

    visit_types_of_module(module, process_type);

    const process_expression = (expression: Core_intermediate_representation.Expression): void => {
        if (expression.data.type === Core_intermediate_representation.Expression_enum.Access_expression) {
            const access_expression = expression.data.value as Core_intermediate_representation.Access_expression;
            if (access_expression.expression.data.type === Core_intermediate_representation.Expression_enum.Variable_expression) {
                const variable_expression = access_expression.expression.data.value as Core_intermediate_representation.Variable_expression;
                const import_module = module.imports.find(element => element.alias === variable_expression.name);
                if (import_module !== undefined) {
                    add_unique_usage(import_module.module_name, access_expression.member_name);
                }
            }
        }
    };

    visit_expressions_of_module(module, process_expression);

    for (const import_module of module.imports) {
        import_module.usages.sort();
    }
}

export function update_custom_type_references_module_name(module: Core_intermediate_representation.Module, old_module_name: string, new_module_name: string): void {

    const process_type = (type: Core_intermediate_representation.Type_reference): void => {
        if (type.data.type === Core_intermediate_representation.Type_reference_enum.Custom_type_reference) {
            const custom_type_reference = type.data.value as Core_intermediate_representation.Custom_type_reference;
            if (custom_type_reference.module_reference.name !== undefined && custom_type_reference.module_reference.name.length === 0 || custom_type_reference.module_reference.name === old_module_name) {
                custom_type_reference.module_reference.name = new_module_name;
            }
        }
    };

    visit_types_of_module(module, process_type);
}

export function update_custom_type_references_import_module_name(module: Core_intermediate_representation.Module, previous_import_modules: { module_name: string, alias: string }[]): void {

    const changes: { previous_module_name: string, new_module_name: string }[] = [];

    for (const previous_import_module of previous_import_modules) {
        const new_import_module = module.imports.find(value => value.alias === previous_import_module.alias);
        if (new_import_module !== undefined && new_import_module.module_name !== previous_import_module.module_name) {
            changes.push({ previous_module_name: previous_import_module.module_name, new_module_name: new_import_module.module_name });
        }
    }

    const process_type = (type: Core_intermediate_representation.Type_reference): void => {
        if (type.data.type === Core_intermediate_representation.Type_reference_enum.Custom_type_reference) {
            const custom_type_reference = type.data.value as Core_intermediate_representation.Custom_type_reference;

            const change = changes.find(value => value.previous_module_name === custom_type_reference.module_reference.name);
            if (change !== undefined) {
                custom_type_reference.module_reference.name = change.new_module_name;
                return;
            }

            const import_module = module.imports.find(value => value.alias === custom_type_reference.module_reference.name);
            if (import_module !== undefined) {
                custom_type_reference.module_reference.name = import_module.module_name;
            }
        }
    };

    visit_types_of_module(module, process_type);
}
