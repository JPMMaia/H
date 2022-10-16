import type * as core from "../../../src/utilities/coreModelInterface";

export function add_element_at_position(array: core.Vector<any>, index: number, element: any): void {
    if ((index + 1) >= array.elements.length) {
        array.elements.push(element);
    }
    else {
        array.elements.splice(index, 0, element);
    }

    array.size += 1;
}

export function remove_element_at_position(array: core.Vector<any>, index: number): void {
    array.elements.splice(index, 1);
    array.size -= 1;
}

export function swap_elements(array: core.Vector<any>, first_index: number, second_index: number): void {
    const first = array.elements[first_index];
    array.elements[first_index] = array.elements[second_index];
    array.elements[second_index] = first;
}
