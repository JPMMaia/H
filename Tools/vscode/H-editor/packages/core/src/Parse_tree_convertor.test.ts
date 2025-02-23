import "mocha";

import * as assert from "assert";

import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Grammar_examples from "./Grammar_examples";
import * as Language from "./Language";
import * as Module_change from "./Module_change";
import * as Module_examples from "./Module_examples";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Parser from "./Parser";
import { Node } from "./Parser_node";
import * as Scanner from "./Scanner";
import { scan_new_change } from "./Scan_new_changes";
import * as Storage_cache from "./Storage_cache";
import * as Text_formatter from "./Text_formatter";
import * as Tree_sitter_parser from "./Tree_sitter_parser";
import * as Type_utilities from "./Type_utilities";

const g_debug = false;

function assert_function_parameters(parameters_node: Node, parameter_names: string[], parameter_types: Core_intermediate_representation.Type_reference[]): void {

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
            assert.equal(parameter_type_node.word.value, "Function_parameter_type");

            const type_node = parameter_type_node.children[0];
            assert.equal(type_node.word.value, "Type");

            const type_name_node = type_node.children[0];
            assert.equal(type_name_node.word.value, "Type_name");

            const expected_name = Type_utilities.get_type_name([parameter_type]);
            assert.equal(type_name_node.children[0].word.value, expected_name);
        }
    }
}

function test_module_to_parse_tree(grammar_description: string[], module: Core_intermediate_representation.Module): Node {
    const production_rules = Grammar.create_production_rules(grammar_description);
    const mappings = Parse_tree_convertor_mappings.create_mapping();
    const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, production_rules, mappings);
    return parse_tree;
}

function assert_expression_level_node(node: Node, start_level: number, end_level: number): void {

    let current_node = node;

    for (let level = start_level; level >= end_level; --level) {
        const current_label = `Expression_level_${level}`;
        assert.equal(current_node.word.value, current_label);
        current_node = current_node.children[0];
    }
}

function get_expression_level_node(node: Node, level: number): Node {

    const label = `Expression_level_${level}`;

    while (node.word.value !== label) {
        node = node.children[0];
    }

    return node;
}

