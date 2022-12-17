import type * as Core from "../../../src/utilities/coreModelInterface";
import * as Type_utilities from "../../../src/utilities/Type_utilities";
import * as Change from "../../../src/utilities/Change";
import { onThrowError } from "../../../src/utilities/errors";

function create_vector_name(name: string, is_input_parameter: boolean): string {
    return is_input_parameter ? "input_" + name : "output_" + name;
}

function calculate_new_function_parameter_id(parameter_ids: Core.Vector<number>): number {

    let id = parameter_ids.size;

    for (const existing_id of parameter_ids.elements) {
        id = Math.max(id, existing_id + 1);
    }

    return id;
}

export function add_function_parameter(index: number, parameter_ids: Core.Vector<number>, is_input_parameter: boolean, name?: string): Change.Hierarchy {

    const insert_index = index;
    const new_id = calculate_new_function_parameter_id(parameter_ids);
    const new_name = name !== undefined ? name : "value_" + new_id.toString();
    const new_type = Type_utilities.create_default_type_reference();

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_add_element_to_vector(create_vector_name("parameter_ids", is_input_parameter), insert_index, new_id),
            Change.create_add_element_to_vector(create_vector_name("parameter_names", is_input_parameter), insert_index, new_name),
        ],
        children: [
            {
                position: ["type"],
                hierarchy: {
                    changes: [
                        Change.create_add_element_to_vector(create_vector_name("parameter_types", is_input_parameter), insert_index, new_type)
                    ],
                    children: []
                }
            }
        ]
    };

    return new_changes;
}

export function remove_function_parameter(index: number, is_input_parameter: boolean): Change.Hierarchy {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_remove_element_of_vector(create_vector_name("parameter_ids", is_input_parameter), index),
            Change.create_remove_element_of_vector(create_vector_name("parameter_names", is_input_parameter), index),
        ],
        children: [
            {
                position: ["type"],
                hierarchy: {
                    changes: [
                        Change.create_remove_element_of_vector(create_vector_name("parameter_types", is_input_parameter), index)
                    ],
                    children: []
                }
            }
        ]
    };

    return new_changes;
}

export function move_function_parameter_up(index: number, is_input_parameter: boolean): Change.Hierarchy | undefined {

    if (index === 0) {
        return undefined;
    }

    const from_index = index - 1;
    const to_index = index;

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_move_element_of_vector(create_vector_name("parameter_ids", is_input_parameter), from_index, to_index),
            Change.create_move_element_of_vector(create_vector_name("parameter_names", is_input_parameter), from_index, to_index),
        ],
        children: [
            {
                position: ["type"],
                hierarchy: {
                    changes: [
                        Change.create_move_element_of_vector(create_vector_name("parameter_types", is_input_parameter), from_index, to_index)
                    ],
                    children: []
                }
            }
        ]
    };

    return new_changes;
}

export function move_function_parameter_down(index: number, number_of_parameters: number, is_input_parameter: boolean): Change.Hierarchy | undefined {

    if ((index + 1) >= number_of_parameters) {
        return undefined;
    }

    const from_index = index;
    const to_index = index + 1;

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_move_element_of_vector(create_vector_name("parameter_ids", is_input_parameter), from_index, to_index),
            Change.create_move_element_of_vector(create_vector_name("parameter_names", is_input_parameter), from_index, to_index),
        ],
        children: [
            {
                position: ["type"],
                hierarchy: {
                    changes: [
                        Change.create_move_element_of_vector(create_vector_name("parameter_types", is_input_parameter), from_index, to_index)
                    ],
                    children: []
                }
            }
        ]
    };

    return new_changes;
}

function find_index_of_parameter(parameter_ids: Core.Vector<number>, parameter_id: number): number {
    const index = parameter_ids.elements.find(value => value == parameter_id);
    if (index !== undefined) {
        return index;
    }

    const message = "Could not find index of parameter!";
    onThrowError(message);
    throw new Error(message);
}

export function update_parameter_name(parameter_ids: Core.Vector<number>, parameter_id: number, new_name: string, is_input_parameter: boolean): Change.Hierarchy {

    const index = find_index_of_parameter(parameter_ids, parameter_id);

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_set_element_of_vector(create_vector_name("parameter_names", is_input_parameter), index, new_name)
        ],
        children: []
    };

    return new_changes;
}

export function update_parameter_type(parameter_ids: Core.Vector<number>, parameter_id: number, new_type: Core.Type_reference, is_input_parameter: boolean): Change.Hierarchy {

    const index = find_index_of_parameter(parameter_ids, parameter_id);

    const new_changes: Change.Hierarchy = {
        changes: [
        ],
        children: [
            {
                position: ["type"],
                hierarchy: {
                    changes: [
                        Change.create_set_element_of_vector(create_vector_name("parameter_types", is_input_parameter), index, new_type)
                    ],
                    children: []
                }
            }
        ]
    };

    return new_changes;
}
