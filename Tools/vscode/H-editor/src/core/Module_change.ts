import type * as Core from './Core_interface';

export enum Type {
    Add_element_to_vector,
    Remove_element_of_vector,
    Set_element_of_vector,
    Move_element_of_vector,
    Add_number,
    Update
}

export interface Add_element_to_vector {
    vector_name: string,
    index: number,
    value: any
}

export interface Remove_element_of_vector {
    vector_name: string,
    index: number
}

export interface Set_element_of_vector {
    vector_name: string,
    index: number,
    value: any
}

export interface Move_element_of_vector {
    vector_name: string,
    from_index: number,
    to_index: number
}

export interface Add_number {
    key: string
    value: number
}

export interface Update {
    key: string,
    value: any
}

export interface Change {
    type: Type,
    value: Add_element_to_vector | Remove_element_of_vector | Move_element_of_vector | Add_number | Update
}

export interface Position_hierarchy_pair {
    position: any[],
    hierarchy: Hierarchy
}

export interface Hierarchy {
    changes: Change[],
    children: Position_hierarchy_pair[];
}

export function create_add_element_to_vector(vector_name: string, index: number, value: any): Change {

    const change: Add_element_to_vector = {
        vector_name: vector_name,
        index: index,
        value: value
    };

    return {
        type: Type.Add_element_to_vector,
        value: change
    };
}

export function create_remove_element_of_vector(vector_name: string, index: number): Change {

    const change: Remove_element_of_vector = {
        vector_name: vector_name,
        index: index
    };

    return {
        type: Type.Remove_element_of_vector,
        value: change
    };
}

export function create_set_element_of_vector(vector_name: string, index: number, value: any): Change {

    const change: Set_element_of_vector = {
        vector_name: vector_name,
        index: index,
        value: value
    };

    return {
        type: Type.Set_element_of_vector,
        value: change
    };
}

export function create_move_element_of_vector(vector_name: string, from_index: number, to_index: number): Change {

    const change: Move_element_of_vector = {
        vector_name: vector_name,
        from_index: from_index,
        to_index: to_index
    };

    return {
        type: Type.Move_element_of_vector,
        value: change
    };
}

export function create_add_number(key: string, value: number): Change {

    const change: Add_number = {
        key: key,
        value: value
    };

    return {
        type: Type.Add_number,
        value: change
    };
}


export function create_update(key: string, value: any): Change {

    const change: Update = {
        key: key,
        value: value
    };

    return {
        type: Type.Update,
        value: change
    };
}

function flatten_changes_auxiliary(output: { position: any[], change: Change }[], hierarchy: Hierarchy, current_position: any[]): void {

    for (const change of hierarchy.changes) {
        output.push({ position: current_position, change: change });
    }

    for (const child of hierarchy.children) {
        flatten_changes_auxiliary(output, child.hierarchy, [...current_position, ...child.position]);
    }
}

export function flatten_changes(hierarchy: Hierarchy): { position: any[], change: Change }[] {

    const all_changes: { position: any[], change: Change }[] = [];

    for (const change of hierarchy.changes) {
        all_changes.push({ position: [], change: change });
    }

    for (const child of hierarchy.children) {
        flatten_changes_auxiliary(all_changes, child.hierarchy, child.position);
    }

    return all_changes;
}

interface Object_reference {
    get value(): any;
    set value(value: any);
}

function get_object_at_position(object: any, position: any[]): Object_reference {

    if (position.length === 1) {
        return {
            get value() {
                return object[position[0]];
            },
            set value(value: any) {
                object[position[0]] = value;
            }
        };
    }

    const first_key = position[0];
    const child = object[first_key];

    const remainder_keys = position.slice(1, position.length);

    return get_object_at_position(child, remainder_keys);
}

function do_add_element_of_vector_change(object: any, change: Add_element_to_vector, position: any[]): void {
    const vector_position = position.concat(change.vector_name);
    const vector_reference: Core.Vector<any> = get_object_at_position(object, vector_position).value;
    if (change.index >= 0) {
        vector_reference.elements.splice(change.index, 0, change.value);
        vector_reference.size += 1;
    }
    else {
        vector_reference.elements.push(change.value);
        vector_reference.size += 1;
    }
}

function do_remove_element_of_vector_change(object: any, change: Remove_element_of_vector, position: any[]): void {
    const vector_position = position.concat(change.vector_name);
    const vector_reference: Core.Vector<any> = get_object_at_position(object, vector_position).value;
    vector_reference.elements.splice(change.index, 1);
    vector_reference.size -= 1;
}

function do_set_element_of_vector_change(object: any, change: Set_element_of_vector, position: any[]): void {
    const vector_position = position.concat(change.vector_name);
    const vector_reference: Core.Vector<any> = get_object_at_position(object, vector_position).value;
    vector_reference.elements[change.index] = change.value;
}

function do_move_element_of_vector_change(object: any, change: Move_element_of_vector, position: any[]): void {
    const vector_position = position.concat(change.vector_name);
    const vector_reference: Core.Vector<any> = get_object_at_position(object, vector_position).value;
    const element_to_move = vector_reference.elements[change.from_index];
    vector_reference.elements.splice(change.from_index, 1);
    vector_reference.elements.splice(change.to_index, 0, element_to_move);
}

function do_add_number_change(object: any, change: Add_number, position: any[]): void {
    const value_position = position.concat(change.key);
    const value_reference = get_object_at_position(object, value_position);
    const value: number = value_reference.value;
    value_reference.value = value + change.value;
}

function do_update_change(object: any, change: Update, position: any[]): void {
    const value_position = position.concat(change.key);
    const value_reference = get_object_at_position(object, value_position);
    value_reference.value = change.value;
}

export function update_module(module: Core.Module, new_changes: { position: any[], change: Change }[]): void {

    for (const change_and_position of new_changes) {

        const change = change_and_position.change;
        const position = change_and_position.position;

        switch (change.type) {
            case Type.Add_element_to_vector:
                do_add_element_of_vector_change(module, change.value as Add_element_to_vector, position);
                break;
            case Type.Remove_element_of_vector:
                do_remove_element_of_vector_change(module, change.value as Remove_element_of_vector, position);
                break;
            case Type.Set_element_of_vector:
                do_set_element_of_vector_change(module, change.value as Set_element_of_vector, position);
                break;
            case Type.Move_element_of_vector:
                do_move_element_of_vector_change(module, change.value as Move_element_of_vector, position);
                break;
            case Type.Add_number:
                do_add_number_change(module, change.value as Add_number, position);
                break;
            case Type.Update:
                do_update_change(module, change.value as Update, position);
                break;
        }
    }
}
