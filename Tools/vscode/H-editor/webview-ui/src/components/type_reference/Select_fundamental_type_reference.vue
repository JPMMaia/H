<script setup lang="ts">

import { computed, ref } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";
import * as search_utilities from "../../utilities/Search_utilities";

const properties = defineProps<{
    current_type_reference: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const initial_value: core.Fundamental_type =
    properties.current_type_reference.data.type === core.Type_reference_enum.Fundamental_type ?
        (properties.current_type_reference.data.value as core.Fundamental_type) :
        core.Fundamental_type.Float32;

const fundamental_type_value = ref<core.Fundamental_type>(initial_value);

function on_select_fundamental_type(id: number, name: string, data: any): void {

    const fundamental_type_name = name as keyof typeof core.Fundamental_type;
    const fundamental_type = core.Fundamental_type[fundamental_type_name];

    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Fundamental_type,
            value: fundamental_type
        }
    };

    emit("update:type_reference", new_type_reference);
}

</script>

<template>
    <Search_field :possible_values="search_utilities.get_fundamental_types_search_entries()"
        :current_search_term="fundamental_type_value.toString()" v-on:update="on_select_fundamental_type">
    </Search_field>
</template>

<style scoped>

</style>
