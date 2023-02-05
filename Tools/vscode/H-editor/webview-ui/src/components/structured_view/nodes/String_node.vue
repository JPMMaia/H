<script setup lang="ts">

import { computed } from "vue";

import type * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";
import type * as Core from "../../../../../src/utilities/coreModelInterface";

const properties = defineProps<{
    node: Abstract_syntax_tree_helpers.Node;
}>();

const data = computed(() => {
    return properties.node.data as Abstract_syntax_tree_helpers.String_data;
});

function on_key_down(event: KeyboardEvent): void {
}

</script>

<template>
    <div v-if="data.html_tag === 'div'" :contenteditable="data.is_content_editable" v-on:keydown="on_key_down">
        {{ data.value }}
    </div>
    <span v-else-if="data.html_tag === 'span'" :contenteditable="data.is_content_editable" v-on:keydown="on_key_down">
        {{ data.value }}
    </span>
</template>

<style scoped>

</style>
