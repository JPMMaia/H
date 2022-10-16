<script setup lang="ts">

import { computed } from "vue";
import "@vscode/codicons/dist/codicon.css";

import * as core from "../../../../src/utilities/coreModelInterface";
import * as coreInterfaceHelpers from "../../../../src/utilities/coreModelInterfaceHelpers";

import Checkbox_input from "../common/Checkbox_input.vue";
import Function_parameters from "./Function_parameters.vue";
import Select_dropdown from "../common/Select_dropdown.vue";
import Text_input from "../common/Text_input.vue";

const properties = defineProps<{
    module: core.Module;
    function_id: number;
}>();

const emit = defineEmits<{
    (e: 'update:function_declaration', new_value: core.Function_declaration): void
}>();

const function_declaration = computed(() => {
    return coreInterfaceHelpers.findFunctionDeclarationWithId(properties.module, properties.function_id);
});

function on_name_changed(value: string): void {

    const new_function_declaration: core.Function_declaration = function_declaration.value;
    new_function_declaration.name = value;

    emit("update:function_declaration", new_function_declaration);
}

function on_linkage_changed(value: string): void {
    const linkage = core.Linkage[value as keyof typeof core.Linkage];

    const new_function_declaration: core.Function_declaration = function_declaration.value;
    new_function_declaration.linkage = linkage;

    emit("update:function_declaration", new_function_declaration);
}

function on_input_parameters_changed(parameter_ids: core.Vector<number>, parameter_names: core.Vector<string>, types: core.Vector<core.Type_reference>): void {

    const new_function_declaration: core.Function_declaration = function_declaration.value;
    new_function_declaration.input_parameter_ids = parameter_ids;
    new_function_declaration.input_parameter_names = parameter_names;
    new_function_declaration.type.input_parameter_types = types;

    emit("update:function_declaration", new_function_declaration);
}

function on_is_variadic_changed(value: boolean): void {

    const new_function_declaration: core.Function_declaration = function_declaration.value;
    new_function_declaration.type.is_variadic = value;

    emit("update:function_declaration", new_function_declaration);
}

function on_output_parameters_changed(parameter_ids: core.Vector<number>, parameter_names: core.Vector<string>, types: core.Vector<core.Type_reference>): void {

    const new_function_declaration: core.Function_declaration = function_declaration.value;
    new_function_declaration.output_parameter_ids = parameter_ids;
    new_function_declaration.output_parameter_names = parameter_names;
    new_function_declaration.type.output_parameter_types = types;

    emit("update:function_declaration", new_function_declaration);
}


</script>

<template>
    <section class="column_container add_margin">
        <header class="row_container"><i class="codicon codicon-symbol-method"></i> Function declaration</header>
        <div class="add_padding_left add_margin">
            <div>
                <label :for="properties.function_id + '-function_name'">Name: </label>
                <Text_input :id="properties.function_id + '-function_name'" :modelValue="function_declaration.name"
                    v-on:update:modelValue="value => on_name_changed(value)">
                </Text_input>
            </div>
            <div>
                <label :for="properties.function_id + '-linkage'">Linkage: </label>
                <Select_dropdown :id="properties.function_id + '-linkage'"
                    :current_item="function_declaration.linkage.toString()" :items="Object.keys(core.Linkage)"
                    :to_string="v => v" v-on:update="(index, value) => on_linkage_changed(value)">
                </Select_dropdown>
            </div>
            <div>
                <label :for="properties.function_id + '-input_function_parameters'">Input parameters: </label>
                <Function_parameters :id="properties.function_id + '-input_function_parameters'"
                    :module="properties.module" :parameter_ids="function_declaration.input_parameter_ids"
                    :parameter_names="function_declaration.input_parameter_names"
                    :parameter_types="function_declaration.type.input_parameter_types"
                    v-on:update="(parameter_ids, parameter_names, types) => on_input_parameters_changed(parameter_ids, parameter_names, types)">
                </Function_parameters>
            </div>
            <div>
                <label :for="properties.function_id + '-is_variadic'">Is variadic: </label>
                <Checkbox_input :id="properties.function_id + '-is_variadic'"
                    :modelValue="function_declaration.type.is_variadic"
                    v-on:update:modelValue="value => on_is_variadic_changed(value)"></Checkbox_input>
            </div>
            <div>
                <label :for="properties.function_id + '-output_function_parameters'">Output parameters: </label>
                <Function_parameters :id="properties.function_id + '-output_function_parameters'"
                    :module="properties.module" :parameter_ids="function_declaration.output_parameter_ids"
                    :parameter_names="function_declaration.output_parameter_names"
                    :parameter_types="function_declaration.type.output_parameter_types"
                    v-on:update="(parameter_ids, parameter_names, types) => on_output_parameters_changed(parameter_ids, parameter_names, types)">
                </Function_parameters>
            </div>
        </div>
    </section>
</template>

<style scoped>
.add_padding_left {
    padding-left: 3ch;
}

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
</style>
