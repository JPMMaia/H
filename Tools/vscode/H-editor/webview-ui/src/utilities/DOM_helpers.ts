export function find_left_leaf_element(element: Element): Element {

    if (element.children.length === 0) {
        return element;
    }

    return find_left_leaf_element(element.children[0]);
}

export function find_right_leaf_element(element: Element): Element {

    if (element.children.length === 0) {
        return element;
    }

    return find_right_leaf_element(element.children[element.children.length - 1]);
}

export function find_previous_leaf_sibling(root_element: Element, element: Element): Element | undefined {

    if (root_element.isSameNode(element)) {
        return undefined;
    }

    if (element.previousElementSibling !== null) {
        const previous_sibling = element.previousElementSibling;
        return find_right_leaf_element(previous_sibling);
    }

    if (element.parentElement !== null) {

        const parent_previous_sibling = find_previous_leaf_sibling(root_element, element.parentElement);

        if (parent_previous_sibling !== undefined) {
            return find_right_leaf_element(parent_previous_sibling);
        }
        else {
            return undefined;
        }
    }

    return undefined;
}

export function find_next_leaf_sibling(root_element: Element, element: Element): Element | undefined {

    if (root_element.isSameNode(element)) {
        return undefined;
    }

    if (element.nextElementSibling !== null) {
        const next_sibling = element.nextElementSibling;
        return find_left_leaf_element(next_sibling);
    }

    if (element.parentElement !== null) {

        const parent_next_sibling = find_next_leaf_sibling(root_element, element.parentElement);

        if (parent_next_sibling !== undefined) {
            return find_left_leaf_element(parent_next_sibling);
        }
        else {
            return undefined;
        }
    }

    return undefined;
}

export function find_sibling(
    root_element: Element,
    element: Element,
    find_function: (root_element: Element, element: Element) => Element | undefined,
    predicate: (current_element: Element) => boolean): Element | undefined {

    let current_sibling = find_function(root_element, element);

    while (current_sibling !== undefined && !predicate(current_sibling)) {
        current_sibling = find_function(root_element, current_sibling);
    }

    return current_sibling;
}

export function set_caret_position(node: Node, selection: Selection, position: number): void {
    const range = document.createRange();
    range.setStart(node, position);
    range.setEnd(node, position);

    selection.removeAllRanges();
    selection.addRange(range);
}

export function select_whole_text(node: Node, selection: Selection): void {
    const range = document.createRange();
    range.selectNodeContents(node);

    selection.removeAllRanges();
    selection.addRange(range);
}

function is_content_editable(element: Element): boolean {

    if (element.hasAttribute("contentEditable")) {
        const value = element.getAttribute("contentEditable");

        return value === "" || value === "true";
    }
    else if (element.tagName === "HR" && element.parentElement !== null && is_content_editable(element.parentElement)) {
        return true;
    }

    return false;
}

export interface Caret_position {
    node: Node;
    offset: number;
}

export function find_next_caret_position(root_element: HTMLElement, input_element: HTMLElement, offset: number, selection: Selection, filter: (element: Element) => boolean): Caret_position | undefined {

    if (input_element.childNodes.length === 0) {
        return undefined;
    }

    const current_text_node = input_element.childNodes[0];
    const text_content = current_text_node.textContent;
    if (text_content === null) {
        return undefined;
    }

    if (input_element.parentElement !== null) {

        const caret_position = selection.focusOffset + offset;

        if (caret_position < 0) {
            const previous_sibling = find_sibling(root_element, input_element, find_previous_leaf_sibling, is_content_editable);

            if (previous_sibling !== undefined) {
                const previous_element = previous_sibling as HTMLElement;

                const caret_element = (previous_element.childNodes.length > 0) ? previous_element : previous_element.parentElement;

                if (caret_element !== null) {
                    const text_node = caret_element.childNodes[0];
                    const text = text_node.textContent;

                    if (text !== null) {
                        return {
                            node: caret_element.childNodes[caret_element.childNodes.length - 1],
                            offset: text.length
                        };
                    }
                }
            }
        }
        else if (caret_position > text_content.length) {
            const next_sibling = find_sibling(root_element, input_element, find_next_leaf_sibling, is_content_editable);

            if (next_sibling !== undefined) {
                const next_element = next_sibling as HTMLElement;

                const caret_element = (next_element.childNodes.length > 0) ? next_element : next_element.parentElement;

                if (caret_element !== null) {
                    const text_node = caret_element.childNodes[0];
                    const text = text_node.textContent;

                    if (text !== null) {
                        return {
                            node: caret_element.childNodes[0],
                            offset: 0
                        };
                    }
                }
            }
        }
        else {
            if (input_element.childNodes.length > 0) {
                return {
                    node: input_element.childNodes[0],
                    offset: caret_position
                };
            }
        }
    }

    return undefined;
}

function find_element(element: Element, get_next_element: (element: Element) => Element | undefined, is_element: (sibling: Element) => boolean): Element | undefined {

    const next = get_next_element(element);

    if (next === undefined) {
        return undefined;
    }

    if (is_element(next)) {
        return next;
    }

    return find_element(next, get_next_element, is_element);
}

function get_next_sibling(element: Element): Element | undefined {
    return (element.nextElementSibling !== null) ? element.nextElementSibling : undefined;
}

function get_parent(element: Element): Element | undefined {
    return (element.parentElement !== null) ? element.parentElement : undefined;
}

export function find_start_of_line_editable(element: Element): Element | undefined {
    const parent_div = find_element(element, get_parent, parent => parent.tagName === "DIV");

    if (parent_div !== undefined) {
        const first_element = find_left_leaf_element(parent_div);
        const first_editable = is_content_editable(first_element) ? first_element : find_element(first_element, element => find_next_leaf_sibling(parent_div, element), is_content_editable);
        return first_editable;
    }

    return undefined;
}

export function find_end_of_line_editable(element: Element): Element | undefined {
    const parent_div = find_element(element, get_parent, parent => parent.tagName === "DIV");

    if (parent_div !== undefined) {
        const last_element = find_right_leaf_element(parent_div);
        const last_editable = is_content_editable(last_element) ? last_element : find_element(last_element, element => find_previous_leaf_sibling(parent_div, element), is_content_editable);
        return last_editable;
    }

    return undefined;
}

export function move_caret_once(root_element: HTMLElement, input_element: HTMLElement, offset: number, selection: Selection): void {

    const new_caret_position = find_next_caret_position(root_element, input_element, offset, selection, is_content_editable);

    if (new_caret_position !== undefined) {
        new_caret_position.node.parentElement?.focus();
        set_caret_position(new_caret_position.node, selection, new_caret_position.offset);
    }
}

export function move_caret_to_start(element: HTMLElement, selection: Selection): void {

    const first_editable = find_start_of_line_editable(element);

    if (first_editable !== undefined && first_editable.childNodes.length > 0) {
        const node = first_editable.childNodes[0];
        if (node.nodeValue !== null) {
            (first_editable as HTMLElement).focus();
            set_caret_position(node, selection, 0);
        }
    }
}

export function move_caret_to_end(element: HTMLElement, selection: Selection): void {

    const last_editable = find_end_of_line_editable(element);

    if (last_editable !== undefined && last_editable.childNodes.length > 0) {
        const node = last_editable.childNodes[last_editable.childNodes.length - 1];
        if (node.nodeValue !== null) {
            (last_editable as HTMLElement).focus();
            set_caret_position(node, selection, node.nodeValue.length);
        }
    }
}
