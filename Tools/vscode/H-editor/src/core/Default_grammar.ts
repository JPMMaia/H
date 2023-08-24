export function create_description(): string[] {
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
