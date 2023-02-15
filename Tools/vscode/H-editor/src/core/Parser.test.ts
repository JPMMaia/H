import "mocha";

import * as assert from "assert";

import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Grammar from "./Grammar";
import * as Parser from "./Parser";
import * as Scanner from "./Scanner";

describe("Parser.parse", () => {
    it("Parses 'return 0;'", () => {

        const words = Scanner.scan("return 0;");
        const grammar = Grammar.create_default_grammar();
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

        const words = Scanner.scan("1+2;");
        const grammar = Grammar.create_default_grammar();
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

        const words = Scanner.scan("foo+bar;");
        const grammar = Grammar.create_default_grammar();
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

        const words = Scanner.scan(text);
        const grammar = Grammar.create_default_grammar();
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
});
