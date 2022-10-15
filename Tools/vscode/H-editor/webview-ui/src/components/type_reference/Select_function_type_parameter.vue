<script setup lang="ts">

import { computed } from "vue";

import type * as core from "../../../../src/utilities/coreModelInterface";
import * as core_helpers from "../../../../src/utilities/coreModelInterfaceHelpers";

import List from "../common/List.vue";
import Select_type_reference from "./Select_type_reference.vue";

const properties = defineProps<{
    module: core.Module;
    type_references: core.Vector<core.Type_reference>;
    default_value_type: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_references', value: core.Vector<core.Type_reference>): void,
}>();

function add_element_at_position(array: core.Vector<any>, index: number, element: any): void {
    if ((index + 1) >= array.elements.length) {
        array.elements.push(element);
    }
    else {
        array.elements.splice(index, 0, element);
    }

    array.size += 1;
}

function remove_element_at_position(array: core.Vector<any>, index: number): void {
    array.elements.splice(index, 1);
    array.size -= 1;
}

function swap_elements(array: core.Vector<any>, first_index: number, second_index: number): void {
    const first = array.elements[first_index];
    array.elements[first_index] = array.elements[second_index];
    array.elements[second_index] = first;
}

function emit_update_type_references(type_references: core.Vector<core.Type_reference>): void {
    emit("update:type_references", type_references);
}

function add_parameter(index: number): void {

    const default_value: core.Type_reference = properties.default_value_type;

    const new_vector = properties.type_references;
    add_element_at_position(new_vector, index + 1, default_value);

    emit_update_type_references(new_vector);
}

function remove_parameter(index: number): void {

    const new_vector = properties.type_references;
    remove_element_at_position(new_vector, index);

    emit_update_type_references(new_vector);
}

function move_parameter_up(index: number): void {

    if (index === 0) {
        return;
    }

    const new_vector = properties.type_references;
    swap_elements(new_vector, index - 1, index);

    emit_update_type_references(new_vector);
}

function move_parameter_down(index: number): void {

    if ((index + 1) >= properties.type_references.elements.length) {
        return;
    }

    const new_vector = properties.type_references;
    swap_elements(new_vector, index, index + 1);

    emit_update_type_references(new_vector);
}

function update_parameter_type(index: number, new_type: core.Type_reference): void {

    const new_vector = properties.type_references;
    new_vector.elements[index] = new_type;

    emit_update_type_references(new_vector);
}

interface List_item_info {
    index: number,
    type: core.Type_reference
}

const list_items = computed(() => {

    const infos: List_item_info[] = [];

    for (let index = 0; index < properties.type_references.size; ++index) {

        const parameter: List_item_info = {
            index: index,
            type: properties.type_references.elements[index]
        };

        infos.push(parameter);
    }

    return infos;
});


</script>

<template>
    <List :items="list_items" v-on:add:item="add_parameter" v-on:remove:item="remove_parameter"
        v-on:move-up:item="move_parameter_up" v-on:move-down:item="move_parameter_down">
        <template #item_title="{type}">
            {{core_helpers.getUnderlyingTypeName([properties.module], type)}}
        </template>
        <template #item_body="{index, type}">
            <div>
                <label for="function_type_parameter'">Type: </label>
                <Select_type_reference id="'function_type_parameter" :module="properties.module"
                    :current_type_reference="type"
                    v-on:update:type_reference="value => update_parameter_type(index, value)">
                </Select_type_reference>
            </div>
        </template>
    </List>
</template>

<style scoped>

</style>
