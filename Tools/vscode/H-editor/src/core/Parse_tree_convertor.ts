import * as Core from "./Core_interface";
import * as Core_helpers from "./Core_helpers";
import { onThrowError } from "../utilities/errors";
import * as Grammar from "./Grammar";
import * as Module_change from "./Module_change";
import * as Object_reference from "../utilities/Object_reference";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import * as Type_utilities from "./Type_utilities";
import { get_node_at_position, Node } from "./Parser_node";

const g_debug = false;

export enum Declaration_type {
    Alias,
    Enum,
    Struct,
    Function
}

export interface Declaration {
    type: Declaration_type;
    is_export: boolean;
    index: number;
}

export function create_declarations(module: Core.Module): Declaration[] {

    const declarations: Declaration[] = [
        ...module.export_declarations.alias_type_declarations.elements.map((_, index): Declaration => { return { type: Declaration_type.Alias, is_export: true, index: index }; }),
        ...module.export_declarations.enum_declarations.elements.map((_, index): Declaration => { return { type: Declaration_type.Enum, is_export: true, index: index }; }),
        ...module.export_declarations.function_declarations.elements.map((_, index): Declaration => { return { type: Declaration_type.Function, is_export: true, index: index }; }),
        ...module.export_declarations.struct_declarations.elements.map((_, index): Declaration => { return { type: Declaration_type.Struct, is_export: true, index: index }; }),
        ...module.internal_declarations.alias_type_declarations.elements.map((_, index): Declaration => { return { type: Declaration_type.Alias, is_export: false, index: index }; }),
        ...module.internal_declarations.enum_declarations.elements.map((_, index): Declaration => { return { type: Declaration_type.Enum, is_export: false, index: index }; }),
        ...module.internal_declarations.function_declarations.elements.map((_, index): Declaration => { return { type: Declaration_type.Function, is_export: false, index: index }; }),
        ...module.internal_declarations.struct_declarations.elements.map((_, index): Declaration => { return { type: Declaration_type.Struct, is_export: false, index: index }; }),
    ];

    return declarations;
}

export enum Production_rule_info_type {
    Empty,
    Value,
    Child_pointer,
    Object,
    Array
}

export enum Object_entry_type {
    Array_view,
    Child_index,
    Value
}

interface Array_view {
    array_index: number;
    element_key: string;
}

export interface Object_entry {
    type: Object_entry_type;
    keys: string[],
    value: Array_view | number;
}

export interface Object_info {
    arrays: Array_info[];
    properties: Object_entry[];
}

export interface Array_info {
    array_name: string;
    element_type: string;
    separator_type: string;
}

export interface Production_rule_info {
    type: Production_rule_info_type;
    value: any;
}

function create_array_view_property(keys: string[], array_index: number, element_key: string): Object_entry {
    const array_view: Array_view = {
        array_index: array_index,
        element_key: element_key
    };

    return {
        type: Object_entry_type.Array_view,
        keys: keys,
        value: array_view
    };
}

function create_child_index_property(keys: string[], child_index: number): Object_entry {
    return {
        type: Object_entry_type.Child_index,
        keys: keys,
        value: child_index
    };
}

function create_value_property(keys: string[], value: any): Object_entry {
    return {
        type: Object_entry_type.Value,
        keys: keys,
        value: value
    };
}

export function create_production_rule_to_value_map(production_rules: Grammar.Production_rule[]): Production_rule_info[] {

    const map: Production_rule_info[] = [];

    for (const production_rule of production_rules) {

        switch (production_rule.lhs) {
            case "Alias_name":
            case "Alias_type":
            case "Enum_name":
            case "Function_name":
            case "Function_parameter_name":
            case "Function_parameter_type":
            case "Module_name":
            case "Struct_name": {
                map.push({ type: Production_rule_info_type.Child_pointer, value: 0 });
                break;
            }
            case "Export": {
                if (production_rule.rhs.length === 0) {
                    map.push({ type: Production_rule_info_type.Value, value: Core.Linkage.Private });
                }
                else if (production_rule.rhs[0] === "export" || production_rule.rhs[0] === "public") {
                    map.push({ type: Production_rule_info_type.Value, value: Core.Linkage.External });
                }
                else {
                    map.push({ type: Production_rule_info_type.Value, value: Core.Linkage.Private });
                }
                break;
            }
            case "Function_declaration": {

                const object_arrays: Array_info[] = [
                    {
                        array_name: "Function_input_parameters",
                        element_type: "Function_parameter",
                        separator_type: ","
                    },
                    {
                        array_name: "Function_output_parameters",
                        element_type: "Function_parameter",
                        separator_type: ","
                    }
                ];

                const object_properties: Object_entry[] = [
                    create_child_index_property(["name"], production_rule.rhs.findIndex(label => label === "Function_name")),
                    create_array_view_property(["type", "input_parameter_types"], 0, "type"),
                    create_array_view_property(["type", "output_parameter_types"], 1, "type"),
                    create_value_property(["type", "is_variadic"], false),
                    create_array_view_property(["input_parameter_names"], 0, "name"),
                    create_array_view_property(["output_parameter_names"], 1, "name"),
                    create_child_index_property(["linkage"], production_rule.rhs.findIndex(label => label === "Export")),
                ];

                const object_info: Object_info = {
                    arrays: object_arrays,
                    properties: object_properties
                };

                map.push({ type: Production_rule_info_type.Object, value: object_info });
                break;
            }
            case "Function_definition": {
                map.push({ type: Production_rule_info_type.Empty, value: 0 });
                break;
            }
            case "Function_parameter": {
                const object_properties: Object_entry[] = [
                    create_child_index_property(["name"], production_rule.rhs.findIndex(label => label === "Function_parameter_name")),
                    create_child_index_property(["type"], production_rule.rhs.findIndex(label => label === "Function_parameter_type")),
                ];
                const object_info: Object_info = {
                    arrays: [],
                    properties: object_properties
                };
                map.push({ type: Production_rule_info_type.Object, value: object_info });
                break;
            }
            default:
                map.push({ type: Production_rule_info_type.Empty, value: 0 });
                break;
        }
    }

    return map;
}

enum Change_action_type {
    Empty,
    Update
}

interface Update_action {
    position: any[];
    key: string;
}

interface Change_action {
    type: Change_action_type;
    value: Update_action | undefined;
}

export function create_production_rule_to_change_action_map(production_rules: Grammar.Production_rule[]): Change_action[] {

    const map: Change_action[] = [];

    for (const production_rule of production_rules) {
        switch (production_rule.lhs) {
            case "Module_name": {
                const update: Update_action = {
                    position: [],
                    key: "name"
                };
                map.push({ type: Change_action_type.Update, value: update });
                break;
            }
            default: {
                map.push({ type: Change_action_type.Empty, value: undefined });
                break;
            }
        }
    }

    return map;
}

type Choose_production_rule_handler = (
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
) => { next_state: State, next_production_rule_index: number };

interface Parse_tree_mappings {
    vector_to_node_name: Map<string, string>;
    value_map: Map<string, string[]>;
    value_transforms: Map<string, (value: any) => string>;
    vector_map: Map<string, string[]>;
    order_index_nodes: Set<string>;
    choose_production_rule: Map<string, Choose_production_rule_handler>;
}

