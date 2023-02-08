import * as Core from "../utilities/coreModelInterface";
import * as Core_helpers from "../utilities/coreModelInterfaceHelpers";
import * as Symbol_database from "./Symbol_database";

export enum Node_data_type {
    Collapsible,
    List,
    String,
    Symbol
}

export interface Collapsible_data {
    elements: Node[];
    is_open: boolean;
}

export interface List_data {
    elements: Node[];
    html_tag: string;
    html_class: string;
}

export interface String_data {
    value: string;
    html_tag: string;
    is_content_editable: boolean;
}

export interface Symbol_data {
    symbol: Symbol_database.Symbol;
    html_tag: string;
    is_content_editable: boolean;
}

export interface Node {
    data_type: Node_data_type;
    data: Collapsible_data | List_data | String_data | Symbol_data | undefined
    parent: Node | undefined;
    index_in_parent: number | undefined;
    metadata: Metadata;
}

export enum Metadata_type {
    Assignment,
    Binary_operation,
    Code_block,
    Curly_braces_open,
    Curly_braces_close,
    Empty,
    Expression,
    Expression_constant,
    Expression_invalid,
    Expression_variable,
    Expression_return,
    Function,
    Function_declaration,
    Function_definition,
    Function_keyword,
    Function_name,
    Function_parameter,
    Function_input_parameter_list,
    Function_output_parameter_list,
    Module,
    Parenthesis_open,
    Parenthesis_close,
    Space,
    Separator,
    Statement,
    Statement_end,
    Variable_declaration,
    Variable_name,
    Variable_type,
    Variable_keyword,
    Variable_mutable_keyword,
    Variadic_symbol
}

export interface Metadata {
    type: Metadata_type;
}

export enum Iteration_action_type {
    Go_to_parent,
    Go_to_child
}

export interface Iteration_action {
    type: Iteration_action_type;
    index: number;
}

function create_go_to_parent_action(): Iteration_action {
    return {
        type: Iteration_action_type.Go_to_parent,
        index: -1
    };
}

function create_go_to_child_action(child_index: number): Iteration_action {
    return {
        type: Iteration_action_type.Go_to_child,
        index: child_index
    };
}

export interface Find_result {
    node: Node | undefined;
    iteration_actions: Iteration_action[];
}

function create_undefined_find_result(): Find_result {
    return {
        node: undefined,
        iteration_actions: []
    };
}

export function find_previous_sibling_node(node: Node): Find_result {
    if (node.parent === undefined || node.index_in_parent === undefined || node.index_in_parent === 0) {
        return create_undefined_find_result();
    }

    const parent_child_nodes = (node.parent.data_type === Node_data_type.List) ? (node.parent.data as List_data).elements : (node.parent.data as Collapsible_data).elements;

    return {
        node: parent_child_nodes[node.index_in_parent - 1],
        iteration_actions: [
            create_go_to_parent_action(),
            create_go_to_child_action(node.index_in_parent - 1)
        ]
    };
}

export function find_next_sibling_node(node: Node): Find_result {
    if (node.parent === undefined || node.index_in_parent === undefined) {
        return create_undefined_find_result();
    }

    const parent_child_nodes = (node.parent.data_type === Node_data_type.List) ? (node.parent.data as List_data).elements : (node.parent.data as Collapsible_data).elements;

    if ((node.index_in_parent + 1) >= parent_child_nodes.length) {
        return create_undefined_find_result();
    }

    return {
        node: parent_child_nodes[node.index_in_parent + 1],
        iteration_actions: [
            create_go_to_parent_action(),
            create_go_to_child_action(node.index_in_parent + 1)
        ]
    };
}

export function find_left_most_leaf_node(node: Node): Find_result {

    if (node.data_type === Node_data_type.String || node.data_type === Node_data_type.Symbol) {
        return {
            node: node,
            iteration_actions: []
        };
    }

    const child_nodes = (node.data_type === Node_data_type.List) ? (node.data as List_data).elements : (node.data as Collapsible_data).elements;

    if (child_nodes.length === 0) {
        return {
            node: node,
            iteration_actions: []
        };
    }

    const result = find_left_most_leaf_node(child_nodes[0]);

    return {
        node: result.node,
        iteration_actions: [
            create_go_to_child_action(0),
            ...result.iteration_actions
        ]
    };
}

