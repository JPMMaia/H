<script setup lang="ts">

import { computed } from "vue";

import "@vscode/codicons/dist/codicon.css";

import * as Core from "../../../../../src/utilities/coreModelInterface";
import * as Instructions from "./components";

import * as Common from "../../common/components";
import type * as Change from "../../../../../src/utilities/Change";

const properties = defineProps<{
    module: Core.Module;
    expressions: Core.Vector<Core.Expression>;
    expression_index: number;
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

const expression = computed(() => {
    return properties.expressions.elements[properties.expression_index];
});

</script>

<template>
    <div v-if="expression.data.type === Core.Expression_enum.Binary_expression">
    </div>
    <div v-else-if="expression.data.type === Core.Expression_enum.Call_expression">
    </div>
    <div v-else-if="expression.data.type === Core.Expression_enum.Constant_expression">
    </div>
    <div v-else-if="expression.data.type === Core.Expression_enum.Invalid_expression">
        <Common.Editable :modelValue="expression.data.value"></Common.Editable>
    </div>
    <div v-else-if="expression.data.type === Core.Expression_enum.Return_expression">
        <Common.Editable modelValue="return"></Common.Editable>
    </div>
    <div v-else-if="expression.data.type === Core.Expression_enum.Variable_expression">
    </div>
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
</style>
