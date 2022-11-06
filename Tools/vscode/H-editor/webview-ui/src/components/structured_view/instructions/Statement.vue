<script setup lang="ts">

import { computed } from "vue";

import * as Core from "../../../../../src/utilities/coreModelInterface";
import * as Instructions from "./components";

import * as Common from "../../common/components";
import type * as Change from "../../../../../src/utilities/Change";
import type { Search_entry } from "../../../utilities/Search_entry";

const properties = defineProps<{
    module: Core.Module;
    statement: Core.Statement;
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

const is_empty = computed(() => {
    return properties.statement.expressions.elements.length === 0;
});

const contains_variable_declaration = computed(() => {
    const expressions = properties.statement.expressions.elements;

    if (expressions.length === 0) {
        return false;
    }

    const first_expression = expressions[0];

    if (first_expression.data.type === Core.Expression_enum.Return_expression) {
        return false;
    }

    if (first_expression.data.type === Core.Expression_enum.Call_expression) {
        const call_expression: Core.Call_expression = first_expression.data.value as Core.Call_expression;
        // TODO
        return false;
    }

    return true;
});

const empty_field_search_terms = computed(() => {
    const items: Search_entry[] = [
        {
            id: 0,
            name: "return",
            icon: "",
            data: undefined
        }
    ];

    return items;
});

function on_expression_new_changes(children_changes: Change.Hierarchy): void {
    emit("new_changes", children_changes);
}

</script>

<template>
    <div v-if="is_empty">
        <Common.Search_field :possible_values="empty_field_search_terms" current_search_term=""></Common.Search_field>
    </div>
    <div v-else-if="contains_variable_declaration" class="horizontal_container">
        <div>var {{ properties.statement.name }}</div>
        <div>=</div>
        <Instructions.Expression :module="properties.module" :expressions="properties.statement.expressions"
            :expression_index="0" v-on:new_changes="on_expression_new_changes">
        </Instructions.Expression>
    </div>
    <div v-else>
        <Instructions.Expression :module="properties.module" :expressions="properties.statement.expressions"
            :expression_index="0" v-on:new_changes="on_expression_new_changes">
        </Instructions.Expression>
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
