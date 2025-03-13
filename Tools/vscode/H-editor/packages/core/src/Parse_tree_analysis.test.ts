import "mocha";

import * as assert from "assert";

import * as Core from "./Core_intermediate_representation";
import * as Document from "./Document";
import * as Language from "./Language";
import * as Module_examples from "./Module_examples";
import * as Storage_cache from "./Storage_cache";
import * as Parser_node from "./Parser_node";
import * as Parse_tree_analysis from "./Parse_tree_analysis";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Text_change from "./Text_change";
import * as Text_formatter from "./Text_formatter";
import * as Tree_sitter_parser from "./Tree_sitter_parser";
import * as Type_utilities from "./Type_utilities";

describe("Parse_tree_analysis.find_variable_info", () => {

    let language_description: any;

    before(async () => {
        const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
        language_description = await Language.create_default_description(cache, "out/tests/graphviz.gv");
    });

    it("Finds variable info of output parameter from post condition", async () => {
        const core_module = Module_examples.create_function_contracts();
        const function_value = core_module.declarations[0].value as Core.Function;

        const expected_variable_info: Parse_tree_analysis.Variable_info = {
            type: Parse_tree_analysis.Variable_info_type.Function_output_variable,
            value: {
                function_value: function_value,
                output_index: 0,
            }
        };

        const root = Parse_tree_convertor.module_to_parse_tree(core_module, language_description.production_rules, language_description.mappings);

        const descendant_precondition = Parser_node.find_descendant_position_if({ node: root, position: [] }, (node => node.word.value === "Function_postcondition"));
        assert.notEqual(descendant_precondition, undefined);
        if (descendant_precondition === undefined)
            return;

        const descendant_result = Parser_node.find_descendant_position_if(descendant_precondition, (node => node.word.value === "result"));
        assert.notEqual(descendant_result, undefined);
        if (descendant_result === undefined)
            return;

        test_find_variable_info(core_module, function_value, root, descendant_result.position, descendant_result.node.word.value, expected_variable_info);
    });

    it("Finds variable info of global variable", async () => {
        const core_module = Module_examples.create_using_global_variables();
        const function_value = core_module.declarations[2].value as Core.Function;

        const expected_variable_info: Parse_tree_analysis.Variable_info = {
            type: Parse_tree_analysis.Variable_info_type.Declaration,
            value: {
                core_module: core_module,
                declaration: core_module.declarations[0],
            }
        };

        const root = Parse_tree_convertor.module_to_parse_tree(core_module, language_description.production_rules, language_description.mappings);

        const descendant_function = Parser_node.find_descendant_position_if({ node: root, position: [] }, (node => node.word.value === "Function"));
        assert.notEqual(descendant_function, undefined);
        if (descendant_function === undefined)
            return;

        const descendant_variable = Parser_node.find_descendant_position_if(descendant_function, (node => node.word.value === "my_global_variable_0"));
        assert.notEqual(descendant_variable, undefined);
        if (descendant_variable === undefined)
            return;

        test_find_variable_info(core_module, function_value, root, descendant_variable.position, descendant_variable.node.word.value, expected_variable_info);
    });

});

function test_find_variable_info(
    core_module: Core.Module,
    function_value: Core.Function,
    root: Parser_node.Node,
    variable_node_position: number[],
    variable_name: string,
    expected_variable_info: Parse_tree_analysis.Variable_info | undefined
): void {

    const actual_variable_info = Parse_tree_analysis.find_variable_info(core_module, function_value, root, variable_node_position, variable_name);

    assert.deepEqual(actual_variable_info, expected_variable_info);
}