function create_mapping(): Parse_tree_mappings {

    const vector_to_node_name = new Map<string, string>(
        [
            ["alias_type_declarations", "Alias_name"],
            ["enum_declarations", "Enum_name"],
            ["function_declarations", "Function_name"],
            ["function_definitions", "Function_name"],
            ["struct_declarations", "Struct_name"]
        ]
    );

    const value_map = new Map<string, string[]>(
        [
            ["Module_name", ["name"]],
            ["Import_name", ["dependencies", "alias_imports", "elements", "$order_index", "module_name"]],
            ["Import_alias", ["dependencies", "alias_imports", "elements", "$order_index", "alias"]],
            ["Alias_name", ["$export", "alias_type_declarations", "elements", "$name_index", "name"]],
            ["Alias_type", ["$export", "alias_type_declarations", "elements", "$name_index", "type", "elements"]],
            ["Enum_name", ["$export", "enum_declarations", "elements", "$name_index", "name"]],
            ["Enum_value_name", ["$export", "enum_declarations", "elements", "$name_index", "values", "elements", "$order_index", "name"]],
            ["Enum_value_value", ["$export", "enum_declarations", "elements", "$name_index", "values", "elements", "$order_index", "value"]],
            ["Function_name", ["$export", "function_declarations", "elements", "$name_index", "name"]],
            ["Function_parameter_name", ["$export", "function_declarations", "elements", "$name_index", "$parameter_names", "elements", "$order_index"]],
            ["Function_parameter_type", ["$export", "function_declarations", "elements", "$name_index", "type", "$parameter_types", "elements", "$order_index"]],
            ["Struct_name", ["$export", "struct_declarations", "elements", "$name_index", "name"]],
            ["Struct_member_name", ["$export", "struct_declarations", "elements", "$name_index", "member_names", "elements", "$order_index"]],
            ["Struct_member_type", ["$export", "struct_declarations", "elements", "$name_index", "member_types", "elements", "$order_index"]],
            ["Variable_name", ["definitions", "function_definitions", "elements", "$name_index", "statements", "elements", "$order_index", "expressions", "elements", "$expression_index", "data", "value", "name"]],
        ]
    );

    const value_transforms = new Map<string, (value: any) => string>(
        [
            ["Alias_type", Type_utilities.get_type_name],
            ["Function_parameter_type", value => Type_utilities.get_type_name([value])],
            ["Struct_member_type", value => Type_utilities.get_type_name([value])],
        ]
    );

    const vector_map = new Map<string, string[]>(
        [
            ["Imports", ["dependencies", "alias_imports"]],
            ["Module_body", ["$declarations"]],
            ["Enum_values", ["$export", "enum_declarations", "elements", "$name_index", "values"]],
            ["Function_input_parameters", ["$export", "function_declarations", "elements", "$name_index", "input_parameter_names"]],
            ["Function_output_parameters", ["$export", "function_declarations", "elements", "$name_index", "output_parameter_names"]],
            ["Struct_members", ["$export", "struct_declarations", "elements", "$name_index", "member_names"]],
            ["Statements", ["definitions", "function_definitions", "elements", "$name_index", "statements"]],
        ]
    );

    const order_index_nodes = new Set<string>(
        [
            "Imports",
            "Enum_values",
            "Function_input_parameters",
            "Function_output_parameters",
            "Struct_members",
            "Statements",
        ]
    );

    const choose_production_rule = new Map<string, Choose_production_rule_handler>(
        [
            ["Identifier_with_dots", choose_production_rule_identifier_with_dots],
            ["Declaration", choose_production_rule_declaration],
            ["Export", choose_production_rule_export],
            ["Statement", choose_production_rule_statement],
            ["Expression_return", choose_production_rule_expression],
            ["Generic_expression", choose_production_rule_expression],
            ["Expression_binary_symbol", choose_production_rule_expression],
        ]
    );

    return {
        vector_to_node_name: vector_to_node_name,
        value_map: value_map,
        value_transforms: value_transforms,
        vector_map: vector_map,
        order_index_nodes: order_index_nodes,
        choose_production_rule: choose_production_rule
    };
}

