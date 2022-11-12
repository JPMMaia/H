<script setup lang="ts">

import type { Branch_node, Leaf_node, Node } from './Node';
import { Node_type } from './Node';

const properties = defineProps<{
    node: Node
}>();

</script>

<template>
    <slot v-if="node.type === Node_type.Leaf" :node_value="(node.value as Leaf_node).value">
    </slot>
    <div v-else-if="node.type === Node_type.Branch" class="horizontal_container add_horizontal_gap">
        <Node_tree v-for="child_node of (node.value as Branch_node).children" :node="child_node"
            v-slot="slot_properties: any">
            <slot :node_value="slot_properties.node_value">
            </slot>
        </Node_tree>
    </div>
</template>

<style scoped>
.add_horizontal_gap {
    column-gap: 1ch;
}

.horizontal_container {
    display: flex;
    flex-direction: row;
}

.vertical_container {
    display: flex;
    flex-direction: column;
}
</style>
