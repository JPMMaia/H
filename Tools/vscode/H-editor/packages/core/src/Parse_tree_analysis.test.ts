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

    let language_description: any;

    before(async () => {
        const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
        language_description = await Language.create_default_description(cache, "out/tests/graphviz.gv");
    });

    it("Finds variable type of input parameter", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(language_description, Module_examples.create_add_function(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 0], "lhs", expected_variable_type);
    });

    it("Finds variable type of output parameter inside postcondition", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(language_description, Module_examples.create_function_contracts(), 0, [1, 0, 2, 0, 9, 1, 0, 3, 0, 0, 0, 0], "result", expected_variable_type);
    });

    it("Finds variable type of variable declared with explicit type", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(language_description, Module_examples.create_function_with_variable_declaration_with_type(), 0, [1, 0, 2, 1, 0, 1, 1, 0, 0], "a", expected_variable_type);
    });

    it("Finds variable type of variable declared without explicit type", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0, 0], "a", expected_variable_type);
    });

    it("Finds variable type of for loop variable", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(language_description, Module_examples.create_for_loop_expressions(), 1, [1, 1, 2, 1, 0, 1, 0, 0, 2, 0, 0], "index", expected_variable_type);
    });

    it("Finds variable type of variable inside while loop", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(language_description, Module_examples.create_variable_declaration_inside_while_loop(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 1, 1, 0, 3, 1, 0, 0], "index", expected_variable_type);
    });

    it("Finds variable type of variable inside if statement 0", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(language_description, Module_examples.create_variable_declaration_inside_if_expression(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 3, 1, 0], "a", expected_variable_type);
    });

    it("Finds variable type of variable inside if statement 1", async () => {
        const expected_variable_type = create_integer_type(32, false);
        await test_find_variable_type(language_description, Module_examples.create_variable_declaration_inside_if_expression(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 5, 2, 1, 0], "b", expected_variable_type);
    });

    it("Finds variable type of variable inside switch case 0", async () => {
        const expected_variable_type = create_integer_type(32, true);
        await test_find_variable_type(language_description, Module_examples.create_variable_declaration_inside_switch_case(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 3, 0, 3, 1, 0], "a", expected_variable_type);
    });

    it("Finds variable type of variable inside switch case 1", async () => {
        const expected_variable_type = create_integer_type(32, false);
        await test_find_variable_type(language_description, Module_examples.create_variable_declaration_inside_switch_case(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 3, 1, 3, 1, 0], "b", expected_variable_type);
    });

    it("Can handle invalid recursive expressions", async () => {
        const expected_variable_type = undefined;
        await test_find_variable_type(language_description, Module_examples.create_invalid_assignment_to_itself_function(), 0, [1, 0, 2, 1, 0, 1, 0, 0, 0], "value", expected_variable_type);
    });
});

async function test_find_variable_type(
    language_description: Language.Description,
    core_module: Core.Module,
    declaration_index: number,
    variable_node_position: number[],
    variable_name: string,
    expected_variable_type: Core.Type_reference | undefined,
    get_core_module?: (module_name: string) => Promise<Core.Module | undefined>
): Promise<void> {
    const function_value = core_module.declarations[declaration_index].value as Core.Function;

    const get_core_module_function = get_core_module !== undefined ? get_core_module : create_default_get_core_module(core_module);

    const root = Parse_tree_convertor.module_to_parse_tree(core_module, language_description.production_rules, language_description.mappings);
    const actual_variable_type = await Parse_tree_analysis.find_variable_type(language_description, core_module, function_value, root, variable_node_position, variable_name, get_core_module_function);

    assert.deepEqual(actual_variable_type, expected_variable_type);
}

