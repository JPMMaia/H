<script setup lang="ts">

import { computed } from "vue";

import "@vscode/codicons/dist/codicon.css";

import type * as core from "../../../../src/utilities/coreModelInterface";

import * as Common from "../common/components";
import type * as Change from "../../../../src/utilities/Change";

import * as Instructions from "./instructions/components";

const properties = defineProps<{
    module: core.Module;
    function_definition: core.Function_definition;
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

const function_definition_index = computed(() => {
    return properties.module.definitions.function_definitions.elements.findIndex(value => value.id === properties.function_definition.id);
});

function on_new_changes(children_changes: Change.Hierarchy): void {

    if (function_definition_index.value < 0 || function_definition_index.value >= properties.module.definitions.function_definitions.elements.length) {
        return;
    }

    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: ["definitions", "function_definitions", "elements", function_definition_index.value],
                hierarchy: children_changes
            }
        ]
    };

    emit("new_changes", new_changes);
}

</script>

<template>
    <Common.Collapsible>
        <template #summary="{}">Definition</template>
        <template #content="{}">
            <Instructions.Code_block :module="properties.module" :statements="properties.function_definition.statements"
                v-on:new_changes="on_new_changes">
            </Instructions.Code_block>
        </template>
    </Common.Collapsible>
</template>

<style scoped>

</style>
