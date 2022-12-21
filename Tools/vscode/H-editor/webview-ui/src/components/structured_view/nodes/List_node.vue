<script setup lang="ts">

import { computed } from "vue";

import * as Nodes from "./components";

import type * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";
import type * as Core from "../../../../../src/utilities/coreModelInterface";

const properties = defineProps<{
    module: Core.Module;
    node: Abstract_syntax_tree_helpers.Node;
}>();

const data = computed(() => {
    return properties.node.data as Abstract_syntax_tree_helpers.List_data;
});

</script>

<template>
    <div v-if="data.html_tag === 'div'" :class="data.html_class">
        <template v-for="(child_node, child_index) in data.elements">
            <Nodes.Node :module="properties.module" :node="child_node"></Nodes.Node>
        </template>
    </div>
    <span v-else-if="data.html_tag === 'span'" :class="data.html_class">
        <template v-for="(child_node, child_index) in data.elements">
            <Nodes.Node :module="properties.module" :node="child_node"></Nodes.Node>
        </template>
    </span>
</template>

<style scoped>
.horizontal_container {
    display: flex;
    flex-direction: row;
}

.vertical_container {
    display: flex;
    flex-direction: column;
}

.add_space_between_nodes {
    column-gap: 1ch;
}

.add_indentation {
    margin-left: 4ch;
}
</style>
