import { onThrowError } from './errors';
import * as hCoreReflectionInfo from './h_core_reflection.json';

export interface ReflectionEnum {
    name: string;
    values: string[];
}

export interface ReflectionType {
    name: string;
}

export interface ReflectionStructMember {
    name: string;
    type: ReflectionType;
}

export interface ReflectionStruct {
    name: string;
    members: ReflectionStructMember[];
}

export interface ReflectionInfo {
    enums: ReflectionEnum[];
    structs: ReflectionStruct[];
}

export function isVectorType(type: ReflectionType): boolean {
    return type.name.startsWith("std::vector") || type.name.startsWith("std::pmr::vector");
}

export function getVectorValueType(type: ReflectionType): ReflectionType {
    const beginIndex = type.name.indexOf("<") + 1;
    const endIndex = type.name.lastIndexOf(">");

    const typeName = type.name.substring(beginIndex, endIndex);

    return { name: typeName };
}

export function isVariantType(type: ReflectionType): boolean {
    return type.name.startsWith("std::variant");
}

export function isVariantEnumType(type: ReflectionType): boolean {
    return type.name.startsWith("std::variant") && type.name.endsWith("::Types");
}

export function getVariantValueTypes(type: ReflectionType): ReflectionType[] {
    const beginIndex = type.name.indexOf("<") + 1;
    const endIndex = type.name.lastIndexOf(">");

    const concatenatedTypes = type.name.substring(beginIndex, endIndex);
    const typeNames = concatenatedTypes.split(",");

    const types = typeNames.map(function (name): ReflectionType { return { name: name }; });
    return types;
}

export function isBooleanType(type: ReflectionType): boolean {
    return type.name === "bool";
}

export function isIntegerType(type: ReflectionType): boolean {
    switch (type.name) {
        case "std::uint8_t":
        case "std::uint16_t":
        case "std::uint32_t":
        case "std::uint64_t":
        case "std::int8_t":
        case "std::int16_t":
        case "std::int32_t":
        case "std::int64_t":
            return true;
        default:
            return false;
    }
}

export function isStringType(type: ReflectionType): boolean {
    return type.name === "std::string" || type.name === "std::pmr::string";
}

export function getEnumType(enums: ReflectionEnum[], type: ReflectionType): ReflectionEnum {
    const match = enums.find(value => value.name === type.name);
    if (match === undefined) {
        const message = "Could not find enum " + type.name;
        onThrowError(message);
        throw Error(message);
    }
    return match;
}

export function isEnumType(enums: ReflectionEnum[], type: ReflectionType): boolean {
    const match = enums.find(value => value.name === type.name);
    return match !== undefined;
}

export function isStructType(structs: ReflectionStruct[], type: ReflectionType): boolean {
    const match = structs.find(value => value.name === type.name);
    return match !== undefined;
}

export function getStructType(structs: ReflectionStruct[], type: ReflectionType): ReflectionStruct {
    const match = structs.find(value => value.name === type.name);
    if (match === undefined) {
        const message = "Could not find struct " + type.name;
        onThrowError(message);
        throw Error(message);
    }
    return match;
}

export function findTypeReflection(reflectionInfo: ReflectionInfo, position: any[]): ReflectionType {

    const module = reflectionInfo.structs.find(value => value.name === "Module");
    if (module === undefined) {
        const message = "Could not find reflection info of Module!";
        onThrowError(message);
        throw Error(message);
    }

    let currentStruct = module;

    for (let positionIndex = 0; positionIndex < position.length; ++positionIndex) {

        const currentPosition = position[positionIndex];

        if (currentPosition === "elements") {

            positionIndex += 1;
            continue;
        }

        const member = currentStruct.members.find(member => member.name === currentPosition);
        if (member === undefined) {
            const message = "Reflection data of " + currentPosition + " not found in " + currentStruct.name;
            onThrowError(message);
            throw Error(message);
        }

        if (isVectorType(member.type)) {
            const valueType = getVectorValueType(member.type);

            if (isIntegerType(valueType) || isStringType(valueType) || isEnumType(reflectionInfo.enums, valueType)) {
                return valueType;
            }

            const memberTypeReflectionInfo = reflectionInfo.structs.find(value => value.name === valueType.name);
            if (memberTypeReflectionInfo === undefined) {
                const message = "Could not find reflection data of " + member.type.name;
                onThrowError(message);
                throw Error(message);
            }

            currentStruct = memberTypeReflectionInfo;
        }
        else if (isVariantType(member.type)) {
            const message = "Not implemented yet!";
            onThrowError(message);
            throw Error(message);
        }
        else {
            const memberTypeReflectionInfo = reflectionInfo.structs.find(value => value.name === member.type.name);
            if (memberTypeReflectionInfo === undefined) {
                const message = "Could not find reflection data of " + member.type.name;
                onThrowError(message);
                throw Error(message);
            }

            currentStruct = memberTypeReflectionInfo;
        }
    }

    return currentStruct;
}

export function createDefaultValue(reflectionInfo: ReflectionInfo, type: ReflectionType): any {
    if (isIntegerType(type)) {
        return 0;
    }
    else if (isBooleanType(type)) {
        return false;
    }
    else if (isStringType(type)) {
        return "";
    }
    else if (isVectorType(type)) {
        return { size: 0, elements: [] };
    }
    else if (isVariantType(type)) {
        const types = getVariantValueTypes(type);
        const defaultType = types[0];
        const defaultValue = createDefaultValue(reflectionInfo, defaultType);
        return { type: defaultType.name.toLowerCase(), value: defaultValue };
    }
    else if (isEnumType(reflectionInfo.enums, type)) {
        const enumReflection = getEnumType(reflectionInfo.enums, type);
        return enumReflection.values[0].toLowerCase();
    }
    else { // If struct
        const structReflection = getStructType(reflectionInfo.structs, type);
        let object: any = {};
        for (const member of structReflection.members) {
            object[member.name] = createDefaultValue(reflectionInfo, member.type);
        }
        return object;
    }

}

export function createDefaultElement(reflectionInfo: ReflectionInfo, position: any[]): any {

    const typeReflection = findTypeReflection(reflectionInfo, position);

    const object = createDefaultValue(reflectionInfo, typeReflection);

    return object;
}

export function createEmptyModule(reflectionInfo: ReflectionInfo): any {
    return createDefaultValue(reflectionInfo, { name: "Module" });
}

export function createReflectionInfo(): ReflectionInfo {
    const reflectionInfo = { enums: hCoreReflectionInfo.enums, structs: hCoreReflectionInfo.structs };
    return reflectionInfo;
}
