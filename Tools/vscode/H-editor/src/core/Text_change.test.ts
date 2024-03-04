import "mocha";

import * as assert from "assert";
import * as Core from "./Core_interface";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Document from "./Document";
import * as Language from "./Language";
import * as Module_examples from "./Module_examples";
import * as Text_change from "./Text_change";
import * as Type_utilities from "./Type_utilities";

describe("Text_change.update", () => {

    const language_description = Language.create_default_description();

    it("Handles add first character", () => {

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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
                                name: "",
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
                                                                    name: "stdio"
                                                                }
                                                            }
                                                        },
                                                        member_name: "puts"
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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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
        const expected_statements = expected_function_value.definition.statements;

        const actual_module = new_document_state.module;
        const actual_function_value = actual_module.declarations[0].value as Core_intermediate_representation.Function;
        const actual_statements = actual_function_value.definition.statements;

        for (let statement_index = 0; statement_index < expected_statements.length; ++statement_index) {
            const expected_statement = expected_statements[statement_index];
            const actual_statement = actual_statements[statement_index];

            assert.deepEqual(actual_statement, expected_statement, `case_${statement_index} did not match`);
        }

        assert.deepEqual(new_document_state.module, expected_module);
    });

    it("Handles assignment expressions", () => {

        const document_state = Document.create_empty_state(language_description.production_rules);

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

        const document_state = Document.create_empty_state(language_description.production_rules);

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
});