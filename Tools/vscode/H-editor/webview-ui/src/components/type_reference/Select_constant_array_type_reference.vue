<script setup lang="ts">

import { computed, ref } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";

import Number_input from "../Number_input.vue";

const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
    default_value_type: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const initial_value: core.Constant_array_type =
    properties.current_type_reference.data.type === core.Type_reference_enum.Constant_array_type ?
        (properties.current_type_reference.data.value as core.Constant_array_type) :
        { size: 1, value_type: { size: 1, elements: [properties.default_value_type] } };

const constant_array_type_value = ref<core.Constant_array_type>(initial_value);

function on_size_updated(new_value: number): void {

    const constant_array_type_reference: core.Constant_array_type = {
        size: new_value,
        value_type: constant_array_type_value.value.value_type
    };

    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Constant_array_type,
            value: constant_array_type_reference
        }
    };

    emit("update:type_reference", new_type_reference);
}

</script>

<template>
    <Number_input :modelValue="constant_array_type_value.size" :minimum="1" :maximum=Number.MAX_VALUE
        v-on:update:modelValue="on_size_updated">
    </Number_input>
    <!-- TODO constant array type -->
    <!-- <Select_type_reference :module="properties.module"
                    :current_type_reference="constant_array_type_reference" v-on:update:type_reference=""> -->
</template>

<style scoped>

</style>
