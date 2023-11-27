import "mocha";

import * as assert from "assert";
import * as Core from "./Core_interface";
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

            assert.equal(document_state.module.export_declarations.alias_type_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.alias_type_declarations.elements.length, 1);

            const new_alias = document_state.module.export_declarations.alias_type_declarations.elements[0];
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type.elements, expected_type);
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

            assert.equal(document_state.module.export_declarations.alias_type_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.alias_type_declarations.elements.length, 1);

            const new_alias = document_state.module.export_declarations.alias_type_declarations.elements[0];
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type.elements, expected_type);
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

            assert.equal(document_state.module.export_declarations.alias_type_declarations.size, 0);
            assert.equal(document_state.module.export_declarations.alias_type_declarations.elements.length, 0);
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

            assert.equal(document_state.module.export_declarations.alias_type_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.alias_type_declarations.elements.length, 1);

            const new_alias = document_state.module.export_declarations.alias_type_declarations.elements[0];
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type.elements, expected_type);
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

            assert.equal(document_state.module.export_declarations.alias_type_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.alias_type_declarations.elements.length, 1);

            const new_alias = document_state.module.export_declarations.alias_type_declarations.elements[0];
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type.elements, expected_type);
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

            assert.equal(document_state.module.export_declarations.alias_type_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.alias_type_declarations.elements.length, 1);

            const new_alias = document_state.module.export_declarations.alias_type_declarations.elements[0];
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type.elements, expected_type);
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

            assert.equal(document_state.module.export_declarations.alias_type_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.alias_type_declarations.elements.length, 1);

            const new_alias = document_state.module.export_declarations.alias_type_declarations.elements[0];
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(new_alias.type.elements, expected_type);
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

            assert.equal(document_state.module.export_declarations.alias_type_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.alias_type_declarations.elements.length, 1);

            const new_alias = document_state.module.export_declarations.alias_type_declarations.elements[0];
            assert.equal(new_alias.name, "My_float");

            const expected_type = Type_utilities.parse_type_name("Float16");
            assert.deepEqual(new_alias.type.elements, expected_type);
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

            assert.equal(document_state.module.export_declarations.function_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.function_declarations.elements.length, 1);

            const new_function_declaration = document_state.module.export_declarations.function_declarations.elements[0];
            assert.equal(new_function_declaration.name, "My_function");
            assert.equal(new_function_declaration.linkage, Core.Linkage.External);
            assert.equal(new_function_declaration.input_parameter_names.size, 0);
            assert.equal(new_function_declaration.input_parameter_names.elements.length, 0);
            assert.equal(new_function_declaration.output_parameter_names.size, 0);
            assert.equal(new_function_declaration.output_parameter_names.elements.length, 0);
            assert.equal(new_function_declaration.type.is_variadic, false);
            assert.equal(new_function_declaration.type.input_parameter_types.size, 0);
            assert.equal(new_function_declaration.type.input_parameter_types.elements.length, 0);
            assert.equal(new_function_declaration.type.output_parameter_types.size, 0);
            assert.equal(new_function_declaration.type.output_parameter_types.elements.length, 0);
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

            assert.equal(document_state.module.export_declarations.function_declarations.size, 1);
            assert.equal(document_state.module.export_declarations.function_declarations.elements.length, 1);

            const new_function_declaration = document_state.module.export_declarations.function_declarations.elements[0];
            assert.equal(new_function_declaration.input_parameter_names.size, 1);
            assert.equal(new_function_declaration.input_parameter_names.elements.length, 1);
            assert.equal(new_function_declaration.type.input_parameter_types.size, 1);
            assert.equal(new_function_declaration.type.input_parameter_types.elements.length, 1);
            if (new_function_declaration.input_parameter_names.elements.length > 0 && new_function_declaration.type.input_parameter_types.elements.length > 0) {
                assert.equal(new_function_declaration.input_parameter_names.elements[0], "first");
                const expected_type = Type_utilities.parse_type_name("Float16");
                assert.deepEqual(new_function_declaration.type.input_parameter_types.elements[0], expected_type[0]);
            }
        }
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
        "a1234c"

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