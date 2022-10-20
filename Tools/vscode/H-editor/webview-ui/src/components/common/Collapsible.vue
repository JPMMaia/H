<script setup lang="ts">
import "@vscode/codicons/dist/codicon.css";
</script>

<template>
    <details ref="details_element">
        <summary class="horizontal_container">
            <i class="codicon codicon-chevron-right rotate_on_open"></i>
            <slot name="summary"></slot>
        </summary>
        <div class="vertical_container">
            <slot name="content"></slot>
        </div>
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
