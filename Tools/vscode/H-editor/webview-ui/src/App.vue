<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
import * as Nodes from "./components/structured_view/nodes/components";
import * as Node_update from "./components/structured_view/nodes/Node_update";

import type * as Change from "../../src/utilities/Change";
import * as Change_Update from "../../src/utilities/Change_update";
import * as Abstract_syntax_tree_helpers from "./utilities/Abstract_syntax_tree_helpers";
import * as Abstract_syntax_tree_update from "./utilities/Abstract_syntax_tree_update";
import { get_type_name } from "./utilities/language";
import * as hCoreReflectionInfo from "../../src/utilities/h_core_reflection.json";
import { onThrowError } from "../../src/utilities/errors";
import { use_main_store } from "./stores/Main_store";

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

const m_main_store = use_main_store();

const module = computed(() => m_main_store.module);
const module_abstract_syntax_tree = computed(() => m_main_store.module_abstract_syntax_tree);

if (g_webview_only) {
  m_main_store.module = Module_examples.create_default();
  m_main_store.module_abstract_syntax_tree = Abstract_syntax_tree_helpers.create_module_code_tree(m_main_store.module);
}

function update_store_with_new_changes(new_changes: Change.Hierarchy[]): void {
  const module_reference = {
    get value() {
      return m_main_store.module;
    },
    set value(value: any) {
      m_main_store.module = value;
    },
  };

  const module_node_tree_reference = {
    get value() {
      return m_main_store.module_abstract_syntax_tree;
    },
    set value(value: any) {
      m_main_store.module_abstract_syntax_tree = value;
    },
  };

  for (const change of new_changes) {
    Change_Update.update_object_with_change(module_reference, change, []);
    Abstract_syntax_tree_update.update_module_node_tree(m_main_store.module, module_node_tree_reference, change);
  }
}

function on_message_received(event: MessageEvent): void {
  const messages = event.data;

  for (const message of messages) {

    console.log(message);

    if (message.command === "new_changes") {
      const new_changes: Change.Hierarchy[] = message.data.changes;
      update_store_with_new_changes(new_changes);
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

  if (g_webview_only) {
    console.log([new_changes]);
    update_store_with_new_changes([new_changes]);
  }
}

onMounted(() => { });

function get_child_node(node: Abstract_syntax_tree_helpers.Node, indices: number[]): Abstract_syntax_tree_helpers.Node {

  if (indices.length === 0) {
    return node;
  }

  const child_index = indices[0];

  if (node.data_type === Abstract_syntax_tree_helpers.Node_data_type.Collapsible) {
    const data = node.data as Abstract_syntax_tree_helpers.Collapsible_data;
    return data.elements[child_index];
  }
  else if (node.data_type === Abstract_syntax_tree_helpers.Node_data_type.List) {
    const data = node.data as Abstract_syntax_tree_helpers.List_data;
    return data.elements[child_index];
  }
  else {
    const message = "Trying to get child on leaf node!";
    onThrowError(message);
    throw Error(message);
  }
}

function on_node_tree_update(data: Node_update.Update): void {
  if (data.type === Node_update.Update_type.Open_collapsible) {
    const node_tree = m_main_store.module_abstract_syntax_tree;
    const child_node = get_child_node(node_tree, data.indices);

    if (child_node.data_type !== Abstract_syntax_tree_helpers.Node_data_type.Collapsible) {
      const message = "Trying to update non-collapsible node!";
      onThrowError(message);
      throw Error(message);
    }

    const collapsible_node_data = child_node.data as Abstract_syntax_tree_helpers.Collapsible_data;
    const collapsible_update_data = data.data as Node_update.Open_collapsible_update;
    collapsible_node_data.is_open = collapsible_update_data.value;
  }
}

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
            <option v-for="declaration in module.export_declarations.function_declarations.elements"
              :value="declaration.id" v-bind:key="declaration.id">
              {{ declaration.name }}
            </option>
            <option v-for="declaration in module.internal_declarations.function_declarations.elements"
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

        <div>
          <Nodes.Node :node="module_abstract_syntax_tree" v-on:update="on_node_tree_update">
          </Nodes.Node>
        </div>

        <!--<div>
          <Structured_view.Module_view :module="module" :module_node_tree="module_abstract_syntax_tree"
            :declarations="Declarations.get_all_items(module)" v-on:new_changes="on_new_changes">
          </Structured_view.Module_view>
        </div>-->

        <!--<div>
          <Structured_view.Module_declarations_view :module="module" v-on:new_changes="on_new_changes">
          </Structured_view.Module_declarations_view>
        </div>-->

        <div v-if="m_selectedFrontendLanguage === 'JSON'">
          <JSON_object :value="module" :reflection_info="m_reflectionInfo" :reflection_type="{ name: 'Module' }"
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

      <div v-if="(m_selectedView === 'function_view') && (m_selectedFunctionId !== undefined)">
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
