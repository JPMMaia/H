export interface Branch_node {
    children: Node[];
}

export interface Leaf_node {
    value: any
}

export enum Node_type {
    Branch,
    Leaf
}

export interface Node {
    type: Node_type;
    value: Branch_node | Leaf_node;
}
