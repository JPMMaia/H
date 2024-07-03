import * as Core from "./Core_intermediate_representation";
import * as Parser_node from "./Parser_node";

export async function find_variable_type(
    core_module: Core.Module,
    function_value: Core.Function,
    root: Parser_node.Node,
    scope_node_position: number[],
    variable_name: string,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Core.Type_reference | undefined> {

    if (function_value.definition === undefined) {
        return undefined;
    }

    const matches: Core.Type_reference[] = [];

    {
        const index = function_value.declaration.input_parameter_names.findIndex(name => name === variable_name);
        if (index !== -1) {
            const type = function_value.declaration.type.input_parameter_types[index];
            matches.push(type);
        }
    }

    const statements = Parser_node.get_ancestor_with_name(root, scope_node_position, "Statements");
    if (statements === undefined) {
        return undefined;
    }

    let current_statements_block: Core.Statement[] | undefined = function_value.definition.statements;
    let current_statements_block_node = statements.node;
    let current_statements_block_position = statements.position;
    let current_statement_index = scope_node_position[current_statements_block_position.length];

    while (current_statements_block !== undefined && current_statement_index < current_statements_block.length) {
        for (let index = 0; index <= current_statement_index; ++index) {
            const core_statement = current_statements_block[index];

            if (core_statement.expression.data.type === Core.Expression_enum.Variable_declaration_expression) {
                const expression = core_statement.expression.data.value as Core.Variable_declaration_expression;
                if (expression.name === variable_name) {
                    const expression_type = await get_expression_type(core_module, function_value, root, scope_node_position, expression.right_hand_side, get_core_module);
                    if (expression_type !== undefined) {
                        matches.push(expression_type);
                    }
                }
            }
            else if (core_statement.expression.data.type === Core.Expression_enum.Variable_declaration_with_type_expression) {
                const expression = core_statement.expression.data.value as Core.Variable_declaration_with_type_expression;
                if (expression.name === variable_name) {
                    matches.push(expression.type);
                }
            }
            else if (core_statement.expression.data.type === Core.Expression_enum.For_loop_expression) {
                const expression = core_statement.expression.data.value as Core.For_loop_expression;
                if (expression.variable_name === variable_name) {
                    const expression_type = await get_expression_type(core_module, function_value, root, scope_node_position, expression.range_begin, get_core_module);
                    if (expression_type !== undefined) {
                        matches.push(expression_type);
                    }
                }
            }
        }

        const core_statement = current_statements_block[current_statement_index];
        const result = go_to_next_block_with_expression(core_statement, root, scope_node_position, current_statements_block_node, current_statements_block_position);
        if (result === undefined) {
            break;
        }
        current_statements_block_node = result.node;
        current_statements_block_position = result.position;
        current_statements_block = result.statements;
        current_statement_index = scope_node_position[current_statements_block_position.length];
    }

    return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

function go_to_next_block_with_expression(
    core_statement: Core.Statement,
    root: Parser_node.Node,
    scope_node_position: number[],
    current_node: Parser_node.Node,
    current_node_position: number[]
): { node: Parser_node.Node, position: number[], statements: Core.Statement[] } | undefined {
    switch (core_statement.expression.data.type) {
        case Core.Expression_enum.Block_expression: {
            const expression = core_statement.expression.data.value as Core.Block_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_block_statements");
            if (result !== undefined) {
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.statements
                };
            }
            break;
        }
        case Core.Expression_enum.For_loop_expression: {
            const expression = core_statement.expression.data.value as Core.For_loop_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_for_loop_statements");
            if (result !== undefined) {
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.then_statements
                };
            }
            break;
        }
        case Core.Expression_enum.If_expression: {
            const expression = core_statement.expression.data.value as Core.If_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_if_statements");
            if (result !== undefined) {
                const serie_index = get_if_serie_index(root, result.position);
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.series[serie_index].then_statements
                };
            }
            break;
        }
        case Core.Expression_enum.Switch_expression: {
            const expression = core_statement.expression.data.value as Core.Switch_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_switch_case_statements");
            if (result !== undefined) {
                const switch_case_index = result.position[result.position.length - 2];
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.cases[switch_case_index].statements
                };
            }
            break;
        }
        case Core.Expression_enum.While_loop_expression: {
            const expression = core_statement.expression.data.value as Core.While_loop_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_while_loop_statements");
            if (result !== undefined) {
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.then_statements
                };
            }
            break;
        }
    }

    return undefined;
}

