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
        "Export -> export",
        "Export -> ",
        "Alias -> Export using Alias_name = Alias_type ;",
        "Alias_name -> identifier",
        "Alias_type -> identifier",
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
        "Struct_member_type -> identifier",
        "Function -> Function_declaration Function_definition",
        "Function_declaration -> Export function Function_name ( Function_input_parameters ) -> ( Function_output_parameters )",
        "Function_name -> identifier",
        "Function_input_parameters -> Function_parameter , $0_or_more",
        "Function_output_parameters -> Function_parameter $0_or_more",
        "Function_parameter -> Function_parameter_name : Function_parameter_type",
        "Function_parameter_name -> identifier",
        "Function_parameter_type -> identifier",
        "Function_definition -> Block",
        "Block -> { Statements }",
        "Statements -> Statement $0_or_more",
        "Statement -> Expression_assignment ;",
        "Statement -> Expression_call ;",
        "Statement -> Expression_return ;",
        "Statement -> Expression_variable_declaration ;",
        "Generic_expression -> Expression_binary",
        "Generic_expression -> Expression_constant",
        "Generic_expression -> Expression_call",
        "Generic_expression -> Expression_cast",
        "Generic_expression -> Expression_variable",
        "Expression_assignment -> Generic_expression = Generic_expression",
        "Expression_call -> Expression_call_function_name ( Expression_call_arguments )",
        "Expression_call -> Expression_call_module_name . Expression_call_function_name ( Expression_call_arguments )",
        "Expression_call_module_name -> identifier",
        "Expression_call_function_name -> identifier",
        "Expression_call_arguments -> Generic_expression , $0_or_more",
        "Expression_cast -> Generic_expression as Expression_cast_destination_type",
        "Expression_cast_destination_type -> identifier",
        "Expression_constant -> boolean",
        "Expression_constant -> number",
        "Expression_constant -> string",
        "Expression_binary -> Generic_expression Expression_binary_symbol Generic_expression",
        "Expression_binary_symbol -> Expression_binary_symbol_add | Expression_binary_symbol_subtract | Expression_binary_symbol_multiply | Expression_binary_symbol_signed_divide | Expression_binary_symbol_unsigned_divide",
        "Expression_binary_symbol_add -> +",
        "Expression_binary_symbol_subtract -> +",
        "Expression_binary_symbol_multiply -> +",
        "Expression_binary_symbol_signed_divide -> /",
        "Expression_binary_symbol_unsigned_divide -> /",
        "Expression_return -> return",
        "Expression_return -> return Generic_expression",
        "Expression_variable -> Variable_name",
        "Expression_variable_declaration -> Expression_variable_mutability Variable_name = Generic_expression",
        "Expression_variable_mutability -> var",
        "Expression_variable_mutability -> mutable",
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
