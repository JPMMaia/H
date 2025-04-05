import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Module_change from "./Module_change";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import * as Type_utilities from "./Type_utilities";
import { onThrowError } from "./errors";

export function create_mapping(): Parse_tree_convertor.Parse_tree_mappings {

    const value_map = new Map<string, string[]>(
        [
            ["Module_name", ["name"]],
            ["Import_name", ["imports", "$order_index", "module_name"]],
            ["Import_alias", ["imports", "$order_index", "alias"]],
            ["Alias_name", ["declarations", "$declaration_index", "value", "name"]],
            ["Enum_name", ["declarations", "$declaration_index", "value", "name"]],
            ["Enum_value_name", ["declarations", "$declaration_index", "value", "values", "$order_index", "name"]],
            ["Function_name", ["declarations", "$declaration_index", "value", "declaration", "name"]],
            ["Function_parameter_name", ["declarations", "$declaration_index", "value", "declaration", "$parameter_names", "$order_index"]],
            ["Global_variable_name", ["declarations", "$declaration_index", "value", "name"]],
            ["Statement", ["declarations", "$declaration_index", "value", "definition", "statements", "$order_index"]],
            ["Struct_name", ["declarations", "$declaration_index", "value", "name"]],
            ["Struct_member_name", ["declarations", "$declaration_index", "value", "member_names", "$order_index"]],
            ["Union_name", ["declarations", "$declaration_index", "value", "name"]],
            ["Union_member_name", ["declarations", "$declaration_index", "value", "member_names", "$order_index"]],
        ]
    );

    const value_transforms = new Map<string, (value: any) => string>(
        [
        ]
    );

    const terminal_to_word_map = new Map<string, Parse_tree_convertor.Map_terminal_to_word_handler>(
        [
            ["Identifier_with_dots", map_identifier_with_dots_to_word],
            ["Comment_or_empty", map_comment_to_word],
            ["Type_name", map_type_name_to_word],
            ["Module_type_module_name", map_module_type_module_name_to_word],
            ["Module_type_type_name", map_module_type_type_name_to_word],
            ["Constant_array_length", map_constant_array_length_to_word],
            ["Function_precondition_name", map_function_precondition_to_word],
            ["Function_postcondition_name", map_function_postcondition_to_word],
            ["Expression_access_member_name", map_expression_access_member_name_to_word],
            ["Expression_break_loop_count", map_expression_break_loop_count_to_word],
            ["Expression_comment", map_comment_to_word],
            ["Expression_constant", map_expression_constant_to_word],
            ["Expression_instantiate_member_name", map_expression_instantiate_member_name_to_word],
            ["Expression_for_loop_variable", map_for_loop_variable_to_word],
            ["Variable_name", map_variable_name_to_word],
        ]
    );

    const vector_map = new Map<string, string[][]>(
        [
            ["Imports", [["imports"]]],
            ["Module_body", [["declarations"]]],
            ["Enum_values", [["declarations", "$order_index", "value", "values"]]],
            ["Function_input_parameters", [
                ["declarations", "$declaration_index", "value", "declaration", "input_parameter_names"],
                ["declarations", "$declaration_index", "value", "declaration", "type", "input_parameter_types"]
            ]],
            ["Function_output_parameters", [
                ["declarations", "$declaration_index", "value", "declaration", "output_parameter_names"],
                ["declarations", "$declaration_index", "value", "declaration", "type", "output_parameter_types"],
            ]],
            ["Function_preconditions", [["declarations", "$declaration_index", "value", "declaration", "preconditions"]]],
            ["Function_postconditions", [["declarations", "$declaration_index", "value", "declaration", "postconditions"]]],
            ["Struct_members", [
                ["declarations", "$declaration_index", "value", "member_names"],
                ["declarations", "$declaration_index", "value", "member_types"]
            ]],
            ["Union_members", [
                ["declarations", "$declaration_index", "value", "member_names"],
                ["declarations", "$declaration_index", "value", "member_types"]
            ]],
            ["Statements", [["declarations", "$order_index", "value", "definition", "statements"]]],
            ["Expression_block_statements", [["$top.state.value", "data", "value", "statements"]]],
            ["Expression_call_arguments", [["$top.state.value", "data", "value", "arguments"]]],
            ["Expression_create_array_elements", [["$top.state.value", "data", "value", "array_data"]]],
            ["Expression_instantiate_members", [["$top.state.value", "data", "value", "members"]]],
            ["Expression_for_loop_statements", [["$top.state.value", "data", "value", "then_statements"]]],
            ["Expression_if_statements", [["$top.state.value", "data", "value", "series", "$if_series_index", "then_statements"]]],
            ["Expression_switch_cases", [["$top.state.value", "data", "value", "cases"]]],
            ["Expression_switch_case_statements", [["$top.state.value", "statements"]]],
            ["Expression_while_loop_statements", [["$top.state.value", "data", "value", "then_statements"]]],
        ]
    );

    const order_index_nodes = new Set<string>(
        [
            "Imports",
            "Module_body",
            "Enum_values",
            "Function_input_parameters",
            "Function_output_parameters",
            "Struct_members",
            "Union_members",
            "Statements",
        ]
    );

    const choose_production_rule = new Map<string, Parse_tree_convertor.Choose_production_rule_handler>(
        [
            ["Identifier_with_dots", choose_production_rule_identifier_with_dots],
            ["Comment_or_empty", choose_production_rule_comment_or_empty],
            ["Declaration", choose_production_rule_declaration],
            ["Export", choose_production_rule_export],
            ["Type", choose_production_rule_type],
            ["Pointer_type", choose_production_rule_pointer_type],
            ["Enum_value", choose_production_rule_enum_value],
            ["Global_variable_mutability", choose_production_rule_global_variable_mutability],
            ["Global_variable_type", choose_production_rule_global_variable_type],
            ["Struct_name", choose_production_rule_struct_name],
            ["Union_name", choose_production_rule_union_name],
            ["Function_name", choose_production_rule_function_name],
            ["Function_parameter", choose_production_rule_function_parameter],
            ["Statement", choose_production_rule_statement],
            ["Expression_assignment_symbol", choose_production_rule_expression_assignment_symbol],
            ["Expression_binary_addition_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_bitwise_and_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_bitwise_xor_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_bitwise_or_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_bitwise_shift_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_logical_and_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_logical_or_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_multiplication_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_relational_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_binary_relational_equal_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_break", choose_production_rule_expression_break],
            ["Expression_constant", choose_production_rule_expression_constant],
            ["Expression_for_loop_number_expression", choose_production_rule_expression_for_loop_number],
            ["Expression_for_loop_step", choose_production_rule_expression_for_loop_step],
            ["Expression_for_loop_reverse", choose_production_rule_expression_for_loop_reverse],
            ["Expression_if_else", choose_production_rule_expression_if_else],
            ["Expression_instantiate_expression_type", choose_production_rule_expression_instantiate_expression_type],
            ["Expression_return", choose_production_rule_expression_return],
            ["Expression_switch_case", choose_production_rule_expression_switch_case],
            ["Expression_switch_case_value", choose_production_rule_expression_switch_case_value],
            ["Expression_unary", choose_production_rule_expression_unary],
            ["Expression_unary_0_symbol", choose_production_rule_expression_unary_0_symbol],
            ["Expression_unary_1_symbol", choose_production_rule_expression_unary_1_symbol],
            ["Expression_variable_mutability", choose_production_rule_expression_variable_mutability],
            ["Expression_level_0", choose_production_rule_generic_expression],
            ["Expression_level_1", choose_production_rule_generic_expression],
            ["Expression_level_2", choose_production_rule_generic_expression],
            ["Expression_level_3", choose_production_rule_generic_expression],
            ["Expression_level_4", choose_production_rule_generic_expression],
            ["Expression_level_5", choose_production_rule_generic_expression],
            ["Expression_level_6", choose_production_rule_generic_expression],
            ["Expression_level_7", choose_production_rule_generic_expression],
            ["Expression_level_8", choose_production_rule_generic_expression],
            ["Expression_level_9", choose_production_rule_generic_expression],
            ["Expression_level_10", choose_production_rule_generic_expression],
            ["Expression_level_11", choose_production_rule_generic_expression],
            ["Expression_level_12", choose_production_rule_generic_expression],
            ["Generic_expression", choose_production_rule_generic_expression],
            ["Generic_expression_or_instantiate", choose_production_rule_generic_expression],
        ]
    );

    const create_module_changes_map = new Map<string, Parse_tree_convertor.Create_module_changes_handler>(
        [
            ["Module_name", create_module_changes_module_name],
            ["Import", create_module_changes_import],
            //["Declaration", create_module_changes_declaration],
        ]
    );

    const node_to_core_object_map = new Map<string, Parse_tree_convertor.Node_to_core_object_handler>(
        [
            ["Import", node_to_import_module_with_alias],
            //["Declaration", node_to_declaration],
        ]
    );

    return {
        value_map: value_map,
        value_transforms: value_transforms,
        terminal_to_word_map: terminal_to_word_map,
        vector_map: vector_map,
        order_index_nodes: order_index_nodes,
        choose_production_rule: choose_production_rule,
        create_module_changes_map: create_module_changes_map,
        node_to_core_object_map: node_to_core_object_map,
        extract_comments_from_node: extract_comments_from_node,
        get_node_source_location: get_node_source_location
    };
}

function map_identifier_with_dots_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const index = stack[stack.length - 1].current_child_index;
    if (index % 2 !== 0) {
        return { value: ".", type: Grammar.Word_type.Symbol };
    }

    const word = Parse_tree_convertor.map_terminal_to_word(module, stack.slice(0, stack.length - 1), production_rules, "identifier", mappings);
    const split = word.value.split(".");
    return { value: split[index / 2], type: Grammar.Word_type.Alphanumeric };
}

function map_comment_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const comments_string = extract_comments_from_stack(stack, production_rules) as string;

    const unformatted_comments = comments_string.split("\n");

    const formatted_comments: string[] = [];

    for (const comment of unformatted_comments) {
        formatted_comments.push(`// ${comment}`);
    }

    const formatted_comment_string = formatted_comments.join("\n");

    return { value: formatted_comment_string, type: Grammar.Word_type.Comment };
}

function is_c_string(type_reference: Core_intermediate_representation.Type_reference): boolean {

    if (type_reference.data.type === Core_intermediate_representation.Type_reference_enum.Pointer_type) {
        const pointer_type = type_reference.data.value as Core_intermediate_representation.Pointer_type;
        if (pointer_type.element_type.length > 0 && pointer_type.element_type[0].data.type === Core_intermediate_representation.Type_reference_enum.Fundamental_type) {
            const element_type = pointer_type.element_type[0].data.value as Core_intermediate_representation.Fundamental_type;
            return element_type === Core_intermediate_representation.Fundamental_type.C_char;
        }
    }

    return false;
}

function map_type_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const type_reference_array = top.state.value as Core_intermediate_representation.Type_reference[];
    const value = Type_utilities.get_type_name(type_reference_array);
    return { value: value, type: Grammar.Word_type.Alphanumeric };
}

function map_module_type_module_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const type_reference_array = top.state.value as Core_intermediate_representation.Type_reference[];
    const custom_type_reference = type_reference_array[0].data.value as Core_intermediate_representation.Custom_type_reference;
    return { value: custom_type_reference.module_reference.name, type: Grammar.Word_type.Alphanumeric };
}

function map_module_type_type_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const type_reference_array = top.state.value as Core_intermediate_representation.Type_reference[];
    const custom_type_reference = type_reference_array[0].data.value as Core_intermediate_representation.Custom_type_reference;
    return { value: custom_type_reference.name, type: Grammar.Word_type.Alphanumeric };
}

function map_constant_array_length_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const type_reference_array = top.state.value as Core_intermediate_representation.Type_reference[];
    const constant_array_type = type_reference_array[0].data.value as Core_intermediate_representation.Constant_array_type;
    return { value: constant_array_type.size.toString(), type: Grammar.Word_type.Number };
}

function map_function_precondition_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const stack_element = stack[stack.length - 3];
    const preconditions_array = stack_element.state.value as Core_intermediate_representation.Function_condition[];
    const precondition_index = stack_element.current_child_index - 1;
    const precondition = preconditions_array[precondition_index];
    return { value: `"${precondition.description}"`, type: Grammar.Word_type.String };
}

function map_function_postcondition_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const stack_element = stack[stack.length - 3];
    const postconditions_array = stack_element.state.value as Core_intermediate_representation.Function_condition[];
    const postcondition_index = stack_element.current_child_index - 1;
    const postcondition = postconditions_array[postcondition_index];
    return { value: `"${postcondition.description}"`, type: Grammar.Word_type.String };
}

function map_expression_access_member_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const access_expression = expression.data.value as Core_intermediate_representation.Access_expression;
    return { value: access_expression.member_name, type: Grammar.Word_type.Alphanumeric };
}

function map_expression_break_loop_count_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const break_expression = expression.data.value as Core_intermediate_representation.Break_expression;
    return { value: break_expression.loop_count.toString(), type: Grammar.Word_type.Number };
}

