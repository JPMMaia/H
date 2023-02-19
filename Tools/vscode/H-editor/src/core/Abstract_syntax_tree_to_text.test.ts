import "mocha";

import * as assert from "assert";

import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Abstract_syntax_tree_to_text from "./Abstract_syntax_tree_to_text";

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

function create_add_function_node(name: string): Abstract_syntax_tree.Node {
    const declaration: Abstract_syntax_tree.Node[] = [
        create_node("function", Abstract_syntax_tree.Token.Function_declaration_keyword, []),
        create_node(name, Abstract_syntax_tree.Token.Function_declaration_name, []),
        create_node("", Abstract_syntax_tree.Token.Function_declaration_input_parameters, [
            create_node("(", Abstract_syntax_tree.Token.Function_parameters_open_keyword, []),
            create_node("", Abstract_syntax_tree.Token.Function_parameter, [
                create_node("first", Abstract_syntax_tree.Token.Function_parameter_name, []),
                create_node(":", Abstract_syntax_tree.Token.Function_parameter_separator, []),
                create_node("int32", Abstract_syntax_tree.Token.Function_parameter_type, []),
            ]),
            create_node(",", Abstract_syntax_tree.Token.Function_parameters_separator, []),
            create_node("", Abstract_syntax_tree.Token.Function_parameter, [
                create_node("second", Abstract_syntax_tree.Token.Function_parameter_name, []),
                create_node(":", Abstract_syntax_tree.Token.Function_parameter_separator, []),
                create_node("int32", Abstract_syntax_tree.Token.Function_parameter_type, []),
            ]),
            create_node(")", Abstract_syntax_tree.Token.Function_parameters_open_keyword, []),
        ]),
        create_node("->", Abstract_syntax_tree.Token.Function_declaration_parameters_separator, []),
        create_node("", Abstract_syntax_tree.Token.Function_declaration_output_parameters, [
            create_node("(", Abstract_syntax_tree.Token.Function_parameters_open_keyword, []),
            create_node("", Abstract_syntax_tree.Token.Function_parameter, [
                create_node("result", Abstract_syntax_tree.Token.Function_parameter_name, []),
                create_node(":", Abstract_syntax_tree.Token.Function_parameter_separator, []),
                create_node("int32", Abstract_syntax_tree.Token.Function_parameter_type, []),
            ]),
            create_node(")", Abstract_syntax_tree.Token.Function_parameters_open_keyword, []),
        ]),
    ];

    const definition: Abstract_syntax_tree.Node[] = [
        create_node("{", Abstract_syntax_tree.Token.Code_block_open_keyword, []),
        create_node("", Abstract_syntax_tree.Token.Statement, [
            create_node("", Abstract_syntax_tree.Token.Expression_variable_declaration, [
                create_node("var", Abstract_syntax_tree.Token.Expression_variable_declaration_keyword, []),
                create_node("result", Abstract_syntax_tree.Token.Expression_variable_declaration_name, []),
                create_node("=", Abstract_syntax_tree.Token.Expression_variable_declaration_assignment, []),
                create_node("", Abstract_syntax_tree.Token.Expression_binary_operation, [
                    create_node("first", Abstract_syntax_tree.Token.Expression_variable_reference, []),
                    create_node("+", Abstract_syntax_tree.Token.Expression_binary_operation_keyword, []),
                    create_node("second", Abstract_syntax_tree.Token.Expression_variable_reference, []),
                ]),
            ]),
            create_node(";", Abstract_syntax_tree.Token.Statement_end, [])
        ]),
        create_node("", Abstract_syntax_tree.Token.Statement, [
            create_node("", Abstract_syntax_tree.Token.Expression_return, [
                create_node("return", Abstract_syntax_tree.Token.Expression_return_keyword, []),
                create_node("result", Abstract_syntax_tree.Token.Expression_variable_reference, []),
            ]),
            create_node(";", Abstract_syntax_tree.Token.Statement_end, [])
        ]),
        create_node("}", Abstract_syntax_tree.Token.Code_block_close_keyword, []),
    ];

    return create_node("", Abstract_syntax_tree.Token.Function, [
        create_node("", Abstract_syntax_tree.Token.Function_declaration, declaration),
        create_node("", Abstract_syntax_tree.Token.Code_block, definition)
    ]);
}

