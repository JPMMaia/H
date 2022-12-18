import * as core from "./coreModelInterface";
import { onThrowError } from "./errors";

export function get_module(module: core.Module, reference: core.Module_reference): core.Module {
    // TODO
    return module;
}

export interface FindDeclarationResult {
    index: number,
    isExportDeclaration: boolean
};

export function get_function_declaration(module: core.Module, result: FindDeclarationResult): core.Function_declaration {
    const declarations = result.isExportDeclaration ? module.export_declarations : module.internal_declarations;
    return declarations.function_declarations.elements[result.index];
}

export function find_function_declaration_index(module: core.Module, function_reference: core.Function_reference): FindDeclarationResult {
    if (module.name !== function_reference.module_reference.name) {
        throw Error("find_function_declaration is meant to be used to find a function in the module itself (not module dependencies)");
    }

    return findFunctionDeclarationIndexWithId(module, function_reference.function_id);
}

export function find_function_declaration(module: core.Module, function_reference: core.Function_reference): core.Function_declaration | undefined {
    if (module.name !== function_reference.module_reference.name) {
        throw Error("find_function_declaration is meant to be used to find a function in the module itself (not module dependencies)");
    }

    const result = find_function_declaration_index(module, function_reference);
    if (result.index === -1) {
        return undefined;
    }

    return get_function_declaration(module, result);
}

export function findElementIndexWithId(exportArray: any[], internalArray: any[], id: number): FindDeclarationResult {

    {
        const index = exportArray.findIndex(value => value.id === id);
        if (index !== -1) {
            return {
                index: index,
                isExportDeclaration: true
            };
        }
    }

    {
        const index = internalArray.findIndex(value => value.id === id);
        if (index !== -1) {
            return {
                index: index,
                isExportDeclaration: false
            };
        }
    }

    const message = "Could not find element!";
    onThrowError(message);
    throw Error(message);
}

export function findFunctionDeclarationIndexWithId(module: core.Module, functionId: number): FindDeclarationResult {

    {
        const index = module.export_declarations.function_declarations.elements.findIndex(value => value.id === functionId);
        if (index !== -1) {
            return { index: index, isExportDeclaration: true };
        }
    }

    {
        const index = module.internal_declarations.function_declarations.elements.findIndex(value => value.id === functionId);
        if (index !== -1) {
            return { index: index, isExportDeclaration: false };
        }
    }

    const message = "Could not find function declaration with ID " + functionId.toString();
    onThrowError(message);
    throw Error(message);
}

export function findFunctionDeclarationWithId(module: core.Module, id: number): core.Function_declaration {

    {
        const exportDeclaration = module.export_declarations.function_declarations.elements.find(value => value.id === id);
        if (exportDeclaration !== undefined) {
            return exportDeclaration;
        }
    }

    {
        const internalDeclaration = module.internal_declarations.function_declarations.elements.find(value => value.id === id);
        if (internalDeclaration !== undefined) {
            return internalDeclaration;
        }
    }

    const message = "Could not find function declaration with ID " + id.toString();
    onThrowError(message);
    throw Error(message);
}

export function findFunctionDefinitionWithId(module: core.Module, id: number): core.Function_definition {

    {
        const definition = module.definitions.function_definitions.elements.find(value => value.id === id);
        if (definition !== undefined) {
            return definition;
        }
    }

    const message = "Could not find function definition with ID " + id.toString();
    onThrowError(message);
    throw Error(message);
}

export function findElementWithId(arrays: any[][], id: number): any {
    for (const array of arrays) {
        const element = array.find(value => value.id === id);
        if (element !== undefined) {
            return element;
        }
    }

    const message = "Could not find element!";
    onThrowError(message);
    throw Error(message);
}

export function findAliasTypeDeclarationWithID(module: core.Module, id: number): core.Alias_type_declaration {
    const element: core.Alias_type_declaration = findElementWithId([module.export_declarations.alias_type_declarations.elements, module.internal_declarations.alias_type_declarations.elements], id);
    return element;
}

export function findEnumTypeDeclarationWithID(module: core.Module, id: number): core.Enum_declaration {
    const element: core.Enum_declaration = findElementWithId([module.export_declarations.enum_declarations.elements, module.internal_declarations.enum_declarations.elements], id);
    return element;
}

export function findStructDeclarationWithID(module: core.Module, id: number): core.Struct_declaration {
    const element: core.Struct_declaration = findElementWithId([module.export_declarations.struct_declarations.elements, module.internal_declarations.struct_declarations.elements], id);
    return element;
}

export function findModule(modules: core.Module[], reference: core.Module_reference): any {

    const module = modules.find(module => module.name === reference.name);
    if (module !== undefined) {
        return module;
    }

    const message = "Could not find element!";
    onThrowError(message);
    throw Error(message);
}

