<script setup lang="ts">
import { onMounted, ref } from "vue";
import { provideVSCodeDesignSystem, vsCodeButton } from "@vscode/webview-ui-toolkit";
import { vscode } from "./utilities/vscode";
import { updateState } from "../../src/utilities/updateState";
import type * as core from "../../src/utilities/coreModelInterface";

import Function_declaration from "./components/Function_declaration.vue";
import Function_parameters from "./components/Function_parameters.vue";
import Language_version from "./components/Language_version.vue";
import JSON_object from "./components/JSON_object.vue";

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

const m_state = ref<core.Module | null>(null);

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

/*m_state.value = {
  language_version: { major: 1, minor: 2, patch: 3 },
  name: "module_name",
  export_declarations: {
    alias_type_declarations: {
      size: 0,
      elements: []
    },
    enum_declarations: {
      size: 0,
      elements: []
    },
    struct_declarations: {
      size: 0,
      elements: []
    },
    function_declarations: {
      size: 1,
      elements: [
        {
          id: 0,
          name: "Add",
          type: {
            return_types: {
              size: 1,
              elements: [{ data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } }],
            },
            parameter_types: {
              size: 2,
              elements: [
                { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
              ],
            },
            is_variadic: false,
          },
          parameter_ids: { size: 2, elements: [0, 1] },
          parameter_names: { size: 2, elements: ["lhs", "rhs"] },
          linkage: core.Linkage.External,
        },
      ],
    },
  },
  internal_declarations: {
    alias_type_declarations: {
      size: 0,
      elements: []
    },
    enum_declarations: {
      size: 0,
      elements: []
    },
    struct_declarations: {
      size: 0,
      elements: []
    },
    function_declarations: {
      size: 0,
      elements: []
    }
  },
  next_unique_id: 1,
  definitions: {
    function_definitions: {
      size: 1,
      elements: [
        {
          id: 0,
          statements: {
            size: 1,
            elements: [
              {
                id: 0,
                name: "var_0",
                expressions: {
                  size: 2,
                  elements: [
                    {
                      data: {
                        type: core.Expression_enum.Binary_expression,
                        value: {
                          left_hand_side: { type: core.Variable_expression_type.Function_argument, id: 0 },
                          right_hand_side: { type: core.Variable_expression_type.Function_argument, id: 1 },
                          operation: core.Binary_operation.Add,
                        },
                      },
                    },
                    {
                      data: {
                        type: core.Expression_enum.Return_expression,
                        value: { variable: { type: core.Variable_expression_type.Temporary, id: 0 } },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
};*/

function get_module(): core.Module {
  if (m_state.value !== null) {
    const module: core.Module = m_state.value;
    return module;
  }

  const message = "get_module(): m_state is null!";
  onThrowError(message);
  throw Error(message);
}

function on_message_received(event: MessageEvent): void {
  const messages = event.data;

  for (const message of messages) {
    if (
      message.command === "initialize" ||
      message.command === "update" ||
      message.command === "insert" ||
      message.command === "delete"
    ) {
      const stateReference = {
        get value() {
          return m_state.value;
        },
        set value(value: any) {
          m_state.value = value;
        },
      };

      console.log(message);
      updateState(stateReference, message);
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

onMounted(() => { });
</script>

<template>

  <div>

    <nav>
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
            <option v-for="declaration in m_state?.export_declarations.function_declarations.elements"
              :value="declaration.id" v-bind:key="declaration.id">
              {{ declaration.name }}
            </option>
            <option v-for="declaration in m_state?.internal_declarations.function_declarations.elements"
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

      <Function_parameters v-if="m_selectedView === 'function_view' && m_selectedFunctionId !== undefined"
        :module="get_module()" :function_id="m_selectedFunctionId">
      </Function_parameters>
    </nav>

    <main>

      <div v-if="m_state && m_selectedView === 'module_view'">

        <div v-if="m_state && (m_selectedFrontendLanguage !== 'JSON')">
          <h1>Module {{ m_state.name }}</h1>

          <section>
            <h2>Details</h2>
            <ul>
              <li>Language version: <Language_version :value="m_state.language_version"></Language_version>
              </li>
            </ul>
          </section>

          <section>
            <h2>Public functions</h2>
            <div v-for="(function_declaration, index) in m_state.export_declarations.function_declarations.elements"
              v-bind:key="function_declaration.id">
              <Function_declaration :value="function_declaration"
                v-on:update:name="(new_name) => on_function_name_change(index, function_declaration, true, new_name)">
              </Function_declaration>
            </div>
            <p v-if="m_state.export_declarations.function_declarations.elements.length === 0">No public functions</p>
            <vscode-button @click="create_function(m_state.export_declarations.function_declarations.size, true)">Add
              function</vscode-button>
          </section>

          <section>
            <h2>Private functions</h2>
            <div v-for="function_declaration in m_state.internal_declarations.function_declarations.elements"
              v-bind:key="function_declaration.id">
              <Function_declaration :value="function_declaration"></Function_declaration>
            </div>
            <p v-if="m_state.internal_declarations.function_declarations.elements.length === 0">No private functions</p>
            <vscode-button @click="create_function(m_state.export_declarations.function_declarations.size, false)">Add
              function</vscode-button>
          </section>

          <section>
            <h2>Actions</h2>
            <vscode-button @click="delete_module">Delete module</vscode-button>
          </section>
        </div>

        <div v-if="m_state && (m_selectedFrontendLanguage === 'JSON')">
          <JSON_object :value="m_state" :reflection-info="m_reflectionInfo" :reflection-type="{ name: 'Module' }"
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

      <div v-if="m_state && m_selectedView === 'function_view' && m_selectedFunction !== undefined">
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
