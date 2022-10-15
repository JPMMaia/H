<script setup lang="ts">

import { computed } from "vue";

import * as core from "../../../../../src/utilities/coreModelInterface";

import Number_input from "../../common/Number_input.vue";
import Select_type_reference from "./Select_type_reference.vue";

const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
    default_value_type: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const constant_array_type_value = computed(() => {
    return properties.current_type_reference.data.value as core.Constant_array_type;
});

function emit_update_type_reference(value: core.Constant_array_type): void {
    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Constant_array_type,
            value: value
        }
    };
    emit("update:type_reference", new_type_reference);
}

function on_size_updated(new_value: number): void {
    const value: core.Constant_array_type = {
        value_type: constant_array_type_value.value.value_type,
        size: new_value
    };
    emit_update_type_reference(value);
}

function on_value_type_updated(new_value_type: core.Type_reference): void {
    const value: core.Constant_array_type = {
        value_type: {
            size: 1,
            elements: [new_value_type]
        },
        size: constant_array_type_value.value.size
    };
    emit_update_type_reference(value);
}
</script>

<template>
    <div>
        <div>
            <label for="array_size">Size </label>
            <Number_input id="array_size" :modelValue="constant_array_type_value.size" :minimum="1"
                :maximum=Number.MAX_VALUE v-on:update:modelValue="on_size_updated">
            </Number_input>
        </div>
        <div>
            <label for="array_type">Type</label>
            <Select_type_reference id="array_type" :module="properties.module"
                :current_type_reference="constant_array_type_value.value_type.elements[0]"
                v-on:update:type_reference="value => on_value_type_updated(value)">
            </Select_type_reference>
        </div>
    </div>
</template>

<style scoped>
#array_type {
    padding-left: 4ch;
}
</style>
