<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

const properties = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void,
  (e: 'event:on_key_down', event: KeyboardEvent): void,
  (e: 'event:on_focus_out', event: FocusEvent): void
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

function on_input(event: InputEvent | Event): void {
  if (input_element.value !== null) {
    input_element.value.style.width = calculate_input_element_width(input_element.value.value) + 'ch';
    emit('update:modelValue', input_element.value.value);
  }
}

function on_key_down(event: KeyboardEvent): void {
  emit('event:on_key_down', event);
}

function on_focus_out(event: FocusEvent): void {
  emit('event:on_focus_out', event);
}
</script>

<template>
  <input ref="input_element" type="text" :value="modelValue" @input="on_input" @keydown="on_key_down"
    @blur="on_focus_out" placeholder="<Empty value>" />
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

