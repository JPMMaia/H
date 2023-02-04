<script setup lang="ts">
import { onMounted, ref } from "vue";
import { provideVSCodeDesignSystem, vsCodeButton } from "@vscode/webview-ui-toolkit";
import { vscode } from "./utilities/vscode";
import { update_object_with_change } from "../../src/utilities/Change_update";
import type * as core from "../../src/utilities/coreModelInterface";
import type * as coreHelpers from "../../src/utilities/coreModelInterfaceHelpers";
import * as Module_examples from "./utilities/Module_examples";

import Function_declaration from "./components/text_view/Function_declaration.vue";
import * as Structured_view from "./components/structured_view/components";
import Language_version from "./components/text_view/Language_version.vue";
import JSON_object from "./components/text_view/JSON_object.vue";
import * as Declarations from "./components/structured_view/Declaration_helpers";

import type * as Change from "../../src/utilities/Change";
import * as Change_Update from "../../src/utilities/Change_update";
import type * as Abstract_syntax_tree_helpers from "./utilities/Abstract_syntax_tree_helpers";
import * as Abstract_syntax_tree_update from "./utilities/Abstract_syntax_tree_update";
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

const g_webview_only = true;

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
  module: core.Module | undefined;
  module_node_tree: Abstract_syntax_tree_helpers.Node | undefined;
};

const m_state = ref<State>(
  {
    module: undefined,
    module_node_tree: undefined
  }
);

if (g_webview_only) {
  m_state.value.module = Module_examples.create_default();
}

function update_state_with_new_changes(new_changes: Change.Hierarchy[]): void {
  const module_reference = {
    get value() {
      return m_state.value.module;
    },
    set value(value: any) {
      m_state.value.module = value;
    },
  };

  const module_node_tree_reference = {
    get value() {
      return m_state.value.module_node_tree;
    },
    set value(value: any) {
      m_state.value.module_node_tree = value;
    },
  };

  for (const change of new_changes) {
    Change_Update.update_object_with_change(module_reference, change, []);

    if (m_state.value.module !== undefined) {
      Abstract_syntax_tree_update.update_module_node_tree(m_state.value.module, module_node_tree_reference, change);
    }
  }
}

function on_message_received(event: MessageEvent): void {
  const messages = event.data;

  for (const message of messages) {

    console.log(message);

    if (message.command === "new_changes") {
      const new_changes: Change.Hierarchy[] = message.data.changes;
      update_state_with_new_changes(new_changes);
    }
  }
}

window.addEventListener("message", on_message_received);

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

function on_new_changes(new_changes: Change.Hierarchy): void {
  vscode.postMessage({
    command: "new_changes",
    data: {
      new_changes: JSON.stringify(new_changes)
    }
  });

  if (g_webview_only && m_state.value.module !== undefined) {
    console.log([new_changes]);
    update_state_with_new_changes([new_changes]);
  }
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
    </nav>

    <main>

      <div v-if="m_selectedView === 'module_view'">

        <div v-if="m_state.module !== undefined && m_state.module_node_tree !== undefined">
          <Structured_view.Module_view v-if="m_state.module !== undefined" :module="m_state.module"
            :module_node_tree="m_state.module_node_tree" :declarations="Declarations.get_all_items(m_state.module)"
            v-on:new_changes="on_new_changes">
          </Structured_view.Module_view>
        </div>

        <div v-if="(m_state.module !== undefined)">
          <Structured_view.Module_declarations_view v-if="m_state.module !== undefined" :module="m_state.module"
            v-on:new_changes="on_new_changes">
          </Structured_view.Module_declarations_view>
        </div>

        <div v-if="(m_state.module !== undefined) && (m_selectedFrontendLanguage === 'JSON')">
          <JSON_object :value="m_state.module" :reflection_info="m_reflectionInfo" :reflection_type="{ name: 'Module' }"
            :is_read_only="false" :indentation="4" :add_comma="false" v-on:new_changes="on_new_changes">
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
