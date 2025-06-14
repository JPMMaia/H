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
    value: Core_intermediate_representation.Builtin_type_reference | Core_intermediate_representation.Constant_array_type | Core_intermediate_representation.Custom_type_reference | Core_intermediate_representation.Fundamental_type | Core_intermediate_representation.Function_type | Core_intermediate_representation.Integer_type | Core_intermediate_representation.Pointer_type | Core_intermediate_representation.Type_instance
): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: type,
            value: value
        }
    };
}

export function create_builtin_type_reference(name: string): Core_intermediate_representation.Type_reference {
    return create_type_reference(
        Core_intermediate_representation.Type_reference_enum.Builtin_type_reference,
        { value: name }
    );
}

export function create_custom_type_reference(module_name: string, name: string): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Custom_type_reference,
            value: {
                module_reference: {
                    name: module_name
                },
                name: name
            }
        }
    };
}

export function create_fundamental_type(value: Core_intermediate_representation.Fundamental_type): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Fundamental_type,
            value: value
        }
    };
}

export function create_integer_type(number_of_bits: number, is_signed: boolean): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Integer_type,
            value: {
                number_of_bits: number_of_bits,
                is_signed: is_signed
            }
        }
    };
}

export function create_type_instance(module_name: string, name: string, type_arguments: Core_intermediate_representation.Statement[]): Core_intermediate_representation.Type_reference {
    return create_type_reference(
        Core_intermediate_representation.Type_reference_enum.Type_instance,
        {
            type_constructor: {
                module_reference: {
                    name: module_name
                },
                name: name
            },
            arguments: type_arguments
        }
    );
}

export function create_parameter_type(name: string): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Parameter_type,
            value: {
                name: name
            }
        }
    };
}

export function create_pointer_type(element_type: Core_intermediate_representation.Type_reference[], is_mutable: boolean): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Pointer_type,
            value: {
                element_type: element_type,
                is_mutable: is_mutable
            }
        }
    };
}

export function create_string_type(): Core_intermediate_representation.Type_reference {
    return create_type_reference(
        Core_intermediate_representation.Type_reference_enum.Fundamental_type,
        Core_intermediate_representation.Fundamental_type.String
    );
}

export function parse_type_name(name: string, module_name?: string): Core_intermediate_representation.Type_reference[] {

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
                name: module_name !== undefined ? module_name : ""
            },
            name: name
        };
        return [create_type_reference(Core_intermediate_representation.Type_reference_enum.Custom_type_reference, type)];
    }
}

export interface Module_name_and_imports_getter {
    get_module_name(): string;
    get_imports(): Core_intermediate_representation.Import_module_with_alias[];
}

export function create_module_name_and_imports_getter_from_module(
    core_module: Core_intermediate_representation.Module
): Module_name_and_imports_getter {
    return {
        get_module_name: () => core_module.name,
        get_imports: () => core_module.imports
    };
}

export function get_type_name(
    type_reference: Core_intermediate_representation.Type_reference[],
    module_name_and_imports_getter?: Module_name_and_imports_getter
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
                const value_type_name = get_type_name(value.value_type, module_name_and_imports_getter);
                return `${value_type_name}[${value.size}]`;
            }
        case Core_intermediate_representation.Type_reference_enum.Custom_type_reference:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Custom_type_reference;
                const module_name = value.module_reference.name;
                if (module_name_and_imports_getter !== undefined) {
                    const current_module_name = module_name_and_imports_getter.get_module_name();
                    if (module_name === current_module_name) {
                        return value.name;
                    }
                    else {
                        const imports = module_name_and_imports_getter.get_imports();
                        const import_module = imports.find(value => value.module_name === module_name);
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
        case Core_intermediate_representation.Type_reference_enum.Function_pointer_type:
            {
                const value = type_reference_value.data.value as Core_intermediate_representation.Function_pointer_type;

                const input_parameter_type_names = value.type.input_parameter_types.map(value => get_type_name([value]), module_name_and_imports_getter);
                const input_parameters = input_parameter_type_names.map((typeName, index) => `${value.input_parameter_names[index]}: ${typeName}`);
                const input_parameters_plus_variadic = value.type.is_variadic ? input_parameters.concat("...") : input_parameters;
                const input_parameters_string = "(" + input_parameters_plus_variadic.join(", ") + ")";

                const output_parameter_type_names = value.type.output_parameter_types.map(value => get_type_name([value]), module_name_and_imports_getter);
                const output_parameters = output_parameter_type_names.map((typeName, index) => `${value.output_parameter_names[index]}: ${typeName}`);
                const output_parameters_string = "(" + output_parameters.join(", ") + ")";

                return `${input_parameters_string} -> ${output_parameters_string}`;
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
                const valueTypeName = value.element_type.length === 0 ? "void" : get_type_name(value.element_type, module_name_and_imports_getter);
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

export function create_function_type(
    input_parameter_types: Core_intermediate_representation.Type_reference[],
    output_parameter_types: Core_intermediate_representation.Type_reference[],
    is_variadic: boolean,
): Core_intermediate_representation.Function_type {
    return {
        input_parameter_types: input_parameter_types,
        output_parameter_types: output_parameter_types,
        is_variadic: is_variadic,
    };
}

export function create_function_pointer_type(type: Core_intermediate_representation.Function_type, input_parameter_names: string[], output_parameter_names: string[]): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Function_pointer_type,
            value: {
                type: type,
                input_parameter_names: input_parameter_names,
                output_parameter_names: output_parameter_names,
            }
        }
    };
}

export function create_function_pointer_type_from_declaration(declaration: Core_intermediate_representation.Function_declaration): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Function_pointer_type,
            value: {
                type: create_function_type(
                    [...declaration.type.input_parameter_types],
                    [...declaration.type.output_parameter_types],
                    declaration.type.is_variadic
                ),
                input_parameter_names: [...declaration.input_parameter_names],
                output_parameter_names: [...declaration.output_parameter_names],
            }
        }
    };
}
