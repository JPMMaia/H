import "mocha";

import * as assert from "assert";

import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Text_formatter from "./Text_formatter";

describe("Text_formatter.to_string", () => {

    it("Formats alias correctly", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const mappings = Parse_tree_convertor_mappings.create_mapping();
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_alias_example());
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, production_rules, mappings);
        const text_cache = Parse_tree_text_position_cache.create_cache();

        const actual_text = Text_formatter.to_string(parse_tree, text_cache, []);

        const expected_text = "module alias_example;\n\nexport using My_alias = Float32;\n\n";

        assert.equal(actual_text, expected_text);
    });

    it("Formats enums correctly", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const mappings = Parse_tree_convertor_mappings.create_mapping();
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_enum_example());
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, production_rules, mappings);
        const text_cache = Parse_tree_text_position_cache.create_cache();

        const actual_text = Text_formatter.to_string(parse_tree, text_cache, []);

        const expected_text = "module enum_example;\n\nexport enum My_enum\n{\n    value_0 = 0,\n    value_1 = 1,\n    value_2 = 2,\n}\n\n";

        assert.equal(actual_text, expected_text);
    });

    it("Formats structs correctly", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const mappings = Parse_tree_convertor_mappings.create_mapping();
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_struct_example());
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, production_rules, mappings);
        const text_cache = Parse_tree_text_position_cache.create_cache();

        const actual_text = Text_formatter.to_string(parse_tree, text_cache, []);

        const expected_text = "module struct_example;\n\nexport struct My_struct\n{\n    member_0: Float32;\n    member_1: Float32;\n    member_2: Float32;\n}\n\n";

        assert.equal(actual_text, expected_text);
    });

    it("Formats functions correctly", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const mappings = Parse_tree_convertor_mappings.create_mapping();
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_function_example());
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, production_rules, mappings);
        const text_cache = Parse_tree_text_position_cache.create_cache();

        const actual_text = Text_formatter.to_string(parse_tree, text_cache, []);

        const expected_text = "module function_example;\n\nexport function My_function(lhs: Float32, rhs: Float32) -> (result: Float32)\n{\n    return lhs + rhs;\n}\n\n";

        assert.equal(actual_text, expected_text);
    });

    it("Formats module imports correctly", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const mappings = Parse_tree_convertor_mappings.create_mapping();
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_module_with_dependencies());
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, production_rules, mappings);
        const text_cache = Parse_tree_text_position_cache.create_cache();

        const actual_text = Text_formatter.to_string(parse_tree, text_cache, []);

        const expected_text = "module Module_with_dependencies;\n\nimport C.Standard_library as Cstl;\nimport My_library as ml;\n";

        assert.equal(actual_text, expected_text);
    });
});
