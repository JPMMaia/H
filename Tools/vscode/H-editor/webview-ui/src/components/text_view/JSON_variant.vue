<script setup lang="ts">
import { computed } from "vue";
import type { ReflectionType, ReflectionInfo } from "../../../../src/utilities/coreModel";
import type { Search_entry } from "@/utilities/Search_entry";
import * as coreModel from "../../../../src/utilities/coreModel";
import Search_field from '../common/Search_field.vue';
import * as Change from "../../../../src/utilities/Change";
import JSON_object from "./JSON_object.vue";

const g_debug = false;

const properties = defineProps<{
    value: any;
    reflection_info: ReflectionInfo;
    reflection_type: ReflectionType;
    indentation: number;
    add_comma: boolean;
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

const variant_type = computed(() => {
    const type: string = properties.value['type'];
    return type;
});

const variant_value = computed(() => {
    const value: any = properties.value['value'];
    return value;
});

const variant_type_reflection_type = computed(() => {
    const reflection_type: ReflectionType = { name: properties.reflection_type.name + "::Types" };
    return reflection_type;
});

const variant_value_reflection_type = computed(() => {
    const type_name = variant_type.value.charAt(0).toUpperCase() + variant_type.value.slice(1);;
    const reflection_type: ReflectionType = {
        name: type_name
    };
    return reflection_type;
});

const css_variables = computed(() => {
    return `--indentation: ${properties.indentation}ch;`;
});

function on_update_variant(new_variant_type: any): void {

    const variant_value_type_name = new_variant_type.charAt(0).toUpperCase() + new_variant_type.slice(1);
    const variant_value_type = {
        name: variant_value_type_name
    };
    const new_value = coreModel.createDefaultValue(properties.reflection_info, variant_value_type);

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("type", variant_value_type_name),
            Change.create_update("value", new_value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function on_new_changes(children_changes: Change.Hierarchy): void {

    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: [properties.value.key],
                hierarchy: children_changes
            }
        ]
    };

    emit("new_changes", new_changes);
}

function get_variant_type_possible_values(reflection_type: ReflectionType): Search_entry[] {
    const variantValueTypes = coreModel.getVariantValueTypes(reflection_type);
    return variantValueTypes.map((value, index) => { return { id: index, name: value.name, icon: "codicon-symbol-parameter", data: undefined } });
}

function is_key_read_only(reflection_type: ReflectionType, key: string): boolean {
    return coreModel.isVectorType(reflection_type) && key == "size";
}

function is_variant_value_an_object(variant_type: string, reflection_info: ReflectionInfo, reflection_type: ReflectionType): boolean {
    const variant_value_type_name = variant_type.charAt(0).toUpperCase() + variant_type.slice(1);
    const variant_value_type: ReflectionType = {
        name: variant_value_type_name
    };

    return !(coreModel.isBooleanType(variant_value_type) ||
        coreModel.isIntegerType(variant_value_type) ||
        coreModel.isStringType(variant_value_type) ||
        coreModel.isEnumType(reflection_info.enums, variant_value_type));
}
</script>

<template>
    <div :style="css_variables" class="vertical_container">
        <div>{</div>
        <div class="vertical_container add_left_padding">
            <div class="horizontal_container">
                <div>&quot;type&quot;: &quot;</div>
                <Search_field :possible_values="get_variant_type_possible_values(variant_type_reflection_type)"
                    :current_search_term="variant_type"
                    v-on:update="(id: number, name: string, data: any) => on_update_variant(name)">
                </Search_field>
                <div>&quot;,</div>
            </div>
            <div
                :class="is_variant_value_an_object(variant_type, properties.reflection_info, properties.reflection_type) ? 'vertical_container' : 'horizontal_container add_horizontal_gap'">
                <div>&quot;value&quot;:</div>
                <JSON_object :value="variant_value" :reflection_info="properties.reflection_info"
                    :reflection_type="variant_value_reflection_type"
                    :is_read_only="is_key_read_only(properties.reflection_type, 'value')" :indentation="indentation"
                    :add_comma="false" v-on:on_new_changes="on_new_changes" v-bind:key="variant_value">
                </JSON_object>
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