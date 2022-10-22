<script setup lang="ts">

import { computed, ref } from "vue";
import "@vscode/codicons/dist/codicon.css";

import type * as core from "../../../../src/utilities/coreModelInterface";
import * as coreInterfaceHelpers from "../../../../src/utilities/coreModelInterfaceHelpers";
import * as type_utilities from "../../utilities/Type_utilities";
import * as vector_helpers from "../../utilities/Vector_helpers";
import { onThrowError } from "../../../../src/utilities/errors";

import * as Common from "../common/components";
import Select_type_reference from "./type_reference/Select_type_reference.vue";


const properties = defineProps<{
    module: core.Module;
    parameter_ids: core.Vector<number>;
    parameter_names: core.Vector<string>;
    parameter_types: core.Vector<core.Type_reference>;
}>();

const emit = defineEmits<{
    (e: 'update', parameter_ids: core.Vector<number>, parameter_names: core.Vector<string>, parameter_types: core.Vector<core.Type_reference>): void,
}>();

interface List_item_info {
    id: number,
    name: string,
    type: core.Type_reference
}

const list_items = computed(() => {

    const parameters: List_item_info[] = [];

    for (let index = 0; index < properties.parameter_ids.size; ++index) {

        const parameter: List_item_info = {
            id: properties.parameter_ids.elements[index],
            name: properties.parameter_names.elements[index],
            type: properties.parameter_types.elements[index]
        };

        parameters.push(parameter);
    }

    return parameters;
});

const id_name = "function_parameters";

function calculate_new_function_parameter_id(parameter_ids: core.Vector<number>): number {

    let id = parameter_ids.size;

    for (const existing_id of parameter_ids.elements) {
        id = Math.max(id, existing_id + 1);
    }

    return id;
}

function add_function_parameter(index: number): void {

    const new_id = calculate_new_function_parameter_id(properties.parameter_ids);
    const new_name = "value_" + new_id.toString();
    const new_type = type_utilities.create_default_type_reference();

    const insert_index = index + 1;

    const new_parameter_ids = properties.parameter_ids;
    vector_helpers.add_element_at_position(new_parameter_ids, insert_index, new_id);

    const new_parameter_names = properties.parameter_names;
    vector_helpers.add_element_at_position(new_parameter_names, insert_index, new_name);

    const new_parameter_types = properties.parameter_types;
    vector_helpers.add_element_at_position(new_parameter_types, insert_index, new_type);

    emit("update", new_parameter_ids, new_parameter_names, new_parameter_types);
}

function remove_function_parameter(index: number): void {

    const new_parameter_ids = properties.parameter_ids;
    vector_helpers.remove_element_at_position(new_parameter_ids, index);

    const new_parameter_names = properties.parameter_names;
    vector_helpers.remove_element_at_position(new_parameter_names, index);

    const new_parameter_types = properties.parameter_types;
    vector_helpers.remove_element_at_position(new_parameter_types, index);

    emit("update", new_parameter_ids, new_parameter_names, new_parameter_types);
}

function move_function_parameter_up(index: number): void {

    if (index === 0) {
        return;
    }

    const first_index = index - 1;
    const second_index = index;

    const new_parameter_ids = properties.parameter_ids;
    vector_helpers.swap_elements(new_parameter_ids, first_index, second_index);

    const new_parameter_names = properties.parameter_names;
    vector_helpers.swap_elements(new_parameter_names, first_index, second_index);

    const new_parameter_types = properties.parameter_types;
    vector_helpers.swap_elements(new_parameter_types, first_index, second_index);

    emit("update", new_parameter_ids, new_parameter_names, new_parameter_types);
}

function move_function_parameter_down(index: number): void {

    if ((index + 1) >= properties.parameter_ids.size) {
        return;
    }

    const first_index = index;
    const second_index = index + 1;

    const new_parameter_ids = properties.parameter_ids;
    vector_helpers.swap_elements(new_parameter_ids, first_index, second_index);

    const new_parameter_names = properties.parameter_names;
    vector_helpers.swap_elements(new_parameter_names, first_index, second_index);

    const new_parameter_types = properties.parameter_types;
    vector_helpers.swap_elements(new_parameter_types, first_index, second_index);

    emit("update", new_parameter_ids, new_parameter_names, new_parameter_types);
}

function find_index_of_parameter(parameter_id: number): number {
    const index = properties.parameter_ids.elements.find(value => value == parameter_id);
    if (index !== undefined) {
        return index;
    }

    const message = "Could not find index of parameter!";
    onThrowError(message);
    throw new Error(message);
}

function update_parameter_name(parameter_id: number, new_name: string): void {

    const index = find_index_of_parameter(parameter_id);

    const new_parameter_names = properties.parameter_names;
    new_parameter_names.elements[index] = new_name;

    emit("update", properties.parameter_ids, new_parameter_names, properties.parameter_types);
}

function update_parameter_type(parameter_id: number, new_type: core.Type_reference): void {

    const index = find_index_of_parameter(parameter_id);

    const new_parameter_types = properties.parameter_types;
    new_parameter_types.elements[index] = new_type;

    emit("update", properties.parameter_ids, properties.parameter_names, new_parameter_types);
}

</script>

<template>
    <Common.Select_list :items="list_items" v-on:add:item="add_function_parameter"
        v-on:remove:item="remove_function_parameter" v-on:move-up:item="move_function_parameter_up"
        v-on:move-down:item="move_function_parameter_down">
        <template #item_title="{name, type}">
            {{name}}: {{coreInterfaceHelpers.getUnderlyingTypeName([properties.module], type)}}
        </template>
        <template #item_body="{id, name, type}">
            <div>
                <label :for="id_name + '_parameter_name_' + id">Name: </label>
                <Common.Text_input id="id_name + '_parameter_name_' + id" :modelValue="name"
                    v-on:update:modelValue="(value: string) => update_parameter_name(id, value)"></Common.Text_input>
            </div>
            <div>
                <label for="id_name + '_parameter_type_' + id">Type: </label>
                <Select_type_reference id="id_name + '_parameter_type_' + id" :module="properties.module"
                    :current_type_reference="type" class="insert_padding_left"
                    v-on:update:type_reference="(value: core.Type_reference) => update_parameter_type(id, value)">
                </Select_type_reference>
            </div>
        </template>
    </Common.Select_list>
</template>

<style scoped>
.insert_padding_left {
    padding-left: 4ch;
}
</style>
