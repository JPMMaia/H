<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

const properties = defineProps<{
    modelValue: any;
    minimum: number;
    maximum: number;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void
}>();

const input_element = ref<HTMLInputElement | null>(null);

function on_input(event: InputEvent | Event): void {
    if (input_element.value !== null) {
        const value = input_element.value.value;
        const number_value = Number(value);
        if (!isNaN(number_value)) {
            emit('update:modelValue', number_value);
        }
    }
}
</script>

<template>
    <input ref="input_element" type="number" :value="properties.modelValue" :min="properties.minimum"
        :max="properties.maximum" @input="on_input" />
</template>

<style scoped>

</style>

