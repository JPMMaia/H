import "mocha";

import * as assert from "assert";

import * as Core from "./Core_intermediate_representation";
import * as Language from "./Language";
import * as Module_examples from "./Module_examples";
import * as Storage_cache from "./Storage_cache";
import * as Parse_tree_analysis from "./Parse_tree_analysis";
import * as Parse_tree_convertor from "./Parse_tree_convertor";

describe("Parse_tree_analysis.find_variable_type", () => {

    let language_description: any;

    before(() => {
        const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
        language_description = Language.create_default_description(cache, "out/tests/graphviz.gv");
    });

    it("Finds variable type of input parameter", () => {
        const expected_variable_type = create_integer_type(32, true);
        test_find_variable_type(language_description, Module_examples.create_add_function(), [1, 0, 1, 1, 0, 1, 0, 0, 0], "lhs", expected_variable_type);
    });

    it("Finds variable type of variable declared with explicit type", () => {
        const expected_variable_type = create_integer_type(32, true);
        test_find_variable_type(language_description, Module_examples.create_function_with_variable_declaration_with_type(), [1, 0, 1, 1, 0, 1, 1, 0, 0], "a", expected_variable_type);
    });

    it("Finds variable type of variable declared without explicit type", () => {
        const expected_variable_type = create_integer_type(32, true);
        test_find_variable_type(language_description, Module_examples.create_function_with_variable_declaration(), [1, 0, 1, 1, 0, 1, 1, 0, 0], "a", expected_variable_type);
    });

    it("Finds variable type of for loop variable", () => {
        const expected_variable_type = create_integer_type(32, true);
        test_find_variable_type(language_description, Module_examples.create_for_loop_expressions(), [1, 1, 1, 1, 0, 1, 0, 0, 9, 0, 0], "index", expected_variable_type);
    });
});

function test_find_variable_type(
    language_description: Language.Description,
    core_module: Core.Module,
    variable_node_position: number[],
    variable_name: string,
    expected_variable_type: Core.Type_reference
): void {
    const function_value = core_module.declarations[0].value as Core.Function;

    const root = Parse_tree_convertor.module_to_parse_tree(core_module, language_description.production_rules, language_description.mappings);
    const actual_variable_type = Parse_tree_analysis.find_variable_type(function_value, root, variable_node_position, variable_name);

    assert.deepEqual(actual_variable_type, expected_variable_type);
}

describe("Parse_tree_analysis.get_expression_type", () => {

    let language_description: any;

    before(() => {
        const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
        language_description = Language.create_default_description(cache, "out/tests/graphviz.gv");
    });

    it("Finds expression type of cast expression", () => {
        const expression = Core.create_cast_expression(
            Core.create_constant_expression(create_integer_type(32, false), "0"),
            create_integer_type(32, true),
            Core.Cast_type.Numeric
        );
        const expected_expression_type = create_integer_type(32, true);
        const actual_expression_type = Parse_tree_analysis.get_expression_type(expression);
        assert.deepEqual(actual_expression_type, expected_expression_type);
    });

    it("Finds expression type of constant array expression", () => {
        const expression = Core.create_constant_array_expression(
            create_integer_type(32, true),
            [
            ]
        );
        const expected_expression_type = create_integer_type(32, true);
        const actual_expression_type = Parse_tree_analysis.get_expression_type(expression);
        assert.deepEqual(actual_expression_type, expected_expression_type);
    });

    it("Finds expression type of constant expression", () => {
        const expression = Core.create_constant_expression(create_integer_type(32, true), "0");
        const expected_expression_type = create_integer_type(32, true);
        const actual_expression_type = Parse_tree_analysis.get_expression_type(expression);
        assert.deepEqual(actual_expression_type, expected_expression_type);
    });

    it("Finds expression type of call expression", () => {
        const expression = Core.create_call_expression(
            Core.create_variable_expression("add", Core.Access_type.Read), [
            Core.create_constant_expression(create_integer_type(32, true), "1"),
            Core.create_constant_expression(create_integer_type(32, true), "2"),
        ]);
        // TODO get_expression_type needs more information
        const expected_expression_type = create_integer_type(32, true);
        const actual_expression_type = Parse_tree_analysis.get_expression_type(expression);
        assert.deepEqual(actual_expression_type, expected_expression_type);
    });

    it("Finds expression type of parenthesis expression", () => {
        const expression = Core.create_parenthesis_expression(Core.create_constant_expression(create_integer_type(32, true), "0"));
        const expected_expression_type = create_integer_type(32, true);
        const actual_expression_type = Parse_tree_analysis.get_expression_type(expression);
        assert.deepEqual(actual_expression_type, expected_expression_type);
    });

    it("Finds expression type of ternary condition expression", () => {
        const expression = Core.create_ternary_condition_expression(
            Core.create_constant_expression(create_boolean_type(), "true"),
            create_statement(Core.create_constant_expression(create_integer_type(32, true), "0")),
            create_statement(Core.create_constant_expression(create_integer_type(32, true), "1"))
        );
        const expected_expression_type = create_integer_type(32, true);
        const actual_expression_type = Parse_tree_analysis.get_expression_type(expression);
        assert.deepEqual(actual_expression_type, expected_expression_type);
    });
});

function create_boolean_type(): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Fundamental_type,
            value: Core.Fundamental_type.Bool
        }
    };
}

function create_integer_type(number_of_bits: number, is_signed: boolean): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Integer_type,
            value: {
                number_of_bits: number_of_bits,
                is_signed: is_signed
            }
        }
    };
}

function create_statement(expression: Core.Expression, newlines_after?: number): Core.Statement {

    const statement: Core.Statement = {
        expression: expression
    };

    if (newlines_after !== undefined) {
        statement.newlines_after = newlines_after;
    }

    return statement;
}
