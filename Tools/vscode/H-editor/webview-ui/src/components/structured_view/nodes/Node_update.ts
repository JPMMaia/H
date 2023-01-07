export enum Update_type {
    Open_collapsible
}

export interface Update {
    indices: number[];
    type: Update_type;
    data: Open_collapsible_update
}

export interface Open_collapsible_update {
    value: boolean;
}
