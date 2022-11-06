<script setup lang="ts">

import { computed } from "vue";

import "@vscode/codicons/dist/codicon.css";

import * as Core from "../../../../../src/utilities/coreModelInterface";

import * as Common from "../../common/components";
import * as Change from "../../../../../src/utilities/Change";
import * as Instructions from "./components";
import type { Search_entry } from "../../../utilities/Search_entry";

const properties = defineProps<{
    module: Core.Module;
    statements: Core.Vector<Core.Statement>
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

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

const empty_string: string = "";

function on_update_search_term(id: number, name: string): void {
    if (name === "return") {

        const return_expression: Core.Return_expression = {
            variable: {
                type: Core.Variable_expression_type.Temporary,
                id: 1
            }
        };

        const invalid_expression: Core.Invalid_expression = {
            value: ""
        };

        const statement: Core.Statement = {
            id: 0,
            name: "result",
            expressions: {
                size: 2,
                elements: [
                    {
                        data: {
                            type: Core.Expression_enum.Return_expression,
                            value: return_expression
                        }
                    },
                    {
                        data: {
                            type: Core.Expression_enum.Invalid_expression,
                            value: invalid_expression
                        }
                    }
                ]
            }
        };

        const new_changes: Change.Hierarchy = {
            changes: [Change.create_add_element_to_vector("statements", 0, statement)],
            children: []
        };

        emit("new_changes", new_changes);
    }
}

function on_statement_new_changes(index: number, children_changes: Change.Hierarchy): void {
    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: ["statements", "elements", index],
                hierarchy: children_changes
            }
        ]
    };

    emit("new_changes", new_changes);
}

</script>

<template>
    <div class="vertical_container">
        <div v-if="properties.statements.elements.length > 0"
            v-for="(statement, index) of properties.statements.elements" class="horizontal_container">
            <div>{{ index + 1 }}</div>
            <div>
                <Instructions.Statement :module="properties.module" :statement="statement"
                    v-on:new_changes="on_statement_new_changes">
                </Instructions.Statement>
            </div>
        </div>
        <div v-else>
            <Common.Search_field :possible_values="empty_field_search_terms" :current_search_term="empty_string"
                v-on:update="(id: number, name: string, data: any) => on_update_search_term(id, name)">
            </Common.Search_field>
        </div>
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
