<script setup lang="ts">

import { computed, ref } from "vue";

import type * as core from "../../../../src/utilities/coreModelInterface";

const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
    default_value_type: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const function_type_value = computed(() => {
    return properties.current_type_reference.data.value as core.Function_type;
});

</script>

<template>
</template>

<style scoped>

</style>
