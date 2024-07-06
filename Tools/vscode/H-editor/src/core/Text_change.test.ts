import "mocha";

import * as assert from "assert";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Document from "./Document";
import * as Language from "./Language";
import * as Module_examples from "./Module_examples";
import * as Storage_cache from "./Storage_cache";
import * as Text_change from "./Text_change";
import * as Type_utilities from "./Type_utilities";

function apply_text_changes(text: string, changes: Text_change.Text_change[]): string {
    let new_text = text;

    for (const change of changes) {
        const before_text = new_text.substring(0, change.range.start);
        const after_text = new_text.substring(change.range.end, new_text.length);
        new_text = before_text + change.text + after_text;
    }

    return new_text;
}

describe("Text_change.update", () => {

    let language_description: any;

    before(() => {
        const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
        language_description = Language.create_default_description(cache, "out/tests/graphviz.gv");
    });

    it("Handles add first character", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0,
                },
                text: "m"
            }
        ];

        const text_after_changes = "m";

        Text_change.update(
            language_description,
            document_state,
            text_changes,
            text_after_changes
        );
    });

    it("Handles adding module declaration", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0,
                },
                text: "module Foo;"
            }
        ];

        const text_after_changes = "module Foo;";

        Text_change.update(
            language_description,
            document_state,
            text_changes,
            text_after_changes
        );

        assert.equal(document_state.module.name, "Foo");
    });

    it("Handles aggregating multiple text changes", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0,
                },
                text: "module Foo;"
            },
            {
                range: {
                    start: 7,
                    end: 10,
                },
                text: "Bar"
            },
        ];

        const text_after_changes = "module Bar;";

        Text_change.update(
            language_description,
            document_state,
            text_changes,
            text_after_changes
        );

        assert.equal(document_state.module.name, "Bar");
    });

    it("Handles updating module name", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 0,
                        end: 0,
                    },
                    text: "module Foo;"
                }
            ];

            const text_after_changes = "module Foo;";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Foo");
        }

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 7,
                        end: 10,
                    },
                    text: "Bar"
                },
            ];

            const text_after_changes = "module Bar;";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Bar");
        }
    });

    it("Handles compilation errors", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 0,
                        end: 0,
                    },
                    text: "module"
                }
            ];

            const text_after_changes = "module";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );
        }

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 6,
                        end: 6,
                    },
                    text: " Foo;"
                },
            ];

            const text_after_changes = "module Foo;";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Foo");
        }
    });

    it("Handles add first declaration", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 0,
                        end: 0,
                    },
                    text: "module Foo;"
                }
            ];

            const text_after_changes = "module Foo;";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Foo");
        }

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 13,
                        end: 46,
                    },
                    text: "export using My_float = Float32;"
                }
            ];

            const text_after_changes = "module Foo;\n\nexport using My_float = Float32;\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_float");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const new_alias = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type, expected_type);
        }
    });

    it("Handles remove first declaration", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 0,
                        end: 0,
                    },
                    text: "module Foo;\n\nexport using My_float = Float32;\n"
                }
            ];

            const text_after_changes = "module Foo;\n\nexport using My_float = Float32;\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Foo");

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_float");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const new_alias = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type, expected_type);
        }

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 12,
                        end: 46,
                    },
                    text: ""
                }
            ];

            const text_after_changes = "module Foo;\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 0);
        }
    });

    it("Handles adding spaces", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 0,
                        end: 0,
                    },
                    text: "module Foo;\n\nexport using My_float = Float32;\n"
                }
            ];

            const text_after_changes = "module Foo;\n\nexport using My_float = Float32;\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Foo");

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_float");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const new_alias = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type, expected_type);
        }

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 26,
                        end: 26,
                    },
                    text: " "
                }
            ];

            const text_after_changes = "module Foo;\n\nexport using  My_float = Float32;\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_float");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const new_alias = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type, expected_type);
        }

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 27,
                        end: 27,
                    },
                    text: " "
                }
            ];

            const text_after_changes = "module Foo;\n\nexport using   My_float = Float32;\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_float");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const new_alias = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type, expected_type);
        }
    });

    it("Handles changing alias type", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 0,
                        end: 0,
                    },
                    text: "module Foo;\n\nexport using My_float = Float32;\n"
                }
            ];

            const text_after_changes = "module Foo;\n\nexport using My_float = Float32;\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Foo");

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_float");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const new_alias = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type, expected_type);
        }

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 37,
                        end: 44,
                    },
                    text: "Float16"
                }
            ];

            const text_after_changes = "module Foo;\n\nexport using My_float = Float16;\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_float");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const new_alias = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float16");
            assert.deepEqual(new_alias.type, expected_type);
        }
    });

    it("Handles adding first function parameter", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 0,
                        end: 0,
                    },
                    text: "module Foo;\n\nexport function My_function() -> () {}\n"
                }
            ];

            const text_after_changes = "module Foo;\n\nexport function My_function() -> () {}\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Foo");

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_function");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Function);
            assert.equal(declaration.is_export, true);

            const function_value = declaration.value as Core_intermediate_representation.Function;

            const new_function_declaration = function_value.declaration;
            assert.equal(new_function_declaration.name, "My_function");
            assert.equal(new_function_declaration.linkage, Core_intermediate_representation.Linkage.External);
            assert.equal(new_function_declaration.input_parameter_names.length, 0);
            assert.equal(new_function_declaration.output_parameter_names.length, 0);
            assert.equal(new_function_declaration.type.is_variadic, false);
            assert.equal(new_function_declaration.type.input_parameter_types.length, 0);
            assert.equal(new_function_declaration.type.output_parameter_types.length, 0);
        }

        {
            const text_changes: Text_change.Text_change[] = [
                {
                    range: {
                        start: 41,
                        end: 41,
                    },
                    text: "first: Float16"
                }
            ];

            const text_after_changes = "module Foo;\n\nexport function My_function() -> (first: Float16) {}\n";

            Text_change.update(
                language_description,
                document_state,
                text_changes,
                text_after_changes
            );

            assert.equal(document_state.module.name, "Foo");

            assert.equal(document_state.pending_text_changes.length, 0);

            assert.equal(document_state.module.declarations.length, 1);

            const declaration = document_state.module.declarations[0];
            assert.equal(declaration.name, "My_function");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Function);
            assert.equal(declaration.is_export, true);

            const function_value = declaration.value as Core_intermediate_representation.Function;

            const new_function_declaration = function_value.declaration;
            assert.equal(new_function_declaration.input_parameter_names.length, 1);
            assert.equal(new_function_declaration.type.input_parameter_types.length, 1);
            if (new_function_declaration.input_parameter_names.length > 0 && new_function_declaration.type.input_parameter_types.length > 0) {
                assert.equal(new_function_declaration.input_parameter_names[0], "first");
                const expected_type = Type_utilities.parse_type_name("Float16");
                assert.deepEqual(new_function_declaration.type.input_parameter_types[0], expected_type[0]);
            }
        }
    });


    it("Handles hello world!", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const hello_world_program = `
module Hello_world;

import C.stdio as stdio;

export function hello() -> ()
{
    stdio.puts("Hello world!");
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: hello_world_program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, hello_world_program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        assert.equal(new_document_state.module.name, "Hello_world");

        const expected_imports: Core_intermediate_representation.Import_module_with_alias[] = [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: ["puts"]
            }
        ];
        assert.deepEqual(new_document_state.module.imports, expected_imports);

        const expected_declarations: Core_intermediate_representation.Declaration[] = [
            {
                name: "hello",
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "hello",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: Core_intermediate_representation.Linkage.External
                    },
                    definition: {
                        name: "hello",
                        statements: [
                            {
                                expression: {
                                    data: {
                                        type: Core_intermediate_representation.Expression_enum.Call_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Access_expression,
                                                    value: {
                                                        expression: {
                                                            data: {
                                                                type: Core_intermediate_representation.Expression_enum.Variable_expression,
                                                                value: {
                                                                    name: "stdio",
                                                                    access_type: Core_intermediate_representation.Access_type.Read
                                                                }
                                                            }
                                                        },
                                                        member_name: "puts",
                                                        access_type: Core_intermediate_representation.Access_type.Read
                                                    }
                                                }
                                            },
                                            arguments: [
                                                {
                                                    data: {
                                                        type: Core_intermediate_representation.Expression_enum.Constant_expression,
                                                        value: {
                                                            type: {
                                                                data: {
                                                                    type: Core_intermediate_representation.Type_reference_enum.Fundamental_type,
                                                                    value: Core_intermediate_representation.Fundamental_type.String
                                                                }
                                                            },
                                                            data: "Hello world!"
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        ];
        assert.deepEqual(new_document_state.module.declarations, expected_declarations);
    });

    it("Handles adding return statement", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const hello_world_program = `
module Hello_world;

import C.Standard_library as Cstl;

export function hello() -> ()
{
    Cstl.puts("Hello world!");
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: hello_world_program
            },
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, hello_world_program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 121,
                    end: 121
                },
                text: "    return 0;\n"
            },
        ];

        const hello_world_program_2 = `
module Hello_world;

import C.Standard_library as Cstl;

export function hello() -> ()
{
    Cstl.puts("Hello world!");
    return 0;
}
`;

        const new_document_state_2 = Text_change.update(language_description, new_document_state, text_changes_2, hello_world_program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
    });

    it("Handles variable declaration expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Variables;

export function main() -> (result: Int32)
{
    var my_constant_variable = 1;
    mutable my_mutable_variable = 2;
    my_mutable_variable = 3;
    return 0;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_variables();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles numbers", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Numbers;

export function main() -> (result: Int32)
{
    var my_int8 = 1i8;
    var my_int16 = 1i16;
    var my_int32 = 1i32;
    var my_int64 = 1i64;

    var my_uint8 = 1u8;
    var my_uint16 = 1u16;
    var my_uint32 = 1u32;
    var my_uint64 = 1u64;

    var my_float16 = 1.0f16;
    var my_float32 = 1.0f32;
    var my_float64 = 1.0f64;

    return 0;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_numbers();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles numeric casts", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Numeric_casts;

export function main() -> (result: Int32)
{
    var i64_to_i8 = 1i64 as Int8;
    var i64_to_i16 = 1i64 as Int16;
    var i64_to_i32 = 1i64 as Int32;

    var u64_to_u8 = 1u64 as Uint8;
    var u64_to_u16 = 1u64 as Uint16;
    var u64_to_u32 = 1u64 as Uint32;

    var i8_to_i16 = 1i8 as Int16;
    var u8_to_u16 = 1u8 as Uint16;
    
    var i32_to_u32 = 1i32 as Uint32;
    var u32_to_i32 = 1u32 as Int32;

    var i32_to_f16 = 1i32 as Float16;
    var i32_to_f32 = 1i32 as Float32;
    var i32_to_f64 = 1i32 as Float64;

    var f16_to_i32 = 1.0f16 as Int32;
    var f32_to_i32 = 1.0f32 as Int32;
    var f64_to_i32 = 1.0f64 as Int32;

    return 0;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_numeric_casts();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles booleans", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Booleans;

export function foo() -> ()
{
    var my_true_boolean = true;
    var my_false_boolean = false;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_booleans();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles binary expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Binary_expressions;

export function foo(
    first_integer: Int32,
    second_integer: Int32,
    first_boolean: Bool,
    second_boolean: Bool
) -> ()
{
    var add = first_integer + second_integer;
    var subtract = first_integer - second_integer;
    var multiply = first_integer * second_integer;
    var divide = first_integer / second_integer;
    var modulus = first_integer % second_integer;

    var equal = first_integer == second_integer;
    var not_equal = first_integer != second_integer;
    
    var less_than = first_integer < second_integer;
    var less_than_or_equal_to = first_integer <= second_integer;
    var greater_than = first_integer > second_integer;
    var greater_than_or_equal_to = first_integer >= second_integer;
    
    var logical_and = first_boolean && second_boolean;
    var logical_or = first_boolean || second_boolean;
    
    var bitwise_and = first_integer & second_integer;
    var bitwise_or = first_integer | second_integer;
    var bitwise_xor = first_integer ^ second_integer;
    var bit_shift_left = first_integer << second_integer;
    var bit_shift_right = first_integer >> second_integer;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_binary_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles binary expressions operator precedence", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Binary_expressions_operator_precedence;

export function foo(
    a: Int32,
    b: Int32,
    c: Int32
) -> ()
{
    var case_0 = a + b * c;
    var case_1 = a * b + c;
    var case_2 = a / b * c;
    var case_3 = a * b / c;

    var case_4 = a * function_call() + b;
    var case_5 = *a * *b;
    
    var case_6 = (a + b) * c;
    var case_7 = a * (b + c);

    var case_8 = a == 0 && b == 1;
    var case_9 = (a & b) == (b & a);
    var case_10 = a < b && b < c;
    var case_11 = a + b == b + c;

    var case_12 = -a + (-b);
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_binary_expressions_operator_precedence();
        const expected_function_value = expected_module.declarations[0].value as Core_intermediate_representation.Function;
        const expected_statements = (expected_function_value.definition as Core_intermediate_representation.Function_definition).statements;

        const actual_module = new_document_state.module;
        const actual_function_value = actual_module.declarations[0].value as Core_intermediate_representation.Function;

        assert.notEqual(actual_function_value.definition, undefined);
        const actual_statements = (actual_function_value.definition as Core_intermediate_representation.Function_definition).statements;

        for (let statement_index = 0; statement_index < expected_statements.length; ++statement_index) {
            const expected_statement = expected_statements[statement_index];
            const actual_statement = actual_statements[statement_index];

            assert.deepEqual(actual_statement, expected_statement, `case_${statement_index} did not match`);
        }

        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles assignment expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Assignment_expressions;

export function foo(
    other_integer: Int32
) -> ()
{
    mutable my_integer = 1;

    my_integer = 2;
    
    my_integer += other_integer;
    my_integer -= other_integer;
    my_integer *= other_integer;
    my_integer /= other_integer;
    my_integer %= other_integer;
    
    my_integer &= other_integer;
    my_integer |= other_integer;
    my_integer ^= other_integer;
    my_integer <<= other_integer;
    my_integer >>= other_integer;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_assignment_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles unary expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Unary_expressions;

export function foo(
    my_integer: Int32,
    my_boolean: Bool
) -> ()
{
    var not_variable = !my_boolean;
    var bitwise_not_variable = ~my_integer;
    var minus_variable = -my_integer;
    var pre_increment_variable = ++my_integer;
    var post_increment_variable = my_integer++;
    var pre_decrement_variable = --my_integer;
    var post_decrement_variable = my_integer--;
    var address_of_variable = &my_integer;
    var indirection_variable = *address_of_variable;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_unary_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles pointer types", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Pointer_types;

import C.stdio as stdio;

export using My_alias = *mutable stdio.FILE;

export struct My_struct
{
    my_integer: Int32 = 0;
    my_pointer_to_integer: *Int32 = null;
    file_stream: *mutable stdio.FILE = null;
}

export function run(
    my_integer: Int32,
    my_pointer_to_integer: *Int32,
    my_pointer_to_mutable_integer: *mutable Int32,
    my_pointer_to_pointer_to_integer: **Int32,
    my_pointer_to_pointer_to_mutable_integer: **mutable Int32,
    my_pointer_to_mutable_pointer_to_integer: *mutable *Int32,
    my_pointer_to_mutable_pointer_to_mutable_integer: *mutable *mutable Int32,
    file_stream: *mutable stdio.FILE
) -> ()
{
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_pointer_types();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles block expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Block_expressions;

export function run_blocks() -> ()
{
    var a = 0;

    {
        var b = a;
    }

    var b = a;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_block_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles for loop expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module For_loop_expressions;

import C.stdio as stdio;

function print_integer(value: Int32) -> ()
{
    stdio.printf("%d"c, value);
}

export function run_for_loops() -> ()
{
    for index in 0 to 3
    {
        print_integer(index);
    }

    for index in 0 to 4 step_by 1
    {
        print_integer(index);
    }

    for index in 4 to 0 step_by -1 reverse
    {
        print_integer(index);
    }

    for index in 4 to 0 reverse
    {
        print_integer(index);
    }
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_for_loop_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles if expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module If_expressions;

import C.stdio as stdio;

function print_message(message: *C_char) -> ()
{
    stdio.printf("%s\\n"c, message);
}

export function run_ifs(value: Int32) -> ()
{
    if value == 0
    {
        print_message("zero"c);
    }

    if value == 0
    {
        print_message("zero"c);
    }
    else if value == 1
    {
        print_message("one"c);
    }

    if value < 0
    {
        print_message("negative"c);
    }
    else
    {
        print_message("non-negative"c);
    }

    if value < 0
    {
        print_message("negative"c);
    }
    else if value > 0
    {
        print_message("positive"c);
    }
    else
    {
        print_message("zero"c);
    }

    if value < 0
    {
        print_message("message_0"c);
        print_message("message_1"c);
    }
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_if_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles handles modifying return void to return with value", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Empty_return_expression;

function run() -> (result: Int32)
{
    return;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const program_2 = `
module Empty_return_expression;

function run() -> (result: Int32)
{
    return 0;
}
`;

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 80,
                    end: 80
                },
                text: " 0"
            }
        ];

        const new_document_state_2 = Text_change.update(language_description, document_state, text_changes_2, program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 0);

        const expected_module = Module_examples.create_function_with_int32_return_expression();
        assert.deepEqual(new_document_state_2.module, expected_module);
    });


    it("Handles switch expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Switch_expressions;

export function run_switch(value: Int32) -> (result: Int32)
{
    switch value
    {
    case 0:
        var return_value = 0;
        return return_value;
    }

    switch value
    {
    case 1:
        return 1;
    case 2:
    case 3:
        return 2;
    case 4:
        break;
    case 5:
    default:
        return 3;
    }

    switch value
    {
    default:
    case 6:
        return 4;
    }

    return 5;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_switch_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles ternary condition expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Ternary_condition_expressions;

export function run_ternary_conditions(first_boolean: Bool, second_boolean: Bool) -> ()
{
    var a = first_boolean ? 1 : 0;
    var b = first_boolean == false ? 1 : 0;
    var c = !first_boolean ? 1 : 0;
    var d = first_boolean ? second_boolean ? 2 : 1 : 0;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_ternary_condition_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles while loop expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module While_loop_expressions;

import C.stdio as stdio;

function print_integer(value: Int32) -> ()
{
    stdio.printf("%d"c, value);
}

export function run_while_loops(size: Int32) -> ()
{
    {
        mutable index = 0;
        while index < size
        {
            print_integer(index);
            index += 1;
        }
    }

    {
        mutable index = 0;
        while index < size
        {
            if index % 2 == 0
            {
                continue;
            }

            if index > 5
            {
                break;
            }
            
            print_integer(index);
            index += 1;
        }
    }
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_while_loop_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles empty return expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Empty_return_expression;

function run() -> ()
{
    return;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 0);

        const expected_module = Module_examples.create_function_with_empty_return_expression();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles break expressions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Break_expressions;

import C.stdio as stdio;

function print_integer(value: Int32) -> ()
{
    stdio.printf("%d"c, value);
}

export function run_breaks(size: Int32) -> ()
{
    for index in 0 to size
    {
        if index > 4
        {
            break;
        }

        print_integer(index);
    }

    for index in 0 to size
    {
        mutable index_2 = 0;

        while index_2 < size
        {
            if index > 3
            {
                break;
            }

            print_integer(index_2);
            index += 1;
        }

        print_integer(index);
    }

    for index in 0 to size
    {
        mutable index_2 = 0;

        while index_2 < size
        {
            if index > 3
            {
                break 2;
            }

            print_integer(index_2);
            index += 1;
        }

        print_integer(index);
    }
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        console.log(new_document_state.text);

        const expected_module = Module_examples.create_break_expressions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles using alias", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Alias;

using My_int = Int64;

export function use_alias(size: My_int) -> ()
{
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_using_alias();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles using enums", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Enums;

export enum My_enum
{
    Value_0 = 0,
    Value_1,
    Value_2,
    
    Value_10 = 10,
    Value_11,
}

export function use_enums(enum_argument: My_enum) -> (result: Int32)
{
    var my_value = My_enum.Value_1;

    switch enum_argument
    {
        case My_enum.Value_0:
        case My_enum.Value_1:
        case My_enum.Value_2:
            return 0;

        case My_enum.Value_10:
        case My_enum.Value_11:
            return 1;
    }

    return 2;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_using_enums();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles using enum flags", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Enum_flags;

export enum My_enum_flag
{
    Flag_1 = 0x01,
    Flag_2 = 0x02,
    Flag_3 = 0x04,
    Flag_4 = 0x08,
}

export function use_enums(enum_argument: My_enum_flag) -> (result: Int32)
{
    var a = My_enum_flag.Flag_1 | My_enum_flag.Flag_2;
    var b = enum_argument & My_enum_flag.Flag_1;
    var c = enum_argument ^ My_enum_flag.Flag_1;

    if a == enum_argument {
        return 0;
    }

    if enum_argument has My_enum_flag.Flag_1 {
        return 1;
    }

    if enum_argument has My_enum_flag.Flag_2 {
        return 2;
    }

    if enum_argument has My_enum_flag.Flag_3 {
        return 3;
    }

    return 4;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_using_enum_flags();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles using structs", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Structs;

export struct My_struct
{
    a: Int32 = 1;
    b: Int32 = 2;
}

export struct My_struct_2
{
    a: My_struct = {};
    
    b: My_struct = {
        a: 2
    };

    c: My_struct = {
        a: 3,
        b: 4
    };
}

export function use_structs(my_struct: My_struct) -> ()
{
    var a = my_struct.a;
    
    var instance_0: My_struct = {};
    
    var instance_1: My_struct = {
        b: 3
    };

    var instance_2: My_struct_2 = {};

    var instance_3: My_struct_2 = explicit{
        a: {},
        b: {},
        c: explicit{
            a: 0,
            b: 1
        }
    };

    var nested_b_a = instance_3.b.a;

    mutable instance_4: My_struct = {};
    instance_4.a = 0;

    pass_struct({});
    var instance_5 = return_struct();
}

function pass_struct(my_struct: My_struct) -> ()
{
}

function return_struct() -> (my_struct: My_struct)
{
    return {};
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_using_structs();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles using unions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Unions;

export enum My_union_tag
{
    a = 0,
    b = 1,
}

export union My_union
{
    a: Int32;
    b: Float32;
}

export union My_union_2
{
    a: Int32;
    b: Int64;
}

export struct My_struct
{
    a: Int32 = 1;
}

export union My_union_3
{
    a: Int64;
    b: My_struct;
}

export function use_unions(my_union: My_union, my_union_tag: My_union_tag) -> ()
{
    if my_union_tag == My_union_tag.a
    {
        var a = my_union.a;
    }
    else if my_union_tag == My_union_tag.b
    {
        var b = my_union.b;
    }

    var instance_0: My_union = { a: 2 };
    var instance_1: My_union = { b: 3.0f32 };

    var instance_2: My_union_2 = { a: 2 };
    var instance_3: My_union_2 = { b: 3i64 };

    var instance_4: My_union_3 = { a: 3i64 };
    var instance_5: My_union_3 = { b: {} };
    var instance_6: My_union_3 = { b: explicit{a:2} };

    var nested_b_a = instance_6.b.a;

    mutable instance_7: My_union = { a: 1 };
    instance_7 = { a: 2 };

    pass_union({ a: 4});
    var instance_8 = return_union();
}

function pass_union(my_union: My_union) -> ()
{
}

function return_union() -> (my_union: My_union)
{
    return { b: 10.0f32 };
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_using_unions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles comments in the module declaration", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
// This is a very long
// module decription
module Comments_in_module_declaration;
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_comments_in_module_declaration();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles comments in alias", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Comments_in_alias;

// Alias comment
// Another line
using My_int = Int32;
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_comments_in_alias();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles comments in enums", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Comments_in_enums;

// Enum comment
// Another line
enum My_enum
{
    // This is A
    A = 1,
    B = 2,
    // This is C
    C = 3,
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_comments_in_enums();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles comments in functions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Comments_in_functions;

// Function comment
// No arguments
export function use_comments() -> ()
{
    // This is a comment
    var i = 0;

    // This is another comment
    // And yet another
    var x = 0;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_comments_in_functions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles comments in structs", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Comments_in_structs;

// Struct comment
// Another line
struct My_struct
{
    // This is a int
    a: Int32 = 0;
    b: Int32 = 0;
    // Another int
    // Another line
    c: Int32 = 0;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_comments_in_structs();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles comments in unions", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Comments_in_unions;

// Union comment
// Another line
union My_union
{
    // This is a int
    a: Int32;
    b: Int32;
    // Another int
    // Another line
    c: Int32;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_comments_in_unions();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles newlines after statements", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Newlines_after_statements;

function use_newlines() -> ()
{
    var i = 0;
    var j = 1;

    var k = 2;

    // A comment
    var l = 3;


    var m = 4;

}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        const expected_module = Module_examples.create_newlines_after_statements();
        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Recovers from errors 0", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Empty_return_expression;

function run() -> ()
{
    return
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 1);

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 67,
                    end: 67
                },
                text: ";"
            }
        ];

        const program_2 = apply_text_changes(program, text_changes_2);

        const new_document_state_2 = Text_change.update(language_description, new_document_state, text_changes_2, program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 0);

        const expected_module = Module_examples.create_function_with_empty_return_expression();
        assert.deepEqual(new_document_state_2.module, expected_module);
    });

    it("Recovers from errors 1", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Complete_import;

import 
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 1);

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 33,
                    end: 33
                },
                text: "some_module as some_module_alias;"
            }
        ];

        const program_2 = apply_text_changes(program, text_changes_2);

        const new_document_state_2 = Text_change.update(language_description, new_document_state, text_changes_2, program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 0);

        const expected_module = Module_examples.create_import_module();
        assert.deepEqual(new_document_state_2.module, expected_module);
    });

    it("Recovers from errors 2", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Complete_import_with_function;

import 

export function run() -> ()
{
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 1);

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 47,
                    end: 47
                },
                text: "some_module as some_module_alias;"
            }
        ];

        const program_2 = apply_text_changes(program, text_changes_2);

        const new_document_state_2 = Text_change.update(language_description, new_document_state, text_changes_2, program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 0);

        const expected_module = Module_examples.create_import_module_with_empty_function();
        assert.deepEqual(new_document_state_2.module, expected_module);
    });

    it("Recovers from errors 3", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Complete_import_with_function;



export function run() -> ()
{
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 0);

        const new_document_state_2 = simulate_typing(language_description, new_document_state, 39, "import ");
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 1);

        const new_document_state_3 = simulate_typing(language_description, new_document_state_2, 46, "some_module as some_module_alias;");
        assert.equal(new_document_state_3.pending_text_changes.length, 0);
        assert.equal(new_document_state_3.diagnostics.length, 0);

        const expected_module = Module_examples.create_import_module_with_empty_function();
        assert.deepEqual(new_document_state_3.module, expected_module);
    });

    it("Handles keywords as identifiers depending on the context", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Recover_from_error;

function run() -> (result: Int32)
{
    var a = 0;
    return a;
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 0);

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 92,
                    end: 92
                },
                text: "s"
            }
        ];

        const program_2 = apply_text_changes(program, text_changes_2);

        const new_document_state_2 = Text_change.update(language_description, new_document_state, text_changes_2, program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 0);
    });

    it("Recovers from errors 4", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Recover_from_error;

function run(value: 
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 1);

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 49,
                    end: 49
                },
                text: "Int32) -> (){}"
            }
        ];

        const program_2 = apply_text_changes(program, text_changes_2);

        const new_document_state_2 = Text_change.update(language_description, new_document_state, text_changes_2, program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 0);
    });

    it("Recovers from errors 5", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module Recover_from_error;

import dependency as dep;

function run() -> ()
{
    
    // a comment
}
`;

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 0);

        const new_document_state_2 = simulate_typing(language_description, new_document_state, 83, "dep.");
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 1);

        const new_document_state_3 = simulate_erasing(language_description, new_document_state_2, 83, 87);
        assert.equal(new_document_state_3.pending_text_changes.length, 0);
        assert.equal(new_document_state_3.diagnostics.length, 0);

        const new_document_state_4 = simulate_typing(language_description, new_document_state_3, 83, "dep.");
        assert.equal(new_document_state_4.pending_text_changes.length, 0);
        assert.equal(new_document_state_4.diagnostics.length, 1);
    });

    it("Handles changing module name and update custom type references", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module name_0;

struct Node
{
    parent: *Node = null;
}

function run(a: Node) -> (b: Node)
{
    var c: Node = {};
    return {};
}
`;

        const visit_custom_type_references = (core_module: Core_intermediate_representation.Module, visitor: (type: Core_intermediate_representation.Custom_type_reference) => void): void => {
            {
                const declaration = new_document_state.module.declarations[0];
                const struct_declaration = declaration.value as Core_intermediate_representation.Struct_declaration;
                const member_type = struct_declaration.member_types[0];
                const pointer_type = member_type.data.value as Core_intermediate_representation.Pointer_type;
                const custom_type_reference = pointer_type.element_type[0].data.value as Core_intermediate_representation.Custom_type_reference;
                visitor(custom_type_reference);
            }

            {
                const declaration = new_document_state.module.declarations[1];
                const function_value = declaration.value as Core_intermediate_representation.Function;

                {
                    const function_declaration = function_value.declaration;
                    {
                        const custom_type_reference = function_declaration.type.input_parameter_types[0].data.value as Core_intermediate_representation.Custom_type_reference;
                        visitor(custom_type_reference);
                    }
                    {
                        const custom_type_reference = function_declaration.type.output_parameter_types[0].data.value as Core_intermediate_representation.Custom_type_reference;
                        visitor(custom_type_reference);
                    }
                }

                {
                    const function_definition = function_value.definition;
                    if (function_definition !== undefined) {
                        const variable_declaration = function_definition.statements[0].expression.data.value as Core_intermediate_representation.Variable_declaration_with_type_expression;
                        const custom_type_reference = variable_declaration.type.data.value as Core_intermediate_representation.Custom_type_reference;
                        visitor(custom_type_reference);
                    }
                }
            }
        };

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 0);

        visit_custom_type_references(new_document_state.module, (type: Core_intermediate_representation.Custom_type_reference) => assert.equal(type.module_reference.name, "name_0"));

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 8,
                    end: 14
                },
                text: "name_1"
            }
        ];

        const program_2 = apply_text_changes(program, text_changes_2);

        const new_document_state_2 = Text_change.update(language_description, new_document_state, text_changes_2, program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 0);

        visit_custom_type_references(new_document_state_2.module, (type: Core_intermediate_representation.Custom_type_reference) => assert.equal(type.module_reference.name, "name_1"));
    });

    it("Handles changing import module name and update custom type references", () => {

        const document_state = Document.create_empty_state("", language_description.production_rules);

        const program = `
module my_module;

import name_0 as alias_0;

struct My_struct
{
    value: alias_0.My_struct = {};
}

function run(a: alias_0.My_struct) -> (b: alias_0.My_struct)
{
    var c: alias_0.My_struct = {};
    return {};
}
`;

        const visit_custom_type_references = (core_module: Core_intermediate_representation.Module, visitor: (type: Core_intermediate_representation.Custom_type_reference) => void): void => {
            {
                const declaration = new_document_state.module.declarations[0];
                const struct_declaration = declaration.value as Core_intermediate_representation.Struct_declaration;
                const member_type = struct_declaration.member_types[0];
                const custom_type_reference = member_type.data.value as Core_intermediate_representation.Custom_type_reference;
                visitor(custom_type_reference);
            }

            {
                const declaration = new_document_state.module.declarations[1];
                const function_value = declaration.value as Core_intermediate_representation.Function;

                {
                    const function_declaration = function_value.declaration;
                    {
                        const custom_type_reference = function_declaration.type.input_parameter_types[0].data.value as Core_intermediate_representation.Custom_type_reference;
                        visitor(custom_type_reference);
                    }
                    {
                        const custom_type_reference = function_declaration.type.output_parameter_types[0].data.value as Core_intermediate_representation.Custom_type_reference;
                        visitor(custom_type_reference);
                    }
                }

                {
                    const function_definition = function_value.definition;
                    if (function_definition !== undefined) {
                        const variable_declaration = function_definition.statements[0].expression.data.value as Core_intermediate_representation.Variable_declaration_with_type_expression;
                        const custom_type_reference = variable_declaration.type.data.value as Core_intermediate_representation.Custom_type_reference;
                        visitor(custom_type_reference);
                    }
                }
            }
        };

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: program
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, program);
        assert.equal(new_document_state.pending_text_changes.length, 0);
        assert.equal(new_document_state.diagnostics.length, 0);

        visit_custom_type_references(new_document_state.module, (type: Core_intermediate_representation.Custom_type_reference) => {
            assert.equal(type.module_reference.name, "name_0");
        });

        const text_changes_2: Text_change.Text_change[] = [
            {
                range: {
                    start: 27, // TODO
                    end: 33
                },
                text: "name_1"
            }
        ];

        const program_2 = apply_text_changes(program, text_changes_2);

        const new_document_state_2 = Text_change.update(language_description, new_document_state, text_changes_2, program_2);
        assert.equal(new_document_state_2.pending_text_changes.length, 0);
        assert.equal(new_document_state_2.diagnostics.length, 0);

        visit_custom_type_references(new_document_state_2.module, (type: Core_intermediate_representation.Custom_type_reference) => {
            assert.equal(type.module_reference.name, "name_1");
        });
    });
});