export function find_right_most_leaf_node(node: Node): Find_result {

    if (node.data_type === Node_data_type.String || node.data_type === Node_data_type.Symbol) {
        return {
            node: node,
            iteration_actions: []
        };
    }

    const child_nodes = (node.data_type === Node_data_type.List) ? (node.data as List_data).elements : (node.data as Collapsible_data).elements;

    if (child_nodes.length === 0) {
        return {
            node: node,
            iteration_actions: []
        };
    }

    const result = find_right_most_leaf_node(child_nodes[child_nodes.length - 1]);

    return {
        node: result.node,
        iteration_actions: [
            create_go_to_child_action(child_nodes.length - 1),
            ...result.iteration_actions
        ]
    };
}

export function iterate_backward_and_skip(node: Node, skip: (element: Node) => boolean): Find_result {

    const previous_sibling_node_result = find_previous_sibling_node(node);
    const previous_sibling_node = previous_sibling_node_result.node;

    if (previous_sibling_node === undefined) {
        return {
            node: node.parent,
            iteration_actions: [
                create_go_to_parent_action()
            ]
        };
    }

    if (skip(previous_sibling_node) || previous_sibling_node.data_type === Node_data_type.String || previous_sibling_node.data_type === Node_data_type.Symbol) {
        return {
            node: previous_sibling_node,
            iteration_actions: previous_sibling_node_result.iteration_actions
        };
    }

    const right_most_leaf_node_result = find_right_most_leaf_node(previous_sibling_node);
    return {
        node: right_most_leaf_node_result.node,
        iteration_actions: [
            ...previous_sibling_node_result.iteration_actions,
            ...right_most_leaf_node_result.iteration_actions
        ]
    };
}

export function iterate_backward_and_skip_until(node: Node, skip: (element: Node) => boolean, is_node: (element: Node) => boolean): Find_result {

    const previous_result = iterate_backward_and_skip(node, skip);

    const iteration_actions = previous_result.iteration_actions;
    let previous_node = previous_result.node;

    while (previous_node !== undefined && !is_node(previous_node)) {
        const new_previous_result = iterate_backward_and_skip(previous_node, skip);
        iteration_actions.push(...new_previous_result.iteration_actions);
        previous_node = new_previous_result.node;
    }

    return {
        node: previous_node,
        iteration_actions: iteration_actions
    };
}

export function iterate_backward(node: Node): Find_result {
    return iterate_backward_and_skip(node, _ => false);
}

export function iterate_forward_and_skip(node: Node, skip: (element: Node) => boolean): Find_result {
    if ((node.data_type === Node_data_type.List || node.data_type === Node_data_type.Collapsible) && !skip(node)) {
        const child_nodes = (node.data_type === Node_data_type.List) ? (node.data as List_data).elements : (node.data as Collapsible_data).elements;
        if (child_nodes.length > 0) {
            return {
                node: child_nodes[0],
                iteration_actions: [
                    create_go_to_child_action(0)
                ]
            };
        }
    }

    const next_sibling_node_result = find_next_sibling_node(node);
    if (next_sibling_node_result.node !== undefined) {
        return {
            node: next_sibling_node_result.node,
            iteration_actions: next_sibling_node_result.iteration_actions
        };
    }

    let parent = node.parent;
    const iteration_actions: Iteration_action[] = [
        create_go_to_parent_action()
    ];
    while (parent !== undefined) {

        const next_parent_sibling_node_result = find_next_sibling_node(parent);
        if (next_parent_sibling_node_result.node !== undefined) {
            return {
                node: next_parent_sibling_node_result.node,
                iteration_actions: [
                    ...iteration_actions,
                    ...next_parent_sibling_node_result.iteration_actions
                ]
            };
        }

        parent = parent.parent;
        iteration_actions.push(create_go_to_parent_action());
    }

    return create_undefined_find_result();
}

export function iterate_forward_and_skip_until(node: Node, skip: (element: Node) => boolean, is_node: (element: Node) => boolean): Find_result {

    const next_result = iterate_forward_and_skip(node, skip);

    const iteration_actions = next_result.iteration_actions;
    let next_node = next_result.node;

    while (next_node !== undefined && !is_node(next_node)) {
        const new_next_result = iterate_forward_and_skip(next_node, skip);
        iteration_actions.push(...new_next_result.iteration_actions);
        next_node = new_next_result.node;
    }

    return {
        node: next_node,
        iteration_actions: iteration_actions
    };
}

export function iterate_forward(node: Node): Find_result {
    return iterate_forward_and_skip(node, _ => false);
}

export function for_all(node: Node, callback: (node: Node) => void): void {

    let current_node: Node | undefined = node;

    while (current_node !== undefined) {
        callback(current_node);

        const result = iterate_forward(current_node);
        current_node = result.node;
    }
}

