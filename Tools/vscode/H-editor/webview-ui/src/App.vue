<script setup lang="ts">
import { ref } from "vue";
import { provideVSCodeDesignSystem, vsCodeButton } from "@vscode/webview-ui-toolkit";
import { vscode } from "./utilities/vscode";

import Function_declaration from "./components/Function_declaration.vue"
import Language_version from "./components/Language_version.vue"

import { get_type_name } from "./utilities/language"

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

const m_state = ref<any | null>(null);

m_state.value = {
  "language_version": {
    "major": 1,
    "minor": 2,
    "patch": 3
  },
  "name": "Example",
  "export_declarations": {
    "function_declarations": {
      "size": 1,
      "elements": [
        {
          "id": 0,
          "name": "Add",
          "return_type": {
            "fundamental_type": "int32"
          },
          "parameter_types": {
            "size": 2,
            "elements": [
              {
                "fundamental_type": "int32"
              },
              {
                "fundamental_type": "int32"
              }
            ]
          },
          "parameter_ids": {
            "size": 2,
            "elements": [
              0,
              1
            ]
          },
          "parameter_names": {
            "size": 2,
            "elements": [
              "lhs",
              "rhs"
            ]
          },
          "linkage": "external"
        }
      ]
    }
  },
  "internal_declarations": {
    "function_declarations": {
      "size": 0,
      "elements": []
    }
  },
  "definitions": {
    "function_definitions": {
      "size": 1,
      "elements": [
        {
          "id": 0,
          "statements": {
            "size": 1,
            "elements": [
              {
                "id": 0,
                "name": "var_0",
                "expressions": {
                  "size": 2,
                  "elements": [
                    {
                      "binary_expression": {
                        "left_hand_side": {
                          "type": "function_argument",
                          "id": 0
                        },
                        "right_hand_side": {
                          "type": "function_argument",
                          "id": 1
                        },
                        "operation": "add"
                      }
                    },
                    {
                      "return_expression": {
                        "variable": {
                          "type": "temporary",
                          "id": 0
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  }
};

function on_message_received(event: MessageEvent): void {
  m_state.value = JSON.stringify(event.data, null, 2);
}

window.addEventListener("message", on_message_received);

function on_function_name_change(function_declaration: any, is_export_declaration: boolean, new_name: any): void {
  function_declaration.name = new_name;

  vscode.postMessage({
    command: "update:function_name",
    data: {
      function_id: function_declaration.id,
      is_export_declaration: is_export_declaration,
      new_name: new_name
    }
  });
}
</script>

<template>
  <main v-if="m_state">
    <h1>Module {{ m_state.name }}</h1>

    <section>
      <h2>Details</h2>
      <ul>
        <li>Language version: <Language_version :value="m_state.language_version"></Language_version></li>
      </ul>
    </section>

    <section>
      <h2>Public functions</h2>
      <div v-for="function_declaration in m_state.export_declarations.function_declarations.elements" v-bind:key="function_declaration.id">
        <Function_declaration :value="function_declaration" v-on:update:name="(new_name) => on_function_name_change(function_declaration, true, new_name)"></Function_declaration>
      </div>
      <p v-if="m_state.export_declarations.function_declarations.elements.length === 0">No public functions</p>
    </section>

    <section>
      <h2>Private functions</h2>
      <div v-for="function_declaration in m_state.internal_declarations.function_declarations.elements" v-bind:key="function_declaration.id">
        <Function_declaration :value="function_declaration"></Function_declaration>
      </div>
      <p v-if="m_state.internal_declarations.function_declarations.elements.length === 0">No private functions</p>
    </section>

    <pre>{{m_state}}</pre>
  </main>
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

main > * {
  margin: 1rem 0;
}
</style>
