<script setup lang="ts">
import { get_type_name } from '@/utilities/language';

const properties = defineProps<{
  value: any;
}>();
</script>

<template>
    <h_ut_function_declaration>
        <template v-slot:return_type>
            {{get_type_name(value.return_type)}}
        </template>
        <template v-slot:name>
            {{value.name}}
        </template>
        <template v-slot:parameters>
        </template>
    </h_ut_function_declaration>
</template>
