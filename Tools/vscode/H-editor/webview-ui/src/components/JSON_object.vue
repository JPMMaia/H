<script setup lang="ts">
import { computed } from "vue";
import type { ReflectionType, ReflectionInfo } from "../../../src/utilities/coreModel";
import * as coreModel from "../../../src/utilities/coreModel";
import Editable from './Editable.vue';
import Press_key_editable from "./Press_key_editable.vue";
import Search_field from './Search_field.vue';

const g_debug = false;

const properties = defineProps<{
    value: any;
    reflectionInfo: ReflectionInfo;
    reflectionType: ReflectionType;
    isReadOnly: boolean;
    indentation: number;
    indentation_increment: number;
}>();

const emit = defineEmits<{
    (e: 'insert:value', position: any[]): void,
    (e: 'delete:value', position: any[]): void,
    (e: 'update:value', position: any[], value: any): void,
    (e: 'update:variant_type', position: any[], variant_type: any): void
}>();

const children_indentation = computed(() => {
    return properties.indentation + properties.indentation_increment;
});

const css_variables = computed(() => {
    return `--indentation: ${properties.indentation}em; --key_indentation: ${properties.indentation + properties.indentation_increment}em;`;
});

function on_enum_value_selected(value: string): void {
    emit("update:value", [], value);
}

function on_variant_type_selected(value: string): void {
    emit("update:variant_type", [], value);
}

function on_string_value_change(event: Event): void {
    if (event.target !== null && event.target instanceof HTMLInputElement) {
        const value = event.target.value;
        emit("update:value", [], value);
    }
}

function on_number_value_change(event: Event): void {
    if (event.target !== null && event.target instanceof HTMLInputElement) {
        const value = event.target.value;
        const valueToEmit = (value.length !== 0 && !isNaN(Number(value))) ? Number(value) : 0;
        emit("update:value", [], valueToEmit);
    }
}

function pass_on_variant_type_change_event(key: string | number, child_position: any[], variant_type: any): void {

    const position = [key].concat(child_position);
    emit("update:variant_type", position, variant_type);
}

function pass_on_value_change_event(key: string | number, child_position: any[], value: any): void {
    const position = [key].concat(child_position);
    emit("update:value", position, value);
}

function on_insert_or_remove_array_element(event: KeyboardEvent, index: number): void {
    if (event.key === "Enter") {
        const insert_at_index = index;
        emit("insert:value", [insert_at_index]);
    }
    else if (event.key === "Backspace") {

        if (index === 0) {
            return;
        }

        const delete_at_index = index - 1;
        emit("delete:value", [delete_at_index]);
    }
}

function pass_on_insert_array_element_event(key: string | number, child_position: any[]): void {
    const position = [key].concat(child_position);
    emit("insert:value", position);
}

function pass_on_delete_array_element_event(key: string | number, child_position: any[]): void {
    const position = [key].concat(child_position);
    emit("delete:value", position);
}

function get_key_reflection_type(reflectionInfo: ReflectionInfo, reflectionType: ReflectionType, objectValue: any, key: string): ReflectionType {

    if (g_debug) {
        console.log("JSON_object: get_child_options(): " + reflectionType.name + " " + key);
    }

    if (coreModel.isVectorType(reflectionType)) {
        if (key == "size") {
            return {
                name: "std::uint64_t"
            };
        }
        else if (key == "elements") {
            return reflectionType;
        }
    }
    else if (coreModel.isVariantType(reflectionType)) {
        if (key == "type") {
            return {
                name: reflectionType.name + "::Types"
            };
        }
        else if (key == "value") {
            const typeValue = objectValue.type;
            const typeName = typeValue.charAt(0).toUpperCase() + typeValue.slice(1);;
            return {
                name: typeName
            };
        }
    }
    else if (coreModel.isStructType(reflectionInfo.structs, reflectionType)) {
        const structReflection = coreModel.getStructType(reflectionInfo.structs, reflectionType);

        const memberReflectionIndex = structReflection.members.findIndex(value => value.name == key);

        if (memberReflectionIndex === -1) {
            throw Error("Key '" + key + "' was not found in struct reflection of '" + structReflection.name + "'");
        }

        const memberReflection = structReflection.members[memberReflectionIndex];
        return memberReflection.type;
    }

    throw Error("Key '" + key + "' does not reference a vector/variant/struct type!");
}

