<script setup lang="ts">

import { computed, ref } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";

import * as name_utilities from "../../utilities/Name_utilities";
import * as search_utilities from "../../utilities/Search_utilities";

import Search_field from "../Search_field.vue";

const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

function create_initial_value(current_type_reference: core.Type_reference): core.Alias_type_reference | core.Enum_type_reference | core.Struct_type_reference | undefined {
    if (current_type_reference.data.type === core.Type_reference_enum.Alias_type_reference) {
        return current_type_reference.data.value as core.Alias_type_reference;
    }
    else if (current_type_reference.data.type === core.Type_reference_enum.Enum_type_reference) {
        return current_type_reference.data.value as core.Enum_type_reference;
    }
    else if (current_type_reference.data.type === core.Type_reference_enum.Struct_type_reference) {
        return current_type_reference.data.value as core.Struct_type_reference;
    }
    else {
        return undefined;
    }
}

const initial_value = create_initial_value(properties.current_type_reference);
const initial_search_term = initial_value === undefined ? "" : name_utilities.get_other_type_reference_name(properties.module, properties.current_type_reference.data.type, initial_value);

function on_value_updated(id: number, name: string, data: any): void {

    const type: core.Type_reference_enum = data.type;
    const module_name: string = data.module_name;

    if (type === core.Type_reference_enum.Alias_type_reference) {

        const alias_type_reference: core.Alias_type_reference = {
            module_reference: {
                name: module_name
            },
            id: id
        };

        const new_type_reference: core.Type_reference = {
            data: {
                type: core.Type_reference_enum.Alias_type_reference,
                value: alias_type_reference
            }
        };

        emit("update:type_reference", new_type_reference);
    }
    else if (type === core.Type_reference_enum.Enum_type_reference) {

        const enum_type_reference: core.Enum_type_reference = {
            module_reference: {
                name: module_name
            },
            id: id
        };

        const new_type_reference: core.Type_reference = {
            data: {
                type: core.Type_reference_enum.Enum_type_reference,
                value: enum_type_reference
            }
        };

        emit("update:type_reference", new_type_reference);
    }
    else if (type === core.Type_reference_enum.Struct_type_reference) {

        const struct_type_reference: core.Struct_type_reference = {
            module_reference: {
                name: module_name
            },
            id: id
        };

        const new_type_reference: core.Type_reference = {
            data: {
                type: core.Type_reference_enum.Struct_type_reference,
                value: struct_type_reference
            }
        };

        emit("update:type_reference", new_type_reference);
    }
}

</script>

<template>
    <Search_field
        :possible_values="search_utilities.get_other_visible_types_for_module_search_entries(properties.module)"
        :current_search_term="initial_search_term" v-on:update="on_value_updated">
    </Search_field>
</template>

<style scoped>

</style>
