<script setup lang="ts">
import { ref } from "vue";

const properties = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>();

const input_element = ref<HTMLInputElement | null>(null);

function on_input(event: InputEvent | Event): void {

    if (input_element.value !== null) {
        const value = input_element.value.checked;
        emit('update:modelValue', value);
    }
}
</script>

<template>
    <input ref="input_element" type="checkbox" :checked="properties.modelValue" @input="on_input" />
</template>

<style scoped>

</style>

