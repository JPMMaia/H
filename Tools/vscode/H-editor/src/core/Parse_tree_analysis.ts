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
        for (let index = 0; index < current_statement_index; ++index) {
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

        switch (core_statement.expression.data.type) {
            case Core.Expression_enum.Block_expression: {
                const expression = core_statement.expression.data.value as Core.Block_expression;
                const result = go_to_next_block(variable_node_position, current_statements_block_node, current_statements_block_position, "Expression_block_statements");
                if (result === undefined) {
                    break;
                }
                current_statements_block_node = result.node;
                current_statements_block_position = result.position;
                current_statements_block = expression.statements;
            }
            case Core.Expression_enum.For_loop_expression: {
                const expression = core_statement.expression.data.value as Core.For_loop_expression;
                const result = go_to_next_block(variable_node_position, current_statements_block_node, current_statements_block_position, "Expression_for_loop_statements");
                if (result === undefined) {
                    break;
                }
                current_statements_block_node = result.node;
                current_statements_block_position = result.position;
                current_statements_block = expression.then_statements;
            }
            case Core.Expression_enum.If_expression: {
                const expression = core_statement.expression.data.value as Core.If_expression;
                const result = go_to_next_block(variable_node_position, current_statements_block_node, current_statements_block_position, "Expression_if_statements");
                if (result === undefined) {
                    break;
                }
                // TODO find which serie
                current_statements_block = expression.series[0].then_statements;
            }
            case Core.Expression_enum.Switch_expression: {
                const expression = core_statement.expression.data.value as Core.Switch_expression;
                const result = go_to_next_block(variable_node_position, current_statements_block_node, current_statements_block_position, "Expression_switch_case_statements");
                if (result === undefined) {
                    break;
                }
                // TODO find which case
                current_statements_block = expression.cases[0].statements;
            }
            case Core.Expression_enum.While_loop_expression: {
                const expression = core_statement.expression.data.value as Core.While_loop_expression;
                const result = go_to_next_block(variable_node_position, current_statements_block_node, current_statements_block_position, "Expression_while_loop_statements");
                if (result === undefined) {
                    break;
                }
                current_statements_block_node = result.node;
                current_statements_block_position = result.position;
                current_statements_block = expression.then_statements;
            }
            default: {
                current_statements_block = undefined;
            }
        }

        if (current_statements_block !== undefined) {
            current_statement_index = variable_node_position[current_statements_block_position.length];
        }
    }

    return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

function go_to_next_block(
    before_cursor_node_position: number[],
    current_node: Parser_node.Node,
    current_node_position: number[],
    statements_label: string
): { node: Parser_node.Node, position: number[] } | undefined {

    while (current_node_position.length < before_cursor_node_position.length) {
        const child_index = before_cursor_node_position[current_node_position.length];
        const child_node = current_node.children[child_index];
        current_node_position = [...current_node_position, child_index];

        if (child_node.word.value === statements_label) {
            return { node: child_node, position: current_node_position };
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