function create_module_with_functions(): Abstract_syntax_tree.Node {

    const functions: Abstract_syntax_tree.Node[] = [
        create_add_function_node("add_0"),
        create_add_function_node("add_1")
    ];

    const module_body: Abstract_syntax_tree.Node[] = [
        create_node("", Abstract_syntax_tree.Token.Module_body, functions),
    ];

    return create_node("", Abstract_syntax_tree.Token.Module, module_body);
}

describe("Abstract_syntax_tree_to_text.to_string", () => {
    it("caches relative offset of nodes correctly", () => {

        const module_node = create_module_with_functions();

        const text = Abstract_syntax_tree_to_text.to_string(module_node);

        {
            assert.equal(module_node.cache.relative_start, 0);
        }

        const module_body_node = module_node.children[0];

        {
            assert.equal(module_body_node.cache.relative_start, 0);
        }

        const first_function_node = module_body_node.children[0];

        {
            assert.equal(first_function_node.cache.relative_start, 0);
        }

        const function_declaration_node = first_function_node.children[0];
        const function_definition_node = first_function_node.children[1];

        {
            assert.equal(function_declaration_node.cache.relative_start, 0);
            assert.equal(function_definition_node.cache.relative_start, text.indexOf("{"));
        }

        {
            const declaration_children = function_declaration_node.children;
            assert.equal(declaration_children[0].cache.relative_start, 0); // function
            assert.equal(declaration_children[1].cache.relative_start, 9); // add_0
            {
                const input_parameters_node = declaration_children[2];
                assert.equal(input_parameters_node.cache.relative_start, 14);

                assert.equal(input_parameters_node.children[0].cache.relative_start, 0); // (
                {
                    const first_parameter = input_parameters_node.children[1];
                    assert.equal(first_parameter.cache.relative_start, 1);
                    assert.equal(first_parameter.children[0].cache.relative_start, 0); // first
                    assert.equal(first_parameter.children[1].cache.relative_start, 5); // :
                    assert.equal(first_parameter.children[2].cache.relative_start, 7); // int32   
                }
                assert.equal(input_parameters_node.children[2].cache.relative_start, 13); // ,
                {
                    const second_parameter = input_parameters_node.children[3];
                    assert.equal(second_parameter.cache.relative_start, 15);
                    assert.equal(second_parameter.children[0].cache.relative_start, 0); // second
                    assert.equal(second_parameter.children[1].cache.relative_start, 6); // :
                    assert.equal(second_parameter.children[2].cache.relative_start, 8); // int32   
                }
                assert.equal(input_parameters_node.children[4].cache.relative_start, 28); // )
            }
            assert.equal(declaration_children[3].cache.relative_start, 44); // ->
            {
                const output_parameters_node = declaration_children[4];
                assert.equal(output_parameters_node.cache.relative_start, 47);

                assert.equal(output_parameters_node.children[0].cache.relative_start, 0); // (
                {
                    const result_parameter = output_parameters_node.children[1];
                    assert.equal(result_parameter.cache.relative_start, 1);
                    assert.equal(result_parameter.children[0].cache.relative_start, 0); // result
                    assert.equal(result_parameter.children[1].cache.relative_start, 6); // :
                    assert.equal(result_parameter.children[2].cache.relative_start, 8); // int32   
                }
                assert.equal(output_parameters_node.children[2].cache.relative_start, 14); // )
            }
        }

        {
            const parent_global_start = text.indexOf("{");

            const definition_children = function_definition_node.children;

            assert.equal(definition_children[0].cache.relative_start, 0); // {

            assert.equal(definition_children[1].cache.relative_start, text.indexOf("var") - parent_global_start); // start of expression
            {
                const first_statement = definition_children[1];
                assert.equal(first_statement.cache.relative_start, 6);

                {
                    const variable_declaration_expression = first_statement.children[0];
                    assert.equal(variable_declaration_expression.cache.relative_start, 0);
                    assert.equal(variable_declaration_expression.children[0].cache.relative_start, 0); // var
                    assert.equal(variable_declaration_expression.children[1].cache.relative_start, 4); // result
                    assert.equal(variable_declaration_expression.children[2].cache.relative_start, 11); // =
                }

                {
                    const semicolon = first_statement.children[1];
                    assert.equal(semicolon.cache.relative_start, 27);
                }
            }
        }
    });
});