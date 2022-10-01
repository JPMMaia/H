<script setup lang="ts">

import { computed, ref } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";
import * as coreInterfaceHelpers from "../../../../src/utilities/coreModelInterfaceHelpers";
import * as type_utilities from "../../utilities/Type_utilities";
import * as searchUtilities from "../../utilities/Search_utilities";

import type { Search_entry } from "@/utilities/Search_entry";
import type { CodeWithSourceMap } from "source-map";
import { onThrowError } from "../../../../src/utilities/errors";

import Select_builtin_type_reference from "./Select_builtin_type_reference.vue";
import Select_constant_array_type_reference from "./Select_constant_array_type_reference.vue";
import Select_function_type_reference from "./Select_function_type_reference.vue";
import Select_fundamental_type_reference from "./Select_fundamental_type_reference.vue";
import Select_integer_type_reference from "./Select_integer_type_reference.vue";
import Select_other_type_reference from "./Select_other_type_reference.vue";
import Select_pointer_type_reference from "./Select_pointer_type_reference.vue";


const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

function get_meta_type(type: core.Type_reference_enum): string {

    switch (type) {
        case core.Type_reference_enum.Builtin_type_reference:
            return "Builtin_type";
        case core.Type_reference_enum.Constant_array_type:
            return "Constant_array_type";
        case core.Type_reference_enum.Fundamental_type:
            return "Fundamental_type";
        case core.Type_reference_enum.Function_type:
            return "Function_type";
        case core.Type_reference_enum.Integer_type:
            return "Integer_type";
        case core.Type_reference_enum.Pointer_type:
            return "Pointer_type";
        case core.Type_reference_enum.Alias_type_reference:
        case core.Type_reference_enum.Enum_type_reference:
        case core.Type_reference_enum.Struct_type_reference:
        default:
            return "Other";
    }
}

const selected_meta_type = ref<string>(get_meta_type(properties.current_type_reference.data.type));
const current_type_reference = ref<core.Type_reference>(properties.current_type_reference);

function on_meta_type_changed(event: Event): void {
    if (event.target !== null) {
        const target = event.target as HTMLSelectElement;
        selected_meta_type.value = target.value;
    }
}

function on_type_reference_updated(new_type_reference: core.Type_reference): void {
    emit("update:type_reference", new_type_reference);
}

</script>

<template>
    <div>
        <select :value="selected_meta_type" :modelValue="selected_meta_type"
            v-on:change="event => on_meta_type_changed(event)">
            <option value="Builtin_type">Builtin type</option>
            <option value="Constant_array_type">Constant array</option>
            <option value="Fundamental_type">Fundamental type</option>
            <option value="Integer_type">Integer type</option>
            <option value="Pointer_type">Pointer type</option>
            <option value="Function_type">Function type</option>
            <option value="Other">Other</option>
        </select>
        <div>
            <div v-if="selected_meta_type === 'Builtin_type'">
                <Select_builtin_type_reference :current_type_reference="current_type_reference"
                    v-on:update:type_reference="on_type_reference_updated">
                </Select_builtin_type_reference>
            </div>
            <div v-if="selected_meta_type === 'Constant_array_type'">
                <Select_constant_array_type_reference :module="properties.module"
                    :current_type_reference="current_type_reference"
                    :default_value_type="type_utilities.create_default_type_reference()"
                    v-on:update:type_reference="on_type_reference_updated"></Select_constant_array_type_reference>
            </div>
            <div v-if="selected_meta_type === 'Fundamental_type'">
                <Select_fundamental_type_reference :current_type_reference="current_type_reference"
                    v-on:update:type_reference="on_type_reference_updated"></Select_fundamental_type_reference>
            </div>
            <div v-if="selected_meta_type === 'Integer_type'">
                <Select_integer_type_reference :current_type_reference="current_type_reference"
                    v-on:update:type_reference="on_type_reference_updated">
                </Select_integer_type_reference>
            </div>
            <div v-if="selected_meta_type === 'Pointer_type'">
                <Select_pointer_type_reference :module="properties.module"
                    :current_type_reference="current_type_reference"
                    :default_value_type="{size: 1, elements: [type_utilities.create_default_type_reference()]}"
                    v-on:update:type_reference="on_type_reference_updated">
                </Select_pointer_type_reference>
            </div>
            <div v-if="selected_meta_type === 'Function_type'">
                <Select_function_type_reference :module="properties.module"
                    :current_type_reference="current_type_reference"
                    :default_value_type="type_utilities.create_default_type_reference()"
                    v-on:update:type_reference="on_type_reference_updated">
                </Select_function_type_reference>
            </div>
            <div v-if="selected_meta_type === 'Other'">
                <Select_other_type_reference :module="properties.module"
                    :current_type_reference="current_type_reference"
                    v-on:update:type_reference="on_type_reference_updated">
                </Select_other_type_reference>
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>
