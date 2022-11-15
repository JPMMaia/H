<script setup lang="ts">

import { computed, ref } from "vue";
import "@vscode/codicons/dist/codicon.css";

import * as Core from "../../../../src/utilities/coreModelInterface";
import * as Core_Helpers from "../../../../src/utilities/coreModelInterfaceHelpers";

import * as Common from "../common/components";
import Function_definition from "./Function_definition.vue";
import Function_parameters from "./Function_parameters.vue";
import * as Change from "../../../../src/utilities/Change";
import * as DOM_helpers from "../../utilities/DOM_helpers";

const properties = defineProps<{
    module: Core.Module;
    function_id: number;
    root_element: HTMLElement
}>();

const emit = defineEmits<{
    (e: 'declaration:new_changes', new_changes: Change.Hierarchy): void,
    (e: 'definition:new_changes', new_changes: Change.Hierarchy): void
}>();

const function_declaration = computed(() => {
    return Core_Helpers.findFunctionDeclarationWithId(properties.module, properties.function_id);
});

const function_definition = computed(() => {
    return Core_Helpers.findFunctionDefinitionWithId(properties.module, properties.function_id);
});

function on_name_changed(value: string): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("name", value)
        ],
        children: []
    };

    emit("declaration:new_changes", new_changes);
}

function on_linkage_changed(value: string): void {
    const linkage = Core.Linkage[value as keyof typeof Core.Linkage];

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("linkage", linkage)
        ],
        children: []
    };

    emit("declaration:new_changes", new_changes);
}

function on_input_parameters_changed(new_changes: Change.Hierarchy): void {

    emit("declaration:new_changes", new_changes);
}

function on_is_variadic_changed(value: boolean): void {

    const new_changes: Change.Hierarchy = {
        changes: [
            Change.create_update("is_variadic", value)
        ],
        children: []
    };

    emit("declaration:new_changes", new_changes);
}

function on_output_parameters_changed(new_changes: Change.Hierarchy): void {

    emit("declaration:new_changes", new_changes);
}

function on_definition_new_changes(new_changes: Change.Hierarchy): void {

    emit("definition:new_changes", new_changes);
}

function move_caret_once(root_element: HTMLElement, element: HTMLElement, offset: number): void {
    if (element.childNodes.length > 0) {
        const selection = window.getSelection();
        if (selection !== null) {
            DOM_helpers.move_caret_once(root_element, element, offset, selection);
        }
    }
}

function on_key_down(event: KeyboardEvent): void {

    const root_element = properties.root_element;

    if (event.target === null || root_element === null) {
        return;
    }

    const element = event.target as HTMLElement;

    if (event.key === "ArrowLeft") {
        move_caret_once(root_element, element, -1);
        event.preventDefault();
    }
    else if (event.key === "ArrowRight") {
        move_caret_once(root_element, element, 1);
        event.preventDefault();
    }

    /*const input_element = event.target as HTMLInputElement;

    if (event.key === "ArrowLeft") {
        DOM_helpers.move_caret_once(root_element, input_element, -1, event.shiftKey);
        event.preventDefault();
    }
    else if (event.key === "ArrowRight") {
        DOM_helpers.move_caret_once(root_element, input_element, 1, event.shiftKey);
        event.preventDefault();
    }
    else if (event.key === "Home") {
        DOM_helpers.move_caret_to_start(root_element);
        event.preventDefault();
    }
    else if (event.key === "End") {
        DOM_helpers.move_caret_to_end(root_element);
        event.preventDefault();
    }*/
}

</script>

<template>
    <Common.Collapsible>
        <template #summary="{}">
            <div data-tag="Type" data-type="Function_declaration">
                <span data-tag="Keyword" class="keyword" contenteditable="true"
                    v-on:keydown="on_key_down">function</span>
                <span data-tag="Space">&nbsp;</span>
                <span data-tag="Member" data-member="name" contenteditable="true" v-on:keydown="on_key_down">{{
                function_declaration.name
                }}</span>
                <span data-tag="Start_function_input_parameters">(</span>
                <span v-for="(_, input_parameter_index) of function_declaration.input_parameter_ids.elements">
                    <span data-tag="Input_parameter">
                        <span data-tag="Name" contenteditable="true" v-on:keydown="on_key_down">
                            {{ function_declaration.input_parameter_names.elements[input_parameter_index] }}
                        </span>
                        <span data-tag="Symbol">:</span>
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Type" class="type" contenteditable="true" v-on:keydown="on_key_down">
                            {{ Core_Helpers.getUnderlyingTypeName([properties.module],
                            function_declaration.type.input_parameter_types.elements[input_parameter_index])
                            }}
                        </span>
                    </span>
                    <span v-if="(input_parameter_index + 1) < function_declaration.input_parameter_ids.elements.length"
                        data.tag="Parameter_separator">,</span>
                    <span v-if="(input_parameter_index + 1) < function_declaration.input_parameter_ids.elements.length"
                        data-tag="Space">&nbsp;</span>
                </span>
                <span data-tag="End_function_input_parameters">)</span>
                <span data-tag="Space">&nbsp;</span>
                <span data-tag="Symbol">-></span>
                <span data-tag="Space">&nbsp;</span>
                <span data-tag="Start_function_output_parameters">(</span>
                <span v-for="(_, output_parameter_index) of function_declaration.output_parameter_ids.elements">
                    <span data-tag="output_parameter">
                        <span data-tag="Name" contenteditable="true" v-on:keydown="on_key_down">
                            {{ function_declaration.output_parameter_names.elements[output_parameter_index] }}
                        </span>
                        <span data-tag="Symbol">:</span>
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Type" class="type" contenteditable="true" v-on:keydown="on_key_down">
                            {{ Core_Helpers.getUnderlyingTypeName([properties.module],
                            function_declaration.type.output_parameter_types.elements[output_parameter_index])
                            }}
                        </span>
                    </span>
                    <span
                        v-if="(output_parameter_index + 1) < function_declaration.output_parameter_ids.elements.length"
                        data.tag="Parameter_separator">,</span>
                    <span
                        v-if="(output_parameter_index + 1) < function_declaration.output_parameter_ids.elements.length"
                        data-tag="Space">&nbsp;</span>
                </span>
                <span data-tag="End_function_output_parameters">)</span>
            </div>
        </template>
        <template #content="{}">
            <div data-tag="Type" data-type="Function_definition">
                <span data-tag="Start_function_definition">{</span>
                <div data-tag="Function_body">
                    <span contenteditable="true" v-on:keydown="on_key_down">
                        <hr>
                    </span>
                </div>
                <span data-tag="End_function_definition">}</span>
            </div>
        </template>
    </Common.Collapsible>
</template>
 My_function_0(lhs: Float32, rhs: Float32) -> (result: Float32)
<style scoped>
.add_padding_left {
    padding-left: 3ch;
}

.add_margin {
    margin: 1ch;
}

.row_container {
    display: flex;
    flex-direction: row;
    column-gap: 1ch;
}

.column_container {
    display: flex;
    flex-direction: column;
    row-gap: 1ch;
}

.keyword {
    color: blue;
}

.type {
    color: purple;
}

/*[contenteditable] {
    outline: none;
}*/
</style>
