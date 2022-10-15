<script setup lang="ts">

import { computed } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";

import Checkbox_input from "../Checkbox_input.vue";
import Select_function_type_parameter from "./Select_function_type_parameter.vue";

const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
    default_value_type: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const function_type_value = computed(() => {
    return properties.current_type_reference.data.value as core.Function_type;
});

function emit_update_type_reference(function_type: core.Function_type): void {
    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Function_type,
            value: function_type
        }
    };
    emit("update:type_reference", new_type_reference);
}

function update_input_parameters(new_vector: core.Vector<core.Type_reference>): void {

    const new_function_type = function_type_value.value;
    new_function_type.input_parameter_types = new_vector;

    emit_update_type_reference(new_function_type);
}

function update_is_variadic(new_value: boolean): void {

    const new_function_type = function_type_value.value;
    new_function_type.is_variadic = new_value;

    emit_update_type_reference(new_function_type);
}

function update_output_parameters(new_vector: core.Vector<core.Type_reference>): void {

    const new_function_type = function_type_value.value;
    new_function_type.output_parameter_types = new_vector;

    emit_update_type_reference(new_function_type);
}

</script>

<template>
    <div>
        <div>
            <label for="select_input_parameters">Input parameters</label>
            <Select_function_type_parameter id="select_input_parameters" :module="properties.module"
                :type_references="function_type_value.input_parameter_types"
                :default_value_type="properties.default_value_type"
                v-on:update:type_references="new_vector => update_input_parameters(new_vector)"
                class="insert_padding_left">
            </Select_function_type_parameter>
        </div>
        <div>
            <label for="is_variadic">Is variadic</label>
            <Checkbox_input :modelValue="function_type_value.is_variadic"
                v-on:update:modelValue="value => update_is_variadic(value)"></Checkbox_input>
        </div>
        <div>
            <label for="select_output_parameters">Output parameters</label>
            <Select_function_type_parameter id="select_output_parameters" :module="properties.module"
                :type_references="function_type_value.output_parameter_types"
                :default_value_type="properties.default_value_type"
                v-on:update:type_references="new_vector => update_output_parameters(new_vector)"
                class="insert_padding_left">
            </Select_function_type_parameter>
        </div>
    </div>
</template>

<style scoped>
.insert_padding_left {
    padding-left: 4ch;
}
</style>
