import { getEnumType, getStructType, getVariantValueTypes, getVectorValueType, isEnumType, isStructType, isVariantType, isVectorType, type ReflectionInfo, type ReflectionType } from "../../../src/utilities/coreModel";

export enum ViewType {
    Standard,
    ReadOnly,
    ValueSelect
}

export interface ViewOptions {
    type: ViewType,
    possibleValues: string[]
}

export interface ViewOptionsHierarchy {
    key: string,
    options: ViewOptions,
    children: ViewOptionsHierarchy[]
}

function createViewOptionsHierarchyAuxiliary(name: string, reflectionInfo: ReflectionInfo, type: ReflectionType): ViewOptionsHierarchy {

    if (isStructType(reflectionInfo.structs, type)) {
        const struct = getStructType(reflectionInfo.structs, type);

        const children: ViewOptionsHierarchy[] = [];
        for (const member of struct.members) {
            const childOptionsHierarchy = createViewOptionsHierarchyAuxiliary(member.name, reflectionInfo, member.type);
            children.push(childOptionsHierarchy);
        }

        const optionsHierarchy: ViewOptionsHierarchy = {
            key: name,
            options: {
                type: ViewType.Standard,
                possibleValues: []
            },
            children: children
        };

        return optionsHierarchy;
    }
    else if (isEnumType(reflectionInfo.enums, type)) {

        const enumType = getEnumType(reflectionInfo.enums, type);
        const possibleValues = enumType.values.map(value => value.toLowerCase());

        const optionsHierarchy: ViewOptionsHierarchy = {
            key: name,
            options: {
                type: ViewType.ValueSelect,
                possibleValues: possibleValues
            },
            children: []
        };

        return optionsHierarchy;
    }
    else if (isVectorType(type)) {

        const sizeOptionsHierarchy: ViewOptionsHierarchy = {
            key: "size",
            options: {
                type: ViewType.ReadOnly,
                possibleValues: []
            },
            children: []
        };

        const vectorValueType = getVectorValueType(type);
        const vectorValueOptionsHierarchy = createViewOptionsHierarchyAuxiliary("index", reflectionInfo, vectorValueType);

        const elementsOptionsHierarchy: ViewOptionsHierarchy = {
            key: "elements",
            options: {
                type: ViewType.Standard,
                possibleValues: []
            },
            children: [vectorValueOptionsHierarchy]
        };

        const optionsHierarchy: ViewOptionsHierarchy = {
            key: name,
            options: {
                type: ViewType.Standard,
                possibleValues: []
            },
            children: [sizeOptionsHierarchy, elementsOptionsHierarchy]
        };

        return optionsHierarchy;
    }
    else if (isVariantType(type)) {
        const variantValueTypes = getVariantValueTypes(type);

        const typeOptionsHierarchy: ViewOptionsHierarchy = {
            key: "type",
            options: {
                type: ViewType.ValueSelect,
                possibleValues: variantValueTypes.map(value => value.name.toLowerCase())
            },
            children: []
        };

        const valueChildren: ViewOptionsHierarchy[] = [];
        for (const variantType of variantValueTypes) {
            const childOptionsHierarchy = createViewOptionsHierarchyAuxiliary(variantType.name.toLowerCase(), reflectionInfo, variantType);
            valueChildren.push(childOptionsHierarchy);
        }

        const valueOptionsHierarchy: ViewOptionsHierarchy = {
            key: "value",
            options: {
                type: ViewType.Standard,
                possibleValues: []
            },
            children: valueChildren
        };

        const optionsHierarchy: ViewOptionsHierarchy = {
            key: name,
            options: {
                type: ViewType.Standard,
                possibleValues: []
            },
            children: [typeOptionsHierarchy, valueOptionsHierarchy]
        };

        return optionsHierarchy;
    }
    else {
        const optionsHierarchy: ViewOptionsHierarchy = {
            key: name,
            options: {
                type: ViewType.Standard,
                possibleValues: []
            },
            children: []
        };

        return optionsHierarchy;
    }
}

export function createViewOptionsHierarchy(reflectionInfo: ReflectionInfo): ViewOptionsHierarchy {

    return createViewOptionsHierarchyAuxiliary("root", reflectionInfo, { name: "Module" });
}
