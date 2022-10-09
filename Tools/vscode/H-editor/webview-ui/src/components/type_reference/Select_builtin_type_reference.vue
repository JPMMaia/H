<script setup lang="ts">

import { computed } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";

import Text_input from "../common/Text_input.vue";

const properties = defineProps<{
    current_type_reference: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const builtin_value = computed(() => {
    return properties.current_type_reference.data.value as core.Builtin_type_reference;
});

function on_value_updated(new_value: string): void {
    const new_type_reference: core.Type_reference =
    {
        data: {
            type: core.Type_reference_enum.Builtin_type_reference,
            value: {
                value: new_value
            }
        }
    };
    emit("update:type_reference", new_type_reference);
}
</script>

<template>
    <Text_input :modelValue="builtin_value.value" v-on:update:modelValue="on_value_updated"></Text_input>
</template>

<style scoped>

</style>
