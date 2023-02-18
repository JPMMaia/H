
import type * as Core from "../utilities/coreModelInterface";
import * as Change from "../utilities/Change";
import { onThrowError } from "../utilities/errors";

export enum Type {
    Alias_type,
    Enum_type,
    Function_declaration,
    Struct_type,
    Type_reference,
    Variable_declaration,
    Variable_reference,
    Constant,
    Operation,
    Other
}

export interface Symbol {
    id: number;
    type: Type;
    name: string;
}

export interface Block {
    symbols: (Symbol | Block)[];
}

export interface Function_definition {
    input_parameters: Symbol[];
    output_parameters: Symbol[];
    main_block: Block;
}

export interface Declarations {
    alias: Symbol[];
    enums: Symbol[];
    functions: Symbol[];
    structs: Symbol[];
}

export interface Import_export_module_dependency {
    module_name: string;
    export_declarations: Declarations;
    export_module_dependencies: Import_export_module_dependency[];
}

export interface Import_module_with_alias {
    module_name: string;
    alias_name: string;
    export_declarations: Declarations;
    export_module_dependencies: Import_export_module_dependency[];
}

export interface Import_declaration {
    module_name: string;
    export_declarations: Declarations;
}

export interface Import_modules {
    export_modules: Import_module_with_alias[];
    export_declarations: Import_declaration[];
}

export interface Edit_module_database {
    available_modules: string[];
    import_modules: Import_modules;
    export_declarations: Declarations;
    internal_declarations: Declarations;
    function_definitions: Function_definition[];
}

function create_declarations(declarations: Core.Module_declarations): Declarations {
    const alias_symbols = declarations.alias_type_declarations.elements.map((declaration): Symbol => { return { id: declaration.id, type: Type.Alias_type, name: declaration.name }; });
    const enum_symbols = declarations.enum_declarations.elements.map((declaration): Symbol => { return { id: declaration.id, type: Type.Enum_type, name: declaration.name }; });
    const function_symbols = declarations.function_declarations.elements.map((declaration): Symbol => { return { id: declaration.id, type: Type.Function_declaration, name: declaration.name }; });
    const struct_symbols = declarations.struct_declarations.elements.map((declaration): Symbol => { return { id: declaration.id, type: Type.Struct_type, name: declaration.name }; });

    return {
        alias: alias_symbols,
        enums: enum_symbols,
        functions: function_symbols,
        structs: struct_symbols
    };
}

function create_function_definition_symbols(function_declarations: Core.Function_declaration[], function_definitions: Core.Function_definition[]): Function_definition[] {

    const function_definitions_symbols = function_definitions.map(
        (definition): Function_definition => {
            const declaration = function_declarations.find(value => value.id === definition.id);
            if (declaration === undefined) {
                const message = "Could not resolve function declaration with id: " + definition.id;
                onThrowError(message);
                return {
                    input_parameters: [],
                    output_parameters: [],
                    main_block: {
                        symbols: []
                    }
                };
            }

            const input_parameter_symbols = declaration.input_parameter_names.elements.map((value, index): Symbol => { return { id: declaration.input_parameter_ids.elements[index], type: Type.Variable_declaration, name: value }; });
            const output_parameter_symbols = declaration.output_parameter_names.elements.map((value, index): Symbol => { return { id: declaration.output_parameter_ids.elements[index], type: Type.Variable_declaration, name: value }; });

            const statements_that_declarare_variables = definition.statements.elements.filter(statement => statement.name !== "");

            const main_block_symbols = statements_that_declarare_variables.map((statement): Symbol => { return { id: statement.id, type: Type.Variable_declaration, name: statement.name }; });

            return {
                input_parameters: input_parameter_symbols,
                output_parameters: output_parameter_symbols,
                main_block: {
                    symbols: main_block_symbols
                }
            };
        }
    );

    return function_definitions_symbols;
}

export function create_edit_database(module: Core.Module): Edit_module_database {

    const export_declarations = create_declarations(module.export_declarations);
    const internal_declarations = create_declarations(module.internal_declarations);
    const function_definitions = create_function_definition_symbols([...module.export_declarations.function_declarations.elements, ...module.internal_declarations.function_declarations.elements], module.definitions.function_definitions.elements);

    return {
        available_modules: [],
        import_modules: {
            export_modules: [],
            export_declarations: []
        },
        export_declarations: export_declarations,
        internal_declarations: internal_declarations,
        function_definitions: function_definitions
    };
}

function is_vector_inside_declarations(position: any[]): boolean {
    return position.length === 2 && ((position[0] === "export_declarations") || (position[0] === "internal_declarations"));
}

export function update_edit_database(database: Edit_module_database, module: Core.Module, new_change_hierarchy: Change.Hierarchy): void {

    // Needs to sync with:
    // - add/delete alias/enum/function/struct
    // - add/delete input/output function parameters
    // - add/delete statement
    // - add/delete expression

    const new_changes = Change.flatten_changes(new_change_hierarchy);

    for (const pair of new_changes) {
        const position = pair.position;
        const change = pair.change;

        if (change.type === Change.Type.Add_element_to_vector && is_vector_inside_declarations(position)) {
            const change_data = change.value as Change.Add_element_to_vector;
        }
    }

    // TODO
}

export function find_function_symbol(database: Edit_module_database, id: number): Symbol | undefined {
    {
        const location = database.export_declarations.functions.find(value => value.id === id);
        if (location !== undefined) {
            return location;
        }
    }

    {
        const location = database.internal_declarations.functions.find(value => value.id === id);
        if (location !== undefined) {
            return location;
        }
    }

    return undefined;
}

export function find_type_symbol(database: Edit_module_database, type_reference: Core.Type_reference[]): Symbol {
    throw Error("Not implemented!");
    return {
        id: 0,
        type: Type.Variable_reference,
        name: ""
    };
}

export function find_statement_symbol(database: Edit_module_database, function_declaration: Core.Function_declaration, statements: Core.Statement[], statement_index: number): Symbol | undefined {
    throw Error("Not implemented!");
    return {
        id: 0,
        type: Type.Variable_reference,
        name: ""
    };
}

export function find_variable_symbol(database: Edit_module_database, function_declaration: Core.Function_declaration, statements: Core.Statement[], statement_index: number, variable: Core.Variable_expression): Symbol {
    throw Error("Not implemented!");
    return {
        id: 0,
        type: Type.Variable_reference,
        name: ""
    };
}