describe("Parse_tree_analysis.find_variable_type", () => {

    it("Finds variable type of input parameter", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(Module_examples.create_add_function(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 0], "lhs", expected_variable_type);
    });

    it("Finds variable type of output parameter inside postcondition", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(Module_examples.create_function_contracts(), 0, [1, 0, 2, 0, 9, 1, 0, 3, 0, 0, 0, 0], "result", expected_variable_type);
    });

    it("Finds variable type of variable declared with explicit type", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(Module_examples.create_function_with_variable_declaration_with_type(), 0, [1, 0, 2, 1, 0, 1, 1, 0, 0], "a", expected_variable_type);
    });

    it("Finds variable type of variable declared without explicit type", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0, 0], "a", expected_variable_type);
    });

    it("Finds variable type of for loop variable", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(Module_examples.create_for_loop_expressions(), 1, [1, 1, 2, 1, 0, 1, 0, 0, 2, 0, 0], "index", expected_variable_type);
    });

    it("Finds variable type of variable inside while loop", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(Module_examples.create_variable_declaration_inside_while_loop(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 1, 1, 0, 3, 1, 0, 0], "index", expected_variable_type);
    });

    it("Finds variable type of variable inside if statement 0", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(Module_examples.create_variable_declaration_inside_if_expression(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 3, 1, 0], "a", expected_variable_type);
    });

    it("Finds variable type of variable inside if statement 1", async () => {
        const expected_variable_type = create_integer_type(32, false);
        await test_find_variable_type(Module_examples.create_variable_declaration_inside_if_expression(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 5, 2, 1, 0], "b", expected_variable_type);
    });

    it("Finds variable type of variable inside switch case 0", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(Module_examples.create_variable_declaration_inside_switch_case(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 3, 0, 3, 1, 0], "a", expected_variable_type);
    });

    it("Finds variable type of variable inside switch case 1", async () => {
        const expected_variable_type = create_integer_type(32, false);
        await test_find_variable_type(Module_examples.create_variable_declaration_inside_switch_case(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 3, 1, 3, 1, 0], "b", expected_variable_type);
    });

    it("Can handle invalid recursive expressions", async () => {
        const expected_variable_type = undefined;
        await test_find_variable_type(Module_examples.create_invalid_assignment_to_itself_function(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 0], "value", expected_variable_type);
    });
});

async function test_find_variable_type(
    core_module: Core.Module,
    declaration_index: number,
    variable_node_position: number[],
    variable_name: string,
    expected_variable_type: Core.Type_reference | undefined,
    get_core_module?: (module_name: string) => Promise<Core.Module | undefined>
): Promise<void> {
    const function_value = core_module.declarations[declaration_index].value as Core.Function;

    const get_core_module_function = get_core_module !== undefined ? get_core_module : create_default_get_core_module(core_module);

    const root = await core_module_to_parse_tree(core_module);
    const actual_variable_type = await Parse_tree_analysis.find_variable_type(core_module, function_value, root, variable_node_position, variable_name, get_core_module_function);

    assert.deepEqual(actual_variable_type, expected_variable_type);
}

