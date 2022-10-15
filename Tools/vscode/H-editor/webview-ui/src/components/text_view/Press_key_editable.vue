<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

const properties = defineProps<{
  placeholder: any;
}>();

const emit = defineEmits<{
  (e: 'on_key_up', event: KeyboardEvent): void
}>();

const input_element = ref<HTMLInputElement | null>(null);

function on_input(event: InputEvent | Event): void {
  if (input_element.value !== null) {
    input_element.value.value = "";
  }
}

function on_key_up(event: KeyboardEvent): void {
  emit("on_key_up", event);
}
</script>

<template>
  <input ref="input_element" type="text" :placeholder="properties.placeholder" @input="on_input" @keyup="on_key_up" />
</template>

<style scoped>
input {
  border: 0;
  outline: 0;
  font-family: inherit;
  font-size: inherit;
  padding: 0;
  width: 1ch;
  user-select: none;
}

::placeholder {
  color: gray;
}
</style>

