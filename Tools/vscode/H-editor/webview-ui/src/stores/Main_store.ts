import { defineStore } from "pinia";
import { ref } from "vue";

import * as Abstract_syntax_tree_helpers from "../utilities/Abstract_syntax_tree_helpers";
import * as Module_examples from "../../../src/core/Module_examples";
import * as Symbol_database from "../../../src/core/Symbol_database";

export const use_main_store = defineStore('main', () => {
    const empty_module = Module_examples.create_empty();
    const module = ref(empty_module);
    const symbol_database = ref(Symbol_database.create_edit_database(module.value));
    const module_abstract_syntax_tree = ref(Abstract_syntax_tree_helpers.create_module_code_tree(module.value));

    return { module, symbol_database, module_abstract_syntax_tree };
})
