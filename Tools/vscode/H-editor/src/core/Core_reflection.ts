import { onThrowError } from '../utilities/errors';
import * as hCoreReflectionInfo from '../utilities/h_core_reflection.json';

export interface Reflection_enum {
    name: string;
    values: string[];
}

export interface Reflection_type {
    name: string;
}

export interface Reflection_struct_member {
    name: string;
    type: Reflection_type;
}

export interface Reflection_struct {
    name: string;
    members: Reflection_struct_member[];
}

export interface Reflection_info {
    enums: Reflection_enum[];
    structs: Reflection_struct[];
}

export function is_vector_type(type: Reflection_type): boolean {
    return type.name.startsWith("std::vector") || type.name.startsWith("std::pmr::vector");
}

export function get_vector_value_type(type: Reflection_type): Reflection_type {
    const begin_index = type.name.indexOf("<") + 1;
    const end_index = type.name.lastIndexOf(">");

    const name = type.name.substring(begin_index, end_index);

    return { name: name };
}

export function is_variant_type(type: Reflection_type): boolean {
    return type.name.startsWith("std::variant");
}

export function is_variant_enum_type(type: Reflection_type): boolean {
    return type.name.startsWith("std::variant") && type.name.endsWith("::Types");
}

export function get_variant_value_types(type: Reflection_type): Reflection_type[] {
    const begin_index = type.name.indexOf("<") + 1;
    const end_index = type.name.lastIndexOf(">");

    const concatenated_types = type.name.substring(begin_index, end_index);
    const names = concatenated_types.split(",");

    const types = names.map(function (name): Reflection_type { return { name: name }; });
    return types;
}

export function is_boolean_type(type: Reflection_type): boolean {
    return type.name === "bool";
}

export function is_integer_type(type: Reflection_type): boolean {
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

export function is_string_type(type: Reflection_type): boolean {
    return type.name === "std::string" || type.name === "std::pmr::string";
}

export function get_enum_type(enums: Reflection_enum[], type: Reflection_type): Reflection_enum {
    const match = enums.find(value => value.name === type.name);
    if (match === undefined) {
        const message = "Could not find enum " + type.name;
        onThrowError(message);
        throw Error(message);
    }
    return match;
}

export function is_enum_type(enums: Reflection_enum[], type: Reflection_type): boolean {
    const match = enums.find(value => value.name === type.name);
    return match !== undefined;
}

export function is_struct_type(structs: Reflection_struct[], type: Reflection_type): boolean {
    const match = structs.find(value => value.name === type.name);
    return match !== undefined;
}

export function get_struct_type(structs: Reflection_struct[], type: Reflection_type): Reflection_struct {
    const match = structs.find(value => value.name === type.name);
    if (match === undefined) {
        const message = "Could not find struct " + type.name;
        onThrowError(message);
        throw Error(message);
    }
    return match;
}

export function find_type_reflection(reflectionInfo: Reflection_info, position: any[]): Reflection_type {

    const module = reflectionInfo.structs.find(value => value.name === "Module");
    if (module === undefined) {
        const message = "Could not find reflection info of Module!";
        onThrowError(message);
        throw Error(message);
    }

    let current_struct = module;

    for (let position_index = 0; position_index < position.length; ++position_index) {

        const current_position = position[position_index];

        if (current_position === "elements") {

            position_index += 1;
            continue;
        }

        const member = current_struct.members.find(member => member.name === current_position);
        if (member === undefined) {
            const message = "Reflection data of " + current_position + " not found in " + current_struct.name;
            onThrowError(message);
            throw Error(message);
        }

        if (is_vector_type(member.type)) {
            const value_type = get_vector_value_type(member.type);

            if (is_integer_type(value_type) || is_string_type(value_type) || is_enum_type(reflectionInfo.enums, value_type)) {
                return value_type;
            }

            const member_type_reflection_info = reflectionInfo.structs.find(value => value.name === value_type.name);
            if (member_type_reflection_info === undefined) {
                const message = "Could not find reflection data of " + member.type.name;
                onThrowError(message);
                throw Error(message);
            }

            current_struct = member_type_reflection_info;
        }
        else if (is_variant_type(member.type)) {
            const message = "Not implemented yet!";
            onThrowError(message);
            throw Error(message);
        }
        else {
            const member_type_reflection_info = reflectionInfo.structs.find(value => value.name === member.type.name);
            if (member_type_reflection_info === undefined) {
                const message = "Could not find reflection data of " + member.type.name;
                onThrowError(message);
                throw Error(message);
            }

            current_struct = member_type_reflection_info;
        }
    }

    return current_struct;
}

export interface Default_value_options {
    id?: number;
    name?: string;
}

export function create_default_value(reflectionInfo: Reflection_info, type: Reflection_type, options?: Default_value_options): any {
    if (is_integer_type(type)) {
        return 0;
    }
    else if (is_boolean_type(type)) {
        return false;
    }
    else if (is_string_type(type)) {
        return "";
    }
    else if (is_vector_type(type)) {
        return { size: 0, elements: [] };
    }
    else if (is_variant_type(type)) {
        const types = get_variant_value_types(type);
        const default_type = types[0];
        const default_value = create_default_value(reflectionInfo, default_type);
        return { type: default_type.name.toLowerCase(), value: default_value };
    }
    else if (is_enum_type(reflectionInfo.enums, type)) {
        const enum_reflection = get_enum_type(reflectionInfo.enums, type);
        return enum_reflection.values[0].toLowerCase();
    }
    else { // If struct
        const struct_reflection = get_struct_type(reflectionInfo.structs, type);
        let object: any = {};
        for (const member of struct_reflection.members) {
            if (member.name === "id" && options !== undefined) {
                object[member.name] = options.id;
            }
            else if (member.name === "name" && options !== undefined) {
                object[member.name] = options.name;
            }
            else {
                object[member.name] = create_default_value(reflectionInfo, member.type);
            }
        }
        return object;
    }

}

export function create_default_element(reflectionInfo: Reflection_info, position: any[], defaultValueOptions?: Default_value_options): any {

    const type_reflection = find_type_reflection(reflectionInfo, position);

    const object = create_default_value(reflectionInfo, type_reflection, defaultValueOptions);

    return object;
}

export function create_empty_module(reflectionInfo: Reflection_info): any {
    return create_default_value(reflectionInfo, { name: "Module" });
}

export function create_reflection_info(): Reflection_info {
    const reflection_info = { enums: hCoreReflectionInfo.enums, structs: hCoreReflectionInfo.structs };
    return reflection_info;
}
