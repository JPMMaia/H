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
        "Module_body -> ",
        "Module_body -> Declarations",
        "Declarations -> Declaration",
        "Declarations -> Declaration Declarations",
        "Declaration -> Alias",
        "Declaration -> Enum",
        "Declaration -> Struct",
        "Declaration -> Function",
        "Export -> export",
        "Export -> ",
        "Alias -> Export using Alias_name = Alias_type ;",
        "Alias_name -> identifier",
        "Enum -> Export enum Enum_name { }",
        "Enum_name -> identifier",
        "Struct -> Export struct Struct_name { }",
        "Struct_name -> identifier",
        "Function -> Export function Function_name { }",
        "Function_name -> identifier",
    ];
}
