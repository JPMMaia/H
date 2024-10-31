import * as Core_intermediate_representation from "./Core_intermediate_representation";
import { onThrowError } from "./errors";

export function get_integer_name(integer_type: Core_intermediate_representation.Integer_type): string {
    if (integer_type.is_signed) {
        return "Int" + integer_type.number_of_bits.toString();
    }
    else {
        return "Uint" + integer_type.number_of_bits.toString();
    }
}

export function parse_integer_type(name: string): Core_intermediate_representation.Integer_type {

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
    return name in Core_intermediate_representation.Fundamental_type;
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
    type: Core_intermediate_representation.Type_reference_enum,
    value: Core_intermediate_representation.Builtin_type_reference | Core_intermediate_representation.Constant_array_type | Core_intermediate_representation.Custom_type_reference | Core_intermediate_representation.Fundamental_type | Core_intermediate_representation.Function_type | Core_intermediate_representation.Integer_type | Core_intermediate_representation.Pointer_type
): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: type,
            value: value
        }
    };
}

export function parse_type_name(name: string): Core_intermediate_representation.Type_reference[] {

    if (is_integer_type(name)) {
        const type = parse_integer_type(name);
        return [create_type_reference(Core_intermediate_representation.Type_reference_enum.Integer_type, type)];
    }
    else if (is_fundamental_type(name)) {
        const type = Core_intermediate_representation.Fundamental_type[name as keyof typeof Core_intermediate_representation.Fundamental_type];
        return [create_type_reference(Core_intermediate_representation.Type_reference_enum.Fundamental_type, type)];
    }
    else if (name === "void") {
        return [];
    }
    else {
        const type: Core_intermediate_representation.Custom_type_reference = {
            module_reference: {
                name: ""
            },
            name: name
        };
        return [create_type_reference(Core_intermediate_representation.Type_reference_enum.Custom_type_reference, type)];
    }
}

export function get_type_name(
    type_reference: Core_intermediate_representation.Type_reference[],
    core_module?: Core_intermediate_representation.Module
): string {

    if (type_reference.length === 0) {
        return "void";
    }

    const type_reference_value = type_reference[0];

    switch (type_reference_value.data.type) {
        case Core_intermediate_representation.Type_reference_enum.Builtin_type_reference:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Builtin_type_reference;
                return value.value;
            }
        case Core_intermediate_representation.Type_reference_enum.Constant_array_type:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Constant_array_type;
                const value_type_name = get_type_name(value.value_type, core_module);
                return `${value_type_name}[${value.size}]`;
            }
        case Core_intermediate_representation.Type_reference_enum.Custom_type_reference:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Custom_type_reference;
                const module_name = value.module_reference.name;
                if (core_module !== undefined) {
                    if (module_name === core_module.name) {
                        return value.name;
                    }
                    else {
                        const import_module = core_module.imports.find(value => value.module_name === module_name);
                        if (import_module !== undefined) {
                            return `${import_module.alias}.${value.name}`;
                        }
                    }
                }

                return module_name.length > 0 ? `${module_name}.${value.name}` : value.name;
            }
        case Core_intermediate_representation.Type_reference_enum.Fundamental_type:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Fundamental_type;
                return value.toString();
            }
        case Core_intermediate_representation.Type_reference_enum.Function_type:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Function_type;
                const parameterNames = value.input_parameter_types.map(value => get_type_name([value]), core_module);
                const parameterNamesPlusVariadic = value.is_variadic ? parameterNames.concat("...") : parameterNames;
                const parametersString = "(" + parameterNamesPlusVariadic.join(", ") + ")";
                const returnTypeNames = value.output_parameter_types.map(value => get_type_name([value]), core_module);
                const returnTypesString = "(" + returnTypeNames.join(", ") + ")";
                return `${parametersString} -> ${returnTypesString}`;
            }
        case Core_intermediate_representation.Type_reference_enum.Integer_type:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Integer_type;
                return (value.is_signed ? "Int" : "Uint") + value.number_of_bits.toString();
            }
        case Core_intermediate_representation.Type_reference_enum.Null_pointer_type: {
            return "Null_pointer_type";
        }
        case Core_intermediate_representation.Type_reference_enum.Pointer_type:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Pointer_type;
                const valueTypeName = value.element_type.length === 0 ? "void" : get_type_name(value.element_type, core_module);
                const mutableKeyword = value.is_mutable ? "mutable " : "";
                return `*${mutableKeyword}${valueTypeName}`;
            }
    }

    const message = "get_type_name() not implemented for " + type_reference;
    onThrowError(message);
    throw Error(message);
}

export function create_default_type_reference(): Core_intermediate_representation.Type_reference {

    const new_type_reference: Core_intermediate_representation.Type_reference = {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Integer_type,
            value: {
                number_of_bits: 32,
                is_signed: true
            }
        }
    };

    return new_type_reference;
}

export function are_equal(lhs: Core_intermediate_representation.Type_reference[], rhs: Core_intermediate_representation.Type_reference[]): boolean {
    const lhs_name = get_type_name(lhs);
    const rhs_name = get_type_name(rhs);
    return lhs_name === rhs_name;
}

export function create_null_type(): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Null_pointer_type,
            value: {}
        }
    };
}
