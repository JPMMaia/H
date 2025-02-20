import "mocha";

import * as assert from "assert";

import * as Core from "./Core_intermediate_representation";
import * as Comments from "./Comments";
import * as Language from "./Language";
import * as Text_change from "./Text_change";
import * as Storage_cache from "./Storage_cache";

let language_description: any;

before(async () => {
    const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    language_description = await Language.create_default_description(cache, "out/tests/graphviz.gv");
});

describe("Comments.parse_function_comment", () => {
    it("Parses function comment 0", () => {

        const program = `
module my_module;

// Add two integers
//
// Add two 32-bit integers.
// It returns the result of adding lhs and rhs.
//
// @input_parameter lhs: Left hand side of add expression
// @input_parameter rhs: Right hand side of add expression
// @output_parameter result: Result of adding the two values
function add(lhs: Int32, rhs: Int32) -> (result: Int32)
{
    return lhs + rhs;
}
`;

        const expected_comment: Comments.Function_comment = {
            short_description: "Add two integers",
            long_description: "Add two 32-bit integers.\nIt returns the result of adding lhs and rhs.",
            input_parameters: [
                {
                    parameter_name: "lhs",
                    description: "Left hand side of add expression"
                },
                {
                    parameter_name: "rhs",
                    description: "Right hand side of add expression"
                }
            ],
            output_parameters: [
                {
                    parameter_name: "result",
                    description: "Result of adding the two values"
                }
            ]
        };

        test_parse_function_comment(language_description, program, "add", expected_comment);
    });
});

function test_parse_function_comment(
    language_description: Language.Description,
    program: string,
    function_name: string,
    expected_comment: Comments.Function_comment
): void {
    const parse_result = Text_change.full_parse_with_source_locations(language_description, "", program);
    assert.notEqual(parse_result, undefined);
    if (parse_result === undefined) {
        return;
    }

    const core_module = parse_result.module;
    assert.notEqual(core_module, undefined);
    if (core_module === undefined) {
        return;
    }

    const declaration = core_module.declarations.find(declaration => declaration.name === function_name);
    assert.notEqual(declaration, undefined);
    if (declaration === undefined) {
        return;
    }

    const function_value = declaration.value as Core.Function;
    const actual_comment = Comments.parse_function_comment(function_value.declaration);

    assert.deepEqual(actual_comment, expected_comment);
}

describe("Comments.generate_function_comment", () => {
    it("Generates function comment 0", () => {

        const program = `
module my_module;

function add(lhs: Int32, rhs: Int32) -> (result: Int32)
{
    return lhs + rhs;
}
`;

        const expected_comment = [
            "A short description",
            "",
            "@input_parameter lhs: A description",
            "@input_parameter rhs: A description",
            "@output_parameter result: A description"
        ].join("\n");

        test_generate_function_comment(language_description, program, "add", expected_comment);
    });
});

function test_generate_function_comment(
    language_description: Language.Description,
    program: string,
    function_name: string,
    expected_comment: string
): void {
    const parse_result = Text_change.full_parse_with_source_locations(language_description, "", program);
    assert.notEqual(parse_result, undefined);
    if (parse_result === undefined) {
        return;
    }

    const core_module = parse_result.module;
    assert.notEqual(core_module, undefined);
    if (core_module === undefined) {
        return;
    }

    const declaration = core_module.declarations.find(declaration => declaration.name === function_name);
    assert.notEqual(declaration, undefined);
    if (declaration === undefined) {
        return;
    }

    const function_value = declaration.value as Core.Function;
    const actual_comment = Comments.generate_function_comment(function_value.declaration);

    assert.equal(actual_comment, expected_comment);
}

describe("Comments.update_function_comment", () => {
    it("Adds missing parameters", () => {

        const program = `
module my_module;

// @input_parameter rhs: Right hand side of add expression
function add(lhs: Int32, rhs: Int32) -> (result: Int32)
{
    return lhs + rhs;
}
`;

        const expected_comment = [
            "@input_parameter lhs: TODO documentation",
            "@input_parameter rhs: Right hand side of add expression",
            "@output_parameter result: TODO documentation"
        ].join("\n");

        test_update_function_comment(language_description, program, "add", expected_comment);
    });

    it("Reorders parameters", () => {

        const program = `
module my_module;

// @output_parameter result: Result of adding the two values
// @input_parameter rhs: Right hand side of add expression
// @input_parameter lhs: Left hand side of add expression
function add(lhs: Int32, rhs: Int32) -> (result: Int32)
{
    return lhs + rhs;
}
`;

        const expected_comment = [
            "@input_parameter lhs: Left hand side of add expression",
            "@input_parameter rhs: Right hand side of add expression",
            "@output_parameter result: Result of adding the two values"
        ].join("\n");

        test_update_function_comment(language_description, program, "add", expected_comment);
    });
});

function test_update_function_comment(
    language_description: Language.Description,
    program: string,
    function_name: string,
    expected_comment: string
): void {
    const parse_result = Text_change.full_parse_with_source_locations(language_description, "", program);
    assert.notEqual(parse_result, undefined);
    if (parse_result === undefined) {
        return;
    }

    const core_module = parse_result.module;
    assert.notEqual(core_module, undefined);
    if (core_module === undefined) {
        return;
    }

    const declaration = core_module.declarations.find(declaration => declaration.name === function_name);
    assert.notEqual(declaration, undefined);
    if (declaration === undefined) {
        return;
    }

    const function_value = declaration.value as Core.Function;
    const actual_comment = Comments.update_function_comment(function_value.declaration);

    assert.equal(actual_comment, expected_comment);
}
