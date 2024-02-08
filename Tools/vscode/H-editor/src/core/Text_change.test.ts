import "mocha";

import * as assert from "assert";
import * as Core from "./Core_interface";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Document from "./Document";
import * as Language from "./Language";
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
            }
        ];

        const new_document_state = Text_change.update(language_description, document_state, text_changes, hello_world_program);
        assert.equal(new_document_state.pending_text_changes.length, 0);

        assert.equal(new_document_state.module.name, "Hello_world");

        const expected_imports: Core_intermediate_representation.Import_module_with_alias[] = [
            { module_name: "C.Standard_library", alias: "Cstl" }
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
                                            module_reference: {
                                                name: "Cstl"
                                            },
                                            function_name: "puts",
                                            arguments: [
                                                {
                                                    data: {
                                                        type: Core_intermediate_representation.Expression_enum.Constant_expression,
                                                        value: {
                                                            type: {
                                                                type: Core_intermediate_representation.Constant_expression_enum.Fundamental_type,
                                                                value: Core_intermediate_representation.Fundamental_type.String
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