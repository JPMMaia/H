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
        "Comment_or_empty -> ",
        "Comment_or_empty -> comment",
        "Module_head -> Module_declaration Imports",
        "Module_declaration -> Comment_or_empty module Module_name ;",
        "Module_name -> Identifier_with_dots",
        "Imports -> Import $0_or_more",
        "Import -> import Import_name as Import_alias ;",
        "Import_name -> Identifier_with_dots",
        "Import_alias -> identifier",
        "Module_body -> Declaration $0_or_more",
        "Declaration -> Comment_or_empty Export Alias",
        "Declaration -> Comment_or_empty Export Enum",
        "Declaration -> Comment_or_empty Export Global_variable",
        "Declaration -> Comment_or_empty Export Struct",
        "Declaration -> Comment_or_empty Export Union",
        "Declaration -> Comment_or_empty Export Function",
        "Export -> ",
        "Export -> export",
        "Type -> Type_name | Module_type | Pointer_type | Constant_array_type | Function_pointer_type",
        "Type_name -> identifier",
        "Constant_array_type -> Constant_array < Type , Constant_array_length >",
        "Constant_array_length -> number",
        "Function_pointer_type -> function < ( Function_pointer_type_input_parameters ) -> ( Function_pointer_type_output_parameters ) >",
        "Function_pointer_type_input_parameters -> Function_parameter , $0_or_more",
        "Function_pointer_type_output_parameters -> Function_parameter $0_or_more",
        "Module_type -> Module_type_module_name . Module_type_type_name",
        "Module_type_module_name -> identifier",
        "Module_type_type_name -> identifier",
        "Pointer_type -> * Type | * mutable Type",
        "Alias -> using Alias_name = Alias_type ;",
        "Alias_name -> identifier",
        "Alias_type -> Type",
        "Enum -> enum Enum_name { Enum_values }",
        "Enum_name -> identifier",
        "Enum_values -> Enum_value $0_or_more",
        "Enum_value -> Comment_or_empty Enum_value_name ,",
        "Enum_value -> Comment_or_empty Enum_value_name = Generic_expression ,",
        "Enum_value_name -> identifier",
        "Global_variable -> Global_variable_mutability Global_variable_name Global_variable_type = Generic_expression_or_instantiate ;",
        "Global_variable_name -> identifier",
        "Global_variable_type -> ",
        "Global_variable_type -> : Type",
        "Global_variable_mutability -> var",
        "Global_variable_mutability -> mutable",
        "Struct -> struct Struct_name { Struct_members }",
        "Struct_name -> ",
        "Struct_name -> identifier",
        "Struct_members -> Struct_member $0_or_more",
        "Struct_member -> Comment_or_empty Struct_member_name : Struct_member_type = Generic_expression_or_instantiate ;",
        "Struct_member_name -> identifier",
        "Struct_member_type -> Type",
        "Union -> union Union_name { Union_members }",
        "Union_name -> ",
        "Union_name -> identifier",
        "Union_members -> Union_member $0_or_more",
        "Union_member -> Comment_or_empty Union_member_name : Union_member_type ;",
        "Union_member_name -> identifier",
        "Union_member_type -> Type",
        "Function -> Function_declaration Function_definition",
        "Function_declaration -> function Function_name ( Function_input_parameters ) -> ( Function_output_parameters ) Function_options",
        "Function_name -> ",
        "Function_name -> identifier",
        "Function_input_parameters -> Function_parameter , $0_or_more",
        "Function_output_parameters -> Function_parameter $0_or_more",
        "Function_parameter -> Function_parameter_name : Function_parameter_type",
        "Function_parameter -> ...",
        "Function_parameter_name -> identifier",
        "Function_parameter_type -> Type",
        "Function_options -> Function_preconditions Function_postconditions",
        "Function_preconditions -> Function_precondition $0_or_more",
        "Function_precondition -> precondition Function_precondition_name { Generic_expression }",
        "Function_precondition_name -> string",
        "Function_postconditions -> Function_postcondition $0_or_more",
        "Function_postcondition -> postcondition Function_postcondition_name { Generic_expression }",
        "Function_postcondition_name -> string",
        "Function_definition -> Block",
        "Block -> { Statements }",
        "Statements -> Statement $0_or_more",
        "Statement -> Expression_assignment ;",
        "Statement -> Expression_block",
        "Statement -> Expression_break ;",
        "Statement -> Expression_call ;",
        "Statement -> Expression_comment",
        "Statement -> Expression_continue ;",
        "Statement -> Expression_defer ;",
        "Statement -> Expression_for_loop",
        "Statement -> Expression_if",
        "Statement -> Expression_return ;",
        "Statement -> Expression_struct_constructor ;",
        "Statement -> Expression_switch",
        "Statement -> Expression_variable_declaration ;",
        "Statement -> Expression_variable_declaration_with_type ;",
        "Statement -> Expression_while_loop",
        "Expression_level_0 -> Expression_constant | Expression_create_array | Expression_null_pointer | Expression_variable | Expression_parenthesis",
        "Expression_level_1 -> Expression_access | Expression_call | Expression_unary_0 | Expression_level_0",
        "Expression_level_2 -> Expression_access_array | Expression_cast | Expression_unary_1 | Expression_level_1",
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
        "Generic_expression_or_instantiate -> Expression_instantiate | Generic_expression",
        "Expression_access -> Expression_level_1 . Expression_access_member_name",
        "Expression_access_member_name -> identifier",
        "Expression_access_array -> Expression_level_1 [ Generic_expression ]",
        "Expression_assignment -> Generic_expression Expression_assignment_symbol Generic_expression_or_instantiate",
        "Expression_assignment_symbol -> = | += | -= | *= | /= | %= | &= | |= | ^= | <<= | >>=",
        "Expression_binary_addition -> Expression_level_4 Expression_binary_addition_symbol Expression_level_3",
        "Expression_binary_addition_symbol -> + | -",
        "Expression_binary_bitwise_and -> Expression_level_8 Expression_binary_bitwise_and_symbol Expression_level_7",
        "Expression_binary_bitwise_and_symbol -> & | has",
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
        "Expression_call_arguments -> Generic_expression_or_instantiate , $0_or_more",
        "Expression_cast -> Expression_level_1 as Expression_cast_destination_type",
        "Expression_cast_destination_type -> Type",
        "Expression_comment -> comment",
        "Expression_constant -> boolean",
        "Expression_constant -> number",
        "Expression_constant -> string",
        "Expression_continue -> continue",
        "Expression_create_array -> [ Expression_create_array_elements ]",
        "Expression_create_array_elements -> Generic_expression_or_instantiate , $0_or_more",
        "Expression_defer -> defer Generic_expression",
        "Expression_for_loop -> Expression_for_loop_head { Expression_for_loop_statements }",
        "Expression_for_loop_head -> for Expression_for_loop_variable in Expression_for_loop_range_begin to Expression_for_loop_range_end Expression_for_loop_step Expression_for_loop_reverse",
        "Expression_for_loop_variable -> identifier",
        "Expression_for_loop_range_begin -> Expression_for_loop_number_expression",
        "Expression_for_loop_range_end -> Expression_for_loop_number_expression",
        "Expression_for_loop_step -> ",
        "Expression_for_loop_step -> step_by Expression_for_loop_number_expression",
        "Expression_for_loop_reverse -> ",
        "Expression_for_loop_reverse -> reverse",
        "Expression_for_loop_number_expression -> Expression_access | Expression_call | Expression_constant | Expression_unary_1 | Expression_variable",
        "Expression_for_loop_statements -> Statement $0_or_more",
        "Expression_instantiate -> Expression_instantiate_expression_type { Expression_instantiate_members }",
        "Expression_instantiate_expression_type -> ",
        "Expression_instantiate_expression_type -> explicit",
        "Expression_instantiate_members -> Expression_instantiate_member , $0_or_more",
        "Expression_instantiate_member -> Expression_instantiate_member_name : Generic_expression_or_instantiate",
        "Expression_instantiate_member_name -> identifier",
        "Expression_if -> if Generic_expression { Expression_if_statements } Expression_if_else",
        "Expression_if_else -> ",
        "Expression_if_else -> else Expression_if",
        "Expression_if_else -> else { Expression_if_statements }",
        "Expression_if_statements -> Statement $0_or_more",
        "Expression_null_pointer -> null",
        "Expression_parenthesis -> ( Generic_expression )",
        "Expression_return -> return",
        "Expression_return -> return Generic_expression_or_instantiate",
        "Expression_switch -> switch Generic_expression { Expression_switch_cases }",
        "Expression_switch_cases -> Expression_switch_case $0_or_more",
        "Expression_switch_case -> case Expression_switch_case_value : Expression_switch_case_statements",
        "Expression_switch_case -> default : Expression_switch_case_statements",
        "Expression_switch_case_statements -> Statement $0_or_more",
        "Expression_switch_case_value -> Expression_access | Expression_constant | Expression_variable",
        "Expression_ternary_condition -> Generic_expression ? Generic_expression : Expression_level_12",
        "Expression_unary_0 -> Expression_level_0 Expression_unary_0_symbol",
        "Expression_unary_0_symbol -> ++ | --",
        "Expression_unary_1 -> Expression_unary_1_symbol Expression_level_1",
        "Expression_unary_1_symbol -> ! | ~ | - | ++ | -- | & | *",
        "Expression_variable -> Variable_name",
        "Expression_variable_declaration -> Expression_variable_mutability Variable_name = Generic_expression",
        "Expression_variable_declaration_with_type -> Expression_variable_mutability Variable_name : Expression_variable_declaration_type = Generic_expression_or_instantiate",
        "Expression_variable_declaration_type -> Type",
        "Expression_variable_mutability -> var",
        "Expression_variable_mutability -> mutable",
        "Expression_while_loop -> while Generic_expression { Expression_while_loop_statements }",
        "Expression_while_loop_statements -> Statement $0_or_more",
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

export function create_test_grammar_14_description(): string[] {
    return [
        "S -> List",
        "List -> Element $0_or_more",
        "Element -> id | id2 | id3"
    ];
}

export function create_test_grammar_15_description(): string[] {
    return [
        "S -> List",
        "List -> Element , $0_or_more",
        "Element -> id | id2 | id3"
    ];
}
