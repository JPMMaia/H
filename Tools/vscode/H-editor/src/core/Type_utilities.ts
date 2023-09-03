import * as Core from "./Core_interface";

export function get_integer_name(integer_type: Core.Integer_type): string {
    if (integer_type.is_signed) {
        return "Int" + integer_type.number_of_bits.toString();
    }
    else {
        return "Uint" + integer_type.number_of_bits.toString();
    }
}

export function parse_integer_type(name: string): Core.Integer_type {

    const is_signed = name.charAt(0) === "I";

    const number_offset = is_signed ? "Int".length : "Uint".length;
    const number_of_bits_string = name.substring(number_offset);
    const number_of_bits = Number(number_of_bits_string);

    return {
        number_of_bits: number_of_bits,
        is_signed: is_signed
    };
}

export function create_default_type_reference(): Core.Type_reference {

    const new_type_reference: Core.Type_reference = {
        data: {
            type: Core.Type_reference_enum.Integer_type,
            value: {
                number_of_bits: 32,
                is_signed: true
            }
        }
    };

    return new_type_reference;
}
