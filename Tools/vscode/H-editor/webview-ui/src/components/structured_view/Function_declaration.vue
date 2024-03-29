<script setup lang="ts">

import { computed } from "vue";
import "@vscode/codicons/dist/codicon.css";

import * as core from "../../../../src/utilities/coreModelInterface";
import * as coreInterfaceHelpers from "../../../../src/utilities/coreModelInterfaceHelpers";

import * as Common from "../common/components";
import Function_definition from "./Function_definition.vue";
import Function_parameters from "./Function_parameters.vue";
import * as Change from "../../../../src/utilities/Change";

const properties = defineProps<{
    module: core.Module;
    function_id: number;
}>();

const emit = defineEmits<{
    (e: 'declaration:new_changes', new_changes: Change.Hierarchy): void,
    (e: 'definition:new_changes', new_changes: Change.Hierarchy): void
}>();

const function_declaration = computed(() => {
    return coreInterfaceHelpers.findFunctionDeclarationWithId(properties.module, properties.function_id);
});

const function_definition = computed(() => {
    return coreInterfaceHelpers.findFunctionDefinitionWithId(properties.module, properties.function_id);
});

function on_name_changed(value: string): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("name", value)
        ],
        children: []
    };

    emit("declaration:new_changes", new_changes);
}

function on_linkage_changed(value: string): void {
    const linkage = core.Linkage[value as keyof typeof core.Linkage];

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("linkage", linkage)
        ],
        children: []
    };

    emit("declaration:new_changes", new_changes);
}

function on_input_parameters_changed(new_changes: Change.Hierarchy): void {

    emit("declaration:new_changes", new_changes);
}

function on_is_variadic_changed(value: boolean): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("is_variadic", value)
        ],
        children: []
    };

    emit("declaration:new_changes", new_changes);
}

function on_output_parameters_changed(new_changes: Change.Hierarchy): void {

    emit("declaration:new_changes", new_changes);
}

function on_definition_new_changes(new_changes: Change.Hierarchy): void {

    emit("definition:new_changes", new_changes);
}

</script>

<template>
    <Common.Collapsible>
        <template #summary="{}">
            <div class="row_container">
                <i class="codicon codicon-symbol-method"></i> {{ function_declaration.name }}
            </div>
        </template>
        <template #content="{}">
            <div class="column_container add_padding_left add_margin">
                <div>
                    <label :for="properties.function_id + '-function_name'">Name: </label>
                    <Common.Text_input :id="properties.function_id + '-function_name'"
                        :modelValue="function_declaration.name"
                        v-on:update:modelValue="(value: string) => on_name_changed(value)">
                    </Common.Text_input>
                </div>
                <div>
                    <label :for="properties.function_id + '-linkage'">Linkage: </label>
                    <Common.Select_dropdown :id="properties.function_id + '-linkage'"
                        :current_item="function_declaration.linkage.toString()" :items="Object.keys(core.Linkage)"
                        :to_string="v => v" v-on:update="(index: number, value: string) => on_linkage_changed(value)">
                    </Common.Select_dropdown>
                </div>
                <div>
                    <label :for="properties.function_id + '-input_function_parameters'">Input parameters: </label>
                    <Function_parameters :id="properties.function_id + '-input_function_parameters'"
                        :module="properties.module" :parameter_ids="function_declaration.input_parameter_ids"
                        :parameter_names="function_declaration.input_parameter_names"
                        :parameter_types="function_declaration.type.input_parameter_types" :is_input_parameters="true"
                        v-on:new_changes="on_input_parameters_changed">
                    </Function_parameters>
                </div>
                <div>
                    <label :for="properties.function_id + '-is_variadic'">Is variadic: </label>
                    <Common.Checkbox_input :id="properties.function_id + '-is_variadic'"
                        :modelValue="function_declaration.type.is_variadic"
                        v-on:update:modelValue="(value: boolean) => on_is_variadic_changed(value)">
                    </Common.Checkbox_input>
                </div>
                <div>
                    <label :for="properties.function_id + '-output_function_parameters'">Output parameters: </label>
                    <Function_parameters :id="properties.function_id + '-output_function_parameters'"
                        :module="properties.module" :parameter_ids="function_declaration.output_parameter_ids"
                        :parameter_names="function_declaration.output_parameter_names"
                        :parameter_types="function_declaration.type.output_parameter_types" :is_input_parameters="false"
                        v-on:new_changes="on_output_parameters_changed">
                    </Function_parameters>
                </div>
                <div>
                    <Function_definition :module="module" :function_definition="function_definition"
                        v-on:new_changes="on_definition_new_changes">
                    </Function_definition>
                </div>
            </div>
        </template>
    </Common.Collapsible>
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
