import { deepEqual, equal } from "assert";
import 'mocha';

import { createUpdateValueEdit } from './editJSON';

describe("createUpdateValueEdit function", () => {

    it("should be able to create edits of key-values strings", () => {

        const json = '{"foo":"bar"}';

        const edit = createUpdateValueEdit(json, 0, ["foo"], "hello world!");
        equal(edit.range.startCharacter, 8);
        equal(edit.range.endCharacter, 11);
        equal(edit.newText, "hello world!");
    });
});
