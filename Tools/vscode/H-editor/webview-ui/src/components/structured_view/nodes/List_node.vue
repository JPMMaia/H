<script setup lang="ts">

import { computed } from "vue";

import * as Nodes from "./components";
import type * as Node_update from "./Node_update";

import type * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";

const properties = defineProps<{
    node: Abstract_syntax_tree_helpers.Node;
}>();

const emit = defineEmits<{
    (e: "update", data: Node_update.Update): void
}>();

function on_node_update(update: Node_update.Update): void {
    if (properties.node.index_in_parent !== undefined)
        update.indices.splice(0, 0, properties.node.index_in_parent);

    emit("update", update);
}

const data = computed(() => {
    return properties.node.data as Abstract_syntax_tree_helpers.List_data;
});

</script>

<template>
    <div v-if="data.html_tag === 'div'" :class="data.html_class">
        <template v-for="(child_node, child_index) in data.elements">
            <Nodes.Node :node="child_node" v-on:update="on_node_update"></Nodes.Node>
        </template>
    </div>
    <span v-else-if="data.html_tag === 'span'" :class="data.html_class">
        <template v-for="(child_node, child_index) in data.elements">
            <Nodes.Node :node="child_node" v-on:update="on_node_update"></Nodes.Node>
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
