import "mocha";

import * as assert from "assert";
import * as Grammar from "./Grammar";
import * as Scanner from "./Scanner";

describe("Scanner.scan", () => {
    it("Scans integers", () => {
        const input = "1234";
        const scanned_words = Scanner.scan(input);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Number);
    });

    it("Scans floats", () => {
        const input = "12.34";
        const scanned_words = Scanner.scan(input);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Number);
    });

    it("Scans invalid numbers", () => {
        const input = "12.34.56";
        const scanned_words = Scanner.scan(input);

        assert.equal(scanned_words.length, 1);

        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Invalid);
    });

    it("Scans alphanumerics", () => {
        const input = "add_0_foo";
        const scanned_words = Scanner.scan(input);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Alphanumeric);
    });

    it("Scans strings", () => {
        const input = "\"Hello\" \"\\\"\"";
        const scanned_words = Scanner.scan(input);

        assert.equal(scanned_words.length, 2);

        assert.equal(scanned_words[0].value, "Hello");
        assert.equal(scanned_words[0].type, Grammar.Word_type.String);

        assert.equal(scanned_words[1].value, "\\\"");
        assert.equal(scanned_words[1].type, Grammar.Word_type.String);
    });

    it("Scans symbols", () => {
        const input = ". != == /= %";
        const scanned_words = Scanner.scan(input);

        assert.equal(scanned_words.length, 5);

        assert.equal(scanned_words[0].value, ".");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[1].value, "!=");
        assert.equal(scanned_words[1].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[2].value, "==");
        assert.equal(scanned_words[2].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[3].value, "/=");
        assert.equal(scanned_words[3].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[4].value, "%");
        assert.equal(scanned_words[4].type, Grammar.Word_type.Symbol);
    });
});