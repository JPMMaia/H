import "mocha";

import * as assert from "assert";

import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Module_examples from "./Module_examples";
import * as Text_formatter from "./Text_formatter";
import * as Tree_sitter_parser from "./Tree_sitter_parser";

describe("Text_formatter.to_string", () => {

    function run_text_formatter(module: Core_intermediate_representation.Module): string {
        return Text_formatter.format_module(module, {});
    }

    it("Formats alias correctly", () => {
        const module = Module_examples.create_alias_example();
        const actual_text = run_text_formatter(module);
        const expected_text = "module alias_example;\n\nexport using My_alias = Float32;\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats enums correctly", () => {
        const module = Module_examples.create_enum_example();
        const actual_text = run_text_formatter(module);
        const expected_text = "module enum_example;\n\nexport enum My_enum\n{\n    value_0 = 0,\n    value_1 = 1,\n    value_2 = 2,\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats structs correctly", () => {
        const module = Module_examples.create_struct_example();
        const actual_text = run_text_formatter(module);
        const expected_text = "module struct_example;\n\nexport struct My_struct\n{\n    member_0: Float32 = 0.0f32;\n    member_1: Float32 = 1.0f32;\n    member_2: Float32 = 2.0f32;\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats functions correctly", () => {
        const module = Module_examples.create_function_example();
        const actual_text = run_text_formatter(module);
        const expected_text = "module function_example;\n\nexport function My_function(lhs: Float32, rhs: Float32) -> (result: Float32)\n{\n    return lhs + rhs;\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats module imports correctly", () => {
        const module = Module_examples.create_module_with_dependencies();
        const actual_text = run_text_formatter(module);
        const expected_text = "module Module_with_dependencies;\n\nimport C.stdio as stdio;\nimport My_library as ml;\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats hello world correctly", () => {
        const module = Module_examples.create_hello_world();
        const actual_text = run_text_formatter(module);
        const expected_text = "module Hello_world;\n\nimport C.stdio as stdio;\n\nexport function main() -> (result: Int32)\n{\n    stdio.puts(\"Hello world!\"c);\n    return 0;\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats comments in the module declaration correctly", () => {
        const module = Module_examples.create_comments_in_module_declaration();
        const actual_text = run_text_formatter(module);
        const expected_text = "// This is a very long\n// module decription\nmodule Comments_in_module_declaration;\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats comments in alias correctly", () => {
        const module = Module_examples.create_comments_in_alias();
        const actual_text = run_text_formatter(module);
        const expected_text = "module Comments_in_alias;\n\n// Alias comment\n// Another line\nusing My_int = Int32;\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats comments in enums correctly", () => {
        const module = Module_examples.create_comments_in_enums();
        const actual_text = run_text_formatter(module);
        const expected_text = "module Comments_in_enums;\n\n// Enum comment\n// Another line\nenum My_enum\n{\n    // This is A\n    A = 1,\n    B = 2,\n    // This is C\n    C = 3,\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats comments in functions correctly", () => {
        const module = Module_examples.create_comments_in_functions(true);
        const actual_text = run_text_formatter(module);
        const expected_text = "module Comments_in_functions;\n\n// Function comment\n// No arguments\nexport function use_comments() -> ()\n{\n    // This is a comment\n    var i = 0;\n\n    // This is another comment\n    // And yet another\n    var x = 0;\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats comments in structs correctly", () => {
        const module = Module_examples.create_comments_in_structs();
        const actual_text = run_text_formatter(module);
        const expected_text = "module Comments_in_structs;\n\n// Struct comment\n// Another line\nstruct My_struct\n{\n    // This is a int\n    a: Int32 = 0;\n    b: Int32 = 0;\n    // Another int\n    // Another line\n    c: Int32 = 0;\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats comments in unions correctly", () => {
        const module = Module_examples.create_comments_in_unions();
        const actual_text = run_text_formatter(module);
        const expected_text = "module Comments_in_unions;\n\n// Union comment\n// Another line\nunion My_union\n{\n    // This is a int\n    a: Int32;\n    b: Int32;\n    // Another int\n    // Another line\n    c: Int32;\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Preserves newlines after statements", () => {
        const module = Module_examples.create_newlines_after_statements(true);
        const actual_text = run_text_formatter(module);
        const expected_text = "module Newlines_after_statements;\n\nfunction use_newlines() -> ()\n{\n    var i = 0;\n    var j = 1;\n\n    var k = 2;\n\n    // A comment\n    var l = 3;\n\n\n    var m = 4;\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats if statements correctly", () => {
        const module = Module_examples.create_if_expressions(true);
        const actual_text = run_text_formatter(module);
        const expected_text = "module If_expressions;\n\nimport C.stdio as stdio;\n\nfunction print_message(message: *C_char) -> ()\n{\n    stdio.printf(\"%s\\n\"c, message);\n}\n\nexport function run_ifs(value: Int32) -> ()\n{\n    if value == 0\n    {\n        print_message(\"zero\"c);\n    }\n\n    if value == 0\n    {\n        print_message(\"zero\"c);\n    }\n    else if value == 1\n    {\n        print_message(\"one\"c);\n    }\n\n    if value < 0\n    {\n        print_message(\"negative\"c);\n    }\n    else\n    {\n        print_message(\"non-negative\"c);\n    }\n\n    if value < 0\n    {\n        print_message(\"negative\"c);\n    }\n    else if value > 0\n    {\n        print_message(\"positive\"c);\n    }\n    else\n    {\n        print_message(\"zero\"c);\n    }\n\n    if value < 0\n    {\n        print_message(\"message_0\"c);\n        print_message(\"message_1\"c);\n    }\n}\n";
        assert.equal(actual_text, expected_text);
    });

    it("Formats instantiate expressions correctly", async () => {
        const input_text = `module Format;

struct Complex
{
    real: Int32 = 0;
    imaginary: Int32 = 0;
}

function run() -> ()
{
    var instance: Complex = { real: 0, imaginary: 0 };
}`;

        const expected_text = `module Format;

struct Complex
{
    real: Int32 = 0;
    imaginary: Int32 = 0;
}

function run() -> ()
{
    var instance: Complex = {
        real: 0,
        imaginary: 0
    };
}
`;

        const actual_text = await parse_text_and_format(input_text);
        assert.equal(actual_text, expected_text);
    });

    it("Formats instantiate expressions nested with other instantiate expressions", async () => {
        const input_text = `module Format;

struct Complex
{
    real: Int32 = 0;
    imaginary: Int32 = 0;
}

struct My_struct
{
    a: Complex = {};
    b: Complex = {};
}

function run() -> ()
{
    var instance: My_struct = { a: {}, b: { real: 0, imaginary: 0 } };
}`;

        const expected_text = `module Format;

struct Complex
{
    real: Int32 = 0;
    imaginary: Int32 = 0;
}

struct My_struct
{
    a: Complex = {};
    b: Complex = {};
}

function run() -> ()
{
    var instance: My_struct = {
        a: {},
        b: {
            real: 0,
            imaginary: 0
        }
    };
}
`;

        const actual_text = await parse_text_and_format(input_text);
        assert.equal(actual_text, expected_text);
    });

    it("Formats empty functions correctly", async () => {
        const input_text = `module Format;

function empty() -> () {}`;

        const expected_text = `module Format;

function empty() -> ()
{
}
`;

        const actual_text = await parse_text_and_format(input_text);
        assert.equal(actual_text, expected_text);
    });
});

async function parse_text_and_format(input_text: string): Promise<string> {
    const parser = await Tree_sitter_parser.create_parser();
    const tree = Tree_sitter_parser.parse(parser, input_text);
    const core_tree = Tree_sitter_parser.to_parser_node(tree.rootNode, true);
    const core_module = Tree_sitter_parser.to_core_module(core_tree);
    return Text_formatter.format_module(core_module, {});
}
