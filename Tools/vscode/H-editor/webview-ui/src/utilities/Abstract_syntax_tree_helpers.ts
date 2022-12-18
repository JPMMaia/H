import * as Core from "../../../src/utilities/coreModelInterface";
import * as Core_helpers from "../../../src/utilities/coreModelInterfaceHelpers";

export enum Node_data_type {
    List,
    String
}

export interface List_data {
    elements: Node[];
}

export interface String_data {
    value: string;
}

export interface Node {
    data_type: Node_data_type;
    data: List_data | String_data
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
    Expression,
    Expression_constant,
    Expression_invalid,
    Expression_variable,
    Expression_return,
    Function_declaration,
    Function_definition,
    Function_keyword,
    Function_name,
    Function_parameter,
    Function_input_parameter_list,
    Function_output_parameter_list,
    Parenthesis_open,
    Parenthesis_close,
    Space,
    Separator,
    Statement,
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

export function find_previous_sibling_node(node: Node): Node | undefined {
    if (node.parent === undefined || node.index_in_parent === undefined || node.index_in_parent === 0) {
        return undefined;
    }

    const parent_child_nodes = (node.parent.data as List_data).elements;
    return parent_child_nodes[node.index_in_parent - 1];
}

export function find_next_sibling_node(node: Node): Node | undefined {
    if (node.parent === undefined || node.index_in_parent === undefined) {
        return undefined;
    }

    const parent_child_nodes = (node.parent.data as List_data).elements;

    if ((node.index_in_parent + 1) >= parent_child_nodes.length) {
        return undefined;
    }

    return parent_child_nodes[node.index_in_parent + 1];
}

export function find_left_most_leaf_node(node: Node): Node | undefined {

    if (node.data_type === Node_data_type.String) {
        return node;
    }

    const child_nodes = (node.data as List_data).elements;

    if (child_nodes.length === 0) {
        return node;
    }

    return find_left_most_leaf_node(child_nodes[0]);
}

export function find_right_most_leaf_node(node: Node): Node | undefined {

    if (node.data_type === Node_data_type.String) {
        return node;
    }

    const child_nodes = (node.data as List_data).elements;

    if (child_nodes.length === 0) {
        return node;
    }

    return find_right_most_leaf_node(child_nodes[child_nodes.length - 1]);
}

export function iterate_backward_and_skip(node: Node, skip: (element: Node) => boolean): Node | undefined {

    const previous_sibling_node = find_previous_sibling_node(node);

    if (previous_sibling_node === undefined) {
        return node.parent;
    }

    if (skip(previous_sibling_node) || previous_sibling_node.data_type === Node_data_type.String) {
        return previous_sibling_node;
    }

    return find_right_most_leaf_node(previous_sibling_node);
}

export function iterate_backward_and_skip_until(node: Node, skip: (element: Node) => boolean, is_node: (element: Node) => boolean): Node | undefined {

    let previous = iterate_backward_and_skip(node, skip);

    while (previous !== undefined && !is_node(previous)) {
        previous = iterate_backward_and_skip(previous, skip);
    }

    return previous;
}

export function iterate_backward(node: Node): Node | undefined {
    return iterate_backward_and_skip(node, _ => false);
}

export function iterate_forward_and_skip(node: Node, skip: (element: Node) => boolean): Node | undefined {

    if (node.data_type === Node_data_type.List && !skip(node)) {
        const child_nodes = (node.data as List_data).elements;
        if (child_nodes.length > 0) {
            return child_nodes[0];
        }
    }

    const next_sibling_node = find_next_sibling_node(node);
    if (next_sibling_node !== undefined) {
        return next_sibling_node;
    }

    let parent = node.parent;
    while (parent !== undefined) {

        const next_parent_sibling_node = find_next_sibling_node(parent);
        if (next_parent_sibling_node !== undefined) {
            return next_parent_sibling_node;
        }

        parent = parent.parent;
    }

    return undefined;
}

export function iterate_forward_and_skip_until(node: Node, skip: (element: Node) => boolean, is_node: (element: Node) => boolean): Node | undefined {

    let next = iterate_forward_and_skip(node, skip);

    while (next !== undefined && !is_node(next)) {
        next = iterate_forward_and_skip(next, skip);
    }

    return next;
}

export function iterate_forward(node: Node): Node | undefined {
    return iterate_forward_and_skip(node, _ => false);
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

export function create_list_node(parent: Node, index_in_parent: number, elements: Node[], metadata: Metadata): Node {
    return {
        data_type: Node_data_type.List,
        data: {
            elements: elements
        },
        parent: parent,
        index_in_parent: index_in_parent,
        metadata: metadata
    };
}

export function create_string_node(parent: Node, index_in_parent: number, value: string, metadata: Metadata): Node {
    return {
        data_type: Node_data_type.String,
        data: {
            value: value
        },
        parent: parent,
        index_in_parent: index_in_parent,
        metadata: metadata
    };
}

export function create_separator_node_tree(parent: Node, index_in_parent: number, separator: string): Node {
    return create_string_node(parent, index_in_parent, separator, { type: Metadata_type.Separator });
}

export function create_open_parenthesis_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, "(", { type: Metadata_type.Parenthesis_open });
}

