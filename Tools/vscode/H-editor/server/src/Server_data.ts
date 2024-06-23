import { TextDocument } from 'vscode-languageserver-textdocument';

import * as Document from "@core/Document";
import * as Language from "@core/Language";
import * as Storage_cache from "@core/Storage_cache";

export interface Server_data {
    storage_cache: Storage_cache.Storage_cache;
    language_description: Language.Description;
    documents: Map<string, TextDocument>;
    document_states: Map<string, Document.State>;
}

export function create_server_data(): Server_data {
    const storage_cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const language_description = Language.create_default_description(storage_cache, "out/tests/graphviz.gv");
    const documents = new Map<string, TextDocument>();
    const document_states = new Map<string, Document.State>();

    return {
        storage_cache,
        language_description,
        documents,
        document_states
    };
}