describe("Parse_tree_analysis.get_expression_type", () => {

    it("Finds expression type of access expression of enum of imported module", async () => {

        const program_a = `
module Module_A;

export enum Precision
{
    Low = 0,
    Medium = 1,
    High = 2,
}
`;

        const program_b = `
module Module_B;

import Module_A as my_import;

function run() -> ()
{
    var precision = my_import.Precision.Low;
}
`;

        const expression_0 = Core.create_access_expression(
            Core.create_variable_expression("my_import", Core.Access_type.Read),
            "Precision",
            Core.Access_type.Read
        );
        const expression_1 = Core.create_access_expression(
            Core.create_access_expression(
                Core.create_variable_expression("my_import", Core.Access_type.Read),
                "Precision",
                Core.Access_type.Read
            ),
            "Low",
            Core.Access_type.Read
        );

        const expected_expression_type = create_custom_type_reference("Module_A", "Precision");
        const root_b = await parse(program_b);

        const get_parse_tree = (module_name: string): Promise<Parser_node.Node | undefined> => {
            if (module_name.length === 0 || module_name === "Module_B") {
                return Promise.resolve(root_b);
            }

            if (module_name === "Module_A") {
                return Promise.resolve(parse(program_a));
            }

            return Promise.resolve(undefined);
        };

        const scope_node_position = find_node_position(root_b, "a");
        await test_get_expression_type(root_b, expression_0, { type: [expected_expression_type], is_value: false }, scope_node_position, get_parse_tree);
        await test_get_expression_type(root_b, expression_1, { type: [expected_expression_type], is_value: true }, scope_node_position, get_parse_tree);
    });

    it("Finds expression type of access expression of global variable of imported module", async () => {
        const program_a = `
        module Module_A;

        export var global_variable = 0.0f64;
        `;

        const program_b = `
        module Module_B;
        
        import Module_A as my_import;
        
        function run() -> ()
        {
            var a = my_import.global_variable;
        }
        `;

        const expression_0 = Core.create_access_expression(
            Core.create_variable_expression("my_import", Core.Access_type.Read),
            "global_variable",
            Core.Access_type.Read
        );

        const expected_expression_type = create_fundamental_type(Core.Fundamental_type.Float64);
        const root_b = await parse(program_b);

        const get_parse_tree = (module_name: string): Promise<Parser_node.Node | undefined> => {
            if (module_name.length === 0 || module_name === "Module_B") {
                return Promise.resolve(root_b);
            }

            if (module_name === "Module_A") {
                return Promise.resolve(parse(program_a));
            }

            return Promise.resolve(undefined);
        };

        const scope_node_position = find_node_position(root_b, "a");
        await test_get_expression_type(root_b, expression_0, { type: [expected_expression_type], is_value: true }, scope_node_position, get_parse_tree);
    });

    it("Finds expression type of access expression of struct", async () => {
        const expression = Core.create_access_expression(
            Core.create_variable_expression("instance_0", Core.Access_type.Read),
            "b",
            Core.Access_type.Read
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_using_structs());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of access expression of union", async () => {
        const expression = Core.create_access_expression(
            Core.create_variable_expression("instance_0", Core.Access_type.Read),
            "b",
            Core.Access_type.Read
        );
        const expected_expression_type = create_fundamental_type(Core.Fundamental_type.Float32);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_using_unions());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of access expression of struct of imported module", async () => {
        const expression = Core.create_access_expression(
            Core.create_variable_expression("instance", Core.Access_type.Read),
            "b",
            Core.Access_type.Read
        );
        const expected_expression_type = create_integer_type(32, true);
        const root = await core_module_to_parse_tree(Module_examples.create_access_struct_of_imported_module());

        const get_parse_tree = (module_name: string): Promise<Parser_node.Node | undefined> => {
            if (module_name.length === 0 || module_name === "Variable_declaration_inside_switch_case") {
                return Promise.resolve(root);
            }

            if (module_name === "Structs") {
                return Promise.resolve(core_module_to_parse_tree(Module_examples.create_using_structs()));
            }

            return Promise.resolve(undefined);
        };

        const is_value = true;
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position, get_parse_tree);
    });

    it("Finds expression type of access expression of struct through alias", async () => {

        const program = `
module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
}

using My_alias_0 = My_struct;
using My_alias_1 = My_alias_0;

function run() -> ()
{
    var instance: My_alias_1 = {};
    var a = instance.a;
}
`;

        const expression = Core.create_access_expression(
            Core.create_variable_expression("instance", Core.Access_type.Read),
            "b",
            Core.Access_type.Read
        );
        const expected_expression_type = create_integer_type(32, true);

        const root = await parse(program);
        const is_value = true;
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of binary expression with numeric operator", async () => {
        const expression = Core.create_binary_expression(
            Core.create_variable_expression("a", Core.Access_type.Read),
            Core.create_variable_expression("a", Core.Access_type.Read),
            Core.Binary_operation.Add
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of binary expression with logical operator", async () => {
        const expression = Core.create_binary_expression(
            Core.create_variable_expression("a", Core.Access_type.Read),
            Core.create_variable_expression("a", Core.Access_type.Read),
            Core.Binary_operation.Equal
        );
        const expected_expression_type = create_boolean_type();
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of cast expression", async () => {
        const expression = Core.create_cast_expression(
            Core.create_constant_expression(create_integer_type(32, false), "0"),
            create_integer_type(32, true),
            Core.Cast_type.Numeric
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of constant array expression", async () => {
        const expression = Core.create_constant_array_expression([]);
        const expected_expression_type = create_constant_array_type([], 0);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of constant expression", async () => {
        const expression = Core.create_constant_expression(create_integer_type(32, true), "0");
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of call expression", async () => {
        const int32_type = create_integer_type(32, true);
        const expression = Core.create_call_expression(
            Core.create_access_expression(
                Core.create_variable_expression("my_external_module", Core.Access_type.Read),
                "add",
                Core.Access_type.Read
            ),
            [
                Core.create_constant_expression(int32_type, "1"),
                Core.create_constant_expression(int32_type, "2"),
            ]
        );

        const root = await core_module_to_parse_tree(Module_examples.create_call_of_function_of_imported_module());
        const get_parse_tree = (module_name: string): Promise<Parser_node.Node | undefined> => {
            if (module_name.length === 0 || module_name === "Call_of_imported_module_function") {
                return Promise.resolve(root);
            }

            if (module_name === "Add") {
                return Promise.resolve(core_module_to_parse_tree(Module_examples.create_add_function()));
            }

            return Promise.resolve(undefined);
        };

        const expected_expression_type = int32_type;
        const is_value = true;
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position, get_parse_tree);
    });

    it("Finds expression type of parenthesis expression", async () => {
        const expression = Core.create_parenthesis_expression(Core.create_constant_expression(create_integer_type(32, true), "0"));
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of ternary condition expression", async () => {
        const expression = Core.create_ternary_condition_expression(
            Core.create_constant_expression(create_boolean_type(), "true"),
            create_statement(Core.create_constant_expression(create_integer_type(32, true), "0")),
            create_statement(Core.create_constant_expression(create_integer_type(32, true), "1"))
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of unary expression", async () => {
        const expression = Core.create_unary_expression(Core.create_variable_expression("a", Core.Access_type.Read), Core.Unary_operation.Minus);
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of unary expression with address of", async () => {
        const expression = Core.create_unary_expression(Core.create_variable_expression("a", Core.Access_type.Read), Core.Unary_operation.Address_of);
        const expected_expression_type = create_pointer_type([create_integer_type(32, true)], false);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of unary expression with indirection", async () => {
        const expression = Core.create_unary_expression(
            Core.create_unary_expression(Core.create_variable_expression("a", Core.Access_type.Read), Core.Unary_operation.Address_of),
            Core.Unary_operation.Indirection
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of variable expression", async () => {
        const expression = Core.create_variable_expression("a", Core.Access_type.Read);
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        const root = await core_module_to_parse_tree(Module_examples.create_function_with_variable_declaration());
        const scope_node_position = find_node_position(root, "a");
        await test_get_expression_type(root, expression, { type: [expected_expression_type], is_value: is_value }, scope_node_position);
    });

    it("Finds expression type of variable expression of enum", async () => {

        const program = `
module Test;

enum Precision
{
    Low = 0,
    Medium = 1,
    High = 2,
}

function run() -> ()
{
    var precision = Precision.Low;
    // scope
}
`;

        const expression_0 = Core.create_variable_expression("Precision", Core.Access_type.Read);
        const expression_1 = Core.create_access_expression(
            Core.create_variable_expression("Precision", Core.Access_type.Read),
            "Low",
            Core.Access_type.Read
        );
        const expected_expression_type = create_custom_type_reference("Test", "Precision");

        const root = await parse(program);
        await test_get_expression_type(root, expression_0, { type: [expected_expression_type], is_value: false }, undefined);
        await test_get_expression_type(root, expression_1, { type: [expected_expression_type], is_value: true }, undefined);
    });

    it("Finds expression type of variable expression of global variable", async () => {

        const program = `
module Test;

var global_variable = 0.0f32;

function run() -> ()
{
    var a = global_variable;
    // scope
}
`;

        const expression_0 = Core.create_variable_expression("global_variable", Core.Access_type.Read);
        const expected_expression_type = create_fundamental_type(Core.Fundamental_type.Float32);

        const root = await parse(program);
        await test_get_expression_type(root, expression_0, { type: [expected_expression_type], is_value: true }, undefined);
    });
});

async function test_get_expression_type(
    root: Parser_node.Node,
    expression: Core.Expression,
    expected_expression_type: Parse_tree_analysis.Expression_type_reference,
    scope_node_position: number[] | undefined,
    get_parse_tree?: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<void> {
    const get_parse_tree_function = get_parse_tree !== undefined ? get_parse_tree : create_default_get_parse_tree(root);

    if (scope_node_position === undefined) {
        const scope_descendant = Parser_node.find_descendant_position_if({ node: root, position: [] }, descendant => descendant.word.value === "// scope");
        scope_node_position = scope_descendant !== undefined ? scope_descendant.position : undefined;
    }

    const actual_expression_type = await Parse_tree_analysis.get_expression_type_2(root, scope_node_position, expression, get_parse_tree_function);

    assert.deepEqual(actual_expression_type, expected_expression_type);
}

function create_boolean_type(): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Fundamental_type,
            value: Core.Fundamental_type.Bool
        }
    };
}

