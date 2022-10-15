<script setup lang="ts">

import { computed, ref } from "vue";
import "@vscode/codicons/dist/codicon.css";

import type * as core from "../../../../src/utilities/coreModelInterface";
import * as coreInterfaceHelpers from "../../../../src/utilities/coreModelInterfaceHelpers";
import * as type_utilities from "../../utilities/Type_utilities";

import List from "../common/List.vue";
import Select_type_reference from "./type_reference/Select_type_reference.vue";
import Text_input from "../common/Text_input.vue";


const properties = defineProps<{
    module: core.Module;
    function_id: number;
}>();

const emit = defineEmits<{
    (e: 'add:parameter', function_id: number, parameter_info: coreInterfaceHelpers.FunctionParameterInfo): void,
    (e: 'remove:parameter', function_id: number, index: number): void,
    (e: 'move-up:parameter', function_id: number, index: number): void,
    (e: 'move-down:parameter', function_id: number, index: number): void,
    (e: 'update:parameter', function_id: number, parameter_id: number, attribute: string, new_value: any): void,
}>();

const function_declaration = computed(() => {
    return coreInterfaceHelpers.findFunctionDeclarationWithId(properties.module, properties.function_id);
});

interface Function_parameter {
    id: number,
    name: string,
    type: core.Type_reference
}

const function_parameters = computed(() => {

    const parameters: Function_parameter[] = [];

    for (let index = 0; index < function_declaration.value.input_parameter_ids.size; ++index) {

        const parameter: Function_parameter = {
            id: function_declaration.value.input_parameter_ids.elements[index],
            name: function_declaration.value.input_parameter_names.elements[index],
            type: function_declaration.value.type.input_parameter_types.elements[index]
        };

        parameters.push(parameter);
    }

    return parameters;
});

const id_name = "function_" + properties.function_id.toString();

function calculate_new_function_parameter_id(function_declaration: core.Function_declaration): number {

    let id = function_declaration.input_parameter_ids.size;

    for (const existing_id of function_declaration.input_parameter_ids.elements) {
        id = Math.max(id, existing_id + 1);
    }

    return id;
}

function add_function_parameter(index: number): void {
    const parameter_id = calculate_new_function_parameter_id(function_declaration.value);
    const type_reference = type_utilities.create_default_type_reference();

    const parameter_info: coreInterfaceHelpers.FunctionParameterInfo = {
        index: index,
        id: parameter_id,
        name: "value_" + parameter_id.toString(),
        type: type_reference
    };

    emit("add:parameter", properties.function_id, parameter_info);
}

function remove_function_parameter(index: number): void {
    emit("remove:parameter", properties.function_id, index);
}

function move_function_parameter_up(index: number): void {
    emit("move-up:parameter", properties.function_id, index);
}

function move_function_parameter_down(index: number): void {
    emit("move-down:parameter", properties.function_id, index);
}

function update_parameter_name(parameter_id: number, new_name: string): void {
    emit("update:parameter", properties.function_id, parameter_id, "name", new_name);
}

function update_parameter_type(parameter_id: number, new_type: core.Type_reference): void {
    emit("update:parameter", properties.function_id, parameter_id, "type", new_type);
}

</script>

<template>
    <List :items="function_parameters" v-on:add:item="add_function_parameter"
        v-on:remove:item="remove_function_parameter" v-on:move-up:item="move_function_parameter_up"
        v-on:move-down:item="move_function_parameter_down">
        <template #item_title="{name, type}">
            {{name}}: {{coreInterfaceHelpers.getUnderlyingTypeName([properties.module], type)}}
        </template>
        <template #item_body="{id, name, type}">
            <div>
                <label :for="id_name + '_parameter_name_' + id">Name: </label>
                <Text_input id="id_name + '_parameter_name_' + id" :modelValue="name"
                    v-on:update:modelValue="(value) => update_parameter_name(id, value)"></Text_input>
            </div>
            <div>
                <label for="id_name + '_parameter_type_' + id">Type: </label>
                <Select_type_reference id="id_name + '_parameter_type_' + id" :module="properties.module"
                    :current_type_reference="type" class="insert_padding_left"
                    v-on:update:type_reference="(value) => update_parameter_type(id, value)">
                </Select_type_reference>
            </div>
        </template>
    </List>
</template>

<style scoped>
.insert_padding_left {
    padding-left: 4ch;
}
</style>
