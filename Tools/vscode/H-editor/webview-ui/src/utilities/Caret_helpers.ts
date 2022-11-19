import * as DOM_helpers from "./DOM_helpers";

function set_caret_position(element: HTMLElement, offset: number): void {
    if (element.childNodes.length > 0) {
        const selection = window.getSelection();
        if (selection !== null) {
            DOM_helpers.set_caret_position(element, selection, offset);
        }
    }
}

function move_caret_once(element: HTMLElement, offset: number): void {
    if (element.childNodes.length > 0) {
        const selection = window.getSelection();
        if (selection !== null) {
            DOM_helpers.move_caret_once(element, offset, selection);
        }
    }
}

export function handle_caret_keys(event: KeyboardEvent): boolean {

    const element = event.target as HTMLElement;

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