export function getUnderlyingTypeName(
    modules: core.Module[],
    typeReference: core.Type_reference
): string {

    switch (typeReference.data.type) {
        case core.Type_reference_enum.Alias_type_reference:
            {
                // @ts-ignore
                const value: core.Alias_type_reference = typeReference.data.value;
                const module = findModule(modules, value.module_reference);
                const declaration = findAliasTypeDeclarationWithID(module, value.id);
                return `${module.name}.${declaration.name}`;
            }
        case core.Type_reference_enum.Builtin_type_reference:
            {
                // @ts-ignore
                const value: core.Builtin_type_reference = typeReference.data.value;
                return value.value;
            }
        case core.Type_reference_enum.Constant_array_type:
            {
                // @ts-ignore
                const value: core.Constant_array_type = typeReference.data.value;
                const valueTypeName = getUnderlyingTypeName(modules, value.value_type.elements[0]);
                return `${valueTypeName}[${value.size}]`;
            }
        case core.Type_reference_enum.Enum_type_reference:
            {
                // @ts-ignore
                const value: core.Enum_type_reference = typeReference.data.value;
                const module = findModule(modules, value.module_reference);
                const declaration = findEnumTypeDeclarationWithID(module, value.id);
                return `${module.name}.${declaration.name}`;
            }
        case core.Type_reference_enum.Fundamental_type:
            {
                // @ts-ignore
                const value: core.Fundamental_type = typeReference.data.value;
                return value.toString();
            }
        case core.Type_reference_enum.Function_type:
            {
                // @ts-ignore
                const value: core.Function_type = typeReference.data.value;
                const parameterNames = value.input_parameter_types.elements.map(value => getUnderlyingTypeName(modules, value));
                const parameterNamesPlusVariadic = value.is_variadic ? parameterNames.concat("...") : parameterNames;
                const parametersString = "(" + parameterNamesPlusVariadic.join(", ") + ")";
                const returnTypeNames = value.output_parameter_types.elements.map(value => getUnderlyingTypeName(modules, value));
                const returnTypesString = "(" + returnTypeNames.join(", ") + ")";
                return `${parametersString} -> ${returnTypesString}`;
            }
        case core.Type_reference_enum.Integer_type:
            {
                // @ts-ignore
                const value: core.Integer_type = typeReference.data.value;
                return (value.is_signed ? "Int" : "Uint") + value.number_of_bits.toString();
            }
        case core.Type_reference_enum.Pointer_type:
            {
                // @ts-ignore
                const value: core.Pointer_type = typeReference.data.value;
                const valueTypeName = value.element_type.elements.length === 0 ? "void" : getUnderlyingTypeName(modules, value.element_type.elements[0]);
                const mutableKeyword = value.is_mutable ? " mutable" : "";
                return `${valueTypeName}${mutableKeyword}*`;
            }
        case core.Type_reference_enum.Struct_type_reference:
            {
                // @ts-ignore
                const value: core.Struct_type_reference = typeReference.data.value;
                const module = findModule(modules, value.module_reference);
                const declaration = findStructDeclarationWithID(module, value.id);
                return `${module.name}.${declaration.name}`;
            }
    }

    const message = "getUnderlyingTypeName() not implemented for " + typeReference;
    onThrowError(message);
    throw Error(message);
}

export interface TypeWithIdAndName {
    id: number;
    name: string;
}

export interface OtherTypes {
    aliasTypes: TypeWithIdAndName[];
    enumTypes: TypeWithIdAndName[];
    structTypes: TypeWithIdAndName[];
}

export function getVisibleOtherTypesForModule(module: core.Module): OtherTypes {

    const createAliasEntry = (value: TypeWithIdAndName): TypeWithIdAndName => {
        return {
            id: value.id,
            name: value.name
        };
    };

    const aliasTypes = [
        ...module.export_declarations.alias_type_declarations.elements.map(createAliasEntry),
        ...module.internal_declarations.alias_type_declarations.elements.map(createAliasEntry)
    ];

    const createEnumEntry = (value: TypeWithIdAndName): TypeWithIdAndName => {
        return {
            id: value.id,
            name: value.name
        };
    };

    const enumTypes = [
        ...module.export_declarations.enum_declarations.elements.map(createEnumEntry),
        ...module.internal_declarations.enum_declarations.elements.map(createEnumEntry)
    ];

    const createStructEntry = (value: TypeWithIdAndName): TypeWithIdAndName => {
        return {
            id: value.id,
            name: value.name
        };
    };

    const structTypes = [
        ...module.export_declarations.struct_declarations.elements.map(createStructEntry),
        ...module.internal_declarations.struct_declarations.elements.map(createStructEntry)
    ];

    return {
        aliasTypes: aliasTypes,
        enumTypes: enumTypes,
        structTypes: structTypes
    };
}

export interface FunctionParameterInfo {
    index: number,
    id: number,
    name: string,
    type: core.Type_reference
}

