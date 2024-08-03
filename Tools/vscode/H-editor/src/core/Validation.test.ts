import "mocha";

import * as assert from "assert";

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

function test_validate_parser_node_with_text(
    input_text: string,
    expected_diagnostics: Validation.Diagnostic[]
): void {

    const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const language_description = Language.create_default_description(cache, "out/tests/graphviz.gv");

    const uri = create_dummy_uri();

    const parse_result = Text_change.full_parse_with_source_locations(language_description, uri, input_text);
    assert.notEqual(parse_result.parse_tree, undefined);
    if (parse_result.parse_tree === undefined) {
        return;
    }

    const actual_diagnostics = Validation.validate_parser_node(uri, create_dummy_node_position(), parse_result.parse_tree);
    assert.deepEqual(actual_diagnostics, expected_diagnostics);
}

describe("Validation of structs", () => {

    // - Member names must different
    // - Member default values types must match member types
    // - Member default values can only using instantiate or constant expressions

    it("Validates that member names are different from each other", () => {
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

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });

    it("Validates that member default values types must match member types", () => {
        const input = `module Test;

struct My_struct
{
    a: Int32 = 0;
    b: Int32 = 0.0f32;
}
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(6, 5, 6, 22),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The default value of 'My_struct.b' does not match the member type.",
                related_information: [],
            }
        ];

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });

    it("Validates that member default values only use compile time expressions", () => {
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
                location: create_diagnostic_location(6, 16, 6, 27),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The default value expression assigned to 'My_struct.b' must be a compile-time expression.",
                related_information: [],
            }
        ];

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });
});

describe("Validation of unions", () => {

    // - Member names must different

    it("Validates that member names are different from each other", () => {
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

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });
});

describe("Validation of enums", () => {

    // - Member names must different
    // - Enum values need to be computed at compile-time
    // - Enum values types must be i32

    it("Validates that enum member names are different from each other", () => {
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

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });

    it("Validates that enum values are signed 32-bit integers", () => {
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
                location: create_diagnostic_location(6, 9, 6, 15),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The enum value assigned to 'My_enum.c' must be a Int32 type.",
                related_information: [],
            }
        ];

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });

    it("Validates that enum values can be computed at compile-time", () => {
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
                location: create_diagnostic_location(6, 9, 6, 20),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "The enum value assigned to 'My_struct.b' must be a compile-time expression.",
                related_information: [],
            }
        ];

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });
});

describe("Validation of integer types", () => {

    // - Number of bits cannot be larger than 64

    it("Validates that number of bits cannot be larger than 64", () => {
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

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });
});

describe("Validation of custom type references", () => {

    // - Must refer to an existing type

    it("Validates that a type exists", () => {
        const input = `module Test;

using My_type = My_struct;
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 17, 3, 26),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Type 'My_struct' does not exist.",
                related_information: [],
            }
        ];

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });
});

describe("Validation of imports", () => {

    // - Inexistent modules
    // - Duplicate alias

    it("Validates that a import alias is a not a duplicate", () => {
        const input = `module Test;

import module_a as module_a;
import module_b as module_a;
`;

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

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });

    it("Validates that a import module exists", () => {
        const input = `module Test;

import module_a as module_a;
`;

        const expected_diagnostics: Validation.Diagnostic[] = [
            {
                location: create_diagnostic_location(3, 8, 3, 16),
                source: Validation.Source.Parse_tree_validation,
                severity: Validation.Diagnostic_severity.Error,
                message: "Cannot find module 'module_a'.",
                related_information: [],
            }
        ];

        // TODO figure out how to do this test

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });
});

describe("Validation of declarations", () => {

    // - Must have different names
    // - Names must not collide with existing types

    it("Validates that a declaration name is not a duplicate", () => {
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

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });

    it("Validates that a declaration name is not a builtin type", () => {
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

        test_validate_parser_node_with_text(input, expected_diagnostics);
    });
});

// TODO validate module
// - Statements
//   - Variable declaration (and with type)
//     - Duplicate variables
//   - Variable declaration with type != type of right hand side
//   - Variable expression
//     - Inexistent variable names
//   - Invalid access expressions
//   - Invalid unary expressions
//     - Numeric operations
//     - Pointer dereference
//     - Address of
//   - Invalid conditions (type != bool)
//     - If, ternary condition, while, for
//   - Invalid switch expression
//     - Input type
//     - Switch case types
//   - Ternary condition then and else statement type must match
//   - Return expression type must match function output type
//   - Null can only be assigned to pointer types
//   - No invalid expressions
//   - Instantiate expression
//     - Members need to be sorted (if not add quick fix to sort members)
//     - If explicit, then all members need to be present (if not add quick fix to add missing members)
//     - Indicate members that do not exist
//   - For loop
//     - Range begin and end and step types must be equal
//     - Range comparison must result in a boolean
//   - Continue can only be placed inside for loops and while loops
//   - Break can only be placed inside for loops, while loops and switch cases
//     - Loop count must be valid
//   - Constant arrays
//     - Array data type must match array value type
//   - Cast expression
//     - If cast type is Numeric, then it can only cast to certain numeric types
//   - Call expressions
//     - Can only call functions, or expressions whose type results in a function type
//   - Binary expressions
//     - Left hand and right hand sides must match
//     - If using numeric operations, types must be numbers
//     - If using comparison operations, types must be comparable
//     - If using logical operationrs, types must be booleans
//     - If using bit operations, types must be numbers
//     - If using has operation, then types must be enums
