<script setup lang="ts">

import { computed } from "vue";
import "@vscode/codicons/dist/codicon.css";

import type * as core from "../../../../src/utilities/coreModelInterface";
import * as core_helpers from "../../../../src/utilities/coreModelInterfaceHelpers";
import * as type_utilities from "../../../../src/utilities/Type_utilities";

import * as Common from "../common/components";
import * as Change from "../../../../src/utilities/Change";
import Select_type_reference from "./type_reference/Select_type_reference.vue";

const properties = defineProps<{
    module: core.Module;
    struct_declaration: core.Struct_declaration;
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

function add_struct_member(index: number): void {

    const new_name = "member";
    const new_type = type_utilities.create_default_type_reference();

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_add_element_to_vector("member_names", index, new_name),
            Change.create_add_element_to_vector("member_types", index, new_type)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function remove_struct_member(index: number): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_remove_element_of_vector("member_names", index),
            Change.create_remove_element_of_vector("member_types", index)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function move_struct_member_up(index: number): void {

    if (index == 0) {
        return;
    }

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_move_element_of_vector("member_names", index, index - 1),
            Change.create_move_element_of_vector("member_types", index, index - 1)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function move_struct_member_down(index: number): void {

    if ((index + 1) >= properties.struct_declaration.member_names.elements.length) {
        return;
    }

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_move_element_of_vector("member_names", index, index + 1),
            Change.create_move_element_of_vector("member_types", index, index + 1)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function on_struct_member_name_changed(index: number, value: string): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_set_element_of_vector("member_names", index, value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function on_struct_member_type_changed(index: number, value: core.Type_reference): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_set_element_of_vector("member_types", index, value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function on_is_packed_changed(value: boolean): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("is_packed", value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function on_is_literal_changed(value: boolean): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("is_literal", value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

interface Member_list_item {
    index: number,
    member_name: string,
    member_type: core.Type_reference
}

const list_items = computed(() => {

    const items: Member_list_item[] = [];

    for (let index = 0; index < properties.struct_declaration.member_types.elements.length; ++index) {
        items.push({
            index: index,
            member_name: properties.struct_declaration.member_names.elements[index],
            member_type: properties.struct_declaration.member_types.elements[index]
        });
    }

    return items;
});

</script>

<template>
    <Common.Collapsible>
        <template #summary="{}">
            <div class="row_container">
                <i class="codicon codicon-symbol-namespace"></i> {{ properties.struct_declaration.name }}
            </div>
        </template>
        <template #content="{}">
            <div class="column_container add_padding_left add_margin">
                <div>
                    <label :for="properties.struct_declaration.id + '-struct_name'">Name: </label>
                    <Common.Text_input :id="properties.struct_declaration.id + '-struct_name'"
                        :modelValue="properties.struct_declaration.name"
                        v-on:update:modelValue="(value: string) => on_name_changed(value)">
                    </Common.Text_input>
                </div>
                <div>
                    <label :for="properties.struct_declaration.id + '-struct_members'">Members:
                    </label>
                    <Common.Select_list id="properties.struct_declaration.id + '-struct_members'" :items="list_items"
                        v-on:add:item="add_struct_member" v-on:remove:item="remove_struct_member"
                        v-on:move-up:item="move_struct_member_up" v-on:move-down:item="move_struct_member_down">
                        <template #item_title="{ member_name, member_type }">
                            {{ member_name }}: {{ core_helpers.getUnderlyingTypeName([properties.module], member_type)
                            }}
                        </template>
                        <template #item_body="{ index, member_name, member_type }">
                            <div>
                                <label :for="properties.struct_declaration.id + '_member_name_' + index">Name:
                                </label>
                                <Common.Text_input id="properties.struct_declaration.id + '_member_name_' + index"
                                    :modelValue="member_name"
                                    v-on:update:modelValue="(value: string) => on_struct_member_name_changed(index, value)">
                                </Common.Text_input>
                            </div>
                            <div>
                                <label :for="properties.struct_declaration.id + '_member_type_' + index">Type:
                                </label>
                                <Select_type_reference id="properties.struct_declaration.id + '_member_type_' + index"
                                    :module="properties.module" :current_type_reference="member_type"
                                    class="insert_padding_left"
                                    v-on:update:type_reference="(value: core.Type_reference) => on_struct_member_type_changed(index, value)">
                                </Select_type_reference>
                            </div>
                        </template>
                    </Common.Select_list>
                </div>
                <div>
                    <label :for="properties.struct_declaration.id + '-struct_is_packed'">Is packed: </label>
                    <Common.Checkbox_input :id="properties.struct_declaration.id + '-struct_is_packed'"
                        :modelValue="properties.struct_declaration.is_packed"
                        v-on:update:modelValue="(value: boolean) => on_is_packed_changed(value)">
                    </Common.Checkbox_input>
                </div>
                <div>
                    <label :for="properties.struct_declaration.id + '-struct_is_literal'">Is literal: </label>
                    <Common.Checkbox_input :id="properties.struct_declaration.id + '-struct_is_literal'"
                        :modelValue="properties.struct_declaration.is_literal"
                        v-on:update:modelValue="(value: boolean) => on_is_literal_changed(value)">
                    </Common.Checkbox_input>
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
