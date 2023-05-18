import * as Core from "../utilities/coreModelInterface";
import { onThrowError } from "../utilities/errors";
import * as Grammar from "./Grammar";
import * as Module_change from "../utilities/Change";
import * as Parser from "./Parser";
import * as Scanner from "./Scanner";
import * as Symbol_database from "./Symbol_database";

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
    sub_array_name: string;
    element_type: string;
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
                        sub_array_name: "Function_parameters",
                        element_type: "Function_parameter"
                    },
                    {
                        array_name: "Function_output_parameters",
                        sub_array_name: "Function_parameters",
                        element_type: "Function_parameter"
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
            case "Function_input_parameters": {
                const array_info: Array_info = {
                    array_name: "Function_input_parameters",
                    sub_array_name: "Function_parameters",
                    element_type: "Function_parameter"
                };
                map.push({ type: Production_rule_info_type.Array, value: array_info });
                break;
            }
            case "Function_output_parameters": {
                const array_info: Array_info = {
                    array_name: "Function_output_parameters",
                    sub_array_name: "Function_parameters",
                    element_type: "Function_parameter"
                };
                map.push({ type: Production_rule_info_type.Array, value: array_info });
                break;
            }
            case "Function_parameters": {
                const array_info: Array_info = {
                    array_name: "Function_parameters",
                    sub_array_name: "Function_parameters",
                    element_type: "Function_parameter"
                };
                map.push({ type: Production_rule_info_type.Array, value: array_info });
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
    value: any;
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
    Declarations,
    Alias,
    Enum,
    Function,
    Function_parameters,
    Struct,
}

interface Alias_state {
    declaration: Core.Alias_type_declaration;
}

interface Enum_state {
    declaration: Core.Enum_declaration;
}

interface Function_state {
    declaration: Core.Function_declaration;
    definition: Core.Function_definition;
}

interface Function_parameters_state {
    declaration: Core.Function_declaration;
    is_input_parameter: boolean;
}

interface Struct_state {
    declaration: Core.Struct_declaration;
}

interface State {
    type: State_type;
    index: number;
    value: Alias_state | Enum_state | Function_state | Function_parameters_state | Struct_state | undefined;
}

export function module_to_parse_tree(module: Core.Module, symbol_database: Symbol_database.Edit_module_database, declarations: Declaration[], production_rules: Grammar.Production_rule[]): Parser.Node {

    const start_state: State = {
        type: State_type.Module,
        index: 0,
        value: undefined
    };

    return module_to_parse_tree_auxiliary(module, symbol_database, declarations, production_rules, 0, start_state);
}

function module_to_parse_tree_auxiliary(module: Core.Module, symbol_database: Symbol_database.Edit_module_database, declarations: Declaration[], production_rules: Grammar.Production_rule[], production_rule_index: number, current_state: State): Parser.Node {

    let current_production_rule = production_rules[production_rule_index];

    const parent_node: Parser.Node = {
        word: { value: current_production_rule.lhs, type: Grammar.Word_type.Symbol },
        state: -1,
        production_rule_index: production_rule_index,
        previous_node_on_stack: undefined,
        father_node: undefined,
        index_in_father: -1,
        children: [],
        text_position: undefined
    };

    for (let label_index = 0; label_index < current_production_rule.rhs.length; ++label_index) {

        const label = current_production_rule.rhs[label_index];

        const next_production_rule_indices = Grammar.find_production_rules(production_rules, label);

        const is_terminal = next_production_rule_indices.length === 0;

        if (is_terminal) {

            const word = map_terminal_to_word(module, symbol_database, current_state, parent_node.word.value, label);

            const child_node: Parser.Node = {
                word: word,
                state: -1,
                production_rule_index: undefined,
                previous_node_on_stack: undefined,
                father_node: parent_node,
                index_in_father: label_index,
                children: [],
                text_position: undefined
            };

            parent_node.children.push(child_node);
        }
        else {

            const next_state = get_next_state(module, declarations, current_state, label);

            const next_production_rule_index = choose_production_rule_index(module, production_rules, next_production_rule_indices, label, declarations, next_state);

            const child_node = module_to_parse_tree_auxiliary(module, symbol_database, declarations, production_rules, next_production_rule_index, next_state);

            child_node.index_in_father = label_index;
            child_node.father_node = parent_node;
            parent_node.children.push(child_node);
        }
    }

    return parent_node;
}

function get_next_state(module: Core.Module, declarations: Declaration[], current_state: State, label: string): State {

    if (label === "Module_body") {
        return {
            type: State_type.Declarations,
            index: -1,
            value: undefined
        };
    }
    else if (label === "Declarations") {
        return {
            type: State_type.Declarations,
            index: current_state.index + 1,
            value: undefined
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
        const function_definition_index = module.definitions.function_definitions.elements.findIndex(value => value.id === function_declaration.id);
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
        return {
            type: State_type.Function_parameters,
            index: -1,
            value: {
                declaration: function_state.declaration,
                is_input_parameter: true
            }
        };
    }
    else if (label === "Function_output_parameters") {
        const function_state = current_state.value as Function_state;
        return {
            type: State_type.Function_parameters,
            index: -1,
            value: {
                declaration: function_state.declaration,
                is_input_parameter: false
            }
        };
    }
    else if (label === "Function_parameters") {
        return {
            type: State_type.Function_parameters,
            index: current_state.index + 1,
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

    if (label === "Module_body") {
        if (declarations.length === 0) {
            const index = production_rule_indices.findIndex(index => !contains(production_rules[index].rhs, "Declarations"));
            return production_rule_indices[index];
        }
        else {
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, "Declarations"));
            return production_rule_indices[index];
        }
    }
    else if (label === "Declarations") {
        if (current_state.type === State_type.Declarations) {
            const declaration_index = current_state.index;

            if ((declaration_index + 1) < declarations.length) {
                const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, "Declarations"));
                return production_rule_indices[index];
            }
            else {
                const index = production_rule_indices.findIndex(index => !contains(production_rules[index].rhs, "Declarations"));
                return production_rule_indices[index];
            }
        }
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

        if (function_declaration.input_parameter_names.elements.length === 0) {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs.length === 0);
            return production_rule_indices[index];
        }
        else {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs.length > 0);
            return production_rule_indices[index];
        }
    }
    else if (label === "Function_output_parameters") {
        const state_value = current_state.value as Function_parameters_state;
        const function_declaration = state_value.declaration;

        if (function_declaration.output_parameter_names.elements.length === 0) {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs.length === 0);
            return production_rule_indices[index];
        }
        else {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs.length > 0);
            return production_rule_indices[index];
        }
    }
    else if (label === "Function_parameters") {
        const state_value = current_state.value as Function_parameters_state;
        const function_declaration = state_value.declaration;
        const function_parameters = state_value.is_input_parameter ? function_declaration.input_parameter_names : function_declaration.output_parameter_names;

        if (current_state.index + 1 < function_parameters.elements.length) {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs.findIndex(label => label === "Function_parameters") !== -1);
            return production_rule_indices[index];
        }
        else {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs.findIndex(label => label === "Function_parameters") === -1);
            return production_rule_indices[index];
        }
    }

    const message = "Not implemented!";
    onThrowError(message);
    throw Error(message);
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

