import "mocha";

import * as assert from "assert";

import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Default_grammar from "./Default_grammar";
import * as Parser from "./Parser";
import * as Scanner from "./Scanner";

describe("Parser.parse", () => {
    it("Parses 'return 0;'", () => {

        const input = "return 0;";
        const words = Scanner.scan(input, 0, input.length);
        const grammar = Default_grammar.create_grammar();
        const root = Parser.parse_statement(words, 0, grammar).node;

        const statement = root;

        {
            assert.equal(statement.value, "");
            assert.equal(statement.token, Abstract_syntax_tree.Token.Statement);
            assert.equal(statement.children.length, 2);
        }

        const return_expression = statement.children[0];

        {
            assert.equal(return_expression.value, "");
            assert.equal(return_expression.token, Abstract_syntax_tree.Token.Expression_return);
            assert.equal(return_expression.children.length, 2);
        }

        const return_expression_keyword = return_expression.children[0];

        {
            assert.equal(return_expression_keyword.value, "return");
            assert.equal(return_expression_keyword.token, Abstract_syntax_tree.Token.Expression_return_keyword);
            assert.equal(return_expression_keyword.children.length, 0);
        }

        const constant_expression = return_expression.children[1];

        {
            assert.equal(constant_expression.value, "0");
            assert.equal(constant_expression.token, Abstract_syntax_tree.Token.Expression_constant);
            assert.equal(constant_expression.children.length, 0);
        }

        const semicolon = statement.children[1];

        {
            assert.equal(semicolon.value, ";");
            assert.equal(semicolon.token, Abstract_syntax_tree.Token.Statement_end);
            assert.equal(semicolon.children.length, 0);
        }
    });

    it("Parses '1+2;'", () => {

        const input = "1+2;";
        const words = Scanner.scan(input, 0, input.length);
        const grammar = Default_grammar.create_grammar();
        const root = Parser.parse_statement(words, 0, grammar).node;

        const statement = root;

        {
            assert.equal(statement.value, "");
            assert.equal(statement.token, Abstract_syntax_tree.Token.Statement);
            assert.equal(statement.children.length, 2);
        }

        const binary_operation_expression = statement.children[0];

        {
            assert.equal(binary_operation_expression.value, "");
            assert.equal(binary_operation_expression.token, Abstract_syntax_tree.Token.Expression_binary_operation);
            assert.equal(binary_operation_expression.children.length, 3);
        }

        {
            const left_operand_expression = binary_operation_expression.children[0];
            assert.equal(left_operand_expression.value, "1");
            assert.equal(left_operand_expression.token, Abstract_syntax_tree.Token.Expression_constant);
            assert.equal(left_operand_expression.children.length, 0);
        }

        {
            const binary_operator_expression = binary_operation_expression.children[1];
            assert.equal(binary_operator_expression.value, "+");
            assert.equal(binary_operator_expression.token, Abstract_syntax_tree.Token.Expression_binary_operation_keyword);
            assert.equal(binary_operator_expression.children.length, 0);
        }

        {
            const right_operand_expression = binary_operation_expression.children[2];
            assert.equal(right_operand_expression.value, "2");
            assert.equal(right_operand_expression.token, Abstract_syntax_tree.Token.Expression_constant);
            assert.equal(right_operand_expression.children.length, 0);
        }

        const semicolon = statement.children[1];

        {
            assert.equal(semicolon.value, ";");
            assert.equal(semicolon.token, Abstract_syntax_tree.Token.Statement_end);
            assert.equal(semicolon.children.length, 0);
        }
    });

    it("Parses 'foo+bar;'", () => {

        const input = "foo+bar;";
        const words = Scanner.scan(input, 0, input.length);
        const grammar = Default_grammar.create_grammar();
        const root = Parser.parse_statement(words, 0, grammar).node;

        const statement = root;

        {
            assert.equal(statement.value, "");
            assert.equal(statement.token, Abstract_syntax_tree.Token.Statement);
            assert.equal(statement.children.length, 2);
        }

        const binary_operation_expression = statement.children[0];

        {
            assert.equal(binary_operation_expression.value, "");
            assert.equal(binary_operation_expression.token, Abstract_syntax_tree.Token.Expression_binary_operation);
            assert.equal(binary_operation_expression.children.length, 3);
        }

        {
            const left_operand_expression = binary_operation_expression.children[0];
            assert.equal(left_operand_expression.value, "foo");
            assert.equal(left_operand_expression.token, Abstract_syntax_tree.Token.Expression_variable_reference);
            assert.equal(left_operand_expression.children.length, 0);
        }

        {
            const binary_operator_expression = binary_operation_expression.children[1];
            assert.equal(binary_operator_expression.value, "+");
            assert.equal(binary_operator_expression.token, Abstract_syntax_tree.Token.Expression_binary_operation_keyword);
            assert.equal(binary_operator_expression.children.length, 0);
        }

        {
            const right_operand_expression = binary_operation_expression.children[2];
            assert.equal(right_operand_expression.value, "bar");
            assert.equal(right_operand_expression.token, Abstract_syntax_tree.Token.Expression_variable_reference);
            assert.equal(right_operand_expression.children.length, 0);
        }

        const semicolon = statement.children[1];

        {
            assert.equal(semicolon.value, ";");
            assert.equal(semicolon.token, Abstract_syntax_tree.Token.Statement_end);
            assert.equal(semicolon.children.length, 0);
        }
    });

    it("Parses a code block", () => {

        const text =
            `{
                var bar = 0;
                var foo = bar;
                return foo;
            }`;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const root = Parser.parse_code_block(words, 0, grammar).node;

        const code_block = root;

        {
            assert.equal(code_block.value, "");
            assert.equal(code_block.token, Abstract_syntax_tree.Token.Code_block);
            assert.equal(code_block.children.length, 5);
        }

        {
            const open_code_block = code_block.children[0];
            assert.equal(open_code_block.value, "{");
            assert.equal(open_code_block.token, Abstract_syntax_tree.Token.Code_block_open_keyword);
            assert.equal(open_code_block.children.length, 0);
        }

        {
            const close_code_block = code_block.children[1];
            assert.equal(close_code_block.value, "");
            assert.equal(close_code_block.token, Abstract_syntax_tree.Token.Statement);
            assert.equal(close_code_block.children.length > 0, true);
        }

        {
            const close_code_block = code_block.children[2];
            assert.equal(close_code_block.value, "");
            assert.equal(close_code_block.token, Abstract_syntax_tree.Token.Statement);
            assert.equal(close_code_block.children.length > 0, true);
        }

        {
            const close_code_block = code_block.children[3];
            assert.equal(close_code_block.value, "");
            assert.equal(close_code_block.token, Abstract_syntax_tree.Token.Statement);
            assert.equal(close_code_block.children.length > 0, true);
        }

        {
            const close_code_block = code_block.children[4];
            assert.equal(close_code_block.value, "}");
            assert.equal(close_code_block.token, Abstract_syntax_tree.Token.Code_block_close_keyword);
            assert.equal(close_code_block.children.length, 0);
        }
    });

    it("Parses function parameters '(foo: Foo_type, bar: Bar_type)'", () => {

        const text = "(foo: Foo_type, bar: Bar_type)";

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const root = Parser.parse_function_declaration_parameters(words, 0, grammar, true).node;

        const function_parameters_node = root;

        {
            assert.equal(function_parameters_node.value, "");
            assert.equal(function_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(function_parameters_node.children.length, 5);
        }

        {
            const open_parenthesis_node = function_parameters_node.children[0];
            assert.equal(open_parenthesis_node.value, "(");
            assert.equal(open_parenthesis_node.token, Abstract_syntax_tree.Token.Function_parameters_open_keyword);
            assert.equal(open_parenthesis_node.children.length, 0);
        }

        {
            const first_parameter_node = function_parameters_node.children[1];
            assert.equal(first_parameter_node.value, "");
            assert.equal(first_parameter_node.token, Abstract_syntax_tree.Token.Function_parameter);
            assert.equal(first_parameter_node.children.length, 3);

            {
                const parameter_name_node = first_parameter_node.children[0];
                assert.equal(parameter_name_node.value, "foo");
                assert.equal(parameter_name_node.token, Abstract_syntax_tree.Token.Function_parameter_name);
                assert.equal(parameter_name_node.children.length, 0);
            }

            {
                const parameter_separator_node = first_parameter_node.children[1];
                assert.equal(parameter_separator_node.value, ":");
                assert.equal(parameter_separator_node.token, Abstract_syntax_tree.Token.Function_parameter_separator);
                assert.equal(parameter_separator_node.children.length, 0);
            }

            {
                const parameter_type_node = first_parameter_node.children[2];
                assert.equal(parameter_type_node.value, "Foo_type");
                assert.equal(parameter_type_node.token, Abstract_syntax_tree.Token.Function_parameter_type);
                assert.equal(parameter_type_node.children.length, 0);
            }
        }

        {
            const separator_node = function_parameters_node.children[2];
            assert.equal(separator_node.value, ",");
            assert.equal(separator_node.token, Abstract_syntax_tree.Token.Function_parameters_separator);
            assert.equal(separator_node.children.length, 0);
        }

        {
            const second_parameter_node = function_parameters_node.children[3];
            assert.equal(second_parameter_node.value, "");
            assert.equal(second_parameter_node.token, Abstract_syntax_tree.Token.Function_parameter);
            assert.equal(second_parameter_node.children.length, 3);

            {
                const parameter_name_node = second_parameter_node.children[0];
                assert.equal(parameter_name_node.value, "bar");
                assert.equal(parameter_name_node.token, Abstract_syntax_tree.Token.Function_parameter_name);
                assert.equal(parameter_name_node.children.length, 0);
            }

            {
                const parameter_separator_node = second_parameter_node.children[1];
                assert.equal(parameter_separator_node.value, ":");
                assert.equal(parameter_separator_node.token, Abstract_syntax_tree.Token.Function_parameter_separator);
                assert.equal(parameter_separator_node.children.length, 0);
            }

            {
                const parameter_type_node = second_parameter_node.children[2];
                assert.equal(parameter_type_node.value, "Bar_type");
                assert.equal(parameter_type_node.token, Abstract_syntax_tree.Token.Function_parameter_type);
                assert.equal(parameter_type_node.children.length, 0);
            }
        }

        {
            const close_parenthesis_node = function_parameters_node.children[4];
            assert.equal(close_parenthesis_node.value, ")");
            assert.equal(close_parenthesis_node.token, Abstract_syntax_tree.Token.Function_parameters_close_keyword);
            assert.equal(close_parenthesis_node.children.length, 0);
        }
    });

    it("Parses 'function foo() -> ()'", () => {

        const text = "function foo() -> ()";

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const root = Parser.parse_function_declaration(words, 0, grammar).node;

        const function_declaration_node = root;

        {
            assert.equal(function_declaration_node.value, "");
            assert.equal(function_declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(function_declaration_node.children.length, 5);
        }

        {
            const function_node = function_declaration_node.children[0];
            assert.equal(function_node.value, "function");
            assert.equal(function_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            assert.equal(function_node.children.length, 0);
        }

        {
            const function_name_node = function_declaration_node.children[1];
            assert.equal(function_name_node.value, "foo");
            assert.equal(function_name_node.token, Abstract_syntax_tree.Token.Function_declaration_name);
            assert.equal(function_name_node.children.length, 0);
        }

        {
            const function_input_parameters_node = function_declaration_node.children[2];
            assert.equal(function_input_parameters_node.value, "");
            assert.equal(function_input_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(function_input_parameters_node.children.length, 2);

            {
                const open_parenthesis_node = function_input_parameters_node.children[0];
                assert.equal(open_parenthesis_node.value, "(");
                assert.equal(open_parenthesis_node.token, Abstract_syntax_tree.Token.Function_parameters_open_keyword);
                assert.equal(open_parenthesis_node.children.length, 0);
            }

            {
                const close_parenthesis_node = function_input_parameters_node.children[1];
                assert.equal(close_parenthesis_node.value, ")");
                assert.equal(close_parenthesis_node.token, Abstract_syntax_tree.Token.Function_parameters_close_keyword);
                assert.equal(close_parenthesis_node.children.length, 0);
            }
        }

        {
            const function_parameters_separator = function_declaration_node.children[3];
            assert.equal(function_parameters_separator.value, "->");
            assert.equal(function_parameters_separator.token, Abstract_syntax_tree.Token.Function_declaration_parameters_separator);
            assert.equal(function_parameters_separator.children.length, 0);
        }

        {
            const function_output_parameters_node = function_declaration_node.children[4];
            assert.equal(function_output_parameters_node.value, "");
            assert.equal(function_output_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_output_parameters);
            assert.equal(function_output_parameters_node.children.length, 2);

            {
                const open_parenthesis_node = function_output_parameters_node.children[0];
                assert.equal(open_parenthesis_node.value, "(");
                assert.equal(open_parenthesis_node.token, Abstract_syntax_tree.Token.Function_parameters_open_keyword);
                assert.equal(open_parenthesis_node.children.length, 0);
            }

            {
                const close_parenthesis_node = function_output_parameters_node.children[1];
                assert.equal(close_parenthesis_node.value, ")");
                assert.equal(close_parenthesis_node.token, Abstract_syntax_tree.Token.Function_parameters_close_keyword);
                assert.equal(close_parenthesis_node.children.length, 0);
            }
        }
    });

    it("Parses several functions of a module", () => {

        const text = `
            function foo() -> ()
            {
                return 0;
            }

            function bar() -> ()
            {
                return 0;
            }
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const root = Parser.parse_module_body(words, 0, grammar).node;

        const module_body_node = root;

        {
            assert.equal(module_body_node.value, "");
            assert.equal(module_body_node.token, Abstract_syntax_tree.Token.Module_body);
            assert.equal(module_body_node.children.length, 2);
        }

        {
            const function_node = module_body_node.children[0];
            assert.equal(function_node.value, "");
            assert.equal(function_node.token, Abstract_syntax_tree.Token.Function);
            assert.equal(function_node.children.length, 2);

            {
                const declaration_node = function_node.children[0];
                assert.equal(declaration_node.value, "");
                assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
                assert.equal(declaration_node.children.length > 0, true);
            }

            {
                const definition_node = function_node.children[1];
                assert.equal(definition_node.value, "");
                assert.equal(definition_node.token, Abstract_syntax_tree.Token.Code_block);
                assert.equal(definition_node.children.length > 0, true);
            }
        }

        {
            const function_node = module_body_node.children[1];
            assert.equal(function_node.value, "");
            assert.equal(function_node.token, Abstract_syntax_tree.Token.Function);
            assert.equal(function_node.children.length, 2);

            {
                const declaration_node = function_node.children[0];
                assert.equal(declaration_node.value, "");
                assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
                assert.equal(declaration_node.children.length > 0, true);
            }

            {
                const definition_node = function_node.children[1];
                assert.equal(definition_node.value, "");
                assert.equal(definition_node.token, Abstract_syntax_tree.Token.Code_block);
                assert.equal(definition_node.children.length > 0, true);
            }
        }
    });
});

describe("Parser.parse_function", () => {

    it("Parses incomplete function 0", () => {

        const text = `
            function
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function(words, 0, grammar);

        assert.equal(result.processed_words, 1);

        const function_node = result.node;

        {
            assert.equal(function_node.value, "");
            assert.equal(function_node.token, Abstract_syntax_tree.Token.Function);
            assert.equal(function_node.children.length, 1);
        }

        {
            const declaration_node = function_node.children[0];
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 1);

            {
                const keyword_node = declaration_node.children[0];
                assert.equal(keyword_node.value, "function");
                assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
                assert.equal(keyword_node.children.length, 0);
            }
        }
    });

    it("Parses incomplete function 1", () => {

        const text = `
            function foo() -> ()
            {
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function(words, 0, grammar);

        assert.equal(result.processed_words, 8);

        const function_node = result.node;

        {
            assert.equal(function_node.value, "");
            assert.equal(function_node.token, Abstract_syntax_tree.Token.Function);
            assert.equal(function_node.children.length, 2);
        }

        {
            const declaration_node = function_node.children[0];
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 5);

            {
                const keyword_node = declaration_node.children[0];
                assert.equal(keyword_node.value, "function");
                assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            }
        }

        {
            const definition_node = function_node.children[1];
            assert.equal(definition_node.value, "");
            assert.equal(definition_node.token, Abstract_syntax_tree.Token.Code_block);
            assert.equal(definition_node.children.length, 1);

            {
                const open_block_node = definition_node.children[0];
                assert.equal(open_block_node.value, "{");
                assert.equal(open_block_node.token, Abstract_syntax_tree.Token.Code_block_open_keyword);
                assert.equal(open_block_node.children.length, 0);
            }
        }
    });
});


describe("Parser.parse_function_declaration", () => {

    it("Parses incomplete function declaration 0", () => {

        const text = `
            function
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration(words, 0, grammar);

        assert.equal(result.processed_words, 1);

        const declaration_node = result.node;

        {
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 1);
        }

        {
            const keyword_node = declaration_node.children[0];
            assert.equal(keyword_node.value, "function");
            assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            assert.equal(keyword_node.children.length, 0);
        }
    });

    it("Parses incomplete function declaration 1", () => {

        const text = `
            function foo
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration(words, 0, grammar);

        assert.equal(result.processed_words, 2);

        const declaration_node = result.node;

        {
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 2);
        }

        {
            const keyword_node = declaration_node.children[0];
            assert.equal(keyword_node.value, "function");
            assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            assert.equal(keyword_node.children.length, 0);
        }

        {
            const name_node = declaration_node.children[1];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_declaration_name);
            assert.equal(name_node.children.length, 0);
        }
    });

    it("Parses incomplete function declaration 2", () => {

        const text = `
            function foo(
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration(words, 0, grammar);

        assert.equal(result.processed_words, 3);

        const declaration_node = result.node;

        {
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 3);
        }

        {
            const keyword_node = declaration_node.children[0];
            assert.equal(keyword_node.value, "function");
            assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            assert.equal(keyword_node.children.length, 0);
        }

        {
            const name_node = declaration_node.children[1];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_declaration_name);
            assert.equal(name_node.children.length, 0);
        }

        {
            const input_parameters_node = declaration_node.children[2];
            assert.equal(input_parameters_node.value, "");
            assert.equal(input_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(input_parameters_node.children.length, 1);

            {
                const open_node = input_parameters_node.children[0];
                assert.equal(open_node.value, "(");
                assert.equal(open_node.token, Abstract_syntax_tree.Token.Function_parameters_open_keyword);
                assert.equal(open_node.children.length, 0);
            }
        }
    });

    it("Parses incomplete function declaration 3", () => {

        const text = `
            function foo() -
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration(words, 0, grammar);

        assert.equal(result.processed_words, 4);

        const declaration_node = result.node;

        {
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 3);
        }

        {
            const keyword_node = declaration_node.children[0];
            assert.equal(keyword_node.value, "function");
            assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            assert.equal(keyword_node.children.length, 0);
        }

        {
            const name_node = declaration_node.children[1];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_declaration_name);
            assert.equal(name_node.children.length, 0);
        }

        {
            const input_parameters_node = declaration_node.children[2];
            assert.equal(input_parameters_node.value, "");
            assert.equal(input_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(input_parameters_node.children.length, 2);
        }
    });

    it("Parses incomplete function declaration 4", () => {

        const text = `
            function foo() ->
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration(words, 0, grammar);

        assert.equal(result.processed_words, 5);

        const declaration_node = result.node;

        {
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 4);
        }

        {
            const keyword_node = declaration_node.children[0];
            assert.equal(keyword_node.value, "function");
            assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            assert.equal(keyword_node.children.length, 0);
        }

        {
            const name_node = declaration_node.children[1];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_declaration_name);
            assert.equal(name_node.children.length, 0);
        }

        {
            const input_parameters_node = declaration_node.children[2];
            assert.equal(input_parameters_node.value, "");
            assert.equal(input_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(input_parameters_node.children.length, 2);
        }

        {
            const separator_node = declaration_node.children[3];
            assert.equal(separator_node.value, "->");
            assert.equal(separator_node.token, Abstract_syntax_tree.Token.Function_declaration_parameters_separator);
            assert.equal(separator_node.children.length, 0);
        }
    });

    it("Parses incomplete function declaration 5", () => {

        const text = `
            function foo() -> (
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration(words, 0, grammar);

        assert.equal(result.processed_words, 6);

        const declaration_node = result.node;

        {
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 5);
        }

        {
            const keyword_node = declaration_node.children[0];
            assert.equal(keyword_node.value, "function");
            assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            assert.equal(keyword_node.children.length, 0);
        }

        {
            const name_node = declaration_node.children[1];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_declaration_name);
            assert.equal(name_node.children.length, 0);
        }

        {
            const input_parameters_node = declaration_node.children[2];
            assert.equal(input_parameters_node.value, "");
            assert.equal(input_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(input_parameters_node.children.length, 2);
        }

        {
            const separator_node = declaration_node.children[3];
            assert.equal(separator_node.value, "->");
            assert.equal(separator_node.token, Abstract_syntax_tree.Token.Function_declaration_parameters_separator);
            assert.equal(separator_node.children.length, 0);
        }

        {
            const output_parameters_node = declaration_node.children[4];
            assert.equal(output_parameters_node.value, "");
            assert.equal(output_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_output_parameters);
            assert.equal(output_parameters_node.children.length, 1);
        }
    });

    it("Parses complete function declaration 0", () => {

        const text = `
            function foo() -> ()
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration(words, 0, grammar);

        assert.equal(result.processed_words, 7);

        const declaration_node = result.node;

        {
            assert.equal(declaration_node.value, "");
            assert.equal(declaration_node.token, Abstract_syntax_tree.Token.Function_declaration);
            assert.equal(declaration_node.children.length, 5);
        }

        {
            const keyword_node = declaration_node.children[0];
            assert.equal(keyword_node.value, "function");
            assert.equal(keyword_node.token, Abstract_syntax_tree.Token.Function_declaration_keyword);
            assert.equal(keyword_node.children.length, 0);
        }

        {
            const name_node = declaration_node.children[1];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_declaration_name);
            assert.equal(name_node.children.length, 0);
        }

        {
            const input_parameters_node = declaration_node.children[2];
            assert.equal(input_parameters_node.value, "");
            assert.equal(input_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(input_parameters_node.children.length, 2);
        }

        {
            const separator_node = declaration_node.children[3];
            assert.equal(separator_node.value, "->");
            assert.equal(separator_node.token, Abstract_syntax_tree.Token.Function_declaration_parameters_separator);
            assert.equal(separator_node.children.length, 0);
        }

        {
            const output_parameters_node = declaration_node.children[4];
            assert.equal(output_parameters_node.value, "");
            assert.equal(output_parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_output_parameters);
            assert.equal(output_parameters_node.children.length, 2);
        }
    });
});

describe("Parser.parse_function_declaration_parameters", () => {

    it("Parses incomplete parameters 0", () => {

        const text = `
            
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration_parameters(words, 0, grammar, true);

        assert.equal(result.processed_words, 0);

        const parameters_node = result.node;

        {
            assert.equal(parameters_node.value, "");
            assert.equal(parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(parameters_node.children.length, 0);
        }
    });

    it("Parses incomplete parameters 1", () => {

        const text = `
            function
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration_parameters(words, 0, grammar, true);

        assert.equal(result.processed_words, 0);

        const parameters_node = result.node;

        {
            assert.equal(parameters_node.value, "");
            assert.equal(parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(parameters_node.children.length, 0);
        }
    });

    it("Parses incomplete parameters 2", () => {

        const text = `
            (
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration_parameters(words, 0, grammar, true);

        assert.equal(result.processed_words, 1);

        const parameters_node = result.node;

        {
            assert.equal(parameters_node.value, "");
            assert.equal(parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(parameters_node.children.length, 1);
        }

        {
            const open_node = parameters_node.children[0];
            assert.equal(open_node.value, "(");
            assert.equal(open_node.token, Abstract_syntax_tree.Token.Function_parameters_open_keyword);
            assert.equal(open_node.children.length, 0);
        }
    });

    it("Parses incomplete parameters 3", () => {

        const text = `
            (foo
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration_parameters(words, 0, grammar, true);

        assert.equal(result.processed_words, 2);

        const parameters_node = result.node;

        {
            assert.equal(parameters_node.value, "");
            assert.equal(parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(parameters_node.children.length, 2);
        }

        {
            const open_node = parameters_node.children[0];
            assert.equal(open_node.value, "(");
            assert.equal(open_node.token, Abstract_syntax_tree.Token.Function_parameters_open_keyword);
            assert.equal(open_node.children.length, 0);
        }

        {
            const parameter_node = parameters_node.children[1];
            assert.equal(parameter_node.value, "");
            assert.equal(parameter_node.token, Abstract_syntax_tree.Token.Function_parameter);
            assert.equal(parameter_node.children.length, 1);
        }
    });

    it("Parses incomplete parameters 4", () => {

        const text = `
            (foo: int,
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration_parameters(words, 0, grammar, true);

        assert.equal(result.processed_words, 5);

        const parameters_node = result.node;

        {
            assert.equal(parameters_node.value, "");
            assert.equal(parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(parameters_node.children.length, 3);
        }

        {
            const open_node = parameters_node.children[0];
            assert.equal(open_node.value, "(");
            assert.equal(open_node.token, Abstract_syntax_tree.Token.Function_parameters_open_keyword);
            assert.equal(open_node.children.length, 0);
        }

        {
            const parameter_node = parameters_node.children[1];
            assert.equal(parameter_node.value, "");
            assert.equal(parameter_node.token, Abstract_syntax_tree.Token.Function_parameter);
            assert.equal(parameter_node.children.length, 3);
        }

        {
            const separator_node = parameters_node.children[2];
            assert.equal(separator_node.value, ",");
            assert.equal(separator_node.token, Abstract_syntax_tree.Token.Function_parameters_separator);
            assert.equal(separator_node.children.length, 0);
        }
    });

    it("Parses complete parameters 0", () => {

        const text = `
            ()
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_declaration_parameters(words, 0, grammar, true);

        assert.equal(result.processed_words, 2);

        const parameters_node = result.node;

        {
            assert.equal(parameters_node.value, "");
            assert.equal(parameters_node.token, Abstract_syntax_tree.Token.Function_declaration_input_parameters);
            assert.equal(parameters_node.children.length, 2);
        }

        {
            const open_node = parameters_node.children[0];
            assert.equal(open_node.value, "(");
            assert.equal(open_node.token, Abstract_syntax_tree.Token.Function_parameters_open_keyword);
            assert.equal(open_node.children.length, 0);
        }

        {
            const open_node = parameters_node.children[1];
            assert.equal(open_node.value, ")");
            assert.equal(open_node.token, Abstract_syntax_tree.Token.Function_parameters_close_keyword);
            assert.equal(open_node.children.length, 0);
        }
    });
});

describe("Parser.parse_function_parameter", () => {

    it("Parses incomplete parameter 0", () => {

        const text = `
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_parameter(words, 0, grammar);

        assert.equal(result.processed_words, 0);

        const parameter_node = result.node;

        {
            assert.equal(parameter_node.value, "");
            assert.equal(parameter_node.token, Abstract_syntax_tree.Token.Function_parameter);
            assert.equal(parameter_node.children.length, 0);
        }
    });

    it("Parses incomplete parameter 1", () => {

        const text = `
            foo
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_parameter(words, 0, grammar);

        assert.equal(result.processed_words, 1);

        const parameter_node = result.node;

        {
            assert.equal(parameter_node.value, "");
            assert.equal(parameter_node.token, Abstract_syntax_tree.Token.Function_parameter);
            assert.equal(parameter_node.children.length, 1);
        }

        {
            const name_node = parameter_node.children[0];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_parameter_name);
            assert.equal(name_node.children.length, 0);
        }
    });

    it("Parses incomplete parameter 2", () => {

        const text = `
            foo:
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_parameter(words, 0, grammar);

        assert.equal(result.processed_words, 2);

        const parameter_node = result.node;

        {
            assert.equal(parameter_node.value, "");
            assert.equal(parameter_node.token, Abstract_syntax_tree.Token.Function_parameter);
            assert.equal(parameter_node.children.length, 2);
        }

        {
            const name_node = parameter_node.children[0];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_parameter_name);
            assert.equal(name_node.children.length, 0);
        }


        {
            const separator_node = parameter_node.children[1];
            assert.equal(separator_node.value, ":");
            assert.equal(separator_node.token, Abstract_syntax_tree.Token.Function_parameter_separator);
            assert.equal(separator_node.children.length, 0);
        }
    });

    it("Parses complete parameter 0", () => {

        const text = `
            foo: Int32
        `;

        const words = Scanner.scan(text, 0, text.length);
        const grammar = Default_grammar.create_grammar();
        const result = Parser.parse_function_parameter(words, 0, grammar);

        assert.equal(result.processed_words, 3);

        const parameter_node = result.node;

        {
            assert.equal(parameter_node.value, "");
            assert.equal(parameter_node.token, Abstract_syntax_tree.Token.Function_parameter);
            assert.equal(parameter_node.children.length, 3);
        }

        {
            const name_node = parameter_node.children[0];
            assert.equal(name_node.value, "foo");
            assert.equal(name_node.token, Abstract_syntax_tree.Token.Function_parameter_name);
            assert.equal(name_node.children.length, 0);
        }

        {
            const separator_node = parameter_node.children[1];
            assert.equal(separator_node.value, ":");
            assert.equal(separator_node.token, Abstract_syntax_tree.Token.Function_parameter_separator);
            assert.equal(separator_node.children.length, 0);
        }

        {
            const type_node = parameter_node.children[2];
            assert.equal(type_node.value, "Int32");
            assert.equal(type_node.token, Abstract_syntax_tree.Token.Function_parameter_type);
            assert.equal(type_node.children.length, 0);
        }
    });
});
