<script setup lang="ts">
import { computed, defineEmits, defineProps, onMounted, ref, watch } from "vue";

const properties = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>();

const input_element = ref<HTMLInputElement | null>(null);

const model_value = computed(() => { return properties.modelValue; });

function calculate_input_element_width(value: any): number {

  if (input_element.value === null) {
    return 0;
  }

  const stringValue = String(value);
  return stringValue.length === 0 ? input_element.value.placeholder.length : stringValue.length;
}

onMounted(() => {
  if (input_element.value != null) {
    input_element.value.style.width = calculate_input_element_width(properties.modelValue) + 'ch';
  }
});

watch(model_value, (newValue, oldValue) => {
  if (input_element.value !== null) {
    input_element.value.style.width = calculate_input_element_width(newValue) + 'ch';
  }
});

function onInput(event: InputEvent | Event): void {
  if (input_element.value !== null) {
    input_element.value.style.width = calculate_input_element_width(input_element.value.value) + 'ch';
    emit('update:modelValue', input_element.value.value);
  }
}
</script>

<template>
  <input ref="input_element" type="text" :value="modelValue" @input="onInput" placeholder="<Empty value>"/>
</template>

<style scoped>

input {
  border: 0;
  outline: 0;
  font-family: inherit;
  font-size: inherit;
  padding: 0;
}

::placeholder {
  color: red;
}
</style>

