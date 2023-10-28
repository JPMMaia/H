import "mocha";

import * as assert from "assert";

import * as Core from "./Core_interface";
import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Language from "./Language";
import * as Module_change from "../utilities/Change";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Parser from "./Parser";
import { Node } from "./Parser_node";
import * as Scanner from "./Scanner";
import { scan_new_change } from "./Scan_new_changes";
import * as Text_formatter from "./Text_formatter";
import * as Type_utilities from "./Type_utilities";

const g_debug = false;

function assert_function_parameters(module: Core.Module, parameters_node: Node, parameter_names: string[], parameter_types: Core.Type_reference[]): void {

    assert.equal(parameters_node.children.length, parameter_names.length === 0 ? 0 : parameter_names.length * 2 - 1);

    for (let parameter_index = 0; parameter_index < parameter_names.length; ++parameter_index) {

        const parameter_node = parameters_node.children[parameter_index * 2];
        const parameter_name = parameter_names[parameter_index];
        const parameter_type = parameter_types[parameter_index];

        assert.equal(parameter_node.children.length, 3);

        {
            const parameter_name_node = parameter_node.children[0];
            assert.equal(parameter_name_node.children[0].word.value, parameter_name);
        }

        {
            const parameter_type_node = parameter_node.children[2];
            const expected_name = Type_utilities.get_type_name([parameter_type]);
            assert.equal(parameter_type_node.children[0].word.value, expected_name);
        }
    }
}

