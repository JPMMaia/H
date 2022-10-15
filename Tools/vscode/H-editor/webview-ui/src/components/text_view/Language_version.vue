<script setup lang="ts">
const properties = defineProps<{
  value: any;
}>();
</script>

<template>
    {{value.major}}.{{value.minor}}.{{value.patch}}
</template>