function choose_production_rule_identifier_with_dots(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: State, next_production_rule_index: number } {
    const word = map_terminal_to_word(module, stack, production_rules, key_to_production_rule_indices, "", mappings, declarations);
    const split = word.value.split(".");
    const index = split.length > 1 ? 1 : 0;
    return {
        next_state: {
            index: 0,
            value: undefined
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_declaration(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const production_rule = production_rules[top.production_rule_index];
    const declaration_index = calculate_array_index(production_rule, top.current_child_index);
    const declaration = declarations[declaration_index];

    const lhs = get_underlying_declaration_production_rule_lhs(declaration.type);

    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, lhs));
    return {
        next_state: {
            index: declaration_index,
            value: declaration
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_export(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const declaration = top.state.value as Declaration;
    const predicate =
        declaration.is_export ?
            (index: number) => production_rules[index].rhs.length > 0 :
            (index: number) => production_rules[index].rhs.length === 0;
    const index = production_rule_indices.findIndex(predicate);

    return {
        next_state: top.state,
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_statement(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const statements_array = top.state.value as Core.Statement[];
    const statement_index = calculate_array_index(production_rules[top.production_rule_index], top.current_child_index);
    const statement = statements_array[statement_index];

    const first_expression = statement.expressions.elements[0];
    const rhs_label = map_expression_type_to_production_rule_label(first_expression.data.type);
    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));

    return {
        next_state: {
            index: 0,
            value: statement
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];
    const statement = top.state.value as Core.Statement;

    const calculate_expression_index = (): number => {
        switch (top.node.word.value) {
            case "Statement": {
                return 0;
            }
            case "Expression_binary": {
                const binary_expression = statement.expressions.elements[top.state.index].data.value as Core.Binary_expression;
                switch (top.current_child_index) {
                    case 0:
                        return binary_expression.left_hand_side.expression_index;
                    case 1:
                        return top.state.index;
                    default:
                        return binary_expression.right_hand_side.expression_index;
                }
            }
            case "Expression_return": {
                const return_expression = statement.expressions.elements[top.state.index].data.value as Core.Return_expression;
                return return_expression.expression.expression_index;
            }
            default: {
                const message = `Parse_tree_convertor.choose_production_rule_expression.calculate_expression_index(): expression type not handled: '${top.node.word.value}'`;
                onThrowError(message);
                throw message;
            }
        }
    };

    const expression_index = calculate_expression_index();
    const expression = statement.expressions.elements[expression_index];

    switch (label) {
        case "Expression_binary_symbol": {
            const binary_expression = expression.data.value as Core.Binary_expression;
            const rhs_label = map_binary_operation_production_rule_label(binary_expression.operation);
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));
            return {
                next_state: {
                    index: expression_index,
                    value: statement
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        case "Expression_return": {
            const return_expression = expression.data.value as Core.Return_expression;
            const next_expression_index = return_expression.expression.expression_index;
            const index = next_expression_index !== -1 ? 1 : 0;
            return {
                next_state: {
                    index: expression_index,
                    value: statement
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        case "Generic_expression": {
            const rhs_label = map_expression_type_to_production_rule_label(expression.data.type);
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));
            return {
                next_state: {
                    index: expression_index,
                    value: statement
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        default: {
            const message = `Parse_tree_convertor.choose_production_rule_expression(): expression type not handled: '${label}'`;
            onThrowError(message);
            throw message;
        }
    }
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
    position_with_placeholders: string[],
    production_rules: Grammar.Production_rule[],
    declarations: Declaration[],
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings
): any[] {

    const position: any[] = [];

    for (let index = 0; index < position_with_placeholders.length; ++index) {
        const value = position_with_placeholders[index];

        switch (value) {
            case "$export": {
                const module_body_stack_index = get_stack_element_index_with_label(stack, "Module_body");
                const module_body_element = stack[module_body_stack_index];
                const declaration_index = module_body_stack_index < stack.length - 1 ? module_body_element.current_child_index - 1 : module_body_element.current_child_index;
                const declaration = declarations[declaration_index];
                const name = declaration.is_export ? "export_declarations" : "internal_declarations";
                position.push(name);
                break;
            }
            case "$name_index": {
                const declaration_state_index = find_parent_state_index_using_word(stack, stack.length - 1, "Module_body");
                const declaration_state = stack[declaration_state_index];
                const declaration_index = declaration_state.current_child_index - 1;
                const declaration = declarations[declaration_index];
                position.push(declaration.index);
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
                const index = calculate_array_index(production_rule, array_state.current_child_index - 1);
                position.push(index);
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

interface State {
    index: number;
    value: any;
}

interface Module_to_parse_tree_stack_element {
    production_rule_index: number;
    state: State;
    node: Node;
    rhs_length: number;
    current_child_index: number;
    is_array_production_rule: boolean;
}

function get_stack_element_index_with_label(stack: Module_to_parse_tree_stack_element[], label: string): number {
    for (let index = 0; index < stack.length; ++index) {
        const stack_index = stack.length - 1 - index;
        const element = stack[stack_index];
        if (element.node.word.value === label) {
            return stack_index;
        }
    }

    return -1;
}

export function module_to_parse_tree(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[]
): Node {

    const mappings = create_mapping();
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

            const word = map_terminal_to_word(module, stack, production_rules, key_to_production_rule_indices, label, mappings, declarations);

            const child_node: Node = {
                word: word,
                state: -1,
                production_rule_index: undefined,
                children: []
            };

            parent_node.children.push(child_node);
        }
        else {

            const { next_state, next_production_rule_index } = choose_production_rule_index(module, production_rules, next_production_rule_indices, label, declarations, stack, mappings, key_to_production_rule_indices);
            const next_production_rule = production_rules[next_production_rule_index];

            const is_next_production_rule_array = (next_production_rule.flags & (Grammar.Production_rule_flags.Is_array | Grammar.Production_rule_flags.Is_array_set)) !== 0;
            const rhs_length = is_next_production_rule_array ? get_production_rule_array_rhs_length(module, production_rules, next_production_rule, declarations, stack, mappings, key_to_production_rule_indices) : next_production_rule.rhs.length;

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
    module: Core.Module,
    production_rules: Grammar.Production_rule[],
    production_rule: Grammar.Production_rule,
    declarations: Declaration[],
    stack: Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): number {

    if (production_rule.lhs === "Identifier_with_dots") {
        const word = map_terminal_to_word(module, stack, production_rules, key_to_production_rule_indices, "", mappings, declarations);
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

    if (vector_position_with_placeholders[0] === "$declarations") {
        return declarations.length;
    }

    const vector_position = replace_placeholders_by_values(
        vector_position_with_placeholders,
        production_rules,
        declarations,
        stack,
        mappings
    );

    const vector_array_reference = Object_reference.get_object_reference_at_position(module, [...vector_position, "elements"]);
    const length: number = vector_array_reference.value.length;
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

function calculate_array_index(production_rule: Grammar.Production_rule, label_index: number): number {
    const is_production_rule_array = (production_rule.flags & Grammar.Production_rule_flags.Is_array);
    const array_index = is_production_rule_array ? (production_rule.rhs.length === 3 ? label_index / 2 : label_index) : label_index;
    return array_index;
}

function contains(array: any[], value: any): boolean {
    const index = array.findIndex(current => current === value);
    return index !== -1;
}

function choose_production_rule_index(
    module: Core.Module,
    production_rules: Grammar.Production_rule[],
    next_production_rule_indices: number[],
    label: string,
    declarations: Declaration[],
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
                declarations,
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

            if (vector_position_with_placeholders.length > 0 && vector_position_with_placeholders[0] === "$declarations") {
                const length = declarations.length;
                const index = length > 1 ? 2 : length;
                return {
                    next_state: {
                        index: 0,
                        value: declarations
                    },
                    next_production_rule_index: next_production_rule_indices[index]
                };
            }

            const vector_position = replace_placeholders_by_values(vector_position_with_placeholders, production_rules, declarations, stack, mappings);
            const vector_array_reference = Object_reference.get_object_reference_at_position(module, [...vector_position, "elements"]);
            const length = vector_array_reference.value.length;
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

function map_expression_type_to_production_rule_label(type: Core.Expression_enum): string {
    switch (type) {
        case Core.Expression_enum.Binary_expression:
            return "Expression_binary";
        case Core.Expression_enum.Call_expression:
            return "Expression_call";
        case Core.Expression_enum.Constant_expression:
            return "Expression_constant";
        case Core.Expression_enum.Invalid_expression:
            return "Expression_invalid";
        case Core.Expression_enum.Return_expression:
            return "Expression_return";
        case Core.Expression_enum.Variable_expression:
            return "Expression_variable";
    }
}

function map_binary_operation_production_rule_label(type: Core.Binary_operation): string {
    return "Expression_binary_symbol_" + type.toLocaleLowerCase();
}

function get_underlying_declaration_production_rule_lhs(type: Declaration_type): string {
    switch (type) {
        case Declaration_type.Alias:
            return "Alias";
        case Declaration_type.Enum:
            return "Enum";
        case Declaration_type.Function:
            return "Function";
        case Declaration_type.Struct:
            return "Struct";
    }
}

function map_terminal_to_word(
    module: Core.Module,
    stack: Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_mappings,
    declarations: Declaration[]
): Scanner.Scanned_word {

    const label = stack[stack.length - 1].node.word.value;

    if (label === "Identifier_with_dots") {
        const index = stack[stack.length - 1].current_child_index;
        if (index % 2 !== 0) {
            return { value: ".", type: Grammar.Word_type.Symbol };
        }

        const word = map_terminal_to_word(module, stack.slice(0, stack.length - 1), production_rules, key_to_production_rule_indices, "", mappings, declarations);
        const split = word.value.split(".");
        return { value: split[index / 2], type: Grammar.Word_type.Alphanumeric };
    }

    const position_with_placeholders = mappings.value_map.get(label);
    if (position_with_placeholders === undefined) {
        return { value: terminal, type: Scanner.get_word_type(terminal) };
    }

    const position = replace_placeholders_by_values(position_with_placeholders, production_rules, declarations, stack, mappings);
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

function get_array_elements(node: Node, array_name: string, element_name: string, separator_name: string, production_rules: Grammar.Production_rule[], production_rule_to_value_map: Production_rule_info[], key_to_production_rule_indices: Map<string, number[]>): any[] {

    const has_separator = separator_name.length > 0;

    const array_node = node.children.find(child => child.word.value === array_name);
    if (array_node === undefined) {
        const message = `Could not find array node: ${array_node} in ${node.word.value}`;
        onThrowError(message);
        throw Error(message);
    }

    const child_nodes = has_separator ? array_node.children.filter(child => child.word.value !== separator_name) : array_node.children;

    const elements = child_nodes.map(child => map_node_to_value(child, production_rules, production_rule_to_value_map, key_to_production_rule_indices));

    return elements;
}

function set_nested_property(object: any, keys: string[], value: any): void {

    let current_object = object;
    for (let index = 0; index < keys.length - 1; ++index) {
        const key = keys[index];
        current_object = current_object[key];
    }

    current_object[keys[keys.length - 1]] = value;
}

function map_node_to_value(node: Node, production_rules: Grammar.Production_rule[], production_rule_to_value_map: Production_rule_info[], key_to_production_rule_indices: Map<string, number[]>): any {

    if (node.production_rule_index === undefined) {
        return node.word.value;
    }

    switch (node.word.value) {
        case "Alias_name":
        case "Function_name":
        case "Function_parameter_name":
        case "Module_name":
        case "Struct_name":
            return get_terminal_value(node);
        case "Alias":
            return node_to_alias_type_declaration(node, key_to_production_rule_indices);
        case "Alias_type":
            return Type_utilities.parse_type_name(get_terminal_value(node));
        case "Enum":
            return node_to_enum_declaration(node, key_to_production_rule_indices);
        case "Function_parameter_type":
            return Type_utilities.parse_type_name(get_terminal_value(node));
        case "Function_declaration":
            return node_to_function_declaration(node, key_to_production_rule_indices);
        case "Function_definition":
            // TODO get function name
            return node_to_function_definition(node, "", key_to_production_rule_indices);
        case "Struct":
            return node_to_struct_declaration(node, key_to_production_rule_indices);
    }

    const info = production_rule_to_value_map[node.production_rule_index];

    if (info.type === Production_rule_info_type.Value) {
        return info.value;
    }
    else if (info.type === Production_rule_info_type.Child_pointer) {
        const index = info.value as number;
        const child = node.children[index];
        const value = map_node_to_value(child, production_rules, production_rule_to_value_map, key_to_production_rule_indices);
        return value;
    }
    else if (info.type === Production_rule_info_type.Array) {
        const array_info = info.value as Array_info;
        const value = get_array_elements(node, array_info.array_name, array_info.element_type, array_info.separator_type, production_rules, production_rule_to_value_map, key_to_production_rule_indices);
        return value;
    }
    else if (info.type === Production_rule_info_type.Object) {

        const object_info = info.value as Object_info;

        const arrays: any[][] = [];

        for (const array_info of object_info.arrays) {
            const array = get_array_elements(node, array_info.array_name, array_info.element_type, array_info.separator_type, production_rules, production_rule_to_value_map, key_to_production_rule_indices);
            arrays.push(array);
        }

        const object: any = {};

        {
            for (const property of object_info.properties) {
                let current_object = object;
                for (const key of property.keys) {
                    current_object[key] = {};
                    current_object = current_object[key];
                }
            }
        }

        for (const property of object_info.properties) {

            if (property.type === Object_entry_type.Array_view) {
                const array_view = property.value as Array_view;
                const array = arrays[array_view.array_index];

                const destination_array = [];
                for (const element of array) {
                    const value = element[array_view.element_key];
                    destination_array.push(value);
                }

                const vector = {
                    size: destination_array.length,
                    elements: destination_array
                };
                set_nested_property(object, property.keys, vector);
            }
            else if (property.type === Object_entry_type.Child_index) {
                const child_index = property.value as number;
                const child = node.children[child_index];
                const value = map_node_to_value(child, production_rules, production_rule_to_value_map, key_to_production_rule_indices);
                set_nested_property(object, property.keys, value);
            }
            else if (property.type === Object_entry_type.Value) {
                set_nested_property(object, property.keys, property.value);
            }
        }
        return object;
    }
    else if (info.type === Production_rule_info_type.Empty) {
        return undefined;
    }
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
        case "Module_body":
        case "Declaration":
        case "Alias":
        case "Enum":
        case "Function":
        case "Function_definition":
        case "Function_declaration":
        case "Struct":
            return true;
        default:
            return false;
    }
}

function create_add_change(
    add_change: Parser.Add_change,
    parent_node: Parser_node.Node,
    production_rules: Grammar.Production_rule[],
    production_rule_to_value_map: Production_rule_info[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {

    if (parent_node.word.value === "Module_body") {

        // We are going to add alias, enums, functions and structs:
        for (const new_node of add_change.new_nodes) {
            const declaration_type = new_node.children[0].word.value;

            const underlying_declaration_node = declaration_type === "Function" ? new_node.children[0].children[0] : new_node.children[0];
            const is_export = is_export_node(underlying_declaration_node, key_to_production_rule_indices);

            const declarations_member_name = is_export ? "export_declarations" : "internal_declarations";

            const declaration = map_node_to_value(underlying_declaration_node, production_rules, production_rule_to_value_map, key_to_production_rule_indices);

            if (declaration_type === "Alias") {
                const change = Module_change.create_add_element_to_vector("alias_type_declarations", 0, declaration);
                return [{ position: [declarations_member_name], change: change }];
            }
            else if (declaration_type === "Enum") {
                const change = Module_change.create_add_element_to_vector("enum_declarations", 0, declaration);
                return [{ position: [declarations_member_name], change: change }];
            }
            else if (declaration_type === "Struct") {
                const change = Module_change.create_add_element_to_vector("struct_declarations", 0, declaration);
                return [{ position: [declarations_member_name], change: change }];
            }
            else if (declaration_type === "Function") {

                const new_changes: { position: any[], change: Module_change.Change }[] = [];

                {
                    // TODO change index
                    const change = Module_change.create_add_element_to_vector("function_declarations", 0, declaration);
                    new_changes.push({ position: [declarations_member_name], change: change });
                }

                {
                    const function_definition_node = find_node(new_node.children[0], "Function_definition", key_to_production_rule_indices) as Parser_node.Node;
                    const function_definition = node_to_function_definition(function_definition_node, declaration.name, key_to_production_rule_indices);

                    // TODO change index
                    const change = Module_change.create_add_element_to_vector("function_definitions", 0, function_definition);
                    new_changes.push({ position: ["definitions"], change: change });
                }

                return new_changes;
            }
        }
    }

    const message = `Parse_tree_convertor.add_change() not implemented for '${parent_node.word.value}'`;
    onThrowError(message);
    throw message;
}

function create_remove_change(
    remove_change: Parser.Remove_change,
    module: Core.Module,
    parent_node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {

    if (parent_node.word.value === "Module_body") {

        const new_changes: { position: any[], change: Module_change.Change }[] = [];

        for (let index = 0; index < remove_change.count; ++index) {
            const removed_node_index = remove_change.index + index;
            const removed_node = parent_node.children[removed_node_index];

            const declaration_type = removed_node.children[0].word.value;

            const underlying_declaration_node = declaration_type === "Function" ? removed_node.children[0].children[0] : removed_node.children[0];

            if (declaration_type === "Alias") {
                const alias_name = find_node_value(underlying_declaration_node, "Alias_name", key_to_production_rule_indices);

                const alias = Core_helpers.find_alias_declaration_position(module, alias_name) as { position: any[], value: Core.Alias_type_declaration };

                const element_index = alias.position[alias.position.length - 1];
                const change = Module_change.create_remove_element_of_vector(alias.position[1], element_index);
                new_changes.push({ position: [alias.position[0]], change: change });
            }
            else if (declaration_type === "Enum") {
                const enum_name = find_node_value(underlying_declaration_node, "Enum_name", key_to_production_rule_indices);

                const enum_declaration = Core_helpers.find_enum_declaration_position(module, enum_name) as { position: any[], value: Core.Enum_declaration };

                const element_index = enum_declaration.position[enum_declaration.position.length - 1];
                const change = Module_change.create_remove_element_of_vector(enum_declaration.position[1], element_index);
                new_changes.push({ position: [enum_declaration.position[0]], change: change });
            }
            if (declaration_type === "Function") {
                const function_name = find_node_value(underlying_declaration_node, "Function_name", key_to_production_rule_indices);

                {
                    const position_to_remove = Core_helpers.find_function_declaration_position(module, function_name) as any[];

                    const declaration_index = position_to_remove[position_to_remove.length - 1];
                    const declarations_member_name = position_to_remove[0];

                    const change = Module_change.create_remove_element_of_vector("function_declarations", declaration_index);
                    new_changes.push({ position: [declarations_member_name], change: change });
                }

                {
                    const definition_index = module.definitions.function_definitions.elements.findIndex(value => value.name === function_name);

                    const change = Module_change.create_remove_element_of_vector("function_definitions", definition_index);
                    new_changes.push({ position: ["definitions"], change: change });
                }
            }
            else if (declaration_type === "Struct") {
                const struct_name = find_node_value(underlying_declaration_node, "Struct_name", key_to_production_rule_indices);

                const struct = Core_helpers.find_struct_declaration_position(module, struct_name) as { position: any[], value: Core.Struct_declaration };

                const element_index = struct.position[struct.position.length - 1];
                const change = Module_change.create_remove_element_of_vector(struct.position[1], element_index);
                new_changes.push({ position: [struct.position[0]], change: change });
            }
        }

        return new_changes;
    }

    const message = `Parse_tree_convertor.add_change() not implemented for '${parent_node.word.value}'`;
    onThrowError(message);
    throw message;
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

function create_module_set_element_of_vector_change(value: any, element_position: any[]): { position: any[], change: Module_change.Change } {
    const position = element_position.slice(0, element_position.length - 3);
    const vector_name = element_position[element_position.length - 3] as string;
    const index = element_position[element_position.length - 1] as number;
    return {
        position: position,
        change: Module_change.create_set_element_of_vector(vector_name, index, value)
    };
}

function create_module_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    position: number[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {

    const changes: { position: any[], change: Module_change.Change }[] = [];

    {
        const head_node = find_node(node, "Module_head", key_to_production_rule_indices) as Parser_node.Node;
        changes.push(...create_module_head_modify_change(module, root, head_node, key_to_production_rule_indices));
    }

    {
        const body_node_index = find_node_child_index(node, "Module_body", key_to_production_rule_indices);
        const body_node = node.children[body_node_index];
        const body_node_position = [...position, body_node_index];
        changes.push(...create_module_body_modify_change(module, root, body_node, body_node_position, key_to_production_rule_indices));
    }

    return changes;
}

function create_module_head_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {

    const changes: { position: any[], change: Module_change.Change }[] = [];

    const module_declaration_node = find_node(node, "Module_declaration", key_to_production_rule_indices) as Parser_node.Node;
    changes.push(...create_module_declaration_modify_change(module, module_declaration_node, key_to_production_rule_indices));

    const module_imports_node = find_node(node, "Imports", key_to_production_rule_indices) as Parser_node.Node;
    changes.push(...create_module_imports_modify_change(module, root, module_imports_node, key_to_production_rule_indices));

    return changes;
}

function create_module_declaration_modify_change(
    module: Core.Module,
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {
    const new_name = find_node_value(node, "Module_name", key_to_production_rule_indices);
    if (new_name === module.name) {
        return [];
    }

    return [
        {
            position: [],
            change: Module_change.create_update("name", new_name)
        }
    ];
}

function create_module_imports_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {
    const changes: { position: any[], change: Module_change.Change }[] = [];

    const find_import_name = (node: Parser_node.Node) => find_node_value(node, "Import_name", key_to_production_rule_indices);

    const old_module_head = find_node(root, "Module_head", key_to_production_rule_indices) as Parser_node.Node;
    const old_import_nodes = find_nodes_inside_parent(old_module_head, "Imports", "Import", key_to_production_rule_indices);
    const new_import_nodes = find_nodes(node, "Import", key_to_production_rule_indices);

    const old_import_names = old_import_nodes.map(node => find_import_name(node));
    const new_import_names = new_import_nodes.map(node => find_import_name(node));

    const pending_modify_nodes: { old: number, new: number }[] = [];
    const pending_add_nodes: number[] = [];
    const pending_remove_nodes: number[] = [];

    for (let new_index = 0; new_index < new_import_nodes.length; ++new_index) {
        const new_name = new_import_names[new_index];
        const old_index = old_import_names.findIndex(value => value === new_name);
        if (old_index !== -1) {
            const old_import_node = old_import_nodes[old_index];
            const new_import_node = new_import_nodes[new_index];
            if (!Parser_node.are_equal(old_import_node, new_import_node)) {
                pending_modify_nodes.push({ old: old_index, new: new_index });
            }
        }
        else {
            pending_add_nodes.push(new_index);
        }
    }

    for (let old_index = 0; old_index < old_import_names.length; ++old_index) {
        const old_name = old_import_names[old_index];
        const new_index = new_import_names.findIndex(value => value === old_name);
        if (new_index === -1) {
            pending_remove_nodes.push(old_index);
        }
    }

    for (const modify_change of pending_modify_nodes) {
        const new_node = new_import_nodes[modify_change.new];
        const import_module = node_to_import_module_with_alias(new_node, key_to_production_rule_indices);

        const import_name = new_import_names[modify_change.new];
        const index = module.dependencies.alias_imports.elements.findIndex(value => value.module_name === import_name);

        changes.push(
            create_module_set_element_of_vector_change(import_module, ["dependencies", "alias_imports", "elements", index])
        );
    }

    for (const old_index of pending_remove_nodes) {
        const import_name = old_import_names[old_index];
        const index = module.dependencies.alias_imports.elements.findIndex(value => value.module_name === import_name);

        changes.push(
            {
                position: ["dependencies"],
                change: Module_change.create_remove_element_of_vector("alias_imports", index)
            }
        );
    }

    for (const new_index of pending_add_nodes) {
        const node_to_add = new_import_nodes[new_index];
        const import_module = node_to_import_module_with_alias(node_to_add, key_to_production_rule_indices);

        changes.push(
            {
                position: ["dependencies"],
                change: Module_change.create_add_element_to_vector("alias_imports", -1, import_module)
            }
        );
    }

    return changes;
}

function create_module_body_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    position: number[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {
    const changes: { position: any[], change: Module_change.Change }[] = [];

    const old_declaration_nodes = find_nodes_inside_parent(root, "Module_body", "Declaration", key_to_production_rule_indices);
    const new_declaration_nodes = find_nodes(node, "Declaration", key_to_production_rule_indices);

    const old_declaration_names = old_declaration_nodes.map(node => find_declaration_name(node, key_to_production_rule_indices));
    const new_declaration_names = new_declaration_nodes.map(node => find_declaration_name(node, key_to_production_rule_indices));

    const pending_modify_nodes: { old: number, new: number }[] = [];
    const pending_add_nodes: number[] = [];
    const pending_remove_nodes: number[] = [];

    for (let new_index = 0; new_index < new_declaration_nodes.length; ++new_index) {
        const new_name = new_declaration_names[new_index];
        const old_index = old_declaration_names.findIndex(value => value === new_name);
        if (old_index !== -1) {
            const old_declaration_node = old_declaration_nodes[old_index];
            const new_declaration_node = new_declaration_nodes[new_index];
            if (!Parser_node.are_equal(old_declaration_node, new_declaration_node)) {
                const old_type = old_declaration_node.children[0].word.value;
                const new_type = new_declaration_node.children[0].word.value;
                const old_export = find_node_value(old_declaration_node, "Export", key_to_production_rule_indices);
                const new_export = find_node_value(old_declaration_node, "Export", key_to_production_rule_indices);
                if (old_type === new_type && old_export && new_export) {
                    pending_modify_nodes.push({ old: old_index, new: new_index });
                }
                else {
                    pending_remove_nodes.push(old_index);
                    pending_add_nodes.push(new_index);
                }
            }
        }
        else {
            pending_add_nodes.push(new_index);
        }
    }

    for (let old_index = 0; old_index < old_declaration_names.length; ++old_index) {
        const old_name = old_declaration_names[old_index];
        const new_index = new_declaration_names.findIndex(value => value === old_name);
        if (new_index === -1) {
            pending_remove_nodes.push(old_index);
        }
    }

    for (const node_to_modify of pending_modify_nodes) {
        const change = create_declaration_modify_change(
            module,
            root,
            new_declaration_nodes[node_to_modify.new],
            [...position, node_to_modify.new],
            key_to_production_rule_indices
        );

        changes.push(...change);
    }

    for (const old_index of pending_remove_nodes) {
        const node_to_remove = old_declaration_nodes[old_index];
        const core_position = find_declaration_position_in_module(module, node_to_remove, key_to_production_rule_indices);
        const position = decompose_vector_position(core_position);

        changes.push(
            {
                position: position.vector_position,
                change: Module_change.create_remove_element_of_vector(position.vector_name, position.index)
            }
        );
    }

    for (const new_index of pending_add_nodes) {
        const node_to_add = new_declaration_nodes[new_index];
        const declaration = node_to_declaration(node_to_add, key_to_production_rule_indices);
        const core_position = create_declaration_vector_position_at_end(module, node_to_add, key_to_production_rule_indices);
        const position = decompose_vector_position(core_position);

        changes.push(
            {
                position: position.vector_position,
                change: Module_change.create_add_element_to_vector(position.vector_name, -1, declaration)
            }
        );
    }

    return changes;
}

function declaration_type_to_vector_name(type: string): string {
    switch (type) {
        case "Alias":
            return "alias_type_declarations";
        case "Enum":
            return "enum_declarations";
        case "Function":
            return "function_declarations";
        case "Struct":
            return "struct_declarations";
        default: {
            const message = "Parse_tree_convertor.declaration_type_to_vector_name() case not handled!";
            onThrowError(message);
            throw Error(message);
        }
    }
}

function find_declaration_name(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): string {
    const type = node.children[0].word.value;
    switch (type) {
        case "Alias":
            return find_node_value(node.children[0], "Alias_name", key_to_production_rule_indices);
        case "Enum":
            return find_node_value(node.children[0], "Enum_name", key_to_production_rule_indices);
        case "Function":
            return find_node_value(node.children[0], "Function_name", key_to_production_rule_indices);
        case "Struct":
            return find_node_value(node.children[0], "Struct_name", key_to_production_rule_indices);
        default: {
            const message = "Parse_tree_convertor.find_declaration_name() case not handled!";
            onThrowError(message);
            throw Error(message);
        }
    }
}

function find_declaration_position_in_module(
    module: Core.Module,
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): any[] {
    const declaration_name = find_declaration_name(node, key_to_production_rule_indices);

    const type = node.children[0].word.value;
    const vector_name = declaration_type_to_vector_name(type);

    const export_value = find_node_value(node, "Export", key_to_production_rule_indices);
    const first_name = export_value.length === 0 ? "internal_declarations" : "export_declarations";

    const elements_position = [first_name, vector_name, "elements"];
    const elements = Object_reference.get_object_reference_at_position(module, elements_position);
    const index = (elements.value as any[]).findIndex(value => value.name === declaration_name);

    return [...elements_position, index];
}

function create_declaration_vector_position_at_end(
    module: Core.Module,
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): any[] {
    const type = node.children[0].word.value;
    const vector_name = declaration_type_to_vector_name(type);

    const export_value = find_node_value(node, "Export", key_to_production_rule_indices);
    const first_name = export_value.length === 0 ? "internal_declarations" : "export_declarations";

    const elements_position = [first_name, vector_name, "elements"];
    const elements = Object_reference.get_object_reference_at_position(module, elements_position);
    const elements_length = elements.value.length;

    return [...elements_position, elements_length];
}

function decompose_vector_position(position: any[]): { vector_position: any[], vector_name: string, index: number } {
    const vector_position = position.slice(0, position.length - 3);
    const vector_name = position[position.length - 3];
    const index = position[position.length - 1];
    return {
        vector_position: vector_position,
        vector_name: vector_name,
        index: index
    };
}

function node_to_declaration(
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): Core.Alias_type_declaration | Core.Enum_declaration | Core.Struct_declaration | { declaration: Core.Function_declaration, definition: Core.Function_definition } {

    const child = node.children[0];
    switch (child.word.value) {
        case "Alias": {
            return node_to_alias_type_declaration(child, key_to_production_rule_indices);
        }
        case "Enum": {
            return node_to_enum_declaration(child, key_to_production_rule_indices);
        }
        case "Function": {
            const declaration_node_index = find_node_child_index(child, "Function_declaration", key_to_production_rule_indices);
            const definition_node_index = find_node_child_index(child, "Function_definition", key_to_production_rule_indices);
            const declaration = node_to_function_declaration(child.children[declaration_node_index], key_to_production_rule_indices);
            const definition = node_to_function_definition(child.children[definition_node_index], declaration.name, key_to_production_rule_indices);
            return {
                declaration: declaration,
                definition: definition
            };
        }
        case "Struct": {
            return node_to_struct_declaration(child, key_to_production_rule_indices);
        }
        default: {
            const message = "Parse_tree_convertor.node_to_declaration(): failed to handle node";
            onThrowError(message);
            throw message;
        }
    }
}

function create_declaration_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    position: number[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {
    const child_node = node.children[0];
    const child_position = [...position, 0];
    const type = child_node.word.value;
    switch (type) {
        case "Alias":
            return [create_alias_modify_change(module, root, child_node, child_position, key_to_production_rule_indices)];
        case "Enum":
            return [create_enum_modify_change(module, root, child_node, child_position, key_to_production_rule_indices)];
        case "Function":
            return create_function_modify_change(module, root, child_node, child_position, key_to_production_rule_indices);
        case "Struct":
            return [create_struct_modify_change(module, root, child_node, child_position, key_to_production_rule_indices)];
        default: {
            const message = `Parse_tree_convertor.create_declaration_modify_change() not implemented for '${type}'`;
            onThrowError(message);
            throw Error(message);
        }
    }
}

function create_alias_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    position: number[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change } {
    const alias_declaration = node_to_alias_type_declaration(node, key_to_production_rule_indices);
    const old_node = Parser_node.get_node_at_position(root, position);
    const old_name = find_node_value(old_node, "Alias_name", key_to_production_rule_indices);
    const old_declaration = Core_helpers.find_alias_declaration_position(module, old_name) as { position: any[], value: Core.Alias_type_declaration };
    return create_module_set_element_of_vector_change(alias_declaration, old_declaration.position);
}

function create_enum_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    position: number[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change } {
    const enum_declaration = node_to_enum_declaration(node, key_to_production_rule_indices);
    const old_node = Parser_node.get_node_at_position(root, position);
    const old_name = find_node_value(old_node, "Enum_name", key_to_production_rule_indices);
    const old_declaration = Core_helpers.find_enum_declaration_position(module, old_name) as { position: any[], value: Core.Enum_declaration };
    return create_module_set_element_of_vector_change(enum_declaration, old_declaration.position);
}

function get_function_name_from_node(
    root: Parser_node.Node,
    position: number[],
    key_to_production_rule_indices: Map<string, number[]>
): string {
    const old_node = Parser_node.get_node_at_position(root, position);
    const old_name = find_node_value(old_node, "Function_name", key_to_production_rule_indices);
    return old_name;
}

function create_function_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    position: number[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {
    const declaration_node_index = find_node_child_index(node, "Function_declaration", key_to_production_rule_indices);
    const declaration_node = node.children[declaration_node_index];

    const definition_node_index = find_node_child_index(node, "Function_definition", key_to_production_rule_indices);
    const definition_node = node.children[definition_node_index];

    const old_function_name = get_function_name_from_node(root, position, key_to_production_rule_indices);

    const declaration_change = create_function_declaration_modify_change(module, declaration_node, old_function_name, key_to_production_rule_indices);
    const new_function_name =
        declaration_change.length > 0 ?
            ((declaration_change[0].change.value as Module_change.Set_element_of_vector).value as Core.Function_declaration).name :
            old_function_name;

    const definition_change = create_function_definition_modify_change(module, definition_node, old_function_name, new_function_name, key_to_production_rule_indices);

    return [
        ...declaration_change,
        ...definition_change
    ];
}

function create_function_declaration_modify_change(
    module: Core.Module,
    node: Parser_node.Node,
    old_function_name: string,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {
    const function_declaration = node_to_function_declaration(node, key_to_production_rule_indices);
    const old_declaration = Core_helpers.find_function_declaration_position_2(module, old_function_name) as { position: any[], value: Core.Function_declaration };
    if (deep_equal(function_declaration, old_declaration.value)) {
        return [];
    }
    return [create_module_set_element_of_vector_change(function_declaration, old_declaration.position)];
}

function create_function_definition_modify_change(
    module: Core.Module,
    node: Parser_node.Node,
    old_function_name: string,
    new_function_name: string,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {
    const function_definition = node_to_function_definition(node, new_function_name, key_to_production_rule_indices);
    const old_definition = Core_helpers.find_function_definition_position_2(module, old_function_name) as { position: any[], value: Core.Function_definition };
    if (deep_equal(function_definition, old_definition.value)) {
        return [];
    }
    return [create_module_set_element_of_vector_change(function_definition, old_definition.position)];
}

function create_struct_modify_change(
    module: Core.Module,
    root: Parser_node.Node,
    node: Parser_node.Node,
    position: number[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change } {
    const struct_declaration = node_to_struct_declaration(node, key_to_production_rule_indices);
    const old_node = Parser_node.get_node_at_position(root, position);
    const old_name = find_node_value(old_node, "Struct_name", key_to_production_rule_indices);
    const old_declaration = Core_helpers.find_struct_declaration_position(module, old_name) as { position: any[], value: Core.Struct_declaration };
    return create_module_set_element_of_vector_change(struct_declaration, old_declaration.position);
}

function create_modify_change(
    any_change: Parser.Change,
    root: Parser_node.Node,
    node: Parser_node.Node,
    node_position: number[],
    module: Core.Module,
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {

    const key_ancestor = get_key_ancestor(root, node, node_position);

    const key_node_clone = JSON.parse(JSON.stringify(key_ancestor.node)) as Parser_node.Node;
    const new_node = apply_parse_tree_change(key_node_clone, key_ancestor.position, any_change);

    switch (new_node.word.value) {
        case "Module": {
            return create_module_modify_change(module, root, new_node, key_ancestor.position, key_to_production_rule_indices);
        }
        case "Module_head": {
            return create_module_head_modify_change(module, root, new_node, key_to_production_rule_indices);
        }
        case "Module_declaration": {
            return create_module_declaration_modify_change(module, new_node, key_to_production_rule_indices);
        }
        case "Module_body": {
            return create_module_body_modify_change(module, root, new_node, key_ancestor.position, key_to_production_rule_indices);
        }
        case "Declaration": {
            return create_declaration_modify_change(module, root, new_node, key_ancestor.position, key_to_production_rule_indices);
        }
        case "Alias": {
            return [create_alias_modify_change(module, root, new_node, key_ancestor.position, key_to_production_rule_indices)];
        }
        case "Enum": {
            return [create_enum_modify_change(module, root, new_node, key_ancestor.position, key_to_production_rule_indices)];
        }
        case "Function": {
            return create_function_modify_change(module, root, new_node, key_ancestor.position, key_to_production_rule_indices);
        }
        case "Function_declaration": {
            const function_node = find_parent(root, key_ancestor.position, "Function", key_to_production_rule_indices) as { node: Parser_node.Node, position: number[] };
            const function_name = get_function_name_from_node(root, function_node.position, key_to_production_rule_indices);
            return create_function_declaration_modify_change(module, new_node, function_name, key_to_production_rule_indices);
        }
        case "Function_definition": {
            const function_node = find_parent(root, key_ancestor.position, "Function", key_to_production_rule_indices) as { node: Parser_node.Node, position: number[] };
            const function_name = get_function_name_from_node(root, function_node.position, key_to_production_rule_indices);
            return create_function_definition_modify_change(module, new_node, function_name, function_name, key_to_production_rule_indices);
        }
        case "Struct": {
            return [create_struct_modify_change(module, root, new_node, key_ancestor.position, key_to_production_rule_indices)];
        }
        default: {
            const message = `Parse_tree_convertor.create_modify_change() not implemented for '${new_node.word.value}'`;
            onThrowError(message);
            throw message;
        }
    }
}

export function create_module_changes(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_to_value_map: Production_rule_info[],
    production_rule_to_change_action_map: Change_action[],
    parse_tree: Node,
    parse_tree_changes: Parser.Change[],
    key_to_production_rule_indices: Map<string, number[]>
): { position: any[], change: Module_change.Change }[] {

    const changes: { position: any[], change: Module_change.Change }[] = [];

    for (const parse_tree_change of parse_tree_changes) {

        const parent_position = get_change_parent_position(parse_tree_change);
        const parent_node = get_node_at_position(parse_tree, parent_position);
        const is_key = is_key_node(parent_node);

        if (is_key && parse_tree_change.type === Parser.Change_type.Add) {
            const add_change = parse_tree_change.value as Parser.Add_change;
            const new_changes = create_add_change(add_change, parent_node, production_rules, production_rule_to_value_map, key_to_production_rule_indices);
            changes.push(...new_changes);
        }
        else if (is_key && parse_tree_change.type === Parser.Change_type.Remove) {
            const remove_change = parse_tree_change.value as Parser.Remove_change;
            const new_changes = create_remove_change(remove_change, module, parent_node, key_to_production_rule_indices);
            changes.push(...new_changes);
        }
        else {
            const new_changes = create_modify_change(parse_tree_change, parse_tree, parent_node, parent_position, module, key_to_production_rule_indices);
            changes.push(...new_changes);
        }
    }

    return changes;
}

function find_parent(root: Parser_node.Node, node_position: number[], key: string, key_to_production_rule_indices: Map<string, number[]>): { node: Parser_node.Node, position: number[] } | undefined {
    const indices = key_to_production_rule_indices.get(key);
    if (indices === undefined) {
        return undefined;
    }

    if (node_position.length === 0) {
        return undefined;
    }

    let current_node_position = Parser_node.get_parent_position(node_position);
    let current_node = Parser_node.get_node_at_position(root, current_node_position);

    while (current_node_position.length > 0 && current_node.word.value !== key) {
        current_node_position = Parser_node.get_parent_position(current_node_position);
        current_node = Parser_node.get_node_at_position(root, current_node_position);
    }

    return {
        node: current_node,
        position: current_node_position
    };
}

function find_parent_with_new_node(
    root: Parser_node.Node,
    new_node: Parser_node.Node,
    new_node_position: number[],
    node_position: number[],
    key: string,
    key_to_production_rule_indices: Map<string, number[]>
): { node: Parser_node.Node, position: number[] } | undefined {
    const indices = key_to_production_rule_indices.get(key);
    if (indices === undefined) {
        return undefined;
    }

    if (node_position.length === 0) {
        return undefined;
    }

    let current_node_position = node_position.slice(new_node_position.length, node_position.length);
    let current_node = Parser_node.get_node_at_position(new_node, current_node_position);

    while (current_node_position.length > 0 && current_node.word.value !== key) {
        current_node_position = Parser_node.get_parent_position(current_node_position);
        current_node = Parser_node.get_node_at_position(new_node, current_node_position);
    }

    if (current_node.word.value === key) {
        current_node_position = [...new_node_position, ...current_node_position];
        return {
            node: current_node,
            position: current_node_position
        };
    }

    current_node_position = node_position;

    while (current_node_position.length > 0 && current_node.word.value !== key) {
        current_node_position = Parser_node.get_parent_position(current_node_position);
        current_node = Parser_node.get_node_at_position(root, current_node_position);
    }

    return {
        node: current_node,
        position: current_node_position
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

function get_terminal_value(node: Node): string {
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
    production_rule_to_value_map: Production_rule_info[],
    key_to_production_rule_indices: Map<string, number[]>
): Core.Module {

    const language_version: Core.Language_version = {
        major: 0,
        minor: 1,
        patch: 0
    };

    const name = find_node_value(root, "Module_name", key_to_production_rule_indices);

    const imports_node = find_node(root, "Imports", key_to_production_rule_indices) as Parser_node.Node;
    const alias_imports = imports_node.children.map(child => node_to_import_module_with_alias(child, key_to_production_rule_indices));
    const dependencies: Core.Module_dependencies = {
        alias_imports: {
            size: alias_imports.length,
            elements: alias_imports
        }
    };

    const all_declaration_nodes = find_nodes_inside_parent(root, "Module_body", "Declaration", key_to_production_rule_indices);

    const function_nodes = all_declaration_nodes.filter(declaration => declaration.children[0].word.value === "Function");
    const function_declarations = function_nodes.map(node => {
        const function_declaration_node = node.children[0].children.find(child => child.word.value === "Function_declaration");
        if (function_declaration_node === undefined) {
            return undefined;
        }
        return node_to_function_declaration(function_declaration_node, key_to_production_rule_indices) as Core.Function_declaration;
    });
    const external_function_declarations = function_declarations.filter(declaration => declaration !== undefined && declaration.linkage === Core.Linkage.External) as Core.Function_declaration[];
    const internal_function_declarations = function_declarations.filter(declaration => declaration !== undefined && declaration.linkage !== Core.Linkage.External) as Core.Function_declaration[];
    const function_definitions = function_nodes.map((node, index) => {
        const function_definition_node = node.children[0].children.find(child => child.word.value === "Function_definition");
        if (function_definition_node === undefined) {
            return undefined;
        }
        const function_declaration = function_declarations[index];
        if (function_declaration === undefined) {
            return undefined;
        }
        return node_to_function_definition(function_definition_node, function_declaration.name, key_to_production_rule_indices);
    }).filter(definition => definition !== undefined) as Core.Function_definition[];

    const alias_type_nodes = all_declaration_nodes.filter(declaration => declaration.children[0].word.value === "Alias");
    const alias_type_declarations = alias_type_nodes.map(node => node_to_alias_type_declaration(node, key_to_production_rule_indices));
    const external_alias_type_declarations = alias_type_declarations.filter((declaration, index) => is_export_node(alias_type_nodes[index], key_to_production_rule_indices));
    const internal_alias_type_declarations = alias_type_declarations.filter((declaration, index) => !is_export_node(alias_type_nodes[index], key_to_production_rule_indices));

    const enum_nodes = all_declaration_nodes.filter(declaration => declaration.children[0].word.value === "Enum");
    const enum_declarations = enum_nodes.map(node => node_to_enum_declaration(node, key_to_production_rule_indices));
    const external_enum_declarations = enum_declarations.filter((declaration, index) => is_export_node(enum_nodes[index], key_to_production_rule_indices));
    const internal_enum_declarations = enum_declarations.filter((declaration, index) => !is_export_node(enum_nodes[index], key_to_production_rule_indices));

    const struct_nodes = all_declaration_nodes.filter(declaration => declaration.children[0].word.value === "Struct");
    const struct_declarations = struct_nodes.map(node => node_to_struct_declaration(node, key_to_production_rule_indices));
    const external_struct_declarations = struct_declarations.filter((declaration, index) => is_export_node(struct_nodes[index], key_to_production_rule_indices));
    const internal_struct_declarations = struct_declarations.filter((declaration, index) => !is_export_node(struct_nodes[index], key_to_production_rule_indices));

    const export_declarations: Core.Module_declarations = {
        alias_type_declarations: {
            size: external_alias_type_declarations.length,
            elements: external_alias_type_declarations
        },
        enum_declarations: {
            size: external_enum_declarations.length,
            elements: external_enum_declarations
        },
        struct_declarations: {
            size: external_struct_declarations.length,
            elements: external_struct_declarations
        },
        function_declarations: {
            size: external_function_declarations.length,
            elements: external_function_declarations
        },
    };

    const internal_declarations: Core.Module_declarations = {
        alias_type_declarations: {
            size: internal_alias_type_declarations.length,
            elements: internal_alias_type_declarations
        },
        enum_declarations: {
            size: internal_enum_declarations.length,
            elements: internal_enum_declarations
        },
        struct_declarations: {
            size: internal_struct_declarations.length,
            elements: internal_struct_declarations
        },
        function_declarations: {
            size: internal_function_declarations.length,
            elements: internal_function_declarations
        },
    };

    const definitions: Core.Module_definitions = {
        function_definitions: {
            size: function_definitions.length,
            elements: function_definitions
        },
    };

    return {
        language_version: language_version,
        name: name,
        dependencies: dependencies,
        export_declarations: export_declarations,
        internal_declarations: internal_declarations,
        definitions: definitions
    };
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