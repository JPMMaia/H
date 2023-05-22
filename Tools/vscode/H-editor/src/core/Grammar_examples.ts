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
        "Module_head -> Module_declaration",
        "Module_declaration -> module Module_name ;",
        "Module_name -> identifier",
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
        "Enum -> Export enum Enum_name { }",
        "Enum_name -> identifier",
        "Struct -> Export struct Struct_name { }",
        "Struct_name -> identifier",
        "Function -> Function_declaration Function_definition",
        "Function_declaration -> Export function Function_name ( Function_input_parameters ) -> ( Function_output_parameters )",
        "Function_input_parameters -> Function_parameter , $0_or_more",
        "Function_output_parameters -> Function_parameter $0_or_more",
        "Function_parameter -> Function_parameter_name : Function_parameter_type",
        "Function_parameter_name -> identifier",
        "Function_parameter_type -> identifier",
        "Function_definition -> { }",
        "Function_name -> identifier",
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