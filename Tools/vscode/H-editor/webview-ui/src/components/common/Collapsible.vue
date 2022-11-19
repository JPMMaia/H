<script setup lang="ts">
import "@vscode/codicons/dist/codicon.css";

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
    <details ref="details_element">
        <summary class="horizontal_container" v-on:click="on_click_summary" tabindex="-1">
            <i name="Collapsible_icon" class="codicon codicon-chevron-right rotate_on_open"></i>
            <span>
                <slot name="summary"></slot>
            </span>
        </summary>
        <span class="add_left_margin vertical_container">
            <slot name="content"></slot>
        </span>
    </details>
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

.add_left_margin {
    margin-left: 2ch;
}

details>summary>i.rotate_on_open {
    transform: none;
}

details[open]>summary>i.rotate_on_open {
    transform: rotate(90deg);
}

.animate_transform_transition {
    transition-property: transform;
    transition-duration: 100ms;
    transition-timing-function: linear;
    transition-delay: 0ms;
}
</style>
