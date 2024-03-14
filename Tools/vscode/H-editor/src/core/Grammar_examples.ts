export function create_test_grammar_0_description(): string[] {
    return [
        "S -> E",
        "E -> T",
        "E -> ( E )",
        "T -> n",
        "T -> + T",
        "T -> T + n"
    ];
}

export function create_test_grammar_1_description(): string[] {

    return [
        "Statement -> Expression",
        "Expression -> Sum | Multiplication | number",
        "Sum -> Expression + Expression",
        "Multiplication -> Expression * Expression",
    ];
}

export function create_test_grammar_2_description(): string[] {
    return [
        "Start -> S",
        "S -> A A",
        "A -> a A",
        "A -> b"
    ];
}


export function create_test_grammar_3_description(): string[] {
    return [
        "Start -> Addition",
        "Addition -> Addition + Multiplication",
        "Addition -> Multiplication",
        "Multiplication -> Multiplication * Basic",
        "Multiplication -> Basic",
        "Basic -> number",
        "Basic -> ( Addition )",
    ];
}

export function create_test_grammar_4_description(): string[] {
    return [
        "Start -> Addition",
        "Addition -> Addition + Multiplication",
        "Addition -> Addition - Multiplication",
        "Addition -> Multiplication",
        "Multiplication -> Multiplication * Basic",
        "Multiplication -> Multiplication / Basic",
        "Multiplication -> Basic",
        "Basic -> number",
        "Basic -> identifier",
        "Basic -> ( Expression )",
    ];
}

export function create_test_grammar_5_description(): string[] {
    return [
        "S -> A B",
        "A -> a A B",
        "A -> a A C",
        "A -> h A h",
        "A -> l",
        "B -> b B",
        "B -> c",
        "C -> D c",
        "D -> b E",
        "E -> g g",
    ];
}

export function create_test_grammar_6_description(): string[] {
    return [
        "S -> Function",
        "Function -> Export Inline function ( Arguments )",
        "Export -> export",
        "Export -> ",
        "Inline -> inline",
        "Inline -> ",
        "Arguments -> ",
        "Arguments -> Argument",
        "Argument -> name : type",
        "Argument -> name : type , Argument"
    ];
}

export function create_test_grammar_7_description(): string[] {
    return [
        "E -> T D",
        "D -> + T D",
        "D -> ",
        "T -> F U",
        "U -> * F U",
        "U -> ",
        "F -> ( E )",
        "F -> id"
    ];
}

export function create_test_grammar_8_description(): string[] {
    return [
        "S -> A C B",
        "S -> C b b",
        "S -> B a",
        "A -> d a",
        "A -> B C",
        "B -> g",
        "B -> ",
        "C -> h",
        "C -> ",
    ];
}

