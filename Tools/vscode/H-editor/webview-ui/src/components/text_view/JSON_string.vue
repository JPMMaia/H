<script setup lang="ts">
import Editable from '../common/Editable.vue';

const properties = defineProps<{
    value: string;
}>();

const emit = defineEmits<{
    (e: 'update', new_value: string): void
}>();

function on_string_value_change(event: Event): void {
    if (event.target !== null && event.target instanceof HTMLInputElement) {
        const value = event.target.value;
        emit("update", value);
    }
}
</script>

<template>
    <div>&quot;<Editable :modelValue="properties.value" @input="on_string_value_change"></Editable>&quot;</div>
</template>

<style scoped>

</style>
