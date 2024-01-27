import * as Core from "./Core_interface";

export interface Function {
    declaration: Core.Function_declaration;
    definition: Core.Function_definition;
}

export enum Declaration_type {
    Alias,
    Enum,
    Function,
    Struct
}

export interface Declaration {
    type: Declaration_type;
    is_export: boolean;
    value: Core.Alias_type_declaration | Core.Enum_declaration | Function | Core.Struct_declaration
}

export interface Module {
    name: string;
    imports: Core.Import_module_with_alias[];
    declarations: Declaration[];
}

export function create_intermediate_representation(core_module: Core.Module): Module {

    const imports = core_module.dependencies.alias_imports.elements;
    const declarations = create_declarations(core_module);

    return {
        name: core_module.name,
        imports: imports,
        declarations: declarations
    };
}

function create_declarations(module: Core.Module): Declaration[] {

    const declarations: Declaration[] = [
        ...module.export_declarations.alias_type_declarations.elements.map((value, index): Declaration => { return { type: Declaration_type.Alias, is_export: true, value: value }; }),
        ...module.export_declarations.enum_declarations.elements.map((value, index): Declaration => { return { type: Declaration_type.Enum, is_export: true, value: value }; }),
        ...module.export_declarations.function_declarations.elements.map((value, index): Declaration => { return { type: Declaration_type.Function, is_export: true, value: create_function_value(module, value) }; }),
        ...module.export_declarations.struct_declarations.elements.map((value, index): Declaration => { return { type: Declaration_type.Struct, is_export: true, value: value }; }),
        ...module.internal_declarations.alias_type_declarations.elements.map((value, index): Declaration => { return { type: Declaration_type.Alias, is_export: false, value: value }; }),
        ...module.internal_declarations.enum_declarations.elements.map((value, index): Declaration => { return { type: Declaration_type.Enum, is_export: false, value: value }; }),
        ...module.internal_declarations.function_declarations.elements.map((value, index): Declaration => { return { type: Declaration_type.Function, is_export: false, value: create_function_value(module, value) }; }),
        ...module.internal_declarations.struct_declarations.elements.map((value, index): Declaration => { return { type: Declaration_type.Struct, is_export: false, value: value }; }),
    ];

    return declarations;
}

function create_function_value(module: Core.Module, declaration: Core.Function_declaration): Function {

    const definition_index = module.definitions.function_definitions.elements.findIndex(value => value.name === declaration.name);
    const definition = module.definitions.function_definitions.elements[definition_index];

    const value: Function = {
        declaration: declaration,
        definition: definition
    };

    return value;
}

export function create_core_module(module: Module, language_version: Core.Language_version): Core.Module {

    const alias_imports = module.imports;

    const export_alias: Core.Alias_type_declaration[] = [];
    const internal_alias: Core.Alias_type_declaration[] = [];
    const export_enums: Core.Enum_declaration[] = [];
    const internal_enums: Core.Enum_declaration[] = [];
    const export_functions: Core.Function_declaration[] = [];
    const internal_functions: Core.Function_declaration[] = [];
    const export_structs: Core.Struct_declaration[] = [];
    const internal_structs: Core.Struct_declaration[] = [];
    const function_definitions: Core.Function_definition[] = [];

    for (const declaration of module.declarations) {
        switch (declaration.type) {
            case Declaration_type.Alias: {
                const array = declaration.is_export ? export_alias : internal_alias;
                array.push(declaration.value as Core.Alias_type_declaration);
                break;
            }
            case Declaration_type.Enum: {
                const array = declaration.is_export ? export_enums : internal_enums;
                array.push(declaration.value as Core.Enum_declaration);
                break;
            }
            case Declaration_type.Function: {
                const array = declaration.is_export ? export_functions : internal_functions;
                const function_value = declaration.value as Function;
                array.push(function_value.declaration);
                function_definitions.push(function_value.definition);
                break;
            }
            case Declaration_type.Struct: {
                const array = declaration.is_export ? export_structs : internal_structs;
                array.push(declaration.value as Core.Struct_declaration);
                break;
            }
        }
    }

    return {
        language_version: language_version,
        name: module.name,
        dependencies: {
            alias_imports: {
                size: alias_imports.length,
                elements: alias_imports
            }
        },
        export_declarations: {
            alias_type_declarations: {
                size: export_alias.length,
                elements: export_alias
            },
            enum_declarations: {
                size: export_enums.length,
                elements: export_enums
            },
            function_declarations: {
                size: export_functions.length,
                elements: export_functions
            },
            struct_declarations: {
                size: export_structs.length,
                elements: export_structs
            },
        },
        internal_declarations: {
            alias_type_declarations: {
                size: internal_alias.length,
                elements: internal_alias
            },
            enum_declarations: {
                size: internal_enums.length,
                elements: internal_enums
            },
            function_declarations: {
                size: internal_functions.length,
                elements: internal_functions
            },
            struct_declarations: {
                size: internal_structs.length,
                elements: internal_structs
            },
        },
        definitions: {
            function_definitions: {
                size: function_definitions.length,
                elements: function_definitions
            }
        }
    };
}