function interleave(array: any[], elements: any[]): void {
    for (let index = 1; index < array.length; index += 2) {
        array.splice(index, 0, ...elements);
    }
}

function set_index_in_parent(elements: Node[]): void {
    for (let index = 0; index < elements.length; ++index) {
        elements[index].index_in_parent = index;
    }
}

export function create_list_node(parent: Node | undefined, index_in_parent: number, elements: Node[], metadata: Metadata): Node {
    return {
        data_type: Node_data_type.List,
        data: {
            elements: elements,
            html_tag: "span",
            html_class: ""
        },
        parent: parent,
        index_in_parent: index_in_parent,
        metadata: metadata
    };
}

export function create_string_node(parent: Node, index_in_parent: number, value: string, html_tag: string, is_content_editable: boolean, metadata: Metadata): Node {
    return {
        data_type: Node_data_type.String,
        data: {
            value: value,
            html_tag: html_tag,
            is_content_editable: is_content_editable
        },
        parent: parent,
        index_in_parent: index_in_parent,
        metadata: metadata
    };
}

export function create_symbol_node(parent: Node, index_in_parent: number, symbol: Symbol_database.Symbol, html_tag: string, is_content_editable: boolean, metadata: Metadata): Node {
    return {
        data_type: Node_data_type.Symbol,
        data: {
            symbol: symbol,
            html_tag: html_tag,
            is_content_editable: is_content_editable
        },
        parent: parent,
        index_in_parent: index_in_parent,
        metadata: metadata
    };
}

export function create_empty_node_tree(parent: Node, index_in_parent: number, html_tag: string): Node {
    return create_string_node(parent, index_in_parent, "\u200B", html_tag, true, { type: Metadata_type.Empty });
}

export function create_separator_node_tree(parent: Node, index_in_parent: number, separator: string, is_content_editable: boolean): Node {
    return create_string_node(parent, index_in_parent, separator, "span", is_content_editable, { type: Metadata_type.Separator });
}

export function create_open_parenthesis_node_tree(parent: Node, index_in_parent: number, is_content_editable: boolean): Node {
    return create_string_node(parent, index_in_parent, "(", "span", is_content_editable, { type: Metadata_type.Parenthesis_open });
}

export function create_close_parenthesis_node_tree(parent: Node, index_in_parent: number, is_content_editable: boolean): Node {
    return create_string_node(parent, index_in_parent, ")", "span", is_content_editable, { type: Metadata_type.Parenthesis_close });
}

export function create_open_curly_braces_node_tree(parent: Node, index_in_parent: number, is_content_editable: boolean): Node {
    return create_string_node(parent, index_in_parent, "{", "div", is_content_editable, { type: Metadata_type.Curly_braces_open });
}

export function create_close_curly_braces_node_tree(parent: Node, index_in_parent: number, is_content_editable: boolean): Node {
    return create_string_node(parent, index_in_parent, "}", "div", is_content_editable, { type: Metadata_type.Curly_braces_close });
}

export function create_assignment_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, " = ", "span", false, { type: Metadata_type.Assignment });
}

export function create_variable_keyword_node_tree(parent: Node, index_in_parent: number, is_mutable: boolean): Node {
    return create_string_node(parent, index_in_parent, is_mutable ? "mutable" : "var", "span", true, { type: is_mutable ? Metadata_type.Variable_mutable_keyword : Metadata_type.Variable_keyword });
}

export function create_space_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, " ", "span", false, { type: Metadata_type.Space });
}

export function create_statement_end_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, ";", "span", false, { type: Metadata_type.Statement_end });
}

export function create_variable_name_node_tree(parent: Node, index_in_parent: number, symbol: Symbol_database.Symbol): Node {
    return create_symbol_node(parent, index_in_parent, symbol, "span", true, { type: Metadata_type.Variable_name });
}

export function create_variable_type_node_tree(parent: Node, index_in_parent: number, type: Symbol_database.Symbol): Node {
    return create_symbol_node(parent, index_in_parent, type, "span", true, { type: Metadata_type.Variable_type });
}

