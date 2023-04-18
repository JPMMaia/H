import * as Core from "../utilities/coreModelInterface";
import { onThrowError } from "../utilities/errors";
import * as Grammar from "./Grammar";
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

enum State_type {
    Module,
    Declarations,
    Alias,
    Enum,
    Function,
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

interface Struct_state {
    declaration: Core.Struct_declaration;
}

interface State {
    type: State_type;
    index: number;
    value: Alias_state | Enum_state | Function_state | Struct_state | undefined;
}

export function module_to_parse_tree(module: Core.Module, symbol_database: Symbol_database.Edit_module_database, declarations: Declaration[], production_rules: Grammar.Production_rule[]): Parser.Node {

    const start_state: State = {
        type: State_type.Module,
        index: 0,
        value: undefined
    };

    return module_to_parse_tree_auxiliary(module, symbol_database, declarations, production_rules, 0, start_state);
}

export function module_to_parse_tree_auxiliary(module: Core.Module, symbol_database: Symbol_database.Edit_module_database, declarations: Declaration[], production_rules: Grammar.Production_rule[], production_rule_index: number, current_state: State): Parser.Node {

    let current_production_rule = production_rules[production_rule_index];

    const parent_node: Parser.Node = {
        word: { value: current_production_rule.lhs, type: Grammar.Word_type.Symbol },
        state: -1,
        previous_node_on_stack: undefined,
        father_node: undefined,
        index_in_father: -1,
        children: []
    };

    for (let label_index = 0; label_index < current_production_rule.rhs.length; ++label_index) {

        const label = current_production_rule.rhs[label_index];

        const next_production_rule_indices = Grammar.find_production_rules(production_rules, label);

        const is_terminal = next_production_rule_indices.length === 0;

        if (is_terminal) {

            const word = map_terminal_to_word(module, symbol_database, current_state, label);

            const child_node: Parser.Node = {
                word: word,
                state: -1,
                previous_node_on_stack: undefined,
                father_node: parent_node,
                index_in_father: label_index,
                children: []
            };

            console.log(word.value);

            parent_node.children.push(child_node);
        }
        else {

            const next_state = get_next_state(module, declarations, current_state, label);

            const next_production_rule_index = choose_production_rule_index(production_rules, next_production_rule_indices, label, declarations, next_state);

            const child_node = module_to_parse_tree_auxiliary(module, symbol_database, declarations, production_rules, next_production_rule_index, next_state);

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

function choose_production_rule_index(production_rules: Grammar.Production_rule[], production_rule_indices: number[], label: string, declarations: Declaration[], current_state: State): number {

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

function map_terminal_to_word(module: Core.Module, symbol_database: Symbol_database.Edit_module_database, current_state: State, terminal: string): Scanner.Scanned_word {

    if (terminal === "Module_name") {
        return { value: module.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (terminal === "Alias_name") {
        const state = current_state.value as Alias_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (terminal === "Alias_type") {
        const state = current_state.value as Alias_state;
        const name = Symbol_database.find_type_name(symbol_database, state.declaration.type.elements);
        return { value: name !== undefined ? name : "<error>", type: Grammar.Word_type.Alphanumeric };
    }
    else if (terminal === "Enum_name") {
        const state = current_state.value as Enum_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (terminal === "Function_name") {
        const state = current_state.value as Function_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }
    else if (terminal === "Enum_name") {
        const state = current_state.value as Struct_state;
        return { value: state.declaration.name, type: Grammar.Word_type.Alphanumeric };
    }

    return { value: terminal, type: Grammar.Word_type.Alphanumeric }; // TODO
}
