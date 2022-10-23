export enum Type {
    Add_element_to_vector,
    Remove_element_of_vector,
    Set_element_of_vector,
    Move_element_of_vector,
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

export interface Update {
    key: string,
    value: any
}

export interface Change {
    type: Type,
    value: Add_element_to_vector | Remove_element_of_vector | Move_element_of_vector | Update
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
