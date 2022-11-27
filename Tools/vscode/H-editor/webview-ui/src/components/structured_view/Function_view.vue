<script setup lang="ts">

import { computed, nextTick, ref } from "vue";
import "@vscode/codicons/dist/codicon.css";

import * as Core from "../../../../src/utilities/coreModelInterface";
import * as Core_Helpers from "../../../../src/utilities/coreModelInterfaceHelpers";

import * as Common from "../common/components";
import * as Change from "../../../../src/utilities/Change";
import * as Caret_helpers from "../../utilities/Caret_helpers";
import * as DOM_helpers from "../../utilities/DOM_helpers";
import * as Function_change_helpers from "../../utilities/Function_change_helpers";

const properties = defineProps<{
    module: Core.Module;
    function_id: number;
    root_element: HTMLElement
}>();

const emit = defineEmits<{
    (e: 'declaration:new_changes', new_changes: Change.Hierarchy): void,
    (e: 'definition:new_changes', new_changes: Change.Hierarchy): void,
    (e: 'update:function_keyword', value: string): void,
    (e: 'keyboard_event:function_keyword', event: KeyboardEvent): void
}>();

const function_declaration = computed(() => {
    return Core_Helpers.findFunctionDeclarationWithId(properties.module, properties.function_id);
});

const function_definition = computed(() => {
    return Core_Helpers.findFunctionDefinitionWithId(properties.module, properties.function_id);
});

const function_declaration_element_ref = ref<HTMLElement | null>(null);

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

function get_parameter_element(parameter_index: number, is_input_parameter: boolean): HTMLElement | undefined {

    if (function_declaration_element_ref.value === null) {
        return undefined;
    }

    const data_tag = is_input_parameter ? "Input_parameter" : "Output_parameter";

    const parameter_selector = 'span[data-tag="' + data_tag + '"][data-parameter-index="' + parameter_index + '"]';
    const parameter_span = function_declaration_element_ref.value.querySelector(parameter_selector);
    if (parameter_span !== null) {
        return parameter_span as HTMLElement;
    }

    return undefined;
}

function get_parameter_name_element(parameter_index: number, is_input_parameter: boolean): HTMLElement | undefined {

    const parameter_element = get_parameter_element(parameter_index, is_input_parameter);
    if (parameter_element === undefined) {
        return undefined;
    }

    const name_selector = 'span[data-tag="Name"]';
    const name_span = parameter_element.querySelector(name_selector);
    if (name_span !== null) {
        return name_span as HTMLElement;
    }

    return undefined;
}

function on_key_down(event: KeyboardEvent): void {

    if (event.target === null) {
        return;
    }

    if (Caret_helpers.handle_caret_keys(event)) {
        event.preventDefault();
    }
}

function on_parameter_name_key_down(parameter_index: number, is_input_parameter: boolean, event: KeyboardEvent): void {

    if (event.target === null) {
        return;
    }

    if (Caret_helpers.handle_caret_keys(event)) {
        event.preventDefault();
    }

    if (event.altKey && event.key === "ArrowUp") {

        const new_changes = Function_change_helpers.move_function_parameter_up(parameter_index, is_input_parameter);
        if (new_changes !== undefined) {
            emit("declaration:new_changes", new_changes);

            nextTick(() => {
                const parameter_name_element = get_parameter_name_element(parameter_index - 1, is_input_parameter);
                if (parameter_name_element !== undefined) {
                    Caret_helpers.transfer_caret_selection(parameter_name_element.childNodes.length > 0 ? parameter_name_element.childNodes[0] : parameter_name_element);
                }
            });
        }
    }
    else if (event.altKey && event.key === "ArrowDown") {

        const number_of_parameters = is_input_parameter ? function_declaration.value.input_parameter_ids.elements.length : function_declaration.value.output_parameter_ids.elements.length;
        const new_changes = Function_change_helpers.move_function_parameter_down(parameter_index, number_of_parameters, is_input_parameter);
        if (new_changes !== undefined) {
            emit("declaration:new_changes", new_changes);

            nextTick(() => {
                const parameter_name_element = get_parameter_name_element(parameter_index + 1, is_input_parameter);
                if (parameter_name_element !== undefined) {
                    Caret_helpers.transfer_caret_selection(parameter_name_element.childNodes.length > 0 ? parameter_name_element.childNodes[0] : parameter_name_element);
                }
            });
        }
    }
}

function get_next_parameter_name_span(previous_type_span: HTMLElement): HTMLElement | undefined {

    if (previous_type_span.parentElement !== null) {
        const grandparent = previous_type_span.parentElement.parentElement;
        if (grandparent !== null) {
            const next_input_parameter_span_parent = grandparent.nextElementSibling;
            if (next_input_parameter_span_parent !== null && next_input_parameter_span_parent.children.length > 0) {
                const next_input_parameter_span = next_input_parameter_span_parent.children[0]
                if (next_input_parameter_span !== null && next_input_parameter_span.children.length > 0) {
                    const name_span = next_input_parameter_span.children[0];
                    return name_span as HTMLElement;
                }
            }
        }
    }

    return undefined;
}