function get_enum_possible_values(reflectionInfo: ReflectionInfo, reflectionType: ReflectionType): string[] {
    const enumType = coreModel.getEnumType(reflectionInfo.enums, reflectionType);
    return enumType.values;
}

function get_variant_type_possible_values(reflectionInfo: ReflectionInfo, reflectionType: ReflectionType): string[] {
    const variantValueTypes = coreModel.getVariantValueTypes(reflectionType);
    return variantValueTypes.map(value => value.name);
}

function is_key_read_only(reflectionType: ReflectionType, key: string): boolean {
    return coreModel.isVectorType(reflectionType) && key == "size";
}
</script>

<template>
    <span v-if="coreModel.isEnumType(properties.reflectionInfo.enums, properties.reflectionType)">
        &quot;<Search_field
            :possible_values="get_enum_possible_values(properties.reflectionInfo, properties.reflectionType)"
            :current_search_term="properties.value" v-on:update="on_enum_value_selected">
        </Search_field>&quot;
    </span>
    <span v-else-if="coreModel.isVariantEnumType(properties.reflectionType)">
        &quot;<Search_field
            :possible_values="get_variant_type_possible_values(properties.reflectionInfo, properties.reflectionType)"
            :current_search_term="properties.value" v-on:update="on_variant_type_selected">
        </Search_field>&quot;
    </span>
    <span v-else-if="typeof properties.value === 'string'">&quot;<Editable :modelValue="properties.value"
            @input="on_string_value_change"></Editable>&quot;</span>
    <span v-else-if="typeof properties.value === 'number' && properties.isReadOnly">
        {{ properties.value }}
    </span>
    <span v-else-if="typeof properties.value === 'number'">
        <Editable :modelValue="properties.value" @input="on_number_value_change">
        </Editable>
    </span>
    <span v-else-if="Array.isArray(properties.value)">
        <span>
            <span>[<Press_key_editable placeholder="+"
                    v-on:on_key_up="(event) => on_insert_or_remove_array_element(event, 0)">
                </Press_key_editable></span>
            <br v-if="properties.value.length !== 0">
            <span v-for="(item, index) in properties.value" v-bind:key="index">
                <span :style="css_variables" class="key_indent">
                    <JSON_object :value="item" :reflectionInfo="properties.reflectionInfo"
                        :reflectionType="coreModel.getVectorValueType(properties.reflectionType)" :isReadOnly="false"
                        v-on:insert:value="(position) => pass_on_insert_array_element_event(index, position)"
                        v-on:delete:value="(position) => pass_on_delete_array_element_event(index, position)"
                        v-on:update:value="(position, value) => pass_on_value_change_event(index, position, value)"
                        v-on:update:variant_type="(position, new_variant_type) => pass_on_variant_type_change_event(index, position, new_variant_type)"
                        :indentation=children_indentation :indentation_increment="properties.indentation_increment">
                    </JSON_object>
                    <Press_key_editable placeholder="+"
                        v-on:on_key_up="(event) => on_insert_or_remove_array_element(event, index + 1)">
                    </Press_key_editable>
                    <span v-if="(index + 1) !== properties.value.length">,</span>
                </span>
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
            <span :style="css_variables" class="key_indent">&quot;{{ key }}&quot;: <JSON_object
                    :value="properties.value[key]" :reflectionInfo="properties.reflectionInfo"
                    :reflectionType="get_key_reflection_type(properties.reflectionInfo, properties.reflectionType, properties.value, key)"
                    :isReadOnly="is_key_read_only(properties.reflectionType, key)"
                    v-on:insert:value="(position) => pass_on_insert_array_element_event(key, position)"
                    v-on:delete:value="(position) => pass_on_delete_array_element_event(key, position)"
                    v-on:update:value="(position, value) => pass_on_value_change_event(key, position, value)"
                    v-on:update:variant_type="(position, new_variant_type) => pass_on_variant_type_change_event(key, position, new_variant_type)"
                    :indentation=children_indentation :indentation_increment="properties.indentation_increment">
                </JSON_object><span v-if="(index + 1) !== Object.keys(properties.value).length">,</span></span>
            <br>
        </span>
        <span v-if="Object.keys(properties.value).length !== 0" :style="css_variables" class="indent">}</span>
        <span v-else>}</span>
    </span>
</template>

<style scoped>
.indent {
    margin-left: var(--indentation);
}

.key_indent {
    margin-left: var(--key_indentation);
}
</style>