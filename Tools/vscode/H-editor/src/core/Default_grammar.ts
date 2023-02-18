import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Core from "../utilities/coreModelInterface";
import * as Grammar from "./Grammar";
import * as Symbol_database from "./Symbol_database";

export function create_grammar(): Grammar.Grammar {

    const keywords = [
        "defer",
        "for",
        "function",
        "if",
        "mutable",
        "return",
        "switch",
        "var",
        "while"
    ];

    const operators = [
        "&",
        "&=",
        "|",
        "|=",
        "^",
        "^=",
        "~",
        "&&",
        "||",
        "=",
        "+",
        "++",
        "+=",
        "-",
        "-=",
        "--",
        "*",
        "*=",
        "/",
        "/=",
        "%",
        "%=",
        "!",
        "==",
        "!=",
        "<",
        "<=",
        ">",
        ">=",
        "?",
        ".",
        ',',
        ';',
        "\"",
        "\'",
        '(',
        ')',
        '{',
        '}',
        '[',
        ']',
    ];

    const grammar: Grammar.Grammar = {
        is_binary_operator: is_binary_operator,

        create_function_declaration_node: create_function_declaration_node,
        create_function_parameters_node: create_function_parameters_node,
        create_function_parameter_node: create_function_parameter_node,
        create_code_block_node: create_code_block_node,
        create_statement_node: create_statement_node,

        create_binary_expression_node: create_binary_expression_node,
        create_constant_expression_node: create_constant_expression_node,
        create_return_expression_node: create_return_expression_node,
        create_variable_expression_node: create_variable_expression_node
    };

    return grammar;
}

function create_node(value: string, token: Abstract_syntax_tree.Token, children: Abstract_syntax_tree.Node[]): Abstract_syntax_tree.Node {
    return {
        value: value,
        token: token,
        children: children,
        cache: {
            relative_start: 0
        }
    };
}

function is_binary_operator(word: string): boolean {
    switch (word) {
        case "+":
        case "-":
        case "*":
        case "/":
        case "%":
            return true;
        default:
            return false;
    }
}

function create_function_declaration_node(declaration: Core.Function_declaration, input_parameters_node: Abstract_syntax_tree.Node, output_parameters_node: Abstract_syntax_tree.Node): Abstract_syntax_tree.Node {

    const children: Abstract_syntax_tree.Node[] = [
        create_node("function", Abstract_syntax_tree.Token.Function_declaration_keyword, []),
        create_node(declaration.name, Abstract_syntax_tree.Token.Function_declaration_name, []),
        input_parameters_node,
        create_node("->", Abstract_syntax_tree.Token.Function_declaration_parameters_separator, []),
        output_parameters_node,
    ];

    return create_node("", Abstract_syntax_tree.Token.Function_declaration, children);
}

function create_function_parameters_node(parameter_nodes: Abstract_syntax_tree.Node[], is_input_parameters: boolean): Abstract_syntax_tree.Node {

    const separator = create_node(",", Abstract_syntax_tree.Token.Function_parameters_separator, []);

    interleave(parameter_nodes, [separator]);

    const children: Abstract_syntax_tree.Node[] = [
        create_node("(", Abstract_syntax_tree.Token.Function_parameters_open_keyword, []),
        ...parameter_nodes,
        create_node(")", Abstract_syntax_tree.Token.Function_parameters_close_keyword, []),
    ];

    return create_node("", is_input_parameters ? Abstract_syntax_tree.Token.Function_declaration_input_parameters : Abstract_syntax_tree.Token.Function_declaration_output_parameters, children);
}

function create_function_parameter_node(name: string, type: string): Abstract_syntax_tree.Node {

    const children: Abstract_syntax_tree.Node[] = [
        create_node(name, Abstract_syntax_tree.Token.Function_parameter_name, []),
        create_node(":", Abstract_syntax_tree.Token.Function_parameter_separator, []),
        create_node(type, Abstract_syntax_tree.Token.Function_parameter_separator, []),
    ];

    return create_node("", Abstract_syntax_tree.Token.Function_parameter, children);
}

function create_code_block_node(statement_nodes: Abstract_syntax_tree.Node[]): Abstract_syntax_tree.Node {
    const children: Abstract_syntax_tree.Node[] = [
        create_node("{", Abstract_syntax_tree.Token.Code_block_open_keyword, []),
        ...statement_nodes,
        create_node("}", Abstract_syntax_tree.Token.Code_block_close_keyword, [])
    ];

    return create_node("", Abstract_syntax_tree.Token.Code_block, children);
}

function create_statement_node(statement: Core.Statement, symbol: Symbol_database.Symbol | undefined, expression: Abstract_syntax_tree.Node): Abstract_syntax_tree.Node {

    if (symbol !== undefined) {

        const children: Abstract_syntax_tree.Node[] = [
            create_node("var", Abstract_syntax_tree.Token.Expression_variable_declaration_keyword, []),
            create_node(symbol.name, Abstract_syntax_tree.Token.Expression_variable_declaration_name, []),
            create_node("=", Abstract_syntax_tree.Token.Expression_variable_declaration_assignment, []),
            expression,
            create_node(";", Abstract_syntax_tree.Token.Statement_end, []),
        ];

        return create_node("", Abstract_syntax_tree.Token.Statement, children);
    }
    else {

        const children: Abstract_syntax_tree.Node[] = [
            expression,
            create_node(";", Abstract_syntax_tree.Token.Statement_end, []),
        ];

        return create_node("", Abstract_syntax_tree.Token.Statement, children);
    }
}

function get_binary_operator_string(operation: Core.Binary_operation): string {
    switch (operation) {
        case Core.Binary_operation.Add: return "+";
        case Core.Binary_operation.Subtract: return "-";
        case Core.Binary_operation.Multiply: return "*";
        case Core.Binary_operation.Signed_divide: return "/";
        case Core.Binary_operation.Unsigned_divide: return "/";
        case Core.Binary_operation.Less_than: return "<";
    }
}

function create_binary_expression_node(expression: Core.Binary_expression, left_operand: Abstract_syntax_tree.Node, right_operand: Abstract_syntax_tree.Node): Abstract_syntax_tree.Node {

    const operator_value = get_binary_operator_string(expression.operation);

    const children: Abstract_syntax_tree.Node[] = [
        left_operand,
        create_node(operator_value, Abstract_syntax_tree.Token.Expression_binary_operation_keyword, []),
        right_operand
    ];

    return create_node("", Abstract_syntax_tree.Token.Expression_binary_operation, children);
}

function create_constant_expression_node(expression: Core.Constant_expression): Abstract_syntax_tree.Node {
    const value = expression.data;
    return create_node(value, Abstract_syntax_tree.Token.Expression_constant, []);
}

function create_return_expression_node(expression: Core.Return_expression, what: Abstract_syntax_tree.Node | undefined): Abstract_syntax_tree.Node {

    const children: Abstract_syntax_tree.Node[] = [
        create_node("return", Abstract_syntax_tree.Token.Expression_return_keyword, [])
    ];

    if (what !== undefined) {
        children.push(what);
    }

    return create_node("", Abstract_syntax_tree.Token.Expression_return, children);
}

function create_variable_expression_node(expression: Core.Variable_expression, symbol: Symbol_database.Symbol): Abstract_syntax_tree.Node {
    return create_node(symbol.name, Abstract_syntax_tree.Token.Expression_variable_reference, []);
}

function interleave(array: any[], elements: any[]): void {
    for (let index = 1; index < array.length; index += 2) {
        array.splice(index, 0, ...elements);
    }
}
