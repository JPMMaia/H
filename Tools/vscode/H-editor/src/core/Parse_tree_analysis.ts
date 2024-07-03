import * as Core from "./Core_intermediate_representation";
import * as Parser_node from "./Parser_node";

export function find_variable_type(
    function_value: Core.Function,
    root: Parser_node.Node,
    variable_node_position: number[],
    variable_name: string
): Core.Type_reference | undefined {

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

    const statements = Parser_node.get_ancestor_with_name(root, variable_node_position, "Statements");
    if (statements === undefined) {
        return undefined;
    }

    let current_statements_block: Core.Statement[] | undefined = function_value.definition.statements;
    let current_statements_block_node = statements.node;
    let current_statements_block_position = statements.position;
    let current_statement_index = variable_node_position[current_statements_block_position.length];

    while (current_statements_block !== undefined && current_statement_index < current_statements_block.length) {
        for (let index = 0; index <= current_statement_index; ++index) {
            const core_statement = current_statements_block[index];

            if (core_statement.expression.data.type === Core.Expression_enum.Variable_declaration_expression) {
                const expression = core_statement.expression.data.value as Core.Variable_declaration_expression;
                if (expression.name === variable_name) {
                    const expression_type = get_expression_type(expression.right_hand_side);
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
                    const expression_type = get_expression_type(expression.range_begin);
                    if (expression_type !== undefined) {
                        matches.push(expression_type);
                    }
                }
            }
        }

        const core_statement = current_statements_block[current_statement_index];
        const result = go_to_next_block_with_expression(core_statement, root, variable_node_position, current_statements_block_node, current_statements_block_position);
        if (result === undefined) {
            break;
        }
        current_statements_block_node = result.node;
        current_statements_block_position = result.position;
        current_statements_block = result.statements;
        current_statement_index = variable_node_position[current_statements_block_position.length];
    }

    return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

function go_to_next_block_with_expression(
    core_statement: Core.Statement,
    root: Parser_node.Node,
    variable_node_position: number[],
    current_node: Parser_node.Node,
    current_node_position: number[]
): { node: Parser_node.Node, position: number[], statements: Core.Statement[] } | undefined {
    switch (core_statement.expression.data.type) {
        case Core.Expression_enum.Block_expression: {
            const expression = core_statement.expression.data.value as Core.Block_expression;
            const result = go_to_next_block(variable_node_position, current_node, current_node_position, "Expression_block_statements");
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
            const result = go_to_next_block(variable_node_position, current_node, current_node_position, "Expression_for_loop_statements");
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
            const result = go_to_next_block(variable_node_position, current_node, current_node_position, "Expression_if_statements");
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
            const result = go_to_next_block(variable_node_position, current_node, current_node_position, "Expression_switch_case_statements");
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
            const result = go_to_next_block(variable_node_position, current_node, current_node_position, "Expression_while_loop_statements");
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

export function get_expression_type(expression: Core.Expression): Core.Type_reference | undefined {

    switch (expression.data.type) {
        case Core.Expression_enum.Access_expression: {
            // TODO
            return undefined;
        }
        case Core.Expression_enum.Binary_expression: {
            // TODO
            return undefined;
        }
        case Core.Expression_enum.Call_expression: {
            // TODO
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
            return get_expression_type(value.expression);
        }
        case Core.Expression_enum.Ternary_condition_expression: {
            const value = expression.data.value as Core.Ternary_condition_expression;
            return get_expression_type(value.then_statement.expression);
        }
        case Core.Expression_enum.Unary_expression: {
            // TODO
            return undefined;
        }
        case Core.Expression_enum.Variable_expression: {
            // TODO
            return undefined;
        }
    }

    return undefined;
}