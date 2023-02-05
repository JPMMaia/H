<script setup lang="ts">

import * as Nodes from "./components";
import type * as Node_update from "./Node_update";

import * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";

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

</script>

<template>
    <Nodes.Collapsible v-if="properties.node.data_type === Abstract_syntax_tree_helpers.Node_data_type.Collapsible"
        :node="properties.node" v-on:update="on_node_update">
    </Nodes.Collapsible>
    <Nodes.List_node v-else-if="properties.node.data_type === Abstract_syntax_tree_helpers.Node_data_type.List"
        :node="properties.node" v-on:update="on_node_update">
    </Nodes.List_node>
    <Nodes.String_or_symbol_node v-else :node="properties.node">
    </Nodes.String_or_symbol_node>
</template>

<style scoped>

</style>
