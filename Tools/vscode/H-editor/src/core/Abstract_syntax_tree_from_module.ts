import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Core from "../utilities/coreModelInterface";
import * as Core_helpers from "../utilities/coreModelInterfaceHelpers";
import * as Grammar from "./Grammar";
import * as Symbol_database from "./Symbol_database";

import { onThrowError } from "../utilities/errors";

export function create_module_node(module: Core.Module, symbol_database: Symbol_database.Edit_module_database, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {

    const children: Abstract_syntax_tree.Node[] = [
        create_module_body_node(module, symbol_database, grammar)
    ];

    return create_node("", Abstract_syntax_tree.Token.Module, children);
}

export function create_module_body_node(module: Core.Module, symbol_database: Symbol_database.Edit_module_database, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {

    const export_function_definitions = module.export_declarations.function_declarations.elements.map(declaration => Core_helpers.find_function_definition(module, Core_helpers.create_function_reference(module, declaration.id)));
    const export_functions = module.export_declarations.function_declarations.elements.map((declaration, index) => create_function_node(symbol_database, declaration, export_function_definitions[index], grammar));

    const internal_function_definitions = module.internal_declarations.function_declarations.elements.map(declaration => Core_helpers.find_function_definition(module, Core_helpers.create_function_reference(module, declaration.id)));
    const internal_functions = module.internal_declarations.function_declarations.elements.map((declaration, index) => create_function_node(symbol_database, declaration, internal_function_definitions[index], grammar));

    const children: Abstract_syntax_tree.Node[] = [
        ...export_functions,
        ...internal_functions
    ];

    return create_node("", Abstract_syntax_tree.Token.Module_body, children);
}

export function create_function_node(symbol_database: Symbol_database.Edit_module_database, declaration: Core.Function_declaration, definition: Core.Function_definition, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {

    const children: Abstract_syntax_tree.Node[] = [
        create_function_declaration_node(symbol_database, declaration, grammar),
        create_function_definition_node(symbol_database, declaration, definition, grammar)
    ];

    return create_node("", Abstract_syntax_tree.Token.Function, children);
}

export function create_function_declaration_node(symbol_database: Symbol_database.Edit_module_database, declaration: Core.Function_declaration, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {

    const input_parameters = create_function_parameters_node(symbol_database, declaration.input_parameter_ids.elements, declaration.input_parameter_names.elements, declaration.type.input_parameter_types.elements, true, grammar);
    const output_parameters = create_function_parameters_node(symbol_database, declaration.output_parameter_ids.elements, declaration.output_parameter_names.elements, declaration.type.output_parameter_types.elements, false, grammar);

    return grammar.create_function_declaration_node(declaration, input_parameters, output_parameters);
}

export function create_function_parameters_node(symbol_database: Symbol_database.Edit_module_database, parameter_ids: number[], parameter_names: string[], parameter_types: Core.Type_reference[], is_input_parameters: boolean, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {

    const parameter_nodes = parameter_ids.map((id, index) => {
        const name = parameter_names[index];
        const type = parameter_types[index];

        const type_symbol = Symbol_database.find_type_symbol(symbol_database, [type]);

        return grammar.create_function_parameter_node(name, type_symbol.name);
    });

    return grammar.create_function_parameters_node(parameter_nodes, is_input_parameters);
}

export function create_function_definition_node(symbol_database: Symbol_database.Edit_module_database, declaration: Core.Function_declaration, definition: Core.Function_definition, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {
    return create_code_block_node(symbol_database, declaration, definition.statements.elements, grammar);
}

export function create_code_block_node(symbol_database: Symbol_database.Edit_module_database, declaration: Core.Function_declaration, statements: Core.Statement[], grammar: Grammar.Grammar): Abstract_syntax_tree.Node {
    const statement_nodes = statements.map((statement, statement_index) => create_statement_node(symbol_database, declaration, statements, statement_index, grammar));
    return grammar.create_code_block_node(statement_nodes);
}

export function create_statement_node(symbol_database: Symbol_database.Edit_module_database, declaration: Core.Function_declaration, statements: Core.Statement[], statement_index: number, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {

    const statement = statements[statement_index];
    const expression_node = create_expression_node(symbol_database, declaration, statements, statement_index, statement, 0, grammar);
    const statement_symbol = Symbol_database.find_statement_symbol(symbol_database, declaration, statements, statement_index);
    return grammar.create_statement_node(statement, statement_symbol, expression_node);
}

export function create_expression_node(symbol_database: Symbol_database.Edit_module_database, declaration: Core.Function_declaration, statements: Core.Statement[], statement_index: number, statement: Core.Statement, expression_index: number, grammar: Grammar.Grammar): Abstract_syntax_tree.Node {

    const expression = statement.expressions.elements[expression_index];

    if (expression.data.type === Core.Expression_enum.Binary_expression) {
        const binary_expression = expression.data.value as Core.Binary_expression;

        const left_operand = create_expression_node(symbol_database, declaration, statements, statement_index, statement, binary_expression.left_hand_side.expression_index, grammar);
        const right_operand = create_expression_node(symbol_database, declaration, statements, statement_index, statement, binary_expression.right_hand_side.expression_index, grammar);
        return grammar.create_binary_expression_node(binary_expression, left_operand, right_operand);
    }
    else if (expression.data.type === Core.Expression_enum.Constant_expression) {
        const constant_expression = expression.data.value as Core.Constant_expression;

        return grammar.create_constant_expression_node(constant_expression);
    }
    else if (expression.data.type === Core.Expression_enum.Return_expression) {
        const return_expression = expression.data.value as Core.Return_expression;

        const what = return_expression.expression.expression_index !== -1 ? create_expression_node(symbol_database, declaration, statements, statement_index, statement, return_expression.expression.expression_index, grammar) : undefined;
        return grammar.create_return_expression_node(return_expression, what);
    }
    else if (expression.data.type === Core.Expression_enum.Variable_expression) {
        const variable_expression = expression.data.value as Core.Variable_expression;

        const variable_symbol = Symbol_database.find_variable_symbol(symbol_database, declaration, statements, statement_index, variable_expression);
        return grammar.create_variable_expression_node(variable_expression, variable_symbol);
    }
    else {
        const message = "Not implemented!";
        onThrowError(message);
        throw Error(message);
    }
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
