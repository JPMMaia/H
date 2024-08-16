import "mocha";

import * as assert from "assert";

import * as Core from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Language from "./Language";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import * as Storage_cache from "./Storage_cache";
import * as Text_change from "./Text_change";
import * as Validation from "./Validation";

function create_node(
    value: string,
    children: Parser_node.Node[]
): Parser_node.Node {

    return {
        word: {
            value: value,
            type: Grammar.Word_type.Alphanumeric,
            source_location: { line: -1, column: -1 },
            newlines_after: undefined
        },
        state: -1,
        production_rule_index: 1,
        children: children,
        source_location: { line: -1, column: -1 }
    };
}

function create_terminal_node(
    word_value: string,
    word_type: Grammar.Word_type,
    source_location: Parser_node.Source_location
): Parser_node.Node {

    return {
        word: {
            value: word_value,
            type: word_type,
            source_location: source_location,
            newlines_after: undefined
        },
        state: -1,
        production_rule_index: undefined,
        children: [],
        source_location: source_location
    };
}

function create_dummy_uri(): string {
    return "Validation_test.hltxt";
}

function create_dummy_node_position(): number[] {
    return [1, 0, 1, 1];
}

function test_validate_parser_node(
    node: Parser_node.Node,
    expected_diagnostics: Validation.Diagnostic[]
): void {
    const actual_diagnostics = Validation.validate_parser_node(create_dummy_uri(), create_dummy_node_position(), node);
    assert.deepEqual(actual_diagnostics, expected_diagnostics);
}

function create_diagnostic_location(start_line: number, start_column: number, end_line: number, end_column: number): Validation.Location {
    return {
        uri: create_dummy_uri(),
        range: {
            start: {
                line: start_line,
                column: start_column
            },
            end: {
                line: end_line,
                column: end_column
            }
        }
    };
}

