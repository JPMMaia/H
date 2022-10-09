<script setup lang="ts">

import { computed, onMounted, ref } from "vue";
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

function select_parameter(index: number): void {

    if (select_item_html_element.value !== undefined) {
        const select_element = select_item_html_element.value;
        select_element.value = index.toString();
    }

    selected_item_index.value = index;
}

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
    <div>
        <select ref="select_item_html_element" :modelValue="selected_item_index"
            v-on:change="event => on_selected_item_index_changed(event)" :size="Math.max(properties.items.length, 3)">
            <option v-for="(item, index) in properties.items" v-bind:key="index" :value="index">
                <slot name="item_title" v-bind="item"></slot>
            </option>
        </select>
        <div>
            <vscode-button @click="add_item(selected_item_index !== undefined ? selected_item_index+1 : 0)">
                <i class="codicon codicon-add"></i>
            </vscode-button>
            <vscode-button :disabled="selected_item_index === undefined"
                @click="remove_item(selected_item_index !== undefined ? selected_item_index : 0)">
                <i class="codicon codicon-remove"></i>
            </vscode-button>
            <vscode-button :disabled="selected_item_index === undefined || selected_item_index === 0"
                @click="move_item_up(selected_item_index !== undefined ? selected_item_index : 0)">
                <i class="codicon codicon-triangle-up"></i>
            </vscode-button>
            <vscode-button
                :disabled="selected_item_index === undefined || (selected_item_index + 1) === properties.items.length"
                @click="move_item_down(selected_item_index !== undefined ? selected_item_index : 0)">
                <i class="codicon codicon-triangle-down"></i>
            </vscode-button>
        </div>
        <div v-if="selected_item_index !== undefined">
            <slot name="item_body" v-bind="properties.items[selected_item_index]" :key="selected_item_index"></slot>
        </div>
    </div>
</template>

<style scoped>

</style>