describe("Parse_tree_analysis.get_expression_type", () => {

    let language_description: any;

    before(async () => {
        const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
        language_description = await Language.create_default_description(cache, "out/tests/graphviz.gv");
    });

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
        const core_module = create_core_module_from_text(language_description, program_b);

        const get_core_module = (module_name: string): Promise<Core.Module | undefined> => {
            if (module_name.length === 0 || module_name === core_module.name) {
                return Promise.resolve(core_module);
            }

            if (module_name === "Module_A") {
                return Promise.resolve(create_core_module_from_text(language_description, program_a));
            }

            return Promise.resolve(undefined);
        };

        await test_get_expression_type(language_description, core_module, 0, [1, 0, 2, 1, 0, 1, 0], expression_0, { type: [expected_expression_type], is_value: false }, get_core_module);
        await test_get_expression_type(language_description, core_module, 0, [1, 0, 2, 1, 0, 1, 0], expression_1, { type: [expected_expression_type], is_value: true }, get_core_module);
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
        const core_module = create_core_module_from_text(language_description, program_b);

        const get_core_module = (module_name: string): Promise<Core.Module | undefined> => {
            if (module_name.length === 0 || module_name === core_module.name) {
                return Promise.resolve(core_module);
            }

            if (module_name === "Module_A") {
                return Promise.resolve(create_core_module_from_text(language_description, program_a));
            }

            return Promise.resolve(undefined);
        };

        await test_get_expression_type(language_description, core_module, 0, [1, 0, 2, 1, 0, 1, 0], expression_0, { type: [expected_expression_type], is_value: true }, get_core_module);
    });

    it("Finds expression type of access expression of struct", async () => {
        const expression = Core.create_access_expression(
            Core.create_variable_expression("instance_0", Core.Access_type.Read),
            "b",
            Core.Access_type.Read
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_using_structs(), 2, [1, 2, 2, 1, 0, 1, 2, 0, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of access expression of union", async () => {
        const expression = Core.create_access_expression(
            Core.create_variable_expression("instance_0", Core.Access_type.Read),
            "b",
            Core.Access_type.Read
        );
        const expected_expression_type = create_fundamental_type(Core.Fundamental_type.Float32);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_using_unions(), 5, [1, 5, 2, 1, 0, 1, 3, 0, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of access expression of struct of imported module", async () => {
        const expression = Core.create_access_expression(
            Core.create_variable_expression("instance", Core.Access_type.Read),
            "b",
            Core.Access_type.Read
        );
        const expected_expression_type = create_integer_type(32, true);
        const core_module = Module_examples.create_access_struct_of_imported_module();

        const get_core_module = (module_name: string): Promise<Core.Module | undefined> => {
            if (module_name.length === 0 || module_name === core_module.name) {
                return Promise.resolve(core_module);
            }

            if (module_name === "Structs") {
                return Promise.resolve(Module_examples.create_using_structs());
            }

            return Promise.resolve(undefined);
        };

        const is_value = true;
        await test_get_expression_type(language_description, core_module, 0, [1, 0, 2, 1, 0, 1, 1, 0, 0], expression, { type: [expected_expression_type], is_value: is_value }, get_core_module);
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

        const is_value = true;
        await test_get_expression_type(language_description, create_core_module_from_text(language_description, program), 3, [1, 3, 2, 1, 0, 1, 1, 0, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of binary expression with numeric operator", async () => {
        const expression = Core.create_binary_expression(
            Core.create_variable_expression("a", Core.Access_type.Read),
            Core.create_variable_expression("a", Core.Access_type.Read),
            Core.Binary_operation.Add
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of binary expression with logical operator", async () => {
        const expression = Core.create_binary_expression(
            Core.create_variable_expression("a", Core.Access_type.Read),
            Core.create_variable_expression("a", Core.Access_type.Read),
            Core.Binary_operation.Equal
        );
        const expected_expression_type = create_boolean_type();
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of cast expression", async () => {
        const expression = Core.create_cast_expression(
            Core.create_constant_expression(create_integer_type(32, false), "0"),
            create_integer_type(32, true),
            Core.Cast_type.Numeric
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of constant array expression", async () => {
        const expression = Core.create_constant_array_expression([]);
        const expected_expression_type = create_constant_array_type([], 0);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of constant expression", async () => {
        const expression = Core.create_constant_expression(create_integer_type(32, true), "0");
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
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

        const core_module = Module_examples.create_call_of_function_of_imported_module();
        const get_core_module = (module_name: string): Promise<Core.Module | undefined> => {
            if (module_name.length === 0 || module_name === core_module.name) {
                return Promise.resolve(core_module);
            }

            if (module_name === "Add") {
                return Promise.resolve(Module_examples.create_add_function());
            }

            return Promise.resolve(undefined);
        };

        const expected_expression_type = int32_type;
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_call_of_function_of_imported_module(), 0, [1, 0, 2, 1, 0, 1, 0, 0], expression, { type: [expected_expression_type], is_value: is_value }, get_core_module);
    });

    it("Finds expression type of parenthesis expression", async () => {
        const expression = Core.create_parenthesis_expression(Core.create_constant_expression(create_integer_type(32, true), "0"));
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of ternary condition expression", async () => {
        const expression = Core.create_ternary_condition_expression(
            Core.create_constant_expression(create_boolean_type(), "true"),
            create_statement(Core.create_constant_expression(create_integer_type(32, true), "0")),
            create_statement(Core.create_constant_expression(create_integer_type(32, true), "1"))
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of unary expression", async () => {
        const expression = Core.create_unary_expression(Core.create_variable_expression("a", Core.Access_type.Read), Core.Unary_operation.Minus);
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of unary expression with address of", async () => {
        const expression = Core.create_unary_expression(Core.create_variable_expression("a", Core.Access_type.Read), Core.Unary_operation.Address_of);
        const expected_expression_type = create_pointer_type([create_integer_type(32, true)], false);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of unary expression with indirection", async () => {
        const expression = Core.create_unary_expression(
            Core.create_unary_expression(Core.create_variable_expression("a", Core.Access_type.Read), Core.Unary_operation.Address_of),
            Core.Unary_operation.Indirection
        );
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
    });

    it("Finds expression type of variable expression", async () => {
        const expression = Core.create_variable_expression("a", Core.Access_type.Read);
        const expected_expression_type = create_integer_type(32, true);
        const is_value = true;
        await test_get_expression_type(language_description, Module_examples.create_function_with_variable_declaration(), 0, [1, 0, 2, 1, 0, 1, 1, 0], expression, { type: [expected_expression_type], is_value: is_value });
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
}
`;

        const expression_0 = Core.create_variable_expression("Precision", Core.Access_type.Read);
        const expression_1 = Core.create_access_expression(
            Core.create_variable_expression("Precision", Core.Access_type.Read),
            "Low",
            Core.Access_type.Read
        );
        const expected_expression_type = create_custom_type_reference("Test", "Precision");
        const core_module = create_core_module_from_text(language_description, program);

        await test_get_expression_type(language_description, core_module, 1, [1, 1, 2, 1, 0, 1, 0], expression_0, { type: [expected_expression_type], is_value: false });
        await test_get_expression_type(language_description, core_module, 1, [1, 1, 2, 1, 0, 1, 0], expression_1, { type: [expected_expression_type], is_value: true });
    });

    it("Finds expression type of variable expression of global variable", async () => {

        const program = `
module Test;

var global_variable = 0.0f32;

function run() -> ()
{
    var a = global_variable;
}
`;

        const expression_0 = Core.create_variable_expression("global_variable", Core.Access_type.Read);
        const expected_expression_type = create_fundamental_type(Core.Fundamental_type.Float32);
        const core_module = create_core_module_from_text(language_description, program);

        await test_get_expression_type(language_description, core_module, 1, [1, 1, 2, 1, 0, 1, 0], expression_0, { type: [expected_expression_type], is_value: true });
    });
});

async function test_get_expression_type(
    language_description: Language.Description,
    core_module: Core.Module,
    declaration_index: number,
    variable_node_position: number[],
    expression: Core.Expression,
    expected_expression_type: Parse_tree_analysis.Expression_type_reference,
    get_core_module?: (module_name: string) => Promise<Core.Module | undefined>
): Promise<void> {
    const get_core_module_function = get_core_module !== undefined ? get_core_module : create_default_get_core_module(core_module);

    const root = Parse_tree_convertor.module_to_parse_tree(core_module, language_description.production_rules, language_description.mappings);
    const actual_expression_type = await Parse_tree_analysis.get_expression_type(language_description, core_module, core_module.declarations[declaration_index], root, variable_node_position, expression, get_core_module_function);

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

    const document_state = Document.create_empty_state("", language_description.production_rules);
    const new_document_state = Text_change.update(language_description, document_state, text_changes, text);
    return new_document_state.valid.module;
}
