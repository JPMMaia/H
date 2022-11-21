import * as Core from "../../../src/utilities/coreModelInterface";
import * as Change from "../../../src/utilities/Change";

export function create_function(module: Core.Module, name: string): Change.Hierarchy {

    const id = module.next_unique_id;
    const declaration_index = module.internal_declarations.function_declarations.size;
    const definition_index = module.definitions.function_definitions.size;

    const new_function_declaration: Core.Function_declaration = {
        id: id,
        name: name,
        type: {
            input_parameter_types: {
                size: 0,
                elements: []
            },
            output_parameter_types: {
                size: 0,
                elements: []
            },
            is_variadic: false
        },
        input_parameter_ids: {
            size: 0,
            elements: []
        },
        input_parameter_names: {
            size: 0,
            elements: []
        },
        output_parameter_ids: {
            size: 0,
            elements: []
        },
        output_parameter_names: {
            size: 0,
            elements: []
        },
        linkage: Core.Linkage.Private
    };

    const new_function_definition: Core.Function_definition = {
        id: id,
        statements: {
            size: 0,
            elements: []
        }
    };

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_add_number("next_unique_id", 1)
        ],
        children: [
            {
                position: ["internal_declarations"],
                hierarchy: {
                    changes: [
                        Change.create_add_element_to_vector("function_declarations", declaration_index, new_function_declaration)
                    ],
                    children: []
                }
            },
            {
                position: ["definitions"],
                hierarchy: {
                    changes: [
                        Change.create_add_element_to_vector("function_definitions", definition_index, new_function_definition)
                    ],
                    children: []
                }
            }
        ]
    };

    return new_changes;
}