describe("Parse_tree_convertor.module_to_parse_tree", () => {

    it("Creates module parse tree from grammar 9", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const production_rules = Grammar.create_production_rules(grammar_description);
        const module = Module_examples.create_0();
        const declarations = Parse_tree_convertor.create_declarations(module);
        const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, declarations, production_rules);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.production_rule_index, 0);

        {
            const module_head = parse_tree.children[0];
            assert.equal(module_head.word.value, "Module_head");
            assert.equal(module_head.production_rule_index, 1);

            {
                const module_declaration = module_head.children[0];
                assert.equal(module_declaration.word.value, "Module_declaration");
                assert.equal(module_declaration.production_rule_index, 2);

                {
                    const module_keyword = module_declaration.children[0];
                    assert.equal(module_keyword.word.value, "module");
                    assert.equal(module_keyword.production_rule_index, undefined);
                }

                {
                    const module_name = module_declaration.children[1];
                    assert.equal(module_name.word.value, "Module_name");
                    assert.equal(module_name.production_rule_index, 3);

                    {
                        const identifier = module_name.children[0];
                        assert.equal(identifier.word.value, "module_name");
                        assert.equal(identifier.production_rule_index, undefined);
                    }
                }

                {
                    const semicolon = module_declaration.children[2];
                    assert.equal(semicolon.word.value, ";");
                    assert.equal(semicolon.production_rule_index, undefined);
                }
            }
        }

        {
            const module_body = parse_tree.children[1];
            assert.equal(module_body.children.length, declarations.length);

            for (let declaration_index = 0; declaration_index < declarations.length; ++declaration_index) {
                const declaration = declarations[declaration_index];
                const declaration_node = module_body.children[declaration_index];
                const module_declarations = declaration.is_export ? module.export_declarations : module.internal_declarations;

                assert.equal(declaration_node.word.value, "Declaration");


                if (declaration.type === Parse_tree_convertor.Declaration_type.Alias) {

                    const alias_declaration = module_declarations.alias_type_declarations.elements[declaration.index];

                    assert.equal(declaration_node.children.length, 1);

                    const alias_node = declaration_node.children[0];
                    assert.equal(alias_node.word.value, "Alias");

                    assert.equal(alias_node.children.length, 6);

                    {
                        const export_node = alias_node.children[0];
                        assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                        if (declaration.is_export) {
                            assert.equal(export_node.children[0].word.value, "export");
                        }
                    }

                    {
                        const name_node = alias_node.children[2];
                        assert.equal(name_node.children[0].word.value, alias_declaration.name);
                    }

                    {
                        const type_node = alias_node.children[4];
                        const expected_type = Type_utilities.get_type_name(alias_declaration.type.elements);
                        assert.equal(type_node.children[0].word.value, expected_type);
                    }
                }
                else if (declaration.type === Parse_tree_convertor.Declaration_type.Enum) {

                    const enum_declaration = module_declarations.enum_declarations.elements[declaration.index];

                    assert.equal(declaration_node.children.length, 1);

                    const enum_node = declaration_node.children[0];
                    assert.equal(enum_node.word.value, "Enum");

                    assert.equal(enum_node.children.length === 6, true);

                    {
                        const export_node = enum_node.children[0];
                        assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                        if (declaration.is_export) {
                            assert.equal(export_node.children[0].word.value, "export");
                        }
                    }

                    {
                        const name_node = enum_node.children[2];
                        assert.equal(name_node.children[0].word.value, enum_declaration.name);
                    }

                    const values_node = enum_node.children[4];
                    assert.equal(values_node.children.length, enum_declaration.values.size);
                    assert.equal(values_node.children.length, enum_declaration.values.elements.length);

                    for (let member_index = 0; member_index < enum_declaration.values.elements.length; ++member_index) {
                        const value = enum_declaration.values.elements[member_index];

                        const value_node = values_node.children[member_index];

                        {
                            const value_name_node = value_node.children[0];
                            const identifier_node = value_name_node.children[0];
                            assert.equal(identifier_node.word.value, value.name);
                        }

                        {
                            const value_value_node = value_node.children[2];
                            const number_node = value_value_node.children[0];
                            assert.equal(number_node.word.value, value.value);
                        }
                    }
                }
                else if (declaration.type === Parse_tree_convertor.Declaration_type.Function) {

                    const function_declaration = module_declarations.function_declarations.elements[declaration.index];

                    assert.equal(declaration_node.children.length, 1);

                    const function_node = declaration_node.children[0];
                    assert.equal(function_node.word.value, "Function");

                    assert.equal(function_node.children.length, 2);

                    {
                        const function_declaration_node = function_node.children[0];
                        assert.equal(function_declaration_node.word.value, "Function_declaration");

                        assert.equal(function_declaration_node.children.length > 3, true);

                        {
                            const export_node = function_declaration_node.children[0];
                            assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                            if (declaration.is_export) {
                                assert.equal(export_node.children[0].word.value, "export");
                            }
                        }

                        {
                            const name_node = function_declaration_node.children[2];
                            assert.equal(name_node.children[0].word.value, function_declaration.name);
                        }

                        {
                            const input_parameters_node = function_declaration_node.children[4];
                            assert.equal(input_parameters_node.word.value, "Function_input_parameters");

                            assert_function_parameters(module, input_parameters_node, function_declaration.input_parameter_names.elements, function_declaration.type.input_parameter_types.elements);
                        }

                        {
                            const output_parameters_node = function_declaration_node.children[8];
                            assert.equal(output_parameters_node.word.value, "Function_output_parameters");

                            assert_function_parameters(module, output_parameters_node, function_declaration.output_parameter_names.elements, function_declaration.type.output_parameter_types.elements);
                        }
                    }

                    {
                        const function_definition_node = function_node.children[1];
                        assert.equal(function_definition_node.word.value, "Function_definition");

                        const block = function_definition_node.children[0];
                        assert.equal(block.word.value, "Block");
                        assert.equal(block.children.length, 3);

                        {
                            const open_block_node = block.children[0];
                            assert.equal(open_block_node.word.value, "{");
                            assert.equal(open_block_node.children.length, 0);
                        }

                        {
                            const statements = block.children[1];
                            assert.equal(statements.word.value, "Statements");

                            if (function_declaration.name === "Empty_function") {
                                assert.equal(statements.children.length, 0);
                            }
                            else {
                                assert.equal(statements.children.length, 1);

                                const statement = statements.children[0];
                                assert.equal(statement.word.value, "Statement");
                                assert.equal(statement.children.length, 2);

                                {
                                    const return_expression = statement.children[0];
                                    assert.equal(return_expression.word.value, "Expression_return");
                                    assert.equal(return_expression.children.length, 2);

                                    {
                                        const return_keyword = return_expression.children[0];
                                        assert.equal(return_keyword.word.value, "return");
                                        assert.equal(return_keyword.children.length, 0);
                                    }

                                    {
                                        const generic_expression_0 = return_expression.children[1];
                                        assert.equal(generic_expression_0.word.value, "Generic_expression");
                                        assert.equal(generic_expression_0.children.length, 1);

                                        const binary_expression = generic_expression_0.children[0];
                                        assert.equal(binary_expression.word.value, "Expression_binary");
                                        assert.equal(binary_expression.children.length, 3);

                                        {
                                            const generic_expression_1 = binary_expression.children[0];
                                            assert.equal(generic_expression_1.word.value, "Generic_expression");
                                            assert.equal(generic_expression_1.children.length, 1);

                                            const variable_expression = generic_expression_1.children[0];
                                            assert.equal(variable_expression.word.value, "Expression_variable");
                                            assert.equal(variable_expression.children.length, 1);

                                            const variable_name_expression = variable_expression.children[0];
                                            assert.equal(variable_name_expression.word.value, "Variable_name");
                                            assert.equal(variable_name_expression.children.length, 1);

                                            const variable_name = variable_name_expression.children[0];
                                            assert.equal(variable_name.word.value, "lhs");
                                            assert.equal(variable_name.children.length, 0);
                                        }

                                        {
                                            const binary_symbol = binary_expression.children[1];
                                            assert.equal(binary_symbol.word.value, "Expression_binary_symbol");
                                            assert.equal(binary_symbol.children.length, 1);

                                            const symbol = binary_symbol.children[0];
                                            assert.equal(symbol.word.value, "Expression_binary_symbol_add");
                                            assert.equal(symbol.children.length, 1);

                                            const identifier = symbol.children[0];
                                            assert.equal(identifier.word.value, "+");
                                            assert.equal(identifier.children.length, 0);
                                        }

                                        {
                                            const generic_expression_2 = binary_expression.children[2];
                                            assert.equal(generic_expression_2.word.value, "Generic_expression");
                                            assert.equal(generic_expression_2.children.length, 1);

                                            const variable_expression = generic_expression_2.children[0];
                                            assert.equal(variable_expression.word.value, "Expression_variable");
                                            assert.equal(variable_expression.children.length, 1);

                                            const variable_name_expression = variable_expression.children[0];
                                            assert.equal(variable_name_expression.word.value, "Variable_name");
                                            assert.equal(variable_name_expression.children.length, 1);

                                            const variable_name = variable_name_expression.children[0];
                                            assert.equal(variable_name.word.value, "rhs");
                                            assert.equal(variable_name.children.length, 0);
                                        }
                                    }
                                }

                                {
                                    const semicolon = statement.children[1];
                                    assert.equal(semicolon.word.value, ";");
                                    assert.equal(semicolon.children.length, 0);
                                }
                            }
                        }

                        {
                            const close_block_node = block.children[2];
                            assert.equal(close_block_node.word.value, "}");
                            assert.equal(close_block_node.children.length, 0);
                        }
                    }
                }
                else if (declaration.type === Parse_tree_convertor.Declaration_type.Struct) {

                    const struct_declaration = module_declarations.struct_declarations.elements[declaration.index];

                    assert.equal(declaration_node.children.length, 1);

                    const struct_node = declaration_node.children[0];
                    assert.equal(struct_node.word.value, "Struct");

                    assert.equal(struct_node.children.length === 6, true);

                    {
                        const export_node = struct_node.children[0];
                        assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                        if (declaration.is_export) {
                            assert.equal(export_node.children[0].word.value, "export");
                        }
                    }

                    {
                        const name_node = struct_node.children[2];
                        assert.equal(name_node.children[0].word.value, struct_declaration.name);
                    }

                    const members_node = struct_node.children[4];
                    assert.equal(members_node.children.length, struct_declaration.member_names.size);
                    assert.equal(members_node.children.length, struct_declaration.member_names.elements.length);

                    for (let member_index = 0; member_index < struct_declaration.member_names.elements.length; ++member_index) {
                        const member_name = struct_declaration.member_names.elements[member_index];
                        const member_type = struct_declaration.member_types.elements[member_index];
                        const member_type_name = Type_utilities.get_type_name([member_type]);

                        const member_node = members_node.children[member_index];

                        {
                            const member_name_node = member_node.children[0];
                            const identifier_node = member_name_node.children[0];
                            assert.equal(identifier_node.word.value, member_name);
                        }

                        {
                            const member_type_node = member_node.children[2];
                            const identifier_node = member_type_node.children[0];
                            assert.equal(identifier_node.word.value, member_type_name);
                        }
                    }
                }
            }
        }
    });
});