export function create_function_parameter_node_tree(
    parent: Node,
    index_in_parent: number,
    parameter_name_symbol: Symbol_database.Symbol,
    parameter_type_symbol: Symbol_database.Symbol
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        data: undefined,
        parent: parent,
        index_in_parent: index_in_parent,
        metadata: {
            type: Metadata_type.Function_parameter
        }
    };

    root.data = {
        elements: [
            create_variable_name_node_tree(root, 0, parameter_name_symbol),
            create_separator_node_tree(root, 1, ": ", false),
            create_variable_type_node_tree(root, 2, parameter_type_symbol)
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

export function create_function_parameters_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    module: Core.Module,
    is_input_parameters_list: boolean,
    parameter_ids: number[],
    parameter_names: string[],
    parameter_types: Core.Type_reference[],
    is_variadic: boolean,
    variadic_symbol: string,
    separator: string
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: undefined,
        parent: parent,
        metadata: {
            type: is_input_parameters_list ? Metadata_type.Function_input_parameter_list : Metadata_type.Function_output_parameter_list
        }
    };

    const parameters = parameter_ids.map((id, index) => {
        const parameter_name_symbol = { id: () => id, type: Symbol_database.Type.Variable_declaration, name: () => parameter_names[index] };
        const parameter_type_symbol = { id: () => id, type: Symbol_database.Type.Type_reference, name: () => Core_helpers.getUnderlyingTypeName([module], parameter_types[index]) };
        return create_function_parameter_node_tree(root, 0, parameter_name_symbol, parameter_type_symbol)
    });

    if (is_variadic) {
        const variadic_node = create_string_node(root, 0, variadic_symbol, "span", true, { type: Metadata_type.Variadic_symbol });
        parameters.push(variadic_node);
    }

    interleave(parameters, [create_separator_node_tree(root, 0, separator, false)]);

    parameters.splice(0, 0, create_open_parenthesis_node_tree(root, 0, false));
    parameters.push(create_close_parenthesis_node_tree(root, 0, false));

    set_index_in_parent(parameters);

    root.data = {
        elements: parameters,
        html_tag: "span",
        html_class: ""
    };

    return root;
}

export function create_function_declaration_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    module: Core.Module,
    function_declaration: Core.Function_declaration,
    variadic_symbol: string,
    separator: string
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: undefined,
        parent: parent,
        metadata: {
            type: Metadata_type.Function_declaration
        }
    };

    const function_name_symbol = { id: () => function_declaration.id, type: Symbol_database.Type.Function_declaration, name: () => function_declaration.name };

    root.data = {
        elements: [
            create_string_node(root, 0, "function", "span", true, { type: Metadata_type.Function_keyword }),
            create_space_node_tree(root, 1),
            create_symbol_node(root, 2, function_name_symbol, "span", true, { type: Metadata_type.Function_name }),
            create_function_parameters_node_tree(root, 3, module, true, function_declaration.input_parameter_ids.elements, function_declaration.input_parameter_names.elements, function_declaration.type.input_parameter_types.elements, function_declaration.type.is_variadic, variadic_symbol, separator),
            create_string_node(root, 4, " -> ", "span", false, { type: Metadata_type.Separator }),
            create_function_parameters_node_tree(root, 5, module, false, function_declaration.output_parameter_ids.elements, function_declaration.output_parameter_names.elements, function_declaration.type.output_parameter_types.elements, false, variadic_symbol, separator),
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

export function create_function_definition_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    module: Core.Module,
    function_declaration: Core.Function_declaration,
    function_definition: Core.Function_definition
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: undefined,
        parent: parent,
        metadata: {
            type: Metadata_type.Function_definition
        }
    };

    root.data = {
        elements: [
            create_code_block_node_tree(root, 0, module, function_declaration, function_definition.statements.elements, function_definition.statements.elements, false),
        ],
        html_tag: "div",
        html_class: ""
    };

    return root;
}

export function create_function_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    module: Core.Module,
    function_declaration: Core.Function_declaration,
    function_definition: Core.Function_definition
): Node {

    const root: Node = {
        data_type: Node_data_type.Collapsible,
        index_in_parent: index_in_parent,
        data: undefined,
        parent: parent,
        metadata: {
            type: Metadata_type.Function
        }
    };

    root.data = {
        elements: [
            create_function_declaration_node_tree(root, 0, module, function_declaration, "...", ", "),
            create_function_definition_node_tree(root, 1, module, function_declaration, function_definition)
        ],
        is_open: false
    };

    return root;
}

