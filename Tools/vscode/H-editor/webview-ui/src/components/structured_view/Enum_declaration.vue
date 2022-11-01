<script setup lang="ts">

import { computed } from "vue";
import "@vscode/codicons/dist/codicon.css";

import type * as core from "../../../../src/utilities/coreModelInterface";

import * as Common from "../common/components";
import * as Change from "../../../../src/utilities/Change";

const properties = defineProps<{
    module: core.Module;
    enum_declaration: core.Enum_declaration;
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

function add_enum_value(index: number): void {

    const default_enum_value: core.Enum_value = {
        name: "value",
        value: index
    };

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_add_element_to_vector("values", index, default_enum_value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function remove_enum_value(index: number): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_remove_element_of_vector("values", index)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function move_enum_value_up(index: number): void {

    if (index == 0) {
        return;
    }

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_move_element_of_vector("values", index, index - 1)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function move_enum_value_down(index: number): void {

    if ((index + 1) >= properties.enum_declaration.values.elements.length) {
        return;
    }

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_move_element_of_vector("values", index, index + 1)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function on_enum_value_name_changed(index: number, value: string): void {

    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: ["values", "elements", index],
                hierarchy: {
                    changes: [
                        Change.create_update("name", value)
                    ],
                    children: []
                }
            }
        ]
    };

    emit("new_changes", new_changes);
}

function on_enum_value_value_changed(index: number, value: number): void {

    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: ["values", "elements", index],
                hierarchy: {
                    changes: [
                        Change.create_update("value", value)
                    ],
                    children: []
                }
            }
        ]
    };

    emit("new_changes", new_changes);
}

interface List_item {
    index: number,
    enum_value: core.Enum_value
}

const enum_value_items = computed(() => {

    const items: List_item[] = [];

    for (let index = 0; index < properties.enum_declaration.values.elements.length; ++index) {
        const enum_value = properties.enum_declaration.values.elements[index];
        items.push({
            index: index,
            enum_value: enum_value
        });
    }

    return items;
});

</script>

<template>
    <Common.Collapsible>
        <template #summary="{}">
            <div class="row_container">
                <i class="codicon codicon-symbol-enum"></i> {{ properties.enum_declaration.name }}
            </div>
        </template>
        <template #content="{}">
            <div class="column_container add_padding_left add_margin">
                <div>
                    <label :for="properties.enum_declaration.id + '-enum_name'">Name: </label>
                    <Common.Text_input :id="properties.enum_declaration.id + '-enum_name'"
                        :modelValue="properties.enum_declaration.name"
                        v-on:update:modelValue="(value: string) => on_name_changed(value)">
                    </Common.Text_input>
                </div>
                <div>
                    <label :for="properties.enum_declaration.id + '-enum_values'">Values:
                    </label>
                    <Common.Select_list id="properties.enum_declaration.id + '-enum_values'" :items="enum_value_items"
                        v-on:add:item="add_enum_value" v-on:remove:item="remove_enum_value"
                        v-on:move-up:item="move_enum_value_up" v-on:move-down:item="move_enum_value_down">
                        <template #item_title="{ enum_value }">
                            {{ enum_value.name }} = {{ enum_value.value }}
                        </template>
                        <template #item_body="{ index, enum_value }">
                            <div>
                                <label :for="properties.enum_declaration.id + '_value_name_' + enum_value.value">Name:
                                </label>
                                <Common.Text_input
                                    id="properties.enum_declaration.id + '_value_name_' + enum_value.value"
                                    :modelValue="enum_value.name"
                                    v-on:update:modelValue="(value: string) => on_enum_value_name_changed(index, value)">
                                </Common.Text_input>
                            </div>
                            <div>
                                <label :for="properties.enum_declaration.id + '_value_value_' + enum_value.value">Value:
                                </label>
                                <Common.Number_input
                                    id="properties.enum_declaration.id + '_value_name_' + enum_value.value"
                                    :modelValue="enum_value.value" :minimum="0" :maximum="2147483647"
                                    v-on:update:modelValue="(value: number) => on_enum_value_value_changed(index, value)">
                                </Common.Number_input>
                            </div>
                        </template>
                    </Common.Select_list>
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
