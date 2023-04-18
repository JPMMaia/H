function create_description(): string[] {
    return [
        "Start -> Module",
        "Module -> Module_head Module_body",
        "Module -> Module_head",
        "Module_head -> Module_declaration",
        "Module_declaration -> module Identifier ;",
        "Module_body -> Function",
        "Module_body -> Struct",
        "Function -> Function_declaration Function_definition"
    ];
}
