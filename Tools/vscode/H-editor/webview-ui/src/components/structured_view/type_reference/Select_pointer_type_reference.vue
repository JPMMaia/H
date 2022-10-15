<script setup lang="ts">

import { computed } from "vue";

import * as core from "../../../../../src/utilities/coreModelInterface";

import Checkbox_input from "../../common/Checkbox_input.vue";
import Select_type_reference from "./Select_type_reference.vue";

const properties = defineProps<{
    module: core.Module;
    current_type_reference: core.Type_reference;
    default_value_type: core.Vector<core.Type_reference>;
}>();

const emit = defineEmits<{
    (e: 'update:type_reference', value: core.Type_reference): void,
}>();

const pointer_type_value = computed(() => {
    return properties.current_type_reference.data.value as core.Pointer_type;
});

function emit_update_type_reference(pointer_type: core.Pointer_type): void {
    const new_type_reference: core.Type_reference = {
        data: {
            type: core.Type_reference_enum.Pointer_type,
            value: pointer_type
        }
    };
    emit("update:type_reference", new_type_reference);
}

function on_is_mutable_updated(new_value: boolean): void {
    const value: core.Pointer_type = {
        element_type: pointer_type_value.value.element_type,
        is_mutable: new_value
    };
    emit_update_type_reference(value);
}

function on_value_type_updated(new_value_type: core.Type_reference): void {
    const value: core.Pointer_type = {
        element_type: {
            size: 1,
            elements: [new_value_type]
        },
        is_mutable: pointer_type_value.value.is_mutable
    };
    emit_update_type_reference(value);
}

</script>

<template>
    <div>
        <div>
            <label for="is_mutable_checkbox">Is mutable</label>
            <Checkbox_input id="is_mutable_checkbox" :modelValue="pointer_type_value.is_mutable"
                v-on:update:modelValue="on_is_mutable_updated">
            </Checkbox_input>
        </div>
        <div>
            <label for="value_type">Type</label>
            <Select_type_reference id="value_type" :module="properties.module"
                :current_type_reference="pointer_type_value.element_type.elements[0]"
                v-on:update:type_reference="value => on_value_type_updated(value)">
            </Select_type_reference>
        </div>
    </div>
</template>

<style scoped>
#value_type {
    padding-left: 4ch;
}
</style>
