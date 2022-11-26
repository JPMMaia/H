import * as DOM_helpers from "./DOM_helpers";

export function set_caret_position(node: Node, offset: number): void {
    const selection = window.getSelection();
    if (selection !== null) {
        DOM_helpers.set_caret_position(node, selection, offset);
    }
}

export function transfer_caret_selection(node: Node): void {
    const selection = window.getSelection();
    if (selection !== null) {
        const start = selection.rangeCount > 0 ? selection.getRangeAt(0).startOffset : 0;
        const end = selection.rangeCount > 0 ? selection.getRangeAt(0).endOffset : 0;
        DOM_helpers.set_caret_selection(node, selection, start, end);
    }
}

export function set_caret_position_at_start(node: Node): void {
    const selection = window.getSelection();
    if (selection !== null) {
        const offset = 0;
        DOM_helpers.set_caret_position(node, selection, offset);
    }
}

export function set_caret_position_at_end(node: Node): void {
    const selection = window.getSelection();
    if (selection !== null) {
        const text = node.textContent;
        const offset = text !== null ? text.length : 0;
        DOM_helpers.set_caret_position(node, selection, offset);
    }
}

export function select_whole_text(node: Node): void {
    const selection = window.getSelection();
    if (selection !== null) {
        DOM_helpers.select_whole_text(node, selection);
    }
}

export function move_caret_once(element: HTMLElement, offset: number): void {
    if (element.childNodes.length > 0) {
        const selection = window.getSelection();
        if (selection !== null) {
            DOM_helpers.move_caret_once(element, offset, selection);
        }
    }
}

export function handle_caret_keys(event: KeyboardEvent): boolean {

    const element = event.target as HTMLElement;

    if (event.shiftKey || event.ctrlKey || event.altKey) {
        return false;
    }

    if (event.key === "ArrowLeft") {
        move_caret_once(element, -1);
        return true;
    }
    else if (event.key === "ArrowRight") {
        move_caret_once(element, 1);
        return true;
    }
    else if (event.key === "ArrowUp") {
        // TODO find editable that is not collapsed
        const editable = DOM_helpers.find_previous_line_editable(element);
        if (editable !== undefined) {
            set_caret_position(editable as HTMLElement, 0);
        }
        return true;
    }
    else if (event.key === "ArrowDown") {
        // TODO find editable that is not collapsed
        const editable = DOM_helpers.find_next_line_editable(element);
        if (editable !== undefined) {
            set_caret_position(editable as HTMLElement, 0);
        }
        return true;
    }
    else if (event.key === "Home") {
        const selection = window.getSelection();
        if (selection !== null) {
            DOM_helpers.move_caret_to_start(element, selection);
        }
        return true;
    }
    else if (event.key === "End") {
        const selection = window.getSelection();
        if (selection !== null) {
            DOM_helpers.move_caret_to_end(element, selection);
        }
        return true;
    }

    return false;
}

export function handle_focus_empty_space(event: FocusEvent): void {

    if (event.target === null) {
        return;
    }

    const target = event.target as HTMLElement;

    set_caret_position(target, 0);
}