describe("Text_change.aggregate_changes", () => {
    it("Handles erasing of characters 0", () => {
        const original_text = "()";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 1,
                    end: 1
                },
                text: "foo: "
            },
            {
                range: {
                    start: 5,
                    end: 6
                },
                text: ""
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 1);
        assert.equal(aggregated_changes.range.end, 1);
        assert.equal(aggregated_changes.text, "foo:");
    });

    it("Handles erasing of characters 1", () => {
        const original_text = "()";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 1,
                    end: 1
                },
                text: "foo: Int32"
            },
            {
                range: {
                    start: 1,
                    end: 11
                },
                text: ""
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 1);
        assert.equal(aggregated_changes.range.end, 1);
        assert.equal(aggregated_changes.text, "");
    });

    it("Handles erasing of characters 2", () => {
        const original_text = "()";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 1,
                    end: 1
                },
                text: "foo: Int32"
            },
            {
                range: {
                    start: 11,
                    end: 12
                },
                text: ""
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 1);
        assert.equal(aggregated_changes.range.end, 2);
        assert.equal(aggregated_changes.text, "foo: Int32");
    });

    it("Handles erasing of characters 3", () => {
        const original_text = "()23456";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 2,
                    end: 7
                },
                text: ""
            },
            {
                range: {
                    start: 1,
                    end: 1
                },
                text: "foo"
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 1);
        assert.equal(aggregated_changes.range.end, 7);
        assert.equal(aggregated_changes.text, "foo)");
    });

    it("Handles first is first 0", () => {
        const original_text = "";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: "abc"
            },
            {
                range: {
                    start: 1,
                    end: 3
                },
                text: "123"
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 0);
        assert.equal(aggregated_changes.range.end, 0);
        assert.equal(aggregated_changes.text, "a123");
    });

    it("Handles first is first 1", () => {
        const original_text = "de";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: "abc"
            },
            {
                range: {
                    start: 5,
                    end: 5
                },
                text: "123"
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 0);
        assert.equal(aggregated_changes.range.end, 2);
        assert.equal(aggregated_changes.text, "abcde123");
    });

    it("Handles first is first 2", () => {
        const original_text = "ab";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: 2
                },
                text: "abc"
            },
            {
                range: {
                    start: 1,
                    end: 2
                },
                text: "1234"
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 0);
        assert.equal(aggregated_changes.range.end, 2);
        assert.equal(aggregated_changes.text, "a1234c");
    });

    it("Handles first is first 3", () => {
        const original_text = "xyzw";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 1,
                    end: 3
                },
                text: "abc"
            },
            {
                range: {
                    start: 1,
                    end: 5
                },
                text: "123"
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 1);
        assert.equal(aggregated_changes.range.end, 4);
        assert.equal(aggregated_changes.text, "123");
    });

    it("Handles second is first 0", () => {
        const original_text = " ";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 1,
                    end: 1
                },
                text: "abc"
            },
            {
                range: {
                    start: 0,
                    end: 3
                },
                text: "123"
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 0);
        assert.equal(aggregated_changes.range.end, 1);
        assert.equal(aggregated_changes.text, "123c");
    });

    it("Handles second is first 1", () => {
        const original_text = "de";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 2,
                    end: 2
                },
                text: "abc"
            },
            {
                range: {
                    start: 0,
                    end: 0
                },
                text: "123"
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 0);
        assert.equal(aggregated_changes.range.end, 2);
        assert.equal(aggregated_changes.text, "123deabc");
    });

    it("Handles second is first 2", () => {
        const original_text = "abc";

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 1,
                    end: 2
                },
                text: "1234"
            },
            {
                range: {
                    start: 0,
                    end: 6
                },
                text: "def"
            },
        ];

        const aggregated_changes = Text_change.aggregate_text_changes(original_text, text_changes);

        assert.equal(aggregated_changes.range.start, 0);
        assert.equal(aggregated_changes.range.end, 3);
        assert.equal(aggregated_changes.text, "def");
    });

    it("Handles typing 0", () => {
        const original_text = "";
        const text = "import ";
        const aggregated_changes = simulate_typing_aggretate_changes(original_text, { start: 0, end: 0 }, text);

        assert.equal(aggregated_changes.length, 1);
        assert.equal(aggregated_changes[0].range.start, 0);
        assert.equal(aggregated_changes[0].range.end, 0);
        assert.equal(aggregated_changes[0].text, text);
    });
});

