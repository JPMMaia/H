import "mocha";

import * as assert from "assert";

import * as Core from "../utilities/coreModelInterface";
import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Module_change from "../utilities/Change";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parser from "./Parser";
import * as Scanner from "./Scanner";
import * as Symbol_database from "./Symbol_database";
import * as Text_formatter from "./Text_formatter";

function create_parse_node(value: string, text_position: Parser.Text_position, children: Parser.Node[]): Parser.Node {
    return {
        word: { value: value, type: Grammar.Word_type.Alphanumeric },
        state: -1,
        production_rule_index: undefined,
        previous_node_on_stack: undefined,
        father_node: undefined,
        index_in_father: -1,
        children: children,
        text_position: text_position
    };
}

describe("Parse_tree_convertor.module_to_parse_tree", () => {

    it("Creates module parse tree from grammar 9", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const module = Module_examples.create_0();
        const symbol_database = Symbol_database.create_edit_database(module);
        const declarations = Parse_tree_convertor.create_declarations(module);
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, symbol_database, declarations, production_rules);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.production_rule_index, 0);

        {
            const node_0 = parse_tree.children[0];
            assert.equal(node_0.word.value, "Module_head");
            assert.equal(node_0.production_rule_index, 1);

            {
                const node_1 = node_0.children[0];
                assert.equal(node_1.word.value, "Module_declaration");
                assert.equal(node_1.production_rule_index, 2);

                {
                    const node_2 = node_1.children[0];
                    assert.equal(node_2.word.value, "module");
                    assert.equal(node_2.production_rule_index, undefined);
                }

                {
                    const node_3 = node_1.children[1];
                    assert.equal(node_3.word.value, "Module_name");
                    assert.equal(node_3.production_rule_index, 3);

                    {
                        const node_4 = node_3.children[0];
                        assert.equal(node_4.word.value, "module_name");
                        assert.equal(node_4.production_rule_index, undefined);
                    }
                }

                {
                    const node_5 = node_1.children[2];
                    assert.equal(node_5.word.value, ";");
                    assert.equal(node_5.production_rule_index, undefined);
                }
            }
        }
    });
});

function create_module_changes(
    start_text_position: Parser.Text_position,
    end_text_position: Parser.Text_position,
    new_text: string
): { position: any[], change: Module_change.Change }[] {
    const grammar_description = Grammar_examples.create_test_grammar_9_description();
    const production_rules = Grammar.create_production_rules(grammar_description);
    const module = Module_examples.create_0();
    const symbol_database = Symbol_database.create_edit_database(module);
    const declarations = Parse_tree_convertor.create_declarations(module);
    const initial_parse_tree = Parse_tree_convertor.module_to_parse_tree(module, symbol_database, declarations, production_rules);

    const map_word_to_terminal = (word: Grammar.Word): string => {
        if (word.value === "enum" || word.value === "export" || word.value === "function" || word.value === "module" || word.value === "struct" || word.value === "using") {
            return word.value;
        }

        if (word.type === Grammar.Word_type.Alphanumeric) {
            return "identifier";
        }

        return word.value;
    };

    const initial_parse_tree_text = Text_formatter.to_string(initial_parse_tree);
    const scanned_words = Scanner.scan(initial_parse_tree_text, 0, initial_parse_tree_text.length);

    const parsing_tables = Grammar.create_parsing_tables_from_production_rules(production_rules);
    const array_infos = Grammar.create_array_infos(production_rules);
    const parse_tree = Parser.parse(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, array_infos, map_word_to_terminal);

    assert.notEqual(parse_tree, undefined);
    if (parse_tree === undefined) {
        return [];
    }

    // Also sets parse_tree Text_position:
    const text = Text_formatter.to_string(parse_tree);
    console.log(text);

    const scanned_input_change = Parser.scan_new_change(
        parse_tree,
        start_text_position,
        end_text_position,
        new_text
    );

    const parse_result = Parser.parse_incrementally(
        parse_tree,
        scanned_input_change.start_change_node_position,
        scanned_input_change.new_words,
        scanned_input_change.after_change_node_position,
        parsing_tables.action_table,
        parsing_tables.go_to_table,
        array_infos,
        map_word_to_terminal
    );

    assert.equal(parse_result.status, Parser.Parse_status.Accept);

    const production_rule_to_value_map = Parse_tree_convertor.create_production_rule_to_value_map(production_rules);
    const production_rule_to_change_action_map = Parse_tree_convertor.create_production_rule_to_change_action_map(production_rules);

    const module_changes = Parse_tree_convertor.create_module_changes(
        module,
        symbol_database,
        declarations,
        production_rules,
        production_rule_to_value_map,
        production_rule_to_change_action_map,
        parse_tree,
        parse_result.changes[0].value as Parser.Modify_change
    );

    return module_changes;
}

describe("Parse_tree_convertor.create_module_changes", () => {

    it("Creates module changes from parse tree of grammar 9 test 0", () => {

        const module_changes = create_module_changes(
            { line: 0, column: 18 },
            { line: 0, column: 18 },
            "_2"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Update);

            const update_change = change.change.value as Module_change.Update;
            assert.equal(update_change.key, "name");
            assert.equal(update_change.value, "module_name_2");
        }
    });

    it("Creates module changes from parse tree of grammar 9 test 1", () => {

        const module_changes = create_module_changes(
            { line: 0, column: 19 },
            { line: 0, column: 19 },
            "\nfunction function_name() -> () {}\n"
        );

        assert.equal(module_changes.length, 2);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["internal_declarations"]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "function_declarations");
            assert.equal(add_change.index, 1);

            const function_declaration = add_change.value as Core.Function_declaration;
            assert.equal(function_declaration.id, 200);
            assert.equal(function_declaration.linkage, Core.Linkage.Private);
            assert.equal(function_declaration.type.is_variadic, false);
            assert.deepEqual(function_declaration.name, "function_name");
            assert.deepEqual(function_declaration.input_parameter_ids, []);
            assert.deepEqual(function_declaration.input_parameter_names, []);
            assert.deepEqual(function_declaration.type.input_parameter_types, []);
            assert.deepEqual(function_declaration.output_parameter_ids, []);
            assert.deepEqual(function_declaration.output_parameter_names, []);
            assert.deepEqual(function_declaration.type.output_parameter_types, []);
        }

        {
            const change = module_changes[1];
            assert.deepEqual(change.position, ["definitions"]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "function_definitions");
            assert.equal(add_change.index, 5);

            const function_definition = add_change.value as Core.Function_definition;
            assert.equal(function_definition.id, 200);
            assert.deepEqual(function_definition.statements, []);
        }
    });
});
