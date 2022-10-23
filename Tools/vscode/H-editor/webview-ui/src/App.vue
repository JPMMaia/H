<script setup lang="ts">
import { onMounted, ref } from "vue";
import { provideVSCodeDesignSystem, vsCodeButton } from "@vscode/webview-ui-toolkit";
import { vscode } from "./utilities/vscode";
import { updateState } from "../../src/utilities/updateState";
import type * as core from "../../src/utilities/coreModelInterface";
import type * as coreHelpers from "../../src/utilities/coreModelInterfaceHelpers";
import * as Module_examples from "./utilities/Module_examples";

import Function_declaration from "./components/text_view/Function_declaration.vue";
import * as Structured_view from "./components/structured_view/components";
import Language_version from "./components/text_view/Language_version.vue";
import JSON_object from "./components/text_view/JSON_object.vue";

import type * as Change from "../../src/utilities/Change";
import { get_type_name } from "./utilities/language";
import * as hCoreReflectionInfo from "../../src/utilities/h_core_reflection.json";
import { onThrowError } from "../../src/utilities/errors";

// In order to use the Webview UI Toolkit web components they
// must be registered with the browser (i.e. webview) using the
// syntax below.
provideVSCodeDesignSystem().register(vsCodeButton());

// To register more toolkit components, simply import the component
// registration function and call it from within the register
// function, like so:
//
// provideVSCodeDesignSystem().register(
//   vsCodeButton(),
//   vsCodeCheckbox()
// );
//
// Finally, if you would like to register all of the toolkit
// components at once, there's a handy convenience function:
//
// provideVSCodeDesignSystem().register(allComponents.register());

function handleHowdyClick() {
  vscode.postMessage({
    command: "hello",
    text: "Hey there partner! 🤠",
  });
}

const m_reflectionInfo = { enums: hCoreReflectionInfo.enums, structs: hCoreReflectionInfo.structs };

const m_selectedView = ref<string | null>("module_view");
const m_viewOptions = ref([
  { text: "Module view", value: "module_view" },
  { text: "Function view", value: "function_view" }
]);

const m_selectedFunctionId = ref<number | undefined>(undefined);

const m_selectedFrontendLanguage = ref<string | null>("JSON");
const m_frontendLanguageOptions = ref([
  { text: "JSON", value: "JSON" },
  { text: "C", value: "C" },
]);

interface State {
  module: core.Module | undefined
};

const m_state = ref<State>({ module: undefined });

m_state.value.module = Module_examples.create_default();

function on_message_received(event: MessageEvent): void {
  const messages = event.data;

  for (const message of messages) {
    if (
      message.command === "initialize" ||
      message.command === "update" ||
      message.command === "insert" ||
      message.command === "delete"
    ) {
      const moduleReference = {
        get value() {
          return m_state.value.module;
        },
        set value(value: any) {
          m_state.value.module = value;
        },
      };

      console.log(message);
      updateState(moduleReference, message);
    }
  }
}

window.addEventListener("message", on_message_received);

function on_insert_element(position: any[], value?: any): void {
  vscode.postMessage({
    command: "insert:value",
    data: {
      position: position,
      value: value
    },
  });
}

function on_delete_element(position: any[]): void {
  vscode.postMessage({
    command: "delete:value",
    data: {
      position: position,
    },
  });
}

function on_value_change(position: any[], new_value: any): void {
  vscode.postMessage({
    command: "update:value",
    data: {
      position: position,
      new_value: new_value,
    },
  });
}

function on_variant_type_change(position: any[], new_value: any): void {
  vscode.postMessage({
    command: "update:variant_type",
    data: {
      position: position,
      new_value: new_value,
    },
  });
}

function on_function_name_change(
  index: number,
  function_declaration: any,
  is_export_declaration: boolean,
  new_name: any
): void {
  const functionDeclarationKey = is_export_declaration
    ? "export_declarations"
    : "internal_declarations";
  const position = [functionDeclarationKey, index, "name"];

  vscode.postMessage({
    command: "update:value",
    data: {
      position: position,
      new_value: new_name,
    },
  });
}

function create_module(): void {
  vscode.postMessage({
    command: "create:module",
  });
}

function delete_module(): void {
  vscode.postMessage({
    command: "delete:module",
  });
}

function create_function(index: number, is_export_declaration: boolean): void {
  vscode.postMessage({
    command: "create:function",
    data: {
      function_index: index,
      is_export_declaration: is_export_declaration,
    },
  });
}

function update_function_declaration(function_declaration: core.Function_declaration): void {
  vscode.postMessage({
    command: "update:function_declaration",
    data: {
      function_declaration: JSON.stringify(function_declaration)
    }
  });
}

onMounted(() => { });
</script>

