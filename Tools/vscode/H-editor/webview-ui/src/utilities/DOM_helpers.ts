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

export function set_caret_selection(node: Node, selection: Selection, start: number, end: number): void {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);

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

export function iterate_backward_with_skip(element: Element, skip: (element: Element) => boolean): Element | undefined {

    if (element.previousElementSibling !== null) {
        const sibling = element.previousElementSibling;

        if (skip(sibling) || sibling.children.length === 0) {
            return sibling;
        }

        let child = sibling.children[sibling.children.length - 1];

        while (child.children.length > 0) {
            child = child.children[child.children.length - 1];
        }

        return child;
    }
    else {
        return element.parentElement !== null ? element.parentElement : undefined;
    }
}

export function iterate_backward(element: Element): Element | undefined {

    return iterate_backward_with_skip(element, _ => false);
}

export function iterate_forward_with_skip(element: Element, skip: (element: Element) => boolean): Element | undefined {

    if (element.children.length > 0 && !skip(element)) {
        return element.children[0];
    }
    else if (element.nextElementSibling !== null) {
        return element.nextElementSibling;
    }
    else {
        let parent = element.parentElement;

        while (parent !== null && parent.nextElementSibling === null) {
            parent = parent.parentElement;
        }

        if (parent !== null && parent.nextElementSibling !== null) {
            return parent.nextElementSibling;
        }
        else {
            return undefined;
        }
    }
}

export function iterate_forward(element: Element): Element | undefined {

    return iterate_forward_with_skip(element, _ => false);
}

export interface Caret_position {
    node: Node;
    offset: number;
}

function is_empty_space(text: string): boolean {
    const trimmed_text = text.trim();
    const empty = "\u200B";
    return trimmed_text === empty;
}

export function find_next_caret_position(input_element: HTMLElement, offset: number, selection: Selection, filter: (element: Element) => boolean): Caret_position | undefined {

    if (input_element.childNodes.length === 0) {
        return undefined;
    }

    const current_text_node = input_element.childNodes[0];
    const text_content = current_text_node.textContent;
    if (text_content === null) {
        return undefined;
    }
    const text_content_length = is_empty_space(text_content) ? 0 : text_content.length;

    if (input_element.parentElement !== null) {

        const caret_position = is_empty_space(text_content) ? offset : selection.focusOffset + offset;

        if (caret_position < 0) {

            const previous_element = iterate_backward_with_skip(input_element, is_hidden_inside_closed_details_element);
            if (previous_element !== undefined) {
                const caret_element = find_element(previous_element, current => iterate_backward_with_skip(current, is_hidden_inside_closed_details_element), is_content_editable);

                if (caret_element !== undefined) {
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
        else if (caret_position > text_content_length) {

            const next_element = iterate_forward_with_skip(input_element, is_hidden_inside_closed_details_element);
            if (next_element !== undefined) {
                const caret_element = find_element(next_element, current => iterate_forward_with_skip(current, is_hidden_inside_closed_details_element), is_content_editable);

                if (caret_element !== undefined) {
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

    if (is_element(element)) {
        return element;
    }

    let next = get_next_element(element);

    while (next !== undefined && !is_element(next)) {
        next = get_next_element(next);
    }

    return next;
}

function get_previous_sibling(element: Element): Element | undefined {
    return (element.previousElementSibling !== null) ? element.previousElementSibling : undefined;
}

function get_next_sibling(element: Element): Element | undefined {
    return (element.nextElementSibling !== null) ? element.nextElementSibling : undefined;
}

function get_parent(element: Element): Element | undefined {
    return (element.parentElement !== null) ? element.parentElement : undefined;
}

export function is_new_line_container_element(element: Element): boolean {
    return element.tagName === "DIV" || element.tagName === "SECTION";
}

export function is_hidden_inside_closed_details_element(element: Element): boolean {

    if (element.tagName === "DETAILS") {
        return false;
    }

    const details_or_summary_ancestor = find_element(element, get_parent, current => current.tagName === "DETAILS" || current.tagName === "SUMMARY");

    if (details_or_summary_ancestor === undefined) {
        return false;
    }

    if (details_or_summary_ancestor.tagName === "SUMMARY") {
        return false;
    }

    const details_ancestor = details_or_summary_ancestor;
    const open = details_ancestor.getAttribute("open");
    if (open !== null && (open.length === 0 || open === "true")) {
        return false;
    }
    return true;
}

export function find_left_editable_child(parent: Element): Element | undefined {
    const first_element = find_left_leaf_element(parent);
    const first_editable = is_content_editable(first_element) ? first_element : find_element(first_element, element => find_next_leaf_sibling(parent, element), is_content_editable);
    return first_editable;
}

export function find_right_editable_child(parent: Element): Element | undefined {
    const last_element = find_left_leaf_element(parent);
    const last_editable = is_content_editable(last_element) ? last_element : find_element(last_element, element => find_previous_leaf_sibling(parent, element), is_content_editable);
    return last_editable;
}

export function find_start_of_line_editable(element: Element): Element | undefined {
    const parent_div = find_element(element, get_parent, is_new_line_container_element);

    if (parent_div === undefined) {
        return undefined;
    }

    return find_element(parent_div, iterate_forward, is_content_editable);
}

export function find_end_of_line_editable(element: Element): Element | undefined {
    const parent_div = find_element(element, get_parent, is_new_line_container_element);
    if (parent_div === undefined) {
        return undefined;
    }

    const right_most_child = find_element(parent_div, current => current.children[current.children.length - 1], current => current.children.length === 0);

    if (right_most_child === undefined) {
        return undefined;
    }

    return find_element(right_most_child, iterate_backward, is_content_editable);
}

export function find_previous_line_editable(element: Element): Element | undefined {

    const start_of_line = find_start_of_line_editable(element);
    if (start_of_line === undefined) {
        return undefined;
    }

    let current = iterate_backward_with_skip(start_of_line, is_hidden_inside_closed_details_element);
    while (current !== undefined && !is_content_editable(current)) {
        current = iterate_backward_with_skip(current, is_hidden_inside_closed_details_element);
    }

    if (current !== undefined) {
        return find_start_of_line_editable(current);
    }

    return current;
}

export function find_next_line_editable(element: Element): Element | undefined {

    const end_of_line = find_end_of_line_editable(element);
    if (end_of_line === undefined) {
        return undefined;
    }

    let current = iterate_forward_with_skip(end_of_line, is_hidden_inside_closed_details_element);
    while (current !== undefined && !is_content_editable(current)) {
        current = iterate_forward_with_skip(current, is_hidden_inside_closed_details_element);
    }

    return current;
}

export function move_caret_once(input_element: HTMLElement, offset: number, selection: Selection): void {

    const new_caret_position = find_next_caret_position(input_element, offset, selection, is_content_editable);

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
