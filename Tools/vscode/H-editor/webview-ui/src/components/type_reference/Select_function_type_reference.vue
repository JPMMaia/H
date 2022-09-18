<script setup lang="ts">

import { computed, ref } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";

const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
    default_value_type: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const default_value: core.Function_type = {
    return_types: {
        size: 1,
        elements: [
            properties.default_value_type
        ]
    },
    parameter_types: {
        size: 1,
        elements: [
            properties.default_value_type
        ]
    },
    is_variadic: false
};

const initial_value: core.Function_type =
    properties.current_type_reference.data.type === core.Type_reference_enum.Function_type ?
        (properties.current_type_reference.data.value as core.Function_type) :
        default_value;

const function_type_value = ref<core.Function_type>(initial_value);

</script>

<template>
</template>

<style scoped>

</style>