export function create_variable_expression_node_tree(
    parent: Node,
    index_in_parent: number,
    function_declaration: Core.Function_declaration,
    statements: Core.Statement[],
    expression: Core.Variable_expression
): Node {
    if (expression.type === Core.Variable_expression_type.Function_argument) {
        const parameter_index = function_declaration.input_parameter_ids.elements.findIndex(id => id === expression.id);
        if (parameter_index !== -1) {
            const name_symbol = { id: () => parameter_index, type: Symbol_database.Type.Variable_declaration, name: () => function_declaration.input_parameter_names.elements[parameter_index] };
            return create_symbol_node(parent, index_in_parent, name_symbol, "span", true, { type: Metadata_type.Expression_variable });
        }
    }
    else if (expression.type === Core.Variable_expression_type.Local_variable) {
        const statement = statements.find(statement => statement.id === expression.id);
        if (statement !== undefined) {
            const name_symbol = { id: () => statement.id, type: Symbol_database.Type.Variable_reference, name: () => statement.name };
            return create_symbol_node(parent, index_in_parent, name_symbol, "span", true, { type: Metadata_type.Expression_variable });
        }
    }

    return create_string_node(parent, index_in_parent, "<not_found>", "span", true, { type: Metadata_type.Expression_variable });
}

export function get_binary_operation_string(operation: Core.Binary_operation): string {
    switch (operation) {
        case Core.Binary_operation.Add: return "+";
        case Core.Binary_operation.Subtract: return "-";
        case Core.Binary_operation.Multiply: return "*";
        case Core.Binary_operation.Signed_divide: return "/";
        case Core.Binary_operation.Unsigned_divide: return "/";
        case Core.Binary_operation.Less_than: return "<";
    }
}

export function create_expression_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    module: Core.Module,
    function_declaration: Core.Function_declaration,
    statements: Core.Statement[],
    statement: Core.Statement,
    expression_index: number
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: undefined,
        parent: parent,
        metadata: {
            type: Metadata_type.Expression
        }
    };

    const expression = statement.expressions.elements[expression_index];

    if (expression.data.type === Core.Expression_enum.Binary_expression) {
        const binary_expression = expression.data.value as Core.Binary_expression;
        const binary_operation_symbol = { id: () => expression_index, type: Symbol_database.Type.Operation, name: () => get_binary_operation_string(binary_expression.operation) };

        root.data = {
            elements: [
                create_expression_node_tree(root, 0, module, function_declaration, statements, statement, binary_expression.left_hand_side.expression_index),
                create_symbol_node(root, 1, binary_operation_symbol, "span", true, { type: Metadata_type.Binary_operation }),
                create_expression_node_tree(root, 2, module, function_declaration, statements, statement, binary_expression.right_hand_side.expression_index),
            ],
            html_tag: "span",
            html_class: "horizontal_container add_space_between_nodes"
        };
    }
    else if (expression.data.type === Core.Expression_enum.Constant_expression) {
        const constant_expression = expression.data.value as Core.Constant_expression;
        const constant_expression_symbol = { id: () => expression_index, type: Symbol_database.Type.Constant, name: () => constant_expression.data };
        root.data = {
            elements: [
                create_symbol_node(root, 0, constant_expression_symbol, "span", true, { type: Metadata_type.Expression_constant })
            ],
            html_tag: "span",
            html_class: ""
        };
    }
    else if (expression.data.type === Core.Expression_enum.Invalid_expression) {
        const invalid_expression = expression.data.value as Core.Invalid_expression;
        const invalid_expression_symbol = { id: () => expression_index, type: Symbol_database.Type.Other, name: () => invalid_expression.value };
        root.data = {
            elements: [
                create_symbol_node(root, 0, invalid_expression_symbol, "span", true, { type: Metadata_type.Expression_invalid })
            ],
            html_tag: "span",
            html_class: ""
        };
    }
    else if (expression.data.type === Core.Expression_enum.Variable_expression) {
        root.data = {
            elements: [
                create_variable_expression_node_tree(root, 0, function_declaration, statements, expression.data.value as Core.Variable_expression)
            ],
            html_tag: "span",
            html_class: ""
        };
    }
    else if (expression.data.type === Core.Expression_enum.Return_expression) {
        const return_expression = expression.data.value as Core.Return_expression;
        root.data = {
            elements: [
                create_string_node(root, 0, "return", "span", true, { type: Metadata_type.Expression_return }),
                create_expression_node_tree(root, 1, module, function_declaration, statements, statement, return_expression.expression.expression_index)
            ],
            html_tag: "span",
            html_class: "horizontal_container add_space_between_nodes"
        };
    }
    else {
        throw Error("TODO Not implemented yet!");
    }

    return root;
}

