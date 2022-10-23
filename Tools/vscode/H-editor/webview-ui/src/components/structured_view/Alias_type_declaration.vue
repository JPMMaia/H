<script setup lang="ts">

import "@vscode/codicons/dist/codicon.css";

import type * as core from "../../../../src/utilities/coreModelInterface";

import * as Common from "../common/components";
import Select_type_reference from "./type_reference/Select_type_reference.vue";
import * as Change from "../../../../src/utilities/Change";

const properties = defineProps<{
    module: core.Module;
    alias_type_declaration: core.Alias_type_declaration;
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

function on_name_changed(value: string): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("name", value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function on_type_changed(value: core.Type_reference): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_set_element_of_vector("type", 0, value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

</script>

<template>
    <Common.Collapsible>
        <template #summary="{}">
            <div class="horizontal_container">
                <i class="codicon codicon-symbol-parameter"></i> {{properties.alias_type_declaration.name}}
            </div>
        </template>
        <template #content="{}">
            <div class="vertical_container add_padding_left add_margin">
                <div>
                    <label :for="properties.alias_type_declaration.id + '-alias_type_name'">Name: </label>
                    <Common.Text_input :id="properties.alias_type_declaration.id + '-alias_type_name'"
                        :modelValue="properties.alias_type_declaration.name"
                        v-on:update:modelValue="(value: string) => on_name_changed(value)">
                    </Common.Text_input>
                </div>
                <div>
                    <label for="properties.alias_type_declaration.id + '-alias_type_select_type'">Type: </label>
                    <Select_type_reference id="properties.alias_type_declaration.id + '-alias_type_select_type'"
                        :module="properties.module"
                        :current_type_reference="properties.alias_type_declaration.type.elements[0]"
                        class="add_padding_left"
                        v-on:update:type_reference="(value: core.Type_reference) => on_type_changed(value)">
                    </Select_type_reference>
                </div>
            </div>
        </template>
    </Common.Collapsible>
</template>

<style scoped>
.add_margin {
    margin: 1ch;
}

.add_padding_left {
    padding-left: 3ch;
}

.horizontal_container {
    display: flex;
    flex-direction: row;
    column-gap: 1ch;
}

.vertical_container {
    display: flex;
    flex-direction: column;
    row-gap: 1ch;
}
</style>
