import "mocha";

import * as assert from "assert";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Text_change from "./Text_change";
import * as Tree_sitter_parser from "./Tree_sitter_parser";

async function run_test(input_text: string): Promise<Core_intermediate_representation.Module> {
    const parser = await Tree_sitter_parser.create_parser();
    const result = Text_change.full_parse_with_source_locations(parser, "", input_text, true);
    return result.module;
}

describe("Addition of Source_location", () => {

    it("Adds source location to alias", async () => {

        const program = `
module Source_location;

// A comment
using My_alias = Int32;
`;

        const module = await run_test(program);

        const declaration = module.declarations[0].value as Core_intermediate_representation.Enum_declaration;
        assert.deepEqual(declaration.source_location, { line: 5, column: 7 });
    });

    it("Adds source location to enums", async () => {

        const program = `
module Source_location;

// A comment
enum My_enum
{
    A = 1,
    B = 2,
    C = 3,
}
`;

        const module = await run_test(program);

        const declaration = module.declarations[0].value as Core_intermediate_representation.Enum_declaration;
        assert.deepEqual(declaration.source_location, { line: 5, column: 6 });

        assert.deepEqual(declaration.values[0].source_location, { line: 7, column: 5 });
        assert.deepEqual(declaration.values[1].source_location, { line: 8, column: 5 });
        assert.deepEqual(declaration.values[2].source_location, { line: 9, column: 5 });
    });

    it("Adds source location to structs", async () => {

        const program = `
module Source_location;

// A comment
struct My_struct
{
    // A member comment
    a: Int32 = 0;

    b: Int32 = 1;
}
`;

        const module = await run_test(program);

        const declaration = module.declarations[0].value as Core_intermediate_representation.Struct_declaration;
        assert.deepEqual(declaration.source_location, { line: 5, column: 8 });

        assert.deepEqual(declaration.member_source_positions, [
            { line: 8, column: 5 },
            { line: 10, column: 5 }
        ]);
    });

    it("Adds source location to unions", async () => {

        const program = `
module Source_location;

// A comment
union My_union
{
    // A member comment
    a: Int32;

    b: Int64;
}
`;

        const module = await run_test(program);

        const declaration = module.declarations[0].value as Core_intermediate_representation.Struct_declaration;
        assert.deepEqual(declaration.source_location, { line: 5, column: 7 });

        assert.deepEqual(declaration.member_source_positions, [
            { line: 8, column: 5 },
            { line: 10, column: 5 }
        ]);
    });

    it("Adds source location to function", async () => {

        const program = `
module Source_location;

// A comment
function my_function(a: Int32, b: Int32) -> (c: Int32)
{
    if a > 0
    {
    }
    else if a < 0
    {
    }
    else
    {
    }

    for i in 0 to 8
    {
    }

    while false
    {
    }

    // A comment
    return a + b;
}
`;

        const module = await run_test(program);

        const function_value = module.declarations[0].value as Core_intermediate_representation.Function;

        const declaration = function_value.declaration;
        assert.deepEqual(declaration.source_location, { line: 5, column: 10 });

        assert.deepEqual(declaration.input_parameter_source_positions, [
            { line: 5, column: 22 },
            { line: 5, column: 32 }
        ]);

        assert.deepEqual(declaration.output_parameter_source_positions, [
            { line: 5, column: 46 }
        ]);

        const definition = function_value.definition as Core_intermediate_representation.Function_definition;
        assert.deepEqual(definition.source_location, { line: 6, column: 1 });

        {
            const if_statement = definition.statements[0];
            assert.deepEqual(if_statement.expression.source_position, { line: 7, column: 5 });

            const if_expression = if_statement.expression.data.value as Core_intermediate_representation.If_expression;
            assert.deepEqual(if_expression.series[0].block_source_position, { line: 8, column: 5 });
            assert.deepEqual(if_expression.series[1].block_source_position, { line: 11, column: 5 });
            assert.deepEqual(if_expression.series[2].block_source_position, { line: 14, column: 5 });
        }

        {
            const for_loop_statement = definition.statements[1];
            assert.deepEqual(for_loop_statement.expression.source_position, { line: 17, column: 5 });
        }

        {
            const while_loop_statement = definition.statements[2];
            assert.deepEqual(while_loop_statement.expression.source_position, { line: 21, column: 5 });
        }

        {
            const comment_statement = definition.statements[3];
            assert.deepEqual(comment_statement.expression.source_position, { line: 25, column: 5 });
        }

        {
            const return_statement = definition.statements[4];
            assert.deepEqual(return_statement.expression.source_position, { line: 26, column: 5 });
        }
    });
});
