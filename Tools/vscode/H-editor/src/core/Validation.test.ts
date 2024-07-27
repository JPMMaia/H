import "mocha";

import * as assert from "assert";

import * as Grammar from "./Grammar";
import * as Parser_node from "./Parser_node";
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

describe("Validation.validate_parser_node", () => {

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
                message: "Did not expect 'f' suffix. Did you mean 'f16', 'f32' or 'f64'?",
                related_information: [],
            }
        ];

        test_validate_parser_node(node, expected_diagnostics);
    });

    // TODO validate node_to_expression_constant
    // TODO Numbers:
    // - Suffixes:
    //   - u1 to u64
    //   - i1 to i64
    //   - f16, f32, f64
    // - Values:
    //   - u and i, only integers
    // TODO Booleans:
    // - true or false
    // TODO Strings:
    // - either none or c suffix
});

// TODO validate scanned input

// TODO validate module
// - Imports
//   - Inexistent modules
//   - Invalid alias
// -
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
// - Unions
//   - Member types must be all different from each other
// - Structs
//   - Member default values types must match member types
//   - Member default values can only using instantiate or constant expressions
// - Enums
//   - Enum values can only be binary operations or constant expressions
//   - Enum values types must be i32
// - Custom_type_reference
//   - Must exist
// - Integer type
//   - Number of bits cannot be larger than 64
