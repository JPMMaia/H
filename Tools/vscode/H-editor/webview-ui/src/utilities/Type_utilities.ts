import * as core from "../../../src/utilities/coreModelInterface";

import * as coreInterfaceHelpers from "../../../src/utilities/coreModelInterfaceHelpers";
import { onThrowError } from "../../../src/utilities/errors";

export function get_integer_name(integer_type: core.Integer_type): string {
    if (integer_type.is_signed) {
        return "Int" + integer_type.number_of_bits.toString();
    }
    else {
        return "Uint" + integer_type.number_of_bits.toString();
    }
}

export function parse_integer_type(name: string): core.Integer_type {

    const is_signed = name.charAt(0) === "I";

    const number_offset = is_signed ? "Int".length : "Uint".length;
    const number_of_bits_string = name.substring(number_offset);
    const number_of_bits = Number(number_of_bits_string);

    return {
        number_of_bits: number_of_bits,
        is_signed: is_signed
    };
}

export function get_other_type_reference_name(
    module: core.Module,
    type: core.Type_reference_enum,
    type_reference: core.Alias_type_reference | core.Enum_type_reference | core.Struct_type_reference
): string {

    const get_name = (types: coreInterfaceHelpers.TypeWithIdAndName[]): string => {
        const location = types.find(value => value.id === type_reference.id);
        if (location === undefined) {
            return "<Unknown>";
        }
        return location.name;
    };

    // TODO search in other modules
    const types = coreInterfaceHelpers.getVisibleOtherTypesForModule(module);

    if (type === core.Type_reference_enum.Alias_type_reference) {
        return get_name(types.aliasTypes);
    }
    else if (type === core.Type_reference_enum.Enum_type_reference) {
        return get_name(types.enumTypes);
    }
    else if (type === core.Type_reference_enum.Struct_type_reference) {
        return get_name(types.structTypes);
    }
    else {
        const message = "get_other_type_reference_name() can only be used with alias, enums or structs";
        onThrowError(message);
        throw Error(message);
    }
}

export function create_default_type_reference(): core.Type_reference {

    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Integer_type,
            value: {
                number_of_bits: 32,
                is_signed: true
            }
        }
    };

    return new_type_reference;
}
