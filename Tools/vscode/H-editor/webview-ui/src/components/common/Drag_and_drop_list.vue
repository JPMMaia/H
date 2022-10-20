<script setup lang="ts">
import "@vscode/codicons/dist/codicon.css";
import { onThrowError } from "../../../../src/utilities/errors";

const properties = defineProps<{
    items: any[]
}>();

const emit = defineEmits<{
}>();

function get_position_in_page(element: Element): { left: number, top: number } {

    const rect = element.getBoundingClientRect();

    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
}

function get_item_element(draggable_element: HTMLElement): HTMLElement {
    const parent = draggable_element.parentElement;

    if (parent !== null) {
        const item_element = parent.parentElement;
        if (item_element !== null) {
            return item_element;
        }
    }

    const message = "Drag_and_drop_list.vue: could not find item element!";
    onThrowError(message);
    throw Error(message);
}

function drag_start(event: DragEvent, item_index: number): void {

    const item_element = get_item_element(event.target as HTMLElement);
    item_element.style.setProperty("opacity", "0.5");

    if (event.dataTransfer !== null) {
        event.dataTransfer.setDragImage(item_element, 0, 0);
    }
}

function drag(event: DragEvent, item_index: number): void {

    event.preventDefault();

    const is_last_event_before_drop = (event.screenX === 0) && (event.screenY === 0);
    if (is_last_event_before_drop) {
        return;
    }

    const item_element = get_item_element(event.target as HTMLElement);
    const item_parent_element = item_element.parentElement as HTMLElement;

    const next_item_position = { left: event.pageX, top: event.pageY };
    const current_item_position = get_position_in_page(item_element);

    const offset = { x: next_item_position.left - current_item_position.left, y: next_item_position.top - current_item_position.top };

    if (offset.y === 0) {
        return;
    }

    const list_element = item_parent_element.parentElement as HTMLElement;

    if (offset.y < 0) {

        let insert_index: number | undefined = undefined;

        for (let indexPlusOne = item_index; indexPlusOne > 0; indexPlusOne -= 1) {
            const index = indexPlusOne - 1;
            const adjacent_element = list_element.children[index];
            const adjacent_element_position = get_position_in_page(adjacent_element);

            if (adjacent_element_position.top > next_item_position.top) {
                insert_index = index;
            }
            else {
                break;
            }
        }

        if (insert_index !== undefined) {
            const start_move_index = insert_index;
            const end_move_index = item_index;
            const item_to_insert = properties.items[item_index];

            for (let indexPlusOne = end_move_index; indexPlusOne > start_move_index; indexPlusOne -= 1) {
                const index = indexPlusOne - 1;
                properties.items[index + 1] = properties.items[index];
            }
            properties.items[insert_index] = item_to_insert;
        }
    }
    else if (offset.y > 0) {

        let insert_index: number | undefined = undefined;

        for (let index = item_index + 1; index < properties.items.length; index += 1) {

            const adjacent_element = list_element.children[index];
            const adjacent_element_position = get_position_in_page(adjacent_element);

            if (adjacent_element_position.top < next_item_position.top) {
                insert_index = index;
            }
            else {
                break;
            }
        }

        if (insert_index !== undefined) {
            const start_move_index = item_index + 1;
            const end_move_index = insert_index + 1;
            const item_to_insert = properties.items[item_index];

            for (let index = start_move_index; index < end_move_index; index += 1) {
                properties.items[index - 1] = properties.items[index];
            }
            properties.items[insert_index] = item_to_insert;
        }
    }
}

function drag_end(event: DragEvent, item_index: number): void {

    const item_element = get_item_element(event.target as HTMLElement);
    item_element.style.removeProperty("opacity");
}

</script>

<template>
    <div class="vertical_container">
        <TransitionGroup name="transition">
            <div v-for="(item, index) of properties.items" v-bind:key="item">
                <div name="item_element" :key="item" class="vertical_container relative_position">
                    <div class="horizontal_container">
                        <div name="item_draggable" class="codicon codicon-gripper" draggable="true"
                            v-on:dragstart="event => drag_start(event, index)" v-on:drag="event => drag(event, index)"
                            v-on:dragend="event => drag_end(event, index)">
                        </div>
                        <div>
                            <slot name="item_content" v-bind="item" :key="item"></slot>
                        </div>
                    </div>
                </div>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.horizontal_container {
    display: flex;
    flex-direction: row;
}

.vertical_container {
    display: flex;
    flex-direction: column;
}

.add_left_margin {
    margin-left: 2ch;
}

.absolute_position {
    position: absolute;
}

.relative_position {
    position: relative;
}

.transition-move,
/* apply transition to moving elements */
.transition-enter-active,
.transition-leave-active {
    transition: all 0.5s ease;
}

.transition-enter-from,
.transition-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.transition-leave-active {
    position: absolute;
}
</style>
