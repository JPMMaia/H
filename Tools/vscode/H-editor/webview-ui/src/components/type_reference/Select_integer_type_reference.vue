<script setup lang="ts">

import { computed, ref } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";
import * as name_utilities from "../../utilities/Name_utilities";
import * as search_utilities from "../../utilities/Search_utilities";

const properties = defineProps<{
    current_type_reference: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const initial_value: core.Integer_type =
    properties.current_type_reference.data.type === core.Type_reference_enum.Integer_type ?
        (properties.current_type_reference.data.value as core.Integer_type) :
        { number_of_bits: 32, is_signed: false };

const integer_type_value = ref<core.Integer_type>(initial_value);

function on_select_integer_type(id: number, name: string, data: any): void {

    const integer_type = name_utilities.parse_integer_type(name);

    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Integer_type,
            value: integer_type
        }
    };

    emit("update:type_reference", new_type_reference);
}

</script>

<template>
    <Search_field :possible_values="search_utilities.get_byte_aligned_integer_types_search_entries()"
        :current_search_term="name_utilities.get_integer_name(integer_type_value)" v-on:update="on_select_integer_type">
    </Search_field>
</template>

<style scoped>

</style>
