import * as fs from "fs";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as vscode_uri from "vscode-uri";

import * as Project from "./Project";

import * as Core from "../../core/src/Core_intermediate_representation";
import * as Document from "../../core/src/Document";
import * as Language from "../../core/src/Language";
import * as Parse_tree_convertor from "../../core/src/Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "../../core/src/Parse_tree_convertor_mappings";
import * as Parser_node from "../../core/src/Parser_node";
import * as Storage_cache from "../../core/src/Storage_cache";
import * as Tree_sitter_parser from "../../core/src/Tree_sitter_parser";


export interface Server_data {
    storage_cache: Storage_cache.Storage_cache;
    parser: Tree_sitter_parser.Parser;
    mappings: Parse_tree_convertor.Parse_tree_mappings;
    documents: Map<string, TextDocument>;
    document_states: Map<string, Document.State>;
    core_modules_with_source_locations: Map<string, Core.Module>;
    cached_core_trees: Map<string, Parser_node.Node>;
    projects: Map<string, Project.Project_data>;
    initialize_promise: Promise<void> | undefined;
}

export async function create_server_data(): Promise<Server_data> {
    const storage_cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");
    const parser = await Tree_sitter_parser.create_parser();
    const mappings = Parse_tree_convertor_mappings.create_mapping();
    const documents = new Map<string, TextDocument>();
    const document_states = new Map<string, Document.State>();
    const core_modules_with_source_locations = new Map<string, Core.Module>();
    const cached_core_trees = new Map<string, Parser_node.Node>();
    const projects = new Map<string, Project.Project_data>();
    const initialize_promise = undefined;

    return {
        storage_cache,
        parser,
        mappings,
        documents,
        document_states,
        core_modules_with_source_locations,
        cached_core_trees,
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

export async function get_parse_tree(
    server_data: Server_data,
    workspace_folder_uri: string | undefined,
    module_name: string
): Promise<{ root: Parser_node.Node, source_file_path: string } | undefined> {

    {
        const document_state_and_uri = get_document_state(server_data, module_name);
        if (document_state_and_uri !== undefined) {
            const { document_uri, document_state } = document_state_and_uri;
            const document_file_path = document_state.document_file_path;

            {
                const cached_core_tree = server_data.cached_core_trees.get(document_uri);
                if (cached_core_tree !== undefined) {
                    return { root: cached_core_tree, source_file_path: document_file_path };
                }
            }

            const input_text = Document.get_text(document_state);
            const tree = Tree_sitter_parser.parse(server_data.parser, input_text);
            const core_tree = Tree_sitter_parser.to_parser_node(tree.rootNode, true);
            if (core_tree !== undefined) {
                server_data.cached_core_trees.set(document_uri, core_tree);
                return { root: core_tree, source_file_path: document_file_path };
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

    return {
        root: parse_result.core_tree,
        source_file_path: parse_result.core_tree_file_path
    };
}

export async function get_core_module(
    server_data: Server_data,
    workspace_folder_uri: string | undefined,
    module_name: string
): Promise<Core.Module | undefined> {
    const { root, source_file_path } = await get_parse_tree(server_data, workspace_folder_uri, module_name);
    const core_module = Parse_tree_convertor.parse_tree_to_module(root, server_data.mappings);
    core_module.source_file_path = source_file_path;
    return core_module;
}

export async function parse_source_file_and_write_to_disk_if_needed(
    server_data: Server_data,
    workspace_folder_uri: string,
    project: Project.Project_data,
    module_name: string,
    source_file_path: string
): Promise<{ core_tree: Parser_node.Node, core_tree_file_path: string } | undefined> {

    const artifact = Project.get_artifact_of_module(project, module_name);

    const core_tree_file_path = Project.map_module_name_to_parsed_file_path(workspace_folder_uri, artifact, module_name, ".generated.tree");
    if (core_tree_file_path === undefined) {
        return undefined;
    }

    if (fs.existsSync(core_tree_file_path)) {
        const core_tree_file_stat = fs.statSync(core_tree_file_path);
        const source_file_stat = fs.statSync(source_file_path);

        if (core_tree_file_stat.mtime > source_file_stat.mtime) {
            try {
                console.log(`Try to read cached core tree file: ${core_tree_file_path}`);

                const core_tree = Project.read_core_tree_file(core_tree_file_path);
                if (core_tree !== undefined) {
                    return { core_tree: core_tree, core_tree_file_path: core_tree_file_path };
                }
            }
            catch (error) {
            }

            console.log(`Failed to read cached core tree file: ${core_tree_file_path}`);
        }
    }

    const intermediate_file_path = Project.map_module_name_to_parsed_file_path(workspace_folder_uri, artifact, module_name, ".generated.hl");
    if (intermediate_file_path === undefined) {
        return undefined;
    }

    console.log(`Parse source file: ${source_file_path}`);
    const core_tree = await Project.parse_source_file_and_write_to_disk_2(
        module_name,
        source_file_path,
        artifact,
        server_data.parser,
        intermediate_file_path,
        core_tree_file_path,
        project.hlang_executable
    );
    if (core_tree === undefined) {
        console.log(`Failed to parse source file: ${source_file_path}`);
        return undefined;
    }
    console.log(`Generated core tree file: ${core_tree_file_path}`);

    return { core_tree: core_tree, core_tree_file_path: core_tree_file_path };
}

export function create_get_core_module(
    server_data: Server_data,
    workspace_folder_uri: string | undefined
): (module_name: string) => Promise<Core.Module | undefined> {
    return (module_name: string): Promise<Core.Module | undefined> => {
        return get_core_module(server_data, workspace_folder_uri, module_name);
    };
}

export function create_get_parse_tree(
    server_data: Server_data,
    workspace_folder_uri: string | undefined
): (module_name: string) => Promise<Parser_node.Node | undefined> {
    return (module_name: string): Promise<Parser_node.Node | undefined> => {
        return get_parse_tree(server_data, workspace_folder_uri, module_name).then(
            result => result.root
        );
    };
}
