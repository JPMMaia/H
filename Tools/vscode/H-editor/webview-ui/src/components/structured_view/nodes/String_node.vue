<script setup lang="ts">

import { computed } from "vue";

import * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";
import type * as Core from "../../../../../src/utilities/coreModelInterface";

const properties = defineProps<{
    module: Core.Module;
    node: Abstract_syntax_tree_helpers.Node;
}>();

const node_value = computed(() => {
    return (properties.node.data as Abstract_syntax_tree_helpers.String_data).value;
});

const is_content_editable = computed(() => {
    switch (properties.node.metadata.type) {
        case Abstract_syntax_tree_helpers.Metadata_type.Separator:
            return false;
        default:
            return true;
    }
});

function on_key_down(event: KeyboardEvent): void {


}

</script>

<template>
    <span :contenteditable="is_content_editable" v-on:keydown="on_key_down">
        {{ node_value }}
    </span>
</template>

<style scoped>

</style>
