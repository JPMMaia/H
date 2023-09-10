import * as Core from "./Core_interface";
import { onThrowError } from "../utilities/errors";
import * as Grammar from "./Grammar";
import * as Module_change from "./Module_change";
import * as Parser from "./Parser";
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

enum State_type {
    Module,
    Module_body,
    Alias,
    Enum,
    Expression,
    Function,
    Function_parameters,
    Statement,
    Struct,
}

interface Alias_state {
    declaration: Core.Alias_type_declaration;
}

interface Enum_state {
    declaration: Core.Enum_declaration;
}

interface Expression_state {
    function_declaration: Core.Function_declaration;
    function_definition: Core.Function_definition;
    statement_index: number;
}

interface Function_state {
    declaration: Core.Function_declaration;
    definition: Core.Function_definition;
}

interface Function_parameters_state {
    declaration: Core.Function_declaration;
    is_input_parameter: boolean;
}

interface Statement_state {
    function_declaration: Core.Function_declaration;
    function_definition: Core.Function_definition;
}

interface Struct_state {
    declaration: Core.Struct_declaration;
}

interface State {
    type: State_type;
    index: number;
    value: Alias_state | Enum_state | Expression_state | Function_state | Function_parameters_state | Statement_state | Struct_state | undefined;
}

interface Module_to_parse_tree_stack_element {
    production_rule_index: number;
    state: State;
    node: Node;
    rhs_length: number;
    current_child_index: number;
    is_array_production_rule: boolean;
}

