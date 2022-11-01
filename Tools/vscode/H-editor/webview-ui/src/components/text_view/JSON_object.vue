<script setup lang="ts">
import { computed } from "vue";
import type { ReflectionType, ReflectionInfo } from "../../../../src/utilities/coreModel";
import * as coreModel from "../../../../src/utilities/coreModel";
import JSON_boolean from "./JSON_boolean.vue";
import JSON_enum from "./JSON_enum.vue";
import JSON_number from "./JSON_number.vue";
import JSON_string from "./JSON_string.vue";
import JSON_variant from "./JSON_variant.vue";
import JSON_vector from "./JSON_vector.vue";
import * as Change from "../../../../src/utilities/Change";

const g_debug = false;

const properties = defineProps<{
    value: any;
    reflection_info: ReflectionInfo;
    reflection_type: ReflectionType;
    is_read_only: boolean;
    indentation: number;
    add_comma: boolean
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void,
    (e: 'update', new_value: any): void
}>();

const css_variables = computed(() => {
    return `--indentation: ${properties.indentation}ch;`;
});

const object_keys = computed(() => {
    return Object.keys(properties.value);
})

function on_new_changes(new_changes: Change.Hierarchy): void {
    emit("new_changes", new_changes);
}

function on_key_new_changes(key: string, children_changes: Change.Hierarchy): void {

    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: [key],
                hierarchy: children_changes
            }
        ]
    };

    emit("new_changes", new_changes);
}

function on_value_update(new_value: any): void {
    emit("update", new_value);
}

function on_key_value_update(key: string, new_value: any): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update(key, new_value)
        ],
        children: []
    };

    emit("new_changes", new_changes);
}

function get_key_reflection_type(reflection_info: ReflectionInfo, reflection_type: ReflectionType, objectValue: any, key: string): ReflectionType {

    if (g_debug) {
        console.log("JSON_object: get_child_options(): " + reflection_type.name + " " + key);
    }

    if (coreModel.isVectorType(reflection_type)) {
        if (key == "size") {
            return {
                name: "std::uint64_t"
            };
        }
        else if (key == "elements") {
            return reflection_type;
        }
    }
    else if (coreModel.isVariantType(reflection_type)) {
        if (key == "type") {
            return {
                name: reflection_type.name + "::Types"
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
    else if (coreModel.isStructType(reflection_info.structs, reflection_type)) {
        const structReflection = coreModel.getStructType(reflection_info.structs, reflection_type);

        const memberReflectionIndex = structReflection.members.findIndex(value => value.name == key);

        if (memberReflectionIndex === -1) {
            throw Error("Key '" + key + "' was not found in struct reflection of '" + structReflection.name + "'");
        }

        const memberReflection = structReflection.members[memberReflectionIndex];
        return memberReflection.type;
    }

    throw Error("Key '" + key + "' does not reference a vector/variant/struct type!");
}

function is_key_read_only(reflection_type: ReflectionType, key: string): boolean {
    return coreModel.isVectorType(reflection_type) && key == "size";
}

function is_key_an_object(value: any, reflection_info: ReflectionInfo, reflection_type: ReflectionType, key: string): boolean {
    const type = typeof value[key];
    const is_fundamental = (type === "boolean") || (type === "number") || (type === "string");
    const key_reflection_type = get_key_reflection_type(reflection_info, reflection_type, value, key);
    const is_enum = coreModel.isEnumType(reflection_info.enums, key_reflection_type);
    return !is_fundamental && !is_enum;
}
</script>

<template>
    <div v-if="coreModel.isEnumType(properties.reflection_info.enums, properties.reflection_type)"
        class="horizontal_container">
        <JSON_enum :value="properties.value" :reflection_info="properties.reflection_info"
            :reflection_type="properties.reflection_type" v-on:update="on_value_update"></JSON_enum>
        <div v-if="add_comma">,</div>
    </div>
    <div v-else-if="properties.is_read_only && ((typeof properties.value === 'boolean') || (typeof properties.value === 'number') || (typeof properties.value === 'string'))"
        class="horizontal_container">
        {{ properties.value }}
        <div v-if="add_comma">,</div>
    </div>
    <div v-else-if="typeof properties.value === 'string'" class="horizontal_container">
        <JSON_string :value="properties.value" v-on:update="on_value_update"></JSON_string>
        <div v-if="add_comma">,</div>
    </div>
    <div v-else-if="typeof properties.value === 'boolean'" class="horizontal_container">
        <JSON_boolean :value="properties.value" v-on:update="on_value_update"></JSON_boolean>
        <div v-if="add_comma">,</div>
    </div>
    <div v-else-if="typeof properties.value === 'number'" class="horizontal_container">
        <JSON_number :value="properties.value" v-on:update="on_value_update"></JSON_number>
        <div v-if="add_comma">,</div>
    </div>
    <div v-else-if="coreModel.isVariantType(properties.reflection_type)" class="horizontal_container">
        <JSON_variant :value="properties.value" :reflection_info="properties.reflection_info"
            :reflection_type="properties.reflection_type" :indentation="indentation" :add_comma="add_comma"
            v-on:new_changes="on_new_changes"></JSON_variant>
    </div>
    <div v-else :style="css_variables" class="vertical_container">
        <div>{</div>
        <div class="vertical_container add_left_padding">
            <div v-for="(key, index) in object_keys" v-bind:key="index" class="horizontal_container">
                <div
                    :class="is_key_an_object(properties.value, properties.reflection_info, properties.reflection_type, key) ? 'vertical_container' : 'horizontal_container add_horizontal_gap'">
                    <div>&quot;{{ key }}&quot;:</div>
                    <div>
                        <JSON_vector
                            v-if="coreModel.isVectorType(get_key_reflection_type(properties.reflection_info, properties.reflection_type, properties.value, key))"
                            :vector_name="key" :value="properties.value[key]"
                            :reflection_info="properties.reflection_info"
                            :reflection_type="get_key_reflection_type(properties.reflection_info, properties.reflection_type, properties.value, key)"
                            :indentation="properties.indentation" :add_comma="(index + 1) < object_keys.length"
                            v-on:new_changes="on_new_changes">
                        </JSON_vector>
                        <JSON_object v-else :value="properties.value[key]" :reflection_info="properties.reflection_info"
                            :reflection_type="get_key_reflection_type(properties.reflection_info, properties.reflection_type, properties.value, key)"
                            :is_read_only="is_key_read_only(properties.reflection_type, key)" :indentation="indentation"
                            :add_comma="(index + 1) < object_keys.length"
                            v-on:new_changes="(new_changes: Change.Hierarchy) => on_key_new_changes(key, new_changes)"
                            v-on:update="(new_value: any) => on_key_value_update(key, new_value)">
                        </JSON_object>
                    </div>
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