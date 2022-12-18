<script setup lang="ts">

import * as Nodes from "./components";

import * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";
import type * as Core from "../../../../../src/utilities/coreModelInterface";

const properties = defineProps<{
    module: Core.Module;
    node: Abstract_syntax_tree_helpers.Node;
}>();

</script>

<template>
    <Nodes.List_node v-if="properties.node.data_type === Abstract_syntax_tree_helpers.Node_data_type.List"
        :module="properties.module" :node="properties.node">
    </Nodes.List_node>
    <Nodes.String_node v-else :module="properties.module" :node="properties.node">
    </Nodes.String_node>
</template>

<style scoped>

</style>