interface Text_position {
    line: number;
    column: number;
}

function text_position_to_offset(text: string, position: Text_position): number {

    let current_offset = 0;

    let current_line = 0;

    while (current_line < position.line) {
        const next_new_line = text.indexOf("\n", current_offset);
        current_offset = next_new_line + 1;
        current_line += 1;
    }

    return current_offset + position.column;
}

function create_module_changes(
    start_text_position: Text_position,
    end_text_position: Text_position,
    new_text: string
): { position: any[], change: Module_change.Change }[] {

    const grammar_description = Grammar_examples.create_test_grammar_9_description();
    const production_rules = Grammar.create_production_rules(grammar_description);
    const non_terminals = Grammar.get_non_terminals(production_rules);
    const terminals = Grammar.get_terminals(production_rules, non_terminals);
    const terminals_set = new Set<string>(terminals);

    const map_word_to_terminal = (word: Grammar.Word): string => {

        if (terminals_set.has(word.value)) {
            return word.value;
        }

        if (word.type === Grammar.Word_type.Number) {
            return "number";
        }

        if (word.type === Grammar.Word_type.Alphanumeric) {
            return "identifier";
        }

        return word.value;
    };

    const module = Module_examples.create_0();
    const declarations = Parse_tree_convertor.create_declarations(module);
    const initial_parse_tree = Parse_tree_convertor.module_to_parse_tree(module, declarations, production_rules);
    const text_cache = Parse_tree_text_position_cache.create_cache();

    const initial_parse_tree_text = Text_formatter.to_string(initial_parse_tree, text_cache, []);

    if (g_debug) {
        console.log(initial_parse_tree_text);
    }
    const scanned_words = Scanner.scan(initial_parse_tree_text, 0, initial_parse_tree_text.length);

    const parsing_tables = Grammar.create_parsing_tables_from_production_rules(production_rules);
    const array_infos = Grammar.create_array_infos(production_rules);
    const parse_tree = Parser.parse(scanned_words, parsing_tables.action_table, parsing_tables.go_to_table, array_infos, map_word_to_terminal);

    assert.notEqual(parse_tree, undefined);
    if (parse_tree === undefined) {
        return [];
    }

    // Also sets parse_tree Text_position:
    const text = Text_formatter.to_string(parse_tree, text_cache, []);
    if (g_debug) {
        console.log(text);
    }

    const start_text_offset = text_position_to_offset(text, start_text_position);
    const end_text_offset = text_position_to_offset(text, end_text_position);

    const scanned_input_change = scan_new_change(
        parse_tree,
        text,
        start_text_offset,
        end_text_offset,
        new_text
    );

    const start_change_position = scanned_input_change.start_change !== undefined ? scanned_input_change.start_change.node_position : [];
    const after_change_position = scanned_input_change.after_change !== undefined ? scanned_input_change.after_change.node_position : [];

    const parse_result = Parser.parse_incrementally(
        parse_tree,
        start_change_position,
        scanned_input_change.new_words,
        after_change_position,
        parsing_tables.action_table,
        parsing_tables.go_to_table,
        array_infos,
        map_word_to_terminal
    );

    assert.equal(parse_result.status, Parser.Parse_status.Accept);

    const production_rule_to_value_map = Parse_tree_convertor.create_production_rule_to_value_map(production_rules);
    const production_rule_to_change_action_map = Parse_tree_convertor.create_production_rule_to_change_action_map(production_rules);
    const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(production_rules);

    const module_changes = Parse_tree_convertor.create_module_changes(
        module,
        declarations,
        production_rules,
        production_rule_to_value_map,
        production_rule_to_change_action_map,
        parse_tree,
        parse_result.changes,
        key_to_production_rule_indices
    );

    return module_changes;
}

