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

const properties = defineProps<{
    module: Core.Module;
    declarations: Declarations.Item[]
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

function update_declaration_indices(declaration_indices: number[], order_index: number, new_item_index: number): void {
    for (let index = 0; index < declaration_indices.length; ++index) {
        if (declaration_indices[index] >= new_item_index) {
            declaration_indices[index] += 1;
        }
    }

    declaration_indices.splice(order_index, 0, new_item_index);
}

function set_caret_position_at_function_name_element(declaration: Declarations.Item): void {
    const declaration_id_name = Declarations.get_declaration_id_name(properties.module, declaration);
    const function_section = document.getElementById(declaration_id_name);
    if (function_section !== null) {
        const function_name_span = function_section.querySelector('span[data-tag="Member"][data-member="name"]');
        if (function_name_span !== null) {
            Caret_helpers.select_whole_text(function_name_span as HTMLElement);
        }
    }
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
                update_declaration_indices(declaration_indices.value, order_index, item_index);

                nextTick(() => {
                    set_caret_position_at_function_name_element(properties.declarations[item_index]);
                });
            }

            element.textContent = "\u200B";
        });
    }
}

watch(() => properties.declarations, (new_value: Declarations.Item[], old_value: Declarations.Item[]) => {
});

</script>

<template>
    <main ref="main_element_ref">
        <section name="Declarations/definitions">
            <section v-if="properties.declarations.length === 0" name="Module_space" class="add_left_margin">
                <div>
                    <span contenteditable="true" v-on:input="event => on_empty_space_input(event, 0)"
                        v-on:keydown="on_key_down"
                        v-on:focusin="Caret_helpers.handle_focus_empty_space">&ZeroWidthSpace;</span>
                </div>
            </section>
            <template v-for="(declaration, order_index) of ordered_declarations">
                <section :id="Declarations.get_declaration_id_name(properties.module, declaration)">
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
                        v-on:declaration:new_changes="(children_changes: Change.Hierarchy) => on_new_changes(declaration.type, declaration.index, declaration.is_export, children_changes)">
                    </Structured_view.Function_view>
                </section>
                <section name="Module_space" class="add_left_margin">
                    <div>
                        <span contenteditable="true" v-on:input="event => on_empty_space_input(event, order_index + 1)"
                            v-on:keydown="on_key_down"
                            v-on:focusin="Caret_helpers.handle_focus_empty_space">&ZeroWidthSpace;</span>
                    </div>
                </section>
            </template>
        </section>

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
