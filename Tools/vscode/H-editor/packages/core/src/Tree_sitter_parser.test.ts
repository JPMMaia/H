import "mocha";

import * as assert from "assert";

import * as Tree_sitter_parser from "./Tree_sitter_parser";

describe("Tree_sitter_parser", () => {
    it("Can create parser and parse basic module", async () => {
        const parser = await Tree_sitter_parser.create_parser();
        assert.notEqual(parser, undefined);

        const tree = Tree_sitter_parser.parse(parser, "module Hello_world;");
        assert.notEqual(tree, undefined);
    });
});
