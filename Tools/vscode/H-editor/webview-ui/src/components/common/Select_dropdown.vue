<script setup lang="ts">

import { computed } from "vue";
import "@vscode/codicons/dist/codicon.css";

const properties = defineProps<{
    current_item: any,
    items: any[],
    to_string: (item: any) => string;
}>();

const emit = defineEmits<{
    (e: "update", index: number, item: any): void
}>();

const current_index = computed(() => {
    return properties.items.findIndex(value => value === properties.current_item);
});

function on_value_selected(event: Event): void {
    if (event.target !== null) {
        const target = event.target as HTMLSelectElement;
        const value = target.value;
        const index = Number(value);
        if (!isNaN(index)) {
            const item = properties.items[index];
            emit("update", index, item);
        }
    }
}

</script>

<template>
    <select :modelValue="current_index" v-on:change="event => on_value_selected(event)">
        <option v-for="(item, index) of properties.items" v-bind:key="item" :value="index">
            {{properties.to_string(item)}}</option>
    </select>
</template>

<style scoped>

</style>