function get_if_serie_index(
    root: Parser_node.Node,
    node_position: number[]
): number {
    let serie_index = 0;

    let current_node_position = Parser_node.get_parent_position(node_position);

    for (let position_index = 0; position_index < node_position.length; ++position_index) {

        const current_node = Parser_node.get_node_at_position(root, current_node_position);

        if (current_node.word.value === "Expression_if_else") {
            serie_index += 1;
        }
        else if (current_node.word.value === "Statement") {
            break;
        }

        current_node_position = Parser_node.get_parent_position(current_node_position);
    }

    return serie_index;
}

function go_to_next_block(
    before_cursor_node_position: number[],
    current_node: Parser_node.Node,
    current_node_position: number[],
    statements_label: string
): { node: Parser_node.Node, position: number[] } | undefined {

    while (current_node_position.length < before_cursor_node_position.length) {
        const child_index = before_cursor_node_position[current_node_position.length];
        current_node = current_node.children[child_index];
        current_node_position = [...current_node_position, child_index];

        if (current_node.word.value === statements_label) {
            return { node: current_node, position: current_node_position };
        }
    }

    return undefined;
}

export async function get_expression_type(
    core_module: Core.Module,
    function_value: Core.Function,
    root: Parser_node.Node,
    scope_node_position: number[],
    expression: Core.Expression,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Core.Type_reference | undefined> {

    switch (expression.data.type) {
        case Core.Expression_enum.Access_expression: {
            const value = expression.data.value as Core.Access_expression;

            if (value.expression.data.type === Core.Expression_enum.Variable_expression) {
                const variable_expression = value.expression.data.value as Core.Variable_expression;
                const import_module = core_module.imports.find(import_module => import_module.alias === variable_expression.name);
                if (import_module !== undefined) {
                    const custom_type_reference = {
                        module_reference: {
                            name: import_module.module_name
                        },
                        name: value.member_name
                    };
                    const declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
                    if (declaration !== undefined) {
                        if (declaration.type === Core.Declaration_type.Function) {
                            const function_value = declaration.value as Core.Function;
                            return {
                                data: {
                                    type: Core.Type_reference_enum.Function_type,
                                    value: function_value.declaration.type
                                }
                            };
                        }
                    }
                }
            }

            const left_hand_side_type = await get_expression_type(core_module, function_value, root, scope_node_position, value.expression, get_core_module);
            if (left_hand_side_type !== undefined) {
                if (left_hand_side_type.data.type === Core.Type_reference_enum.Custom_type_reference) {
                    const custom_type_reference = left_hand_side_type.data.value as Core.Custom_type_reference;
                    const declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
                    if (declaration !== undefined) {
                        const underlying_declaration = get_underlying_type_declaration(declaration);
                        if (underlying_declaration !== undefined) {
                            if (declaration.type === Core.Declaration_type.Struct) {
                                const struct_declaration = declaration.value as Core.Struct_declaration;
                                const member_index = struct_declaration.member_names.findIndex(member_name => member_name === value.member_name);
                                if (member_index !== -1) {
                                    return struct_declaration.member_types[member_index];
                                }
                            }
                            else if (declaration.type === Core.Declaration_type.Union) {
                                const union_declaration = declaration.value as Core.Union_declaration;
                                const member_index = union_declaration.member_names.findIndex(member_name => member_name === value.member_name);
                                if (member_index !== -1) {
                                    return union_declaration.member_types[member_index];
                                }
                            }
                            else if (declaration.type === Core.Declaration_type.Function) {
                                const function_value = declaration.value as Core.Function;
                                return {
                                    data: {
                                        type: Core.Type_reference_enum.Function_type,
                                        value: function_value.declaration.type
                                    }
                                };
                            }
                        }
                    }
                }
            }
            break;
        }
        case Core.Expression_enum.Binary_expression: {
            const value = expression.data.value as Core.Binary_expression;

            switch (value.operation) {
                case Core.Binary_operation.Equal:
                case Core.Binary_operation.Not_equal:
                case Core.Binary_operation.Less_than:
                case Core.Binary_operation.Less_than_or_equal_to:
                case Core.Binary_operation.Greater_than:
                case Core.Binary_operation.Greater_than_or_equal_to:
                case Core.Binary_operation.Logical_and:
                case Core.Binary_operation.Logical_or:
                case Core.Binary_operation.Has:
                    return create_boolean_type();
            }

            return get_expression_type(core_module, function_value, root, scope_node_position, value.left_hand_side, get_core_module);
        }
        case Core.Expression_enum.Call_expression: {
            const value = expression.data.value as Core.Call_expression;
            const left_hand_side_type = await get_expression_type(core_module, function_value, root, scope_node_position, value.expression, get_core_module);
            if (left_hand_side_type !== undefined) {
                if (left_hand_side_type.data.type === Core.Type_reference_enum.Function_type) {
                    const function_type = left_hand_side_type.data.value as Core.Function_type;
                    if (function_type.output_parameter_types.length > 0) {
                        // TODO multiple return types
                        return function_type.output_parameter_types[0];
                    }
                }
            }
            return undefined;
        }
        case Core.Expression_enum.Cast_expression: {
            const value = expression.data.value as Core.Cast_expression;
            return value.destination_type;
        }
        case Core.Expression_enum.Constant_array_expression: {
            const value = expression.data.value as Core.Constant_array_expression;
            return value.type;
        }
        case Core.Expression_enum.Constant_expression: {
            const value = expression.data.value as Core.Constant_expression;
            return value.type;
        }
        case Core.Expression_enum.Parenthesis_expression: {
            const value = expression.data.value as Core.Parenthesis_expression;
            return get_expression_type(core_module, function_value, root, scope_node_position, value.expression, get_core_module);
        }
        case Core.Expression_enum.Ternary_condition_expression: {
            const value = expression.data.value as Core.Ternary_condition_expression;
            return get_expression_type(core_module, function_value, root, scope_node_position, value.then_statement.expression, get_core_module);
        }
        case Core.Expression_enum.Unary_expression: {
            const value = expression.data.value as Core.Unary_expression;
            const expression_type = await get_expression_type(core_module, function_value, root, scope_node_position, value.expression, get_core_module);
            if (expression_type !== undefined) {
                if (value.operation === Core.Unary_operation.Address_of) {
                    return create_pointer_type([expression_type], false);
                }
                else if (value.operation === Core.Unary_operation.Indirection) {
                    if (expression_type.data.type === Core.Type_reference_enum.Pointer_type) {
                        const pointer_type = expression_type.data.value as Core.Pointer_type;
                        if (pointer_type.element_type.length > 0) {
                            return pointer_type.element_type[0];
                        }
                    }
                }
                else {
                    return expression_type;
                }
            }
            break;
        }
        case Core.Expression_enum.Variable_expression: {
            const value = expression.data.value as Core.Variable_expression;
            return find_variable_type(core_module, function_value, root, scope_node_position, value.name, get_core_module);
        }
    }

    return undefined;
}

async function get_custom_type_reference_declaration(
    custom_type_reference: Core.Custom_type_reference,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Core.Declaration | undefined> {

    const core_module = await get_core_module(custom_type_reference.module_reference.name);
    if (core_module === undefined) {
        return undefined;
    }

    const declaration = core_module.declarations.find(declaration => declaration.name === custom_type_reference.name);
    return declaration;
}

function get_underlying_type_declaration(
    declaration: Core.Declaration
): Core.Declaration | undefined {
    // TODO if declaration is alias, then get declaration recursively until it's not an alias
    return declaration;
}

function create_pointer_type(element_type: Core.Type_reference[], is_mutable: boolean): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Pointer_type,
            value: {
                element_type: element_type,
                is_mutable: is_mutable
            }
        }
    };
}

function create_boolean_type(): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Fundamental_type,
            value: Core.Fundamental_type.Bool
        }
    };
}

function create_custom_type_reference(module_name: string, name: string): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Custom_type_reference,
            value: {
                module_reference: {
                    name: module_name
                },
                name: name
            }
        }
    };
}
