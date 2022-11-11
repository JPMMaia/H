import * as Core from "../../../../../src/utilities/coreModelInterface";
import * as Core_helpers from "../../../../../src/utilities/coreModelInterfaceHelpers";
import { Node_type, type Branch_node, type Node } from "@/components/common/Node";

enum Expression_node_value_type {
    Symbol,
    Operand,
    Unknown
}

interface Expression_node_value {
    expression_index: number;
    type: Expression_node_value_type;
    value: string;
}

function create_branch_expression_node(node: Branch_node): Node {
    return {
        type: Node_type.Branch,
        value: node
    };
}

function create_leaf_expression_node(value: Expression_node_value): Node {
    return {
        type: Node_type.Leaf,
        value: {
            value: value
        }
    };
}

function get_binary_operation_symbol(operation: Core.Binary_operation): string {

    switch (operation) {
        case Core.Binary_operation.Add:
            return "+";
        case Core.Binary_operation.Subtract:
            return "-";
        case Core.Binary_operation.Multiply:
            return "*";
        case Core.Binary_operation.Signed_divide:
            return "/";
        case Core.Binary_operation.Unsigned_divide:
            return "/";
        case Core.Binary_operation.Less_than:
            return "<";
        default:
            return operation;
    }
}

function create_binary_expression_node_tree(module: Core.Module, function_declaration: Core.Function_declaration, statements: Core.Statement[], expressions: Core.Expression[], expression_index: number, binary_expression: Core.Binary_expression): Node {

    const binary_symbol_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Symbol,
        value: get_binary_operation_symbol(binary_expression.operation)
    };

    const root: Branch_node = {
        children: [
            create_expression_node_tree(module, function_declaration, statements, expressions, binary_expression.left_hand_side.expression_index),
            create_leaf_expression_node(binary_symbol_value),
            create_expression_node_tree(module, function_declaration, statements, expressions, binary_expression.right_hand_side.expression_index)
        ]
    };

    return create_branch_expression_node(root);
}

function add_commas(nodes: Node[], expression_index: number): Node[] {

    const comma_symbol_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Symbol,
        value: ","
    };

    const comma_node = create_leaf_expression_node(comma_symbol_value);

    const nodes_with_commas: Node[] = [];

    for (let index = 0; index < nodes.length; ++index) {
        nodes_with_commas.push(nodes[index]);

        if ((index + 1) < nodes.length) {
            nodes_with_commas.push(comma_node);
        }
    }

    return nodes_with_commas;
}

function create_call_expression_node_tree(module: Core.Module, function_declaration: Core.Function_declaration, statements: Core.Statement[], expressions: Core.Expression[], expression_index: number, call_expression: Core.Call_expression): Node {

    const call_function_module = Core_helpers.get_module(module, call_expression.function_reference.module_reference);
    const call_function_declaration = Core_helpers.findFunctionDeclarationWithId(call_function_module, call_expression.function_reference.function_id);

    const call_symbol_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Symbol,
        value: call_function_declaration.name
    };

    const start_call_arguments_symbol_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Symbol,
        value: "("
    };

    const end_call_arguments_symbol_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Symbol,
        value: ")"
    };

    const arguments_node_trees: Node[] = call_expression.arguments.elements.map(value => create_expression_node_tree(module, function_declaration, statements, expressions, value.expression_index));

    const arguments_with_commas = add_commas(arguments_node_trees, expression_index);

    const root: Branch_node = {
        children: [
            create_leaf_expression_node(call_symbol_value),
            create_leaf_expression_node(start_call_arguments_symbol_value),
            ...arguments_with_commas,
            create_leaf_expression_node(end_call_arguments_symbol_value),
        ]
    };

    return create_branch_expression_node(root);
}

function create_constant_string(constant_expression: Core.Constant_expression): string {
    return constant_expression.data + "_" + constant_expression.type;
}

function create_constant_expression_node_tree(expressions: Core.Expression[], expression_index: number, constant_expression: Core.Constant_expression): Node {

    const constant_node_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Operand,
        value: create_constant_string(constant_expression)
    };

    return create_leaf_expression_node(constant_node_value);
}

function create_invalid_expression_node_tree(expressions: Core.Expression[], expression_index: number, invalid_expression: Core.Invalid_expression): Node {

    const invalid_symbol_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Unknown,
        value: invalid_expression.value
    };

    return create_leaf_expression_node(invalid_symbol_value);
}

function create_return_expression_node_tree(module: Core.Module, function_declaration: Core.Function_declaration, statements: Core.Statement[], expressions: Core.Expression[], expression_index: number, return_expression: Core.Return_expression): Node {

    const return_symbol_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Symbol,
        value: "return"
    };

    const root: Branch_node = {
        children: [
            create_leaf_expression_node(return_symbol_value),
            create_expression_node_tree(module, function_declaration, statements, expressions, return_expression.expression.expression_index)
        ]
    };

    return create_branch_expression_node(root);
}

function create_variable_expression_string(function_declaration: Core.Function_declaration, statements: Core.Statement[], variable_expression: Core.Variable_expression): string {
    if (variable_expression.type === Core.Variable_expression_type.Function_argument) {
        const index = function_declaration.input_parameter_ids.elements.findIndex(value => value === variable_expression.id);
        if (index === -1) {
            return "<variable_not_found>";
        }
        return function_declaration.input_parameter_names.elements[index];
    }
    else if (variable_expression.type === Core.Variable_expression_type.Local_variable) {
        const statement = statements.find(value => value.id === variable_expression.id);
        return statement ? statement.name : "<variable_not_found>";
    }
    else {
        return "<variable_not_found>";
    }
}

function create_variable_expression_node_tree(function_declaration: Core.Function_declaration, statements: Core.Statement[], expressions: Core.Expression[], expression_index: number, variable_expression: Core.Variable_expression): Node {

    const variable_node_value: Expression_node_value = {
        expression_index: expression_index,
        type: Expression_node_value_type.Operand,
        value: create_variable_expression_string(function_declaration, statements, variable_expression)
    };

    return create_leaf_expression_node(variable_node_value);
}

export function create_expression_node_tree(module: Core.Module, function_declaration: Core.Function_declaration, statements: Core.Statement[], expressions: Core.Expression[], root_expression_index: number): Node {

    const root_expression: Core.Expression = expressions[root_expression_index];

    switch (root_expression.data.type) {
        case Core.Expression_enum.Binary_expression:
            return create_binary_expression_node_tree(module, function_declaration, statements, expressions, root_expression_index, root_expression.data.value as Core.Binary_expression);
        case Core.Expression_enum.Call_expression:
            return create_call_expression_node_tree(module, function_declaration, statements, expressions, root_expression_index, root_expression.data.value as Core.Call_expression);
        case Core.Expression_enum.Constant_expression:
            return create_constant_expression_node_tree(expressions, root_expression_index, root_expression.data.value as Core.Constant_expression);
        case Core.Expression_enum.Invalid_expression:
            return create_invalid_expression_node_tree(expressions, root_expression_index, root_expression.data.value as Core.Invalid_expression);
        case Core.Expression_enum.Return_expression:
            return create_return_expression_node_tree(module, function_declaration, statements, expressions, root_expression_index, root_expression.data.value as Core.Return_expression);
        case Core.Expression_enum.Variable_expression:
            return create_variable_expression_node_tree(function_declaration, statements, expressions, root_expression_index, root_expression.data.value as Core.Variable_expression);
    }
}