export function create_close_parenthesis_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, ")", { type: Metadata_type.Parenthesis_close });
}

export function create_open_curly_braces_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, "{", { type: Metadata_type.Curly_braces_open });
}

export function create_close_curly_braces_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, "}", { type: Metadata_type.Curly_braces_close });
}

export function create_assignment_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, " = ", { type: Metadata_type.Assignment });
}

export function create_variable_keyword_node_tree(parent: Node, index_in_parent: number, is_mutable: boolean): Node {
    return create_string_node(parent, index_in_parent, is_mutable ? "mutable" : "var", { type: is_mutable ? Metadata_type.Variable_mutable_keyword : Metadata_type.Variable_keyword });
}

export function create_space_node_tree(parent: Node, index_in_parent: number): Node {
    return create_string_node(parent, index_in_parent, " ", { type: Metadata_type.Space });
}

export function create_variable_name_node_tree(parent: Node, index_in_parent: number, name: string): Node {
    return create_string_node(parent, index_in_parent, name, { type: Metadata_type.Variable_name });
}

export function create_variable_type_reference_node_tree(parent: Node, index_in_parent: number, module: Core.Module, type: Core.Type_reference): Node {
    const name = Core_helpers.getUnderlyingTypeName([module], type);
    return create_string_node(parent, index_in_parent, name, { type: Metadata_type.Variable_type });
}

export function create_variable_type_builtin_type_node_tree(parent: Node, index_in_parent: number, type: Core.Builtin_type_reference): Node {
    return create_string_node(parent, index_in_parent, type.value, { type: Metadata_type.Variable_type });
}

export function create_variable_type_node_tree(parent: Node, index_in_parent: number, module: Core.Module, type: Core.Type_reference): Node {

    switch (type.data.type) {
        case Core.Type_reference_enum.Builtin_type_reference:
            return create_variable_type_builtin_type_node_tree(parent, index_in_parent, type.data as Core.Builtin_type_reference);
        default:
            return create_variable_type_reference_node_tree(parent, index_in_parent, module, type);
    }
}

export function create_function_parameter_node_tree(parent: Node, index_in_parent: number, module: Core.Module, parameter_id: number, parameter_name: string, parameter_type: Core.Type_reference): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        data: {
            elements: []
        },
        parent: parent,
        index_in_parent: index_in_parent,
        metadata: {
            type: Metadata_type.Function_parameter
        }
    };

    root.data = {
        elements: [
            create_variable_name_node_tree(root, 0, parameter_name),
            create_separator_node_tree(root, 1, ": "),
            create_variable_type_node_tree(root, 2, module, parameter_type)
        ]
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
        data: {
            elements: []
        },
        parent: parent,
        metadata: {
            type: is_input_parameters_list ? Metadata_type.Function_input_parameter_list : Metadata_type.Function_output_parameter_list
        }
    };

    const parameters = parameter_ids.map((id, index) => {
        return create_function_parameter_node_tree(root, 0, module, id, parameter_names[index], parameter_types[index])
    });

    if (is_variadic) {
        const variadic_node = create_string_node(root, 0, variadic_symbol, { type: Metadata_type.Variadic_symbol });
        parameters.push(variadic_node);
    }

    interleave(parameters, [create_separator_node_tree(root, 0, separator)]);

    parameters.splice(0, 0, create_open_parenthesis_node_tree(root, 0));
    parameters.push(create_close_parenthesis_node_tree(root, 0));

    set_index_in_parent(parameters);

    root.data = {
        elements: parameters
    };

    return root;
}

export function create_function_declaration_node_tree(parent: Node | undefined, index_in_parent: number | undefined, module: Core.Module, function_declaration: Core.Function_declaration, variadic_symbol: string, separator: string): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: {
            elements: []
        },
        parent: parent,
        metadata: {
            type: Metadata_type.Function_declaration
        }
    };

    root.data = {
        elements: [
            create_string_node(root, 0, "function", { type: Metadata_type.Function_keyword }),
            create_string_node(root, 1, function_declaration.name, { type: Metadata_type.Function_name }),
            create_function_parameters_node_tree(root, 2, module, true, function_declaration.input_parameter_ids.elements, function_declaration.input_parameter_names.elements, function_declaration.type.input_parameter_types.elements, function_declaration.type.is_variadic, variadic_symbol, separator),
            create_string_node(root, 3, " -> ", { type: Metadata_type.Separator }),
            create_function_parameters_node_tree(root, 4, module, false, function_declaration.output_parameter_ids.elements, function_declaration.output_parameter_names.elements, function_declaration.type.output_parameter_types.elements, false, variadic_symbol, separator),
        ]
    };

    return root;
}