export function get_declarations_vector(declarations: core.Module_declarations, vector_name: string): core.Vector<any> {

    if (vector_name === "alias_type_declarations" || vector_name === "enum_declarations" || vector_name === "struct_declarations" || vector_name === "function_declarations") {
        return declarations[vector_name];
    }
    else {
        const message = "Invalid '" + vector_name + "' declarations array";
        onThrowError(message);
        throw Error(message);
    }
}

export function get_position_of_vector_element(module: core.Module, id: number): any[] | undefined {

    const declaration_names = [
        "export_declarations",
        "internal_declarations"
    ];

    const vector_names = [
        "alias_type_declarations",
        "enum_declarations",
        "struct_declarations",
        "function_declarations"
    ];

    for (const declaration_name of declaration_names) {
        for (const vector_name of vector_names) {
            // @ts-ignore
            const index = module[declaration_name][vector_name].elements.findIndex(value => value.id === id);
            if (index !== -1) {
                return [declaration_name, vector_name, "elements", index];
            }
        }
    }

    return undefined;
}

export function is_return_statement_with_variable_declaration(module: core.Module, statement: core.Statement): boolean {

    if (statement.expressions.elements.length === 0) {
        return false;
    }

    const first_expression = statement.expressions.elements[0];

    return first_expression.data.type === core.Expression_enum.Return_expression;
}

export function is_statement_with_variable_declaration(module: core.Module, function_declaration: core.Function_declaration, statements: core.Statement[], statement: core.Statement): boolean {

    const type_reference = get_type_of_statement(module, function_declaration, statements, statement);
    if (type_reference === undefined) {
        return false;
    }

    return type_reference.length > 0;
}

export function get_type_of_function_input_parameter(function_declaration: core.Function_declaration, input_parameter_id: number): core.Type_reference | undefined {
    const parameter_index = function_declaration.input_parameter_ids.elements.findIndex(id => id === input_parameter_id);
    if (parameter_index === -1) {
        return undefined;
    }

    return function_declaration.type.input_parameter_types.elements[parameter_index];
}

export function get_type_of_function_output_parameter(function_declaration: core.Function_declaration, output_parameter_id: number): core.Type_reference | undefined {
    const parameter_index = function_declaration.output_parameter_ids.elements.findIndex(id => id === output_parameter_id);
    if (parameter_index === -1) {
        return undefined;
    }

    return function_declaration.type.output_parameter_types.elements[parameter_index];
}

export function get_type_of_expression(module: core.Module, function_declaration: core.Function_declaration, statements: core.Statement[], expressions: core.Expression[], expression: core.Expression): core.Type_reference[] | undefined {

    if (expression.data.type === core.Expression_enum.Invalid_expression || expression.data.type === core.Expression_enum.Return_expression) {
        return undefined;
    }

    if (expression.data.type === core.Expression_enum.Binary_expression) {
        const binary_expression = expression.data.value as core.Binary_expression;
        const left_hand_side_expression = expressions[binary_expression.left_hand_side.expression_index];
        return get_type_of_expression(module, function_declaration, statements, expressions, left_hand_side_expression);
    }
    else if (expression.data.type === core.Expression_enum.Call_expression) {
        const call_expression = expression.data.value as core.Call_expression;
        const call_function_module = get_module(module, call_expression.function_reference.module_reference);
        const call_function_declaration = find_function_declaration(call_function_module, call_expression.function_reference);
        if (call_function_declaration !== undefined) {
            if (call_function_declaration.output_parameter_ids.elements.length > 1) {
                throw Error("TODO implement");
            }

            if (call_function_declaration.output_parameter_ids.elements.length === 0) {
                return [];
            }

            return [call_function_declaration.type.output_parameter_types.elements[0]];
        }
    }
    else if (expression.data.type === core.Expression_enum.Constant_expression) {
        const constant_expression = expression.data.value as core.Constant_expression;
        return [
            {
                data: {
                    type: core.Type_reference_enum.Fundamental_type,
                    value: constant_expression.type
                }
            }
        ];
    }
    else if (expression.data.type === core.Expression_enum.Variable_expression) {
        const variable_expression = expression.data.value as core.Variable_expression;
        if (variable_expression.type === core.Variable_expression_type.Function_argument) {
            const input_parameter_type = get_type_of_function_input_parameter(function_declaration, variable_expression.id);
            if (input_parameter_type !== undefined) {
                return [input_parameter_type];
            }
        }
        else if (variable_expression.type === core.Variable_expression_type.Local_variable) {
            const statement = statements.find(statement => statement.id === variable_expression.id);
            if (statement !== undefined) {
                return get_type_of_statement(module, function_declaration, statements, statement);
            }
        }
    }

    return undefined;
}

export function get_type_of_statement(module: core.Module, function_declaration: core.Function_declaration, statements: core.Statement[], statement: core.Statement): core.Type_reference[] | undefined {

    if (statement.expressions.elements.length === 0) {
        return undefined;
    }

    const first_expression = statement.expressions.elements[0];

    return get_type_of_expression(module, function_declaration, statements, statement.expressions.elements, first_expression);
}