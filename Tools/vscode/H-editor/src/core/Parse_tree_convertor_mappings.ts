import * as Core_intermediate_representation from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Module_change from "./Module_change";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import * as Type_utilities from "./Type_utilities";
import { onThrowError } from "../utilities/errors";

export function create_mapping(): Parse_tree_convertor.Parse_tree_mappings {

    const value_map = new Map<string, string[]>(
        [
            ["Module_name", ["name"]],
            ["Import_name", ["imports", "$order_index", "module_name"]],
            ["Import_alias", ["imports", "$order_index", "alias"]],
            ["Alias_name", ["declarations", "$declaration_index", "value", "name"]],
            ["Alias_type", ["declarations", "$declaration_index", "value", "type"]],
            ["Enum_name", ["declarations", "$declaration_index", "value", "name"]],
            ["Enum_value_name", ["declarations", "$declaration_index", "value", "values", "$order_index", "name"]],
            ["Enum_value_value", ["declarations", "$declaration_index", "value", "values", "$order_index", "value"]],
            ["Function_name", ["declarations", "$declaration_index", "value", "declaration", "name"]],
            ["Function_parameter_name", ["declarations", "$declaration_index", "value", "declaration", "$parameter_names", "$order_index"]],
            ["Function_parameter_type", ["declarations", "$declaration_index", "value", "declaration", "type", "$parameter_types", "$order_index"]],
            ["Statement", ["declarations", "$declaration_index", "value", "definition", "statements", "$order_index"]],
            ["Struct_name", ["declarations", "$declaration_index", "value", "name"]],
            ["Struct_member_name", ["declarations", "$declaration_index", "value", "member_names", "$order_index"]],
            ["Struct_member_type", ["declarations", "$declaration_index", "value", "member_types", "$order_index"]],
        ]
    );

    const value_transforms = new Map<string, (value: any) => string>(
        [
            ["Alias_type", vector => Type_utilities.get_type_name(vector)],
            ["Expression_cast_destination_type", value => Type_utilities.get_type_name([value])],
            ["Function_parameter_type", value => Type_utilities.get_type_name([value])],
            ["Struct_member_type", value => Type_utilities.get_type_name([value])],
        ]
    );

    const terminal_to_word_map = new Map<string, Parse_tree_convertor.Map_terminal_to_word_handler>(
        [
            ["Identifier_with_dots", map_identifier_with_dots_to_word],
            ["Expression_constant", map_expression_constant_to_word],
            ["Expression_call_function_name", map_expression_call_function_name_to_word],
            ["Expression_call_module_name", map_expression_call_module_name_to_word],
            ["Expression_cast_destination_type", map_expression_cast_destination_type_to_word],
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
            ["Struct_members", [
                ["declarations", "$declaration_index", "value", "member_names"],
                ["declarations", "$declaration_index", "value", "member_types"]
            ]],
            ["Statements", [["declarations", "$order_index", "value", "definition", "statements"]]],
            ["Expression_call_arguments", [["$top.state.value", "data", "value", "arguments"]]],
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
            "Statements",
        ]
    );

    const choose_production_rule = new Map<string, Parse_tree_convertor.Choose_production_rule_handler>(
        [
            ["Identifier_with_dots", choose_production_rule_identifier_with_dots],
            ["Declaration", choose_production_rule_declaration],
            ["Export", choose_production_rule_export],
            ["Statement", choose_production_rule_statement],
            ["Expression_assignment_symbol", choose_production_rule_expression_assignment_symbol],
            ["Expression_binary_symbol", choose_production_rule_expression_binary_symbol],
            ["Expression_call", choose_production_rule_expression_call],
            ["Expression_constant", choose_production_rule_expression_constant],
            ["Expression_return", choose_production_rule_expression_return],
            ["Expression_unary", choose_production_rule_expression_unary],
            ["Expression_unary_previous_symbol", choose_production_rule_expression_unary_previous_symbol],
            ["Expression_unary_after_symbol", choose_production_rule_expression_unary_after_symbol],
            ["Expression_variable_mutability", choose_production_rule_expression_variable_mutability],
            ["Generic_expression", choose_production_rule_generic_expression],
        ]
    );

    const create_module_changes_map = new Map<string, Parse_tree_convertor.Create_module_changes_handler>(
        [
            ["Module_name", create_module_changes_module_name],
            ["Import", create_module_changes_import],
            ["Alias", create_module_changes_declaration],
            ["Enum", create_module_changes_declaration],
            ["Function", create_module_changes_declaration],
            ["Struct", create_module_changes_declaration],
        ]
    );

    const node_to_core_object_map = new Map<string, Parse_tree_convertor.Node_to_core_object_handler>(
        [
            ["Import", node_to_import_module_with_alias],
            ["Declaration", (node, key_to_production_rule_indices) => node_to_declaration(node.children[0], key_to_production_rule_indices)],
            ["Alias", node_to_declaration],
            ["Enum", node_to_declaration],
            ["Function", node_to_declaration],
            ["Struct", node_to_declaration],
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
        node_to_core_object_map: node_to_core_object_map
    };
}

function map_identifier_with_dots_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Scanner.Scanned_word {
    const index = stack[stack.length - 1].current_child_index;
    if (index % 2 !== 0) {
        return { value: ".", type: Grammar.Word_type.Symbol };
    }

    const word = Parse_tree_convertor.map_terminal_to_word(module, stack.slice(0, stack.length - 1), production_rules, key_to_production_rule_indices, "identifier", mappings);
    const split = word.value.split(".");
    return { value: split[index / 2], type: Grammar.Word_type.Alphanumeric };
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

function map_expression_constant_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Scanner.Scanned_word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const constant_expression = expression.data.value as Core_intermediate_representation.Constant_expression;

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

function map_expression_call_function_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Scanner.Scanned_word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const call_expression = expression.data.value as Core_intermediate_representation.Call_expression;
    return { value: call_expression.function_name, type: Grammar.Word_type.Alphanumeric };
}

function map_expression_call_module_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Scanner.Scanned_word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const call_expression = expression.data.value as Core_intermediate_representation.Call_expression;
    return { value: call_expression.module_reference.name, type: Grammar.Word_type.Alphanumeric };
}