describe("Parse_tree_convertor.create_module_changes", () => {

    it("Sets name of module", () => {

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

    it("Adds new function", () => {

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

            const function_declaration = add_change.value as Core.Function_declaration;
            //assert.equal(function_declaration.id, 200);
            assert.equal(function_declaration.linkage, Core.Linkage.Private);
            assert.equal(function_declaration.type.is_variadic, false);
            assert.deepEqual(function_declaration.name, "function_name");
            //assert.deepEqual(function_declaration.input_parameter_ids.elements, []);
            assert.deepEqual(function_declaration.input_parameter_names.elements, []);
            assert.deepEqual(function_declaration.type.input_parameter_types.elements, []);
            //assert.deepEqual(function_declaration.output_parameter_ids.elements, []);
            assert.deepEqual(function_declaration.output_parameter_names.elements, []);
            assert.deepEqual(function_declaration.type.output_parameter_types.elements, []);
        }

        {
            const change = module_changes[1];
            assert.deepEqual(change.position, ["definitions"]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "function_definitions");
            //assert.equal(add_change.index, 5);

            const function_definition = add_change.value as Core.Function_definition;
            //assert.equal(function_definition.id, 200);
            assert.deepEqual(function_definition.statements.elements, []);
        }
    });

    it("Removes a function", () => {

        const module_changes = create_module_changes(
            { line: 11, column: 0 },
            { line: 15, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 2);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations"]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "function_declarations");
            assert.equal(remove_change.index, 0);
        }

        {
            const change = module_changes[1];
            assert.deepEqual(change.position, ["definitions"]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "function_definitions");
            assert.equal(remove_change.index, 0);
        }
    });

    it("Sets function name", () => {

        const module_changes = create_module_changes(
            { line: 11, column: 16 },
            { line: 11, column: 29 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 0]);

            assert.equal(change.change.type, Module_change.Type.Update);

            const update_change = change.change.value as Module_change.Update;
            assert.equal(update_change.key, "name");
            assert.equal(update_change.value, "Another_name");
        }
    });

    it("Adds new function input parameter", () => {

        const module_changes = create_module_changes(
            { line: 16, column: 30 },
            { line: 16, column: 30 },
            "foo: Bar, "
        );

        assert.equal(module_changes.length, 2);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "input_parameter_names");
            assert.equal(add_change.index, 0);
            assert.equal(add_change.value, "foo");
        }

        {
            const change = module_changes[1];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1, "type"]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "input_parameter_types");
            assert.equal(add_change.index, 0);

            const expected_type_reference: Core.Type_reference = {
                data: {
                    type: Core.Type_reference_enum.Custom_type_reference,
                    value: {
                        module_reference: {
                            name: ""
                        },
                        name: "Bar"
                    }
                }
            };
            assert.deepEqual(add_change.value, expected_type_reference);
        }
    });

    it("Removes function input parameter", () => {

        const module_changes = create_module_changes(
            { line: 16, column: 30 },
            { line: 16, column: 44 },
            ""
        );

        assert.equal(module_changes.length, 2);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "input_parameter_names");
            assert.equal(remove_change.index, 0);
        }

        {
            const change = module_changes[1];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1, "type"]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "input_parameter_types");
            assert.equal(remove_change.index, 0);
        }
    });

    it("Sets function input parameter name", () => {

        const module_changes = create_module_changes(
            { line: 16, column: 30 },
            { line: 16, column: 33 },
            "beep"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1]);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const update_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(update_change.vector_name, "input_parameter_names");
            assert.equal(update_change.index, 0);
            assert.equal(update_change.value, "beep");
        }
    });

    it("Sets function input parameter type", () => {

        const module_changes = create_module_changes(
            { line: 16, column: 35 },
            { line: 16, column: 42 },
            "beep"
        );

        assert.equal(module_changes.length, 4);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "input_parameter_names");
            assert.equal(remove_change.index, 0);
        }

        {
            const change = module_changes[1];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1, "type"]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "input_parameter_types");
            assert.equal(remove_change.index, 0);
        }

        {
            const change = module_changes[2];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "input_parameter_names");
            assert.equal(add_change.index, 0);
            assert.equal(add_change.value, "lhs");
        }

        {
            const change = module_changes[3];
            assert.deepEqual(change.position, ["export_declarations", "function_declarations", "elements", 1, "type"]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "input_parameter_types");
            assert.equal(add_change.index, 0);
            const expected_type = Type_utilities.parse_type_name("beep")[0];
            assert.deepEqual(add_change.value, expected_type);
        }

    });

    it("Adds new struct", () => {

        const module_changes = create_module_changes(
            { line: 1, column: 0 },
            { line: 1, column: 0 },
            "\nstruct Struct_name {}\n"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["internal_declarations"]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "struct_declarations");

            const struct_declaration = add_change.value as Core.Struct_declaration;
            assert.equal(struct_declaration.name, "Struct_name");
            assert.equal(struct_declaration.member_names.size, 0);
            assert.deepEqual(struct_declaration.member_names.elements, []);
            assert.equal(struct_declaration.member_types.size, 0);
            assert.deepEqual(struct_declaration.member_types.elements, []);
            assert.equal(struct_declaration.is_literal, false);
            assert.equal(struct_declaration.is_packed, false);
        }
    });

    it("Removes a struct", () => {

        const module_changes = create_module_changes(
            { line: 30, column: 0 },
            { line: 36, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations"]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "struct_declarations");
            assert.equal(remove_change.index, 0);
        }
    });

    it("Sets struct name", () => {

        const module_changes = create_module_changes(
            { line: 30, column: 14 },
            { line: 30, column: 25 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "struct_declarations", "elements", 0]);

            assert.equal(change.change.type, Module_change.Type.Update);

            const update_change = change.change.value as Module_change.Update;
            assert.equal(update_change.key, "name");
            assert.equal(update_change.value, "Another_name");
        }
    });

    it("Adds new enum", () => {

        const module_changes = create_module_changes(
            { line: 1, column: 0 },
            { line: 1, column: 0 },
            "\nenum My_enum {}\n"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["internal_declarations"]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "enum_declarations");

            const enum_declaration = add_change.value as Core.Enum_declaration;
            assert.equal(enum_declaration.name, "My_enum");
            assert.equal(enum_declaration.values.size, 0);
            assert.deepEqual(enum_declaration.values.elements, []);
        }
    });

    it("Removes an enum", () => {

        const module_changes = create_module_changes(
            { line: 4, column: 0 },
            { line: 10, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations"]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "enum_declarations");
            assert.equal(remove_change.index, 0);
        }
    });

    it("Sets enum name", () => {

        const module_changes = create_module_changes(
            { line: 4, column: 12 },
            { line: 4, column: 21 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "enum_declarations", "elements", 0]);

            assert.equal(change.change.type, Module_change.Type.Update);

            const update_change = change.change.value as Module_change.Update;
            assert.equal(update_change.key, "name");
            assert.equal(update_change.value, "Another_name");
        }
    });

    it("Adds new alias", () => {

        const module_changes = create_module_changes(
            { line: 1, column: 0 },
            { line: 1, column: 0 },
            "using My_alias = Float32;\n"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["internal_declarations"]);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "alias_type_declarations");

            const alias_declaration = add_change.value as Core.Alias_type_declaration;
            assert.equal(alias_declaration.name, "My_alias");
            // TODO type
        }
    });

    it("Removes an alias", () => {

        const module_changes = create_module_changes(
            { line: 1, column: 0 },
            { line: 3, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations"]);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "alias_type_declarations");
            assert.equal(remove_change.index, 0);
        }
    });

    it("Sets alias name", () => {

        const module_changes = create_module_changes(
            { line: 2, column: 13 },
            { line: 2, column: 21 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "alias_type_declarations", "elements", 0]);

            assert.equal(change.change.type, Module_change.Type.Update);

            const update_change = change.change.value as Module_change.Update;
            assert.equal(update_change.key, "name");
            assert.equal(update_change.value, "Another_name");
        }
    });

    it("Sets alias type", () => {

        const module_changes = create_module_changes(
            { line: 2, column: 24 },
            { line: 2, column: 31 },
            "Float64"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, ["export_declarations", "alias_type_declarations", "elements", 0]);

            assert.equal(change.change.type, Module_change.Type.Update);

            const update_change = change.change.value as Module_change.Update;
            assert.equal(update_change.key, "type");

            const expected_type_reference: Core.Type_reference = {
                data: {
                    type: Core.Type_reference_enum.Fundamental_type,
                    value: Core.Fundamental_type.Float64
                }
            };
            assert.equal(update_change.value.size, 1);
            assert.deepEqual(update_change.value.elements, [expected_type_reference]);
        }
    });
});