function on_parameter_change(event: Event, tag: string, parameter_index: number, is_input_parameter: boolean): void {
    if (event.target === null) {
        return;
    }

    const element = event.target as HTMLElement;

    if (element.textContent !== null && element.textContent.length > 0) {
        const trimmed_text = element.textContent.trim();

        if (tag === "Name" && trimmed_text.charAt(0) === ",") {
            const new_changes = Function_change_helpers.add_function_parameter(parameter_index, function_declaration.value.input_parameter_ids, is_input_parameter);
            emit("declaration:new_changes", new_changes);

            nextTick(() => {
                const selection = window.getSelection();
                if (selection !== null && element.childNodes.length > 0) {
                    DOM_helpers.select_whole_text(element.childNodes[0], selection);
                }
            });
        }
        else if (tag === "Type" && trimmed_text.charAt(trimmed_text.length - 1) === ",") {
            const new_changes = Function_change_helpers.add_function_parameter(parameter_index + 1, function_declaration.value.input_parameter_ids, is_input_parameter);
            emit("declaration:new_changes", new_changes);

            nextTick(() => {
                if (element.textContent !== null) {
                    element.textContent = element.textContent.substring(0, element.textContent.length - 1);
                }

                const next_name_span = get_next_parameter_name_span(element);
                if (next_name_span !== undefined) {
                    const selection = window.getSelection();
                    if (selection !== null && next_name_span.childNodes.length > 0) {
                        DOM_helpers.select_whole_text(next_name_span.childNodes[0], selection);
                    }
                }
            });
        }
    }
}

function on_function_keyword_input(event: Event): void {
    if (event.target === null) {
        return;
    }

    const target = event.target as HTMLElement;

    const text = target.childNodes.length > 0 ? (target.childNodes[0].textContent ? target.childNodes[0].textContent : "") : "";
    const trimmed_text = text.trim().replace("\u200B", "");

    if (trimmed_text !== "function") {
        emit("update:function_keyword", text);
    }
}

function on_function_keyword_key_down(event: KeyboardEvent): void {

    if (event.target === null) {
        return;
    }

    if (Caret_helpers.handle_caret_keys(event)) {
        event.preventDefault();
    }
    else {
        emit("keyboard_event:function_keyword", event);
    }
}

function on_function_name_input(event: Event): void {
    if (event.target === null) {
        return;
    }

    const target = event.target as HTMLElement;
    const value = target.textContent;
    if (value === null) {
        return;
    }

    on_name_changed(value);
}

</script>

<template>
    <Common.Collapsible>
        <template #summary="{}">
            <div ref="function_declaration_element_ref" data-tag="Type" data-type="Function_declaration">
                <span data-tag="Keyword" data-line="start" class="keyword" contenteditable="true"
                    v-on:input="on_function_keyword_input" v-on:keydown="on_function_keyword_key_down">function</span>
                <span data-tag="Space">&nbsp;</span>
                <span data-tag="Member" data-member="name" contenteditable="true" v-on:keydown="on_key_down"
                    v-on:input="on_function_name_input">
                    {{ function_declaration.name }}
                </span>
                <span data-tag="Start_function_input_parameters">(</span>
                <template v-for="(_, input_parameter_index) of function_declaration.input_parameter_ids.elements">
                    <span data-tag="Input_parameter" :data-parameter-index="input_parameter_index">
                        <span data-tag="Name" contenteditable="true"
                            v-on:input="event => on_parameter_change(event, 'Name', input_parameter_index, true)"
                            v-on:keydown="(event: KeyboardEvent) => on_parameter_name_key_down(input_parameter_index, true, event)">
                            {{ function_declaration.input_parameter_names.elements[input_parameter_index] }}
                        </span>
                        <span data-tag="Symbol">:</span>
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Type" class="type" contenteditable="true"
                            v-on:input="event => on_parameter_change(event, 'Type', input_parameter_index, true)"
                            v-on:keydown="on_key_down">
                            {{ Core_Helpers.getUnderlyingTypeName([properties.module],
                                    function_declaration.type.input_parameter_types.elements[input_parameter_index])
                            }}
                        </span>
                    </span>
                    <span v-if="(input_parameter_index + 1) < function_declaration.input_parameter_ids.elements.length"
                        data.tag="Parameter_separator">,</span>
                    <span v-if="(input_parameter_index + 1) < function_declaration.input_parameter_ids.elements.length"
                        data-tag="Space">&nbsp;</span>
                </template>
                <span data-tag="End_function_input_parameters">)</span>
                <span data-tag="Space">&nbsp;</span>
                <span data-tag="Symbol">-></span>
                <span data-tag="Space">&nbsp;</span>
                <span data-tag="Start_function_output_parameters">(</span>
                <template v-for="(_, output_parameter_index) of function_declaration.output_parameter_ids.elements">
                    <span data-tag="Output_parameter" :data-parameter-index="output_parameter_index">
                        <span data-tag="Name" contenteditable="true"
                            v-on:input="event => on_parameter_change(event, 'Name', output_parameter_index, false)"
                            v-on:keydown="(event: KeyboardEvent) => on_parameter_name_key_down(output_parameter_index, false, event)">
                            {{ function_declaration.output_parameter_names.elements[output_parameter_index] }}
                        </span>
                        <span data-tag="Symbol">:</span>
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Type" class="type" contenteditable="true"
                            v-on:input="event => on_parameter_change(event, 'Type', output_parameter_index, false)"
                            v-on:keydown="on_key_down">
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
                </template>
                <span data-tag="End_function_output_parameters">)</span>
            </div>
        </template>
        <template #content="{}">
            <div data-tag="Type" data-type="Function_definition">
                <span data-tag="Start_function_definition">{</span>
                <div data-tag="Function_body">
                    <div contenteditable="true" v-on:keydown="on_key_down"
                        v-on:focusin="Caret_helpers.handle_focus_empty_space">&ZeroWidthSpace;</div>
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
