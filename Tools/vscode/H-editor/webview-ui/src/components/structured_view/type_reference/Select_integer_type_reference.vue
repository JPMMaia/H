<script setup lang="ts">

import { computed } from "vue";

import * as core from "../../../../../src/utilities/coreModelInterface";
import * as type_utilities from "../../../../../src/utilities/Type_utilities";
import * as search_utilities from "../../../utilities/Search_utilities";

import Search_field from "../../Search_field.vue";

const properties = defineProps<{
    current_type_reference: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const integer_type_name = computed(() => {
    const value = properties.current_type_reference.data.value as core.Integer_type;
    return type_utilities.get_integer_name(value);
});

function emit_update_type_reference(integer_type: core.Integer_type): void {
    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Integer_type,
            value: integer_type
        }
    };
    emit("update:type_reference", new_type_reference);
}

function on_select_integer_type(id: number, name: string, data: any): void {
    const new_value = type_utilities.parse_integer_type(name);
    emit_update_type_reference(new_value);
}
</script>

<template>
    <Search_field :key="integer_type_name"
        :possible_values="search_utilities.get_byte_aligned_integer_types_search_entries()"
        :current_search_term="integer_type_name" v-on:update="on_select_integer_type">
    </Search_field>
</template>

<style scoped>

</style>
