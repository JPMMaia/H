<script setup lang="ts">
import { defineEmits, defineProps, onMounted, ref } from "vue";


const properties = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>();

const input_element = ref<HTMLInputElement | null>(null);

onMounted(() => {
  if (input_element.value != null) {
    input_element.value.style.width = input_element.value.value.length + "ch";
  }
});

function onInput(event: InputEvent | Event): void {
  if (input_element.value !== null) {;
    input_element.value.style.width = input_element.value.value.length + 'ch';
    emit('update:modelValue', input_element.value.value);
  }
}
</script>

<template>
  <input
    ref="input_element"
    type="text"
    :value="modelValue"
    @input="onInput"
  />
</template>

<style scoped>
input {
  border: 0;
  outline: 0;
  font-family: inherit;
  font-size: inherit;
  padding: 0;
}
</style>