function create_constant_array_type(value_type: Core.Type_reference[], size: number): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Constant_array_type,
            value: {
                value_type: value_type,
                size: size
            }
        }
    };
}

function create_fundamental_type(value: Core.Fundamental_type): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Fundamental_type,
            value: value
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

function create_statement(expression: Core.Expression, source_position?: Core.Source_position): Core.Statement {

    const statement: Core.Statement = {
        expression: expression
    };

    if (source_position !== undefined) {
        statement.expression.source_position = source_position;
    }

    return statement;
}

function create_default_get_core_module(core_module: Core.Module): (module_name: string) => Promise<Core.Module | undefined> {
    return (module_name: string): Promise<Core.Module | undefined> => {
        if (module_name.length === 0 || module_name === core_module.name) {
            return Promise.resolve(core_module);
        }
        return Promise.resolve(undefined);
    };
}

function create_default_get_parse_tree(root: Parser_node.Node): (module_name: string) => Promise<Parser_node.Node | undefined> {
    const root_module_name = Parse_tree_analysis.get_module_name_from_tree(root);
    return (module_name: string): Promise<Parser_node.Node | undefined> => {
        if (module_name.length === 0 || module_name === root_module_name) {
            return Promise.resolve(root);
        }
        return Promise.resolve(undefined);
    };
}

