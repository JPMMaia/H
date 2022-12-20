<script setup lang="ts">

import { computed } from "vue";
import "@vscode/codicons/dist/codicon.css";

import * as Nodes from "./components";

import type * as Abstract_syntax_tree_helpers from "../../../utilities/Abstract_syntax_tree_helpers";
import type * as Core from "../../../../../src/utilities/coreModelInterface";

const properties = defineProps<{
    module: Core.Module;
    node: Abstract_syntax_tree_helpers.Node;
}>();

const data = computed(() => {
    return properties.node.data as Abstract_syntax_tree_helpers.Collapsible_data;
});

function on_click_summary(event: MouseEvent): void {

    if (event.target !== null) {
        const target = event.target as HTMLElement;
        if (target.getAttribute("name") === "Collapsible_icon") {
            return;
        }
    }

    event.preventDefault();
}

</script>

<template>
    <details>
        <summary class="horizontal_container" v-on:click="on_click_summary" tabindex="-1">
            <i name="Collapsible_icon" class="codicon codicon-chevron-right rotate_on_open"></i>
            <Nodes.Node :module="properties.module" :node="data.summary"></Nodes.Node>
        </summary>
        <Nodes.Node :module="properties.module" :node="data.body"></Nodes.Node>
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