<template>

  <div>

    <nav v-if="m_state.module !== undefined">
      <ul>
        <li>
          <select v-model="m_selectedView">
            <option v-for="option in m_viewOptions" :value="option.value" v-bind:key="option.value">
              {{ option.text }}
            </option>
          </select>
        </li>
        <li v-if="m_selectedView === 'function_view'">
          <select v-model="m_selectedFunctionId">
            <option v-for="declaration in m_state.module.export_declarations.function_declarations.elements"
              :value="declaration.id" v-bind:key="declaration.id">
              {{ declaration.name }}
            </option>
            <option v-for="declaration in m_state.module.internal_declarations.function_declarations.elements"
              :value="declaration.id" v-bind:key="declaration.id">
              {{ declaration.name }}
            </option>
          </select>
        </li>
        <li>
          <select v-model="m_selectedFrontendLanguage">
            <option v-for="option in m_frontendLanguageOptions" :value="option.value" v-bind:key="option.value">
              {{ option.text }}
            </option>
          </select>
        </li>
      </ul>

      <Structured_view.Function_declaration
        v-if="m_selectedView === 'function_view' && m_selectedFunctionId !== undefined" :module="m_state.module"
        :function_id="m_selectedFunctionId"
        v-on:update:function_declaration="function_declaration => update_function_declaration(function_declaration)">
      </Structured_view.Function_declaration>
    </nav>

    <main>

      <Structured_view.Module_declarations_view v-if="m_state.module !== undefined" :module="m_state.module"
        v-on:new_changes="on_new_changes" v-on:update:function_declaration="update_function_declaration">
      </Structured_view.Module_declarations_view>

      <div v-if="m_selectedView === 'module_view'">

        <div v-if="(m_state.module !== undefined) && (m_selectedFrontendLanguage !== 'JSON')">
          <h1>Module {{ m_state.module.name }}</h1>

          <section>
            <h2>Details</h2>
            <ul>
              <li>Language version: <Language_version :value="m_state.module.language_version"></Language_version>
              </li>
            </ul>
          </section>

          <section>
            <h2>Public functions</h2>
            <div
              v-for="(function_declaration, index) in m_state.module.export_declarations.function_declarations.elements"
              v-bind:key="function_declaration.id">
              <Function_declaration :value="function_declaration"
                v-on:update:name="(new_name) => on_function_name_change(index, function_declaration, true, new_name)">
              </Function_declaration>
            </div>
            <p v-if="m_state.module.export_declarations.function_declarations.elements.length === 0">No public functions
            </p>
            <vscode-button
              v-on:click="() => {if(m_state.module !== undefined) create_function(m_state.module.export_declarations.function_declarations.size, true)}">
              Add function</vscode-button>
          </section>

          <section>
            <h2>Private functions</h2>
            <div v-for="function_declaration in m_state.module.internal_declarations.function_declarations.elements"
              v-bind:key="function_declaration.id">
              <Function_declaration :value="function_declaration"></Function_declaration>
            </div>
            <p v-if="m_state.module.internal_declarations.function_declarations.elements.length === 0">No private
              functions</p>
            <vscode-button
              v-on:click="() => {if (m_state.module !== undefined) create_function(m_state.module.export_declarations.function_declarations.size, false)}">
              Add function</vscode-button>
          </section>

          <section>
            <h2>Actions</h2>
            <vscode-button @click="delete_module">Delete module</vscode-button>
          </section>
        </div>

        <div v-if="(m_state.module !== undefined) && (m_selectedFrontendLanguage === 'JSON')">
          <JSON_object :value="m_state.module" :reflection-info="m_reflectionInfo" :reflection-type="{ name: 'Module' }"
            :is-read-only="false" :indentation="0" :indentation_increment="1"
            v-on:insert:value="(position) => on_insert_element(position, undefined)"
            v-on:delete:value="(position) => on_delete_element(position)"
            v-on:update:value="(position, value) => on_value_change(position, value)"
            v-on:update:variant_type="(position, value) => on_variant_type_change(position, value)">
          </JSON_object>

          <section>
            <h2>Actions</h2>
            <vscode-button @click="delete_module">Delete module</vscode-button>
          </section>
        </div>

        <div v-else>
          This file is empty.

          <vscode-button @click="create_module">Create module</vscode-button>
        </div>

      </div>

      <div
        v-if="(m_state.module !== undefined) && (m_selectedView === 'function_view') && (m_selectedFunctionId !== undefined)">
        <!-- TODO -->
      </div>

    </main>
  </div>

</template>

<style>
* {
  font-family: monospace;
}

main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  height: 100%;
}

main>* {
  margin: 1rem 0;
}

nav>ul {
  list-style-type: none;
  padding: 0;
  position: fixed;
  top: 0px;
  right: 10px;
}
</style>
