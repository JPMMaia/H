<script setup lang="ts">

import { computed, ref } from "vue";

import * as core from "../../../../src/utilities/coreModelInterface";

import Checkbox_input from "../Checkbox_input.vue";
import Select_type_reference from "./Select_type_reference.vue";

const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
    default_value_type: core.Vector<core.Type_reference>;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const initial_value: core.Pointer_type =
    properties.current_type_reference.data.type === core.Type_reference_enum.Pointer_type ?
        (properties.current_type_reference.data.value as core.Pointer_type) :
        { element_type: properties.default_value_type, is_mutable: false };

const pointer_type_value = ref<core.Pointer_type>(initial_value);

function on_is_mutable_updated(new_value: boolean): void {

    const pointer_type_reference: core.Pointer_type = {
        element_type: pointer_type_value.value.element_type,
        is_mutable: new_value,
    };

    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Pointer_type,
            value: pointer_type_reference
        }
    };

    emit("update:type_reference", new_type_reference);
}

</script>

<template>
    <div>
        <label for="is_mutable_checkbox">Is mutable</label>
        <Checkbox_input id="is_mutable_checkbox" :modelValue="initial_value.is_mutable"
            v-on:update:modelValue="on_is_mutable_updated">
        </Checkbox_input>
    </div>
    <div>
        <label for="value_type">Type</label>
        <Select_type_reference id="value_type" :module="properties.module"
            :current_type_reference="properties.current_type_reference">
        </Select_type_reference>
    </div>
</template>

<style scoped>
#value_type {
    padding-left: 4ch;
}
</style>
