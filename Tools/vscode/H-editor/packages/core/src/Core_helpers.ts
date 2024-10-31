import * as Core from "./Core_interface";
import { onThrowError } from "./errors";

export function get_module(module: Core.Module, reference: Core.Module_reference): Core.Module {
    // TODO
    return module;
}

export interface Find_declaration_result {
    index: number,
    isExportDeclaration: boolean
};

export function get_function_declaration(module: Core.Module, result: Find_declaration_result): Core.Function_declaration {
    const declarations = result.isExportDeclaration ? module.export_declarations : module.internal_declarations;
    return declarations.function_declarations.elements[result.index];
}

export function find_function_declaration_index(module: Core.Module, name: string): Find_declaration_result | undefined {

    {
        const index = module.export_declarations.function_declarations.elements.findIndex(value => value.name === name);
        if (index !== -1) {
            return { index: index, isExportDeclaration: true };
        }
    }

    {
        const index = module.internal_declarations.function_declarations.elements.findIndex(value => value.name === name);
        if (index !== -1) {
            return { index: index, isExportDeclaration: false };
        }
    }

    return undefined;
}

export function find_function_declaration_position(module: Core.Module, name: string): any[] | undefined {
    const result = find_function_declaration_index(module, name);
    if (result === undefined || result.index === -1) {
        return undefined;
    }

    return [result.isExportDeclaration ? "export_declarations" : "internal_declarations", "function_declarations", "elements", result.index];
}

export function find_function_declaration(module: Core.Module, name: string): Core.Function_declaration | undefined {
    const result = find_function_declaration_index(module, name);
    if (result === undefined || result.index === -1) {
        return undefined;
    }

    return get_function_declaration(module, result);
}

export function find_function_definition(module: Core.Module, name: string): Core.Function_definition | undefined {
    const definition = module.definitions.function_definitions.elements.find(value => value.name === name);
    return definition;
}

export function find_element_index_with_name(exportArray: any[], internalArray: any[], name: string): Find_declaration_result | undefined {

    {
        const index = exportArray.findIndex(value => value.name === name);
        if (index !== -1) {
            return {
                index: index,
                isExportDeclaration: true
            };
        }
    }

    {
        const index = internalArray.findIndex(value => value.name === name);
        if (index !== -1) {
            return {
                index: index,
                isExportDeclaration: false
            };
        }
    }

    return undefined;
}

export function find_element_with_name(arrays: any[][], name: string): any | undefined {
    for (const array of arrays) {
        const element = array.find(value => value.name === name);
        if (element !== undefined) {
            return element;
        }
    }

    return undefined;
}

export function find_alias_type_declaration(module: Core.Module, name: string): Core.Alias_type_declaration {
    const element: Core.Alias_type_declaration = find_element_with_name([module.export_declarations.alias_type_declarations.elements, module.internal_declarations.alias_type_declarations.elements], name);
    return element;
}

export function find_enum_type_declaration(module: Core.Module, name: string): Core.Enum_declaration {
    const element: Core.Enum_declaration = find_element_with_name([module.export_declarations.enum_declarations.elements, module.internal_declarations.enum_declarations.elements], name);
    return element;
}

export function find_struct_declaration(module: Core.Module, name: string): Core.Struct_declaration {
    const element: Core.Struct_declaration = find_element_with_name([module.export_declarations.struct_declarations.elements, module.internal_declarations.struct_declarations.elements], name);
    return element;
}

export function find_alias_declaration_position(module: Core.Module, name: string): { position: any[], value: Core.Alias_type_declaration } | undefined {

    {
        const index = module.export_declarations.alias_type_declarations.elements.findIndex(alias => alias.name === name);
        if (index !== -1) {
            return {
                position: ["export_declarations", "alias_type_declarations", "elements", index],
                value: module.export_declarations.alias_type_declarations.elements[index]
            };
        }
    }

    {
        const index = module.internal_declarations.alias_type_declarations.elements.findIndex(alias => alias.name === name);
        if (index !== -1) {
            return {
                position: ["internal_declarations", "alias_type_declarations", "elements", index],
                value: module.internal_declarations.alias_type_declarations.elements[index]
            };
        }
    }

    return undefined;
}

export function find_enum_declaration_position(module: Core.Module, name: string): { position: any[], value: Core.Enum_declaration } | undefined {

    {
        const index = module.export_declarations.enum_declarations.elements.findIndex(alias => alias.name === name);
        if (index !== -1) {
            return {
                position: ["export_declarations", "enum_declarations", "elements", index],
                value: module.export_declarations.enum_declarations.elements[index]
            };
        }
    }

    {
        const index = module.internal_declarations.enum_declarations.elements.findIndex(alias => alias.name === name);
        if (index !== -1) {
            return {
                position: ["internal_declarations", "enum_declarations", "elements", index],
                value: module.internal_declarations.enum_declarations.elements[index]
            };
        }
    }

    return undefined;
}

