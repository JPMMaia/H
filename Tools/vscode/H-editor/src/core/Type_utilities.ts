import * as Core from "./Core_interface";
import * as Core_helpers from "./Core_helpers";
import { onThrowError } from "../utilities/errors";

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

export function is_integer_type(name: string): boolean {
    switch (name) {
        case "Int8":
        case "Int16":
        case "Int32":
        case "Int64":
        case "Uint8":
        case "Uint16":
        case "Uint32":
        case "Uint64":
            return true;
        default:
            return false;
    }
}

export function is_builtin_type(name: string): boolean {
    // TODO
    return false;
}

export function is_constant_array_type(name: string): boolean {
    // TODO
    return false;
}

export function is_fundamental_type(name: string): boolean {
    return name in Core.Fundamental_type;
}

export function is_function_type(name: string): boolean {
    // TODO
    return false;
}

export function is_pointer_type(name: string): boolean {
    const last_character = name.charAt(name.length - 1);
    return last_character === "*";
}

function create_type_reference(
    type: Core.Type_reference_enum,
    value: Core.Builtin_type_reference | Core.Constant_array_type | Core.Custom_type_reference | Core.Fundamental_type | Core.Function_type | Core.Integer_type | Core.Pointer_type
): Core.Type_reference {
    return {
        data: {
            type: type,
            value: value
        }
    };
}

export function parse_type_name(name: string): Core.Type_reference[] {

    if (is_integer_type(name)) {
        const type = parse_integer_type(name);
        return [create_type_reference(Core.Type_reference_enum.Integer_type, type)];
    }
    else if (is_fundamental_type(name)) {
        const type = Core.Fundamental_type[name as keyof typeof Core.Fundamental_type];
        return [create_type_reference(Core.Type_reference_enum.Fundamental_type, type)];
    }
    else if (name === "void") {
        return [];
    }
    else {
        const type: Core.Custom_type_reference = {
            module_reference: {
                name: ""
            },
            name: name
        };
        return [create_type_reference(Core.Type_reference_enum.Custom_type_reference, type)];
    }
}

export function get_type_name(
    type_reference: Core.Type_reference[]
): string {

    if (type_reference.length === 0) {
        return "void";
    }

    const type_reference_value = type_reference[0];

    switch (type_reference_value.data.type) {
        case Core.Type_reference_enum.Builtin_type_reference:
            {
                const value = type_reference_value.data.value as Core.Builtin_type_reference;
                return value.value;
            }
        case Core.Type_reference_enum.Constant_array_type:
            {
                const value = type_reference_value.data.value as Core.Constant_array_type;
                const value_type_name = get_type_name(value.value_type.elements);
                return `${value_type_name}[${value.size}]`;
            }
        case Core.Type_reference_enum.Custom_type_reference:
            {
                const value = type_reference_value.data.value as Core.Custom_type_reference;
                const module_name = value.module_reference.name;
                return module_name.length > 0 ? `${module_name}.${value.name}` : value.name;
            }
        case Core.Type_reference_enum.Fundamental_type:
            {
                const value = type_reference_value.data.value as Core.Fundamental_type;
                return value.toString();
            }
        case Core.Type_reference_enum.Function_type:
            {
                const value = type_reference_value.data.value as Core.Function_type;
                const parameterNames = value.input_parameter_types.elements.map(value => get_type_name([value]));
                const parameterNamesPlusVariadic = value.is_variadic ? parameterNames.concat("...") : parameterNames;
                const parametersString = "(" + parameterNamesPlusVariadic.join(", ") + ")";
                const returnTypeNames = value.output_parameter_types.elements.map(value => get_type_name([value]));
                const returnTypesString = "(" + returnTypeNames.join(", ") + ")";
                return `${parametersString} -> ${returnTypesString}`;
            }
        case Core.Type_reference_enum.Integer_type:
            {
                const value = type_reference_value.data.value as Core.Integer_type;
                return (value.is_signed ? "Int" : "Uint") + value.number_of_bits.toString();
            }
        case Core.Type_reference_enum.Pointer_type:
            {
                const value = type_reference_value.data.value as Core.Pointer_type;
                const valueTypeName = value.element_type.elements.length === 0 ? "void" : get_type_name(value.element_type.elements);
                const mutableKeyword = value.is_mutable ? " mutable" : "";
                return `${valueTypeName}${mutableKeyword}*`;
            }
    }

    const message = "getUnderlyingTypeName() not implemented for " + type_reference;
    onThrowError(message);
    throw Error(message);
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

export function are_equal(lhs: Core.Type_reference[], rhs: Core.Type_reference[]): boolean {
    const lhs_name = get_type_name(lhs);
    const rhs_name = get_type_name(rhs);
    return lhs_name === rhs_name;
}