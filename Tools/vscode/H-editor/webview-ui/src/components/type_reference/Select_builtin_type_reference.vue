<script setup lang="ts">

import { computed, ref } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";

import Editable from "../Editable.vue";

const properties = defineProps<{
    current_type_reference: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const initial_value =
    properties.current_type_reference.data.type === core.Type_reference_enum.Builtin_type_reference ?
        (properties.current_type_reference.data.value as core.Builtin_type_reference).value :
        "";

const builtin_value_reference = ref<string>(initial_value);

function on_value_updated(new_value: string): void {

    const builtin_type_reference: core.Builtin_type_reference = {
        value: new_value
    };

    const new_type_reference: core.Type_reference =
    {
        data: {
            type: core.Type_reference_enum.Builtin_type_reference,
            value: builtin_type_reference
        }
    };

    emit("update:type_reference", new_type_reference);
}

</script>

<template>
    <Editable :modelValue="builtin_value_reference" v-on:update:modelValue="on_value_updated"></Editable>
</template>

<style scoped>

</style>
