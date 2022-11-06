<script setup lang="ts">
import { get_type_name } from '@/utilities/language';
import Editable from '../common/Editable.vue';

const properties = defineProps<{
    value: any;
}>();

const emit = defineEmits<{
    (e: 'update:name', value: any): void
}>();

function on_name_change(event: Event) {
    if (event.target !== null && event.target instanceof HTMLInputElement) {
        emit("update:name", event.target.value);
    }
}
</script>

<template>
    <h_ut_function_declaration>
        <template v-slot:return_type>
            {{ get_type_name(value.return_type) }}
        </template>
        <template v-slot:name>
            <Editable :modelValue="value.name" @input="on_name_change"></Editable>
        </template>
        <template v-slot:parameters>
        </template>
    </h_ut_function_declaration>
</template>