export function constant_expression_to_word(
    constant_expression: Core_intermediate_representation.Constant_expression
): Grammar.Word {

    const type_reference = constant_expression.type.data;

    switch (type_reference.type) {
        case Core_intermediate_representation.Type_reference_enum.Fundamental_type: {
            const type = type_reference.value as Core_intermediate_representation.Fundamental_type;
            switch (type) {
                case Core_intermediate_representation.Fundamental_type.Float16: {
                    const value = `${constant_expression.data}f16`;
                    return { value: value, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.Float32: {
                    const value = `${constant_expression.data}f32`;
                    return { value: value, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.Float64: {
                    const value = `${constant_expression.data}f64`;
                    return { value: value, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.String: {
                    return { value: `"${constant_expression.data}"`, type: Grammar.Word_type.String };
                }
                case Core_intermediate_representation.Fundamental_type.C_char: {
                    return { value: `${constant_expression.data}cc`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_short: {
                    return { value: `${constant_expression.data}cs`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_int: {
                    return { value: `${constant_expression.data}ci`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_long: {
                    return { value: `${constant_expression.data}cl`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_longlong: {
                    return { value: `${constant_expression.data}cll`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_uchar: {
                    return { value: `${constant_expression.data}cuc`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_ushort: {
                    return { value: `${constant_expression.data}cus`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_uint: {
                    return { value: `${constant_expression.data}cui`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_ulong: {
                    return { value: `${constant_expression.data}cul`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_ulonglong: {
                    return { value: `${constant_expression.data}cull`, type: Grammar.Word_type.Number };
                }
                case Core_intermediate_representation.Fundamental_type.C_bool: {
                    return { value: `${constant_expression.data}cb`, type: Grammar.Word_type.Number };
                }
                default: {
                    return { value: constant_expression.data, type: Scanner.get_word_type(constant_expression.data) };
                }
            }
        }
        case Core_intermediate_representation.Type_reference_enum.Integer_type: {
            const integer_type = type_reference.value as Core_intermediate_representation.Integer_type;
            const is_int_32 = integer_type.is_signed && integer_type.number_of_bits === 32;
            if (is_int_32) {
                return { value: constant_expression.data, type: Grammar.Word_type.Number };
            }

            const signed_suffix = integer_type.is_signed ? "i" : "u";
            const suffix = `${signed_suffix}${integer_type.number_of_bits}`;
            const value = constant_expression.data + suffix;
            return { value: value, type: Grammar.Word_type.Number };
        }
        case Core_intermediate_representation.Type_reference_enum.Pointer_type: {
            if (is_c_string(constant_expression.type)) {
                return { value: `"${constant_expression.data}"c`, type: Grammar.Word_type.String };
            }
        }
        default:
            break;
    }

    const message = `Did not expect '${type_reference.type}' as a constant expression`;
    onThrowError(message);
    throw Error(message);
}

function map_expression_constant_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const constant_expression = expression.data.value as Core_intermediate_representation.Constant_expression;
    return constant_expression_to_word(constant_expression);
}

function map_expression_instantiate_member_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const instantiate_expression = expression.data.value as Core_intermediate_representation.Instantiate_expression;

    const array_state = stack[stack.length - 3];
    const member_index = Parse_tree_convertor.calculate_array_index(production_rules[array_state.production_rule_index], array_state.current_child_index - 1);
    const member = instantiate_expression.members[member_index];

    return { value: member.member_name, type: Grammar.Word_type.Alphanumeric };
}

function map_for_loop_variable_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const for_loop_expression = expression.data.value as Core_intermediate_representation.For_loop_expression;
    return { value: for_loop_expression.variable_name, type: Grammar.Word_type.Alphanumeric };
}

function map_variable_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Grammar.Word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const variable_expression = expression.data.value as Core_intermediate_representation.Variable_expression;
    return { value: variable_expression.name, type: Grammar.Word_type.Alphanumeric };
}

function choose_production_rule_identifier_with_dots(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const word = Parse_tree_convertor.map_terminal_to_word(module, stack, production_rules, "identifier", mappings);
    const split = word.value.split(".");
    const index = split.length > 1 ? 1 : 0;
    return {
        next_state: {
            index: 0,
            value: undefined
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_comment_or_empty(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const comment = extract_comments_from_stack(stack, production_rules);
    const index = comment !== undefined ? 1 : 0;
    return {
        next_state: {
            index: 0,
            value: undefined
        },
        next_production_rule_index: production_rule_indices[index]
    };
}


function choose_production_rule_declaration(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const production_rule = production_rules[top.production_rule_index];
    const declaration_index = Parse_tree_convertor.calculate_array_index(production_rule, top.current_child_index);
    const declaration = module.declarations[declaration_index];

    const lhs = get_underlying_declaration_production_rule_lhs(declaration.type);

    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, lhs));
    return {
        next_state: {
            index: declaration_index,
            value: declaration
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function get_underlying_declaration_production_rule_lhs(type: Core_intermediate_representation.Declaration_type): string {
    switch (type) {
        case Core_intermediate_representation.Declaration_type.Alias:
            return "Alias";
        case Core_intermediate_representation.Declaration_type.Enum:
            return "Enum";
        case Core_intermediate_representation.Declaration_type.Function:
            return "Function";
        case Core_intermediate_representation.Declaration_type.Global_variable:
            return "Global_variable";
        case Core_intermediate_representation.Declaration_type.Struct:
            return "Struct";
        case Core_intermediate_representation.Declaration_type.Union:
            return "Union";
    }
}

function choose_production_rule_export(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const declaration = top.state.value as Core_intermediate_representation.Declaration;
    const predicate =
        declaration.is_export ?
            (index: number) => production_rules[index].rhs.length > 0 :
            (index: number) => production_rules[index].rhs.length === 0;
    const index = production_rule_indices.findIndex(predicate);

    return {
        next_state: top.state,
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_type(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];

    const get_type_reference = (): Core_intermediate_representation.Type_reference[] => {
        if (top.node.word.value === "Alias_type") {
            const alias_type_state = stack[stack.length - 2];
            const alias_type_declaration = alias_type_state.state.value.value as Core_intermediate_representation.Alias_type_declaration;
            return alias_type_declaration.type;
        }
        else if (top.node.word.value === "Function_parameter_type") {
            const function_declaration_state = stack[stack.length - 4];
            if (function_declaration_state.node.word.value === "Function_declaration") {
                const function_declaration = function_declaration_state.state.value.value.declaration as Core_intermediate_representation.Function_declaration;

                const parameters_array_state = stack[stack.length - 3];
                const parameter_index = (parameters_array_state.current_child_index - 1) / 2;
                const is_input_parameters = parameters_array_state.node.word.value === "Function_input_parameters";

                const parameter_type_array = is_input_parameters ? function_declaration.type.input_parameter_types : function_declaration.type.output_parameter_types;
                const parameter_type = parameter_type_array[parameter_index];

                return [parameter_type];
            }
            else if (function_declaration_state.node.word.value === "Function_pointer_type") {
                const function_pointer_type = function_declaration_state.state.value[0].data.value as Core_intermediate_representation.Function_pointer_type;

                const parameters_array_state = stack[stack.length - 3];
                const parameter_index = (parameters_array_state.current_child_index - 1) / 2;
                const is_input_parameters = parameters_array_state.node.word.value === "Function_pointer_type_input_parameters";

                const parameter_type_array = is_input_parameters ? function_pointer_type.type.input_parameter_types : function_pointer_type.type.output_parameter_types;
                const parameter_type = parameter_type_array[parameter_index];

                return [parameter_type];
            }
        }
        else if (top.node.word.value === "Struct_member_type") {
            const struct_state = stack[stack.length - 4];
            const struct_declaration = struct_state.state.value.value as Core_intermediate_representation.Struct_declaration;

            const member_types_array_state = stack[stack.length - 3];
            const member_type_index = (member_types_array_state.current_child_index - 1);

            const member_type = struct_declaration.member_types[member_type_index];
            return [member_type];
        }
        else if (top.node.word.value === "Union_member_type") {
            const union_state = stack[stack.length - 4];
            const union_declaration = union_state.state.value.value as Core_intermediate_representation.Union_declaration;

            const member_types_array_state = stack[stack.length - 3];
            const member_type_index = (member_types_array_state.current_child_index - 1);

            const member_type = union_declaration.member_types[member_type_index];
            return [member_type];
        }
        else if (top.node.word.value === "Expression_cast_destination_type") {
            const expression = top.state.value as Core_intermediate_representation.Expression;
            const cast_expression = expression.data.value as Core_intermediate_representation.Cast_expression;
            return [cast_expression.destination_type];
        }
        else if (top.node.word.value === "Expression_variable_declaration_type") {
            const expression = top.state.value as Core_intermediate_representation.Expression;
            const variable_declaration_with_type_expression = expression.data.value as Core_intermediate_representation.Variable_declaration_with_type_expression;
            return [variable_declaration_with_type_expression.type];
        }
        else if (top.node.word.value === "Pointer_type") {
            const type_reference_array = top.state.value as Core_intermediate_representation.Type_reference[];
            const pointer_type = type_reference_array[0].data.value as Core_intermediate_representation.Pointer_type;
            return pointer_type.element_type;
        }
        else if (top.node.word.value === "Constant_array_type") {
            const type_reference_array = top.state.value as Core_intermediate_representation.Type_reference[];
            const constant_array_type = type_reference_array[0].data.value as Core_intermediate_representation.Constant_array_type;
            return constant_array_type.value_type;
        }

        const message = `Parse_tree_convertor_mappings.choose_production_rule_type(): unhandled '${top.node.word.value}'`;
        onThrowError(message);
        throw Error(message);
    };

    const type_reference_array = get_type_reference();

    if (type_reference_array.length === 0) {
        const rhs_to_find = "Type_name";
        const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_to_find));
        return {
            next_state: {
                index: 0,
                value: type_reference_array
            },
            next_production_rule_index: production_rule_indices[index]
        };
    }

    const type_reference = type_reference_array[0];

    switch (type_reference.data.type) {
        case Core_intermediate_representation.Type_reference_enum.Custom_type_reference: {
            const value = type_reference.data.value as Core_intermediate_representation.Custom_type_reference;
            const rhs_to_find = value.module_reference.name.length > 0 ? "Module_type" : "Type_name";
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_to_find));
            return {
                next_state: {
                    index: 0,
                    value: type_reference_array
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        case Core_intermediate_representation.Type_reference_enum.Pointer_type: {
            const rhs_to_find = "Pointer_type";
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_to_find));
            return {
                next_state: {
                    index: 0,
                    value: type_reference_array
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        case Core_intermediate_representation.Type_reference_enum.Constant_array_type: {
            const rhs_to_find = "Constant_array_type";
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_to_find));
            return {
                next_state: {
                    index: 0,
                    value: type_reference_array
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        case Core_intermediate_representation.Type_reference_enum.Function_pointer_type: {
            const rhs_to_find = "Function_pointer_type";
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_to_find));
            return {
                next_state: {
                    index: 0,
                    value: type_reference_array
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        default: {
            const rhs_to_find = "Type_name";
            const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_to_find));
            return {
                next_state: {
                    index: 0,
                    value: type_reference_array
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
    }
}

function choose_production_rule_pointer_type(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const type_reference_array = top.state.value as Core_intermediate_representation.Type_reference[];
    const type_reference = type_reference_array[0];

    if (type_reference.data.type !== Core_intermediate_representation.Type_reference_enum.Pointer_type) {
        const message = `Parse_tree_convertor_mappings.choose_production_rule_pointer_type(): expected 'Pointer_type' but got '${type_reference.data.type}'`;
        onThrowError(message);
        throw Error(message);
    }

    const pointer_type = type_reference.data.value as Core_intermediate_representation.Pointer_type;

    const index = pointer_type.is_mutable ? 1 : 0;
    return {
        next_state: {
            index: 0,
            value: type_reference_array
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_enum_value(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];

    const enum_declaration_state = stack[stack.length - 2];
    const enum_declaration = enum_declaration_state.state.value.value as Core_intermediate_representation.Enum_declaration;

    const enum_value_index = top.current_child_index;
    const enum_value = enum_declaration.values[enum_value_index];

    const index = enum_value.value !== undefined ? 1 : 0;
    return {
        next_state: {
            index: 0,
            value: top.state.value
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_global_variable_mutability(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const global_variable_declaration = top.state.value as Core_intermediate_representation.Global_variable_declaration;
    const index = !global_variable_declaration.is_mutable ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: global_variable_declaration
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_global_variable_type(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];

    const global_variable_declaration_state = stack[stack.length - 1];
    const global_variable_declaration = global_variable_declaration_state.state.value.value as Core_intermediate_representation.Global_variable_declaration;

    const index = global_variable_declaration.type !== undefined ? 1 : 0;

    return {
        next_state: {
            index: 0,
            value: top.state.value
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function get_parameter_names(
    stack_element: Parse_tree_convertor.Module_to_parse_tree_stack_element,
    is_input_parameters: boolean
): string[] {

    if (stack_element.node.word.value === "Function_declaration") {
        const declaration = stack_element.state.value as Core_intermediate_representation.Declaration;
        const function_value = declaration.value as Core_intermediate_representation.Function;
        return is_input_parameters ? function_value.declaration.input_parameter_names : function_value.declaration.output_parameter_names;
    }
    else if (stack_element.node.word.value === "Function_pointer_type") {
        const function_pointer_type = stack_element.state.value[0].data.value as Core_intermediate_representation.Function_pointer_type;
        return is_input_parameters ? function_pointer_type.input_parameter_names : function_pointer_type.output_parameter_names;
    }
    else {
        const message = `Parse_tree_converto_mappings.get_parameter_names(): Did not handle ${stack_element.node.word.value}!`;
        onThrowError(message);
        throw Error(message);
    }
}

function choose_production_rule_struct_name(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const struct_declaration = top.state.value.value as Core_intermediate_representation.Struct_declaration;
    const index = struct_declaration.name.length === 0 ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: top.state.value
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_union_name(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const union_declaration = top.state.value.value as Core_intermediate_representation.Union_declaration;
    const index = union_declaration.name.length === 0 ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: top.state.value
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_function_name(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];
    const function_value = top.state.value.value as Core_intermediate_representation.Function;
    const index = function_value.declaration.name.length === 0 ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: top.state.value
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_function_parameter(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const top = stack[stack.length - 1];

    const top_state = stack[stack.length - 1];
    const function_parameter_index = top_state.current_child_index / 2;
    const is_input_parameters = top_state.node.word.value === "Function_input_parameters" || top_state.node.word.value === "Function_pointer_type_input_parameters";

    const parameter_names = get_parameter_names(stack[stack.length - 2], is_input_parameters);

    const is_variadic_argument = is_input_parameters && function_parameter_index >= parameter_names.length;

    const index = is_variadic_argument ? 1 : 0;

    return {
        next_state: {
            index: 0,
            value: top.state.value
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function get_statement_from_stack(
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    top_element_index: number,
    production_rules: Grammar.Production_rule[]
): Core_intermediate_representation.Statement {

    const top = stack[top_element_index];

    const current_child_index = top_element_index === stack.length - 1 ? top.current_child_index : top.current_child_index - 1;

    if (top.node.word.value === "Expression_for_loop_statements") {
        const for_loop_expression = top.state.value.data.value as Core_intermediate_representation.For_loop_expression;
        const statement_index = current_child_index;
        const statement = for_loop_expression.then_statements[statement_index];
        return statement;
    }
    else if (top.node.word.value === "Expression_if_statements") {
        const if_expression = top.state.value.data.value as Core_intermediate_representation.If_expression;
        const serie_index = Parse_tree_convertor.get_if_serie_index(stack);
        const serie = if_expression.series[serie_index];
        const statement_index = current_child_index;
        const statement = serie.then_statements[statement_index];
        return statement;
    }
    else if (top.node.word.value === "Expression_switch_case_statements") {
        const switch_case = top.state.value as Core_intermediate_representation.Switch_case_expression_pair;
        const statements = switch_case.statements;
        const statement_index = current_child_index;
        const statement = statements[statement_index];
        return statement;
    }
    else if (top.node.word.value === "Expression_while_loop_statements") {
        const while_loop_expression = top.state.value.data.value as Core_intermediate_representation.While_loop_expression;
        const statement_index = current_child_index;
        const statement = while_loop_expression.then_statements[statement_index];
        return statement;
    }

    const statements_array = top.node.word.value === "Expression_block_statements" ?
        (top.state.value.data.value as Core_intermediate_representation.Block_expression).statements :
        top.state.value as Core_intermediate_representation.Statement[];

    const statement_index = Parse_tree_convertor.calculate_array_index(production_rules[top.production_rule_index], current_child_index);
    const statement = statements_array[statement_index];
    return statement;
}

function choose_production_rule_statement(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const statement = get_statement_from_stack(stack, stack.length - 1, production_rules);

    const first_expression = statement.expression;
    const rhs_label = map_expression_type_to_production_rule_label(first_expression);
    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));

    return {
        next_state: {
            index: 0,
            value: first_expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

export function assignment_binary_operation_to_string(additional_operation: Core_intermediate_representation.Binary_operation | undefined): string {
    switch (additional_operation) {
        case undefined: return "=";
        case Core_intermediate_representation.Binary_operation.Add: return "+=";
        case Core_intermediate_representation.Binary_operation.Subtract: return "-=";
        case Core_intermediate_representation.Binary_operation.Multiply: return "*=";
        case Core_intermediate_representation.Binary_operation.Divide: return "/=";
        case Core_intermediate_representation.Binary_operation.Modulus: return "%=";
        case Core_intermediate_representation.Binary_operation.Bitwise_and: return "&=";
        case Core_intermediate_representation.Binary_operation.Bitwise_or: return "|=";
        case Core_intermediate_representation.Binary_operation.Bitwise_xor: return "^=";
        case Core_intermediate_representation.Binary_operation.Bit_shift_left: return "<<=";
        case Core_intermediate_representation.Binary_operation.Bit_shift_right: return ">>=";
        default: {
            const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_assignment_symbol() did not expect '${additional_operation}'`;
            onThrowError(message);
            throw Error(message);
        }
    }
}

function choose_production_rule_expression_assignment_symbol(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const assignment_expression = expression.data.value as Core_intermediate_representation.Assignment_expression;

    const rhs_label = assignment_binary_operation_to_string(assignment_expression.additional_operation);
    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));
    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

export function binary_operation_to_string(operation: Core_intermediate_representation.Binary_operation): string {
    switch (operation) {
        case Core_intermediate_representation.Binary_operation.Add: return "+";
        case Core_intermediate_representation.Binary_operation.Subtract: return "-";
        case Core_intermediate_representation.Binary_operation.Multiply: return "*";
        case Core_intermediate_representation.Binary_operation.Divide: return "/";
        case Core_intermediate_representation.Binary_operation.Modulus: return "%";
        case Core_intermediate_representation.Binary_operation.Equal: return "==";
        case Core_intermediate_representation.Binary_operation.Not_equal: return "!=";
        case Core_intermediate_representation.Binary_operation.Less_than: return "<";
        case Core_intermediate_representation.Binary_operation.Less_than_or_equal_to: return "<=";
        case Core_intermediate_representation.Binary_operation.Greater_than: return ">";
        case Core_intermediate_representation.Binary_operation.Greater_than_or_equal_to: return ">=";
        case Core_intermediate_representation.Binary_operation.Logical_and: return "&&";
        case Core_intermediate_representation.Binary_operation.Logical_or: return "||";
        case Core_intermediate_representation.Binary_operation.Bitwise_and: return "&";
        case Core_intermediate_representation.Binary_operation.Bitwise_or: return "|";
        case Core_intermediate_representation.Binary_operation.Bitwise_xor: return "^";
        case Core_intermediate_representation.Binary_operation.Bit_shift_left: return "<<";
        case Core_intermediate_representation.Binary_operation.Bit_shift_right: return ">>";
        case Core_intermediate_representation.Binary_operation.Has: return "has";
    }
};

function choose_production_rule_expression_binary_symbol(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const binary_expression = expression.data.value as Core_intermediate_representation.Binary_expression;

    const rhs_label = binary_operation_to_string(binary_expression.operation);
    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));
    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_break(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const break_expression = expression.data.value as Core_intermediate_representation.Break_expression;

    const index = break_expression.loop_count === 0 ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_constant(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const constant_expression = expression.data.value as Core_intermediate_representation.Constant_expression;

    const type_reference = constant_expression.type;

    switch (type_reference.data.type) {
        case Core_intermediate_representation.Type_reference_enum.Fundamental_type: {
            const fundamental_type = type_reference.data.value as Core_intermediate_representation.Fundamental_type;

            const get_rhs_to_find = (): string => {
                switch (fundamental_type) {
                    case Core_intermediate_representation.Fundamental_type.Bool:
                        return "boolean";
                    case Core_intermediate_representation.Fundamental_type.String:
                        return "string";
                    default:
                        return "number";
                }
            };

            const rhs_to_find = get_rhs_to_find();

            const index = production_rule_indices.findIndex(index => production_rules[index].rhs[0] === rhs_to_find);
            return {
                next_state: {
                    index: 0,
                    value: expression
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        case Core_intermediate_representation.Type_reference_enum.Integer_type: {
            const index = production_rule_indices.findIndex(index => production_rules[index].rhs[0] === "number");
            return {
                next_state: {
                    index: 0,
                    value: expression
                },
                next_production_rule_index: production_rule_indices[index]
            };
        }
        case Core_intermediate_representation.Type_reference_enum.Pointer_type: {
            if (is_c_string(type_reference)) {
                const rhs_to_find = "string";
                const index = production_rule_indices.findIndex(index => production_rules[index].rhs[0] === rhs_to_find);
                return {
                    next_state: {
                        index: 0,
                        value: expression
                    },
                    next_production_rule_index: production_rule_indices[index]
                };
            }
        }
    }

    const message = `Did not expect constant expression with type '${type_reference.data.type}'`;
    onThrowError(message);
    throw Error(message);
}

function choose_production_rule_expression_for_loop_number(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const for_loop_expression = expression.data.value as Core_intermediate_representation.For_loop_expression;

    const get_number_expression = (): Core_intermediate_representation.Expression => {
        switch (top.node.word.value) {
            case "Expression_for_loop_range_begin": {
                return for_loop_expression.range_begin;
            }
            case "Expression_for_loop_range_end": {
                return for_loop_expression.range_end.expression;
            }
            case "Expression_for_loop_step": {
                if (for_loop_expression.step_by !== undefined) {
                    return for_loop_expression.step_by;
                }
            }
            default: {
                const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_for_loop_number(): unhandled '${top.node.word.value}'`;
                onThrowError(message);
                throw Error(message);
            }
        }
    };

    const next_expression = get_number_expression();
    const rhs_to_find = map_expression_type_to_production_rule_label(next_expression);
    const index = production_rule_indices.findIndex(index => production_rules[index].rhs[0] === rhs_to_find);
    return {
        next_state: {
            index: 0,
            value: next_expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_for_loop_step(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const for_loop_expression = expression.data.value as Core_intermediate_representation.For_loop_expression;

    const index = for_loop_expression.step_by !== undefined ? 1 : 0;
    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_for_loop_reverse(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const for_loop_expression = expression.data.value as Core_intermediate_representation.For_loop_expression;

    if (for_loop_expression.range_comparison_operation !== Core_intermediate_representation.Binary_operation.Less_than && for_loop_expression.range_comparison_operation !== Core_intermediate_representation.Binary_operation.Greater_than) {
        const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_for_loop_reverse(): expecting only 'Less_than' or 'Greater_than' range_comparison_operation. Got '${for_loop_expression.range_comparison_operation}'.`;
        onThrowError(message);
        throw Error(message);
    }

    const index = for_loop_expression.range_comparison_operation === Core_intermediate_representation.Binary_operation.Less_than ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_if_else(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const if_expression = expression.data.value as Core_intermediate_representation.If_expression;
    const serie_index = Parse_tree_convertor.get_if_serie_index(stack) + 1;

    const is_empty = serie_index >= if_expression.series.length;
    const is_else_if = !is_empty && if_expression.series[serie_index].condition !== undefined;

    const index =
        is_empty ? 0 :
            is_else_if ? 1 : 2;

    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_instantiate_expression_type(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const instantiate_expression = expression.data.value as Core_intermediate_representation.Instantiate_expression;

    const index =
        instantiate_expression.type === Core_intermediate_representation.Instantiate_expression_type.Default ?
            0 :
            1;

    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_return(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const return_expression = expression.data.value as Core_intermediate_representation.Return_expression;
    const is_void_return = false;
    const index = is_void_return ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_switch_case(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const switch_expression = expression.data.value as Core_intermediate_representation.Switch_expression;
    const switch_case_index = top.current_child_index;
    const switch_case = switch_expression.cases[switch_case_index];
    const index = switch_case.case_value !== undefined ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: switch_case
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_switch_case_value(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const switch_case = top.state.value as Core_intermediate_representation.Switch_case_expression_pair;

    if (switch_case.case_value === undefined) {
        const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_switch_case_value(): unexpected undefined value!`;
        onThrowError(message);
        throw Error(message);
    }

    const rhs_to_find = map_expression_type_to_production_rule_label(switch_case.case_value);
    const index = production_rule_indices.findIndex(index => production_rules[index].rhs[0] === rhs_to_find);
    return {
        next_state: {
            index: 0,
            value: switch_case.case_value
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_unary(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const unary_expression = expression.data.value as Core_intermediate_representation.Unary_expression;
    const is_post_operator = unary_expression.operation === Core_intermediate_representation.Unary_operation.Post_increment || unary_expression.operation === Core_intermediate_representation.Unary_operation.Post_decrement;
    const index = is_post_operator ? 1 : 0;
    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_unary_0_symbol(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const unary_expression = expression.data.value as Core_intermediate_representation.Unary_expression;

    const get_rhs_label = (): string => {
        switch (unary_expression.operation) {
            case Core_intermediate_representation.Unary_operation.Post_increment: return "++";
            case Core_intermediate_representation.Unary_operation.Post_decrement: return "--";
            default: {
                const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_unary_0_symbol() did not expect '${unary_expression.operation}'`;
                onThrowError(message);
                throw Error(message);
            }
        }
    };

    const rhs_label = get_rhs_label();
    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));

    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

export function unary_operation_to_string(operation: Core_intermediate_representation.Unary_operation): string {
    switch (operation) {
        case Core_intermediate_representation.Unary_operation.Not: return "!";
        case Core_intermediate_representation.Unary_operation.Bitwise_not: return "~";
        case Core_intermediate_representation.Unary_operation.Minus: return "-";
        case Core_intermediate_representation.Unary_operation.Pre_increment: return "++";
        case Core_intermediate_representation.Unary_operation.Pre_decrement: return "--";
        case Core_intermediate_representation.Unary_operation.Indirection: return "*";
        case Core_intermediate_representation.Unary_operation.Address_of: return "&";
        default: {
            const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_unary_1_symbol() did not expect '${operation}'`;
            onThrowError(message);
            throw Error(message);
        }
    }
};

function choose_production_rule_expression_unary_1_symbol(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const unary_expression = expression.data.value as Core_intermediate_representation.Unary_expression;

    const rhs_label = unary_operation_to_string(unary_expression.operation);
    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));

    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_variable_mutability(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const variable_declaration_expression = expression.data.value as Core_intermediate_representation.Variable_declaration_expression;
    const index = !variable_declaration_expression.is_mutable ? 0 : 1;
    return {
        next_state: {
            index: 0,
            value: expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function get_generic_expression(
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    expression: Core_intermediate_representation.Expression
): { expression: Core_intermediate_representation.Expression, label: string } {

    const top = stack[stack.length - 1];
    const node = top.node;
    const current_child_index = top.current_child_index;

    switch (expression.data.type) {
        case Core_intermediate_representation.Expression_enum.Access_expression: {
            const access_expression = expression.data.value as Core_intermediate_representation.Access_expression;
            const next_expression = access_expression.expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Access_array_expression: {
            const access_array_expression = expression.data.value as Core_intermediate_representation.Access_array_expression;
            const next_expression = current_child_index === 0 ? access_array_expression.expression : access_array_expression.index;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Assignment_expression: {
            const assignment_expression = expression.data.value as Core_intermediate_representation.Assignment_expression;
            const next_expression = current_child_index === 0 ? assignment_expression.left_hand_side : assignment_expression.right_hand_side;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Binary_expression: {
            const binary_expression = expression.data.value as Core_intermediate_representation.Binary_expression;
            const next_expression = current_child_index === 0 ? binary_expression.left_hand_side : binary_expression.right_hand_side;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Block_expression: {
            const block_expression = expression.data.value as Core_intermediate_representation.Block_expression;
            const statement = block_expression.statements[current_child_index - 1];
            const next_expression = statement.expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Call_expression: {
            const call_expression = expression.data.value as Core_intermediate_representation.Call_expression;
            if (node.word.value === "Expression_call_arguments") {
                const argument_index = current_child_index / 2;
                const next_expression = call_expression.arguments[argument_index];
                return {
                    expression: next_expression,
                    label: map_expression_type_to_production_rule_label(next_expression)
                };
            }
            else {
                const next_expression = call_expression.expression;
                return {
                    expression: next_expression,
                    label: map_expression_type_to_production_rule_label(next_expression)
                };
            }
        }
        case Core_intermediate_representation.Expression_enum.Cast_expression: {
            const cast_expression = expression.data.value as Core_intermediate_representation.Cast_expression;
            const next_expression = cast_expression.source;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Constant_array_expression: {
            const constant_array_expression = expression.data.value as Core_intermediate_representation.Constant_array_expression;
            const argument_index = current_child_index / 2;
            const next_expression = constant_array_expression.array_data[argument_index].expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression),
            };
        }
        case Core_intermediate_representation.Expression_enum.Defer_expression: {
            const defer_expression = expression.data.value as Core_intermediate_representation.Defer_expression;
            const next_expression = defer_expression.expression_to_defer;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.If_expression: {
            const if_expression = expression.data.value as Core_intermediate_representation.If_expression;

            const serie_index = Parse_tree_convertor.get_if_serie_index(stack);
            const serie = if_expression.series[serie_index];

            const statement = serie.condition as Core_intermediate_representation.Statement;
            const next_expression = statement.expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Instantiate_expression: {
            const instantiate_expression = expression.data.value as Core_intermediate_representation.Instantiate_expression;

            const array_state = stack[stack.length - 2];
            const member_index = Parse_tree_convertor.calculate_array_index(production_rules[array_state.production_rule_index], array_state.current_child_index - 1);
            const member = instantiate_expression.members[member_index];

            const next_expression = member.value.expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Parenthesis_expression: {
            const parenthesis_expression = expression.data.value as Core_intermediate_representation.Parenthesis_expression;
            const next_expression = parenthesis_expression.expression;
            return {
                expression: parenthesis_expression.expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Return_expression: {
            const return_expression = expression.data.value as Core_intermediate_representation.Return_expression;
            const next_expression = return_expression.expression;
            if (next_expression !== undefined) {
                return {
                    expression: next_expression,
                    label: map_expression_type_to_production_rule_label(next_expression)
                };
            }
            break;
        }
        case Core_intermediate_representation.Expression_enum.Switch_expression: {
            const switch_expression = expression.data.value as Core_intermediate_representation.Switch_expression;
            const next_expression = switch_expression.value;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Ternary_condition_expression: {
            const ternary_condition_expression = expression.data.value as Core_intermediate_representation.Ternary_condition_expression;
            const next_expression =
                top.current_child_index === 0 ?
                    ternary_condition_expression.condition :
                    top.current_child_index === 2 ?
                        ternary_condition_expression.then_statement.expression :
                        ternary_condition_expression.else_statement.expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Unary_expression: {
            const unary_expression = expression.data.value as Core_intermediate_representation.Unary_expression;
            const next_expression = unary_expression.expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Variable_declaration_expression: {
            const variable_declaration_expression = expression.data.value as Core_intermediate_representation.Variable_declaration_expression;
            const next_expression = variable_declaration_expression.right_hand_side;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.Variable_declaration_with_type_expression: {
            const variable_declaration_with_type_expression = expression.data.value as Core_intermediate_representation.Variable_declaration_with_type_expression;
            const next_expression = variable_declaration_with_type_expression.right_hand_side.expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
        case Core_intermediate_representation.Expression_enum.While_loop_expression: {
            const while_loop_expression = expression.data.value as Core_intermediate_representation.While_loop_expression;
            const next_expression = while_loop_expression.condition.expression;
            return {
                expression: next_expression,
                label: map_expression_type_to_production_rule_label(next_expression)
            };
        }
    }

    const message = `Parse_tree_convertor_mappings.get_generic_expression(): expression type not handled: '${expression.data.type}'`;
    onThrowError(message);
    throw message;
}

function choose_production_rule_generic_expression(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    if (top.node.word.value.startsWith("Expression_level_") || top.node.word.value.startsWith("Generic_expression")) {
        const expression = top.state.value as Core_intermediate_representation.Expression;
        const expression_label = map_expression_type_to_production_rule_label(expression);
        const next_production_rule_index = production_rule_indices.find(index => production_rules[index].rhs[0] === expression_label);

        if (label === "Expression_level_0" && next_production_rule_index === undefined) {
            const message = `Parse_tree_convertor_mappings.choose_production_rule_generic_expression(): Could not find expression production rule '${expression_label}'!`;
            onThrowError(message);
            throw Error(message);
        }

        return {
            next_state: {
                index: 0,
                value: expression
            },
            next_production_rule_index: next_production_rule_index !== undefined ? next_production_rule_index : production_rule_indices[production_rule_indices.length - 1]
        };
    }
    else if (top.node.word.value === "Enum_value") {
        const enum_values_state = stack[stack.length - 2];
        const enum_value_index = enum_values_state.current_child_index - 1;
        const enum_values = enum_values_state.state.value as Core_intermediate_representation.Enum_value[];
        const enum_value = enum_values[enum_value_index];
        const enum_value_statement = enum_value.value as Core_intermediate_representation.Statement;
        const expression = enum_value_statement.expression;

        const expression_label = map_expression_type_to_production_rule_label(expression);

        const next_production_rule_index = production_rule_indices.find(index => production_rules[index].rhs[0] === expression_label);
        return {
            next_state: {
                index: 0,
                value: expression
            },
            next_production_rule_index: next_production_rule_index !== undefined ? next_production_rule_index : production_rule_indices[production_rule_indices.length - 1]
        };
    }
    else if (top.node.word.value === "Struct_member") {
        const struct_state = stack[stack.length - 3];
        const struct_declaration = struct_state.state.value.value as Core_intermediate_representation.Struct_declaration;

        const struct_members_state = stack[stack.length - 2];
        const struct_member_index = struct_members_state.current_child_index - 1;

        const default_value = struct_declaration.member_default_values[struct_member_index];
        const expression = default_value.expression;

        const expression_label = map_expression_type_to_production_rule_label(expression);

        const next_production_rule_index = production_rule_indices.find(index => production_rules[index].rhs[0] === expression_label);
        return {
            next_state: {
                index: 0,
                value: expression
            },
            next_production_rule_index: next_production_rule_index !== undefined ? next_production_rule_index : production_rule_indices[production_rule_indices.length - 1]
        };
    }
    else if (top.node.word.value === "Global_variable") {
        const global_variable_state = stack[stack.length - 1];
        const global_variable_declaration = global_variable_state.state.value.value as Core_intermediate_representation.Global_variable_declaration;

        const expression = global_variable_declaration.initial_value.expression;
        const expression_label = map_expression_type_to_production_rule_label(expression);

        const next_production_rule_index = production_rule_indices.find(index => production_rules[index].rhs[0] === expression_label);
        return {
            next_state: {
                index: 0,
                value: expression
            },
            next_production_rule_index: next_production_rule_index !== undefined ? next_production_rule_index : production_rule_indices[production_rule_indices.length - 1]
        };
    }
    else if (top.node.word.value === "Function_precondition" || top.node.word.value === "Function_postcondition") {
        const vector_state = stack[stack.length - 2];
        const conditions = vector_state.state.value as Core_intermediate_representation.Function_condition[];
        const condition_index = vector_state.current_child_index - 1;
        const condition = conditions[condition_index];

        const expression_label = map_expression_type_to_production_rule_label(condition.condition.expression);

        const next_production_rule_index = production_rule_indices.find(index => production_rules[index].rhs[0] === expression_label);
        return {
            next_state: {
                index: 0,
                value: condition.condition.expression
            },
            next_production_rule_index: next_production_rule_index !== undefined ? next_production_rule_index : production_rule_indices[production_rule_indices.length - 1]
        };
    }
    else {
        const expression = top.state.value as Core_intermediate_representation.Expression;
        const next = get_generic_expression(stack, production_rules, expression);

        const next_production_rule_index = production_rule_indices.find(index => production_rules[index].rhs[0] === next.label);

        return {
            next_state: {
                index: 0,
                value: next.expression
            },
            next_production_rule_index: next_production_rule_index !== undefined ? next_production_rule_index : production_rule_indices[production_rule_indices.length - 1]
        };
    }
}

function map_expression_type_to_production_rule_label(expression: Core_intermediate_representation.Expression): string {
    switch (expression.data.type) {
        case Core_intermediate_representation.Expression_enum.Access_expression:
            return "Expression_access";
        case Core_intermediate_representation.Expression_enum.Access_array_expression:
            return "Expression_access_array";
        case Core_intermediate_representation.Expression_enum.Assignment_expression:
            return "Expression_assignment";
        case Core_intermediate_representation.Expression_enum.Binary_expression: {
            const binary_expression = expression.data.value as Core_intermediate_representation.Binary_expression;
            switch (binary_expression.operation) {
                case Core_intermediate_representation.Binary_operation.Add:
                case Core_intermediate_representation.Binary_operation.Subtract:
                    return "Expression_binary_addition";
                case Core_intermediate_representation.Binary_operation.Multiply:
                case Core_intermediate_representation.Binary_operation.Divide:
                case Core_intermediate_representation.Binary_operation.Modulus:
                    return "Expression_binary_multiplication";
                case Core_intermediate_representation.Binary_operation.Equal:
                case Core_intermediate_representation.Binary_operation.Not_equal:
                    return "Expression_binary_relational_equal";
                case Core_intermediate_representation.Binary_operation.Less_than:
                case Core_intermediate_representation.Binary_operation.Less_than_or_equal_to:
                case Core_intermediate_representation.Binary_operation.Greater_than:
                case Core_intermediate_representation.Binary_operation.Greater_than_or_equal_to:
                    return "Expression_binary_relational";
                case Core_intermediate_representation.Binary_operation.Logical_and:
                    return "Expression_binary_logical_and";
                case Core_intermediate_representation.Binary_operation.Logical_or:
                    return "Expression_binary_logical_or";
                case Core_intermediate_representation.Binary_operation.Bitwise_and:
                case Core_intermediate_representation.Binary_operation.Has:
                    return "Expression_binary_bitwise_and";
                case Core_intermediate_representation.Binary_operation.Bitwise_or:
                    return "Expression_binary_bitwise_or";
                case Core_intermediate_representation.Binary_operation.Bitwise_xor:
                    return "Expression_binary_bitwise_xor";
                case Core_intermediate_representation.Binary_operation.Bit_shift_left:
                case Core_intermediate_representation.Binary_operation.Bit_shift_right:
                    return "Expression_binary_bitwise_shift";
            }
        }
        case Core_intermediate_representation.Expression_enum.Block_expression:
            return "Expression_block";
        case Core_intermediate_representation.Expression_enum.Break_expression:
            return "Expression_break";
        case Core_intermediate_representation.Expression_enum.Call_expression:
            return "Expression_call";
        case Core_intermediate_representation.Expression_enum.Cast_expression:
            return "Expression_cast";
        case Core_intermediate_representation.Expression_enum.Comment_expression:
            return "Expression_comment";
        case Core_intermediate_representation.Expression_enum.Constant_expression:
            return "Expression_constant";
        case Core_intermediate_representation.Expression_enum.Constant_array_expression:
            return "Expression_create_array";
        case Core_intermediate_representation.Expression_enum.Continue_expression:
            return "Expression_continue";
        case Core_intermediate_representation.Expression_enum.Defer_expression:
            return "Expression_defer";
        case Core_intermediate_representation.Expression_enum.For_loop_expression:
            return "Expression_for_loop";
        case Core_intermediate_representation.Expression_enum.If_expression:
            return "Expression_if";
        case Core_intermediate_representation.Expression_enum.Instantiate_expression:
            return "Expression_instantiate";
        case Core_intermediate_representation.Expression_enum.Invalid_expression:
            return "Expression_invalid";
        case Core_intermediate_representation.Expression_enum.Null_pointer_expression:
            return "Expression_null_pointer";
        case Core_intermediate_representation.Expression_enum.Parenthesis_expression:
            return "Expression_parenthesis";
        case Core_intermediate_representation.Expression_enum.Return_expression:
            return "Expression_return";
        case Core_intermediate_representation.Expression_enum.Switch_expression:
            return "Expression_switch";
        case Core_intermediate_representation.Expression_enum.Ternary_condition_expression:
            return "Expression_ternary_condition";
        case Core_intermediate_representation.Expression_enum.Unary_expression: {
            const unary_expression = expression.data.value as Core_intermediate_representation.Unary_expression;
            switch (unary_expression.operation) {
                case Core_intermediate_representation.Unary_operation.Post_increment:
                case Core_intermediate_representation.Unary_operation.Post_decrement:
                    return "Expression_unary_0";
                default:
                    return "Expression_unary_1";
            }
        }
        case Core_intermediate_representation.Expression_enum.Variable_expression:
            return "Expression_variable";
        case Core_intermediate_representation.Expression_enum.Variable_declaration_expression:
            return "Expression_variable_declaration";
        case Core_intermediate_representation.Expression_enum.Variable_declaration_with_type_expression:
            return "Expression_variable_declaration_with_type";
        case Core_intermediate_representation.Expression_enum.While_loop_expression:
            return "Expression_while_loop";
    }
}

function contains(array: any[], value: any): boolean {
    const index = array.findIndex(current => current === value);
    return index !== -1;
}

function create_module_changes_module_name(
    data: Parse_tree_convertor.Create_module_changes_handler_data
): Module_change.Position_change_pair[] {
    const module_name = Parser_node.join_all_child_node_values(data.node);
    if (data.module.name !== module_name) {
        return [{ position: [], change: Module_change.create_update("name", module_name) }];
    }
    return [];
}

function create_module_changes_import(
    data: Parse_tree_convertor.Create_module_changes_handler_data
): Module_change.Position_change_pair[] {
    const new_import = node_to_import_module_with_alias(data.node);

    const new_change = create_new_module_change(
        new_import,
        "Import_name",
        "imports",
        (name: string) => data.module.imports.findIndex(value => value.module_name === name),
        data.node_position[data.node_position.length - 1],
        data.node,
        data.modify_change
    );

    return [new_change];
}

function create_module_changes_declaration(
    root: Parser_node.Node,
    data: Parse_tree_convertor.Create_module_changes_handler_data
): Module_change.Position_change_pair[] {
    const new_declaration = node_to_declaration(root, data.node);

    const node = data.node.children[data.node.children.length - 1];
    const modify_index = data.node_position[data.node_position.length - 1];

    const new_change = create_new_module_change(
        new_declaration,
        `${node.word.value}_name`,
        "declarations",
        (name: string) => data.module.declarations.findIndex(value => value.name === name),
        modify_index,
        node,
        data.modify_change
    );

    return [new_change];
}

export function node_to_declaration(
    root: Parser_node.Node,
    node: Parser_node.Node
): Core_intermediate_representation.Declaration {

    const underlying_declaration_node = node.children[node.children.length - 1];

    const is_export = is_export_declaration(node);

    switch (underlying_declaration_node.word.value) {
        case "Alias": {
            const value = node_to_alias_type_declaration(root, node);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Alias,
                is_export: is_export,
                value: value,
            };
        }
        case "Enum": {
            const value = node_to_enum_declaration(root, node);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Enum,
                is_export: is_export,
                value: value,
            };
        }
        case "Function": {
            const linkage = is_export_declaration(node) ? Core_intermediate_representation.Linkage.External : Core_intermediate_representation.Linkage.Private;
            const comments_node = get_comments_node(node);

            const function_node = node.children[node.children.length - 1];

            const declaration_node = function_node.children[0];
            const declaration = node_to_function_declaration(root, declaration_node, linkage, comments_node);

            const definition_node = function_node.children[1];
            const definition = node_to_function_definition(root, definition_node, declaration.name);

            const value: Core_intermediate_representation.Function = {
                declaration: declaration,
                definition: definition
            };
            return {
                name: declaration.name,
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: is_export,
                value: value,
            };
        }
        case "Function_constructor": {
            const value = node_to_function_constructor_declaration(root, node);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Function_constructor,
                is_export: is_export,
                value: value,
            };
        }
        case "Global_variable": {
            const declaration = node_to_global_variable_declaration(root, node);
            return {
                name: declaration.name,
                type: Core_intermediate_representation.Declaration_type.Global_variable,
                is_export: is_export,
                value: declaration,
            };
        }
        case "Struct": {
            const value = node_to_struct_declaration(root, node);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Struct,
                is_export: is_export,
                value: value,
            };
        }
        case "Type_constructor": {
            const value = node_to_type_constructor_declaration(root, node);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Type_constructor,
                is_export: is_export,
                value: value,
            };
        }
        case "Union": {
            const value = node_to_union_declaration(root, node);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Union,
                is_export: is_export,
                value: value,
            };
        }
        default: {
            const message = "Parse_tree_convertor.node_to_declaration(): failed to handle node";
            onThrowError(message);
            throw message;
        }
    }
}

function create_new_module_change(
    new_value: any,
    name_node_id: string,
    array_name: string,
    find_index: (name: string) => number,
    modify_index: number,
    node: Parser_node.Node,
    is_modify_change: boolean
): { position: any[], change: Module_change.Change } {
    if (is_modify_change) {
        const index = modify_index;
        const change = index === -1 ? Module_change.create_add_element_to_vector(array_name, index, new_value) : Module_change.create_set_element_of_vector(array_name, index, new_value);
        return { position: [], change: change };
    }
    else {
        const name_node = find_descendant_if(node, node => node.word.value === name_node_id) as Parser_node.Node;
        const name = Parser_node.join_all_child_node_values(name_node);

        const index = find_index(name);

        if (index === -1) {
            const index = modify_index;
            return { position: [], change: Module_change.create_add_element_to_vector(array_name, index, new_value) };
        }
        else {
            return { position: [], change: Module_change.create_set_element_of_vector(array_name, index, new_value) };
        }
    }
}

function import_alias_to_module_name(
    root: Parser_node.Node,
    import_alias_name_to_find: string
): string {

    const module_head = Parser_node.get_child_if({ node: root, position: [] }, child => child.word.value === "Module_head");
    const imports = Parser_node.get_children_if(module_head, child => child.word.value === "Import");

    for (const import_declaration of imports) {
        const import_alias_name = Parser_node.get_child_if(import_declaration, child => child.word.value === "Import_alias");
        if (import_alias_name !== undefined) {
            const import_alias_name_value = import_alias_name.node.children[0].word.value;
            if (import_alias_name_value === import_alias_name_to_find) {
                const import_value = node_to_import_module_with_alias(import_declaration.node);
                return import_value.module_name;
            }
        }
    }

    return undefined;
}

function get_module_name_from_tree(
    root: Parser_node.Node
): string {

    const module_name = Parser_node.find_descendant_position_if({ node: root, position: [] }, child => child.word.value === "Module_name");
    if (module_name === undefined) {
        return "<undefined>";
    }

    const module_name_value = Parser_node.join_all_child_node_values(module_name.node);
    return module_name_value;
}

export function node_to_type_reference(
    root: Parser_node.Node,
    node: Parser_node.Node
): Core_intermediate_representation.Type_reference[] {

    const child = node.children[0];

    if (child.word.value === "Type_name") {
        const identifier = child.children[0].word.value;

        if (identifier === "Type") {
            return [Type_utilities.create_builtin_type_reference("Type")];
        }

        const module_name = get_module_name_from_tree(root);
        return Type_utilities.parse_type_name(identifier, module_name);
    }
    else if (child.word.value === "Module_type") {
        const module_alias_name = find_node_value(child, "Module_type_module_name");
        const module_name = import_alias_to_module_name(root, module_alias_name);
        const type_name = find_node_value(child, "Module_type_type_name");
        const custom_type_reference: Core_intermediate_representation.Custom_type_reference = {
            module_reference: {
                name: module_name
            },
            name: type_name
        };
        return [
            {
                data: {
                    type: Core_intermediate_representation.Type_reference_enum.Custom_type_reference,
                    value: custom_type_reference
                }
            }
        ];
    }
    else if (child.word.value === "Pointer_type") {
        const type_node = find_node(child, "Type") as Parser_node.Node;
        const element_type = node_to_type_reference(root, type_node);
        const mutable_node = child.children.find(node => node.word.value === "mutable");
        const pointer_type: Core_intermediate_representation.Pointer_type = {
            element_type: element_type,
            is_mutable: mutable_node !== undefined
        };
        return [
            {
                data: {
                    type: Core_intermediate_representation.Type_reference_enum.Pointer_type,
                    value: pointer_type
                }
            }
        ];
    }
    else if (child.word.value === "Constant_array_type") {
        const type_node = find_node(child, "Type") as Parser_node.Node;
        const element_type = node_to_type_reference(root, type_node);
        const length_node = find_node_value(child, "Constant_array_length");
        const constant_array_type: Core_intermediate_representation.Constant_array_type = {
            value_type: element_type,
            size: Number(length_node)
        };
        return [
            {
                data: {
                    type: Core_intermediate_representation.Type_reference_enum.Constant_array_type,
                    value: constant_array_type
                }
            }
        ];
    }
    else if (child.word.value === "Function_pointer_type") {

        const input_parameter_nodes = find_nodes_inside_parent(child, "Function_pointer_type_input_parameters", "Function_parameter");
        const is_variadic = input_parameter_nodes.length > 0 && input_parameter_nodes[input_parameter_nodes.length - 1].children[0].word.value === "...";
        if (is_variadic) {
            input_parameter_nodes.splice(input_parameter_nodes.length - 1, 1);
        }

        const input_parameter_names = input_parameter_nodes.map(node => find_node_value(node, "Function_parameter_name"));
        const input_parameter_types = input_parameter_nodes.map(node => find_node(node, "Function_parameter_type") as Parser_node.Node).map(node => node_to_type_reference(root, node.children[0])[0]);

        const output_parameter_nodes = find_nodes_inside_parent(child, "Function_pointer_type_output_parameters", "Function_parameter");
        const output_parameter_names = output_parameter_nodes.map(node => find_node_value(node, "Function_parameter_name"));
        const output_parameter_types = output_parameter_nodes.map(node => find_node(node, "Function_parameter_type") as Parser_node.Node).map(node => node_to_type_reference(root, node.children[0])[0]);

        const function_pointer_type: Core_intermediate_representation.Function_pointer_type = {
            type: {
                input_parameter_types: input_parameter_types,
                output_parameter_types: output_parameter_types,
                is_variadic: is_variadic,
            },
            input_parameter_names: input_parameter_names,
            output_parameter_names: output_parameter_names,
        };

        return [
            {
                data: {
                    type: Core_intermediate_representation.Type_reference_enum.Function_pointer_type,
                    value: function_pointer_type
                }
            }
        ];
    }
    else if (child.word.value === "Type_instance_type") {
        const left_hand_side_node = find_node(child, "Type") as Parser_node.Node;
        const left_hand_side = node_to_type_reference(root, left_hand_side_node);
        if (left_hand_side.length > 0) {
            if (left_hand_side[0].data.type === Core_intermediate_representation.Type_reference_enum.Custom_type_reference) {
                const custom_type_reference = left_hand_side[0].data.value as Core_intermediate_representation.Custom_type_reference;

                const expression_nodes = find_nodes_inside_parent(child, "Type_instance_type_parameters", "Expression_instance_call_parameter");
                const expressions = expression_nodes.map(parameter => node_to_expression(root, parameter.children[0]));
                const statements: Core_intermediate_representation.Statement[] = expressions.map(expression => { return { expression: expression }; });

                const type_instance: Core_intermediate_representation.Type_instance = {
                    type_constructor: custom_type_reference,
                    arguments: statements
                };

                return [
                    {
                        data: {
                            type: Core_intermediate_representation.Type_reference_enum.Type_instance,
                            value: type_instance
                        }
                    }
                ];
            }
        }
    }

    const message = `Parse_tree_convertor_mapping.node_to_type_reference(): unhandled node '${child.word.value}'`;
    onThrowError(message);
    throw Error(message);
}

function node_to_alias_type_declaration(
    root: Parser_node.Node,
    node: Parser_node.Node
): Core_intermediate_representation.Alias_type_declaration {

    const comments_node = get_comments_node(node);
    const alias_node = node.children[node.children.length - 1];

    const name = find_node_value(alias_node, "Alias_name");

    const alias_type_node = find_node(alias_node, "Alias_type") as Parser_node.Node;
    const type_reference = node_to_type_reference(root, alias_type_node.children[0]);

    const output: Core_intermediate_representation.Alias_type_declaration = {
        name: name,
        type: type_reference
    };

    const comments = extract_comments_from_node(comments_node);
    if (comments !== undefined) {
        output.comment = comments;
    }

    if (alias_node.source_range !== undefined) {
        const name_node = find_node(alias_node, "Alias_name") as Parser_node.Node;
        output.source_location = name_node.source_range.start;
    }

    return output;
}

function node_to_enum_declaration(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Enum_declaration {

    const comments_node = get_comments_node(node);
    const enum_node = node.children[node.children.length - 1];

    const name = find_node_value(enum_node, "Enum_name");

    const value_nodes = find_nodes_inside_parent(enum_node, "Enum_values", "Enum_value");

    const values: Core_intermediate_representation.Enum_value[] = [];

    for (let index = 0; index < value_nodes.length; ++index) {
        const value_node = value_nodes[index];

        const value_name_node = find_node(value_node, "Enum_value_name") as Parser_node.Node;
        const value_name = value_name_node.children[0].word.value;
        const generic_expression_node = find_node(value_node, "Generic_expression");
        const expression = generic_expression_node !== undefined ? node_to_expression(root, generic_expression_node) : undefined;

        const enum_value: Core_intermediate_representation.Enum_value = {
            name: value_name,
            value: expression !== undefined ? { expression: expression } : undefined
        };

        const enum_value_comments = extract_comments_from_node(get_comments_node(value_node));
        if (enum_value_comments !== undefined) {
            enum_value.comment = enum_value_comments;
        }

        if (value_name_node.source_range !== undefined) {
            enum_value.source_location = value_name_node.source_range.start;
        }

        values.push(enum_value);
    }

    const output: Core_intermediate_representation.Enum_declaration = {
        name: name,
        values: values
    };

    const comments = extract_comments_from_node(comments_node);
    if (comments !== undefined) {
        output.comment = comments;
    }

    if (enum_node.source_range !== undefined) {
        const name_node = find_node(enum_node, "Enum_name") as Parser_node.Node;
        output.source_location = name_node.source_range.start;
    }

    return output;
}

export function node_to_global_variable_declaration(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Global_variable_declaration {

    const comments_node = get_comments_node(node);
    const global_variable_node = node.children[node.children.length - 1];

    const name = find_node_value(global_variable_node, "Global_variable_name");

    const mutable_node_value = find_node_value(node, "Global_variable_mutability");
    const is_mutable = mutable_node_value !== "var";

    const variable_type_node = find_node(global_variable_node, "Type") as Parser_node.Node;
    const variable_type = variable_type_node !== undefined && variable_type_node.children.length > 0 ? node_to_type_reference(root, variable_type_node) : undefined;

    const variable_value_node = find_node(global_variable_node, "Generic_expression_or_instantiate") as Parser_node.Node;
    const variable_value_expression = node_to_expression(root, variable_value_node);

    const output: Core_intermediate_representation.Global_variable_declaration = {
        name: name,
        initial_value: { expression: variable_value_expression },
        is_mutable: is_mutable,
    };

    if (variable_type !== undefined) {
        output.type = variable_type[0];
    }

    const comments = extract_comments_from_node(comments_node);
    if (comments !== undefined) {
        output.comment = comments;
    }

    if (global_variable_node.source_range !== undefined) {
        const name_node = find_node(global_variable_node, "Global_variable_name") as Parser_node.Node;
        output.source_location = name_node.source_range.start;
    }

    return output;
}

function node_to_struct_declaration(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Struct_declaration {

    const comments_node = get_comments_node(node);
    const struct_node = node.children[node.children.length - 1];

    const name = find_node_value(struct_node, "Struct_name");
    const source_location = struct_node.source_range !== undefined ? struct_node.source_range.start : { line: 0, column: 0 };

    const member_nodes = find_nodes_inside_parent(struct_node, "Struct_members", "Struct_member");

    const member_names: string[] = [];
    const member_types: Core_intermediate_representation.Type_reference[] = [];
    const member_default_values: Core_intermediate_representation.Statement[] = [];
    const member_comments: Core_intermediate_representation.Indexed_comment[] = [];
    const member_source_positions: Core_intermediate_representation.Source_position[] = [];

    for (let index = 0; index < member_nodes.length; ++index) {
        const member_node = member_nodes[index];

        const member_name_node = find_node(member_node, "Struct_member_name") as Parser_node.Node;
        const member_name = get_terminal_value(member_name_node);

        const member_type_node = find_node(member_node, "Struct_member_type") as Parser_node.Node;
        const member_type = node_to_type_reference(root, member_type_node.children[0]);

        const member_default_value_node = find_node(member_node, "Generic_expression_or_instantiate") as Parser_node.Node;
        const member_default_value_expression = node_to_expression(root, member_default_value_node);

        const member_comment = extract_comments_from_node(get_comments_node(member_node));

        member_names.push(member_name);
        member_types.push(member_type[0]);
        member_default_values.push({ expression: member_default_value_expression });
        if (member_comment !== undefined) {
            member_comments.push({ index: index, comment: member_comment });
        }

        member_source_positions.push(member_name_node.source_range !== undefined ? member_name_node.source_range.start : source_location);
    }

    const output: Core_intermediate_representation.Struct_declaration = {
        name: name,
        member_names: member_names,
        member_types: member_types,
        member_default_values: member_default_values,
        is_packed: false,
        is_literal: false,
        member_comments: member_comments
    };

    const comments = extract_comments_from_node(comments_node);
    if (comments !== undefined) {
        output.comment = comments;
    }

    if (struct_node.source_range !== undefined) {
        const name_node = find_node(struct_node, "Struct_name") as Parser_node.Node;
        if (name_node !== undefined) {
            output.source_location = name_node.source_range.start;
        }
        output.member_source_positions = member_source_positions;
    }

    return output;
}

function node_to_type_constructor_declaration(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Type_constructor {
    const type_constructor_node = node.children[node.children.length - 1];

    const name = find_node_value(type_constructor_node, "Type_constructor_name");

    const parameters = find_nodes_inside_parent(type_constructor_node, "Type_constructor_parameters", "Function_parameter");
    const parameter_values: Core_intermediate_representation.Type_constructor_parameter[] = parameters.map(node => {
        const name_value = find_node_value(node, "Function_parameter_name")
        const type = find_node(node, "Function_parameter_type") as Parser_node.Node;
        const type_value = node_to_type_reference(root, type.children[0])[0];
        return {
            name: name_value,
            type: type_value
        };
    });

    const statements = find_nodes_inside_parent(type_constructor_node, "Block", "Statement");
    const statement_values = statements.map(node => node_to_statement(root, node));

    const module_name = get_module_name_from_tree(root);
    const replace_by_parameter_type = (type: Core_intermediate_representation.Type_reference): void => {
        if (type.data.type === Core_intermediate_representation.Type_reference_enum.Custom_type_reference) {
            const value = type.data.value as Core_intermediate_representation.Custom_type_reference;
            if (value.module_reference.name === module_name) {
                const found = parameter_values.find(parameter => parameter.name === value.name);
                if (found !== undefined) {
                    type.data = {
                        type: Core_intermediate_representation.Type_reference_enum.Parameter_type,
                        value: {
                            name: value.name
                        }
                    };
                }
            }
        }
    };
    for (const statement of statement_values) {
        Parse_tree_convertor.visit_types_of_expression(statement.expression, replace_by_parameter_type);
    }

    const output: Core_intermediate_representation.Type_constructor = {
        name: name,
        parameters: parameter_values,
        statements: statement_values
    };

    const comments_node = get_comments_node(node);
    const comments = extract_comments_from_node(comments_node);
    if (comments !== undefined) {
        output.comment = comments;
    }

    if (type_constructor_node.source_range !== undefined) {
        const name_node = find_node(type_constructor_node, "Type_constructor_name") as Parser_node.Node;
        output.source_location = name_node.source_range.start;
    }

    return output;
}

function node_to_union_declaration(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Union_declaration {

    const comments_node = get_comments_node(node);
    const union_node = node.children[node.children.length - 1];

    const name = find_node_value(union_node, "Union_name");
    const source_location = union_node.source_range !== undefined ? union_node.source_range.start : { line: 0, column: 0 };

    const member_nodes = find_nodes_inside_parent(union_node, "Union_members", "Union_member");

    const member_names: string[] = [];
    const member_types: Core_intermediate_representation.Type_reference[] = [];
    const member_comments: Core_intermediate_representation.Indexed_comment[] = [];
    const member_source_positions: Core_intermediate_representation.Source_position[] = [];

    for (let index = 0; index < member_nodes.length; ++index) {
        const member_node = member_nodes[index];

        const member_name_node = find_node(member_node, "Union_member_name") as Parser_node.Node;
        const member_name = get_terminal_value(member_name_node);

        const member_type_node = find_node(member_node, "Union_member_type") as Parser_node.Node;
        const member_type = node_to_type_reference(root, member_type_node.children[0]);

        const member_comment = extract_comments_from_node(get_comments_node(member_node));;

        member_names.push(member_name);
        member_types.push(member_type[0]);
        if (member_comment !== undefined) {
            member_comments.push({ index: index, comment: member_comment });
        }

        member_source_positions.push(member_name_node.source_range !== undefined ? member_name_node.source_range.start : source_location);
    }

    const output: Core_intermediate_representation.Union_declaration = {
        name: name,
        member_names: member_names,
        member_types: member_types,
        member_comments: member_comments
    };

    const comments = extract_comments_from_node(comments_node);
    if (comments !== undefined) {
        output.comment = comments;
    }

    if (union_node.source_range !== undefined) {
        const name_node = find_node(union_node, "Union_name") as Parser_node.Node;
        if (name_node !== undefined) {
            output.source_location = name_node.source_range.start;
        }
        output.member_source_positions = member_source_positions;
    }

    return output;
}

export function is_export_declaration(node: Parser_node.Node): boolean {
    return node.children.find(child => child.word.value === "export") != undefined;
}

function get_comments_node(node: Parser_node.Node): Parser_node.Node | undefined {
    return node.children.find(child => child.word.value.startsWith("//"));
}

export function node_to_import_module_with_alias(
    node: Parser_node.Node
): Core_intermediate_representation.Import_module_with_alias {
    const module_name = find_node_value(node, "Import_name");
    const alias = find_node_value(node, "Import_alias");
    return {
        module_name: module_name,
        alias: alias,
        usages: []
    };
}

function find_node_child_index(node: Parser_node.Node, key: string): number {
    return node.children.findIndex(child => child.word.value === key);
}

function node_to_function_condition(root: Parser_node.Node, node: Parser_node.Node, is_precondition: boolean): Core_intermediate_representation.Function_condition {
    const description = find_node_value(node, is_precondition ? "Function_precondition_name" : "Function_postcondition_name");

    const condition_node = find_node(node, "Generic_expression");
    const condition = node_to_expression(root, condition_node);

    return {
        description: description.substring(1, description.length - 1),
        condition: { expression: condition }
    };
}

export function node_to_function_declaration(root: Parser_node.Node, node: Parser_node.Node, linkage: Core_intermediate_representation.Linkage, comments_node: Parser_node.Node | undefined): Core_intermediate_representation.Function_declaration {

    const name = find_node_value(node, "Function_name");
    const source_location = node.source_range !== undefined ? node.source_range.start : { line: 0, column: 0 };

    const input_parameter_nodes = find_nodes_inside_parent(node, "Function_input_parameters", "Function_parameter");
    const is_variadic = input_parameter_nodes.length > 0 && input_parameter_nodes[input_parameter_nodes.length - 1].children[0].word.value === "...";
    if (is_variadic) {
        input_parameter_nodes.splice(input_parameter_nodes.length - 1, 1);
    }

    const input_parameter_names = input_parameter_nodes.map(node => find_node_value(node, "Function_parameter_name"));
    const input_parameter_types = input_parameter_nodes.map(node => find_node(node, "Function_parameter_type") as Parser_node.Node).map(node => node_to_type_reference(root, node.children[0])[0]);
    const input_parameter_source_positions = input_parameter_nodes.map(node => node.source_range !== undefined ? node.source_range.start : source_location);

    const output_parameter_nodes = find_nodes_inside_parent(node, "Function_output_parameters", "Function_parameter");
    const output_parameter_names = output_parameter_nodes.map(node => find_node_value(node, "Function_parameter_name"));
    const output_parameter_types = output_parameter_nodes.map(node => find_node(node, "Function_parameter_type") as Parser_node.Node).map(node => node_to_type_reference(root, node.children[0])[0]);
    const output_parameter_source_positions = output_parameter_nodes.map(node => node.source_range !== undefined ? node.source_range.start : source_location);

    const precondition_nodes = node.children.filter(child => child.word.value === "Function_precondition");
    const preconditions = precondition_nodes.map(node => node_to_function_condition(root, node, true));

    const postcondition_nodes = node.children.filter(child => child.word.value === "Function_postcondition");
    const postconditions = postcondition_nodes.map(node => node_to_function_condition(root, node, false));

    const output: Core_intermediate_representation.Function_declaration = {
        name: name,
        type: {
            input_parameter_types: input_parameter_types,
            output_parameter_types: output_parameter_types,
            is_variadic: is_variadic,
        },
        input_parameter_names: input_parameter_names,
        output_parameter_names: output_parameter_names,
        linkage: linkage,
        preconditions: preconditions,
        postconditions: postconditions,
    };

    const comments = extract_comments_from_node(comments_node);
    if (comments !== undefined) {
        output.comment = comments;
    }

    if (node.source_range !== undefined) {
        const name_node = find_node(node, "Function_name") as Parser_node.Node;
        if (name_node !== undefined) {
            output.source_location = name_node.source_range.start;
        }
        output.input_parameter_source_positions = input_parameter_source_positions;
        output.output_parameter_source_positions = output_parameter_source_positions;
    }

    return output;
}

function node_to_function_definition(root: Parser_node.Node, node: Parser_node.Node, function_name: string): Core_intermediate_representation.Function_definition {

    const output: Core_intermediate_representation.Function_definition = {
        name: function_name,
        statements: []
    };

    const block_node = find_node(node, "Block");
    if (block_node !== undefined) {
        const statement_nodes = block_node.children.slice(1, block_node.children.length - 1);
        const statements = statement_nodes.map(node => node_to_statement(root, node));
        output.statements = statements;
    }

    if (node.source_range !== undefined) {
        output.source_location = (block_node !== undefined && block_node.source_range !== undefined) ? block_node.source_range.start : node.source_range.start;
    }

    return output;
}

function node_to_function_constructor_declaration(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Function_constructor {
    const function_constructor_node = node.children[node.children.length - 1];

    const name = find_node_value(function_constructor_node, "Function_constructor_name");

    const parameters = find_nodes_inside_parent(function_constructor_node, "Function_constructor_parameters", "Function_parameter");
    const parameter_values: Core_intermediate_representation.Type_constructor_parameter[] = parameters.map(node => {
        const name_value = find_node_value(node, "Function_parameter_name")
        const type = find_node(node, "Function_parameter_type") as Parser_node.Node;
        const type_value = node_to_type_reference(root, type.children[0])[0];
        return {
            name: name_value,
            type: type_value
        };
    });

    const statements = find_nodes_inside_parent(function_constructor_node, "Block", "Statement");
    const statement_values = statements.map(node => node_to_statement(root, node));

    const module_name = get_module_name_from_tree(root);
    const replace_by_parameter_type = (type: Core_intermediate_representation.Type_reference): void => {
        if (type.data.type === Core_intermediate_representation.Type_reference_enum.Custom_type_reference) {
            const value = type.data.value as Core_intermediate_representation.Custom_type_reference;
            if (value.module_reference.name === module_name) {
                const found = parameter_values.find(parameter => parameter.name === value.name);
                if (found !== undefined) {
                    type.data = {
                        type: Core_intermediate_representation.Type_reference_enum.Parameter_type,
                        value: {
                            name: value.name
                        }
                    };
                }
            }
        }
    };
    for (const statement of statement_values) {
        Parse_tree_convertor.visit_types_of_expression(statement.expression, replace_by_parameter_type);
    }

    const output: Core_intermediate_representation.Function_constructor = {
        name: name,
        parameters: parameter_values,
        statements: statement_values
    };

    const comments_node = get_comments_node(node);
    const comments = extract_comments_from_node(comments_node);
    if (comments !== undefined) {
        output.comment = comments;
    }

    if (function_constructor_node.source_range !== undefined) {
        const name_node = find_node(function_constructor_node, "Function_constructor_name") as Parser_node.Node;
        output.source_location = name_node.source_range.start;
    }

    return output;
}

export function node_to_statement(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Statement {

    const child = node.children[0];
    const expression = node_to_expression(root, child);

    const output: Core_intermediate_representation.Statement = {
        expression: expression
    };

    return output;
}

export function node_to_expression(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Expression {
    const expression = node_to_expression_without_source_location(root, node);

    if (node.source_range !== undefined) {
        expression.source_position = node.source_range.start;
    }

    return expression;
}

function node_to_expression_without_source_location(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Expression {

    while (node.word.value.startsWith("Expression_level_") || node.word.value.startsWith("Generic_expression")) {
        node = node.children[0];
    }

    switch (node.word.value) {
        case "Expression_access": {
            const expression = node_to_expression_access(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Access_expression,
                    value: expression
                }
            };
        }
        case "Expression_access_array": {
            const expression = node_to_expression_access_array(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Access_array_expression,
                    value: expression
                }
            };
        }
        case "Expression_assignment": {
            const expression = node_to_expression_assignment(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Assignment_expression,
                    value: expression
                }
            };
        }
        case "Expression_binary": {
            const expression = node_to_expression_binary(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Binary_expression,
                    value: expression
                }
            };
        }
        case "Expression_block": {
            const expression = node_to_expression_block(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Block_expression,
                    value: expression
                }
            };
        }
        case "Expression_break":
        case "break": {
            const expression = node_to_expression_break(node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Break_expression,
                    value: expression
                }
            };
        }
        case "Expression_defer": {
            const expression = node_to_expression_defer(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Defer_expression,
                    value: expression
                }
            };
        }
        case "Expression_call": {
            const expression = node_to_expression_call(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Call_expression,
                    value: expression
                }
            };
        }
        case "Expression_cast": {
            const expression = node_to_expression_cast(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Cast_expression,
                    value: expression
                }
            };
        }
        case "Expression_comment": {
            const expression = node_to_expression_comment(node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Comment_expression,
                    value: expression
                }
            };
        }
        case "Expression_constant": {
            const expression = node_to_expression_constant(node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Constant_expression,
                    value: expression
                }
            };
        }
        case "Expression_continue":
        case "continue": {
            const expression = node_to_expression_continue(node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Continue_expression,
                    value: expression
                }
            };
        }
        case "Expression_create_array": {
            const expression = node_to_expression_create_array(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Constant_array_expression,
                    value: expression
                }
            };
        }
        case "Expression_dereference_and_access": {
            const expression = node_to_expression_dereference_and_access(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Dereference_and_access_expression,
                    value: expression
                }
            };
        }
        case "Expression_for_loop": {
            const expression = node_to_expression_for_loop(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.For_loop_expression,
                    value: expression
                }
            };
        }
        case "Expression_function": {
            const expression = node_to_expression_function(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Function_expression,
                    value: expression
                }
            };
        }
        case "Expression_if": {
            const expression = node_to_expression_if(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.If_expression,
                    value: expression
                }
            };
        }
        case "Expression_instance_call": {
            const expression = node_to_expression_instance_call(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Instance_call_expression,
                    value: expression
                }
            };
        }
        case "Expression_instantiate":
        case "Expression_instantiate_with_type": {
            const expression = node_to_expression_instantiate(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Instantiate_expression,
                    value: expression
                }
            };
        }
        case "Expression_null_pointer":
        case "null": {
            const expression = node_to_expression_null_pointer(node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Null_pointer_expression,
                    value: expression
                }
            };
        }
        case "Expression_parenthesis": {
            const expression = node_to_expression_parenthesis(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Parenthesis_expression,
                    value: expression
                }
            };
        }
        case "Expression_return": {
            const expression = node_to_expression_return(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Return_expression,
                    value: expression
                }
            };
        }
        case "Expression_struct": {
            const expression = node_to_expression_struct(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Struct_expression,
                    value: expression
                }
            };
        }
        case "Expression_switch": {
            const expression = node_to_expression_switch(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Switch_expression,
                    value: expression
                }
            };
        }
        case "Expression_ternary_condition": {
            const expression = node_to_expression_ternary_condition(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Ternary_condition_expression,
                    value: expression
                }
            };
        }
        case "Expression_type": {
            const expression = node_to_expression_type(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Type_expression,
                    value: expression
                }
            };
        }
        case "Expression_unary": {
            const expression = node_to_expression_unary(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Unary_expression,
                    value: expression
                }
            };
        }
        case "Expression_variable": {
            const expression = node_to_expression_variable_name(node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_expression,
                    value: expression
                }
            };
        }
        case "Expression_variable_declaration": {
            const expression = node_to_expression_variable_declaration(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
                    value: expression
                }
            };
        }
        case "Expression_variable_declaration_with_type": {
            const expression = node_to_expression_variable_declaration_with_type(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_with_type_expression,
                    value: expression
                }
            };
        }
        case "Expression_while_loop": {
            const expression = node_to_expression_while_loop(root, node);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.While_loop_expression,
                    value: expression
                }
            };
        }
        default: {
            const message = `Parse_tree_convertor_mappings.node_to_expression() did not handle '${node.word.value}'`;
            onThrowError(message);
            throw Error(message);
        }
    }
}

export function node_to_expression_access(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Access_expression {

    const generic_expression_node = node.children[0];
    const variable_expression_node = node.children[2];

    const generic_expression = node_to_expression(root, generic_expression_node);
    const variable_expression = node_to_expression_variable_name(variable_expression_node.children[0]);

    const access_expression: Core_intermediate_representation.Access_expression = {
        expression: generic_expression,
        member_name: variable_expression.name,
        access_type: Core_intermediate_representation.Access_type.Read
    };

    return access_expression;
}

export function node_to_expression_access_array(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Access_array_expression {

    const generic_expression_node = node.children[0];
    const generic_expression = node_to_expression(root, generic_expression_node);

    const index_expression_node = node.children[2];
    const index_expression = node_to_expression(root, index_expression_node);

    const access_array_expression: Core_intermediate_representation.Access_array_expression = {
        expression: generic_expression,
        index: index_expression
    };

    return access_array_expression;
}

function set_expression_access_type(expression: Core_intermediate_representation.Expression, access_type: Core_intermediate_representation.Access_type): void {
    switch (expression.data.type) {
        case Core_intermediate_representation.Expression_enum.Access_expression: {
            const access_expression = expression.data.value as Core_intermediate_representation.Access_expression;
            access_expression.access_type = access_type;
            break;
        }
        case Core_intermediate_representation.Expression_enum.Variable_expression: {
            const variable_expression = expression.data.value as Core_intermediate_representation.Variable_expression;
            variable_expression.access_type = access_type;
            break;
        }
        default: {
            break;
        }
    }
}

function node_to_expression_assignment(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Assignment_expression {

    const generic_expressions = [node.children[0], node.children[2]];

    const left_hand_side_node = generic_expressions[0];
    const left_hand_side_expression = node_to_expression(root, left_hand_side_node);

    const right_hand_side_node = generic_expressions[1];
    const right_hand_side_expression = node_to_expression(root, right_hand_side_node);

    const symbol = find_node_value(node, "Expression_assignment_symbol");
    const additional_operation = map_production_rule_label_to_assignment_binary_operation(symbol);

    const access_type = additional_operation !== undefined ? Core_intermediate_representation.Access_type.Read_write : Core_intermediate_representation.Access_type.Write;
    set_expression_access_type(left_hand_side_expression, access_type);

    const assignment_expression: Core_intermediate_representation.Assignment_expression = {
        left_hand_side: left_hand_side_expression,
        right_hand_side: right_hand_side_expression,
        additional_operation: additional_operation
    };

    return assignment_expression;
}

function map_production_rule_label_to_assignment_binary_operation(label: string): Core_intermediate_representation.Binary_operation | undefined {
    switch (label) {
        case "=": return undefined;
        case "+=": return Core_intermediate_representation.Binary_operation.Add;
        case "-=": return Core_intermediate_representation.Binary_operation.Subtract;
        case "*=": return Core_intermediate_representation.Binary_operation.Multiply;
        case "/=": return Core_intermediate_representation.Binary_operation.Divide;
        case "%=": return Core_intermediate_representation.Binary_operation.Modulus;
        case "&=": return Core_intermediate_representation.Binary_operation.Bitwise_and;
        case "|=": return Core_intermediate_representation.Binary_operation.Bitwise_or;
        case "^=": return Core_intermediate_representation.Binary_operation.Bitwise_xor;
        case "<<=": return Core_intermediate_representation.Binary_operation.Bit_shift_left;
        case ">>=": return Core_intermediate_representation.Binary_operation.Bit_shift_right;
        default: {
            const message = `Unexpected assignment binary expression symbol '${label}'`;
            console.log(message);
            return undefined;
        }
    }
}

function node_to_expression_binary(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Binary_expression {

    const left_hand_side_node = node.children[0];
    const operation_node = node.children[1];
    const right_hand_side_node = node.children[2];

    const left_hand_side_expression = node_to_expression(root, left_hand_side_node);

    const operation = map_production_rule_label_to_binary_operation(operation_node.word.value);

    const right_hand_side_expression = node_to_expression(root, right_hand_side_node);

    const binary_expression: Core_intermediate_representation.Binary_expression = {
        left_hand_side: left_hand_side_expression,
        operation: operation,
        right_hand_side: right_hand_side_expression
    };

    return binary_expression;
}

function map_production_rule_label_to_binary_operation(label: string): Core_intermediate_representation.Binary_operation {
    switch (label) {
        case "+": return Core_intermediate_representation.Binary_operation.Add;
        case "-": return Core_intermediate_representation.Binary_operation.Subtract;
        case "*": return Core_intermediate_representation.Binary_operation.Multiply;
        case "/": return Core_intermediate_representation.Binary_operation.Divide;
        case "%": return Core_intermediate_representation.Binary_operation.Modulus;
        case "==": return Core_intermediate_representation.Binary_operation.Equal;
        case "!=": return Core_intermediate_representation.Binary_operation.Not_equal;
        case "<": return Core_intermediate_representation.Binary_operation.Less_than;
        case "<=": return Core_intermediate_representation.Binary_operation.Less_than_or_equal_to;
        case ">": return Core_intermediate_representation.Binary_operation.Greater_than;
        case ">=": return Core_intermediate_representation.Binary_operation.Greater_than_or_equal_to;
        case "&&": return Core_intermediate_representation.Binary_operation.Logical_and;
        case "||": return Core_intermediate_representation.Binary_operation.Logical_or;
        case "&": return Core_intermediate_representation.Binary_operation.Bitwise_and;
        case "|": return Core_intermediate_representation.Binary_operation.Bitwise_or;
        case "^": return Core_intermediate_representation.Binary_operation.Bitwise_xor;
        case "<<": return Core_intermediate_representation.Binary_operation.Bit_shift_left;
        case ">>": return Core_intermediate_representation.Binary_operation.Bit_shift_right;
        case "has": return Core_intermediate_representation.Binary_operation.Has;
        default: {
            const message = `Unexpected binary expression symbol '${label}'`;
            onThrowError(message);
            throw Error(message);
        }
    }
}

function node_to_expression_block(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Block_expression {

    const statements_node = node.children.slice(1, node.children.length - 1);
    const statements = statements_node.map(node => node_to_statement(root, node));

    const block_expression: Core_intermediate_representation.Block_expression = {
        statements: statements
    };

    return block_expression;
}

function node_to_expression_break(node: Parser_node.Node): Core_intermediate_representation.Break_expression {

    const loop_count = node.children.length > 1 ? Number(node.children[1].children[0].word.value) : 0;

    const break_expression: Core_intermediate_representation.Break_expression = {
        loop_count: loop_count
    };

    return break_expression;
}

function node_to_expression_defer(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Defer_expression {

    const expression_to_defer_node = node.children[1];
    const expression_to_defer = node_to_expression(root, expression_to_defer_node);

    const defer_expression: Core_intermediate_representation.Defer_expression = {
        expression_to_defer: expression_to_defer
    };

    return defer_expression;
}

function node_to_expression_call(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Call_expression {

    const generic_expression_node = node.children[0];
    const generic_expression = node_to_expression(root, generic_expression_node);

    const argument_nodes = find_nodes_inside_parent(node, "Expression_call_arguments", "Generic_expression_or_instantiate");
    const argument_expressions = argument_nodes.map(node => node_to_expression(root, node));

    const call_expression: Core_intermediate_representation.Call_expression = {
        expression: generic_expression,
        arguments: argument_expressions
    };

    return call_expression;
}

function node_to_expression_cast(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Cast_expression {

    const source_node = node.children[0];
    const source_expression = node_to_expression(root, source_node);

    const destination_type_node = find_node(node, "Expression_type");
    const destination_type = node_to_type_reference(root, destination_type_node.children[0]);
    if (destination_type.length === 0) {
        const message = `Cannot cast to 'void' type.`;
        onThrowError(message);
        throw Error(message);
    }

    const cast_expression: Core_intermediate_representation.Cast_expression = {
        source: source_expression,
        destination_type: destination_type[0],
        cast_type: Core_intermediate_representation.Cast_type.Numeric
    };

    return cast_expression;
}

function node_to_expression_comment(node: Parser_node.Node): Core_intermediate_representation.Comment_expression {

    const comments = extract_comments_from_node(node) as string;

    const comment_expression: Core_intermediate_representation.Comment_expression = {
        comment: comments
    };

    return comment_expression;
}

function node_to_expression_constant(node: Parser_node.Node): Core_intermediate_representation.Constant_expression {
    const terminal_node = Parser_node.get_next_terminal_node(node, node, []).node;

    switch (terminal_node.word.type) {
        case Grammar.Word_type.Alphanumeric: {
            if (terminal_node.word.value === "true" || terminal_node.word.value === "false") {
                return {
                    type: {
                        data: {
                            type: Core_intermediate_representation.Type_reference_enum.Fundamental_type,
                            value: Core_intermediate_representation.Fundamental_type.Bool
                        }
                    },
                    data: terminal_node.word.value
                };
            }
        }
        case Grammar.Word_type.Number: {
            const suffix = Scanner.get_suffix(terminal_node.word);
            const value = terminal_node.word.value.substring(0, terminal_node.word.value.length - suffix.length);

            const first_character = suffix.charAt(0);
            const is_integer = suffix.length === 0 || first_character === "i" || first_character === "u";
            if (is_integer) {
                const is_signed = first_character !== "u";
                const number_of_bits = suffix.length !== 0 ? Number(suffix.substring(1, suffix.length)) : 32;
                return {
                    type: {
                        data: {
                            type: Core_intermediate_representation.Type_reference_enum.Integer_type,
                            value: {
                                number_of_bits: number_of_bits,
                                is_signed: is_signed
                            }
                        }
                    },
                    data: value
                };
            }

            const is_float = first_character === "f";
            if (is_float) {
                const number_of_bits = Number(suffix.substring(1, suffix.length));

                const get_fundamental_type = (): Core_intermediate_representation.Fundamental_type => {
                    switch (number_of_bits) {
                        case 16:
                            return Core_intermediate_representation.Fundamental_type.Float16;
                        case 32:
                            return Core_intermediate_representation.Fundamental_type.Float32;
                        case 64:
                            return Core_intermediate_representation.Fundamental_type.Float64;
                        default: {
                            const message = `${suffix} is not supported. Only f16, f32 or f64 are supported!`;
                            onThrowError(message);
                            throw message;
                        }
                    }
                };

                const fundamental_type = get_fundamental_type();
                return {
                    type: {
                        data: {
                            type: Core_intermediate_representation.Type_reference_enum.Fundamental_type,
                            value: fundamental_type
                        }
                    },
                    data: value
                };
            }

            const is_c_type = first_character === "c";
            if (is_c_type) {

                const get_fundamental_type = (): Core_intermediate_representation.Fundamental_type => {
                    switch (suffix) {
                        case "cc":
                            return Core_intermediate_representation.Fundamental_type.C_char;
                        case "cs":
                            return Core_intermediate_representation.Fundamental_type.C_short;
                        case "ci":
                            return Core_intermediate_representation.Fundamental_type.C_int;
                        case "cl":
                            return Core_intermediate_representation.Fundamental_type.C_long;
                        case "cll":
                            return Core_intermediate_representation.Fundamental_type.C_longlong;
                        case "cuc":
                            return Core_intermediate_representation.Fundamental_type.C_uchar;
                        case "cus":
                            return Core_intermediate_representation.Fundamental_type.C_ushort;
                        case "cui":
                            return Core_intermediate_representation.Fundamental_type.C_uint;
                        case "cul":
                            return Core_intermediate_representation.Fundamental_type.C_ulong;
                        case "cull":
                            return Core_intermediate_representation.Fundamental_type.C_ulonglong;
                        case "cb":
                            return Core_intermediate_representation.Fundamental_type.C_bool;
                        default: {
                            const message = `${suffix} is not a C supported type.`;
                            onThrowError(message);
                            throw message;
                        }
                    }
                };

                const fundamental_type = get_fundamental_type();

                return {
                    type: {
                        data: {
                            type: Core_intermediate_representation.Type_reference_enum.Fundamental_type,
                            value: fundamental_type
                        }
                    },
                    data: value
                };
            }

            const message = `Could not convert number '${terminal_node.word.value}' to constant expression`;
            onThrowError(message);
            throw Error(message);
        }
        case Grammar.Word_type.String: {
            const suffix = Scanner.get_suffix(terminal_node.word);
            if (suffix === "c") {
                return {
                    type: {
                        data: {
                            type: Core_intermediate_representation.Type_reference_enum.Pointer_type,
                            value: {
                                element_type: [
                                    {
                                        data: {
                                            type: Core_intermediate_representation.Type_reference_enum.Fundamental_type,
                                            value: Core_intermediate_representation.Fundamental_type.C_char
                                        }
                                    }
                                ],
                                is_mutable: false
                            }
                        }
                    },
                    data: terminal_node.word.value.slice(1, -2)
                };
            }
            else if (suffix.length === 0) {
                return {
                    type: {
                        data: {
                            type: Core_intermediate_representation.Type_reference_enum.Fundamental_type,
                            value: Core_intermediate_representation.Fundamental_type.String
                        }
                    },
                    data: terminal_node.word.value.slice(1, -1)
                };
            }
        }
        default:
            break;
    }

    const message = `Parse_tree_convertor_mappings.node_to_expression_constant(): Constant expression '${terminal_node.word.value}' of type '${terminal_node.word.type}' not handled!`;
    onThrowError(message);
    throw Error(message);
}

function node_to_expression_continue(node: Parser_node.Node): Core_intermediate_representation.Continue_expression {

    const continue_expression: Core_intermediate_representation.Continue_expression = {
    };

    return continue_expression;
}

function node_to_expression_create_array(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Constant_array_expression {

    const expression_nodes = node.children.slice(1, node.children.length - 1).filter(node => node.word.value !== ",");
    const expressions = expression_nodes.map(node => node_to_expression(root, node));
    const statements = expressions.map(expression => { return { expression: expression }; });

    const create_array_expression: Core_intermediate_representation.Constant_array_expression = {
        array_data: statements,
    };

    return create_array_expression;
}

export function node_to_expression_dereference_and_access(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Dereference_and_access_expression {

    const generic_expression_node = node.children[0];
    const identifier_node = node.children[2];

    const generic_expression = node_to_expression(root, generic_expression_node);
    const member_name = get_terminal_value(identifier_node);

    const dereference_access_expression: Core_intermediate_representation.Dereference_and_access_expression = {
        expression: generic_expression,
        member_name: member_name
    };

    return dereference_access_expression;
}

function node_to_expression_for_loop(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.For_loop_expression {

    const head_node = find_node(node, "Expression_for_loop_head") as Parser_node.Node;

    const variable_node = find_node_value(head_node, "Expression_for_loop_variable");

    const range_begin_node = find_node(head_node, "Expression_for_loop_range_begin") as Parser_node.Node;
    const range_begin_number_node = range_begin_node.children[0].children[0];
    const range_begin_expression = node_to_expression(root, range_begin_number_node);

    const range_end_node = find_node(head_node, "Expression_for_loop_range_end") as Parser_node.Node;
    const range_end_number_node = range_end_node.children[0].children[0];
    const range_end_expression = node_to_expression(root, range_end_number_node);

    const step_by_node = find_node(head_node, "Expression_for_loop_step") as Parser_node.Node;
    const step_by_number_node = step_by_node !== undefined && step_by_node.children.length > 0 ? step_by_node.children[1].children[0] : undefined;
    const step_by_expression = step_by_number_node !== undefined ? node_to_expression(root, step_by_number_node) : undefined;

    const reverse_node = find_node(head_node, "reverse");
    const is_reverse = reverse_node !== undefined;

    const statements_node = find_node(node, "Expression_for_loop_statements") as Parser_node.Node;
    const statements = statements_node.children.slice(1, statements_node.children.length - 1).map(node => node_to_statement(root, node));

    const for_loop_expression: Core_intermediate_representation.For_loop_expression = {
        variable_name: variable_node,
        range_begin: range_begin_expression,
        range_end: { expression: range_end_expression },
        range_comparison_operation: is_reverse ? Core_intermediate_representation.Binary_operation.Greater_than : Core_intermediate_representation.Binary_operation.Less_than,
        step_by: step_by_expression,
        then_statements: statements,
    };

    return for_loop_expression;
}

function node_to_expression_function(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Function_expression {
    const linkage = Core_intermediate_representation.Linkage.Private;
    const declaration = node_to_function_declaration(root, node, linkage, undefined);
    const definition = node_to_function_definition(root, node, "");
    return {
        declaration: declaration,
        definition: definition
    };
}

function node_to_expression_if(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.If_expression {

    const series: Core_intermediate_representation.Condition_statement_pair[] = [];

    let current_node = node;
    while (current_node.children.length > 0) {
        const condition_node = current_node.word.value === "Expression_if" ? find_node(current_node, "Generic_expression") as Parser_node.Node : undefined;
        const condition_expression = condition_node !== undefined ? node_to_expression(root, condition_node) : undefined;

        const statements_node = find_node(current_node, "Expression_if_statements") as Parser_node.Node;
        const statements = statements_node.children.slice(1, statements_node.children.length - 1).map(node => node_to_statement(root, node));

        const serie: Core_intermediate_representation.Condition_statement_pair = {
            condition: condition_expression !== undefined ? { expression: condition_expression } : undefined,
            then_statements: statements
        };

        const open_block_node = statements_node.children[0];
        if (open_block_node.source_range !== undefined) {
            serie.block_source_position = open_block_node.source_range.start;
        }

        series.push(serie);

        current_node = find_node(current_node, "Expression_if_else");
        if (current_node === undefined) {
            break;
        }

        current_node = current_node.children[current_node.children.length - 1];
    }

    const if_expression: Core_intermediate_representation.If_expression = {
        series: series
    };

    return if_expression;
}

export function node_to_expression_instance_call(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Instance_call_expression {

    const left_hand_side_node = node.children.find(child => child.word.value === "Generic_expression");
    const left_hand_side = node_to_expression(root, left_hand_side_node);

    const parameter_nodes = node.children.filter(child => child.word.value === "Expression_instance_call_parameter");
    const argument_expressions = parameter_nodes.map(child => node_to_expression(root, child.children[0]));
    const argument_statements = argument_expressions.map(expression => { return { expression: expression }; });

    const instance_call_expression: Core_intermediate_representation.Instance_call_expression = {
        left_hand_side: left_hand_side,
        arguments: argument_statements
    };

    return instance_call_expression;
}

export function node_to_expression_instantiate(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Instantiate_expression {

    const type_node = node.children.find(child => child.word.value === "explicit");
    const type = type_node !== undefined ? Core_intermediate_representation.Instantiate_expression_type.Explicit : Core_intermediate_representation.Instantiate_expression_type.Default;

    const member_nodes = find_nodes_inside_parent(node, "Expression_instantiate_members", "Expression_instantiate_member");
    const members: Core_intermediate_representation.Instantiate_member_value_pair[] = member_nodes.map(
        node => {
            const member_name = find_node_value(node, "Expression_instantiate_member_name");

            const expression_node = find_node(node, "Generic_expression_or_instantiate") as Parser_node.Node;
            const expression = node_to_expression(root, expression_node);

            return {
                member_name: member_name,
                value: { expression: expression }
            };
        }
    );

    const instantiate_expression: Core_intermediate_representation.Instantiate_expression = {
        type: type,
        members: members
    };

    return instantiate_expression;
}

function node_to_expression_null_pointer(node: Parser_node.Node): Core_intermediate_representation.Null_pointer_expression {

    const null_pointer_expression: Core_intermediate_representation.Null_pointer_expression = {
    };

    return null_pointer_expression;
}

function node_to_expression_parenthesis(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Parenthesis_expression {

    const generic_expression_node = find_node(node, "Generic_expression") as Parser_node.Node;
    const generic_expression = node_to_expression(root, generic_expression_node);

    const parenthesis_expression: Core_intermediate_representation.Parenthesis_expression = {
        expression: generic_expression
    };

    return parenthesis_expression;
}

function node_to_expression_return(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Return_expression {

    const generic_expression_node = find_node(node, "Generic_expression_or_instantiate") as Parser_node.Node;
    const generic_expression = generic_expression_node !== undefined ? node_to_expression(root, generic_expression_node) : undefined;

    const return_expression: Core_intermediate_representation.Return_expression = {
        expression: generic_expression
    };

    return return_expression;
}

function node_to_expression_struct(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Struct_expression {
    const declaration = node_to_struct_declaration(root, node);
    return {
        declaration: declaration
    };
}

function node_to_expression_switch_case(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Switch_case_expression_pair {

    const is_default_case = node.children[0].word.value === "default";

    const case_value = !is_default_case ? node_to_expression(root, node.children[1].children[0]) : undefined;

    const statement_nodes = node.children.filter(child => child.word.value === "Statement");
    const statements = statement_nodes.map((statement_node: Parser_node.Node) => node_to_statement(root, statement_node));

    return {
        case_value: case_value,
        statements: statements
    };
}

function node_to_expression_switch(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Switch_expression {

    const value_expression_node = find_node(node, "Generic_expression") as Parser_node.Node;
    const value_expression = node_to_expression(root, value_expression_node);

    const switch_case_nodes = find_nodes_inside_parent(node, "Expression_switch_cases", "Expression_switch_case");
    const switch_cases = switch_case_nodes.map((switch_case_node: Parser_node.Node) => node_to_expression_switch_case(root, switch_case_node));

    const switch_expression: Core_intermediate_representation.Switch_expression = {
        value: value_expression,
        cases: switch_cases
    };

    return switch_expression;
}

function node_to_expression_ternary_condition(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Ternary_condition_expression {

    const condition_node = node.children[0];
    const then_node = node.children[2];
    const else_node = node.children[4];

    const condition_expression = node_to_expression(root, condition_node);
    const then_expression = node_to_expression(root, then_node);
    const else_expression = node_to_expression(root, else_node);

    const ternary_condition_expression: Core_intermediate_representation.Ternary_condition_expression = {
        condition: condition_expression,
        then_statement: { expression: then_expression },
        else_statement: { expression: else_expression }
    };

    return ternary_condition_expression;
}

function node_to_expression_type(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Type_expression {
    const child = node.children[0];
    const type_reference = node_to_type_reference(root, child);
    return {
        type: type_reference[0]
    };
}

function node_to_expression_unary(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Unary_expression {

    const generic_expression_node = node.children[1];
    const generic_expression = node_to_expression(root, generic_expression_node);

    const symbol = node.children[0].children[0].word.value;

    const get_operation = (): Core_intermediate_representation.Unary_operation => {
        switch (symbol) {
            case "!": return Core_intermediate_representation.Unary_operation.Not;
            case "~": return Core_intermediate_representation.Unary_operation.Bitwise_not;
            case "-": return Core_intermediate_representation.Unary_operation.Minus;
            case "&": return Core_intermediate_representation.Unary_operation.Address_of;
            case "*": return Core_intermediate_representation.Unary_operation.Indirection;
            default: {
                const message = `Parse_tree_convertor_mappings.node_to_expression_unary(): Did not expect '${symbol}' as Expression_unary_previous_symbol`;
                onThrowError(message);
                throw Error(message);
            }
        }
    };

    const operation = get_operation();

    if (operation === Core_intermediate_representation.Unary_operation.Pre_increment || operation === Core_intermediate_representation.Unary_operation.Pre_decrement) {
        set_expression_access_type(generic_expression, Core_intermediate_representation.Access_type.Read_write);
    }

    const unary_expression: Core_intermediate_representation.Unary_expression = {
        expression: generic_expression,
        operation: operation
    };

    return unary_expression;
}

function node_to_expression_variable_name(node: Parser_node.Node): Core_intermediate_representation.Variable_expression {
    const name = get_terminal_value(node);
    const variable_expression: Core_intermediate_representation.Variable_expression = {
        name: name,
        access_type: Core_intermediate_representation.Access_type.Read
    };
    return variable_expression;
}

function node_to_expression_variable_declaration(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Variable_declaration_expression {

    const name = find_node_value(node, "Variable_name");

    const mutable_node_value = find_node_value(node, "Expression_variable_mutability");
    const is_mutable = mutable_node_value !== "var";

    const right_hand_side_node = find_node(node, "Generic_expression") as Parser_node.Node;
    const right_hand_side = node_to_expression(root, right_hand_side_node);

    const variable_declaration_expression: Core_intermediate_representation.Variable_declaration_expression = {
        name: name,
        is_mutable: is_mutable,
        right_hand_side: right_hand_side,
    };
    return variable_declaration_expression;
}

function node_to_expression_variable_declaration_with_type(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.Variable_declaration_with_type_expression {

    const name = find_node_value(node, "Variable_name");

    const mutable_node_value = find_node_value(node, "Expression_variable_mutability");
    const is_mutable = mutable_node_value !== "var";

    const type_node = find_node(node, "Expression_variable_declaration_type") as Parser_node.Node;
    const type = node_to_type_reference(root, type_node.children[0]);

    const right_hand_side_node = find_node(node, "Generic_expression_or_instantiate") as Parser_node.Node;
    const right_hand_side = node_to_expression(root, right_hand_side_node);

    const variable_declaration_expression: Core_intermediate_representation.Variable_declaration_with_type_expression = {
        name: name,
        is_mutable: is_mutable,
        type: type[0],
        right_hand_side: { expression: right_hand_side },
    };
    return variable_declaration_expression;
}

function node_to_expression_while_loop(root: Parser_node.Node, node: Parser_node.Node): Core_intermediate_representation.While_loop_expression {

    const condition_node = find_node(node, "Generic_expression") as Parser_node.Node;

    const condition_expression = node_to_expression(root, condition_node);

    const then_statements_node = find_node(node, "Expression_while_loop_statements") as Parser_node.Node;
    const then_statements = then_statements_node.children.slice(1, then_statements_node.children.length - 1).map(node => node_to_statement(root, node));

    const while_loop_expression: Core_intermediate_representation.While_loop_expression = {
        condition: { expression: condition_expression },
        then_statements: then_statements
    };
    return while_loop_expression;
}

export function node_to_module(root: Parser_node.Node): Core_intermediate_representation.Module {
    const module_name = get_module_name_from_tree(root);

    const module_head_descendant = Parser_node.get_child_if({ node: root, position: [] }, child => child.word.value === "Module_head");
    const import_descendants = module_head_descendant !== undefined ? Parser_node.get_children_if(module_head_descendant, child => child.word.value === "Import") : [];
    const imports = import_descendants.map(descendant => node_to_import_module_with_alias(descendant.node));

    const declarations = root.children.slice(1).map(child => node_to_declaration(root, child));

    const descendant_module_declaration = Parser_node.get_child_if(module_head_descendant, child => child.word.value === "Module_declaration");
    const comments_node = get_comments_node(descendant_module_declaration.node);
    const comment_value = comments_node !== undefined ? remove_comments_formatting(comments_node.word.value) : undefined;

    const core_module: Core_intermediate_representation.Module = {
        name: module_name,
        imports: imports,
        declarations: declarations
    };

    if (comment_value !== undefined) {
        core_module.comment = comment_value;
    }

    return core_module;
}

function get_terminal_value(node: Parser_node.Node): string {
    if (node.children.length === 0) {
        return node.word.value;
    }

    if (node.children.length === 0) {
        return "";
    }

    if (node.word.value === "Identifier_with_dots") {
        const values: string[] = [];
        for (const child of node.children) {
            values.push(child.word.value);
        }
        return values.join("");
    }

    return get_terminal_value(node.children[0]);
}

function find_node(node: Parser_node.Node, key: string): Parser_node.Node | undefined {
    return find_descendant_node(node, key);
}

function find_nodes(node: Parser_node.Node, key: string): Parser_node.Node[] {
    return find_descendant_nodes(node, key);
}

function find_node_value(node: Parser_node.Node, key: string): string {
    const found_node = find_node(node, key);
    if (found_node === undefined) {
        return "";
    }
    return get_terminal_value(found_node);
}

function find_nodes_inside_parent(node: Parser_node.Node, parent_key: string, child_key: string): Parser_node.Node[] {
    const parent_node = find_node(node, parent_key);
    if (parent_node === undefined) {
        return [];
    }

    const child_nodes = find_nodes(parent_node, child_key);
    return child_nodes;
}

function find_descendant_node(node: Parser_node.Node, name: string): Parser_node.Node | undefined {

    if (node.word.value === name) {
        return node;
    }

    {
        const child = node.children.find(child => child.word.value === name);
        if (child !== undefined) {
            return child;
        }
    }

    for (const child of node.children) {
        const found = find_descendant_node(child, name);
        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

function find_descendant_nodes(node: Parser_node.Node, name: string): Parser_node.Node[] {

    const nodes: Parser_node.Node[] = [];

    if (node.word.value === name) {
        nodes.push(node);
    }

    {
        const found_nodes = node.children.filter(child => child.word.value === name);
        nodes.push(...found_nodes);
    }

    // Avoid exploring child nodes for sake of optimization as production rules are usually at the same level in the node tree.
    if (nodes.length > 0) {
        return nodes;
    }

    for (const child of node.children) {
        const found_nodes = find_descendant_nodes(child, name);
        nodes.push(...found_nodes);
    }

    return nodes;
}

function find_descendant_if(node: Parser_node.Node, predicate: (node: Parser_node.Node) => boolean): Parser_node.Node | undefined {

    const list: Parser_node.Node[] = [];

    for (let index = 0; index < node.children.length; ++index) {
        const child = node.children[index];
        list.push(child);
    }

    while (list.length > 0) {
        const node = list.splice(0, 1)[0];

        if (predicate(node)) {
            return node;
        }

        for (let index = 0; index < node.children.length; ++index) {
            const child = node.children[index];
            list.push(child);
        }
    }

    return undefined;
}

function get_declaration_comment(declaration: Core_intermediate_representation.Declaration): string | undefined {
    switch (declaration.type) {
        case Core_intermediate_representation.Declaration_type.Alias: {
            const value = declaration.value as Core_intermediate_representation.Alias_type_declaration;
            return value.comment;
        }
        case Core_intermediate_representation.Declaration_type.Enum: {
            const value = declaration.value as Core_intermediate_representation.Enum_declaration;
            return value.comment;
        }
        case Core_intermediate_representation.Declaration_type.Function: {
            const value = declaration.value as Core_intermediate_representation.Function;
            return value.declaration.comment;
        }
        case Core_intermediate_representation.Declaration_type.Global_variable: {
            const value = declaration.value as Core_intermediate_representation.Global_variable_declaration;
            return value.comment;
        }
        case Core_intermediate_representation.Declaration_type.Struct: {
            const value = declaration.value as Core_intermediate_representation.Struct_declaration;
            return value.comment;
        }
        case Core_intermediate_representation.Declaration_type.Union: {
            const value = declaration.value as Core_intermediate_representation.Union_declaration;
            return value.comment;
        }
    }
}

function get_comment_from_stack(
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    element: Parse_tree_convertor.Module_to_parse_tree_stack_element,
    element_index: number,
    production_rules: Grammar.Production_rule[],
): string | undefined {
    switch (element.node.word.value) {
        case "Module_declaration": {
            const module = stack[0].state.value as Core_intermediate_representation.Module;
            return module.comment;
        }
        case "Declaration": {
            const declaration = element.state.value as Core_intermediate_representation.Declaration;
            return get_declaration_comment(declaration);
        }
        case "Enum_value": {
            const enum_element = stack[element_index - 2];
            const enum_members_element = stack[element_index - 1];
            const enum_declaration = enum_element.state.value.value as Core_intermediate_representation.Enum_declaration;
            const member_index = enum_members_element.current_child_index - 1;
            const member = enum_declaration.values[member_index];
            return member.comment;
        }
        case "Expression_comment": {
            const expression = stack[element_index].state.value as Core_intermediate_representation.Expression;
            const comment_expression = expression.data.value as Core_intermediate_representation.Comment_expression;
            return comment_expression.comment;
        }
        case "Struct_member": {
            const struct_element = stack[element_index - 2];
            const struct_members_element = stack[element_index - 1];
            const struct_declaration = struct_element.state.value.value as Core_intermediate_representation.Struct_declaration;
            const member_index = struct_members_element.current_child_index - 1;
            const member_comment_pair = struct_declaration.member_comments.find(pair => pair.index === member_index);
            return member_comment_pair !== undefined ? member_comment_pair.comment : undefined;
        }
        case "Union_member": {
            const union_element = stack[element_index - 2];
            const union_members_element = stack[element_index - 1];
            const union_declaration = union_element.state.value.value as Core_intermediate_representation.Union_declaration;
            const member_index = union_members_element.current_child_index - 1;
            const member_comment_pair = union_declaration.member_comments.find(pair => pair.index === member_index);
            return member_comment_pair !== undefined ? member_comment_pair.comment : undefined;
        }
    }
}

function extract_comments_from_stack(
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[]
): string | undefined {
    for (let stack_index = 0; stack_index < stack.length; ++stack_index) {
        const element_index = stack.length - stack_index - 1;
        const element = stack[element_index];

        switch (element.node.word.value) {
            case "Module_declaration":
            case "Declaration":
            case "Enum_value":
            case "Expression_comment":
            case "Struct_member":
            case "Union_member": {
                const comment = get_comment_from_stack(stack, element, element_index, production_rules);
                return comment;
            }
            default:
                break;
        }
    }

    return undefined;
}

function remove_comments_formatting(comments: string): string {
    const array = comments.split("\n");

    const unformatted_comments: string[] = [];

    for (const comment of array) {
        const start_comment_index = comment.search("//");
        const start_index = comment.charAt(start_comment_index + 2) === " " ? start_comment_index + 3 : start_comment_index + 2;
        unformatted_comments.push(comment.substring(start_index, comment.length));
    }

    const without_line_breaks = unformatted_comments.map(comment => comment.replace(/(\r)/gm, ""));

    return without_line_breaks.join("\n");
}

function extract_comments_from_node(node: Parser_node.Node | undefined): string | undefined {

    if (node === undefined) {
        return undefined;
    }

    if (node.word.value === "Comment_or_empty" || node.word.value === "Expression_comment") {
        if (node.children.length > 0) {
            const comments = node.children[0];
            const comments_value = comments.word.value;
            return remove_comments_formatting(comments_value);
        }
    }
    else if (node.word.value === "Module") {
        return extract_comments_from_node(get_comments_node(node.children[0].children[0]));
    }

    return remove_comments_formatting(node.word.value);
}

function get_node_source_location(
    node: Parser_node.Node,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[]
): Parser_node.Source_location | undefined {

    if (node.word.value === "Statement") {
        const statement = get_statement_from_stack(stack, stack.length - 1, production_rules);

        if (statement.expression.data.type === Core_intermediate_representation.Expression_enum.If_expression) {
            const if_expression = statement.expression.data.value as Core_intermediate_representation.If_expression;
            if (if_expression.series.length > 0) {
                const first_serie = if_expression.series[0];
                if (first_serie.block_source_position !== undefined) {
                    return first_serie.block_source_position;
                }
                else if (first_serie.condition !== undefined) {
                    return first_serie.condition.expression.source_position;
                }
            }
            return undefined;
        }

        return statement.expression.source_position;
    }

    return undefined;
}
