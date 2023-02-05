<script setup lang="ts">

import { computed } from "vue";

import * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";
import type * as Core from "../../../../../src/utilities/coreModelInterface";

const properties = defineProps<{
    node: Abstract_syntax_tree_helpers.Node;
}>();

const data = computed(() => {
    if (properties.node.data_type === Abstract_syntax_tree_helpers.Node_data_type.String) {
        const data = properties.node.data as Abstract_syntax_tree_helpers.String_data;
        return data;
    }
    else {
        const data = properties.node.data as Abstract_syntax_tree_helpers.Symbol_data;
        return data;
    }
});

const data_value = computed(() => {
    if (properties.node.data_type === Abstract_syntax_tree_helpers.Node_data_type.String) {
        const data = properties.node.data as Abstract_syntax_tree_helpers.String_data;
        return data.value;
    }
    else {
        const data = properties.node.data as Abstract_syntax_tree_helpers.Symbol_data;
        return data.symbol.name();
    }
});

function on_key_down(event: KeyboardEvent): void {
}

</script>

<template>
    <div v-if="data.html_tag === 'div'" :contenteditable="data.is_content_editable" v-on:keydown="on_key_down">
        {{ data_value }}
    </div>
    <span v-else-if="data.html_tag === 'span'" :contenteditable="data.is_content_editable" v-on:keydown="on_key_down">
        {{ data_value }}
    </span>
</template>

<style scoped>

</style>
