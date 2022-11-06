<script setup lang="ts">
import Editable from '../common/Editable.vue';

const properties = defineProps<{
    value: number;
}>();

const emit = defineEmits<{
    (e: 'update', new_value: number): void
}>();

function on_number_value_change(event: Event): void {
    if (event.target !== null && event.target instanceof HTMLInputElement) {
        const value = event.target.value;
        const value_to_emit = (value.length !== 0 && !isNaN(Number(value))) ? Number(value) : 0;
        emit("update", value_to_emit);
    }
}
</script>

<template>
    <Editable :modelValue="properties.value" @input="on_number_value_change">
    </Editable>
</template>

<style scoped>

</style>