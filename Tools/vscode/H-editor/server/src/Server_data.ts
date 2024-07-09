import * as fs from "fs";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Project from "./Project";

import * as Core from "@core/Core_intermediate_representation";
import * as Document from "@core/Document";
import * as Language from "@core/Language";
import * as Storage_cache from "@core/Storage_cache";

export interface Server_data {
    storage_cache: Storage_cache.Storage_cache;
    language_description: Language.Description;
    documents: Map<string, TextDocument>;
    document_states: Map<string, Document.State>;
    projects: Map<string, Project.Project_data>;
}

export function create_server_data(): Server_data {
    const storage_cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const language_description = Language.create_default_description(storage_cache, "out/tests/graphviz.gv");
    const documents = new Map<string, TextDocument>();
    const document_states = new Map<string, Document.State>();
    const projects = new Map<string, Project.Project_data>();

    return {
        storage_cache,
        language_description,
        documents,
        document_states,
        projects
    };
}

export async function get_core_module(
    server_data: Server_data,
    workspace_folder_uri: string | undefined,
    module_name: string
): Promise<Core.Module | undefined> {

    {
        const document_state = server_data.document_states.get(module_name);
        if (document_state !== undefined) {
            return document_state.module;
        }
    }

    if (workspace_folder_uri === undefined) {
        return undefined;
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

    if (fs.existsSync(parsed_file_path)) {
        const parsed_file_stat = fs.statSync(parsed_file_path);
        const source_file_stat = fs.statSync(source_file.file_path);

        if (parsed_file_stat.mtime > source_file_stat.mtime) {
            return Project.read_parsed_file(parsed_file_path);
        }
    }

    const core_module = await Project.parse_source_file_and_write_to_disk(
        module_name,
        source_file.file_path,
        server_data.language_description,
        parsed_file_path,
        project.hlang_executable
    );

    return core_module;
}
