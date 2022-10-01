import * as core from "./coreModelInterface";
import { onThrowError } from "./errors";

export interface FindFunctionDeclarationResult {
    index: number,
    isExportDeclaration: boolean
};

export function findFunctionDeclarationIndexWithId(module: core.Module, functionId: number): FindFunctionDeclarationResult {

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

export function getUnderlyingTypeName(
    module: core.Module,
    typeReference: core.Type_reference
): string {

    switch (typeReference.data.type) {
        case core.Type_reference_enum.Alias_type_reference:
            break;
        case core.Type_reference_enum.Builtin_type_reference:
            break;
        case core.Type_reference_enum.Constant_array_type:
            break;
        case core.Type_reference_enum.Enum_type_reference:
            break;
        case core.Type_reference_enum.Fundamental_type:
            {
                // @ts-ignore
                const value: core.Fundamental_type = typeReference.data.value;
                return value.toString();
            }
        case core.Type_reference_enum.Function_type:
            break;
        case core.Type_reference_enum.Integer_type:
            {
                // @ts-ignore
                const value: core.Integer_type = typeReference.data.value;
                return (value.is_signed ? "Int" : "Uint") + value.number_of_bits.toString();
            }
        case core.Type_reference_enum.Pointer_type:
            break;
        case core.Type_reference_enum.Struct_type_reference:
            break;
    }

    const message = "getUnderlyingType() not implemented for " + typeReference;
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
