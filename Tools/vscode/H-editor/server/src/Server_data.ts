import { TextDocument } from 'vscode-languageserver-textdocument';

import * as Build from "@core/Build";
import * as Document from "@core/Document";
import * as Language from "@core/Language";
import * as Storage_cache from "@core/Storage_cache";

export interface Server_data {
    storage_cache: Storage_cache.Storage_cache;
    language_description: Language.Description;
    documents: Map<string, TextDocument>;
    document_states: Map<string, Document.State>;
    artifacts: Build.Artifact[];
    artifact_to_source_files_map: Map<string, Build.Source_file_info[]>;
    repositories: Build.Repository[];
}

export function create_server_data(): Server_data {
    const storage_cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const language_description = Language.create_default_description(storage_cache, "out/tests/graphviz.gv");
    const documents = new Map<string, TextDocument>();
    const document_states = new Map<string, Document.State>();
    const artifacts: Build.Artifact[] = [];
    const artifact_to_source_files_map = new Map<string, Build.Source_file_info[]>();
    const repositories: Build.Repository[] = [];

    return {
        storage_cache,
        language_description,
        documents,
        document_states,
        artifacts,
        artifact_to_source_files_map,
        repositories
    };
}
