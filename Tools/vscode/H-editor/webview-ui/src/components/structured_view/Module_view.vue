<script setup lang="ts">

import { computed, onMounted, ref } from "vue";
import "@vscode/codicons/dist/codicon.css";

import type * as core from "../../../../src/utilities/coreModelInterface";

import type * as Change from "../../../../src/utilities/Change";
import * as Common from "../common/components";
import * as Structured_view from "./components";
import * as Declarations from "./Declaration_helpers";

const properties = defineProps<{
    module: core.Module;
    declarations: Declarations.Item[]
}>();

const emit = defineEmits<{
    (e: 'new_changes', new_changes: Change.Hierarchy): void
}>();

function get_declaration_name(item: Declarations.Item): string {
    return item.type.toString() + item.value.id + "_" + item.value.name;
}

function on_module_space_input(event: Event): void {

    if (event.target !== null) {
        const element = event.target as HTMLElement;
        console.log(element.nodeValue);
    }

}

function on_module_space_key_up(event: KeyboardEvent): void {

    if (event.target !== null) {
        const element = event.target as HTMLElement;
        console.log(element.nodeValue);
    }

}

const main_element_ref = ref<HTMLElement | null>(null);

</script>

<template>
    <main ref="main_element_ref" v-on:input="on_module_space_input">
        <section name="Declarations/definitions">
            <section v-if="properties.declarations.length === 0" name="Module_space" class="add_left_margin"
                contenteditable="true">
                <br>
            </section>
            <section v-for="(declaration, index) of properties.declarations" :name="get_declaration_name(declaration)">
                <Structured_view.Function_view
                    v-if="declaration.type === Declarations.Item_type.Function && main_element_ref !== null"
                    :module="properties.module" :function_id="declaration.value.id" :root_element="main_element_ref">
                </Structured_view.Function_view>
                <section name="Module_space" class="add_left_margin" contenteditable="true">
                    <br>
                </section>
            </section>
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
</style>