export function module_to_parse_tree(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[]
): Node {

    const stack: Module_to_parse_tree_stack_element[] = [
        {
            production_rule_index: 0,
            state: {
                type: State_type.Module,
                index: 0,
                value: undefined
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

        const next_production_rule_indices = Grammar.find_production_rules(production_rules, label);

        const is_terminal = next_production_rule_indices.length === 0;

        const parent_node = top.node;

        if (is_terminal) {

            const word = map_terminal_to_word(module, top.state, parent_node.word.value, label);

            const child_node: Node = {
                word: word,
                state: -1,
                production_rule_index: undefined,
                children: []
            };

            parent_node.children.push(child_node);
        }
        else {

            const next_state = get_next_state(module, declarations, current_production_rule, top.state, label, label_index);

            const next_production_rule_index = choose_production_rule_index(module, production_rules, next_production_rule_indices, label, declarations, next_state);
            const next_production_rule = production_rules[next_production_rule_index];

            const is_next_production_rule_array = (next_production_rule.flags & Grammar.Production_rule_flags.Is_array) !== 0;
            const rhs_length = is_next_production_rule_array ? get_production_rule_array_rhs_length(next_production_rule, declarations, next_state) : next_production_rule.rhs.length;

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

function get_production_rule_array_rhs_length(production_rule: Grammar.Production_rule, declarations: Declaration[], state: State): number {

    if (production_rule.lhs === "Module_body") {
        return declarations.length;
    }
    else if (production_rule.lhs === "Function_input_parameters" || production_rule.lhs === "Function_output_parameters") {
        const state_value = state.value as Function_parameters_state;
        const parameter_names = state_value.is_input_parameter ? state_value.declaration.input_parameter_names : state_value.declaration.output_parameter_names;
        const parameter_count = parameter_names.elements.length;
        if (parameter_count === 0) {
            return 0;
        }
        const has_separator = production_rule.rhs.length === 3;
        return has_separator ? parameter_count * 2 - 1 : parameter_count;
    }

    const message = "Not implemented! get_production_rule_array_rhs_length: " + production_rule.lhs;
    onThrowError(message);
    throw Error(message);
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

function get_next_state(module: Core.Module, declarations: Declaration[], production_rule: Grammar.Production_rule, current_state: State, label: string, label_index: number): State {

    if (current_state.type === State_type.Statement) {
        if (label === "Expression_return") {
            const statement_state = current_state.value as Statement_state;

            const new_state: Expression_state = {
                function_declaration: statement_state.function_declaration,
                function_definition: statement_state.function_definition,
                statement_index: current_state.index
            };

            return {
                type: State_type.Expression,
                index: 0,
                value: new_state
            };
        }
    }
    else if (current_state.type === State_type.Expression) {
        const expression_state = current_state.value as Expression_state;
        const function_definition = expression_state.function_definition;
        const statement = function_definition.statements.elements[expression_state.statement_index];
        const expression = statement.expressions.elements[current_state.index];
        if (expression.data.type === Core.Expression_enum.Binary_expression) {
            const binary_expression = expression.data.value as Core.Binary_expression;
            if (label === "Expression_binary") {
                return {
                    type: current_state.type,
                    index: current_state.index,
                    value: current_state.value
                };
            }
            else {
                if (label_index === 0) {
                    return {
                        type: current_state.type,
                        index: binary_expression.left_hand_side.expression_index,
                        value: current_state.value
                    };
                }
                else if (label_index === 1) {
                    return {
                        type: current_state.type,
                        index: current_state.index,
                        value: current_state.value
                    };
                }
                else if (label_index === 2) {
                    return {
                        type: current_state.type,
                        index: binary_expression.right_hand_side.expression_index,
                        value: current_state.value
                    };
                }
            }
        }
        else if (expression.data.type === Core.Expression_enum.Return_expression) {
            const return_expression = expression.data.value as Core.Return_expression;
            return {
                type: current_state.type,
                index: return_expression.expression.expression_index,
                value: current_state.value
            };
        }
        else if (expression.data.type === Core.Expression_enum.Variable_expression) {
            return {
                type: current_state.type,
                index: current_state.index,
                value: current_state.value
            };
        }

        return {
            type: current_state.type,
            index: calculate_array_index(production_rule, label_index),
            value: current_state.value
        };
    }

    if (label === "Module_body") {
        return {
            type: State_type.Module_body,
            index: -1,
            value: undefined
        };
    }
    else if (label === "Declaration") {
        return {
            type: current_state.type,
            index: calculate_array_index(production_rule, label_index),
            value: current_state.value
        };
    }
    else if (label === "Alias") {
        const declaration = declarations[current_state.index];
        const module_declarations = declaration.is_export ? module.export_declarations : module.internal_declarations;
        const alias_declaration = module_declarations.alias_type_declarations.elements[declaration.index];

        const value: Alias_state = {
            declaration: alias_declaration
        };

        return {
            type: State_type.Alias,
            index: current_state.index,
            value: value
        };
    }
    else if (label === "Enum") {
        const declaration = declarations[current_state.index];
        const module_declarations = declaration.is_export ? module.export_declarations : module.internal_declarations;
        const enum_declaration = module_declarations.enum_declarations.elements[declaration.index];

        const value: Enum_state = {
            declaration: enum_declaration
        };

        return {
            type: State_type.Enum,
            index: current_state.index,
            value: value
        };
    }
    else if (label === "Function") {
        const declaration = declarations[current_state.index];
        const module_declarations = declaration.is_export ? module.export_declarations : module.internal_declarations;
        const function_declaration = module_declarations.function_declarations.elements[declaration.index];
        const function_definition_index = module.definitions.function_definitions.elements.findIndex(value => value.name === function_declaration.name);
        const function_definition = module.definitions.function_definitions.elements[function_definition_index];

        const value: Function_state = {
            declaration: function_declaration,
            definition: function_definition
        };

        return {
            type: State_type.Function,
            index: current_state.index,
            value: value
        };
    }
    else if (label === "Function_input_parameters") {
        const function_state = current_state.value as Function_state;

        const new_state: Function_parameters_state = {
            declaration: function_state.declaration,
            is_input_parameter: true
        };

        return {
            type: State_type.Function_parameters,
            index: -1,
            value: new_state
        };
    }
    else if (label === "Function_output_parameters") {
        const function_state = current_state.value as Function_state;

        const new_state: Function_parameters_state = {
            declaration: function_state.declaration,
            is_input_parameter: false
        };

        return {
            type: State_type.Function_parameters,
            index: -1,
            value: new_state
        };
    }
    else if (label === "Function_parameter") {
        return {
            type: current_state.type,
            index: calculate_array_index(production_rule, label_index),
            value: current_state.value
        };
    }
    else if (label === "Statements") {

        const function_state = current_state.value as Function_state;

        const new_state: Statement_state = {
            function_declaration: function_state.declaration,
            function_definition: function_state.definition
        };

        return {
            type: State_type.Statement,
            index: -1,
            value: new_state
        };
    }
    else if (label === "Statement") {
        return {
            type: current_state.type,
            index: calculate_array_index(production_rule, label_index),
            value: current_state.value
        };
    }
    else if (label === "Struct") {
        const declaration = declarations[current_state.index];
        const module_declarations = declaration.is_export ? module.export_declarations : module.internal_declarations;
        const struct_declaration = module_declarations.struct_declarations.elements[declaration.index];

        const value: Struct_state = {
            declaration: struct_declaration
        };

        return {
            type: State_type.Struct,
            index: current_state.index,
            value: value
        };
    }

    return current_state;
}

function contains(array: any[], value: any): boolean {
    const index = array.findIndex(current => current === value);
    return index !== -1;
}

function choose_production_rule_index(module: Core.Module, production_rules: Grammar.Production_rule[], production_rule_indices: number[], label: string, declarations: Declaration[], current_state: State): number {

    if (production_rule_indices.length === 1) {
        return production_rule_indices[0];
    }

    if (current_state.type === State_type.Statement) {

        if (label === "Statements") {
            const state_value = current_state.value as Statement_state;
            const function_definition = state_value.function_definition;

            const index = function_definition.statements.elements.length > 1 ? 2 : function_definition.statements.elements.length;
            return production_rule_indices[index];
        }
        else if (label === "Statement") {
            const state_value = current_state.value as Statement_state;
            const function_definition = state_value.function_definition;
            const statement = function_definition.statements.elements[current_state.index];

            const first_expression = statement.expressions.elements[0];
            const rhs_label = map_expression_type_to_production_rule_label(first_expression.data.type);
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));
            return production_rule_indices[index];
        }
    }
    else if (current_state.type === State_type.Expression) {

        const state_value = current_state.value as Expression_state;
        const function_definition = state_value.function_definition;
        const statement = function_definition.statements.elements[state_value.statement_index];
        const expression = statement.expressions.elements[current_state.index];

        if (label === "Generic_expression") {
            const rhs_label = map_expression_type_to_production_rule_label(expression.data.type);
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));
            return production_rule_indices[index];
        }
        else if (label === "Expression_binary_symbol") {
            if (expression.data.type === Core.Expression_enum.Binary_expression) {
                const binary_expression = expression.data.value as Core.Binary_expression;
                const rhs_label = map_binary_operation_production_rule_label(binary_expression.operation);
                const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));
                return production_rule_indices[index];
            }
        }
    }

    if (label === "Module_body") {
        const index = declarations.length > 1 ? 2 : declarations.length;
        return production_rule_indices[index];
    }
    else if (label === "Declaration") {

        const declaration_index = current_state.index;
        const declaration = declarations[declaration_index];

        const lhs = get_underlying_declaration_production_rule_lhs(declaration.type);

        const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, lhs));
        return production_rule_indices[index];
    }
    else if (label === "Export") {

        const declaration_index = current_state.index;
        const declaration = declarations[declaration_index];

        if (declaration.is_export) {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs.length > 0);
            return production_rule_indices[index];
        }
        else {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs.length === 0);
            return production_rule_indices[index];
        }
    }
    else if (label === "Function_input_parameters") {
        const state_value = current_state.value as Function_parameters_state;
        const function_declaration = state_value.declaration;

        const index = function_declaration.input_parameter_names.elements.length > 1 ? 2 : function_declaration.input_parameter_names.elements.length;
        return production_rule_indices[index];
    }
    else if (label === "Function_output_parameters") {
        const state_value = current_state.value as Function_parameters_state;
        const function_declaration = state_value.declaration;

        const index = function_declaration.input_parameter_names.elements.length > 1 ? 2 : function_declaration.input_parameter_names.elements.length;
        return production_rule_indices[index];
    }
    else if (label === "Expression_binary_symbol") {
        const state_value = current_state.value as Function_parameters_state;
        const function_declaration = state_value.declaration;

        const index = function_declaration.input_parameter_names.elements.length > 1 ? 2 : function_declaration.input_parameter_names.elements.length;
        return production_rule_indices[index];
    }

    // TODO
    return production_rule_indices[0];

    /*const message = "Not implemented! Got: " + label;
    onThrowError(message);
    throw Error(message);*/
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

