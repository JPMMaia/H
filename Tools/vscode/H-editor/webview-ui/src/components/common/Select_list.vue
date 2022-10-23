<script setup lang="ts">

import { ref, watch } from "vue";
import "@vscode/codicons/dist/codicon.css";

const properties = defineProps<{
    items: any[];
}>();

const emit = defineEmits<{
    (e: 'add:item', index: number): void,
    (e: 'remove:item', index: number): void,
    (e: 'move-up:item', index: number): void,
    (e: 'move-down:item', index: number): void
}>();


const select_item_html_element = ref<HTMLSelectElement | undefined>(undefined);
const selected_item_index = ref<number | undefined>(properties.items.length > 0 ? 0 : undefined);

let add_element_pending: number | undefined = undefined;

async function select_parameter(index: number | undefined): Promise<void> {

    selected_item_index.value = index;

    if (select_item_html_element.value !== undefined) {
        const select_element = select_item_html_element.value;
        select_element.value = index !== undefined ? index.toString() : "";
    }
}

watch(() => properties.items, (new_value: any[], old_value: any[]) => {

    if (add_element_pending !== undefined && add_element_pending < new_value.length) {
        select_parameter(add_element_pending);
        add_element_pending = undefined;
    }
    else if (selected_item_index.value !== undefined && selected_item_index.value >= new_value.length) {
        if (new_value.length === 0) {
            select_parameter(undefined);
        }
        else {
            select_parameter(new_value.length - 1);
        }
    }
});

function on_selected_item_index_changed(event: Event): void {
    if (event.target !== null) {
        const target = event.target as HTMLSelectElement;
        const index = Number(target.value);
        if (!isNaN(index)) {
            selected_item_index.value = index;
        }
    }
}

function add_item(index: number): void {
    add_element_pending = index;
    emit("add:item", index);
}

function remove_item(index: number): void {
    emit("remove:item", index);
}

function move_item_up(index: number): void {
    if (index > 0) {
        emit("move-up:item", index);
        select_parameter(index - 1);
    }
}

function move_item_down(index: number): void {
    if ((index + 1) < properties.items.length) {
        emit("move-down:item", index);
        select_parameter(index + 1);
    }
}

</script>

<template>
    <div class="column_container add_margin">
        <div class="row_container">
            <select class="fill_grow" ref="select_item_html_element" :modelValue="selected_item_index"
                v-on:change="event => on_selected_item_index_changed(event)"
                :size="Math.max(properties.items.length, 3)">
                <option v-for="(item, index) in properties.items" v-bind:key="index" :value="index"
                    :selected="selected_item_index === index">
                    <slot name="item_title" v-bind="item"></slot>
                </option>
            </select>
            <div class="column_container no_grow">
                <vscode-button class="square_dimensions"
                    @click="add_item(selected_item_index !== undefined ? selected_item_index+1 : 0)">
                    <i class="codicon codicon-add"></i>
                </vscode-button>
                <vscode-button class="square_dimensions" :disabled="selected_item_index === undefined"
                    @click="remove_item(selected_item_index !== undefined ? selected_item_index : 0)">
                    <i class="codicon codicon-remove"></i>
                </vscode-button>
                <vscode-button class="square_dimensions"
                    :disabled="selected_item_index === undefined || selected_item_index === 0"
                    @click="move_item_up(selected_item_index !== undefined ? selected_item_index : 0)">
                    <i class="codicon codicon-triangle-up"></i>
                </vscode-button>
                <vscode-button class="square_dimensions"
                    :disabled="selected_item_index === undefined || (selected_item_index + 1) === properties.items.length"
                    @click="move_item_down(selected_item_index !== undefined ? selected_item_index : 0)">
                    <i class="codicon codicon-triangle-down"></i>
                </vscode-button>
            </div>
        </div>
        <div v-if="selected_item_index !== undefined">
            <slot name="item_body" v-bind="properties.items[selected_item_index]" :key="selected_item_index"></slot>
        </div>
    </div>
</template>

<style scoped>
.add_margin {
    margin: 1ch;
}

.row_container {
    display: flex;
    flex-direction: row;
    column-gap: 1ch;
}

.column_container {
    display: flex;
    flex-direction: column;
    row-gap: 1ch;
}

.no_grow {
    flex-grow: 0;
}

.fill_grow {
    flex-grow: 1;
}

.square_dimensions {
    width: 5ch;
    height: 5ch;
}
</style>
