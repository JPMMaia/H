<script setup lang="ts">
import type { Search_entry } from "@/utilities/Search_entry";
import Search_field from '../Search_field.vue';

const properties = defineProps<{
    value: boolean;
}>();

const emit = defineEmits<{
    (e: 'update', new_value: boolean): void
}>();

function on_boolean_selected(id: number, name: string, data: any): void {

    if (name !== "false" && name !== "true") {
        return;
    }

    const value = name === "false" ? false : true;

    emit("update", value);
}

function get_boolean_possible_values(): Search_entry[] {
    return [
        { id: 0, name: "false", icon: "codicon-symbol-boolean", data: undefined },
        { id: 1, name: "true", icon: "codicon-symbol-boolean", data: undefined },
    ];
}
</script>

<template>
    <Search_field :possible_values="get_boolean_possible_values()" :current_search_term="properties.value.toString()"
        v-on:update="on_boolean_selected">
    </Search_field>
</template>

<style scoped>

</style>