function assert_function_declarations(actual_function_declarations: Core.Vector<Core.Function_declaration>, expected_function_declarations: Core.Vector<Core.Function_declaration>) {
    assert.equal(actual_function_declarations.size, expected_function_declarations.size);
    assert.equal(actual_function_declarations.elements.length, expected_function_declarations.elements.length);

    for (let function_index = 0; function_index < actual_function_declarations.elements.length; ++function_index) {
        const actual_function_declaration = actual_function_declarations.elements[function_index];
        const expected_function_declaration = expected_function_declarations.elements[function_index];

        assert.equal(actual_function_declaration.name, expected_function_declaration.name);
        assert.equal(actual_function_declaration.linkage, expected_function_declaration.linkage);

        assert.deepEqual(actual_function_declaration.type.input_parameter_types, expected_function_declaration.type.input_parameter_types);
        assert.deepEqual(actual_function_declaration.type.output_parameter_types, expected_function_declaration.type.output_parameter_types);
        assert.equal(actual_function_declaration.type.is_variadic, expected_function_declaration.type.is_variadic);

        assert.deepEqual(actual_function_declaration.input_parameter_names, expected_function_declaration.input_parameter_names);
        assert.deepEqual(actual_function_declaration.output_parameter_names, expected_function_declaration.output_parameter_names);
    }
}

