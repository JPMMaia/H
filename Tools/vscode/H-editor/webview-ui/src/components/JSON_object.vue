<script setup lang="ts">
import { computed, defineProps } from "vue";
import Editable from './Editable.vue';
import Press_key_editable from "./Press_key_editable.vue";

const properties = defineProps<{
  value: any;
  indentation: number;
  indentation_increment: number;
}>();

const emit = defineEmits<{
    (e: 'insert:value', position: any[]): void,
    (e: 'delete:value', position: any[]): void,
    (e: 'update:value', position: any[], value: any): void
}>();

const children_indentation = computed(() => {
    return properties.indentation + properties.indentation_increment;
});

const css_variables = computed(() => {
    return `--indentation: ${properties.indentation}em; --key_indentation: ${properties.indentation + properties.indentation_increment}em;`;
});

function on_string_value_change(event: Event): void {
    if (event.target !== null && event.target instanceof HTMLInputElement) {
        const value = event.target.value;
        emit("update:value", [], value);
    }
}

function on_number_value_change(event: Event): void {
    if (event.target !== null && event.target instanceof HTMLInputElement) {
        const value = event.target.value;
        const valueToEmit = (value.length !== 0 && !isNaN(Number(value))) ? Number(value) : 0;
        emit("update:value", [], valueToEmit);
    }
}

function pass_on_value_change_event(key: string | number, child_position: any[], value: any): void {
    const position = [key].concat(child_position);
    emit("update:value", position, value);
}

function on_insert_or_remove_array_element(event: KeyboardEvent, index: number): void {
    if (event.key === "Enter") {
        const insert_at_index = index;
        emit("insert:value", [insert_at_index]);
    }
    else if (event.key === "Backspace") {
        
        if (index === 0) {
            return;
        }

        const delete_at_index = index - 1;
        emit("delete:value", [delete_at_index]);
    }
}

function pass_on_insert_array_element_event(key: string | number, child_position: any[]): void {
    const position = [key].concat(child_position);
    emit("insert:value", position);
}

function pass_on_delete_array_element_event(key: string | number, child_position: any[]): void {
    const position = [key].concat(child_position);
    emit("delete:value", position);
}
</script>

<template>
    <span v-if="typeof properties.value === 'string'">&quot;<Editable :modelValue="properties.value"
            @input="on_string_value_change"></Editable>&quot;</span>
    <span v-else-if="typeof properties.value === 'number'">
        <Editable :modelValue="properties.value" @input="on_number_value_change">
        </Editable>
    </span>
    <span v-else-if="Array.isArray(properties.value)">
        <span>
            <span>[<Press_key_editable placeholder="+" v-on:on_key_up="(event) => on_insert_or_remove_array_element(event, 0)">
                </Press_key_editable></span>
            <br v-if="properties.value.length !== 0">
            <span v-for="(item, index) in properties.value" v-bind:key="index">
                <span :style="css_variables" class="key_indent">
                    <JSON_object :value="item"
                        v-on:insert:value="(position) => pass_on_insert_array_element_event(index, position)"
                        v-on:delete:value="(position) => pass_on_delete_array_element_event(index, position)"
                        v-on:update:value="(position, value) => pass_on_value_change_event(index, position, value)"
                        :indentation=children_indentation :indentation_increment="properties.indentation_increment">
                    </JSON_object>
                    <Press_key_editable placeholder="+"
                        v-on:on_key_up="(event) => on_insert_or_remove_array_element(event, index+1)">
                    </Press_key_editable>
                    <span v-if="(index + 1) !== properties.value.length">,</span>
                </span>
                <br>
            </span>
            <span v-if="properties.value.length !== 0" :style="css_variables" class="indent">]</span>
            <span v-else>]</span>
        </span>
    </span>
    <span v-else>
        <span>{</span>
        <br v-if="Object.keys(properties.value).length !== 0">
        <span v-for="(key, index) in Object.keys(properties.value)" v-bind:key="key">
            <span :style="css_variables" class="key_indent">&quot;{{key}}&quot;: <JSON_object
                    :value="properties.value[key]"
                    v-on:insert:value="(position) => pass_on_insert_array_element_event(key, position)"
                    v-on:delete:value="(position) => pass_on_delete_array_element_event(key, position)"
                    v-on:update:value="(position, value) => pass_on_value_change_event(key, position, value)"
                    :indentation=children_indentation :indentation_increment=" properties.indentation_increment">
                </JSON_object><span v-if="(index + 1) !== Object.keys(properties.value).length">,</span></span>
            <br>
        </span>
        <span v-if="Object.keys(properties.value).length !== 0" :style="css_variables" class="indent">}</span>
        <span v-else>}</span>
    </span>
</template>

<style scoped>
.indent {
    margin-left:  var(--indentation);
}
.key_indent {
    margin-left:  var(--key_indentation);
}
</style>