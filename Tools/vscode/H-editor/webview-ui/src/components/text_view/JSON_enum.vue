<script setup lang="ts">
import type { ReflectionType, ReflectionInfo } from "../../../../src/utilities/coreModel";
import type { Search_entry } from "@/utilities/Search_entry";
import * as coreModel from "../../../../src/utilities/coreModel";
import Search_field from '../Search_field.vue';

const properties = defineProps<{
    value: string;
    reflection_info: ReflectionInfo;
    reflection_type: ReflectionType;
}>();

const emit = defineEmits<{
    (e: 'update', new_value: string): void
}>();

function on_enum_value_selected(id: number, value: string): void {
    emit("update", value);
}

function get_enum_possible_values(reflection_info: ReflectionInfo, reflection_type: ReflectionType): Search_entry[] {
    const enumType = coreModel.getEnumType(reflection_info.enums, reflection_type);
    return enumType.values.map((value, index) => { return { id: index, name: value, icon: "codicon-symbol-enum", data: undefined } });
}
</script>

<template>
    <div class="horizontal_container">
        <div>&quot;</div>
        <Search_field
            :possible_values="get_enum_possible_values(properties.reflection_info, properties.reflection_type)"
            :current_search_term="properties.value" v-on:update="on_enum_value_selected">
        </Search_field>
        <div>&quot;</div>
    </div>
</template>

<style scoped>
.horizontal_container {
    display: flex;
    flex-direction: row;
}
</style>