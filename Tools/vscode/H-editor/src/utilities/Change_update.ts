import { getObjectAtPosition } from './parseJSON';
import * as Change from './Change';
import type * as Core from './coreModelInterface';

function do_add_element_of_vector_change(module: Core.Module, change: Change.Add_element_to_vector, position: any[]): void {
    const vector_position = position.concat(change.vector_name);
    const vector_reference: Core.Vector<any> = getObjectAtPosition(module, vector_position).value;
    vector_reference.elements.splice(change.index, 0, change.value);
    vector_reference.size += 1;
}

function do_remove_element_of_vector_change(module: Core.Module, change: Change.Remove_element_of_vector, position: any[]): void {
    const vector_position = position.concat(change.vector_name);
    const vector_reference: Core.Vector<any> = getObjectAtPosition(module, vector_position).value;
    vector_reference.elements.splice(change.index, 1);
    vector_reference.size -= 1;
}

function do_set_element_of_vector_change(module: Core.Module, change: Change.Set_element_of_vector, position: any[]): void {
    const vector_position = position.concat(change.vector_name);
    const vector_reference: Core.Vector<any> = getObjectAtPosition(module, vector_position).value;
    vector_reference.elements[change.index] = change.value;
}

function do_move_element_of_vector_change(module: Core.Module, change: Change.Move_element_of_vector, position: any[]): void {
    const vector_position = position.concat(change.vector_name);
    const vector_reference: Core.Vector<any> = getObjectAtPosition(module, vector_position).value;
    const element_to_move = vector_reference.elements[change.from_index];
    vector_reference.elements.splice(change.from_index, 1);
    vector_reference.elements.splice(change.to_index, 0, element_to_move);
}

function do_add_number_change(module: Core.Module, change: Change.Add_number, position: any[]): void {
    const value_position = position.concat(change.key);
    const value_reference = getObjectAtPosition(module, value_position);
    const value: number = value_reference.value;
    value_reference.value = value + change.value;
}

function do_update_change(module: Core.Module, change: Change.Update, position: any[]): void {
    const value_position = position.concat(change.key);
    const value_reference = getObjectAtPosition(module, value_position);
    value_reference.value = change.value;
}

export function update_module_with_change(module: Core.Module, new_changes: Change.Hierarchy, position: any[]): void {

    for (const change of new_changes.changes) {
        switch (change.type) {
            case Change.Type.Add_element_to_vector:
                do_add_element_of_vector_change(module, change.value as Change.Add_element_to_vector, position);
                break;
            case Change.Type.Remove_element_of_vector:
                do_remove_element_of_vector_change(module, change.value as Change.Remove_element_of_vector, position);
                break;
            case Change.Type.Set_element_of_vector:
                do_set_element_of_vector_change(module, change.value as Change.Set_element_of_vector, position);
                break;
            case Change.Type.Move_element_of_vector:
                do_move_element_of_vector_change(module, change.value as Change.Move_element_of_vector, position);
                break;
            case Change.Type.Add_number:
                do_add_number_change(module, change.value as Change.Add_number, position);
                break;
            case Change.Type.Update:
                do_update_change(module, change.value as Change.Update, position);
                break;
        }
    }

    for (const pair of new_changes.children) {
        const childrenPosition = position.concat(...pair.position);
        const childrenChanges = pair.hierarchy;
        update_module_with_change(module, childrenChanges, childrenPosition);
    }
}