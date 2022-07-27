<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import Editable from "./Editable.vue";

const properties = defineProps<{
  possible_values: any[];
  current_search_term: string;
}>();

const emit = defineEmits<{
  (e: 'update', value: any): void
}>();

// TODO emit selected value event with cancelation token?
// Expression could instantiate a search field when needed and listen to selected value event?

const m_toggle = ref<boolean>(false);
const m_search_term = ref("");
const m_selected_value = ref<any | null>(null);
const m_current_focus = ref<number | null>(null);

onMounted(() => {
  m_search_term.value = properties.current_search_term;
})

const search_values = computed(() => {
  if (!m_toggle.value) {
    return [];
  }

  if (m_search_term.value === "") {
    return properties.possible_values;
  }

  let matches = 0;

  const matched_values = properties.possible_values.filter((value) => {
    if (
      value.toLowerCase().includes(m_search_term.value.toLowerCase()) &&
      matches < 10
    ) {
      matches++;
      return value;
    }
  });

  return matched_values;
});

function select_value(value: string): void {
  m_selected_value.value = value;
  m_search_term.value = m_selected_value.value;
  m_toggle.value = false;

  emit("update", value);
}

function on_key_down(event: KeyboardEvent): void {
  
  const is_letter = event.key >= "a" && event.key <= "z";
  const is_number = event.key >= "0" && event.key <= "9";

  if (is_letter || is_number) {
    m_toggle.value = true;
  } else if (event.ctrlKey && event.key == " ") {
    m_toggle.value = !m_toggle.value;
    event.preventDefault();
  } else if (event.key == "ArrowDown") {
    if (
      m_current_focus.value == null ||
      m_current_focus.value + 1 >= search_values.value.length
    ) {
      if (search_values.value.length == 0) {
        m_current_focus.value = null;
      } else {
        m_current_focus.value = 0;
      }
    } else {
      m_current_focus.value += 1;
    }
  } else if (event.key == "ArrowUp") {
    if (m_current_focus.value == null || m_current_focus.value <= 0) {
      if (search_values.value.length == 0) {
        m_current_focus.value = null;
      } else {
        m_current_focus.value = search_values.value.length - 1;
      }
    } else {
      m_current_focus.value -= 1;
    }
  } else if (event.key == "Enter") {
    if (m_toggle.value && m_current_focus.value != null) {
      select_value(search_values.value[m_current_focus.value]);
    }
  }
}

function on_focus_out(event: FocusEvent): void {
  // If click was on top of the dropdown:
  if (m_current_focus.value == null) {
    select_value(m_search_term.value);
  }
}
</script>

<template>
  <div class="autocomplete">
    <Editable
      v-model="m_search_term"
      v-on:event:on_key_down="on_key_down"
      v-on:event:on_focus_out="on_focus_out"
    >
    </Editable>

    <div id="autocomplete-list" class="autocomplete-items">
      <ul v-if="search_values.length > 0">
        <li
          v-for="(value, index) in search_values"
          :key="value"
          :class="{ 'autocomplete-active': m_current_focus === index }"
          @mouseup="select_value(value)"
          @mouseenter="m_current_focus = index"
          @mouseleave="m_current_focus = null"
        >
          {{ value }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
}
.autocomplete {
  position: relative;
  display: inline-block;
}
.autocomplete-items {
  position: absolute;
  border: 1px solid #d4d4d4;
  border-bottom: none;
  border-top: none;
  z-index: 99;

  top: 100%;
  left: 0;
  right: 0;
  width: fit-content;
}
.autocomplete-items ul li {
  padding: 10px;
  cursor: pointer;
  background-color: #fff;
  border-bottom: 1px solid #d4d4d4;
}
.autocomplete-active {
  background-color: DodgerBlue !important;
  color: #ffffff;
}
</style>