describe("Validation of expression constant", () => {

    it("Validate float suffix", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("1.0f", Grammar.Word_type.Number, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 11),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Did not expect 'f' as number suffix. Did you mean 'f16', 'f32' or 'f64'?",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });

    it("Validate default integer suffix", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("0", Grammar.Word_type.Number, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [];

        test_validate_parser_node(node, expected_diagnostics);
    });

    it("Validate number suffix urandom", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("1uramdom", Grammar.Word_type.Number, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 15),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Did not expect 'uramdom' as number suffix. Did you mean 'u32'?",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });

    it("Validate number suffix u (only u1 through u64 are allowed)", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("1u", Grammar.Word_type.Number, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 9),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Did not expect 'u' as number suffix. The number of bits needs to be >= 1 and <= 64.",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });

    it("Validate number suffix i (only i1 through i64 are allowed)", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("1i", Grammar.Word_type.Number, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 9),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Did not expect 'i' as number suffix. The number of bits needs to be >= 1 and <= 64.",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });

    it("Validate number suffix z", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("1z", Grammar.Word_type.Number, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 9),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Did not expect 'z' as number suffix.",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });

    it("Validate number values (integers cannot have fractionary parts)", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("1.0i32", Grammar.Word_type.Number, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 13),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Fractionary part is not allowed for integers. Did you mean '1i32'?",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });

    it("Validate booleans (only allow true or false as alphanumerics)", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("fals", Grammar.Word_type.Alphanumeric, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 11),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'fals' is not a constant.",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });

    it("Validate strings (suffix is either none or c)", () => {
        const node = create_node("Expression_constant",
            [
                create_terminal_node("\"A string\"d", Grammar.Word_type.String, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 18),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Did not expect 'd' as string suffix. Consider removing it, or replacing it by 'c' to convert the string constant to a C-string.",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });
});

function test_validate_scanned_input(
    input_text: string,
    expected_diagnostics: Validation.Diagnostic[]
): void {
    const scanned_input = Scanner.scan(input_text, 0, input_text.length, { line: 1, column: 1 });
    const actual_diagnostics = Validation.validate_scanned_input(create_dummy_uri(), scanned_input);
    assert.deepEqual(actual_diagnostics, expected_diagnostics);
}

describe("Validation of scanned input", () => {

    it("Validate invalid word", () => {
        const input = "1.0.0";

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(1, 1, 1, 6),
                source: Validation.Source.Scanner,
                severity: Validation.Diagnostic_severity.Error,
                message: "Invalid expression '1.0.0'.",
                related_information: [],
            }
        ];

        test_validate_scanned_input(input, expected_diagnostics);
    });
});

async function test_validate_module(
    input_text: string,
    input_dependencies_text: string[],
    expected_diagnostics: Validation.Diagnostic[]
): Promise<void> {

    const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const language_description = Language.create_default_description(cache, "out/tests/graphviz.gv");

    const uri = create_dummy_uri();

    const parse_result = Text_change.full_parse_with_source_locations(language_description, uri, input_text);

    assert.notEqual(parse_result.module, undefined);
    if (parse_result.module === undefined) {
        return;
    }

    assert.notEqual(parse_result.parse_tree, undefined);
    if (parse_result.parse_tree === undefined) {
        return;
    }

    const dependencies_parse_result: { module: Core.Module, parse_tree: Parser_node.Node }[] = input_dependencies_text.map(text => {
        const parse_result = Text_change.full_parse_with_source_locations(language_description, uri, text);
        assert.notEqual(parse_result.module, undefined);
        assert.notEqual(parse_result.parse_tree, undefined);
        return {
            module: parse_result.module as Core.Module,
            parse_tree: parse_result.parse_tree as Parser_node.Node,
        };
    });

    const get_core_module = async (module_name: string): Promise<Core.Module | undefined> => {
        if (module_name === parse_result.module?.name) {
            return parse_result.module;
        }

        const dependency = dependencies_parse_result.find(dependency => dependency.module.name === module_name);
        if (dependency === undefined) {
            return undefined;
        }
        return dependency.module;
    };

    const actual_diagnostics = await Validation.validate_module(
        uri,
        language_description,
        input_text,
        parse_result.module,
        parse_result.parse_tree,
        [],
        parse_result.parse_tree,
        get_core_module
    );
    assert.deepEqual(actual_diagnostics, expected_diagnostics);
}

describe("Validation of structs", () => {

    // - Member names must different
    // - Member default values types must match member types
    // - Member default values can only using instantiate or constant expressions

    it("Validates that member names are different from each other", async () => {
        const input = `module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    b: Int32 = 0;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 5, 6, 6),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate member name 'My_struct.b'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 5, 7, 6),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate member name 'My_struct.b'.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that member default values types must match member types", async () => {
        const input = `module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0.0f32;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 16, 6, 22),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot assign expression of type 'Float32' to 'My_struct.b' of type 'Int32'.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that member default values only use compile time expressions", async () => {
        const input = `module Test;

function get_value() -> (result: Int32)
{
    return 0;
}

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = get_value();
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(11, 16, 11, 27),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The value of 'My_struct.b' must be a computable at compile-time.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of unions", () => {

    // - Member names must different

    it("Validates that member names are different from each other", async () => {
        const input = `module Test;

union My_union
{
    a: Int32;
    b: Float32;
    b: Float64;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 5, 6, 6),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate member name 'My_union.b'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 5, 7, 6),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate member name 'My_union.b'.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of enums", () => {

    // - Member names must different
    // - Enum values need to be computed at compile-time
    // - Enum values types must be i32

    it("Validates that enum member names are different from each other", async () => {
        const input = `module Test;

enum My_enum
{
    a = 0,
    b = 1,
    b = 2,
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 5, 6, 6),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate member name 'My_enum.b'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 5, 7, 6),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate member name 'My_enum.b'.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that enum values are signed 32-bit integers", async () => {
        const input = `module Test;

enum My_enum
{
    a = 0,
    b = 1i16,
    c = 2.0f32,
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 9, 6, 13),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The enum value assigned to 'My_enum.b' must be a Int32 type.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 9, 7, 15),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The enum value assigned to 'My_enum.c' must be a Int32 type.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that enum values can be computed at compile-time", async () => {
        const input = `module Test;

function get_value() -> (result: Int32)
{
    return 0;
}

enum My_enum
{
    a = 0,
    b = get_value(),
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(11, 9, 11, 20),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The value of 'My_enum.b' must be a computable at compile-time.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of integer types", () => {

    // - Number of bits cannot be larger than 64

    it("Validates that number of bits cannot be larger than 64", async () => {
        const input = `module Test;

using My_int = Int65;
using My_uint = Uint65;
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 16, 3, 21),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Number of bits of integer cannot be larger than 64.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(4, 17, 4, 23),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Number of bits of integer cannot be larger than 64.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of custom type references", () => {

    // - Must refer to an existing type
    // - Must refer to an existing type from an imported module

    it("Validates that a type exists", async () => {
        const input = `module Test;

using My_int = Int32;
using My_type = My_struct;
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(4, 17, 4, 26),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Type 'My_struct' does not exist.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that a type from an import module exists", async () => {
        const input = `module Test_a;

import Test_b as B;

using My_int = Int32;
using My_type = B.My_struct;
using My_type_2 = B.My_struct_2;
`;

        const test_b_input = `module Test_b;

struct My_struct
{
    a: Int32;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(7, 21, 7, 32),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Type 'B.My_struct_2' does not exist.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [test_b_input], expected_diagnostics);
    });

    it("Validates that the module alias accessed by the custom type reference exists", async () => {
        const input = `module Test_a;

using My_type = B.My_struct;
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 17, 3, 18),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Module alias 'B' does not exist.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of imports", () => {

    // - Inexistent modules
    // - Duplicate alias

    it("Validates that a import alias is a not a duplicate", async () => {
        const input = `module Test;

import module_a as module_a;
import module_b as module_a;
`;

        const module_a_input = "module module_a;";
        const module_b_input = "module module_b;";

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 20, 3, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate import alias 'module_a'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(4, 20, 4, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate import alias 'module_a'.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [module_a_input, module_b_input], expected_diagnostics);
    });

    it("Validates that a import module exists", async () => {
        const input = `module Test;

import my.module_a as my_module;
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 8, 3, 19),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot find module 'my.module_a'.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of declarations", () => {

    // - Must have different names
    // - Names must not collide with existing types

    it("Validates that a declaration name is not a duplicate", async () => {
        const input = `module Test;

struct My_type
{
}

union My_type
{
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 8, 3, 15),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate declaration name 'My_type'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 7, 7, 14),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate declaration name 'My_type'.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that a declaration name is not a builtin type", async () => {
        const input = `module Test;

struct Int32
{
}

union Float32
{
}

using true = Float32;
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 8, 3, 13),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Invalid declaration name 'Int32' which is a reserved keyword.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 7, 7, 14),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Invalid declaration name 'Float32' which is a reserved keyword.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(11, 7, 11, 11),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Invalid declaration name 'true' which is a reserved keyword.",
                related_information: [],
            }
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression variable declaration", () => {

    // - Must have different names
    // - Right hand side type must not be void

    it("Validates that a variable declaration name is not a duplicate", async () => {
        const input = `module Test;

function run(c: Int32) -> ()
{
    var a = 0;
    var b = 1;
    var b = 2;
    var c = 3;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 14, 3, 15),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate variable name 'c'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(6, 9, 6, 10),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate variable name 'b'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 9, 7, 10),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate variable name 'b'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(8, 9, 8, 10),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate variable name 'c'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that a variable declaration right side expression type is not void", async () => {
        const input = `module Test;

function get_non_void_value() -> (result: Int32)
{
    return 0;
}

function get_void_value() -> ()
{
}

function run() -> ()
{
    var a = get_non_void_value();
    var b = get_void_value();
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(15, 13, 15, 29),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot assign expression of type 'void' to variable 'b'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression variable declaration with type", () => {

    // - Must have different names
    // - Type must not be void
    // - Right hand side type must not be equal to the type

    it("Validates that a variable declaration with type name is not a duplicate", async () => {
        const input = `module Test;

function run(c: Int32) -> ()
{
    var a: Int32 = 0;
    var b: Int32 = 1;
    var b: Int32 = 2;
    var c: Int32 = 3;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 14, 3, 15),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate variable name 'c'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(6, 9, 6, 10),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate variable name 'b'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 9, 7, 10),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate variable name 'b'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(8, 9, 8, 10),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Duplicate variable name 'c'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates the right hand side type of a variable declaration with type is equal to the type", async () => {
        const input = `module Test;

function get_value() -> (result: Float32)
{
}

function run() -> ()
{
    var a: Int32 = 0;
    var b: Int32 = 1.0f32;
    var c: Int32 = get_value();
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(10, 20, 10, 26),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression type 'Float32' does not match expected type 'Int32'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(11, 20, 11, 31),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression type 'Float32' does not match expected type 'Int32'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression variable", () => {

    // - Variable name must exist

    it("Validates that a variable name must exist", async () => {
        const input = `module Test;

function run(a: Int32) -> ()
{
    var b = 0;
    var c = a + b;
    var d = d + e;
    var e = d + k;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(7, 13, 7, 14),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Variable 'd' does not exist.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 17, 7, 18),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Variable 'e' does not exist.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(8, 17, 8, 18),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Variable 'k' does not exist.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression access", () => {

    // - Left hand side is one of:
    //   - a module alias
    //   - a variable of type struct/union
    //   - a enum type
    // - Right hand side is one of:
    //   - if left hand side is a module alias, then it must be a declaration
    //   - otherwise it's a member name of a enum/struct/union

    it("Validates that left hand side is either a module alias, a variable of type struct/union or an enum type", async () => {
        const input = `module Test;

import Test_2 as My_module;

enum My_enum
{
    A = 0,
    B,
}

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 1;
}

union My_union
{
    a: Int32;
    b: Float32;
}

function run() -> ()
{
    var value_0 = My_enum.A;
    var value_1 = My_enum_2.A;
    
    var value_2: My_struct = {};
    var value_3 = value_2.a;

    var value_4 = value_4.b;

    var value_6: My_union = { b: 0.0f32 };
    var value_7 = value_6.b;

    var value_8 = My_module.My_enum.A;
    var value_9 = My_module.My_enum_2.A;
    var value_10 = My_module_2.My_enum.A;

    var value_11: My_module.My_struct = {};
    var value_12 = value_11.a;

    var value_13: My_module.My_union = { b: 0.0f32 };
    var value_14 = value_13.b;
}
`;

        const test_2_input = `module Test_2;

enum My_enum
{
    A = 0,
    B,
}

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 1;
}

union My_union
{
    a: Int32;
    b: Float32;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(26, 19, 26, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Variable 'My_enum_2' does not exist.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(31, 19, 31, 26),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Variable 'value_4' does not exist.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(37, 19, 37, 38),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Declaration 'My_enum_2' does not exist in the module 'Test_2' ('My_module').",
                related_information: [],
            },
            {
                location: create_diagnostic_location(38, 20, 38, 31),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Variable 'My_module_2' does not exist.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [test_2_input], expected_diagnostics);
    });

    it("Validates that a member name of local type exists", async () => {
        const input = `module Test;

enum My_enum
{
    A = 0,
    B,
}

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 1;
}

union My_union
{
    a: Int32;
    b: Float32;
}

function run() -> ()
{
    var value_0 = My_enum.A;
    var value_1 = My_enum.C;
    
    var value_2: My_struct = {};
    var value_3 = value_2.a;
    var value_4 = value_2.c;

    var value_5: My_union = { b: 0.0f32 };
    var value_6 = value_5.a;
    var value_7 = value_5.c;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(24, 19, 24, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Member 'C' does not exist in the type 'My_enum'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(28, 19, 28, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Member 'c' does not exist in the type 'My_struct'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(32, 19, 32, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Member 'c' does not exist in the type 'My_union'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that a member name of an imported type exists", async () => {
        const input = `module Test;

import Test_2 as My_module;

function run() -> ()
{
    var value_0 = My_module.My_enum.A;
    var value_1 = My_module.My_enum.C;
    
    var value_2: My_module.My_struct = {};
    var value_3 = value_2.a;
    var value_4 = value_2.c;

    var value_5: My_module.My_union = { b: 0.0f32 };
    var value_6 = value_5.a;
    var value_7 = value_5.c;
}
`;

        const test_2_input = `module Test_2

export enum My_enum
{
    A = 0,
    B,
}

export struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 1;
}

export union My_union
{
    a: Int32;
    b: Float32;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(8, 19, 8, 38),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Member 'C' does not exist in the type 'My_enum'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(12, 19, 12, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Member 'c' does not exist in the type 'My_struct'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(16, 19, 16, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Member 'c' does not exist in the type 'My_union'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [test_2_input], expected_diagnostics);
    });
});

describe("Validation of expression unary", () => {

    // - Numeric operations
    // - Pointer dereference
    // - Address of

    it("Validates that numeric unary operations can only be applied to numbers", async () => {
        const input = `module Test;

struct My_struct
{
}

function run() -> ()
{
    mutable int_value = 0;
    mutable float_value = 0.0f32;

    var result_0 = -int_value;
    var result_1 = -float_value;

    var result_2 = ++int_value;
    var result_3 = ++float_value;
    var result_4 = --int_value;
    var result_5 = --float_value;

    var result_6 = int_value++;
    var result_7 = float_value++;
    var result_8 = int_value--;
    var result_9 = float_value--;
    
    var result_10 = ~int_value;
    var result_11 = ~float_value;

    var instance: My_struct = {};
    var result_12 = -instance;
    var result_13 = ++instance;
    var result_14 = --instance;
    var result_15 = instance++;
    var result_16 = instance--;
    var result_17 = ~instance;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(25, 21, 25, 30),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '~' to expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(28, 21, 28, 30),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '-' to expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(29, 21, 29, 31),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '++' to expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(30, 21, 30, 31),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '--' to expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(31, 21, 31, 31),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '++' to expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(32, 21, 32, 31),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '--' to expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(33, 21, 3, 30),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '~' to expression.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that logical unary operations can only be applied to booleans", async () => {
        const input = `module Test;

function run() -> ()
{
    var boolean_value = true;
    var result_0 = !boolean_value;

    var int_value = 0;
    var result_1 = !int_value;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(9, 20, 9, 30),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '!' to expression.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates unary operations related to pointers", async () => {
        const input = `module Test;

function run() -> ()
{
    var int_value = 0;
    var result_0 = &int_value;
    var result_1 = &0;

    var result_2 = *result_0;
    var result_3 = *result_2;
    var result_4 = *0;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(7, 20, 7, 22),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '&' to expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(10, 20, 10, 29),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '*' to expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(11, 20, 11, 22),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply unary operation '*' to expression.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression call", () => {

    // - Can only call functions, or expressions whose type results in a function type
    // - Function call has the correct number of arguments
    // - Function call has the correct type of arguments

    it("Validates that can only call functions or expressions whose type is a function type", async () => {
        const input = `module Test;

function foo() -> ()
{
}

function run() -> ()
{
    foo();

    var int_value = 0;
    int_value();
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(12, 5, 12, 14),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression does not evaluate to a callable expression.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that function call has the correct number of arguments", async () => {
        const input = `module Test;

function foo_0() -> ()
{
}

function foo_1(v0: Int32) -> ()
{
}

function foo_2(v0: Int32, v1: Int32) -> ()
{
}

function run() -> ()
{
    foo_0();
    foo_0(0);

    foo_1(0);
    foo_1();
    foo_1(0, 0);

    foo_2(0, 0);
    foo_2();
    foo_2(0);
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(18, 5, 18, 13),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Function 'foo_0' expects 0 arguments, but 1 were provided.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(21, 5, 21, 12),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Function 'foo_1' expects 1 arguments, but 0 were provided.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(22, 5, 22, 16),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Function 'foo_1' expects 1 arguments, but 2 were provided.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(25, 5, 25, 12),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Function 'foo_2' expects 2 arguments, but 0 were provided.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(26, 5, 26, 13),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Function 'foo_2' expects 2 arguments, but 1 were provided.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that function call has the correct argument types", async () => {
        const input = `module Test;

function foo_1(v0: Int32) -> ()
{
}

function foo_2(v0: Int32, v1: Float32) -> ()
{
}

function run() -> ()
{
    foo_1(0);
    foo_1(0.0f32);

    foo_2(0, 0.0f32);
    foo_2(0, 0);
    foo_2(0.0f32, 0);
    foo_2(0.0f32, 0.0f32);
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(14, 11, 14, 17),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Argument 'v0' expects type 'Int32', but 'Float32' was provided.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(17, 14, 17, 15),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Argument 'v1' expects type 'Float32', but 'Int32' was provided.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(18, 11, 18, 17),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Argument 'v0' expects type 'Int32', but 'Float32' was provided.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(18, 19, 18, 20),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Argument 'v1' expects type 'Float32', but 'Int32' was provided.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(19, 11, 19, 17),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Argument 'v0' expects type 'Int32', but 'Float32' was provided.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression return", () => {

    // - Return expression type must match function output type

    it("Validates that the expression type of a return expression matches the function output type", async () => {
        const input = `module Test;

function run(value: Int32) -> ()
{
    if value == 0 {
        return;
    }
    else if value == 1 {
        return 1;
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(9, 9, 9, 17),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot return expression of type 'Int32' to function with output type 'void'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression if", () => {

    // - Condition expression type must be boolean

    it("Validates that the expression type of a condition expression is a boolean", async () => {
        const input = `module Test;

function run(value: Int32) -> (result: Int32)
{
    if value {
        return 0;
    }
    else if value == 0 {
        return 1;
    }
    else if true {
        return 2;
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(5, 8, 5, 13),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression must evaluate to boolean type.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression ternary condition", () => {

    // - Condition expression type must be boolean
    // - Then and else statement type must match

    it("Validates that the expression type of the condition expression is a boolean", async () => {
        const input = `module Test;

function run(value: Int32) -> (result: Int32)
{
    var result_0 = value == 0 ? 0 : 1;
    var result_1 = value ? 0 : 1;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 20, 6, 25),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression must evaluate to boolean type.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that the expression type of the then and else expressions matches", async () => {
        const input = `module Test;

function run(condition: Bool) -> (result: Int32)
{
    var result_0 = condition ? 0 : 1;
    var result_1 = condition ? 0 : 1.0f32;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 20, 6, 42),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The expression types of the then ('Int32') and else ('Float32') part of a ternary expression must match.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression switch", () => {

    // - Input type must be an integer or an enum
    // - Switch case types must be an integer or an enum
    // - Switch case types must match the same type as the input type
    // - Switch case can only have constant values

    it("Validates that the expression type of the switch input is an integer or an enum value", async () => {
        const input = `module Test;

enum My_enum
{
    A,
    B,
    C,
}

struct My_struct
{
    a: Int32 = 0;
}

function run(int_value: Int32, enum_value: My_enum) -> (result: Int32)
{
    switch int_value {
        default: {
            return 0;
        }
    }

    switch enum_value {
        default: {
            return 1;
        }
    }

    var instance: My_struct = {};
    switch instance {
        default: {
            return 2;
        }
    }

    var float_value = 0.0f32;
    switch float_value {
        default: {
            return 3;
        }
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(30, 12, 30, 20),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression must evaluate to an integer or an enum value.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(37, 12, 37, 23),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression must evaluate to an integer or an enum value.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that the expression type of the switch case is an integer or an enum value", async () => {
        const input = `module Test;

enum My_enum
{
    A,
    B,
    C,
}

function run(int_value: Int32, enum_value: My_enum) -> (result: Int32)
{
    switch int_value {
        case 0: {
            return 0;
        }
        case 1.0f32: {
            return 1;
        }
        default: {
            return 2;
        }
    }

    switch enum_value {
        case My_enum.A: {
            return 3;
        }
    }

    return 4;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(16, 14, 16, 20),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression must evaluate to an integer or an enum value.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that the expression type of the switch case must match the type of the input", async () => {
        const input = `module Test;

enum My_enum
{
    A,
    B,
    C,
}

enum My_enum_2
{
    A,
    B,
    C,
}

function run(int_value: Int32, enum_value: My_enum) -> (result: Int32)
{
    switch int_value {
        case My_enum.A: {
            return 0;
        }
    }

    switch enum_value {
        case 0: {
            return 1;
        }
        case My_enum_2.A: {
            return 2;
        }
    }

    return 3;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(20, 14, 20, 23),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression type must match the switch case input type.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(26, 14, 26, 15),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression type must match the switch case input type.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(29, 14, 29, 25),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression type must match the switch case input type.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that the expression type of the switch case is a single constant expression", async () => {
        const input = `module Test;

enum My_enum
{
    A,
    B,
    C,
}

function run(int_value: Int32, enum_value: My_enum) -> (result: Int32)
{
    switch int_value {
        case 1 + 1: {
            return 0;
        }
    }

    var enum_value_2 = My_enum.A;
    switch enum_value {
        case enum_value_2: {
            return 1;
        }
    }

    return 2;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(13, 14, 13, 19),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Switch case expression must be a single compile-time expression.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(20, 14, 20, 26),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Switch case expression must be a single compile-time expression.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression for loop", () => {

    // - Range begin, end and step_by types must be equal
    // - Range begin, end and step_by types must be numbers

    it("Validates that the expression types of a for loop range begin, end and step_by match", async () => {
        const input = `module Test;

function run(value: Int32) -> ()
{
    for index in 0 to value step_by 1 {
    }

    for index in 0.0f32 to value step_by 1 {
    }

    for index in 0 to 10.0f32 step_by 1 {
    }

    for index in 0 to 10 step_by 1.0f32 {
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(8, 5, 8, 43),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The range begin, end and step_by expression types must all match.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(11, 5, 11, 40),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The range begin, end and step_by expression types must all match.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(14, 5, 14, 40),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The range begin, end and step_by expression types must all match.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that the expression types of a for loop range begin, end and step_by are numbers", async () => {
        const input = `module Test;

struct My_struct
{
    a: Int32 = 0;
}

function run(value: Int32) -> ()
{
    for index in 0 to value step_by 1 {
    }

    for index in true to false step_by false {
    }

    var instance: My_struct = {};
    for index in instance to instance step_by instance {
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(13, 5, 13, 45),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The range begin, end and step_by expression must evaluate to numbers.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(17, 5, 17, 55),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The range begin, end and step_by expression must evaluate to numbers.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression while loop", () => {

    // - Condition expression type must be boolean

    it("Validates that the expression type of a condition expression is a boolean", async () => {
        const input = `module Test;

function run(value: Int32) -> ()
{
    while value == 0 {
    }

    while value {
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(8, 11, 8, 16),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Expression type 'Int32' does not match expected type 'Bool'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression binary", () => {

    // - Left hand and right hand sides must match
    // - If using numeric operations, types must be numbers
    // - If using comparison operations, types must be comparable
    // - If using logical operations, types must be booleans
    // - If using bit operations, types must be integers or bytes
    // - If using has operation, then types must be enums

    it("Validates that left and right hand side expression types match", async () => {
        const input = `module Test;

function run(value: Int32) -> ()
{
    var a = value + 1;
    var b = value + 1.0f32;
    var c = true + 1.0f32;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 13, 6, 27),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Left and right hand sides of binary expression must match.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(7, 13, 7, 26),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Left and right hand sides of binary expression must match.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that in numeric operations both types must be numbers", async () => {
        const input = `module Test;

function run(value: Int32) -> ()
{
    var a = value + 1;
    var b = 1.0f32 + 2.0f32;
    var c = true + false;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(7, 13, 7, 25),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Binary operation '+' can only be applied to numeric types.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that in comparison operations both types must be comparable", async () => {
        const input = `module Test;

struct My_struct
{
    a: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var a = value < 1;

    var instance_0: My_struct = {};
    var instance_1: My_struct = {};
    var b = instance_0 < instance_1;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(14, 13, 14, 36),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Binary operation '<' can only be applied to comparable types.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that in logical operations both types must be boolean", async () => {
        const input = `module Test;

function run(value: Int32) -> ()
{
    var a = true && false;
    var b = value && 1;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 13, 6, 23),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Binary operation '&&' can only be applied to a boolean value.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that in bit operations both types must be integers or bytes", async () => {
        const input = `module Test;

function run(value: Int32) -> ()
{
    var a = value & 1;
    var b = 1.0f32 & 2.0f32;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 13, 6, 28),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Binary operation '&' can only be applied to integers or bytes.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that in has operations both expressions must evaluate to enum values", async () => {
        const input = `module Test;

enum My_enum
{
    A,
    B,
}

function run(value: My_enum) -> ()
{ 
    var a = value has My_enum.A;
    var b = 1 has 0;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(12, 13, 12, 20),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Binary operation 'has' can only be applied to enum values.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression instantiate", () => {

    // - Members need to be sorted (if not add quick fix to sort members)
    // - If explicit, then all members need to be present (if not add quick fix to add missing members), and indicate members that do not exist
    // - Validate that members that are set in the instantiate expression are present in the struct

    it("Validates that members are sorted", async () => {
        const input = `module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    c: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var instance_0: My_struct = {
        a: 0,
        c: 0,
    };

    var instance_1: My_struct = {
        c: 0,
        a: 0,
    };
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(17, 33, 20, 6),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Instantiate members are not sorted. They must appear in the order they were declarated in the struct declaration.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that all members exist if explicit is used", async () => {
        const input = `module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    c: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var instance_0: My_struct = {
        a: 0,
        c: 0,
    };

    var instance_1: My_struct = explicit {
        a: 0,
        c: 0,
    };
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(17, 42, 20, 6),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Member 'b' is missing. Explicit instantiate expression requires all members to be set.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that all members set by the instantiate expression are actual members", async () => {
        const input = `module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0;
    c: Int32 = 0;
}

function run(value: Int32) -> ()
{
    var instance_0: My_struct = {
        a: 0,
        c: 0,
    };

    var instance_1: My_struct = explicit {
        d: 0
    };
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(18, 9, 18, 10),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'My_struct.d' does not exist.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression null", () => {

    // - Null can only be assigned to pointer types

    it("Validates that null can only be assigned to pointer types", async () => {
        const input = `module Test;

function foo(pointer: *Int32, non_pointer: Int32) -> ()
{
}

struct My_struct
{
    a: *Int32 = null;
    b: Int32 = 0;
}

function run(value: Int32) -> ()
{
    foo(null, null);
    
    var instance_0: My_struct = {
        a: null,
        b: null
    };
    instance_0.a = null;
    instance_0.b = null;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(9, 15, 9, 19),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'null' can only be assigned to pointer types.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(13, 12, 13, 16),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'null' can only be assigned to pointer types.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(16, 20, 16, 24),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'null' can only be assigned to pointer types.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression invalid", () => {

    // - There can't be any invalid expressions

    it("Validates that there aren't any invalid expressions", () => {
        const node = create_node("Expression_invalid",
            [
                create_terminal_node("", Grammar.Word_type.Invalid, { line: 2, column: 7 })
            ]
        );

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(2, 7, 2, 7),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Invalid expression.",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });
});

describe("Validation of expression break", () => {

    // - Break can only be placed inside for loops, while loops and switch cases
    // - Loop count must be valid

    it("Validates that break can only be placed inside for loops, while loops and switch cases", async () => {
        const input = `module Test;

function run(input: Int32) -> ()
{
    for index in 0 to 10
    {
        break;
    }

    while false
    {
        break;
    }

    switch (input)
    {
        case 0: {
            break;
        }
    }

    break;

    {
        break;
    }

    if false
    {
        break;
    }

    for index in 0 to 10
    {
        {
            break;
        }
    }

    for index in 0 to 10
    {
        if index % 2 == 0
        {
            break;
        }
    }

    while false
    {
        {
            break;
        }
    }

    while false
    {
        if input % 2 == 0
        {
            break;
        }
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(22, 5, 22, 10),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'break' can only be placed inside for loops, while loops and switch cases.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(25, 9, 25, 14),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'break' can only be placed inside for loops, while loops and switch cases.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(30, 9, 30, 14),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'break' can only be placed inside for loops, while loops and switch cases.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that break loop count is valid", async () => {
        const input = `module Test;

function run(input: Int32) -> ()
{
    for index in 0 to 10
    {
        break 1;
    }

    while false
    {
        for index in 0 to 10
        {
            break 2;
        }
    }

    for index in 0 to 10
    {
        break 2;
    }

    for index in 0 to 10
    {
        break 0;
    }

    for index in 0 to 10
    {
        break -1;
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(20, 15, 20, 16),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'break' loop count of 2 is invalid.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(25, 15, 25, 16),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'break' loop count of 0 is invalid.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(30, 15, 30, 16),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'break' loop count of -1 is invalid.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression continue", () => {

    // - Continue can only be placed inside for loops and while loops
    // - TODO Loop count must be valid

    it("Validates that continue can only be placed inside for loops and while loops", async () => {
        const input = `module Test;

function run(input: Int32) -> ()
{
    for index in 0 to 10
    {
        continue;
    }

    while false
    {
        continue;
    }

    continue;

    {
        continue;
    }

    if false
    {
        continue;
    }

    var value_0 = 0;
    switch (value_0)
    {
        case 0: {
            continue;
        }
    }

    for index in 0 to 10
    {
        {
            continue;
        }
    }

    for index in 0 to 10
    {
        if index % 2 == 0
        {
            continue;
        }

        var value_1 = 0;
        switch value_1
        {
            case 0: {
                continue;
            }
        }
    }

    while false
    {
        {
            continue;
        }
    }

    while false
    {
        if input % 2 == 0
        {
            continue;
        }

        var value_2 = 0;
        switch value_2
        {
            case 0: {
                continue;
            }
        }
    }
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(15, 5, 15, 13),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'continue' can only be placed inside for loops and while loops.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(18, 9, 18, 17),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'continue' can only be placed inside for loops and while loops.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(23, 9, 23, 17),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'continue' can only be placed inside for loops and while loops.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(30, 13, 30, 21),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "'continue' can only be placed inside for loops and while loops.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression cast", () => {

    // - If cast type is Numeric, then the source type must be a numeric type or an enum type
    // - If cast type is Numeric, then the destination type must be a numeric type or an enum type
    // - Warn if cast source and destination types are the same (except when using alias)

    it("Validates that the numeric cast source type is a numeric type or an enum type", async () => {
        const input = `module Test;

enum My_enum
{
    A = 0,
}

struct My_struct
{
    a: Int32 = 0;
}

function run(int_input: Int32, enum_input: My_enum) -> ()
{
    var value_0 = int_input as Int64;
    var value_1 = enum_input as Int64;

    var instance: My_struct = {};
    var value_2 = instance as Int64;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(19, 19, 19, 36),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply numeric cast from 'Test.My_struct' to 'Int64'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Validates that the numeric cast destination type is a numeric type or an enum type", async () => {
        const input = `module Test;

enum My_enum
{
    A = 0,
}

struct My_struct
{
    a: Int32 = 0;
}

function run(int_input: Int32, enum_input: My_enum) -> ()
{
    var value_0 = int_input as My_enum;
    var value_1 = enum_input as Int64;
    var value_2 = int_input as My_struct;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(17, 19, 17, 41),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot apply numeric cast from 'Int32' to 'Test.My_struct'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });

    it("Warn if cast source and destination types are the same (except when using alias)", async () => {
        const input = `module Test;

using My_int = Int32;

enum My_enum
{
    A = 0,
}

function run(int_input: Int32, enum_input: My_enum) -> ()
{
    var value_0 = int_input as Int64;
    var value_1 = int_input as My_int;
    var value_1 = int_input as Int32;
    var value_2 = enum_input as My_enum;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(14, 19, 14, 37),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Warning,
                message: "Numeric cast from 'Int32' to 'Int32'.",
                related_information: [],
            },
            {
                location: create_diagnostic_location(15, 19, 15, 37),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Warning,
                message: "Numeric cast from 'Test.My_enum' to 'Test.My_enum'.",
                related_information: [],
            },
        ];

        await test_validate_module(input, [], expected_diagnostics);
    });
});

describe("Validation of expression constant array", () => {
    // - TODO Array data type must match array value type
});
