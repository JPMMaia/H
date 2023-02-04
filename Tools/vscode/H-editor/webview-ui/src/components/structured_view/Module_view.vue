<script setup lang="ts">

import { computed, nextTick, onMounted, ref, watch } from "vue";
import "@vscode/codicons/dist/codicon.css";

import type * as Core from "../../../../src/utilities/coreModelInterface";

import type * as Change from "../../../../src/utilities/Change";
import * as Common from "../common/components";
import * as Structured_view from "./components";
import * as Declarations from "./Declaration_helpers";

import * as Caret_helpers from "../../utilities/Caret_helpers";
import * as Module_change_helpers from "../../utilities/Module_change_helpers";

import * as Abstract_syntax_tree_helpers from "../../utilities/Abstract_syntax_tree_helpers";
import * as Nodes from "./nodes/components";

const properties = defineProps<{
    module: Core.Module;
    module_node_tree: Abstract_syntax_tree_helpers.Node_data_type;
    declarations: Declarations.Item[];
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

const main_element_ref = ref<HTMLElement | null>(null);

const declaration_indices = ref<number[] | undefined>();

onMounted(() => {
    declaration_indices.value = [];
    for (let index = 0; index < properties.declarations.length; ++index) {
        declaration_indices.value.push(index);
    }
});

const ordered_declarations = computed(() => {

    const items: Declarations.Item[] = [];

    if (declaration_indices.value === undefined) {
        return items;
    }

    for (const index of declaration_indices.value) {
        items.push(properties.declarations[index]);
    }

    return items;
});

function get_item_type_vector_name(type: Declarations.Item_type): string {
    switch (type) {
        case Declarations.Item_type.Alias:
            return "alias_type_declarations";
        case Declarations.Item_type.Enum:
            return "enum_declarations";
        case Declarations.Item_type.Struct:
            return "struct_declarations";
        case Declarations.Item_type.Function:
            return "function_declarations";
    }
}

function on_new_changes(type: Declarations.Item_type, index: number, is_export: boolean, children_changes: Change.Hierarchy): void {

    const declarations_name = is_export ? "export_declarations" : "internal_declarations";
    const vector_name = get_item_type_vector_name(type);

    const new_changes: Change.Hierarchy = {
        changes: [],
        children: [
            {
                position: [declarations_name, vector_name, "elements", index],
                hierarchy: children_changes
            }
        ]
    };

    emit("new_changes", new_changes);
}

function on_key_down(event: KeyboardEvent): void {

    if (event.target === null) {
        return;
    }

    if (Caret_helpers.handle_caret_keys(event)) {
        event.preventDefault();
    }

    if (event.key === "Enter") {
        event.preventDefault();
    }
}

function add_declaration_index(declaration_indices: number[], order_index: number, new_item_index: number): void {
    for (let index = 0; index < declaration_indices.length; ++index) {
        if (declaration_indices[index] >= new_item_index) {
            declaration_indices[index] += 1;
        }
    }

    declaration_indices.splice(order_index, 0, new_item_index);
}

function remove_declaration_index(declaration_indices: number[], order_index: number): void {

    const item_index = declaration_indices[order_index];
    declaration_indices.splice(order_index, 1);

    for (let index = 0; index < declaration_indices.length; ++index) {
        if (declaration_indices[index] >= item_index) {
            declaration_indices[index] -= 1;
        }
    }
}

function get_space_element(space_index: number): HTMLElement | undefined {

    if (main_element_ref.value !== null) {
        const selector = 'span[data-space-index="' + space_index + '"]';
        const space_span = main_element_ref.value.querySelector(selector);
        if (space_span !== null) {
            return space_span as HTMLElement;
        }
    }

    return undefined;
}

function get_declaration_first_keyword_element(order_index: number): HTMLElement | undefined {

    if (main_element_ref.value !== null) {

        const declaration_element_selector = 'section[data-declaration-order-index="' + order_index + '"]';
        const declaration_element = main_element_ref.value.querySelector(declaration_element_selector);
        if (declaration_element !== null) {

            const keyword_span_selector = 'span[contenteditable="true"]';
            const keyword_span = declaration_element.querySelector(keyword_span_selector);
            if (keyword_span !== null) {
                return keyword_span as HTMLElement;
            }
        }
    }

    return undefined;
}

function get_function_declaration_name_element(declaration: Declarations.Item): HTMLElement | undefined {
    const declaration_id_name = Declarations.get_declaration_id_name(properties.module, declaration);
    const function_section = document.getElementById(declaration_id_name);
    if (function_section !== null) {
        const function_name_span = function_section.querySelector('span[data-tag="Member"][data-member="name"]');
        if (function_name_span !== null) {
            return function_name_span as HTMLElement;
        }
    }

    return undefined;
}

function on_empty_space_input(event: Event, order_index: number): void {

    if (event.target === null) {
        return;
    }

    const element = event.target as HTMLElement;

    const text_content = element.textContent;

    if (text_content === null) {
        return;
    }

    if (text_content === "function \u200B") {

        const function_id = properties.module.next_unique_id;
        const new_changes = Module_change_helpers.create_function(properties.module, "<function_name>");
        emit("new_changes", new_changes);

        nextTick(() => {

            const item_index = Declarations.find_item_index(properties.module, properties.declarations, function_id);
            if (item_index !== undefined && declaration_indices.value !== undefined) {
                add_declaration_index(declaration_indices.value, order_index, item_index);

                nextTick(() => {
                    const function_name_span = get_function_declaration_name_element(properties.declarations[item_index]);
                    if (function_name_span !== undefined) {
                        Caret_helpers.select_whole_text(function_name_span);
                    }
                });
            }

            element.textContent = "\u200B";
        });
    }
}

function on_keyword_change(order_index: number, new_value: string): void {

    const trimmed_new_value = new_value.trim().replace("\u200B", "");

    if (trimmed_new_value == "alias") {
        // TODO create new alias
    }
    else if (trimmed_new_value == "enum") {
        // TODO create new enum
    }
    else if (trimmed_new_value == "struct") {
        // TODO create new struct
    }
    else if (trimmed_new_value == "function") {
        // TODO create new function
    }
    else {
        const item = ordered_declarations.value[order_index];
        const declaration = Declarations.get_item_value(properties.module, item);

        if (declaration_indices.value !== undefined) {
            remove_declaration_index(declaration_indices.value, order_index);
        }

        const new_changes = Module_change_helpers.delete_function(properties.module, declaration.id);
        emit("new_changes", new_changes);

        nextTick(() => {
            const space_span = get_space_element(order_index);
            if (space_span !== undefined) {
                space_span.textContent = "\u200B";
                nextTick(() => {
                    const node = space_span.childNodes.length > 0 ? space_span.childNodes[0] : space_span;
                    Caret_helpers.set_caret_position(node, 0);
                });
            }
        });
    }
}

function transfer_caret_selection_to_item(order_index: number): void {
    const element = get_declaration_first_keyword_element(order_index);
    if (element !== undefined) {
        const selection = window.getSelection();
        if (selection !== null) {
            Caret_helpers.transfer_caret_selection(element.childNodes.length > 0 ? element.childNodes[0] : element);
        }
    }
}

function on_item_keyboard_event(order_index: number, event: KeyboardEvent): void {

    if (event.altKey && event.key === "ArrowUp") {
        if (declaration_indices.value !== undefined && order_index > 0) {
            const temporary = declaration_indices.value[order_index];
            declaration_indices.value[order_index] = declaration_indices.value[order_index - 1];
            declaration_indices.value[order_index - 1] = temporary;

            nextTick(() => {
                transfer_caret_selection_to_item(order_index - 1);
            });
        }
    }
    else if (event.altKey && event.key === "ArrowDown") {
        if (declaration_indices.value !== undefined && (order_index + 1) < declaration_indices.value.length) {
            const temporary = declaration_indices.value[order_index];
            declaration_indices.value[order_index] = declaration_indices.value[order_index + 1];
            declaration_indices.value[order_index + 1] = temporary;

            nextTick(() => {
                transfer_caret_selection_to_item(order_index + 1);
            });
        }
    }
}

watch(() => properties.declarations, (new_value: Declarations.Item[], old_value: Declarations.Item[]) => {
});

</script>

<template>
    <main ref="main_element_ref">

        <Nodes.Node :module="properties.module" :node="properties.module_node_tree">
        </Nodes.Node>


        <!--<section name="Declarations/definitions">
            <section v-if="properties.declarations.length === 0" name="Module_space" class="add_left_margin">
                <div>
                    <span data-space-index="0" contenteditable="true"
                        v-on:input="event => on_empty_space_input(event, 0)" v-on:keydown="on_key_down"
                        v-on:focusin="Caret_helpers.handle_focus_empty_space">&ZeroWidthSpace;</span>
                </div>
            </section>
            <template v-for="(declaration, order_index) of ordered_declarations">
                <section :id="Declarations.get_declaration_id_name(properties.module, declaration)"
                    :data-declaration-order-index="order_index">
                    <div v-if="declaration.type === Declarations.Item_type.Alias" class="add_left_margin">
                        <div contenteditable="true" v-on:keydown="on_key_down">
                            alias {{ Declarations.get_item_value(properties.module,
                                    declaration).name
                            }}
                        </div>
                    </div>
                    <div v-else-if="declaration.type === Declarations.Item_type.Enum" class="add_left_margin">
                        <div contenteditable="true" v-on:keydown="on_key_down">
                            enum {{ Declarations.get_item_value(properties.module,
                                    declaration).name
                            }}
                        </div>
                    </div>
                    <div v-else-if="declaration.type === Declarations.Item_type.Struct" class="add_left_margin">
                        <div contenteditable="true" v-on:keydown="on_key_down">
                            struct {{ Declarations.get_item_value(properties.module,
                                    declaration).name
                            }}
                        </div>
                    </div>
                    <Structured_view.Function_view
                        v-else-if="declaration.type === Declarations.Item_type.Function && main_element_ref !== null"
                        :module="properties.module"
                        :function_id="Declarations.get_item_value(properties.module, declaration).id"
                        :root_element="main_element_ref"
                        v-on:declaration:new_changes="(children_changes: Change.Hierarchy) => on_new_changes(declaration.type, declaration.index, declaration.is_export, children_changes)"
                        v-on:update:function_keyword="(new_value: string) => on_keyword_change(order_index, new_value)"
                        v-on:keyboard_event:function_keyword="(event: KeyboardEvent) => on_item_keyboard_event(order_index, event)">
                    </Structured_view.Function_view>
                </section>
                <section name="Module_space" class="add_left_margin">
                    <div>
                        <span :data-space-index="order_index + 1" contenteditable="true"
                            v-on:input="event => on_empty_space_input(event, order_index + 1)"
                            v-on:keydown="on_key_down"
                            v-on:focusin="Caret_helpers.handle_focus_empty_space">&ZeroWidthSpace;</span>
                    </div>
                </section>
            </template>
        </section>-->

        <section name="function_add_0">
            <div name="function_declaration">
                <span data-tag="Return_type">Int32</span>
                <span data-tag="space">&nbsp;</span>
                <span data-tag="Function_name">Add</span>
                <span data-tag="Start_function_arguments">(</span>
                <span data-tag="Function_parameter_0">
                    <span data-tag="Parameter_type">Int32</span>
                    <span data-tag="Space">&nbsp;</span>
                    <span data-tag="Parameter_name">lhs</span>
                </span>
                <span data-tag="Parameter_separator">
                    <span data-tag="Comma">,</span>
                    <span data-tag="Space">&nbsp;</span>
                </span>
                <span data-tag="Function_parameter_1">
                    <span data-tag="Parameter_type">Int32</span>
                    <span data-tag="Space">&nbsp;</span>
                    <span data-tag="Parameter_name">rhs</span>
                </span>
                <span data-tag="End_function_arguments">)</span>
            </div>
            <div name="function_definition">
                <span data-tag="Open_block">{</span>
                <div name="Statement_0">
                    <span data-tag="Variable_declaration">
                        <span data-tag="Type" data-type="Fundamental_type" data-value="Int32">Int32</span>
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Variable_name" data-value="a">a</span>
                    </span>
                    <span data-tag="Assign">
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Equal">=</span>
                        <span data-tag="Space">&nbsp;</span>
                    </span>
                    <span data-tag="Expression">
                        <span data-tag="Constant" data-type="Integer_type" data-is-signed="true"
                            data-number-of-bits="32" data-value="1">1</span>
                    </span>
                    <span data-tag="End_statement">;</span>
                </div>
                <div name="Statement_1">
                    <span data-tag="Variable_declaration">
                        <span data-tag="Type" data-type="Fundamental_type" data-value="Int32">Int32</span>
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Variable_name" data-value="b">b</span>
                    </span>
                    <span data-tag="Assign">
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Equal">=</span>
                        <span data-tag="Space">&nbsp;</span>
                    </span>
                    <span data-tag="Expression">
                        <span data-tag="Constant" data-type="Integer_type" data-is-signed="true"
                            data-number-of-bits="32" data-value="1">1</span>
                    </span>
                    <span data-tag="End_statement">;</span>
                </div>
                <div name="Statement_2">
                    <span data-tag="Expression" data-type="Return_expression">
                        <span data-tag="Return">return</span>
                        <span data-tag="Space">&nbsp;</span>
                        <span data-tag="Expression" data-type="Binary_expression">
                            <span data-tag="Expression" data-type="Variable_expression"
                                data-value="{type:local_variable,id:0}">a</span>
                            <span data-tag="Space">&nbsp;</span>
                            <span data-tag="Code" data-type="Binary_operation" data-value="Add">+</span>
                            <span data-tag="Space">&nbsp;</span>
                            <span data-tag="Expression" data-type="Variable_expression"
                                data-value="{type:local_variable,id:1}">b</span>
                        </span>
                    </span>
                    <span data-tag="End_statement">;</span>
                </div>
                <span data-tag="Close_block">}</span>
            </div>
        </section>
    </main>
</template>

<style scoped>
.add_left_margin {
    margin-left: 2ch;
}

/*[contenteditable] {
    outline: none;
}*/

/*[contenteditable] {
    display: block;
    height: 1.2em;
}*/
</style>
