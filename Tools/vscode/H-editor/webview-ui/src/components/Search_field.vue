<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Search_entry } from "../utilities/Search_entry";
import "@vscode/codicons/dist/codicon.css";

import Editable from "./Editable.vue";

const properties = defineProps<{
  possible_values: Search_entry[];
  current_search_term: string;
}>();

const emit = defineEmits<{
  (e: 'update', id: number, name: string): void
}>();

// TODO emit selected value event with cancelation token?
// Expression could instantiate a search field when needed and listen to selected value event?

const m_toggle = ref<boolean>(false);
const m_search_term = ref("");
const m_selected_value_id = ref<number | undefined>(undefined);
const m_current_focus = ref<number | undefined>(undefined);

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
      value.name.toLowerCase().includes(m_search_term.value.toLowerCase()) &&
      matches < 10
    ) {
      matches++;
      return value;
    }
  });

  return matched_values;
});

function select_value(value_to_select: Search_entry): void {

  if (value_to_select !== undefined) {
    m_selected_value_id.value = value_to_select.id;
    m_search_term.value = value_to_select.name;
    m_toggle.value = false;

    emit("update", value_to_select.id, value_to_select.name);
  }
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
      m_current_focus.value == undefined ||
      m_current_focus.value + 1 >= search_values.value.length
    ) {
      if (search_values.value.length == 0) {
        m_current_focus.value = undefined;
      } else {
        m_current_focus.value = 0;
      }
    } else {
      m_current_focus.value += 1;
    }
  } else if (event.key == "ArrowUp") {
    if (m_current_focus.value == undefined || m_current_focus.value <= 0) {
      if (search_values.value.length == 0) {
        m_current_focus.value = undefined;
      } else {
        m_current_focus.value = search_values.value.length - 1;
      }
    } else {
      m_current_focus.value -= 1;
    }
  } else if (event.key == "Enter") {
    if (m_toggle.value && m_current_focus.value !== undefined) {
      const value_to_select = search_values.value[m_current_focus.value];
      select_value(value_to_select);
    }
  }
}

function on_focus_out(event: FocusEvent): void {
  // If click was on top of the dropdown:
  if (m_current_focus.value === undefined) {
    const value_to_select = properties.possible_values.find(value => value.name === m_search_term.value);
    if (value_to_select !== undefined) {
      select_value(value_to_select);
    }
  }
}
</script>

<template>
  <div class="autocomplete">
    <Editable v-model="m_search_term" v-on:event:on_key_down="on_key_down" v-on:event:on_focus_out="on_focus_out">
    </Editable>

    <div v-if="search_values.length > 0" class="autocomplete-items">
      <ul>
        <li v-for="(value, index) in search_values" :key="index"
          :class="{ 'autocomplete-active': m_current_focus === index, 'clip-long-text': true }"
          @mouseup="select_value(value)" @mouseenter="m_current_focus = index"
          @mouseleave="m_current_focus = undefined">
          <div class="horizontal-box">
            <i :class="'codicon ' + value.icon"></i>
            <div class="add-margin-left">{{ value.name }}</div>
          </div>
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
  z-index: 99;

  top: 100%;
  left: 0;
  right: 0;
  width: 350px;
}

.autocomplete-items ul li {
  padding: 0px;
  cursor: pointer;
  background-color: #fff;
  border-bottom: 0px;

  font-size: smaller;
}

.clip-long-text {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.align-to-center-vertically {
  position: relative;
  top: 50%;
  -webkit-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
}

.horizontal-box {
  display: flex
}

.add-margin-left {
  margin-left: 1ch;
}

.is-visible {
  visibility: hidden;
}

.autocomplete-active {
  background-color: DodgerBlue !important;
  color: #ffffff;
}
</style>