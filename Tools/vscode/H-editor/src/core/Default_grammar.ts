export function create_description(): string[] {
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
