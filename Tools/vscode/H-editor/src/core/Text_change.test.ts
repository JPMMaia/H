import "mocha";

import * as assert from "assert";
import * as Document from "./Document";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Language from "./Language";
import * as Symbol_database from "./Symbol_database";
import * as Text_change from "./Text_change";

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
});
