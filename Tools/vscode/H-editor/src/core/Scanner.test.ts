import "mocha";

import * as assert from "assert";
import * as Grammar from "./Grammar";
import * as Scanner from "./Scanner";

describe("Scanner.scan", () => {
    it("Scans integers", () => {
        const input = "1234";
        const scanned_words = Scanner.scan(input, 0, input.length);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Number);
    });

    it("Scans integers with suffix", () => {
        const input = "1234i32";
        const scanned_words = Scanner.scan(input, 0, input.length);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Number);

        const suffix = Scanner.get_suffix(scanned_words[0]);
        assert.equal(suffix, "i32");
    });

    it("Scans hexadecimal integers", () => {
        const input = "0x1234";
        const scanned_words = Scanner.scan(input, 0, input.length);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Number);

        const suffix = Scanner.get_suffix(scanned_words[0]);
        assert.equal(suffix, "");
    });

    it("Scans hexadecimal integers with suffix", () => {
        const input = "0x1234i64";
        const scanned_words = Scanner.scan(input, 0, input.length);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Number);

        const suffix = Scanner.get_suffix(scanned_words[0]);
        assert.equal(suffix, "i64");
    });

    it("Scans floats", () => {
        const input = "12.34";
        const scanned_words = Scanner.scan(input, 0, input.length);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Number);
    });

    it("Scans floats with suffix", () => {
        const input = "12.34f32";
        const scanned_words = Scanner.scan(input, 0, input.length);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Number);

        const suffix = Scanner.get_suffix(scanned_words[0]);
        assert.equal(suffix, "f32");
    });

    it("Scans invalid numbers", () => {
        const input = "12.34.56";
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 1);

        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Invalid);
    });

    it("Scans alphanumerics", () => {
        const input = "add_0_foo";
        const scanned_words = Scanner.scan(input, 0, input.length);
        assert.equal(scanned_words.length, 1);
        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.Alphanumeric);
    });

    it("Scans strings", () => {
        const input = "\"Hello\" \"\\\"\"";
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 2);

        assert.equal(scanned_words[0].value, '"Hello"');
        assert.equal(scanned_words[0].type, Grammar.Word_type.String);

        assert.equal(scanned_words[1].value, '"\\\""');
        assert.equal(scanned_words[1].type, Grammar.Word_type.String);
    });

    it("Scans strings with suffix", () => {
        const input = '"my c string"c';
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 1);

        assert.equal(scanned_words[0].value, input);
        assert.equal(scanned_words[0].type, Grammar.Word_type.String);

        const suffix = Scanner.get_suffix(scanned_words[0]);
        assert.equal(suffix, "c");
    });

    it("Scans symbols", () => {
        const input = ". != == /= %";
        const scanned_words = Scanner.scan(input, 0, input.length);

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

    it("Scans symbols 2", () => {
        const input = "++;--,++";
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 5);

        assert.equal(scanned_words[0].value, "++");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[1].value, ";");
        assert.equal(scanned_words[1].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[2].value, "--");
        assert.equal(scanned_words[2].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[3].value, ",");
        assert.equal(scanned_words[3].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[4].value, "++");
        assert.equal(scanned_words[4].type, Grammar.Word_type.Symbol);
    });

    it("Scans symbols 3", () => {
        const input = '"string"+"string"';
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 3);

        assert.equal(scanned_words[0].value, '"string"');
        assert.equal(scanned_words[0].type, Grammar.Word_type.String);

        assert.equal(scanned_words[1].value, "+");
        assert.equal(scanned_words[1].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[2].value, '"string"');
        assert.equal(scanned_words[2].type, Grammar.Word_type.String);
    });

    it("Scans symbols 4", () => {
        const input = '** * * *=';
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 5);

        assert.equal(scanned_words[0].value, "*");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[1].value, "*");
        assert.equal(scanned_words[1].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[2].value, "*");
        assert.equal(scanned_words[2].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[3].value, "*");
        assert.equal(scanned_words[3].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[4].value, "*=");
        assert.equal(scanned_words[4].type, Grammar.Word_type.Symbol);
    });

    it("Scans symbols 5", () => {
        const input = ': ::';
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 2);

        assert.equal(scanned_words[0].value, ":");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[1].value, "::");
        assert.equal(scanned_words[1].type, Grammar.Word_type.Symbol);
    });

    it("Scans parenthesis", () => {
        const input = "() {} []";
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 6);

        assert.equal(scanned_words[0].value, "(");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[1].value, ")");
        assert.equal(scanned_words[1].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[2].value, "{");
        assert.equal(scanned_words[2].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[3].value, "}");
        assert.equal(scanned_words[3].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[4].value, "[");
        assert.equal(scanned_words[4].type, Grammar.Word_type.Symbol);

        assert.equal(scanned_words[5].value, "]");
        assert.equal(scanned_words[5].type, Grammar.Word_type.Symbol);
    });

    it("Scans comments", () => {
        const input = "// This is a comment!\nvar i = 0;";
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 6);

        assert.equal(scanned_words[0].value, "// This is a comment!");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Comment);
        assert.equal(scanned_words[0].newlines_after, 1);

        assert.equal(scanned_words[1].value, "var");
        assert.equal(scanned_words[1].type, Grammar.Word_type.Alphanumeric);

        assert.equal(scanned_words[2].value, "i");
        assert.equal(scanned_words[2].type, Grammar.Word_type.Alphanumeric);
    });

    it("Scans comments without \\r", () => {
        const input = "// This is a comment!\r\n// This is another one\r\n";
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 1);

        assert.equal(scanned_words[0].value, "// This is a comment!\n// This is another one");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Comment);
        assert.equal(scanned_words[0].newlines_after, 1);
    });

    it("Scans multiple comments", () => {
        const input = "// This is a comment!\n// This is another one\nvar i = 0;";
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 6);

        assert.equal(scanned_words[0].value, "// This is a comment!\n// This is another one");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Comment);
        assert.equal(scanned_words[0].newlines_after, 1);

        assert.equal(scanned_words[1].value, "var");
        assert.equal(scanned_words[1].type, Grammar.Word_type.Alphanumeric);

        assert.equal(scanned_words[2].value, "i");
        assert.equal(scanned_words[2].type, Grammar.Word_type.Alphanumeric);
    });

    it("Scans newlines as information of the previous token", () => {
        const input = "var i = 0;\nvar j = 1;\n\n";
        const scanned_words = Scanner.scan(input, 0, input.length);

        assert.equal(scanned_words.length, 10);

        assert.equal(scanned_words[0].value, "var");
        assert.equal(scanned_words[0].type, Grammar.Word_type.Alphanumeric);
        assert.equal(scanned_words[0].newlines_after, 0);

        assert.equal(scanned_words[4].value, ";");
        assert.equal(scanned_words[4].type, Grammar.Word_type.Symbol);
        assert.equal(scanned_words[4].newlines_after, 1);

        assert.equal(scanned_words[5].value, "var");
        assert.equal(scanned_words[5].type, Grammar.Word_type.Alphanumeric);
        assert.equal(scanned_words[5].newlines_after, 0);

        assert.equal(scanned_words[9].value, ";");
        assert.equal(scanned_words[9].type, Grammar.Word_type.Symbol);
        assert.equal(scanned_words[9].newlines_after, 2);
    });
});