export function create_test_grammar_9_description(): string[] {
    return [
        "Module -> Module_head Module_body",
        "Identifier_with_dots -> identifier . $1_or_more",
        "Module_head -> Module_declaration Imports",
        "Module_declaration -> module Module_name ;",
        "Module_name -> Identifier_with_dots",
        "Imports -> Import $0_or_more",
        "Import -> import Import_name as Import_alias ;",
        "Import_name -> Identifier_with_dots",
        "Import_alias -> identifier",
        "Module_body -> Declaration $0_or_more",
        "Declaration -> Alias",
        "Declaration -> Enum",
        "Declaration -> Struct",
        "Declaration -> Function",
        "Export -> ",
        "Export -> export",
        "Type -> Type_name | Module_type | Pointer_type",
        "Type_name -> identifier",
        "Module_type -> Module_type_module_name . Module_type_type_name",
        "Module_type_module_name -> identifier",
        "Module_type_type_name -> identifier",
        "Pointer_type -> Type * | Type mutable *",
        "Alias -> Export using Alias_name = Alias_type ;",
        "Alias_name -> identifier",
        "Alias_type -> Type",
        "Enum -> Export enum Enum_name { Enum_values }",
        "Enum_name -> identifier",
        "Enum_values -> Enum_value $0_or_more",
        "Enum_value -> Enum_value_name = Enum_value_value ,",
        "Enum_value_name -> identifier",
        "Enum_value_value -> number",
        "Struct -> Export struct Struct_name { Struct_members }",
        "Struct_name -> identifier",
        "Struct_members -> Struct_member $0_or_more",
        "Struct_member -> Struct_member_name : Struct_member_type ;",
        "Struct_member_name -> identifier",
        "Struct_member_type -> Type",
        "Function -> Function_declaration Function_definition",
        "Function_declaration -> Export function Function_name ( Function_input_parameters ) -> ( Function_output_parameters )",
        "Function_name -> identifier",
        "Function_input_parameters -> Function_parameter , $0_or_more",
        "Function_output_parameters -> Function_parameter $0_or_more",
        "Function_parameter -> Function_parameter_name : Function_parameter_type",
        "Function_parameter_name -> identifier",
        "Function_parameter_type -> Type",
        "Function_definition -> Block",
        "Block -> { Statements }",
        "Statements -> Statement $0_or_more",
        "Statement -> Expression_assignment ;",
        "Statement -> Expression_block",
        "Statement -> Expression_break ;",
        "Statement -> Expression_call ;",
        "Statement -> Expression_continue ;",
        "Statement -> Expression_for_loop",
        "Statement -> Expression_if",
        "Statement -> Expression_return ;",
        "Statement -> Expression_switch",
        "Statement -> Expression_variable_declaration ;",
        "Statement -> Expression_while_loop",
        "Expression_level_0 -> Expression_constant | Expression_variable | Expression_parenthesis",
        "Expression_level_1 -> Expression_access | Expression_call | Expression_cast | Expression_unary_0 | Expression_level_0",
        "Expression_level_2 -> Expression_unary_1 | Expression_level_1",
        "Expression_level_3 -> Expression_binary_multiplication | Expression_level_2",
        "Expression_level_4 -> Expression_binary_addition | Expression_level_3",
        "Expression_level_5 -> Expression_binary_bitwise_shift | Expression_level_4",
        "Expression_level_6 -> Expression_binary_relational | Expression_level_5",
        "Expression_level_7 -> Expression_binary_relational_equal | Expression_level_6",
        "Expression_level_8 -> Expression_binary_bitwise_and | Expression_level_7",
        "Expression_level_9 -> Expression_binary_bitwise_xor | Expression_level_8",
        "Expression_level_10 -> Expression_binary_bitwise_or | Expression_level_9",
        "Expression_level_11 -> Expression_binary_logical_and | Expression_level_10",
        "Expression_level_12 -> Expression_binary_logical_or | Expression_level_11",
        "Generic_expression -> Expression_ternary_condition | Expression_level_12",
        "Expression_access -> Expression_level_1 . Expression_access_member_name",
        "Expression_access_member_name -> identifier",
        "Expression_assignment -> Generic_expression Expression_assignment_symbol Generic_expression",
        "Expression_assignment_symbol -> = | += | -= | *= | /= | %= | &= | |= | ^= | <<= | >>=",
        "Expression_binary_addition -> Expression_level_4 Expression_binary_addition_symbol Expression_level_3",
        "Expression_binary_addition_symbol -> + | -",
        "Expression_binary_bitwise_and -> Expression_level_8 Expression_binary_bitwise_and_symbol Expression_level_7",
        "Expression_binary_bitwise_and_symbol -> &",
        "Expression_binary_bitwise_xor -> Expression_level_9 Expression_binary_bitwise_xor_symbol Expression_level_8",
        "Expression_binary_bitwise_xor_symbol -> ^",
        "Expression_binary_bitwise_or -> Expression_level_10 Expression_binary_bitwise_or_symbol Expression_level_9",
        "Expression_binary_bitwise_or_symbol -> $single_or",
        "Expression_binary_bitwise_shift -> Expression_level_5 Expression_binary_bitwise_shift_symbol Expression_level_4",
        "Expression_binary_bitwise_shift_symbol -> << | >>",
        "Expression_binary_logical_and -> Expression_level_11 Expression_binary_logical_and_symbol Expression_level_10",
        "Expression_binary_logical_and_symbol -> &&",
        "Expression_binary_logical_or -> Expression_level_12 Expression_binary_logical_or_symbol Expression_level_11",
        "Expression_binary_logical_or_symbol -> ||",
        "Expression_binary_multiplication -> Expression_level_3 Expression_binary_multiplication_symbol Expression_level_2",
        "Expression_binary_multiplication_symbol -> * | / | %",
        "Expression_binary_relational -> Expression_level_6 Expression_binary_relational_symbol Expression_level_5",
        "Expression_binary_relational_symbol -> < | <= | > | >=",
        "Expression_binary_relational_equal -> Expression_level_7 Expression_binary_relational_equal_symbol Expression_level_6",
        "Expression_binary_relational_equal_symbol -> == | !=",
        "Expression_block -> { Expression_block_statements }",
        "Expression_block_statements -> Statement $0_or_more",
        "Expression_break -> break",
        "Expression_break -> break Expression_break_loop_count",
        "Expression_break_loop_count -> number",
        "Expression_call -> Expression_level_1 ( Expression_call_arguments )",
        "Expression_call_arguments -> Generic_expression , $0_or_more",
        "Expression_cast -> Expression_level_0 as Expression_cast_destination_type",
        "Expression_cast_destination_type -> Type",
        "Expression_constant -> boolean",
        "Expression_constant -> number",
        "Expression_constant -> string",
        "Expression_continue -> continue",
        "Expression_for_loop -> for Expression_for_loop_variable in Expression_for_loop_range_begin to Expression_for_loop_range_end Expression_for_loop_step : Statement",
        "Expression_for_loop_variable -> identifier",
        "Expression_for_loop_range_begin -> Expression_for_loop_number_expression",
        "Expression_for_loop_range_end -> Expression_for_loop_number_expression",
        "Expression_for_loop_step -> ",
        "Expression_for_loop_step -> step_by Expression_for_loop_number_expression",
        "Expression_for_loop_number_expression -> Expression_access | Expression_call | Expression_constant | Expression_unary_1 | Expression_variable",
        "Expression_if -> if Generic_expression : Statement Expression_if_else",
        "Expression_if_else -> ",
        "Expression_if_else -> else Expression_if",
        "Expression_if_else -> else Statement",
        "Expression_parenthesis -> ( Generic_expression )",
        "Expression_return -> return",
        "Expression_return -> return Generic_expression",
        "Expression_switch -> switch Generic_expression : { Expression_switch_cases }",
        "Expression_switch_cases -> Expression_switch_case $0_or_more",
        "Expression_switch_case -> case Expression_switch_case_value : Expression_switch_case_statements",
        "Expression_switch_case -> default : Expression_switch_case_statements",
        "Expression_switch_case_statements -> Statement $0_or_more",
        "Expression_switch_case_value -> Expression_access | Expression_constant",
        "Expression_ternary_condition -> Generic_expression ? Generic_expression : Expression_level_12",
        "Expression_unary_0 -> Expression_level_0 Expression_unary_0_symbol",
        "Expression_unary_0_symbol -> ++ | --",
        "Expression_unary_1 -> Expression_unary_1_symbol Expression_level_1",
        "Expression_unary_1_symbol -> ! | ~ | - | ++ | -- | & | *",
        "Expression_variable -> Variable_name",
        "Expression_variable_declaration -> Expression_variable_mutability Variable_name = Generic_expression",
        "Expression_variable_mutability -> var",
        "Expression_variable_mutability -> mutable",
        "Expression_while_loop -> while Generic_expression : Statement",
        "Variable_name -> identifier",
    ];
}

export function create_test_grammar_10_description(): string[] {
    return [
        "S -> List",
        "List -> Element $0_or_more",
        "Element -> id"
    ];
}

export function create_test_grammar_11_description(): string[] {
    return [
        "S -> List",
        "List -> Element , $0_or_more",
        "Element -> id"
    ];
}

export function create_test_grammar_12_description(): string[] {
    return [
        "S -> List",
        "List -> number number number number number number"
    ];
}

export function create_test_grammar_13_description(): string[] {
    return [
        "S -> E",
        "E -> A | B",
        "A -> id $single_or id",
        "B -> id || id"
    ];
}
