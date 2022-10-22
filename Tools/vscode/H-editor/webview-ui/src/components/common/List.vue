<script setup lang="ts">

const properties = defineProps<{
    items: any[]
}>();

</script>

<template>
    <div class="vertical_container">
        <TransitionGroup name="transition">
            <div v-for="item of properties.items" v-bind:key="item">
                <slot name="item_content" v-bind="item" :key="item"></slot>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.vertical_container {
    display: flex;
    flex-direction: column;
}

.transition-move,
/* apply transition to moving elements */
.transition-enter-active,
.transition-leave-active {
    transition: all 0.5s ease;
}

.transition-enter-from,
.transition-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.transition-leave-active {
    position: absolute;
}
</style>
