<script setup lang="ts">
import { computed } from "vue";
import type { ReflectionType, ReflectionInfo } from "../../../../src/utilities/coreModel";
import * as coreModel from "../../../../src/utilities/coreModel";
import Press_key_editable from "./Press_key_editable.vue";
import * as Change from "../../../../src/utilities/Change";
import JSON_object from "./JSON_object.vue";

const properties = defineProps<{
    vector_name: string,
    value: any,
    reflection_info: ReflectionInfo;
    reflection_type: ReflectionType;
    indentation: number;
    add_comma: boolean;
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

const css_variables = computed(() => {
    return `--indentation: ${properties.indentation}ch;`;
});

const vector_size = computed(() => {
    const size: number = properties.value['size'];
    return size;
});

const vector_elements = computed(() => {
    const elements: any[] = properties.value['elements'];
    return elements;
});

function on_new_changes(index: number, children_changes: Change.Hierarchy): void {

    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: [properties.vector_name, "elements", index],
                hierarchy: children_changes
            }
        ]
    };

    emit("new_changes", new_changes);
}

function on_update(index: number, new_value: any): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_set_element_of_vector(properties.vector_name, index, new_value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}


function on_insert_or_remove_array_element(event: KeyboardEvent, index: number): void {

    if (event.key === "Enter") {
        const insert_at_index = index;

        const value_type = coreModel.getVectorValueType(properties.reflection_type);
        const new_value = coreModel.createDefaultValue(properties.reflection_info, value_type);

        const new_changes: Change.Hierarchy = {
            changes: [
                Change.create_add_element_to_vector(properties.vector_name, insert_at_index, new_value)
            ],
            children: []
        };

        emit("new_changes", new_changes);
    }
    else if (event.key === "Backspace") {

        if (index === 0) {
            return;
        }

        const delete_at_index = index - 1;

        const new_changes: Change.Hierarchy = {
            changes: [
                Change.create_remove_element_of_vector(properties.vector_name, delete_at_index)
            ],
            children: []
        };

        emit("new_changes", new_changes);
    }
}
</script>

<template>
    <div :style="css_variables" class="vertical_container">
        <div>{</div>
        <div class="vertical_container add_left_padding">
            <div>&quot;size&quot;: {{ vector_size }},</div>
            <div class="vertical_container">
                <div>&quot;elements&quot;:</div>
                <div>
                    <div class="horizontal_container">
                        <div>[</div>
                        <Press_key_editable placeholder="+"
                            v-on:on_key_up="(event) => on_insert_or_remove_array_element(event, 0)">
                        </Press_key_editable>
                    </div>
                    <div class="vertical_container add_left_padding">
                        <div v-for="(item, index) in vector_elements" v-bind:key="index">
                            <div>
                                <JSON_object :value="item" :reflection_info="properties.reflection_info"
                                    :reflection_type="coreModel.getVectorValueType(properties.reflection_type)"
                                    :is_read_only="false" :indentation="indentation"
                                    :add_comma="(index + 1) < vector_elements.length"
                                    v-on:new_changes="(new_changes: Change.Hierarchy) => on_new_changes(index, new_changes)"
                                    v-on:update="(new_value: any) => on_update(index, new_value)">
                                </JSON_object>
                                <Press_key_editable placeholder="+"
                                    v-on:on_key_up="(event) => on_insert_or_remove_array_element(event, index + 1)">
                                </Press_key_editable>
                            </div>
                        </div>
                    </div>
                    <div>]</div>
                </div>
            </div>
        </div>
        <div class="horizontal_container">
            <div>}</div>
            <div v-if="add_comma">,</div>
        </div>
    </div>
</template>

<style scoped>
.add_left_padding {
    padding-left: var(--indentation);
}

.horizontal_container {
    display: flex;
    flex-direction: row;
}

.add_horizontal_gap {
    column-gap: 1ch;
}

.vertical_container {
    display: flex;
    flex-direction: column;
}
</style>