describe("Parse_tree_convertor.module_to_parse_tree", () => {

    it("Creates module parse tree from grammar 9", () => {
        const module = Module_examples.create_0();
        const parse_tree = test_module_to_parse_tree(Grammar_examples.create_test_grammar_9_description(), module);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.production_rule_index, 0);

        {
            const module_head = parse_tree.children[0];
            assert.equal(module_head.word.value, "Module_head");
            assert.equal(module_head.production_rule_index, 5);

            {
                const module_declaration = module_head.children[0];
                assert.equal(module_declaration.word.value, "Module_declaration");
                assert.equal(module_declaration.production_rule_index, 6);

                {
                    const comment_node = module_declaration.children[0];
                    assert.equal(comment_node.word.value, "Comment_or_empty");
                    assert.equal(comment_node.children.length, 0);
                }

                {
                    const module_keyword = module_declaration.children[1];
                    assert.equal(module_keyword.word.value, "module");
                    assert.equal(module_keyword.production_rule_index, undefined);
                }

                {
                    const module_name = module_declaration.children[2];
                    assert.equal(module_name.word.value, "Module_name");
                    assert.equal(module_name.production_rule_index, 7);

                    const identifier_with_dots = module_name.children[0];
                    assert.equal(identifier_with_dots.word.value, "Identifier_with_dots");
                    assert.equal(identifier_with_dots.production_rule_index, 1);

                    const identifier = identifier_with_dots.children[0];
                    assert.equal(identifier.word.value, "module_name");
                    assert.equal(identifier.production_rule_index, undefined);
                }

                {
                    const semicolon = module_declaration.children[3];
                    assert.equal(semicolon.word.value, ";");
                    assert.equal(semicolon.production_rule_index, undefined);
                }
            }
        }

        {
            const module_body = parse_tree.children[1];
            assert.equal(module_body.children.length, module.declarations.length);

            for (let declaration_index = 0; declaration_index < module.declarations.length; ++declaration_index) {
                const declaration = module.declarations[declaration_index];
                const declaration_node = module_body.children[declaration_index];
                const module_declarations = module.declarations;

                assert.equal(declaration_node.word.value, "Declaration");


                if (declaration.type === Core_intermediate_representation.Declaration_type.Alias) {

                    const alias_declaration = module_declarations[declaration_index].value as Core_intermediate_representation.Alias_type_declaration;

                    assert.equal(declaration_node.children.length, 3);

                    {
                        const comment_node = declaration_node.children[0];
                        assert.equal(comment_node.word.value, "Comment_or_empty");
                        assert.equal(comment_node.children.length, 0);
                    }

                    const alias_node = declaration_node.children[2];
                    assert.equal(alias_node.word.value, "Alias");

                    assert.equal(alias_node.children.length, 5);

                    {
                        const export_node = declaration_node.children[1];
                        assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                        if (declaration.is_export) {
                            assert.equal(export_node.children[0].word.value, "export");
                        }
                    }

                    {
                        const name_node = alias_node.children[1];
                        assert.equal(name_node.children[0].word.value, alias_declaration.name);
                    }

                    {
                        const alias_type_node = alias_node.children[3];
                        assert.equal(alias_type_node.word.value, "Alias_type");

                        const type_node = alias_type_node.children[0];
                        assert.equal(type_node.word.value, "Type");

                        const type_name_node = type_node.children[0];
                        assert.equal(type_name_node.word.value, "Type_name");

                        const expected_type = Type_utilities.get_type_name(alias_declaration.type);
                        assert.equal(type_name_node.children[0].word.value, expected_type);
                    }
                }
                else if (declaration.type === Core_intermediate_representation.Declaration_type.Enum) {

                    const enum_declaration = module_declarations[declaration_index].value as Core_intermediate_representation.Enum_declaration;

                    assert.equal(declaration_node.children.length, 3);

                    {
                        const comment_node = declaration_node.children[0];
                        assert.equal(comment_node.word.value, "Comment_or_empty");
                        assert.equal(comment_node.children.length, 0);
                    }

                    {
                        const export_node = declaration_node.children[1];
                        assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                        if (declaration.is_export) {
                            assert.equal(export_node.children[0].word.value, "export");
                        }
                    }

                    const enum_node = declaration_node.children[2];
                    assert.equal(enum_node.word.value, "Enum");

                    assert.equal(enum_node.children.length === 5, true);

                    {
                        const name_node = enum_node.children[1];
                        assert.equal(name_node.children[0].word.value, enum_declaration.name);
                    }

                    const values_node = enum_node.children[3];
                    assert.equal(values_node.children.length, enum_declaration.values.length);

                    for (let member_index = 0; member_index < enum_declaration.values.length; ++member_index) {
                        const value = enum_declaration.values[member_index];

                        const value_node = values_node.children[member_index];

                        {
                            const comment_node = value_node.children[0];
                            assert.equal(comment_node.word.value, "Comment_or_empty");
                            assert.equal(comment_node.children.length, 0);
                        }

                        {
                            const value_name_node = value_node.children[1];
                            const identifier_node = value_name_node.children[0];
                            assert.equal(identifier_node.word.value, value.name);
                        }

                        {
                            const generic_expression_0 = value_node.children[3];
                            assert.equal(generic_expression_0.word.value, "Generic_expression");
                            assert.equal(generic_expression_0.children.length, 1);

                            const expression_level_node_0 = generic_expression_0.children[0];
                            assert_expression_level_node(expression_level_node_0, 12, 0);
                            const expression_level_node_1 = get_expression_level_node(expression_level_node_0, 0);

                            const constant_expression = expression_level_node_1.children[0];
                            assert.equal(constant_expression.word.value, "Expression_constant");
                            assert.equal(constant_expression.children.length, 1);

                            assert.equal(constant_expression.children[0].word.value, member_index.toString());
                        }
                    }
                }
                else if (declaration.type === Core_intermediate_representation.Declaration_type.Function) {

                    const function_value = module_declarations[declaration_index].value as Core_intermediate_representation.Function;
                    const function_declaration = function_value.declaration;

                    assert.equal(declaration_node.children.length, 3);

                    {
                        const comment_node = declaration_node.children[0];
                        assert.equal(comment_node.word.value, "Comment_or_empty");
                        assert.equal(comment_node.children.length, 0);
                    }

                    {
                        const export_node = declaration_node.children[1];
                        assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                        if (declaration.is_export) {
                            assert.equal(export_node.children[0].word.value, "export");
                        }
                    }

                    const function_node = declaration_node.children[2];
                    assert.equal(function_node.word.value, "Function");

                    assert.equal(function_node.children.length, 2);

                    {
                        const function_declaration_node = function_node.children[0];
                        assert.equal(function_declaration_node.word.value, "Function_declaration");

                        assert.equal(function_declaration_node.children.length > 3, true);
                        {
                            const name_node = function_declaration_node.children[1];
                            assert.equal(name_node.children[0].word.value, function_declaration.name);
                        }

                        {
                            const input_parameters_node = function_declaration_node.children[3];
                            assert.equal(input_parameters_node.word.value, "Function_input_parameters");

                            assert_function_parameters(input_parameters_node, function_declaration.input_parameter_names, function_declaration.type.input_parameter_types);
                        }

                        {
                            const output_parameters_node = function_declaration_node.children[7];
                            assert.equal(output_parameters_node.word.value, "Function_output_parameters");

                            assert_function_parameters(output_parameters_node, function_declaration.output_parameter_names, function_declaration.type.output_parameter_types);
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
                                        const generic_expression_or_instantiate_0 = return_expression.children[1];
                                        assert.equal(generic_expression_or_instantiate_0.word.value, "Generic_expression_or_instantiate");
                                        assert.equal(generic_expression_or_instantiate_0.children.length, 1);

                                        const generic_expression_0 = generic_expression_or_instantiate_0.children[0];
                                        assert.equal(generic_expression_0.word.value, "Generic_expression");
                                        assert.equal(generic_expression_0.children.length, 1);

                                        const expression_level_node_0 = generic_expression_0.children[0];
                                        assert_expression_level_node(expression_level_node_0, 12, 4);
                                        const expression_level_node_1 = get_expression_level_node(expression_level_node_0, 4);

                                        const binary_expression = expression_level_node_1.children[0];
                                        assert.equal(binary_expression.word.value, "Expression_binary_addition");
                                        assert.equal(binary_expression.children.length, 3);

                                        {
                                            const expression_level_node_2 = binary_expression.children[0];
                                            assert_expression_level_node(expression_level_node_2, 4, 0);
                                            const expression_level_node_3 = get_expression_level_node(expression_level_node_2, 0);

                                            const variable_expression = expression_level_node_3.children[0];
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
                                            assert.equal(binary_symbol.word.value, "Expression_binary_addition_symbol");
                                            assert.equal(binary_symbol.children.length, 1);

                                            const symbol = binary_symbol.children[0];
                                            assert.equal(symbol.word.value, "+");
                                            assert.equal(symbol.children.length, 0);
                                        }

                                        {
                                            const expression_level_node_2 = binary_expression.children[2];
                                            assert_expression_level_node(expression_level_node_2, 3, 0);
                                            const expression_level_node_3 = get_expression_level_node(expression_level_node_2, 0);

                                            const variable_expression = expression_level_node_3.children[0];
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
                else if (declaration.type === Core_intermediate_representation.Declaration_type.Struct) {

                    const struct_declaration = module_declarations[declaration_index].value as Core_intermediate_representation.Struct_declaration;

                    assert.equal(declaration_node.children.length, 3);

                    {
                        const comment_node = declaration_node.children[0];
                        assert.equal(comment_node.word.value, "Comment_or_empty");
                        assert.equal(comment_node.children.length, 0);
                    }

                    {
                        const export_node = declaration_node.children[1];
                        assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                        if (declaration.is_export) {
                            assert.equal(export_node.children[0].word.value, "export");
                        }
                    }

                    const struct_node = declaration_node.children[2];
                    assert.equal(struct_node.word.value, "Struct");

                    assert.equal(struct_node.children.length === 5, true);

                    {
                        const name_node = struct_node.children[1];
                        assert.equal(name_node.children[0].word.value, struct_declaration.name);
                    }

                    const members_node = struct_node.children[3];
                    assert.equal(members_node.children.length, struct_declaration.member_names.length);

                    for (let member_index = 0; member_index < struct_declaration.member_names.length; ++member_index) {
                        const member_name = struct_declaration.member_names[member_index];
                        const member_type = struct_declaration.member_types[member_index];
                        const member_type_name = Type_utilities.get_type_name([member_type]);

                        const member_node = members_node.children[member_index];

                        {
                            const comment_node = member_node.children[0];
                            assert.equal(comment_node.word.value, "Comment_or_empty");
                            assert.equal(comment_node.children.length, 0);
                        }

                        {
                            const member_name_node = member_node.children[1];
                            const identifier_node = member_name_node.children[0];
                            assert.equal(identifier_node.word.value, member_name);
                        }

                        {
                            const member_type_node = member_node.children[3];
                            assert.equal(member_type_node.word.value, "Struct_member_type");

                            const type_node = member_type_node.children[0];
                            assert.equal(type_node.word.value, "Type");

                            const type_name_node = type_node.children[0];
                            assert.equal(type_name_node.word.value, "Type_name");

                            const identifier_node = type_name_node.children[0];
                            assert.equal(identifier_node.word.value, member_type_name);
                        }

                        {
                            const member_default_value_node = member_node.children[5];
                            assert.equal(member_default_value_node.word.value, "Generic_expression_or_instantiate");

                            const generic_expression_node = member_default_value_node.children[0];
                            assert.equal(generic_expression_node.word.value, "Generic_expression");

                            const expression_level_node_0 = generic_expression_node.children[0];
                            assert_expression_level_node(expression_level_node_0, 12, 0);
                            const expression_level_node_1 = get_expression_level_node(expression_level_node_0, 0);

                            const constant_expression = expression_level_node_1.children[0];
                            assert.equal(constant_expression.word.value, "Expression_constant");
                            assert.equal(constant_expression.children.length, 1);

                            assert.equal(constant_expression.children[0].word.value, `${member_index}.0f32`);
                        }
                    }
                }
            }
        }
    });

    it("Creates module imports nodes", () => {
        const module = Module_examples.create_module_with_dependencies();
        const parse_tree = test_module_to_parse_tree(Grammar_examples.create_test_grammar_9_description(), module);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.children.length, 2);

        const module_head = parse_tree.children[0];
        assert.equal(module_head.word.value, "Module_head");
        assert.equal(module_head.children.length, 2);

        const imports = module_head.children[1];
        assert.equal(imports.word.value, "Imports");
        assert.equal(imports.children.length, 2);

        {
            const import_node = imports.children[0];
            assert.equal(import_node.word.value, "Import");
            assert.equal(import_node.children.length, 5);

            {
                const keyword_node = import_node.children[0];
                assert.equal(keyword_node.word.value, "import");
                assert.equal(keyword_node.children.length, 0);
            }

            {
                const module_name_node = import_node.children[1];
                assert.equal(module_name_node.word.value, "Import_name");
                assert.equal(module_name_node.children.length, 1);

                const identifier_with_dots_node = module_name_node.children[0];
                assert.equal(identifier_with_dots_node.word.value, "Identifier_with_dots");
                assert.equal(identifier_with_dots_node.children.length, 3);

                {
                    const identifier_node = identifier_with_dots_node.children[0];
                    assert.equal(identifier_node.word.value, "C");
                    assert.equal(identifier_node.children.length, 0);
                }

                {
                    const identifier_node = identifier_with_dots_node.children[1];
                    assert.equal(identifier_node.word.value, ".");
                    assert.equal(identifier_node.children.length, 0);
                }

                {
                    const identifier_node = identifier_with_dots_node.children[2];
                    assert.equal(identifier_node.word.value, "stdio");
                    assert.equal(identifier_node.children.length, 0);
                }
            }

            {
                const as_node = import_node.children[2];
                assert.equal(as_node.word.value, "as");
                assert.equal(as_node.children.length, 0);
            }

            {
                const alias_node = import_node.children[3];
                assert.equal(alias_node.word.value, "Import_alias");
                assert.equal(alias_node.children.length, 1);

                const identifier_node = alias_node.children[0];
                assert.equal(identifier_node.word.value, "stdio");
                assert.equal(identifier_node.children.length, 0);
            }

            {
                const semicolon_node = import_node.children[4];
                assert.equal(semicolon_node.word.value, ";");
                assert.equal(semicolon_node.children.length, 0);
            }
        }

        {
            const import_node = imports.children[1];
            assert.equal(import_node.word.value, "Import");
            assert.equal(import_node.children.length, 5);

            {
                const keyword_node = import_node.children[0];
                assert.equal(keyword_node.word.value, "import");
                assert.equal(keyword_node.children.length, 0);
            }

            {
                const module_name_node = import_node.children[1];
                assert.equal(module_name_node.word.value, "Import_name");
                assert.equal(module_name_node.children.length, 1);

                const identifier_with_dots_node = module_name_node.children[0];
                assert.equal(identifier_with_dots_node.word.value, "Identifier_with_dots");
                assert.equal(identifier_with_dots_node.children.length, 1);

                const identifier_node = identifier_with_dots_node.children[0];
                assert.equal(identifier_node.word.value, "My_library");
                assert.equal(identifier_node.children.length, 0);
            }

            {
                const as_node = import_node.children[2];
                assert.equal(as_node.word.value, "as");
                assert.equal(as_node.children.length, 0);
            }

            {
                const alias_node = import_node.children[3];
                assert.equal(alias_node.word.value, "Import_alias");
                assert.equal(alias_node.children.length, 1);

                const identifier_node = alias_node.children[0];
                assert.equal(identifier_node.word.value, "ml");
                assert.equal(identifier_node.children.length, 0);
            }

            {
                const semicolon_node = import_node.children[4];
                assert.equal(semicolon_node.word.value, ";");
                assert.equal(semicolon_node.children.length, 0);
            }
        }
    });

    it("Creates alias nodes", () => {
        const module = Module_examples.create_alias_example();
        const parse_tree = test_module_to_parse_tree(Grammar_examples.create_test_grammar_9_description(), module);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.children.length, 2);

        const module_head = parse_tree.children[0];
        assert.equal(module_head.word.value, "Module_head");
        assert.equal(module_head.children.length, 2);

        const imports = module_head.children[1];
        assert.equal(imports.word.value, "Imports");
        assert.equal(imports.children.length, 0);

        const module_body = parse_tree.children[1];
        assert.equal(module_body.word.value, "Module_body");
        assert.equal(module_body.children.length, 1);

        {
            const declaration = module.declarations[0];
            const alias_declaration = declaration.value as Core_intermediate_representation.Alias_type_declaration;

            const declaration_node = module_body.children[0];

            assert.equal(declaration_node.children.length, 3);

            {
                const comment_node = declaration_node.children[0];
                assert.equal(comment_node.word.value, "Comment_or_empty");
                assert.equal(comment_node.children.length, 0);
            }

            {
                const export_node = declaration_node.children[1];
                assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                if (declaration.is_export) {
                    assert.equal(export_node.children[0].word.value, "export");
                }
            }

            const alias_node = declaration_node.children[2];
            assert.equal(alias_node.word.value, "Alias");

            assert.equal(alias_node.children.length, 5);

            {
                const name_node = alias_node.children[1];
                assert.equal(name_node.children[0].word.value, alias_declaration.name);
            }

            {
                const alias_type_node = alias_node.children[3];
                assert.equal(alias_type_node.word.value, "Alias_type");

                const type_node = alias_type_node.children[0];
                assert.equal(type_node.word.value, "Type");

                const type_name_node = type_node.children[0];
                assert.equal(type_name_node.word.value, "Type_name");

                const expected_type = Type_utilities.get_type_name(alias_declaration.type);
                assert.equal(type_name_node.children[0].word.value, expected_type);
            }
        }
    });

    it("Creates enum nodes", () => {
        const module = Module_examples.create_enum_example();
        const parse_tree = test_module_to_parse_tree(Grammar_examples.create_test_grammar_9_description(), module);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.children.length, 2);

        const module_head = parse_tree.children[0];
        assert.equal(module_head.word.value, "Module_head");
        assert.equal(module_head.children.length, 2);

        const imports = module_head.children[1];
        assert.equal(imports.word.value, "Imports");
        assert.equal(imports.children.length, 0);

        const module_body = parse_tree.children[1];
        assert.equal(module_body.word.value, "Module_body");
        assert.equal(module_body.children.length, 1);

        {
            const declaration = module.declarations[0];
            const enum_declaration = declaration.value as Core_intermediate_representation.Enum_declaration;

            const declaration_node = module_body.children[0];
            assert.equal(declaration_node.children.length, 3);

            {
                const comment_node = declaration_node.children[0];
                assert.equal(comment_node.word.value, "Comment_or_empty");
                assert.equal(comment_node.children.length, 0);
            }

            {
                const export_node = declaration_node.children[1];
                assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                if (declaration.is_export) {
                    assert.equal(export_node.children[0].word.value, "export");
                }
            }

            const enum_node = declaration_node.children[2];
            assert.equal(enum_node.word.value, "Enum");

            assert.equal(enum_node.children.length === 5, true);

            {
                const name_node = enum_node.children[1];
                assert.equal(name_node.children[0].word.value, enum_declaration.name);
            }

            const values_node = enum_node.children[3];
            assert.equal(values_node.children.length, enum_declaration.values.length);

            for (let member_index = 0; member_index < enum_declaration.values.length; ++member_index) {
                const value = enum_declaration.values[member_index];

                const value_node = values_node.children[member_index];

                {
                    const comment_node = value_node.children[0];
                    assert.equal(comment_node.word.value, "Comment_or_empty");
                    assert.equal(comment_node.children.length, 0);
                }

                {
                    const value_name_node = value_node.children[1];
                    const identifier_node = value_name_node.children[0];
                    assert.equal(identifier_node.word.value, value.name);
                }

                {
                    const generic_expression_0 = value_node.children[3];
                    assert.equal(generic_expression_0.word.value, "Generic_expression");
                    assert.equal(generic_expression_0.children.length, 1);

                    const expression_level_node_0 = generic_expression_0.children[0];
                    assert_expression_level_node(expression_level_node_0, 12, 0);
                    const expression_level_node_1 = get_expression_level_node(expression_level_node_0, 0);

                    const constant_expression = expression_level_node_1.children[0];
                    assert.equal(constant_expression.word.value, "Expression_constant");
                    assert.equal(constant_expression.children.length, 1);

                    assert.equal(constant_expression.children[0].word.value, member_index.toString());
                }
            }
        }
    });

    it("Creates function nodes", () => {
        const module = Module_examples.create_function_example();
        const parse_tree = test_module_to_parse_tree(Grammar_examples.create_test_grammar_9_description(), module);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.children.length, 2);

        const module_head = parse_tree.children[0];
        assert.equal(module_head.word.value, "Module_head");
        assert.equal(module_head.children.length, 2);

        const imports = module_head.children[1];
        assert.equal(imports.word.value, "Imports");
        assert.equal(imports.children.length, 0);

        const module_body = parse_tree.children[1];
        assert.equal(module_body.word.value, "Module_body");
        assert.equal(module_body.children.length, 1);

        const declaration_node = module_body.children[0];

        {
            const comment_node = declaration_node.children[0];
            assert.equal(comment_node.word.value, "Comment_or_empty");
            assert.equal(comment_node.children.length, 0);
        }

        const function_node = declaration_node.children[2];
        assert.equal(function_node.word.value, "Function");

        {
            const declaration = module.declarations[0];
            const function_value = declaration.value as Core_intermediate_representation.Function;
            const function_declaration = function_value.declaration;

            const function_declaration_node = function_node.children[0];
            assert.equal(function_declaration_node.word.value, "Function_declaration");

            assert.equal(function_declaration_node.children.length > 3, true);

            {
                const export_node = declaration_node.children[1];
                assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                if (declaration.is_export) {
                    assert.equal(export_node.children[0].word.value, "export");
                }
            }

            {
                const name_node = function_declaration_node.children[1];
                assert.equal(name_node.children[0].word.value, function_declaration.name);
            }

            {
                const input_parameters_node = function_declaration_node.children[3];
                assert.equal(input_parameters_node.word.value, "Function_input_parameters");

                assert_function_parameters(input_parameters_node, function_declaration.input_parameter_names, function_declaration.type.input_parameter_types);
            }

            {
                const output_parameters_node = function_declaration_node.children[7];
                assert.equal(output_parameters_node.word.value, "Function_output_parameters");

                assert_function_parameters(output_parameters_node, function_declaration.output_parameter_names, function_declaration.type.output_parameter_types);
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
                        const generic_expression_or_instantiate_0 = return_expression.children[1];
                        assert.equal(generic_expression_or_instantiate_0.word.value, "Generic_expression_or_instantiate");
                        assert.equal(generic_expression_or_instantiate_0.children.length, 1);

                        const generic_expression_0 = generic_expression_or_instantiate_0.children[0];
                        assert.equal(generic_expression_0.word.value, "Generic_expression");
                        assert.equal(generic_expression_0.children.length, 1);

                        const expression_level_node_0 = generic_expression_0.children[0];
                        assert_expression_level_node(expression_level_node_0, 12, 4);
                        const expression_level_node_1 = get_expression_level_node(expression_level_node_0, 4);

                        const binary_expression = expression_level_node_1.children[0];
                        assert.equal(binary_expression.word.value, "Expression_binary_addition");
                        assert.equal(binary_expression.children.length, 3);

                        {
                            const generic_expression_1 = binary_expression.children[0];
                            assert_expression_level_node(generic_expression_1, 4, 0);
                            const expression_level_node_2 = get_expression_level_node(generic_expression_1, 0);

                            const variable_expression = expression_level_node_2.children[0];
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
                            assert.equal(binary_symbol.word.value, "Expression_binary_addition_symbol");
                            assert.equal(binary_symbol.children.length, 1);

                            const symbol = binary_symbol.children[0];
                            assert.equal(symbol.word.value, "+");
                            assert.equal(symbol.children.length, 0);
                        }

                        {
                            const generic_expression_2 = binary_expression.children[2];
                            assert_expression_level_node(generic_expression_2, 3, 0);
                            const expression_level_node_2 = get_expression_level_node(generic_expression_2, 0);

                            const variable_expression = expression_level_node_2.children[0];
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

            {
                const close_block_node = block.children[2];
                assert.equal(close_block_node.word.value, "}");
                assert.equal(close_block_node.children.length, 0);
            }
        }
    });

    it("Creates function call nodes", () => {
        const module = Module_examples.create_function_calling_module_function_example();
        const parse_tree = test_module_to_parse_tree(Grammar_examples.create_test_grammar_9_description(), module);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.children.length, 2);

        const module_head = parse_tree.children[0];
        assert.equal(module_head.word.value, "Module_head");
        assert.equal(module_head.children.length, 2);

        const imports = module_head.children[1];
        assert.equal(imports.word.value, "Imports");
        assert.equal(imports.children.length, 1);

        {
            const import_node = imports.children[0];
            assert.equal(import_node.word.value, "Import");
            assert.equal(import_node.children.length, 5);

            {
                const keyword_node = import_node.children[0];
                assert.equal(keyword_node.word.value, "import");
                assert.equal(keyword_node.children.length, 0);
            }

            {
                const module_name_node = import_node.children[1];
                assert.equal(module_name_node.word.value, "Import_name");
                assert.equal(module_name_node.children.length, 1);

                const identifier_with_dots_node = module_name_node.children[0];
                assert.equal(identifier_with_dots_node.word.value, "Identifier_with_dots");
                assert.equal(identifier_with_dots_node.children.length, 3);

                {
                    const identifier_node = identifier_with_dots_node.children[0];
                    assert.equal(identifier_node.word.value, "C");
                    assert.equal(identifier_node.children.length, 0);
                }

                {
                    const identifier_node = identifier_with_dots_node.children[1];
                    assert.equal(identifier_node.word.value, ".");
                    assert.equal(identifier_node.children.length, 0);
                }

                {
                    const identifier_node = identifier_with_dots_node.children[2];
                    assert.equal(identifier_node.word.value, "stdio");
                    assert.equal(identifier_node.children.length, 0);
                }
            }

            {
                const as_node = import_node.children[2];
                assert.equal(as_node.word.value, "as");
                assert.equal(as_node.children.length, 0);
            }

            {
                const alias_node = import_node.children[3];
                assert.equal(alias_node.word.value, "Import_alias");
                assert.equal(alias_node.children.length, 1);

                const identifier_node = alias_node.children[0];
                assert.equal(identifier_node.word.value, "stdio");
                assert.equal(identifier_node.children.length, 0);
            }

            {
                const semicolon_node = import_node.children[4];
                assert.equal(semicolon_node.word.value, ";");
                assert.equal(semicolon_node.children.length, 0);
            }
        }

        const module_body = parse_tree.children[1];
        assert.equal(module_body.word.value, "Module_body");
        assert.equal(module_body.children.length, 1);

        const declaration_node = module_body.children[0];
        const function_node = declaration_node.children[2];
        const funtion_definition = function_node.children[1];
        const block_node = funtion_definition.children[0];
        const statements_node = block_node.children[1];
        const statement_node = statements_node.children[0];

        const expression_call_node = statement_node.children[0];
        assert.equal(expression_call_node.word.value, "Expression_call");

        {
            {
                const expression_level_1_node = expression_call_node.children[0];
                assert.equal(expression_level_1_node.word.value, "Expression_level_1");

                const access_expression_node = expression_level_1_node.children[0];
                assert.equal(access_expression_node.word.value, "Expression_access");

                {
                    const expression_level_1_node_2 = access_expression_node.children[0];
                    assert.equal(expression_level_1_node_2.word.value, "Expression_level_1");

                    const expression_level_0_node = expression_level_1_node_2.children[0];
                    assert.equal(expression_level_0_node.word.value, "Expression_level_0");

                    const expression_variable_node = expression_level_0_node.children[0];
                    assert.equal(expression_variable_node.word.value, "Expression_variable");

                    const variable_name_node = expression_variable_node.children[0];
                    assert.equal(variable_name_node.word.value, "Variable_name");

                    const identifier_node = variable_name_node.children[0];
                    assert.equal(identifier_node.word.value, "stdio");
                }

                {
                    const dot_node = access_expression_node.children[1];
                    assert.equal(dot_node.word.value, ".");
                }

                {
                    const member_name_node = access_expression_node.children[2];
                    assert.equal(member_name_node.word.value, "Expression_access_member_name");

                    const identifier_node = member_name_node.children[0];
                    assert.equal(identifier_node.word.value, "printf");
                }
            }

            {
                const open_parenthesis_node = expression_call_node.children[1];
                assert.equal(open_parenthesis_node.word.value, "(");
            }

            {
                const arguments_node = expression_call_node.children[2];
                assert.equal(arguments_node.children.length, 1);

                const argument_node = arguments_node.children[0];
                assert.equal(argument_node.word.value, "Generic_expression_or_instantiate");

                const generic_expression_node = argument_node.children[0];
                assert.equal(generic_expression_node.word.value, "Generic_expression");

                const expression_level_12_node = generic_expression_node.children[0];
                assert_expression_level_node(expression_level_12_node, 12, 0);
                const expression_level_0_node = get_expression_level_node(expression_level_12_node, 0);

                const constant_expression_node = expression_level_0_node.children[0];
                assert.equal(constant_expression_node.word.value, "Expression_constant");

                const identifier_node = constant_expression_node.children[0];
                assert.equal(identifier_node.word.value, '"Hello world!"c');
            }

            {
                const close_parenthesis_node = expression_call_node.children[3];
                assert.equal(close_parenthesis_node.word.value, ")");
            }
        }
    });

    it("Creates struct nodes", () => {
        const module = Module_examples.create_struct_example();
        const parse_tree = test_module_to_parse_tree(Grammar_examples.create_test_grammar_9_description(), module);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.children.length, 2);

        const module_head = parse_tree.children[0];
        assert.equal(module_head.word.value, "Module_head");
        assert.equal(module_head.children.length, 2);

        const imports = module_head.children[1];
        assert.equal(imports.word.value, "Imports");
        assert.equal(imports.children.length, 0);

        const module_body = parse_tree.children[1];
        assert.equal(module_body.word.value, "Module_body");
        assert.equal(module_body.children.length, 1);

        {
            const declaration = module.declarations[0];
            const struct_declaration = declaration.value as Core_intermediate_representation.Struct_declaration;

            const declaration_node = module_body.children[0];
            assert.equal(declaration_node.children.length, 3);

            {
                const comment_node = declaration_node.children[0];
                assert.equal(comment_node.word.value, "Comment_or_empty");
                assert.equal(comment_node.children.length, 0);
            }

            {
                const export_node = declaration_node.children[1];
                assert.equal(export_node.children.length, declaration.is_export ? 1 : 0);

                if (declaration.is_export) {
                    assert.equal(export_node.children[0].word.value, "export");
                }
            }

            const struct_node = declaration_node.children[2];
            assert.equal(struct_node.word.value, "Struct");

            assert.equal(struct_node.children.length === 5, true);

            {
                const name_node = struct_node.children[1];
                assert.equal(name_node.children[0].word.value, struct_declaration.name);
            }

            const members_node = struct_node.children[3];
            assert.equal(members_node.children.length, struct_declaration.member_names.length);

            for (let member_index = 0; member_index < struct_declaration.member_names.length; ++member_index) {
                const member_name = struct_declaration.member_names[member_index];
                const member_type = struct_declaration.member_types[member_index];
                const member_type_name = Type_utilities.get_type_name([member_type]);

                const member_node = members_node.children[member_index];

                {
                    const comment_node = member_node.children[0];
                    assert.equal(comment_node.word.value, "Comment_or_empty");
                    assert.equal(comment_node.children.length, 0);
                }

                {
                    const member_name_node = member_node.children[1];
                    const identifier_node = member_name_node.children[0];
                    assert.equal(identifier_node.word.value, member_name);
                }

                {
                    const member_type_node = member_node.children[3];
                    assert.equal(member_type_node.word.value, "Struct_member_type");

                    const type_node = member_type_node.children[0];
                    assert.equal(type_node.word.value, "Type");

                    const type_name_node = type_node.children[0];
                    assert.equal(type_name_node.word.value, "Type_name");

                    const identifier_node = type_name_node.children[0];
                    assert.equal(identifier_node.word.value, member_type_name);
                }

                {
                    const member_default_value_node = member_node.children[5];
                    assert.equal(member_default_value_node.word.value, "Generic_expression_or_instantiate");

                    const generic_expression_node = member_default_value_node.children[0];
                    assert.equal(generic_expression_node.word.value, "Generic_expression");

                    const expression_level_node_0 = generic_expression_node.children[0];
                    assert_expression_level_node(expression_level_node_0, 12, 0);
                    const expression_level_node_1 = get_expression_level_node(expression_level_node_0, 0);

                    const constant_expression = expression_level_node_1.children[0];
                    assert.equal(constant_expression.word.value, "Expression_constant");
                    assert.equal(constant_expression.children.length, 1);

                    assert.equal(constant_expression.children[0].word.value, `${member_index}.0f32`);
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

function assert_declarations(actual_declarations: Core_intermediate_representation.Declaration[], expected_declarations: Core_intermediate_representation.Declaration[]) {

    assert.equal(actual_declarations.length, expected_declarations.length);

    for (let declaration_index = 0; declaration_index < actual_declarations.length; ++declaration_index) {
        const actual_declaration = actual_declarations[declaration_index];
        const expected_declaration = expected_declarations[declaration_index];

        assert.equal(actual_declaration.name, expected_declaration.name);
        assert.equal(actual_declaration.type, expected_declaration.type);
        assert.equal(actual_declaration.is_export, expected_declaration.is_export);

        if (actual_declaration.type === Core_intermediate_representation.Declaration_type.Alias) {
            const actual_value = actual_declaration.value as Core_intermediate_representation.Alias_type_declaration;
            const expected_value = expected_declaration.value as Core_intermediate_representation.Alias_type_declaration;

            assert.equal(actual_value.name, expected_value.name);
            assert.deepEqual(actual_value.type, expected_value.type);
        }
        else if (actual_declaration.type === Core_intermediate_representation.Declaration_type.Enum) {
            const actual_value = actual_declaration.value as Core_intermediate_representation.Enum_declaration;
            const expected_value = expected_declaration.value as Core_intermediate_representation.Enum_declaration;

            assert.equal(actual_value.name, expected_value.name);
            assert.deepEqual(actual_value.values, expected_value.values);
        }
        else if (actual_declaration.type === Core_intermediate_representation.Declaration_type.Function) {
            const actual_value = actual_declaration.value as Core_intermediate_representation.Function;
            const expected_value = expected_declaration.value as Core_intermediate_representation.Function;

            assert.equal(actual_value.declaration.name, expected_value.declaration.name);
            assert.equal(actual_value.declaration.linkage, expected_value.declaration.linkage);

            assert.deepEqual(actual_value.declaration.type.input_parameter_types, expected_value.declaration.type.input_parameter_types);
            assert.deepEqual(actual_value.declaration.type.output_parameter_types, expected_value.declaration.type.output_parameter_types);
            assert.equal(actual_value.declaration.type.is_variadic, expected_value.declaration.type.is_variadic);

            assert.deepEqual(actual_value.declaration.input_parameter_names, expected_value.declaration.input_parameter_names);
            assert.deepEqual(actual_value.declaration.output_parameter_names, expected_value.declaration.output_parameter_names);

            assert.notEqual(actual_value.definition, undefined);
            if (actual_value.definition !== undefined && expected_value.definition !== undefined) {
                assert.equal(actual_value.definition.name, expected_value.definition.name);

                assert.equal(actual_value.definition.statements.length, expected_value.definition.statements.length);

                for (let statement_index = 0; statement_index < actual_value.definition.statements.length; ++statement_index) {
                    const actual_statement = actual_value.definition.statements[statement_index];
                    const expected_statement = expected_value.definition.statements[statement_index];

                    assert.deepEqual(actual_statement, expected_statement);
                }
            }
        }
        else if (actual_declaration.type === Core_intermediate_representation.Declaration_type.Struct) {
            const actual_value = actual_declaration.value as Core_intermediate_representation.Struct_declaration;
            const expected_value = expected_declaration.value as Core_intermediate_representation.Struct_declaration;

            assert.equal(actual_value.name, expected_value.name);
            assert.equal(actual_value.is_literal, expected_value.is_literal);
            assert.equal(actual_value.is_packed, expected_value.is_packed);
            assert.deepEqual(actual_value.member_names, expected_value.member_names);
            assert.deepEqual(actual_value.member_types, expected_value.member_types);
        }
    }
}
