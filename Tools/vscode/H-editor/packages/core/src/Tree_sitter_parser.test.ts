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

    it("Create module", async () => {
        const parser = await Tree_sitter_parser.create_parser();
        assert.notEqual(parser, undefined);

        const tree = Tree_sitter_parser.parse(parser, "module Hello_world;");
        assert.notEqual(tree, undefined);

        const parser_node = Tree_sitter_parser.to_parser_node(tree.rootNode);
        assert.notEqual(parser_node, undefined);

        const core_module = Tree_sitter_parser.to_core_module(parser_node);
        assert.equal(core_module.name, "Hello_world");
    });
});