export function create_variable_declaration_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    name_symbol: Symbol_database.Symbol,
    type_symbol: Symbol_database.Symbol
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: undefined,
        parent: parent,
        metadata: {
            type: Metadata_type.Variable_declaration
        }
    };

    root.data = {
        elements: [
            create_variable_keyword_node_tree(root, 0, false),
            create_space_node_tree(root, 1),
            create_variable_name_node_tree(root, 2, name_symbol),
            create_separator_node_tree(root, 3, ": ", false),
            create_variable_type_node_tree(root, 4, type_symbol)
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

export function create_statement_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    module: Core.Module,
    function_declaration: Core.Function_declaration,
    statements: Core.Statement[],
    statement: Core.Statement
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: undefined,
        parent: parent,
        metadata: {
            type: Metadata_type.Statement
        }
    };

    if (statement.expressions.elements.length === 0) {
        return root;
    }

    const type_reference = Core_helpers.get_type_of_statement(module, function_declaration, statements, statement);
    const has_variable_declaration = type_reference !== undefined && type_reference.length > 0;

    if (has_variable_declaration) {

        const variable_name_symbol = { id: () => statement.id, type: Symbol_database.Type.Variable_declaration, name: () => statement.name };
        const variable_type_symbol = { id: () => statement.id, type: Symbol_database.Type.Type_reference, name: () => Core_helpers.getUnderlyingTypeName([module], type_reference[0]) };

        root.data = {
            elements: [
                create_variable_declaration_node_tree(root, 0, variable_name_symbol, variable_type_symbol),
                create_assignment_node_tree(root, 1),
                create_expression_node_tree(root, 2, module, function_declaration, statements, statement, 0),
                create_statement_end_node_tree(root, 3)
            ],
            html_tag: "div",
            html_class: "horizontal_container add_indentation"
        };
    }
    else {
        root.data = {
            elements: [
                create_expression_node_tree(root, 0, module, function_declaration, statements, statement, 0),
                create_statement_end_node_tree(root, 1)
            ],
            html_tag: "div",
            html_class: "horizontal_container add_indentation"
        };
    }

    return root;
}

export function create_code_block_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    module: Core.Module,
    function_declaration: Core.Function_declaration,
    all_statements: Core.Statement[],
    code_block_statements: Core.Statement[],
    are_parenthesis_editable: boolean
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: undefined,
        parent: parent,
        metadata: {
            type: Metadata_type.Code_block
        }
    };

    const statements_node_tree = code_block_statements.map((statement, index) => create_statement_node_tree(root, index + 1, module, function_declaration, all_statements, statement));

    root.data = {
        elements: [
            create_open_curly_braces_node_tree(root, 0, are_parenthesis_editable),
            ...statements_node_tree,
            create_close_curly_braces_node_tree(root, code_block_statements.length + 1, are_parenthesis_editable),
        ],
        html_tag: "span",
        html_class: ""
    };

    return root;
}

export function create_module_code_tree(
    module: Core.Module
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: undefined,
        data: undefined,
        parent: undefined,
        metadata: {
            type: Metadata_type.Module
        }
    };

    const export_function_definitions = module.export_declarations.function_declarations.elements.map(declaration => Core_helpers.find_function_definition(module, Core_helpers.create_function_reference(module, declaration.id)));
    const export_functions = module.export_declarations.function_declarations.elements.map((declaration, index) => create_function_node_tree(root, 0, module, declaration, export_function_definitions[index]));

    // TODO add other declarations

    const all_declarations = export_functions;

    interleave(all_declarations, [create_empty_node_tree(root, 0, "div")]);

    set_index_in_parent(all_declarations);

    root.data = {
        elements: [
            ...all_declarations
        ],
        html_tag: "div",
        html_class: ""
    };

    return root;
}

export function to_string(node_tree: Node): string {

    const buffer: string[] = [];

    for_all(node_tree, (node: Node): void => {
        if (node.data_type === Node_data_type.String) {
            const data = node.data as String_data;

            if (data.html_tag === "div") {
                buffer.push("\n");
            }

            buffer.push(data.value);

        }
        else if (node.data_type === Node_data_type.Symbol) {
            const data = node.data as Symbol_data;

            if (data.html_tag === "div") {
                buffer.push("\n");
            }

            buffer.push(data.symbol.name());
        }
        else if (node.data_type === Node_data_type.List) {
            const data = node.data as List_data;

            if (data.html_tag === "div") {
                buffer.push("\n");
            }
        }
        else if (node.data_type === Node_data_type.Collapsible) {
            buffer.push("\n");
        }
    });

    const output = buffer.join("");
    return output;
}
