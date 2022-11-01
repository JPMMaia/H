<script setup lang="ts">

import { computed, ref } from "vue";
import "@vscode/codicons/dist/codicon.css";

import type * as core from "../../../../src/utilities/coreModelInterface";

import type * as Change from "../../../../src/utilities/Change";
import * as Common from "../common/components";
import * as Structured_view from "./components";

const properties = defineProps<{
    module: core.Module;
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

enum Item_type {
    Alias,
    Enum,
    Struct,
    Function
}

interface Item {
    type: Item_type;
    value: core.Alias_type_declaration | core.Enum_declaration | core.Struct_declaration | core.Function_declaration;
    index: number;
    is_export: boolean;
}

function get_all_items(module: core.Module): Item[] {

    const items: Item[] = [];

    const add_items = (type: Item_type, elements: any[], is_export: boolean) => {
        for (let index = 0; index < elements.length; ++index) {
            const value = elements[index];
            items.push({
                type: type,
                value: value,
                index: index,
                is_export: is_export
            });
        }
    };

    add_items(Item_type.Alias, module.export_declarations.alias_type_declarations.elements, true);
    add_items(Item_type.Enum, module.export_declarations.enum_declarations.elements, true);
    add_items(Item_type.Struct, module.export_declarations.struct_declarations.elements, true);
    add_items(Item_type.Function, module.export_declarations.function_declarations.elements, true);
    add_items(Item_type.Alias, module.internal_declarations.alias_type_declarations.elements, false);
    add_items(Item_type.Enum, module.internal_declarations.enum_declarations.elements, false);
    add_items(Item_type.Struct, module.internal_declarations.struct_declarations.elements, false);
    add_items(Item_type.Function, module.internal_declarations.function_declarations.elements, false);

    return items;
}

const all_items = computed(() => {
    const items = get_all_items(properties.module);
    return items;
});

function get_item_type_vector_name(type: Item_type): string {
    switch (type) {
        case Item_type.Alias:
            return "alias_type_declarations";
        case Item_type.Enum:
            return "enum_declarations";
        case Item_type.Struct:
            return "struct_declarations";
        case Item_type.Function:
            return "function_declarations";
    }
}

function on_new_changes(type: Item_type, index: number, is_export: boolean, children_changes: Change.Hierarchy): void {

    const declarations_name = is_export ? "export_declarations" : "internal_declarations";
    const vector_name = get_item_type_vector_name(type);

    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: [declarations_name, vector_name, "elements", index],
                hierarchy: children_changes
            }
        ]
    };

    emit("new_changes", new_changes);
}

</script>

<template>
    <Common.List :items="all_items">
        <template #item_content="{ type, value, index, is_export }">
            <Structured_view.Alias_type_declaration v-if="type === Item_type.Alias" :module="properties.module"
                :alias_type_declaration="value"
                v-on:new_changes="(new_changes: Change.Hierarchy) => on_new_changes(Item_type.Alias, index, is_export, new_changes)">
            </Structured_view.Alias_type_declaration>
            <Structured_view.Enum_declaration v-else-if="type === Item_type.Enum" :module="properties.module"
                :enum_declaration="value"
                v-on:new_changes="(new_changes: Change.Hierarchy) => on_new_changes(Item_type.Enum, index, is_export, new_changes)">
            </Structured_view.Enum_declaration>
            <Structured_view.Struct_declaration v-else-if="type === Item_type.Struct" :module="properties.module"
                :struct_declaration="value"
                v-on:new_changes="(new_changes: Change.Hierarchy) => on_new_changes(Item_type.Struct, index, is_export, new_changes)">
            </Structured_view.Struct_declaration>
            <Structured_view.Function_declaration v-else-if="type === Item_type.Function" :module="properties.module"
                :function_id="value.id"
                v-on:new_changes="(new_changes: Change.Hierarchy) => on_new_changes(Item_type.Function, index, is_export, new_changes)">
            </Structured_view.Function_declaration>
            <div v-else>
                {{ value.name }}
            </div>
        </template>
    </Common.List>
</template>

<style scoped>

</style>