export function find_function_declaration_position_2(module: Core.Module, name: string): { position: any[], value: Core.Function_declaration } | undefined {

    {
        const index = module.export_declarations.function_declarations.elements.findIndex(element => element.name === name);
        if (index !== -1) {
            return {
                position: ["export_declarations", "function_declarations", "elements", index],
                value: module.export_declarations.function_declarations.elements[index]
            };
        }
    }

    {
        const index = module.internal_declarations.function_declarations.elements.findIndex(element => element.name === name);
        if (index !== -1) {
            return {
                position: ["internal_declarations", "function_declarations", "elements", index],
                value: module.internal_declarations.function_declarations.elements[index]
            };
        }
    }

    return undefined;
}

export function find_function_definition_position_2(module: Core.Module, name: string): { position: any[], value: Core.Function_definition } | undefined {

    {
        const index = module.definitions.function_definitions.elements.findIndex(element => element.name === name);
        if (index !== -1) {
            return {
                position: ["definitions", "function_definitions", "elements", index],
                value: module.definitions.function_definitions.elements[index]
            };
        }
    }

    return undefined;
}

export function find_struct_declaration_position(module: Core.Module, name: string): { position: any[], value: Core.Struct_declaration } | undefined {

    {
        const index = module.export_declarations.struct_declarations.elements.findIndex(struct => struct.name === name);
        if (index !== -1) {
            return {
                position: ["export_declarations", "struct_declarations", "elements", index],
                value: module.export_declarations.struct_declarations.elements[index]
            };
        }
    }

    {
        const index = module.internal_declarations.struct_declarations.elements.findIndex(struct => struct.name === name);
        if (index !== -1) {
            return {
                position: ["internal_declarations", "struct_declarations", "elements", index],
                value: module.internal_declarations.struct_declarations.elements[index]
            };
        }
    }

    return undefined;
}

export function find_module(modules: Core.Module[], reference: Core.Module_reference): any {

    const module = modules.find(module => module.name === reference.name);
    if (module !== undefined) {
        return module;
    }

    const message = "Could not find element!";
    onThrowError(message);
    throw Error(message);
}

export function get_module_custom_type_names(module: Core.Module): string[] {

    const get_name = (element: any): string => element.name;

    return [
        ...module.export_declarations.alias_type_declarations.elements.map(get_name),
        ...module.internal_declarations.alias_type_declarations.elements.map(get_name),
        ...module.export_declarations.enum_declarations.elements.map(get_name),
        ...module.internal_declarations.enum_declarations.elements.map(get_name),
        ...module.export_declarations.struct_declarations.elements.map(get_name),
        ...module.internal_declarations.struct_declarations.elements.map(get_name)
    ];
}

export function get_declarations_vector(declarations: Core.Module_declarations, vector_name: string): Core.Vector<any> {

    if (vector_name === "alias_type_declarations" || vector_name === "enum_declarations" || vector_name === "struct_declarations" || vector_name === "function_declarations") {
        return declarations[vector_name];
    }
    else {
        const message = "Invalid '" + vector_name + "' declarations array";
        onThrowError(message);
        throw Error(message);
    }
}

export function get_position_of_vector_element(module: Core.Module, id: number): any[] | undefined {

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

export function is_return_statement_with_variable_declaration(module: Core.Module, statement: Core.Statement): boolean {

    if (statement.expressions.elements.length === 0) {
        return false;
    }

    const first_expression = statement.expressions.elements[0];

    return first_expression.data.type === Core.Expression_enum.Return_expression;
}

export function get_type_of_function_input_parameter(function_declaration: Core.Function_declaration, parameter_name: string): Core.Type_reference | undefined {
    const parameter_index = function_declaration.input_parameter_names.elements.findIndex(name => name === parameter_name);
    if (parameter_index === -1) {
        return undefined;
    }

    return function_declaration.type.input_parameter_types.elements[parameter_index];
}

export function get_type_of_function_output_parameter(function_declaration: Core.Function_declaration, parameter_name: string): Core.Type_reference | undefined {
    const parameter_index = function_declaration.output_parameter_names.elements.findIndex(id => parameter_name === parameter_name);
    if (parameter_index === -1) {
        return undefined;
    }

    return function_declaration.type.output_parameter_types.elements[parameter_index];
}