function assert_alias_type_declarations(actual_alias_type_declarations: Core.Vector<Core.Alias_type_declaration>, expected_alias_type_declarations: Core.Vector<Core.Alias_type_declaration>) {
    assert.equal(actual_alias_type_declarations.size, expected_alias_type_declarations.size);
    assert.equal(actual_alias_type_declarations.elements.length, expected_alias_type_declarations.elements.length);

    for (let alias_type_index = 0; alias_type_index < actual_alias_type_declarations.elements.length; ++alias_type_index) {
        const actual_alias_type_declaration = actual_alias_type_declarations.elements[alias_type_index];
        const expected_alias_type_declaration = expected_alias_type_declarations.elements[alias_type_index];

        assert.equal(actual_alias_type_declaration.name, expected_alias_type_declaration.name);
        assert.deepEqual(actual_alias_type_declaration.type, expected_alias_type_declaration.type);
    }
}

function assert_enum_declarations(actual_enum_declarations: Core.Vector<Core.Enum_declaration>, expected_enum_declarations: Core.Vector<Core.Enum_declaration>) {
    assert.equal(actual_enum_declarations.size, expected_enum_declarations.size);
    assert.equal(actual_enum_declarations.elements.length, expected_enum_declarations.elements.length);

    for (let enum_index = 0; enum_index < actual_enum_declarations.elements.length; ++enum_index) {
        const actual_enum_declaration = actual_enum_declarations.elements[enum_index];
        const expected_enum_declaration = expected_enum_declarations.elements[enum_index];

        assert.equal(actual_enum_declaration.name, expected_enum_declaration.name);
        assert.deepEqual(actual_enum_declaration.values, expected_enum_declaration.values);
    }
}