function map_terminal_to_word(module: Core.Module, symbol_database: Symbol_database.Edit_module_database, current_state: State, parent_label: string, terminal: string): Scanner.Scanned_word {

    if (parent_label === "Module_name") {
        return { value: module.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Alias_name") {
        const state = current_state.value as Alias_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Alias_type") {
        const state = current_state.value as Alias_state;
        const name = Symbol_database.find_type_name(symbol_database, state.declaration.type.elements);
        return { value: name !== undefined ? name : "<error>", type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Enum_name") {
        const state = current_state.value as Enum_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Function_name") {
        const state = current_state.value as Function_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (parent_label === "Struct_name") {
        const state = current_state.value as Struct_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }

    return { value: terminal, type: Scanner.get_word_type(terminal) };
}

function get_array_elements(node: Parser.Node, array_name: string, sub_array_name: string, element_name: string, production_rules: Grammar.Production_rule[], production_rule_to_value_map: Production_rule_info[]): any[] {

    const elements: any[] = [];

    let current_node = node;

    while (current_node.production_rule_index !== undefined) {
        const production_rule = production_rules[current_node.production_rule_index];

        const child_element_index = production_rule.rhs.findIndex(label => label === element_name);

        if (child_element_index !== -1) {
            const child_element = node.children[child_element_index];
            const element = map_node_to_value(child_element, production_rules, production_rule_to_value_map);
            elements.push(element);
        }

        const next_part_index = production_rule.rhs.findIndex(label => label === array_name || label === sub_array_name);
        if (next_part_index === -1) {
            break;
        }

        current_node = node.children[next_part_index];
    }

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

function map_node_to_value(node: Parser.Node, production_rules: Grammar.Production_rule[], production_rule_to_value_map: Production_rule_info[]): any {

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
        const value = get_array_elements(node, array_info.array_name, array_info.sub_array_name, array_info.element_type, production_rules, production_rule_to_value_map);
        return value;
    }
    else if (info.type === Production_rule_info_type.Object) {

        const object_info = info.value as Object_info;

        const arrays: any[][] = [];

        for (const array_info of object_info.arrays) {
            const array = get_array_elements(node, array_info.array_name, array_info.sub_array_name, array_info.element_type, production_rules, production_rule_to_value_map);
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

export function create_module_changes(
    module: Core.Module,
    symbol_database: Symbol_database.Edit_module_database,
    declarations: Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_to_value_map: Production_rule_info[],
    production_rule_to_change_action_map: Change_action[],
    parse_tree: Parser.Node,
    parse_tree_change: Parser.Modify_change,
): { position: any[], change: Module_change.Change }[] {

    const changes: { position: any[], change: Module_change.Change }[] = [];

    const node_stack: Parser.Node[] = [];
    node_stack.push(parse_tree_change.new_node);

    while (node_stack.length > 0) {
        const current_node = node_stack.pop() as Parser.Node;

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

        /*
        if (current_node.production_rule_index === 3) {
            const position: any[] = [];
            const change = Module_change.create_update("name", current_node.children[0].word.value);
            changes.push({ position: position, change: change });
        }
        else if (current_node.production_rule_index === 21) {

            const function_declaration = map_node_to_value(current_node);
            function_declaration.id = module.next_unique_id;

            const position: any[] = [function_declaration.linkage === Core.Linkage.External ? "export_declarations" : "internal_declarations"];
            const index = function_declaration.linkage === Core.Linkage.External ? module.export_declarations.function_declarations.elements.length : module.internal_declarations.function_declarations.elements.length;
            // TODO decide if we add, or if we set
            const change = Module_change.create_add_element_to_vector("function_declarations", index, function_declaration);
            changes.push({ position: position, change: change });
        }
        else if (current_node.production_rule_index === 22) {

            const function_definition = map_node_to_value(current_node);
            function_definition.id = module.next_unique_id;

            const position: any[] = ["definitions"];
            // TODO decide if we add, or if we set
            const change = Module_change.create_add_element_to_vector("function_definitions", module.definitions.function_definitions.elements.length, function_definition);
            changes.push({ position: position, change: change });
        }

        for (let index_plus_one = current_node.children.length; index_plus_one > 0; --index_plus_one) {
            node_stack.push(current_node.children[index_plus_one - 1]);
        }*/
    }

    return changes;
}
