
import * as Core from "../utilities/coreModelInterface";
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

export enum Symbol_or_block_type {
    Block,
    Symbol
}

export interface Symbol_or_block {
    type: Symbol_or_block_type;
    value: Symbol | Block;
}

export interface Block {
    symbols: Symbol_or_block[];
}

export interface Function_definition {
    id: number;
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
                    id: -1,
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

            const main_block_symbols = statements_that_declarare_variables.map((statement): Symbol_or_block => { return { type: Symbol_or_block_type.Symbol, value: { id: statement.id, type: Type.Variable_declaration, name: statement.name } }; });

            return {
                id: declaration.id,
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

function find_symbol(database: Edit_module_database, get_symbols_array: (declarations: Declarations) => Symbol[], predicate: (module_name: string, symbol: Symbol) => boolean): Symbol | undefined {

    {
        const module_symbols: Symbol[][] = [
            get_symbols_array(database.internal_declarations),
            get_symbols_array(database.export_declarations)
        ];

        for (const symbols of module_symbols) {
            const found = symbols.find(symbol => predicate("", symbol));
            if (found !== undefined) {
                return found;
            }
        }
    }

    for (const import_module of database.import_modules.export_declarations) {
        const imported_symbols = get_symbols_array(import_module.export_declarations);

        const found = imported_symbols.find(symbol => predicate(import_module.module_name, symbol));
        if (found !== undefined) {
            return found;
        }
    }

    for (const import_module of database.import_modules.export_modules) {
        const imported_symbols = get_symbols_array(import_module.export_declarations);

        const found = imported_symbols.find(symbol => predicate(import_module.alias_name, symbol));
        if (found !== undefined) {
            return {
                id: found.id,
                type: found.type,
                name: import_module.alias_name + "." + found.name
            };
        }
    }

    return undefined;
}

function find_alias_symbol(database: Edit_module_database, predicate: (module_name: string, symbol: Symbol) => boolean): Symbol | undefined {
    return find_symbol(database, declarations => declarations.alias, predicate);
}

function find_enum_type_symbol(database: Edit_module_database, predicate: (module_name: string, symbol: Symbol) => boolean): Symbol | undefined {
    return find_symbol(database, declarations => declarations.enums, predicate);
}

function find_struct_type_symbol(database: Edit_module_database, predicate: (module_name: string, symbol: Symbol) => boolean): Symbol | undefined {
    return find_symbol(database, declarations => declarations.structs, predicate);
}

function format_type_name(module_name: string, type_name: string): string {
    return module_name !== "" ? `${module_name}.${type_name}` : type_name;
}

export function find_type_name(database: Edit_module_database, type_reference: Core.Type_reference[]): string | undefined {

    if (type_reference.length === 0) {
        return "void";
    }

    const type = type_reference[0];

    switch (type.data.type) {
        case Core.Type_reference_enum.Alias_type_reference:
            {
                // @ts-ignore
                const value: Core.Alias_type_reference = type.data.value;

                const symbol = find_alias_symbol(database, (module_name, symbol) => value.module_reference.name === module_name && symbol.id === value.id);
                if (symbol !== undefined) {
                    return format_type_name(value.module_reference.name, symbol.name);
                }
            }
        case Core.Type_reference_enum.Builtin_type_reference:
            {
                // @ts-ignore
                const value: Core.Builtin_type_reference = type.data.value;
                return value.value;
            }
        case Core.Type_reference_enum.Constant_array_type:
            {
                // @ts-ignore
                const value: Core.Constant_array_type = type.data.value;
                const value_type_name = find_type_name(database, value.value_type.elements);
                return `${value_type_name}[${value.size}]`;
            }
        case Core.Type_reference_enum.Enum_type_reference:
            {
                // @ts-ignore
                const value: Core.Enum_type_reference = type.data.value;

                const symbol = find_enum_type_symbol(database, (module_name, symbol) => value.module_reference.name === module_name && symbol.id === value.id);
                if (symbol !== undefined) {
                    return format_type_name(value.module_reference.name, symbol.name);
                }
            }
        case Core.Type_reference_enum.Fundamental_type:
            {
                // @ts-ignore
                const value: Core.Fundamental_type = type.data.value;
                return value.toString();
            }
        case Core.Type_reference_enum.Function_type:
            {
                // @ts-ignore
                const value: Core.Function_type = type.data.value;
                const parameterNames = value.input_parameter_types.elements.map(value => find_type_name(database, [value]));
                const parameterNamesPlusVariadic = value.is_variadic ? parameterNames.concat("...") : parameterNames;
                const parametersString = "(" + parameterNamesPlusVariadic.join(", ") + ")";
                const returnTypeNames = value.output_parameter_types.elements.map(value => find_type_name(database, [value]));
                const returnTypesString = "(" + returnTypeNames.join(", ") + ")";
                return `${parametersString} -> ${returnTypesString}`;
            }
        case Core.Type_reference_enum.Integer_type:
            {
                // @ts-ignore
                const value: Core.Integer_type = type.data.value;
                return (value.is_signed ? "Int" : "Uint") + value.number_of_bits.toString();
            }
        case Core.Type_reference_enum.Pointer_type:
            {
                // @ts-ignore
                const value: Core.Pointer_type = type.data.value;

                const value_type_name = find_type_name(database, value.element_type.elements);
                const mutable_keyword = value.is_mutable ? " mutable" : "";
                return `${value_type_name}${mutable_keyword}*`;
            }
        case Core.Type_reference_enum.Struct_type_reference:
            {
                // @ts-ignore
                const value: Core.Struct_type_reference = type.data.value;

                const symbol = find_struct_type_symbol(database, (module_name, symbol) => value.module_reference.name === module_name && symbol.id === value.id);
                if (symbol !== undefined) {
                    return format_type_name(value.module_reference.name, symbol.name);
                }
            }
    }

    const message = "find_type() not implemented for " + type;
    onThrowError(message);
    throw Error(message);
}

export function find_statement_symbol(database: Edit_module_database, function_declaration: Core.Function_declaration, statements: Core.Statement[], statement_index: number): Symbol | undefined {

    const statement = statements[statement_index];

    const definition_symbols = database.function_definitions.find(value => value.id === function_declaration.id);

    if (definition_symbols !== undefined) {
        return find_statement_symbol_in_block(statement.id, definition_symbols.main_block);
    }

    return undefined;
}

function find_statement_symbol_in_block(statement_id: number, block: Block): Symbol | undefined {
    for (const symbol_or_block of block.symbols) {

        if (symbol_or_block.type === Symbol_or_block_type.Block) {
            return find_statement_symbol_in_block(statement_id, symbol_or_block.value as Block);
        }
        else {
            const symbol = symbol_or_block.value as Symbol;
            if (symbol.id === statement_id) {
                return symbol;
            }
        }
    }

    return undefined;
}

export function find_variable_symbol(database: Edit_module_database, function_declaration: Core.Function_declaration, statements: Core.Statement[], statement_index: number, variable: Core.Variable_expression): Symbol | undefined {

    const definition_symbols = database.function_definitions.find(value => value.id === function_declaration.id);

    if (definition_symbols !== undefined) {
        if (variable.type === Core.Variable_expression_type.Function_argument) {
            const parameter = definition_symbols.input_parameters.find(parameter => parameter.id === variable.id);
            if (parameter !== undefined) {
                return parameter;
            }
        }
        else if (variable.type === Core.Variable_expression_type.Local_variable) {
            const statement = statements[statement_index];
            return find_statement_symbol_in_block(statement.id, definition_symbols.main_block);
        }
    }

    return undefined;
}