function create_core_module_from_text(
    language_description: Language.Description,
    text: string
): Core.Module {
    const text_changes: Text_change.Text_change[] = [
        {
            range: {
                start: 0,
                end: 0
            },
            text: text
        }
    ];

    const document_state = Document.create_empty_state("");
    const new_document_state = Text_change.update(language_description, document_state, text_changes, text);
    return new_document_state.valid.module;
}


describe("Parse_tree_analysis.get_symbol", () => {

    it("Finds symbol information of variable", async () => {
        const input_text = `module My_module;

function run() -> ()
{
    var value = 0;
    // scope
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_integer_type(32, true)],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of enum", async () => {
        const input_text = `module My_module;

enum Precision
{
    Low,
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_type_symbol(
            "Precision",
            [Type_utilities.create_custom_type_reference("My_module", "Precision")],
            find_node_position(root, "Precision")
        );

        await test_get_symbol_information(root, "Precision", expected_symbol_information);
    });

    it("Finds symbol information of enum instance", async () => {
        const input_text = `module My_module;

enum Precision
{
    Low,
}

function run() -> ()
{
    var value = Precision.Low;
    // scope
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_custom_type_reference("My_module", "Precision")],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of struct instance", async () => {
        const input_text = `module My_module;

struct My_struct
{
    a: Int32 = 0;
}

function run() -> ()
{
    var value: My_struct = {};
    // scope
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_custom_type_reference("My_module", "My_struct")],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of union instance", async () => {
        const input_text = `module My_module;

union My_union
{
    a: Int32;
    b: Float32;
}

function run() -> ()
{
    var value: My_union = { a: 0 };
    // scope
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_custom_type_reference("My_module", "My_union")],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of function input argument", async () => {
        const input_text = `module My_module;

function run(first: Int32, second: Float32) -> ()
{
    // scope
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "second",
            [Type_utilities.create_fundamental_type(Core.Fundamental_type.Float32)],
            find_node_position(root, "second")
        );

        await test_get_symbol_information(root, "second", expected_symbol_information);
    });

    it("Finds symbol information of for loop value", async () => {
        const input_text = `module My_module;

function run() -> ()
{
    for index in 0 to 10
    {
        // scope
    }
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "index",
            [Type_utilities.create_integer_type(32, true)],
            find_node_position(root, "index")
        );

        await test_get_symbol_information(root, "index", expected_symbol_information);
    });

    it("Finds symbol information of variable inside if 0", async () => {
        const input_text = `module My_module;

function run(index: Int32) -> ()
{
    if index == 0
    {
        var value = 0;
        // scope
    }
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_integer_type(32, true)],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of variable inside if 1", async () => {
        const input_text = `module My_module;

function run(index: Int32) -> ()
{
    if index == 0
    {
        var value = 0;
    }
    else if index == 1
    {
        var value = 0.0f32;
        // scope
    }
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_fundamental_type(Core.Fundamental_type.Float32)],
            find_node_position(root, "value", 1)
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });


    it("Finds symbol information of variable inside for loop", async () => {
        const input_text = `module My_module;

function run() -> ()
{
    for index in 0 to 10
    {
        var value = 0;
        // scope
    }
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_integer_type(32, true)],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of variable inside while loop", async () => {
        const input_text = `module My_module;

function run() -> ()
{
    while true
    {
        var value = 0;
        // scope
    }
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_integer_type(32, true)],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of variable inside block", async () => {
        const input_text = `module My_module;

function run() -> ()
{
    {
        var value = 0;
        // scope
    }
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_integer_type(32, true)],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of variable inside switch case", async () => {
        const input_text = `module My_module;

function run(index: Int32) -> ()
{
    switch index
    {
    case 1:
        var value = 0;
        // scope
    }
}
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_value_symbol(
            "value",
            [Type_utilities.create_integer_type(32, true)],
            find_node_position(root, "value")
        );

        await test_get_symbol_information(root, "value", expected_symbol_information);
    });

    it("Finds symbol information of module alias", async () => {
        const input_text = `module My_module;

import c.stdio as stdio;
`;

        const root = await parse(input_text);

        const expected_symbol_information = Parse_tree_analysis.create_module_alias_symbol(
            "c.stdio",
            "stdio",
            find_node_position(root, "stdio", 1)
        );

        await test_get_symbol_information(root, "stdio", expected_symbol_information);
    });
});

async function parse(
    input_text: string
): Promise<Parser_node.Node> {
    const parser = await Tree_sitter_parser.create_parser();
    const tree = Tree_sitter_parser.parse(parser, input_text);
    const core_tree = Tree_sitter_parser.to_parser_node(tree.rootNode, true);
    return core_tree;
}

async function core_module_to_parse_tree(
    core_module: Core.Module
): Promise<Parser_node.Node> {
    const parser = await Tree_sitter_parser.create_parser();
    const text = Text_formatter.format_module(core_module, {});
    const tree = Tree_sitter_parser.parse(parser, text);
    const core_tree = Tree_sitter_parser.to_parser_node(tree.rootNode, true);
    return core_tree;
}

function find_node_position(
    root: Parser_node.Node,
    name: string,
    index: number = 0
): number[] {

    let current_index = 0;

    let result = Parser_node.iterate_forward_with_repetition(root, root, [], Parser_node.Iterate_direction.Down);
    while (result !== undefined) {
        if (result.next_node.word.value === name) {
            if (current_index === index) {
                const parent_position = Parser_node.get_parent_position(result.next_position);
                return parent_position;
            }
            else {
                current_index += 1;
            }
        }

        result = Parser_node.iterate_forward_with_repetition(root, result.next_node, result.next_position, result.direction);
    }

    return [];
}

async function test_get_symbol_information(
    root: Parser_node.Node,
    variable_name: string,
    expected_symbol_information: Parse_tree_analysis.Symbol_information
): Promise<void> {

    const get_parse_tree = async (module_name: string): Promise<Parser_node.Node | undefined> => {
        const root_module_name = Parse_tree_analysis.get_module_name_from_tree(root);
        if (root_module_name === module_name) {
            return root;
        }

        return undefined;
    }

    const scope_descendant = Parser_node.find_descendant_position_if({ node: root, position: [] }, descendant => descendant.word.value === "// scope");

    const actual_symbol_information = await Parse_tree_analysis.get_symbol(root, scope_descendant !== undefined ? scope_descendant.position : undefined, variable_name, get_parse_tree);
    assert.deepEqual(actual_symbol_information, expected_symbol_information);
}