function assert_struct_declarations(actual_struct_declarations: Core.Vector<Core.Struct_declaration>, expected_struct_declarations: Core.Vector<Core.Struct_declaration>) {
    assert.equal(actual_struct_declarations.size, expected_struct_declarations.size);
    assert.equal(actual_struct_declarations.elements.length, expected_struct_declarations.elements.length);

    for (let struct_index = 0; struct_index < actual_struct_declarations.elements.length; ++struct_index) {
        const actual_struct_declaration = actual_struct_declarations.elements[struct_index];
        const expected_struct_declaration = expected_struct_declarations.elements[struct_index];

        assert.equal(actual_struct_declaration.name, expected_struct_declaration.name);
        assert.equal(actual_struct_declaration.is_literal, expected_struct_declaration.is_literal);
        assert.equal(actual_struct_declaration.is_packed, expected_struct_declaration.is_packed);
        assert.deepEqual(actual_struct_declaration.member_names, expected_struct_declaration.member_names);
        assert.deepEqual(actual_struct_declaration.member_types, expected_struct_declaration.member_types);
    }
}

describe("Parse_tree_convertor.parse_tree_to_module", () => {

    const grammar_description = Grammar_examples.create_test_grammar_9_description();
    const production_rules = Grammar.create_production_rules(grammar_description);
    const expected_module = Module_examples.create_0();
    const declarations = Parse_tree_convertor.create_declarations(expected_module);
    const parse_tree = Parse_tree_convertor.module_to_parse_tree(expected_module, declarations, production_rules);

    const production_rule_to_value_map = Parse_tree_convertor.create_production_rule_to_value_map(production_rules);
    const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(production_rules);
    const actual_module = Parse_tree_convertor.parse_tree_to_module(parse_tree, production_rules, production_rule_to_value_map, key_to_production_rule_indices);

    it("Handles the module name", () => {
        assert.equal(actual_module.name, expected_module.name);
    });

    it("Handles functions", () => {
        assert_function_declarations(actual_module.export_declarations.function_declarations, expected_module.export_declarations.function_declarations);
        assert_function_declarations(actual_module.internal_declarations.function_declarations, expected_module.internal_declarations.function_declarations);

        assert.equal(actual_module.definitions.function_definitions.size, expected_module.definitions.function_definitions.size);
        assert.equal(actual_module.definitions.function_definitions.elements.length, expected_module.definitions.function_definitions.elements.length);

        for (let definition_index = 0; definition_index < actual_module.definitions.function_definitions.elements.length; ++definition_index) {
            const actual_definition = actual_module.definitions.function_definitions.elements[definition_index];
            const expected_definition = expected_module.definitions.function_definitions.elements[definition_index];

            assert.equal(actual_definition.statements.size, expected_definition.statements.size);
            assert.equal(actual_definition.statements.elements.length, expected_definition.statements.elements.length);

            for (let statement_index = 0; statement_index < actual_definition.statements.elements.length; ++statement_index) {
                const actual_statement = actual_definition.statements.elements[statement_index];
                const expected_statement = expected_definition.statements.elements[statement_index];

                assert.deepEqual(actual_statement, expected_statement);
            }
        }
    });

    it("Handles alias", () => {
        assert_alias_type_declarations(actual_module.export_declarations.alias_type_declarations, expected_module.export_declarations.alias_type_declarations);
        assert_alias_type_declarations(actual_module.internal_declarations.alias_type_declarations, expected_module.internal_declarations.alias_type_declarations);
    });

    it("Handles enums", () => {
        assert_enum_declarations(actual_module.export_declarations.enum_declarations, expected_module.export_declarations.enum_declarations);
        assert_enum_declarations(actual_module.internal_declarations.enum_declarations, expected_module.internal_declarations.enum_declarations);
    });

    it("Handles structs", () => {
        assert_struct_declarations(actual_module.export_declarations.struct_declarations, expected_module.export_declarations.struct_declarations);
        assert_struct_declarations(actual_module.internal_declarations.struct_declarations, expected_module.internal_declarations.struct_declarations);
    });
});
