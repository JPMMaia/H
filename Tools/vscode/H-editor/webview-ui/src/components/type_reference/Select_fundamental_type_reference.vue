<script setup lang="ts">

import { computed } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";
import * as search_utilities from "../../utilities/Search_utilities";

import Search_field from "../Search_field.vue";

const properties = defineProps<{
    current_type_reference: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const fundamental_type_value = computed(() => {
    return properties.current_type_reference.data.value as core.Fundamental_type;
});

function emit_update_type_reference(fundamental_type: core.Fundamental_type): void {
    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Fundamental_type,
            value: fundamental_type
        }
    };
    emit("update:type_reference", new_type_reference);
}

function on_select_fundamental_type(id: number, name: string, data: any): void {
    const fundamental_type_name = name as keyof typeof core.Fundamental_type;
    const new_fundamental_type = core.Fundamental_type[fundamental_type_name];
    emit_update_type_reference(new_fundamental_type);
}
</script>

<template>
    <Search_field :key="fundamental_type_value"
        :possible_values="search_utilities.get_fundamental_types_search_entries()"
        :current_search_term="fundamental_type_value.toString()" v-on:update="on_select_fundamental_type">
    </Search_field>
</template>

<style scoped>

</style>
