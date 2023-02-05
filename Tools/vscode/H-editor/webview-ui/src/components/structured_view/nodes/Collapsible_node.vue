<script setup lang="ts">

import { computed } from "vue";
import "@vscode/codicons/dist/codicon.css";

import * as Nodes from "./components";
import * as Node_update from "./Node_update";

import type * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";

const properties = defineProps<{
    node: Abstract_syntax_tree_helpers.Node;
}>();

const emit = defineEmits<{
    (e: "update", data: Node_update.Update): void
}>();

const data = computed(() => {
    return properties.node.data as Abstract_syntax_tree_helpers.Collapsible_data;
});

function on_click_summary(event: MouseEvent): void {

    if (event.target !== null) {
        const target = event.target as HTMLElement;
        if (target.getAttribute("name") === "Collapsible_icon") {

            const update: Node_update.Update = {
                indices: properties.node.index_in_parent ? [properties.node.index_in_parent] : [],
                type: Node_update.Update_type.Open_collapsible,
                data: {
                    value: !data.value.is_open
                }
            };
            emit("update", update);
        }
    }

    event.preventDefault();
}

</script>

<template>
    <details :open="data.is_open">
        <summary class="horizontal_container" v-on:click="on_click_summary" tabindex="-1">
            <i name="Collapsible_icon" class="codicon codicon-chevron-right rotate_on_open"></i>
            <Nodes.Node :node="data.elements[0]"></Nodes.Node>
        </summary>
        <Nodes.Node :node="data.elements[1]"></Nodes.Node>
    </details>
</template>

<style scoped>
details>*:not(:first-child) {
    margin-left: 2ch;
}

details>summary {
    list-style-type: none;
}

details>summary>i.rotate_on_open {
    transform: none;
}

details[open]>summary>i.rotate_on_open {
    transform: rotate(90deg);
    list-style-type: none;
}

.animate_transform_transition {
    transition-property: transform;
    transition-duration: 100ms;
    transition-timing-function: linear;
    transition-delay: 0ms;
}
</style>