function find_type_name(type: Core.Type_reference[]): string {
    return "type"; // TODO
}

function map_terminal_to_word(
    module: Core.Module,
    current_state: State,
    parent_label: string,
    terminal: string
): Scanner.Scanned_word {

    if (parent_label === "Module_name") {
        return { value: module.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Alias_name") {
        const state = current_state.value as Alias_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Alias_type") {
        const state = current_state.value as Alias_state;
        const name = find_type_name(state.declaration.type.elements);
        return { value: name !== undefined ? name : "<error>", type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Enum_name") {
        const state = current_state.value as Enum_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Function_name") {
        if (current_state.type === State_type.Function) {
            const state = current_state.value as Function_state;
            return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
        }
    }
    else if (parent_label === "Function_parameter_name") {
        const state = current_state.value as Function_parameters_state;
        const index = current_state.index;
        const parameter_names = state.is_input_parameter ? state.declaration.input_parameter_names : state.declaration.output_parameter_names;
        const name = parameter_names.elements[index];
        return { value: name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Function_parameter_type") {
        const state = current_state.value as Function_parameters_state;
        const index = current_state.index;
        const parameter_types = state.is_input_parameter ? state.declaration.type.input_parameter_types : state.declaration.type.output_parameter_types;
        const type_reference = parameter_types.elements[index];
        const name = Type_utilities.get_type_name([module], type_reference);
        return { value: name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Struct_name") {
        const state = current_state.value as Struct_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Variable_name") {
        if (current_state.type === State_type.Expression) {
            const state = current_state.value as Expression_state;
            const function_definition = state.function_definition;
            const statement = function_definition.statements.elements[state.statement_index];
            const expression = statement.expressions.elements[current_state.index];
            if (expression.data.type === Core.Expression_enum.Variable_expression) {
                const variable_expression = expression.data.value as Core.Variable_expression;
                return { value: variable_expression.name, type: Grammar.Word_type.Alphanumeric };
            }
        }
    }

    return { value: terminal, type: Scanner.get_word_type(terminal) };
}

function get_array_elements(node: Node, array_name: string, element_name: string, separator_name: string, production_rules: Grammar.Production_rule[], production_rule_to_value_map: Production_rule_info[]): any[] {

    const has_separator = separator_name.length > 0;

    const array_node = node.children.find(child => child.word.value === array_name);
    if (array_node === undefined) {
        const message = `Could not find array node: ${array_node} in ${node.word.value}`;
        onThrowError(message);
        throw Error(message);
    }

    const child_nodes = has_separator ? array_node.children.filter(child => child.word.value !== separator_name) : array_node.children;

    const elements = child_nodes.map(child => map_node_to_value(child, production_rules, production_rule_to_value_map));

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

function map_node_to_value(node: Node, production_rules: Grammar.Production_rule[], production_rule_to_value_map: Production_rule_info[]): any {

    if (node.production_rule_index === undefined) {
        return node.word.value;
    }

    const info = production_rule_to_value_map[node.production_rule_index];

    if (info.type === Production_rule_info_type.Value) {
        return info.value;
    }
    else if (info.type === Production_rule_info_type.Child_pointer) {
        const index = info.value as number;
        const child = node.children[index];
        const value = map_node_to_value(child, production_rules, production_rule_to_value_map);
        return value;
    }
    else if (info.type === Production_rule_info_type.Array) {
        const array_info = info.value as Array_info;
        const value = get_array_elements(node, array_info.array_name, array_info.element_type, array_info.separator_type, production_rules, production_rule_to_value_map);
        return value;
    }
    else if (info.type === Production_rule_info_type.Object) {

        const object_info = info.value as Object_info;

        const arrays: any[][] = [];

        for (const array_info of object_info.arrays) {
            const array = get_array_elements(node, array_info.array_name, array_info.element_type, array_info.separator_type, production_rules, production_rule_to_value_map);
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
                const value = map_node_to_value(child, production_rules, production_rule_to_value_map);
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

function is_export_declaration(declaration: Node): boolean {

    if (declaration.children.length === 0) {
        return false;
    }

    const child = declaration.children[0];
    const export_node_index = child.children.findIndex(value => value.word.value === "Export");
    if (export_node_index === -1) {
        return false;
    }

    const export_node = child.children[export_node_index];
    return export_node.children.length > 0;
}

export function create_module_changes(
    module: Core.Module,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_to_value_map: Production_rule_info[],
    production_rule_to_change_action_map: Change_action[],
    parse_tree: Node,
    parse_tree_changes: Parser.Change[],
): { position: any[], change: Module_change.Change }[] {

    const changes: { position: any[], change: Module_change.Change }[] = [];

    for (const parse_tree_change of parse_tree_changes) {

        if (parse_tree_change.type === Parser.Change_type.Modify) {
            const modify_change = parse_tree_change.value as Parser.Modify_change;

            const node_stack: Node[] = [];
            node_stack.push(modify_change.new_node);

            while (node_stack.length > 0) {
                const current_node = node_stack.pop() as Node;

                if (current_node.production_rule_index === undefined) {
                    continue;
                }

                const change_info = production_rule_to_change_action_map[current_node.production_rule_index];

                if (change_info.type === Change_action_type.Update) {
                    const update_info = change_info.value as Update_action;

                    const position = update_info.position;
                    const key = update_info.key;
                    const current_value = map_node_to_value(current_node, production_rules, production_rule_to_value_map);

                    const change = Module_change.create_update(key, current_value);
                    changes.push({ position: position, change: change });
                }
                else {
                    for (let index_plus_one = current_node.children.length; index_plus_one > 0; --index_plus_one) {
                        node_stack.push(current_node.children[index_plus_one - 1]);
                    }
                }
            }
        }
        else if (parse_tree_change.type === Parser.Change_type.Add) {
            const add_change = parse_tree_change.value as Parser.Add_change;

            // Figure out the context from parent position and index:
            const parent_node = get_node_at_position(parse_tree, add_change.parent_position);

            if (parent_node.word.value === "Module_body") {

                // We are going to add alias, enums, functions and structs:
                for (const new_node of add_change.new_nodes) {
                    const declaration_type = new_node.children[0].word.value;

                    const is_export = is_export_declaration(new_node);
                    const declarations_member_name = is_export ? "export_declarations" : "internal_declarations";

                    const underlying_declaration_node = new_node.children[0].children[0];
                    const node_value = map_node_to_value(underlying_declaration_node, production_rules, production_rule_to_value_map);

                    if (declaration_type === "Alias") {
                        const change = Module_change.create_add_element_to_vector("alias_type_declarations", 0, node_value);
                        changes.push({ position: [declarations_member_name], change: change });
                    }
                    else if (declaration_type === "Enum") {
                        const change = Module_change.create_add_element_to_vector("enum_declarations", 0, node_value);
                        changes.push({ position: [declarations_member_name], change: change });
                    }
                    else if (declaration_type === "Struct") {
                        const change = Module_change.create_add_element_to_vector("struct_declarations", 0, node_value);
                        changes.push({ position: [declarations_member_name], change: change });
                    }
                    else if (declaration_type === "Function") {

                        // TODO

                        {
                            // TODO change index
                            const change = Module_change.create_add_element_to_vector("function_declarations", 0, node_value);
                            changes.push({ position: [declarations_member_name], change: change });
                        }

                        const function_definition: Core.Function_definition = {
                            name: node_value.name,
                            statements: {
                                size: 0,
                                elements: []
                            }
                        };

                        {
                            // TODO change index
                            const change = Module_change.create_add_element_to_vector("function_definitions", 0, function_definition);
                            changes.push({ position: ["definitions"], change: change });
                        }
                    }
                }
            }
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
    const function_definitions = function_nodes.map(node => {
        const function_definition_node = node.children[0].children.find(child => child.word.value === "Function_definition");
        if (function_definition_node === undefined) {
            return undefined;
        }
        return map_node_to_value(function_definition_node, production_rules, production_rule_to_value_map) as Core.Function_definition;
    }).filter(definition => definition !== undefined) as Core.Function_definition[];

    const export_declarations: Core.Module_declarations = {
        alias_type_declarations: {
            size: 0,
            elements: []
        },
        enum_declarations: {
            size: 0,
            elements: []
        },
        struct_declarations: {
            size: 0,
            elements: []
        },
        function_declarations: {
            size: external_function_declarations.length,
            elements: external_function_declarations
        },
    };

    const internal_declarations: Core.Module_declarations = {
        alias_type_declarations: {
            size: 0,
            elements: []
        },
        enum_declarations: {
            size: 0,
            elements: []
        },
        struct_declarations: {
            size: 0,
            elements: []
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
        export_declarations: export_declarations,
        internal_declarations: internal_declarations,
        definitions: definitions
    };
}
