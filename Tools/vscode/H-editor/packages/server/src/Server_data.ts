import * as fs from "fs";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Project from "./Project";

import * as Core from "../../core/src/Core_intermediate_representation";
import * as Document from "../../core/src/Document";
import * as Language from "../../core/src/Language";
import * as Storage_cache from "../../core/src/Storage_cache";
import * as Text_change from "../../core/src/Text_change";

export interface Server_data {
    storage_cache: Storage_cache.Storage_cache;
    language_description: Language.Description;
    documents: Map<string, TextDocument>;
    document_states: Map<string, Document.State>;
    core_modules_with_source_locations: Map<string, Core.Module>;
    projects: Map<string, Project.Project_data>;
    initialize_promise: Promise<void> | undefined;
}

export function create_server_data(): Server_data {
    const storage_cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const language_description = Language.create_default_description(storage_cache, "out/tests/graphviz.gv");
    const documents = new Map<string, TextDocument>();
    const document_states = new Map<string, Document.State>();
    const core_modules_with_source_locations = new Map<string, Core.Module>();
    const projects = new Map<string, Project.Project_data>();
    const initialize_promise = undefined;

    return {
        storage_cache,
        language_description,
        documents,
        document_states,
        core_modules_with_source_locations,
        projects,
        initialize_promise
    };
}

export function get_document_state(
    server_data: Server_data,
    module_name: string
): { document_uri: string, document_state: Document.State } | undefined {
    for (const [document_uri, document_state] of server_data.document_states) {
        if (Document.get_module(document_state).name === module_name) {
            return { document_uri: document_uri, document_state: document_state };
        }
    }

    return undefined;
}

export async function get_core_module(
    server_data: Server_data,
    workspace_folder_uri: string | undefined,
    module_name: string
): Promise<Core.Module | undefined> {

    {
        const document_state_and_uri = get_document_state(server_data, module_name);
        if (document_state_and_uri !== undefined) {
            const { document_uri, document_state } = document_state_and_uri;

            {
                const core_module_with_source_location = server_data.core_modules_with_source_locations.get(document_uri);
                if (core_module_with_source_location !== undefined) {
                    return core_module_with_source_location;
                }
            }

            const core_module_with_source_location = Text_change.full_parse_with_source_locations(
                server_data.language_description,
                document_state.document_file_path,
                Document.get_text(document_state)
            );
            if (core_module_with_source_location !== undefined) {
                if (core_module_with_source_location.module !== undefined) {
                    server_data.core_modules_with_source_locations.set(document_uri, core_module_with_source_location.module);
                }
                return core_module_with_source_location.module;
            }
        }
    }

    if (workspace_folder_uri === undefined) {
        return undefined;
    }

    if (server_data.initialize_promise !== undefined) {
        await server_data.initialize_promise;
    }

    const project = server_data.projects.get(workspace_folder_uri);
    if (project === undefined) {
        return undefined;
    }

    const artifact = Project.get_artifact_of_module(project, module_name);
    if (artifact === undefined) {
        return undefined;
    }

    const parsed_file_path = Project.map_module_name_to_parsed_file_path(workspace_folder_uri, artifact, module_name);
    if (parsed_file_path === undefined) {
        return undefined;
    }

    const source_files = project.artifact_to_source_files_map.get(artifact.name);
    if (source_files === undefined) {
        return undefined;
    }

    const source_file = source_files.find(source_file => source_file.module_name === module_name);
    if (source_file === undefined) {
        return undefined;
    }

    const parse_result = await parse_source_file_and_write_to_disk_if_needed(server_data, workspace_folder_uri, project, module_name, source_file.file_path);
    if (parse_result === undefined) {
        return undefined;
    }

    return parse_result.core_module;
}

export async function parse_source_file_and_write_to_disk_if_needed(
    server_data: Server_data,
    workspace_folder_uri: string,
    project: Project.Project_data,
    module_name: string,
    source_file_path: string
): Promise<{ core_module: Core.Module, parsed_file_path: string } | undefined> {

    const artifact = Project.get_artifact_of_module(project, module_name);

    const parsed_file_path = Project.map_module_name_to_parsed_file_path(workspace_folder_uri, artifact, module_name);
    if (parsed_file_path === undefined) {
        return undefined;
    }

    if (fs.existsSync(parsed_file_path)) {
        const parsed_file_stat = fs.statSync(parsed_file_path);
        const source_file_stat = fs.statSync(source_file_path);

        if (parsed_file_stat.mtime > source_file_stat.mtime) {
            const core_module = Project.read_parsed_file(parsed_file_path);
            if (core_module === undefined) {
                return undefined;
            }

            return { core_module: core_module, parsed_file_path: parsed_file_path };
        }
    }

    const core_module = await Project.parse_source_file_and_write_to_disk(
        module_name,
        source_file_path,
        artifact,
        server_data.language_description,
        parsed_file_path,
        project.hlang_executable
    );
    if (core_module === undefined) {
        return undefined;
    }

    return { core_module: core_module, parsed_file_path: parsed_file_path };
}

export function create_get_core_module(
    server_data: Server_data,
    workspace_folder_uri: string | undefined
): (module_name: string) => Promise<Core.Module | undefined> {
    return (module_name: string): Promise<Core.Module | undefined> => {
        return get_core_module(server_data, workspace_folder_uri, module_name);
    };
}
