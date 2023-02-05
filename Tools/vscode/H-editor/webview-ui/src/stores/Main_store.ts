import { defineStore } from "pinia";
import { ref } from "vue";

import * as Abstract_syntax_tree_helpers from "../utilities/Abstract_syntax_tree_helpers";
import * as Module_examples from "../utilities/Module_examples";

export const use_main_store = defineStore('main', () => {
    const empty_module = Module_examples.create_empty();
    const module = ref(empty_module);
    const module_abstract_syntax_tree = ref(Abstract_syntax_tree_helpers.create_module_code_tree(module.value));

    return { module, module_abstract_syntax_tree };
})