function map_expression_cast_destination_type_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Scanner.Scanned_word {
    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;
    const cast_expression = expression.data.value as Core_intermediate_representation.Cast_expression;
    const destination_type_name = Type_utilities.get_type_name([cast_expression.destination_type]);
    return { value: destination_type_name, type: Grammar.Word_type.Alphanumeric };
}

function map_variable_name_to_word(
    module: Core_intermediate_representation.Module,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    production_rules: Grammar.Production_rule[],
    key_to_production_rule_indices: Map<string, number[]>,
    terminal: string,
    mappings: Parse_tree_convertor.Parse_tree_mappings
): Scanner.Scanned_word {
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
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {
    const word = Parse_tree_convertor.map_terminal_to_word(module, stack, production_rules, key_to_production_rule_indices, "identifier", mappings);
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

function choose_production_rule_declaration(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
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
        case Core_intermediate_representation.Declaration_type.Struct:
            return "Struct";
    }
}

function choose_production_rule_export(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
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

function choose_production_rule_statement(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const statements_array = top.state.value as Core_intermediate_representation.Statement[];
    const statement_index = Parse_tree_convertor.calculate_array_index(production_rules[top.production_rule_index], top.current_child_index);
    const statement = statements_array[statement_index];

    const first_expression = statement.expression;
    const rhs_label = map_expression_type_to_production_rule_label(first_expression.data.type);
    const index = production_rule_indices.findIndex(index => contains(production_rules[index].rhs, rhs_label));

    return {
        next_state: {
            index: 0,
            value: first_expression
        },
        next_production_rule_index: production_rule_indices[index]
    };
}

function choose_production_rule_expression_assignment_symbol(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const assignment_expression = expression.data.value as Core_intermediate_representation.Assignment_expression;

    const get_rhs_label = (): string => {
        switch (assignment_expression.additional_operation) {
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
                const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_assignment_symbol() did not expect '${assignment_expression.additional_operation}'`;
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

function choose_production_rule_expression_binary_symbol(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const binary_expression = expression.data.value as Core_intermediate_representation.Binary_expression;

    const get_rhs_label = (): string => {
        switch (binary_expression.operation) {
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

function choose_production_rule_expression_call(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const call_expression = expression.data.value as Core_intermediate_representation.Call_expression;

    const index = call_expression.module_reference.name.length > 0 ? 1 : 0;

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
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
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

function choose_production_rule_expression_return(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
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

function choose_production_rule_expression_unary(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
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

function choose_production_rule_expression_unary_previous_symbol(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const unary_expression = expression.data.value as Core_intermediate_representation.Unary_expression;

    const get_rhs_label = (): string => {
        switch (unary_expression.operation) {
            case Core_intermediate_representation.Unary_operation.Not: return "!";
            case Core_intermediate_representation.Unary_operation.Bitwise_not: return "~";
            case Core_intermediate_representation.Unary_operation.Minus: return "-";
            case Core_intermediate_representation.Unary_operation.Pre_increment: return "++";
            case Core_intermediate_representation.Unary_operation.Pre_decrement: return "--";
            case Core_intermediate_representation.Unary_operation.Indirection: return "*";
            case Core_intermediate_representation.Unary_operation.Address_of: return "&";
            default: {
                const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_unary_previous_symbol() did not expect '${unary_expression.operation}'`;
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

function choose_production_rule_expression_unary_after_symbol(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];

    const expression = top.state.value as Core_intermediate_representation.Expression;
    const unary_expression = expression.data.value as Core_intermediate_representation.Unary_expression;

    const get_rhs_label = (): string => {
        switch (unary_expression.operation) {
            case Core_intermediate_representation.Unary_operation.Post_increment: return "++";
            case Core_intermediate_representation.Unary_operation.Post_decrement: return "--";
            default: {
                const message = `Parse_tree_convertor_mappings.choose_production_rule_expression_unary_previous_symbol() did not expect '${unary_expression.operation}'`;
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

function choose_production_rule_expression_variable_mutability(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
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

function choose_production_rule_generic_expression(
    module: Core_intermediate_representation.Module,
    production_rules: Grammar.Production_rule[],
    production_rule_indices: number[],
    label: string,
    stack: Parse_tree_convertor.Module_to_parse_tree_stack_element[],
    mappings: Parse_tree_convertor.Parse_tree_mappings,
    key_to_production_rule_indices: Map<string, number[]>
): { next_state: Parse_tree_convertor.State, next_production_rule_index: number } {

    const top = stack[stack.length - 1];
    const expression = top.state.value as Core_intermediate_representation.Expression;

    const get_expression = (): { value: Core_intermediate_representation.Expression, label: string } => {
        switch (top.node.word.value) {
            case "Expression_assignment": {
                const assignment_expression = expression.data.value as Core_intermediate_representation.Assignment_expression;
                const next_expression = top.current_child_index === 0 ? assignment_expression.left_hand_side : assignment_expression.right_hand_side;
                return {
                    value: next_expression,
                    label: map_expression_type_to_production_rule_label(next_expression.data.type)
                };
            }
            case "Expression_binary": {
                const binary_expression = expression.data.value as Core_intermediate_representation.Binary_expression;
                const next_expression = top.current_child_index === 0 ? binary_expression.left_hand_side : binary_expression.right_hand_side;
                return {
                    value: next_expression,
                    label: map_expression_type_to_production_rule_label(next_expression.data.type)
                };
            }
            case "Expression_call": {
                const call_expression = expression.data.value as Core_intermediate_representation.Call_expression;
                return {
                    value: expression,
                    label: call_expression.module_reference.name.length > 0 ? "Expression_dot" : "Expression_variable"
                };
            }
            case "Expression_cast": {
                const cast_expression = expression.data.value as Core_intermediate_representation.Cast_expression;
                const next_expression = cast_expression.source;
                return {
                    value: next_expression,
                    label: map_expression_type_to_production_rule_label(next_expression.data.type)
                };
            }
            case "Expression_call_arguments": {
                const call_expression = expression.data.value as Core_intermediate_representation.Call_expression;
                const argument_index = top.current_child_index / 2;
                const argument = call_expression.arguments[argument_index];
                return {
                    value: argument,
                    label: map_expression_type_to_production_rule_label(argument.data.type)
                };
            }
            case "Expression_dot": {
                const call_expression = expression.data.value as Core_intermediate_representation.Call_expression;

                const variable_expression: Core_intermediate_representation.Variable_expression = {
                    name: top.current_child_index === 0 ? call_expression.module_reference.name : call_expression.function_name
                };

                return {
                    value: {
                        data: {
                            type: Core_intermediate_representation.Expression_enum.Variable_expression,
                            value: variable_expression
                        }
                    },
                    label: "Expression_variable"
                };
            }
            case "Expression_return": {
                const return_expression = expression.data.value as Core_intermediate_representation.Return_expression;
                return {
                    value: return_expression.expression,
                    label: map_expression_type_to_production_rule_label(return_expression.expression.data.type)
                };
            }
            case "Expression_unary_previous":
            case "Expression_unary_after": {
                const unary_expression = expression.data.value as Core_intermediate_representation.Unary_expression;
                return {
                    value: unary_expression.expression,
                    label: map_expression_type_to_production_rule_label(unary_expression.expression.data.type)
                };
            }
            case "Expression_variable_declaration": {
                const variable_declaration_expression = expression.data.value as Core_intermediate_representation.Variable_declaration_expression;
                return {
                    value: variable_declaration_expression.right_hand_side,
                    label: map_expression_type_to_production_rule_label(variable_declaration_expression.right_hand_side.data.type)
                };
            }
            default: {
                const message = `Parse_tree_convertor_mappings.choose_production_rule_generic_expression.get_expression(): expression type not handled: '${top.node.word.value}'`;
                onThrowError(message);
                throw message;
            }
        }
    };

    const generic_expression = get_expression();
    const next_production_rule_index = production_rule_indices.find(index => production_rules[index].rhs[0] === generic_expression.label) as number;
    return {
        next_state: {
            index: 0,
            value: generic_expression.value
        },
        next_production_rule_index: next_production_rule_index
    };
}

function map_expression_type_to_production_rule_label(type: Core_intermediate_representation.Expression_enum): string {
    switch (type) {
        case Core_intermediate_representation.Expression_enum.Assignment_expression:
            return "Expression_assignment";
        case Core_intermediate_representation.Expression_enum.Binary_expression:
            return "Expression_binary";
        case Core_intermediate_representation.Expression_enum.Call_expression:
            return "Expression_call";
        case Core_intermediate_representation.Expression_enum.Cast_expression:
            return "Expression_cast";
        case Core_intermediate_representation.Expression_enum.Constant_expression:
            return "Expression_constant";
        case Core_intermediate_representation.Expression_enum.Invalid_expression:
            return "Expression_invalid";
        case Core_intermediate_representation.Expression_enum.Parenthesis_expression:
            return "Expression_parenthesis";
        case Core_intermediate_representation.Expression_enum.Return_expression:
            return "Expression_return";
        case Core_intermediate_representation.Expression_enum.Unary_expression:
            return "Expression_unary";
        case Core_intermediate_representation.Expression_enum.Variable_expression:
            return "Expression_variable";
        case Core_intermediate_representation.Expression_enum.Variable_declaration_expression:
            return "Expression_variable_declaration";
        case Core_intermediate_representation.Expression_enum.Struct_member_expression:
            return "Expression_struct_member";
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
    const new_import = node_to_import_module_with_alias(data.node, data.key_to_production_rule_indices);

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
    data: Parse_tree_convertor.Create_module_changes_handler_data
): Module_change.Position_change_pair[] {
    const new_declaration = node_to_declaration(data.node, data.key_to_production_rule_indices);

    const new_change = create_new_module_change(
        new_declaration,
        `${data.node.word.value}_name`,
        "declarations",
        (name: string) => data.module.declarations.findIndex(value => value.name === name),
        data.node_position[data.node_position.length - 2],
        data.node,
        data.modify_change
    );

    return [new_change];
}

function node_to_declaration(
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): Core_intermediate_representation.Declaration {

    const is_export = is_export_node(node, key_to_production_rule_indices);

    switch (node.word.value) {
        case "Alias": {
            const value = node_to_alias_type_declaration(node, key_to_production_rule_indices);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Alias,
                is_export: is_export,
                value: value,
            };
        }
        case "Enum": {
            const value = node_to_enum_declaration(node, key_to_production_rule_indices);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Enum,
                is_export: is_export,
                value: value,
            };
        }
        case "Function": {
            const declaration_node_index = find_node_child_index(node, "Function_declaration", key_to_production_rule_indices);
            const definition_node_index = find_node_child_index(node, "Function_definition", key_to_production_rule_indices);
            const declaration = node_to_function_declaration(node.children[declaration_node_index], key_to_production_rule_indices);
            const definition = node_to_function_definition(node.children[definition_node_index], declaration.name, key_to_production_rule_indices);
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
        case "Struct": {
            const value = node_to_struct_declaration(node, key_to_production_rule_indices);
            return {
                name: value.name,
                type: Core_intermediate_representation.Declaration_type.Struct,
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

function node_to_alias_type_declaration(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Alias_type_declaration {
    const name = find_node_value(node, "Alias_name", key_to_production_rule_indices);

    const type_name = find_node_value(node, "Alias_type", key_to_production_rule_indices);
    const type_reference = Type_utilities.parse_type_name(type_name);

    return {
        name: name,
        type: type_reference
    };
}

function node_to_enum_declaration(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Enum_declaration {
    const name = find_node_value(node, "Enum_name", key_to_production_rule_indices);

    const value_nodes = find_nodes_inside_parent(node, "Enum_values", "Enum_value", key_to_production_rule_indices);

    const values: Core_intermediate_representation.Enum_value[] = [];

    for (let index = 0; index < value_nodes.length; ++index) {
        const value_node = value_nodes[index];

        const value_name = find_node_value(value_node, "Enum_value_name", key_to_production_rule_indices);
        const value_value = find_node_value(value_node, "Enum_value_value", key_to_production_rule_indices);

        values.push(
            {
                name: value_name,
                value: Number(value_value)
            }
        );
    }

    return {
        name: name,
        values: values
    };
}

function node_to_struct_declaration(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Struct_declaration {
    const name = find_node_value(node, "Struct_name", key_to_production_rule_indices);

    const member_nodes = find_nodes_inside_parent(node, "Struct_members", "Struct_member", key_to_production_rule_indices);

    const member_names: string[] = [];
    const member_types: Core_intermediate_representation.Type_reference[] = [];

    for (let index = 0; index < member_nodes.length; ++index) {
        const member_node = member_nodes[index];

        const member_name = find_node_value(member_node, "Struct_member_name", key_to_production_rule_indices);
        const member_type_name = find_node_value(member_node, "Struct_member_type", key_to_production_rule_indices);
        const member_type = Type_utilities.parse_type_name(member_type_name);

        member_names.push(member_name);
        member_types.push(member_type[0]);
    }

    return {
        name: name,
        member_names: member_names,
        member_types: member_types,
        is_packed: false,
        is_literal: false
    };
}

function is_export_node(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): boolean {
    const export_value = find_node_value(node, "Export", key_to_production_rule_indices);
    return export_value.length > 0;
}

function node_to_import_module_with_alias(
    node: Parser_node.Node,
    key_to_production_rule_indices: Map<string, number[]>
): Core_intermediate_representation.Import_module_with_alias {
    const module_name = find_node_value(node, "Import_name", key_to_production_rule_indices);
    const alias = find_node_value(node, "Import_alias", key_to_production_rule_indices);
    return {
        module_name: module_name,
        alias: alias,
        usages: []
    };
}

function find_node_child_index(node: Parser_node.Node, key: string, key_to_production_rule_indices: Map<string, number[]>): number {
    const production_rule_indices = key_to_production_rule_indices.get(key) as number[];
    return node.children.findIndex(child => production_rule_indices.find(index => index === child.production_rule_index) !== undefined);
}

function node_to_function_declaration(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Function_declaration {

    const name = find_node_value(node, "Function_name", key_to_production_rule_indices);

    const input_parameter_nodes = find_nodes_inside_parent(node, "Function_input_parameters", "Function_parameter", key_to_production_rule_indices);
    const input_parameter_names = input_parameter_nodes.map(node => find_node_value(node, "Function_parameter_name", key_to_production_rule_indices));
    const input_parameter_types = input_parameter_nodes.map(node => find_node_value(node, "Function_parameter_type", key_to_production_rule_indices)).map(name => Type_utilities.parse_type_name(name)[0]);

    const output_parameter_nodes = find_nodes_inside_parent(node, "Function_output_parameters", "Function_parameter", key_to_production_rule_indices);
    const output_parameter_names = output_parameter_nodes.map(node => find_node_value(node, "Function_parameter_name", key_to_production_rule_indices));
    const output_parameter_types = output_parameter_nodes.map(node => find_node_value(node, "Function_parameter_type", key_to_production_rule_indices)).map(name => Type_utilities.parse_type_name(name)[0]);

    const export_value = find_node_value(node, "Export", key_to_production_rule_indices);
    const linkage = export_value.length > 0 ? Core_intermediate_representation.Linkage.External : Core_intermediate_representation.Linkage.Private;

    return {
        name: name,
        type: {
            input_parameter_types: input_parameter_types,
            output_parameter_types: output_parameter_types,
            is_variadic: false // TODO
        },
        input_parameter_names: input_parameter_names,
        output_parameter_names: output_parameter_names,
        linkage: linkage
    };
}

function node_to_function_definition(node: Parser_node.Node, function_name: string, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Function_definition {

    const block_node = find_node(node, "Block", key_to_production_rule_indices);
    if (block_node !== undefined) {
        const statements_node = find_node(block_node, "Statements", key_to_production_rule_indices);
        if (statements_node !== undefined) {
            const statements = statements_node.children.map(node => node_to_statement(node, key_to_production_rule_indices));
            return {
                name: function_name,
                statements: statements
            };
        }
    }

    return {
        name: function_name,
        statements: []
    };
}

function node_to_statement(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Statement {

    const child = node.children[0];
    const expression = node_to_expression(child, key_to_production_rule_indices);

    return {
        name: "",
        expression: expression
    };
}

function node_to_expression(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Expression {

    switch (node.word.value) {
        case "Expression_assignment": {
            const expression = node_to_expression_assignment(node, key_to_production_rule_indices);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Assignment_expression,
                    value: expression
                }
            };
        }
        case "Expression_binary": {
            const expression = node_to_expression_binary(node, key_to_production_rule_indices);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Binary_expression,
                    value: expression
                }
            };
        }
        case "Expression_call": {
            const expression = node_to_expression_call(node, key_to_production_rule_indices);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Call_expression,
                    value: expression
                }
            };
        }
        case "Expression_cast": {
            const expression = node_to_expression_cast(node, key_to_production_rule_indices);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Cast_expression,
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
        case "Expression_return": {
            const expression = node_to_expression_return(node, key_to_production_rule_indices);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Return_expression,
                    value: expression
                }
            };
        }
        case "Expression_unary": {
            const expression = node_to_expression_unary(node, key_to_production_rule_indices);
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
            const expression = node_to_expression_variable_declaration(node, key_to_production_rule_indices);
            return {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
                    value: expression
                }
            };
        }
        case "Generic_expression": {
            const expression = node.children[0];
            return node_to_expression(expression, key_to_production_rule_indices);
        }
        default: {
            const message = `Parse_tree_convertor_mappings.node_to_expression() did not handle '${node.word.value}'`;
            onThrowError(message);
            throw Error(message);
        }
    }
}

function node_to_expression_return(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Return_expression {

    const generic_expression_node = find_node(node, "Generic_expression", key_to_production_rule_indices) as Parser_node.Node;
    const generic_expression = node_to_expression(generic_expression_node, key_to_production_rule_indices);

    const return_expression: Core_intermediate_representation.Return_expression = {
        expression: generic_expression
    };

    return return_expression;
}

function node_to_expression_assignment(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Assignment_expression {

    const generic_expressions = find_nodes(node, "Generic_expression", key_to_production_rule_indices);

    if (generic_expressions.length !== 2) {
        const message = "node_to_expression_assignment: could not process node!";
        onThrowError(message);
        throw Error(message);
    }

    const left_hand_side_node = generic_expressions[0];
    const left_hand_side_expression = node_to_expression(left_hand_side_node, key_to_production_rule_indices);

    const right_hand_side_node = generic_expressions[1];
    const right_hand_side_expression = node_to_expression(right_hand_side_node, key_to_production_rule_indices);

    const symbol = find_node_value(node, "Expression_assignment_symbol", key_to_production_rule_indices);
    const additional_operation = map_production_rule_label_to_assignment_binary_operation(symbol);

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
            onThrowError(message);
            throw Error(message);
        }
    }
}

function node_to_expression_binary(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Binary_expression {

    const generic_expressions = find_nodes(node, "Generic_expression", key_to_production_rule_indices);
    const operation_node = find_node(node, "Expression_binary_symbol", key_to_production_rule_indices);

    if (generic_expressions.length !== 2 || operation_node === undefined) {
        const message = "add_expression_binary: could not process node!";
        onThrowError(message);
        throw Error(message);
    }

    const left_hand_side_node = generic_expressions[0];
    const left_hand_side_expression = node_to_expression(left_hand_side_node, key_to_production_rule_indices);

    const operation_node_child = operation_node.children[0];
    const operation = map_production_rule_label_to_binary_operation(operation_node_child.word.value);

    const right_hand_side_node = generic_expressions[1];
    const right_hand_side_expression = node_to_expression(right_hand_side_node, key_to_production_rule_indices);

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
        default: {
            const message = `Unexpected binary expression symbol '${label}'`;
            onThrowError(message);
            throw Error(message);
        }
    }
}

function node_to_expression_call(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Call_expression {

    const module_name = find_node_value(node, "Expression_call_module_name", key_to_production_rule_indices);
    const function_name = find_node_value(node, "Expression_call_function_name", key_to_production_rule_indices);

    const argument_nodes = find_nodes_inside_parent(node, "Expression_call_arguments", "Generic_expression", key_to_production_rule_indices);
    const argument_expressions = argument_nodes.map(node => node_to_expression(node, key_to_production_rule_indices));

    const call_expression: Core_intermediate_representation.Call_expression = {
        module_reference: {
            name: module_name
        },
        function_name: function_name,
        arguments: argument_expressions
    };

    return call_expression;
}

function node_to_expression_cast(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Cast_expression {

    const source_node = find_node(node, "Generic_expression", key_to_production_rule_indices) as Parser_node.Node;
    const source_expression = node_to_expression(source_node, key_to_production_rule_indices);

    const destination_type_name = find_node_value(node, "Expression_cast_destination_type", key_to_production_rule_indices);
    const destination_type = Type_utilities.parse_type_name(destination_type_name);
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

function node_to_expression_constant(node: Parser_node.Node): Core_intermediate_representation.Constant_expression {
    const terminal_node = node.children[0];

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

function node_to_expression_unary(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Return_expression {

    const child = node.children[0];

    const generic_expression_node = find_node(child, "Generic_expression", key_to_production_rule_indices) as Parser_node.Node;
    const generic_expression = node_to_expression(generic_expression_node, key_to_production_rule_indices);

    if (child.word.value === "Expression_unary_previous") {
        const symbol = find_node_value(child, "Expression_unary_previous_symbol", key_to_production_rule_indices);

        const get_operation = (): Core_intermediate_representation.Unary_operation => {
            switch (symbol) {
                case "!": return Core_intermediate_representation.Unary_operation.Not;
                case "~": return Core_intermediate_representation.Unary_operation.Bitwise_not;
                case "-": return Core_intermediate_representation.Unary_operation.Minus;
                case "++": return Core_intermediate_representation.Unary_operation.Pre_increment;
                case "--": return Core_intermediate_representation.Unary_operation.Pre_decrement;
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

        const unary_expression: Core_intermediate_representation.Unary_expression = {
            expression: generic_expression,
            operation: operation
        };

        return unary_expression;
    }
    else if (child.word.value === "Expression_unary_after") {
        const symbol = find_node_value(child, "Expression_unary_after_symbol", key_to_production_rule_indices);

        const get_operation = (): Core_intermediate_representation.Unary_operation => {
            switch (symbol) {
                case "++": return Core_intermediate_representation.Unary_operation.Post_increment;
                case "--": return Core_intermediate_representation.Unary_operation.Post_decrement;
                default: {
                    const message = `Parse_tree_convertor_mappings.node_to_expression_unary(): Did not expect '${symbol}' as Expression_unary_after_symbol`;
                    onThrowError(message);
                    throw Error(message);
                }
            }
        };

        const operation = get_operation();

        const unary_expression: Core_intermediate_representation.Unary_expression = {
            expression: generic_expression,
            operation: operation
        };

        return unary_expression;
    }
    else {
        const message = `Parse_tree_convertor_mappings.node_to_expression_unary(): Did not expect '${child.word.value}'`;
        onThrowError(message);
        throw Error(message);
    }
}

function node_to_expression_variable_name(node: Parser_node.Node): Core_intermediate_representation.Variable_expression {
    const name = get_terminal_value(node);
    const variable_expression: Core_intermediate_representation.Variable_expression = {
        name: name
    };
    return variable_expression;
}

function node_to_expression_variable_declaration(node: Parser_node.Node, key_to_production_rule_indices: Map<string, number[]>): Core_intermediate_representation.Variable_declaration_expression {

    const name = find_node_value(node, "Variable_name", key_to_production_rule_indices);

    const mutable_node_value = find_node_value(node, "Expression_variable_mutability", key_to_production_rule_indices);
    const is_mutable = mutable_node_value !== "var";

    const right_hand_side_node = find_node(node, "Generic_expression", key_to_production_rule_indices) as Parser_node.Node;
    const right_hand_side = node_to_expression(right_hand_side_node, key_to_production_rule_indices);

    const variable_declaration_expression: Core_intermediate_representation.Variable_declaration_expression = {
        name: name,
        is_mutable: is_mutable,
        right_hand_side: right_hand_side,
    };
    return variable_declaration_expression;
}

function get_terminal_value(node: Parser_node.Node): string {
    if (node.production_rule_index === undefined && node.children.length === 0) {
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

function find_node(node: Parser_node.Node, key: string, key_to_production_rule_indices: Map<string, number[]>): Parser_node.Node | undefined {
    const production_rule_indices = key_to_production_rule_indices.get(key) as number[];
    if (production_rule_indices === undefined) {
        return undefined;
    }

    const found_node = find_node_with_production_rule_indices(node, production_rule_indices);
    return found_node;
}

function find_nodes(node: Parser_node.Node, key: string, key_to_production_rule_indices: Map<string, number[]>): Parser_node.Node[] {
    const production_rule_indices = key_to_production_rule_indices.get(key) as number[];
    if (production_rule_indices === undefined) {
        return [];
    }

    const found_nodes = find_nodes_with_production_rule_indices(node, production_rule_indices);
    return found_nodes;
}

function find_node_value(node: Parser_node.Node, key: string, key_to_production_rule_indices: Map<string, number[]>): string {
    const found_node = find_node(node, key, key_to_production_rule_indices);
    if (found_node === undefined) {
        return "";
    }
    return get_terminal_value(found_node);
}

function find_nodes_inside_parent(node: Parser_node.Node, parent_key: string, child_key: string, key_to_production_rule_indices: Map<string, number[]>): Parser_node.Node[] {
    const parent_node = find_node(node, parent_key, key_to_production_rule_indices);
    if (parent_node === undefined) {
        return [];
    }

    const child_nodes = find_nodes(parent_node, child_key, key_to_production_rule_indices);
    return child_nodes;
}

function find_node_with_production_rule_indices(node: Parser_node.Node, production_rule_indices: number[]): Parser_node.Node | undefined {

    const has_production_rule = (element: Parser_node.Node): boolean => {
        return element.production_rule_index !== undefined && production_rule_indices.indexOf(element.production_rule_index) !== -1;
    };

    if (has_production_rule(node)) {
        return node;
    }

    {
        const child = node.children.find(child => has_production_rule(child));
        if (child !== undefined) {
            return child;
        }
    }

    for (const child of node.children) {
        const found = find_node_with_production_rule_indices(child, production_rule_indices);
        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

function find_nodes_with_production_rule_indices(node: Parser_node.Node, production_rule_indices: number[]): Parser_node.Node[] {

    const nodes: Parser_node.Node[] = [];

    const has_production_rule = (element: Parser_node.Node): boolean => {
        return element.production_rule_index !== undefined && production_rule_indices.indexOf(element.production_rule_index) !== -1;
    };

    if (has_production_rule(node)) {
        nodes.push(node);
    }

    {
        const found_nodes = node.children.filter(child => has_production_rule(child));
        nodes.push(...found_nodes);
    }

    // Avoid exploring child nodes for sake of optimization as production rules are usually at the same level in the node tree.
    if (nodes.length > 0) {
        return nodes;
    }

    for (const child of node.children) {
        const found_nodes = find_nodes_with_production_rule_indices(child, production_rule_indices);
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