function simulate_typing(
    language_description: Language.Description,
    document_state: Document.State,
    start_range: number,
    text: string
): Document.State {

    const range: Text_change.Text_range = {
        start: start_range,
        end: start_range
    };

    let current_program = apply_text_changes(document_state.text, document_state.pending_text_changes);
    let current_document_state = document_state;

    for (let index = 0; index < text.length; ++index) {

        const character = text.charAt(index);

        const text_changes: Text_change.Text_change[] = [
            {
                range: range,
                text: character
            }
        ];

        const new_program = apply_text_changes(current_program, text_changes);

        const new_document_state = Text_change.update(language_description, current_document_state, text_changes, new_program);

        current_program = new_program;
        current_document_state = new_document_state;
        range.start += 1;
        range.end += 1;
    }

    return current_document_state;
}

function simulate_erasing(
    language_description: Language.Description,
    document_state: Document.State,
    start_range: number,
    end_range: number
): Document.State {

    const range: Text_change.Text_range = {
        start: end_range - 1,
        end: end_range
    };

    let current_program = apply_text_changes(document_state.text, document_state.pending_text_changes);
    let current_document_state = document_state;

    const characters_to_erase_count = end_range - start_range;

    for (let index = 0; index < characters_to_erase_count; ++index) {

        const text_changes: Text_change.Text_change[] = [
            {
                range: range,
                text: ""
            }
        ];

        const new_program = apply_text_changes(current_program, text_changes);

        const new_document_state = Text_change.update(language_description, current_document_state, text_changes, new_program);

        current_program = new_program;
        current_document_state = new_document_state;
        range.start -= 1;
        range.end -= 1;
    }

    return current_document_state;
}

function simulate_typing_aggretate_changes(
    program: string,
    start_range: Text_change.Text_range,
    text: string
): Text_change.Text_change[] {

    const range: Text_change.Text_range = {
        start: start_range.start,
        end: start_range.end
    };

    let current_program = program;

    let pending_text_changes: Text_change.Text_change[] = [];

    for (let index = 0; index < text.length; ++index) {

        const character = text.charAt(index);

        const text_changes: Text_change.Text_change[] = [
            {
                range: range,
                text: character
            },
        ];

        const new_program = apply_text_changes(current_program, text_changes);

        const aggregated_changes = Text_change.aggregate_text_changes(program, [...pending_text_changes, ...text_changes]);
        pending_text_changes = [aggregated_changes];

        current_program = new_program;
        range.start += 1;
        range.end += 1;
    }

    return pending_text_changes;
}
