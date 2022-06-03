<script setup lang="ts">
import { computed, defineProps } from "vue";

const properties = defineProps<{
  value: any;
  indentation: number;
  indentation_increment: number;
}>();

const children_indentation = computed(() => {
    return properties.indentation + properties.indentation_increment;
});

const css_variables = computed(() => {
    return `--indentation: ${properties.indentation}em; --key_indentation: ${properties.indentation + properties.indentation_increment}em;`;
});
</script>

<template>
    <span v-if="typeof properties.value === 'string'">&quot;{{properties.value}}&quot;</span>
    <span v-else-if="typeof properties.value === 'number'">
        {{properties.value}}
    </span>
    <span v-else-if="Array.isArray(properties.value)">
        <span>
            <span>[</span>
                <br v-if="properties.value.length !== 0">
                <span v-for="(item, index) in properties.value" v-bind:key="index">
                    <span :style="css_variables" class="key_indent"><JSON_object :value="item" :indentation=children_indentation :indentation_increment="properties.indentation_increment"></JSON_object><span v-if="(index + 1) !== properties.value.length">,</span></span>
                    <br>
                </span>
            <span v-if="properties.value.length !== 0" :style="css_variables" class="indent">]</span>
            <span v-else>]</span>
        </span>
    </span>
    <span v-else>
        <span>{</span>
            <br v-if="Object.keys(properties.value).length !== 0">
            <span v-for="(key, index) in Object.keys(properties.value)" v-bind:key="key">
                <span :style="css_variables" class="key_indent">&quot;{{key}}&quot;: <JSON_object :value="properties.value[key]" :indentation=children_indentation :indentation_increment="properties.indentation_increment"></JSON_object><span v-if="(index + 1) !== Object.keys(properties.value).length">,</span></span>
                <br>
            </span>
        <span v-if="Object.keys(properties.value).length !== 0" :style="css_variables" class="indent">}</span>
        <span v-else>}</span>
    </span>
</template>

<style scoped>
.indent {
    margin-left:  var(--indentation);
}
.key_indent {
    margin-left:  var(--key_indentation);
}
</style>