export function create_function_definition_node_tree(
    parent: Node | undefined,
    index_in_parent: number | undefined,
    module: Core.Module,
    function_definition: Core.Function_definition,
    function_declaration: Core.Function_declaration
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: {
            elements: []
        },
        parent: parent,
        metadata: {
            type: Metadata_type.Function_definition
        }
    };

    root.data = {
        elements: [
            create_code_block_node_tree(root, 0, module, function_declaration, function_definition.statements.elements, function_definition.statements.elements),
        ]
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
            const name = function_declaration.input_parameter_names.elements[parameter_index];
            return create_string_node(parent, index_in_parent, name, { type: Metadata_type.Expression_variable });
        }
    }
    else if (expression.type === Core.Variable_expression_type.Local_variable) {
        const statement = statements.find(statement => statement.id === expression.id);
        if (statement !== undefined) {
            return create_string_node(parent, index_in_parent, statement.name, { type: Metadata_type.Expression_variable });
        }
    }

    return create_string_node(parent, index_in_parent, "<not_found>", { type: Metadata_type.Expression_variable });
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
        data: {
            elements: []
        },
        parent: parent,
        metadata: {
            type: Metadata_type.Expression
        }
    };

    const expression = statement.expressions.elements[expression_index];

    if (expression.data.type === Core.Expression_enum.Binary_expression) {
        const binary_expression = expression.data.value as Core.Binary_expression;
        const binary_operation_string = get_binary_operation_string(binary_expression.operation);

        root.data = {
            elements: [
                create_expression_node_tree(root, 0, module, function_declaration, statements, statement, binary_expression.left_hand_side.expression_index),
                create_string_node(root, 1, binary_operation_string, { type: Metadata_type.Binary_operation }),
                create_expression_node_tree(root, 2, module, function_declaration, statements, statement, binary_expression.right_hand_side.expression_index),
            ]
        };
    }
    else if (expression.data.type === Core.Expression_enum.Constant_expression) {
        const constant_expression = expression.data.value as Core.Constant_expression;
        root.data = {
            elements: [
                create_string_node(root, 0, constant_expression.data, { type: Metadata_type.Expression_constant })
            ]
        };
    }
    else if (expression.data.type === Core.Expression_enum.Invalid_expression) {
        const invalid_expression = expression.data.value as Core.Invalid_expression;
        root.data = {
            elements: [
                create_string_node(root, 0, invalid_expression.value, { type: Metadata_type.Expression_invalid })
            ]
        };
    }
    else if (expression.data.type === Core.Expression_enum.Variable_expression) {
        root.data = {
            elements: [
                create_variable_expression_node_tree(root, 0, function_declaration, statements, expression.data.value as Core.Variable_expression)
            ]
        };
    }
    else if (expression.data.type === Core.Expression_enum.Return_expression) {
        const return_expression = expression.data.value as Core.Return_expression;
        root.data = {
            elements: [
                create_string_node(root, 0, "return", { type: Metadata_type.Expression_return }),
                create_expression_node_tree(root, 1, module, function_declaration, statements, statement, return_expression.expression.expression_index)
            ]
        };
    }
    else {
        throw Error("TODO Not implemented yet!");
    }

    return root;
}

export function create_variable_declaration_node_tree(parent: Node | undefined, index_in_parent: number | undefined, module: Core.Module, name: string, type: Core.Type_reference): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: {
            elements: []
        },
        parent: parent,
        metadata: {
            type: Metadata_type.Variable_declaration
        }
    };

    root.data = {
        elements: [
            create_variable_keyword_node_tree(root, 0, false),
            create_space_node_tree(root, 1),
            create_variable_name_node_tree(root, 2, name),
            create_separator_node_tree(root, 3, ": "),
            create_variable_type_node_tree(root, 4, module, type)
        ]
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
        data: {
            elements: []
        },
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
        root.data = {
            elements: [
                create_variable_declaration_node_tree(root, 0, module, statement.name, type_reference[0]),
                create_assignment_node_tree(root, 1),
                create_expression_node_tree(root, 2, module, function_declaration, statements, statement, 0)
            ]
        };
    }
    else {
        root.data = {
            elements: [
                create_expression_node_tree(root, 0, module, function_declaration, statements, statement, 0)
            ]
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
    code_block_statements: Core.Statement[]
): Node {

    const root: Node = {
        data_type: Node_data_type.List,
        index_in_parent: index_in_parent,
        data: {
            elements: []
        },
        parent: parent,
        metadata: {
            type: Metadata_type.Code_block
        }
    };

    const statements_node_tree = code_block_statements.map((statement, index) => create_statement_node_tree(root, index + 1, module, function_declaration, all_statements, statement));

    root.data = {
        elements: [
            create_open_curly_braces_node_tree(root, 0),
            ...statements_node_tree,
            create_close_curly_braces_node_tree(root, code_block_statements.length + 1),
        ]
    };

    return root;
}
