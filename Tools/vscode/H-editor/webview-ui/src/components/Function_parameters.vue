<script setup lang="ts">

import { computed, onMounted, ref } from "vue";
import "@vscode/codicons/dist/codicon.css";

import * as core from "../../../src/utilities/coreModelInterface";
import * as coreInterfaceHelpers from "../../../src/utilities/coreModelInterfaceHelpers";
import * as searchUtilities from "../utilities/Search_utilities";

import Editable from "./Editable.vue";
import Search_field from "./Search_field.vue";
import Select_type_reference from "./type_reference/Select_type_reference.vue";


const properties = defineProps<{
    module: core.Module;
    function_id: number;
}>();

const emit = defineEmits<{
    (e: 'add:input_parameter'): void,
    (e: 'remove:input_parameter', index: number): void,
    (e: 'move-up:input_parameter', index: number): void,
    (e: 'move-down:input_parameter', index: number): void
}>();

const function_declaration = computed(() => {
    return coreInterfaceHelpers.findFunctionDeclarationWithId(properties.module, properties.function_id);
});

const function_definiton = computed(() => {
    return coreInterfaceHelpers.findFunctionDefinitionWithId(properties.module, properties.function_id);
});

function get_function_parameter_type(parameter_index: number): core.Type_reference {
    const parameter_type = function_declaration.value.type.parameter_types.elements[parameter_index];
    return parameter_type;
}

const selected_parameter_index = ref<number | undefined>(function_declaration.value.parameter_ids.size > 0 ? 0 : undefined);

function on_selected_parameter_index_changed(event: Event): void {
    if (event.target !== null) {
        const target = event.target as HTMLSelectElement;
        const index = Number(target.value);
        if (!isNaN(index)) {
            selected_parameter_index.value = index;
        }
    }
}

function add_function_parameter(): void {
    emit("add:input_parameter");
}

function remove_function_parameter(index: number): void {
    emit("remove:input_parameter", index);
}

function move_function_parameter_up(index: number): void {
    emit("move-up:input_parameter", index);
}

function move_function_parameter_down(index: number): void {
    emit("move-down:input_parameter", index);
}

</script>

<template>
    <div>
        <select :name="function_declaration.name + '_parameters_select'" :modelValue="selected_parameter_index"
            v-on:change="event => on_selected_parameter_index_changed(event)"
            :size="function_declaration.parameter_ids.size">
            <option v-for="(parameter_id, index) in function_declaration.parameter_ids.elements" v-bind:key="index"
                :value="index">
                {{function_declaration.parameter_names.elements[index]}}:
                {{coreInterfaceHelpers.getUnderlyingTypeName(properties.module,
                function_declaration.type.parameter_types.elements[index])}}
            </option>
        </select>
        <div>
            <vscode-button @click="add_function_parameter()">
                <i class="codicon codicon-add"></i>
            </vscode-button>
            <vscode-button :disabled="selected_parameter_index === undefined"
                @click="remove_function_parameter(selected_parameter_index)">
                <i class="codicon codicon-remove"></i>
            </vscode-button>
            <vscode-button :disabled="selected_parameter_index === undefined"
                @click="move_function_parameter_up(selected_parameter_index)">
                <i class="codicon codicon-triangle-up"></i>
            </vscode-button>
            <vscode-button :disabled="selected_parameter_index === undefined"
                @click="move_function_parameter_down(selected_parameter_index)">
                <i class="codicon codicon-triangle-down"></i>
            </vscode-button>
        </div>
        <div v-if="selected_parameter_index !== undefined">
            <div>
                <label for="parameter_name">Name: </label>
                <Editable id="parameter_name"
                    :model-value="function_declaration.parameter_names.elements[selected_parameter_index]">
                </Editable>
            </div>
            <div>
                <label for="parameter_type_select">Type: </label>
                <Select_type_reference id="parameter_type_select" :key="selected_parameter_index"
                    :module="properties.module"
                    :current_type_reference="get_function_parameter_type(selected_parameter_index)">
                </Select_type_reference>
            </div>

        </div>
    </div>
</template>

<style scoped>
#parameter_type_select {
    padding-left: 4ch;
}
</style>
