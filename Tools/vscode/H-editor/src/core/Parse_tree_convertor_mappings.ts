import * as Core from "./Core_interface";
import * as Grammar from "./Grammar";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parser_node from "./Parser_node";
import * as Type_utilities from "./Type_utilities";
import { onThrowError } from "../utilities/errors";

export function create_mapping(
    key_to_production_rule_indices: Map<string, number[]>
): Parse_tree_convertor.Parse_tree_mappings {

    const vector_to_node_name = (vector_position: any[]): string => {
        const last_value = vector_position[vector_position.length - 1];
        switch (last_value) {
            case "alias_imports": return "Imports";
            case "alias_type_declarations": return "Alias_name";
            case "enum_declarations": return "Enum_name";
            case "values": return "Enum_values";
            case "function_declarations": return "Function_name";
            case "function_definitions": return "Function_name";
            case "input_parameter_names": return "Function_input_parameters";
            case "input_parameter_types": return "Function_input_parameters";
            case "output_parameter_names": return "Function_output_parameters";
            case "output_parameter_types": return "Function_output_parameters";
            case "statements": return "Statements";
            case "struct_declarations": return "Struct_name";
            case "member_names": return "Struct_members";
            case "member_types": return "Struct_members";
            default: {
                const message = `Parse_tree_convertor.create_mapping(): case not handled '${last_value}'`;
                onThrowError(message);
                throw Error(message);
            }
        }
    };

    const value_map = new Map<string, string[]>(
        [
            ["Module_name", ["name"]],
            ["Import_name", ["dependencies", "alias_imports", "elements", "$order_index", "module_name"]],
            ["Import_alias", ["dependencies", "alias_imports", "elements", "$order_index", "alias"]],
            ["Alias_name", ["$export", "alias_type_declarations", "elements", "$name_index", "name"]],
            ["Alias_type", ["$export", "alias_type_declarations", "elements", "$name_index", "type"]],
            ["Enum_name", ["$export", "enum_declarations", "elements", "$name_index", "name"]],
            ["Enum_value_name", ["$export", "enum_declarations", "elements", "$name_index", "values", "elements", "$order_index", "name"]],
            ["Enum_value_value", ["$export", "enum_declarations", "elements", "$name_index", "values", "elements", "$order_index", "value"]],
            ["Function_name", ["$export", "function_declarations", "elements", "$name_index", "name"]],
            ["Function_parameter_name", ["$export", "function_declarations", "elements", "$name_index", "$parameter_names", "elements", "$order_index"]],
            ["Function_parameter_type", ["$export", "function_declarations", "elements", "$name_index", "type", "$parameter_types", "elements", "$order_index"]],
            ["Statement", ["definitions", "function_definitions", "elements", "$name_index", "statements", "elements", "$order_index"]],
            ["Struct_name", ["$export", "struct_declarations", "elements", "$name_index", "name"]],
            ["Struct_member_name", ["$export", "struct_declarations", "elements", "$name_index", "member_names", "elements", "$order_index"]],
            ["Struct_member_type", ["$export", "struct_declarations", "elements", "$name_index", "member_types", "elements", "$order_index"]],
            ["Variable_name", ["definitions", "function_definitions", "elements", "$name_index", "statements", "elements", "$order_index", "expressions", "elements", "$expression_index", "data", "value", "name"]],
        ]
    );

    const value_transforms = new Map<string, (value: any) => string>(
        [
            ["Alias_type", vector => Type_utilities.get_type_name(vector.elements)],
            ["Function_parameter_type", value => Type_utilities.get_type_name([value])],
            ["Struct_member_type", value => Type_utilities.get_type_name([value])],
        ]
    );

    const node_to_value_transforms = new Map<string, (node: Parser_node.Node, position: number[]) => any>(
        [
            ["Module_name", join_all_child_node_values],
            ["Import_name", join_all_child_node_values],
            ["Alias_type", node => convert_to_vector(Type_utilities.parse_type_name(Parse_tree_convertor.get_terminal_value(node)))],
            ["Function_parameter_type", node => Type_utilities.parse_type_name(Parse_tree_convertor.get_terminal_value(node))[0]],
            ["Statement", node => node_to_statement(node, key_to_production_rule_indices)],
            ["Struct_member_type", node => Type_utilities.parse_type_name(Parse_tree_convertor.get_terminal_value(node))[0]],
        ]
    );

    const vector_map = new Map<string, string[][]>(
        [
            ["Imports", [["dependencies", "alias_imports"]]],
            ["Module_body", [["$declarations"]]],
            ["Enum_values", [["$export", "enum_declarations", "elements", "$name_index", "values"]]],
            ["Function_input_parameters", [
                ["$export", "function_declarations", "elements", "$name_index", "input_parameter_names"],
                ["$export", "function_declarations", "elements", "$name_index", "type", "input_parameter_types"]
            ]],
            ["Function_output_parameters", [
                ["$export", "function_declarations", "elements", "$name_index", "output_parameter_names"],
                ["$export", "function_declarations", "elements", "$name_index", "type", "output_parameter_types"],
            ]],
            ["Struct_members", [
                ["$export", "struct_declarations", "elements", "$name_index", "member_names"],
                ["$export", "struct_declarations", "elements", "$name_index", "member_types"]
            ]],
            ["Statements", [["definitions", "function_definitions", "elements", "$name_index", "statements"]]],
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

    const choose_production_rule = new Map<string, Parse_tree_convertor.Choose_production_rule_handler>(
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
        node_to_value_transforms: node_to_value_transforms,
        vector_map: vector_map,
        order_index_nodes: order_index_nodes,
        choose_production_rule: choose_production_rule
    };
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

function convert_to_vector(elements: any[]): Core.Vector<any> {
    return {
        elements: elements,
        size: elements.length
    };
}

function choose_production_rule_identifier_with_dots(
    module: Core.Module,
    declarations: Parse_tree_convertor.Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const word = Parse_tree_convertor.map_terminal_to_word(module, stack, production_rules, key_to_production_rule_indices, "identifier", mappings, declarations);
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
    declarations: Parse_tree_convertor.Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const production_rule = production_rules[top.production_rule_index];
    const declaration_index = Parse_tree_convertor.calculate_array_index(production_rule, top.current_child_index);
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

function get_underlying_declaration_production_rule_lhs(type: Parse_tree_convertor.Declaration_type): string {
    switch (type) {
        case Parse_tree_convertor.Declaration_type.Alias:
            return "Alias";
        case Parse_tree_convertor.Declaration_type.Enum:
            return "Enum";
        case Parse_tree_convertor.Declaration_type.Function:
            return "Function";
        case Parse_tree_convertor.Declaration_type.Struct:
            return "Struct";
    }
}

function choose_production_rule_export(
    module: Core.Module,
    declarations: Parse_tree_convertor.Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const declaration = top.state.value as Parse_tree_convertor.Declaration;
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
    declarations: Parse_tree_convertor.Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const statements_array = top.state.value as Core.Statement[];
    const statement_index = Parse_tree_convertor.calculate_array_index(production_rules[top.production_rule_index], top.current_child_index);
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
    declarations: Parse_tree_convertor.Declaration[],
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

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

function contains(array: any[], value: any): boolean {
    const index = array.findIndex(current => current === value);
    return index !== -1;
}

function node_to_statement(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core.Statement {

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

function add_expression_return(node: Parser_node.Node, expressions: Core.Expression[], key_to_production_rule_indices: Map<string, number[]>): void {

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

function add_expression_generic(node: Parser_node.Node, expressions: Core.Expression[], key_to_production_rule_indices: Map<string, number[]>): void {

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

function add_expression_binary(node: Parser_node.Node, expressions: Core.Expression[], key_to_production_rule_indices: Map<string, number[]>): void {

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

function add_expression_variable_name(node: Parser_node.Node, expressions: Core.Expression[]): void {
    const name = Parse_tree_convertor.get_terminal_value(node);
    const variable_expression: Core.Variable_expression = {
        name: name
    };
    expressions.push({ data: { type: Core.Expression_enum.Variable_expression, value: variable_expression } });
}

function find_node(node: Parser_node.Node, key: string, key_to_production_rule_indices: Map<string, number[]>): Parser_node.Node | undefined {
    const production_rule_indices = key_to_production_rule_indices.get(key) as number[];
    if (production_rule_indices === undefined) {
        return undefined;
    }

    const found_node = find_node_with_production_rule_indices(node, production_rule_indices);
    return found_node;
}

function find_nodes(node: Parser_node.Node, key: string, key_to_production_rule_indices: Map<string, number[]>): Parser_node.Node[] {
    const production_rule_indices = key_to_production_rule_indices.get(key) as number[];
    if (production_rule_indices === undefined) {
        return [];
    }

    const found_nodes = find_nodes_with_production_rule_indices(node, production_rule_indices);
    return found_nodes;
}

function find_node_with_production_rule_indices(node: Parser_node.Node, production_rule_indices: number[]): Parser_node.Node | undefined {

    const has_production_rule = (element: Parser_node.Node): boolean => {
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

function find_nodes_with_production_rule_indices(node: Parser_node.Node, production_rule_indices: number[]): Parser_node.Node[] {

    const nodes: Parser_node.Node[] = [];

    const has_production_rule = (element: Parser_node.Node): boolean => {
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