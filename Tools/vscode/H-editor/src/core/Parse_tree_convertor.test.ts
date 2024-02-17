import "mocha";

import * as assert from "assert";

import * as Core from "./Core_interface";
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
import * as Text_formatter from "./Text_formatter";
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
            const expected_name = Type_utilities.get_type_name([parameter_type]);
            assert.equal(parameter_type_node.children[0].word.value, expected_name);
        }
    }
}

function test_module_to_parse_tree(grammar_description: string[], module: Core_intermediate_representation.Module): Node {
    const production_rules = Grammar.create_production_rules(grammar_description);
    const mappings = Parse_tree_convertor_mappings.create_mapping();
    const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, production_rules, mappings);
    return parse_tree;
}

describe("Parse_tree_convertor.module_to_parse_tree", () => {

    it("Creates module parse tree from grammar 9", () => {
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());
        const parse_tree = test_module_to_parse_tree(Grammar_examples.create_test_grammar_9_description(), module);

        assert.equal(parse_tree.word.value, "Module");
        assert.equal(parse_tree.production_rule_index, 0);

        {
            const module_head = parse_tree.children[0];
            assert.equal(module_head.word.value, "Module_head");
            assert.equal(module_head.production_rule_index, 3);

            {
                const module_declaration = module_head.children[0];
                assert.equal(module_declaration.word.value, "Module_declaration");
                assert.equal(module_declaration.production_rule_index, 4);

                {
                    const module_keyword = module_declaration.children[0];
                    assert.equal(module_keyword.word.value, "module");
                    assert.equal(module_keyword.production_rule_index, undefined);
                }

                {
                    const module_name = module_declaration.children[1];
                    assert.equal(module_name.word.value, "Module_name");
                    assert.equal(module_name.production_rule_index, 5);

                    const identifier_with_dots = module_name.children[0];
                    assert.equal(identifier_with_dots.word.value, "Identifier_with_dots");
                    assert.equal(identifier_with_dots.production_rule_index, 1);

                    const identifier = identifier_with_dots.children[0];
                    assert.equal(identifier.word.value, "module_name");
                    assert.equal(identifier.production_rule_index, undefined);
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
            assert.equal(module_body.children.length, module.declarations.length);

            for (let declaration_index = 0; declaration_index < module.declarations.length; ++declaration_index) {
                const declaration = module.declarations[declaration_index];
                const declaration_node = module_body.children[declaration_index];
                const module_declarations = module.declarations;

                assert.equal(declaration_node.word.value, "Declaration");


                if (declaration.type === Core_intermediate_representation.Declaration_type.Alias) {

                    const alias_declaration = module_declarations[declaration_index].value as Core_intermediate_representation.Alias_type_declaration;

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
                        const expected_type = Type_utilities.get_type_name(alias_declaration.type);
                        assert.equal(type_node.children[0].word.value, expected_type);
                    }
                }
                else if (declaration.type === Core_intermediate_representation.Declaration_type.Enum) {

                    const enum_declaration = module_declarations[declaration_index].value as Core_intermediate_representation.Enum_declaration;

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
                    assert.equal(values_node.children.length, enum_declaration.values.length);

                    for (let member_index = 0; member_index < enum_declaration.values.length; ++member_index) {
                        const value = enum_declaration.values[member_index];

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
                else if (declaration.type === Core_intermediate_representation.Declaration_type.Function) {

                    const function_value = module_declarations[declaration_index].value as Core_intermediate_representation.Function;
                    const function_declaration = function_value.declaration;

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

                            assert_function_parameters(input_parameters_node, function_declaration.input_parameter_names, function_declaration.type.input_parameter_types);
                        }

                        {
                            const output_parameters_node = function_declaration_node.children[8];
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
                else if (declaration.type === Core_intermediate_representation.Declaration_type.Struct) {

                    const struct_declaration = module_declarations[declaration_index].value as Core_intermediate_representation.Struct_declaration;

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
                    assert.equal(members_node.children.length, struct_declaration.member_names.length);

                    for (let member_index = 0; member_index < struct_declaration.member_names.length; ++member_index) {
                        const member_name = struct_declaration.member_names[member_index];
                        const member_type = struct_declaration.member_types[member_index];
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

    it("Creates module imports nodes", () => {
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_module_with_dependencies());
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
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_alias_example());
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
                const expected_type = Type_utilities.get_type_name(alias_declaration.type);
                assert.equal(type_node.children[0].word.value, expected_type);
            }
        }
    });

    it("Creates enum nodes", () => {
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_enum_example());
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
            assert.equal(values_node.children.length, enum_declaration.values.length);

            for (let member_index = 0; member_index < enum_declaration.values.length; ++member_index) {
                const value = enum_declaration.values[member_index];

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
    });

    it("Creates function nodes", () => {
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_function_example());
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
        const function_node = declaration_node.children[0];
        assert.equal(function_node.word.value, "Function");

        {
            const declaration = module.declarations[0];
            const function_value = declaration.value as Core_intermediate_representation.Function;
            const function_declaration = function_value.declaration;

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

                assert_function_parameters(input_parameters_node, function_declaration.input_parameter_names, function_declaration.type.input_parameter_types);
            }

            {
                const output_parameters_node = function_declaration_node.children[8];
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

            {
                const close_block_node = block.children[2];
                assert.equal(close_block_node.word.value, "}");
                assert.equal(close_block_node.children.length, 0);
            }
        }
    });

    it("Creates function call nodes", () => {
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_function_calling_module_function_example());
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
        const function_node = declaration_node.children[0];
        const funtion_definition = function_node.children[1];
        const block_node = funtion_definition.children[0];
        const statements_node = block_node.children[1];
        const statement_node = statements_node.children[0];

        const expression_call_node = statement_node.children[0];
        assert.equal(expression_call_node.word.value, "Expression_call");

        {
            {
                const module_name_expression_node = expression_call_node.children[0];
                assert.equal(module_name_expression_node.word.value, "Expression_call_module_name");

                const module_name_node = module_name_expression_node.children[0];
                assert.equal(module_name_node.word.value, "stdio");
            }

            {
                const dot_node = expression_call_node.children[1];
                assert.equal(dot_node.word.value, ".");
            }

            {
                const function_name_node = expression_call_node.children[2];
                assert.equal(function_name_node.word.value, "Expression_call_function_name");

                const identifier_node = function_name_node.children[0];
                assert.equal(identifier_node.word.value, "printf");
            }

            {
                const open_parenthesis_node = expression_call_node.children[3];
                assert.equal(open_parenthesis_node.word.value, "(");
            }

            {
                const arguments_node = expression_call_node.children[4];
                assert.equal(arguments_node.children.length, 1);

                const argument_node = arguments_node.children[0];
                assert.equal(argument_node.word.value, "Generic_expression");

                const constant_expression_node = argument_node.children[0];
                assert.equal(constant_expression_node.word.value, "Expression_constant");

                const identifier_node = constant_expression_node.children[0];
                assert.equal(identifier_node.word.value, '"Hello world!"');
            }

            {
                const close_parenthesis_node = expression_call_node.children[5];
                assert.equal(close_parenthesis_node.word.value, ")");
            }
        }
    });

    it("Creates struct nodes", () => {
        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_struct_example());
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
            assert.equal(members_node.children.length, struct_declaration.member_names.length);

            for (let member_index = 0; member_index < struct_declaration.member_names.length; ++member_index) {
                const member_name = struct_declaration.member_names[member_index];
                const member_type = struct_declaration.member_types[member_index];
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
    module: Core_intermediate_representation.Module,
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

    const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(production_rules);
    const mappings = Parse_tree_convertor_mappings.create_mapping();
    const initial_parse_tree = Parse_tree_convertor.module_to_parse_tree(module, production_rules, mappings);
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

    const simplified_changes = Parser.simplify_changes(parse_tree, parse_result.changes);

    const module_changes = Parse_tree_convertor.create_module_changes(
        module,
        production_rules,
        parse_tree,
        simplified_changes,
        mappings,
        key_to_production_rule_indices
    );

    return module_changes;
}

describe("Parse_tree_convertor.create_module_changes", () => {

    it("Sets name of module", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
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

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 0, column: 19 },
            { line: 0, column: 19 },
            "\nfunction function_name() -> () {}\n"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "declarations");
            assert.equal(add_change.index, 0);

            const declaration = add_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "function_name");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Function);
            assert.equal(declaration.is_export, false);

            const function_value = declaration.value as Core_intermediate_representation.Function;

            const function_declaration = function_value.declaration;

            const expected_function_declaration: Core_intermediate_representation.Function_declaration = {
                name: "function_name",
                type: {
                    input_parameter_types: [],
                    output_parameter_types: [],
                    is_variadic: false
                },
                input_parameter_names: [],
                output_parameter_names: [],
                linkage: Core_intermediate_representation.Linkage.Private
            };

            assert.deepEqual(function_declaration, expected_function_declaration);

            const function_definition = function_value.definition;
            assert.equal(function_definition.name, "function_name");
            assert.deepEqual(function_definition.statements, []);
        }
    });

    it("Removes a function", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 11, column: 0 },
            { line: 15, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "declarations");
            assert.equal(remove_change.index, 2);
        }
    });

    it("Sets function name", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 11, column: 16 },
            { line: 11, column: 29 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 2);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "Another_name");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Function);
            assert.equal(declaration.is_export, true);

            const function_value = declaration.value as Core_intermediate_representation.Function;
            const expected_function_value: Core_intermediate_representation.Function = JSON.parse(JSON.stringify(module.declarations[2].value));

            const expected_declaration = expected_function_value.declaration;
            expected_declaration.name = "Another_name";
            assert.deepEqual(function_value.declaration, expected_declaration);

            const expected_definition = expected_function_value.definition;
            expected_definition.name = "Another_name";
            assert.deepEqual(function_value.definition, expected_definition);
        }
    });

    it("Adds new function input parameter", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 16, column: 30 },
            { line: 16, column: 30 },
            "foo: Bar, "
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 3);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "My_function_1");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Function);
            assert.equal(declaration.is_export, true);

            const function_value = declaration.value as Core_intermediate_representation.Function;

            const expected: Core_intermediate_representation.Function = JSON.parse(JSON.stringify(module.declarations[3].value));
            expected.declaration.input_parameter_names.splice(0, 0, "foo");
            expected.declaration.type.input_parameter_types.splice(0, 0, Type_utilities.parse_type_name("Bar")[0]);
            assert.deepEqual(function_value.declaration, expected.declaration);
        }
    });

    it("Removes function input parameter", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 16, column: 30 },
            { line: 16, column: 44 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 3);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "My_function_1");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Function);
            assert.equal(declaration.is_export, true);

            const function_value = declaration.value as Core_intermediate_representation.Function;

            const expected: Core_intermediate_representation.Function = JSON.parse(JSON.stringify(module.declarations[3].value));
            expected.declaration.input_parameter_names.splice(0, 1);
            expected.declaration.type.input_parameter_types.splice(0, 1);
            assert.deepEqual(function_value.declaration, expected.declaration);
        }
    });

    it("Sets function input parameter name", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 16, column: 30 },
            { line: 16, column: 33 },
            "beep"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 3);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "My_function_1");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Function);
            assert.equal(declaration.is_export, true);

            const function_value = declaration.value as Core_intermediate_representation.Function;

            const expected: Core_intermediate_representation.Function = JSON.parse(JSON.stringify(module.declarations[3].value));
            expected.declaration.input_parameter_names[0] = "beep";
            assert.deepEqual(function_value.declaration, expected.declaration);
        }
    });

    it("Sets function input parameter type", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 16, column: 35 },
            { line: 16, column: 42 },
            "beep"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 3);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "My_function_1");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Function);
            assert.equal(declaration.is_export, true);

            const function_value = declaration.value as Core_intermediate_representation.Function;

            const expected: Core_intermediate_representation.Function = JSON.parse(JSON.stringify(module.declarations[3].value));
            expected.declaration.type.input_parameter_types[0] = Type_utilities.parse_type_name("beep")[0];
            assert.deepEqual(function_value.declaration, expected.declaration);
        }
    });

    it("Adds new struct", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 1, column: 0 },
            { line: 1, column: 0 },
            "\nstruct Struct_name {}\n"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "declarations");
            assert.equal(add_change.index, 0);

            const declaration = add_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "Struct_name");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Struct);
            assert.equal(declaration.is_export, false);

            const struct_declaration = declaration.value as Core_intermediate_representation.Struct_declaration;
            assert.equal(struct_declaration.name, "Struct_name");
            assert.deepEqual(struct_declaration.member_names, []);
            assert.deepEqual(struct_declaration.member_types, []);
            assert.equal(struct_declaration.is_literal, false);
            assert.equal(struct_declaration.is_packed, false);
        }
    });

    it("Removes a struct", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 30, column: 0 },
            { line: 36, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "declarations");
            assert.equal(remove_change.index, 6);
        }
    });

    it("Sets struct name", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 30, column: 14 },
            { line: 30, column: 25 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 6);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "Another_name");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Struct);
            assert.equal(declaration.is_export, true);

            const expected: Core_intermediate_representation.Struct_declaration = JSON.parse(JSON.stringify(module.declarations[6].value));
            expected.name = "Another_name";
            assert.deepEqual(declaration.value, expected);
        }
    });

    it("Adds new enum", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 1, column: 0 },
            { line: 1, column: 0 },
            "\nenum My_enum {}\n"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "declarations");
            assert.equal(add_change.index, 0);

            const declaration = add_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "My_enum");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Enum);
            assert.equal(declaration.is_export, false);

            const enum_declaration = declaration.value as Core_intermediate_representation.Enum_declaration;
            assert.equal(enum_declaration.name, "My_enum");
            assert.deepEqual(enum_declaration.values, []);
        }
    });

    it("Removes an enum", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 4, column: 0 },
            { line: 10, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "declarations");
            assert.equal(remove_change.index, 1);
        }
    });

    it("Sets enum name", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 4, column: 12 },
            { line: 4, column: 21 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 1);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "Another_name");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Enum);
            assert.equal(declaration.is_export, true);

            const expected: Core_intermediate_representation.Enum_declaration = JSON.parse(JSON.stringify(module.declarations[1].value));
            expected.name = "Another_name";
            assert.deepEqual(declaration.value, expected);
        }
    });

    it("Adds new alias", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 1, column: 0 },
            { line: 1, column: 0 },
            "using My_alias = Float32;\n"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "declarations");
            assert.equal(add_change.index, 0);

            const declaration = add_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "My_alias");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, false);

            const alias_declaration = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            assert.deepEqual(alias_declaration.name, "My_alias");

            const expected_type = Type_utilities.parse_type_name("Float32");
            assert.deepEqual(alias_declaration.type, expected_type);
        }
    });

    it("Removes an alias", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 1, column: 0 },
            { line: 3, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "declarations");
            assert.equal(remove_change.index, 0);
        }
    });

    it("Sets alias name", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 2, column: 13 },
            { line: 2, column: 21 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 0);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "Another_name");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const expected: Core_intermediate_representation.Alias_type_declaration = JSON.parse(JSON.stringify(module.declarations[0].value));
            expected.name = "Another_name";
            assert.deepEqual(declaration.value, expected);
        }
    });

    it("Sets alias type", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 2, column: 24 },
            { line: 2, column: 31 },
            "Float64"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];

            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "declarations");
            assert.equal(set_change.index, 0);

            const declaration = set_change.value as Core_intermediate_representation.Declaration;
            assert.equal(declaration.name, "My_float");
            assert.equal(declaration.type, Core_intermediate_representation.Declaration_type.Alias);
            assert.equal(declaration.is_export, true);

            const expected: Core_intermediate_representation.Alias_type_declaration = JSON.parse(JSON.stringify(module.declarations[0].value));
            expected.type = Type_utilities.parse_type_name("Float64");
            assert.deepEqual(declaration.value, expected);
        }
    });

    it("Adds import module", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_0());

        const module_changes = create_module_changes(
            module,
            { line: 0, column: 19 },
            { line: 0, column: 19 },
            "\nimport My_library as ml;"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Add_element_to_vector);

            const add_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(add_change.vector_name, "imports");
            assert.equal(add_change.index, 0);

            const value: Core_intermediate_representation.Import_module_with_alias = {
                module_name: "My_library",
                alias: "ml",
                usages: []
            };
            assert.deepEqual(add_change.value, value);
        }
    });

    it("Removes import module", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_module_with_dependencies());

        const module_changes = create_module_changes(
            module,
            { line: 2, column: 0 },
            { line: 3, column: 0 },
            ""
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Remove_element_of_vector);

            const remove_change = change.change.value as Module_change.Remove_element_of_vector;
            assert.equal(remove_change.vector_name, "imports");
            assert.equal(remove_change.index, 0);
        }
    });

    it("Sets import module name", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_module_with_dependencies());

        const module_changes = create_module_changes(
            module,
            { line: 2, column: 7 },
            { line: 2, column: 14 },
            "Another_name"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Add_element_to_vector;
            assert.equal(set_change.vector_name, "imports");
            assert.equal(set_change.index, 0);

            const value: Core_intermediate_representation.Import_module_with_alias = {
                module_name: "Another_name",
                alias: "stdio",
                usages: []
            };
            assert.deepEqual(set_change.value, value);
        }
    });

    it("Sets import module alias", () => {

        const module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_module_with_dependencies());

        const module_changes = create_module_changes(
            module,
            { line: 2, column: 18 },
            { line: 2, column: 23 },
            "Another_alias"
        );

        assert.equal(module_changes.length, 1);

        {
            const change = module_changes[0];
            assert.deepEqual(change.position, []);

            assert.equal(change.change.type, Module_change.Type.Set_element_of_vector);

            const set_change = change.change.value as Module_change.Set_element_of_vector;
            assert.equal(set_change.vector_name, "imports");
            assert.equal(set_change.index, 0);

            const value: Core_intermediate_representation.Import_module_with_alias = {
                module_name: "C.stdio",
                alias: "Another_alias",
                usages: []
            };
            assert.deepEqual(set_change.value, value);
        }
    });
});

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

            assert.equal(actual_value.definition.name, expected_value.definition.name);

            assert.equal(actual_value.definition.statements.length, expected_value.definition.statements.length);

            for (let statement_index = 0; statement_index < actual_value.definition.statements.length; ++statement_index) {
                const actual_statement = actual_value.definition.statements[statement_index];
                const expected_statement = expected_value.definition.statements[statement_index];

                assert.deepEqual(actual_statement, expected_statement);
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


function test_parse_tree_to_module(grammar_description: string[], expected_module: Core_intermediate_representation.Module): Core_intermediate_representation.Module {
    const production_rules = Grammar.create_production_rules(grammar_description);

    const key_to_production_rule_indices = Parse_tree_convertor.create_key_to_production_rule_indices_map(production_rules);
    const mappings = Parse_tree_convertor_mappings.create_mapping();
    const parse_tree = Parse_tree_convertor.module_to_parse_tree(expected_module, production_rules, mappings);

    const actual_module = Parse_tree_convertor.parse_tree_to_module(parse_tree, production_rules, mappings, key_to_production_rule_indices);

    return actual_module;
}

describe("Parse_tree_convertor.parse_tree_to_module", () => {

    it("Handles the module name", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const expected_module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_empty());
        expected_module.name = "Test_name";
        const actual_module = test_parse_tree_to_module(grammar_description, expected_module);
        assert.equal(actual_module.name, expected_module.name);
    });

    it("Handles functions", () => {

        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const expected_module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_function_example());
        const actual_module = test_parse_tree_to_module(grammar_description, expected_module);

        assert_declarations(actual_module.declarations, expected_module.declarations);
    });

    it("Handles function calling library function", () => {

        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const expected_module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_function_calling_module_function_example());
        const actual_module = test_parse_tree_to_module(grammar_description, expected_module);

        assert_declarations(actual_module.declarations, expected_module.declarations);
    });


    it("Handles alias", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const expected_module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_alias_example());
        const actual_module = test_parse_tree_to_module(grammar_description, expected_module);

        assert_declarations(actual_module.declarations, expected_module.declarations);
    });

    it("Handles enums", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const expected_module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_enum_example());
        const actual_module = test_parse_tree_to_module(grammar_description, expected_module);

        assert_declarations(actual_module.declarations, expected_module.declarations);
    });

    it("Handles structs", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const expected_module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_struct_example());
        const actual_module = test_parse_tree_to_module(grammar_description, expected_module);

        assert_declarations(actual_module.declarations, expected_module.declarations);
    });

    it("Handles import dependencies", () => {
        const grammar_description = Grammar_examples.create_test_grammar_9_description();
        const expected_module = Core_intermediate_representation.create_intermediate_representation(Module_examples.create_module_with_dependencies());
        const actual_module = test_parse_tree_to_module(grammar_description, expected_module);

        assert.deepEqual(actual_module.imports, expected_module.imports);
    });
});
