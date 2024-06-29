import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import * as vscode_uri from "vscode-uri";

import * as Build from "@core/Build";
import * as Core from "@core/Core_intermediate_representation";
import * as Core_file from "@core/Core_interface";
import * as Document from "@core/Document";
import * as Grammar from "@core/Grammar";
import * as Language from "@core/Language";
import * as Scanner from "@core/Scanner";
import * as Text_change from "@core/Text_change";

export interface Project_data {
    hlang_executable: string | undefined;
    repositories: Build.Repository[];
    artifacts: Map<string, Build.Artifact>;
    artifact_to_source_files_map: Map<string, Build.Source_file_info[]>;
}

export async function create_project_data(
    hlang_executable: string | undefined,
    root_path: string,
    repository_paths: string[],
    header_search_paths: string[]
): Promise<Project_data> {

    const repositories = read_repositories(repository_paths);
    const artifacts = read_artifacts(root_path, repositories);
    const artifact_to_source_files_map = await create_artifact_to_source_files(artifacts, header_search_paths);

    return {
        hlang_executable: hlang_executable,
        repositories: repositories,
        artifacts: artifacts,
        artifact_to_source_files_map: artifact_to_source_files_map,
    };
}

function read_repositories(
    repository_paths: string[]
): Build.Repository[] {

    const repositories = repository_paths.map(file_path => {
        const data = fs.readFileSync(file_path, "utf-8");
        const json_data = JSON.parse(data);
        json_data.file_path = file_path;

        const artifact_to_location = new Map<string, string>();
        if (json_data.artifacts !== undefined) {
            for (const pair of json_data.artifacts) {
                artifact_to_location.set(pair.name, pair.location);
            }
        }
        delete json_data.artifacts;
        json_data.artifact_to_location = artifact_to_location;

        return json_data as Build.Repository;
    });

    return repositories;
}

function read_artifacts(
    root_path: string,
    repositories: Build.Repository[]
): Map<string, Build.Artifact> {

    const all_file_paths = read_files_recursively(root_path);

    const artifact_file_paths = all_file_paths.filter(file_path => path.basename(file_path) === "hlang_artifact.json");

    const map = new Map<string, Build.Artifact>();

    for (const file_path of artifact_file_paths) {
        const artifact = read_artifact(file_path);
        map.set(artifact.name, artifact);
    }

    for (const artifact of map.values()) {
        const artifact_name = artifact.name;

        for (const dependency of artifact.dependencies) {
            if (!map.has(dependency.name)) {
                const file_path = find_artifact_file_path(repositories, dependency.name);
                if (file_path === undefined) {
                    console.log(`Could not find artifact '${dependency.name}' which is a dependency of '${artifact_name}'.`);
                    continue;
                }
                const artifact = read_artifact(file_path);
                map.set(artifact.name, artifact);
            }
        }
    }

    return map;
}

function read_artifact(file_path: string): Build.Artifact {
    const data = fs.readFileSync(file_path, "utf-8");
    const json_data = JSON.parse(data);
    json_data.file_path = file_path;
    if (json_data.dependencies === undefined) {
        json_data.dependencies = [];
    }
    const artifact = json_data as Build.Artifact;
    return artifact;
}

function find_artifact_file_path(
    repositories: Build.Repository[],
    artifact_name: string
): string | undefined {

    for (const repository of repositories) {
        const location = repository.artifact_to_location.get(artifact_name);
        if (location !== undefined) {
            const file_path = path.resolve(path.dirname(repository.file_path), location);
            return file_path;
        }
    }

    return undefined;
}

async function create_artifact_to_source_files(
    artifacts: Map<string, Build.Artifact>,
    header_search_paths: string[]
): Promise<Map<string, Build.Source_file_info[]>> {

    const map = new Map<string, Build.Source_file_info[]>();

    for (const artifact of artifacts.values()) {
        const included_files: Build.Source_file_info[] = [];

        if (artifact.library !== undefined) {
            for (const c_header of artifact.library.c_headers) {
                const search_paths = [path.dirname(artifact.file_path), ...header_search_paths];

                const header_file_path = find_file(c_header.header, search_paths);
                if (header_file_path === undefined) {
                    console.log(`Could not find C header '${c_header.header} of artifact '${artifact.name} (${artifact.file_path}).`);
                    continue;
                }

                included_files.push({
                    file_path: header_file_path,
                    module_name: c_header.name
                });
            }
        }
        else if (artifact.executable !== undefined) {
            const file_paths = get_included_files(path.dirname(artifact.file_path), artifact.executable.include);

            const included_source_files = await Promise.all(
                file_paths.map(async file_path => {
                    const module_name = await read_module_name(file_path);
                    return {
                        file_path: file_path,
                        module_name: module_name
                    };
                })
            );

            included_files.push(...included_source_files);
        }

        map.set(artifact.name, included_files);
    }

    return map;
}

export function get_artifact_of_module(
    project_data: Project_data,
    module_name: string
): Build.Artifact | undefined {

    for (const pair of project_data.artifact_to_source_files_map) {
        for (const source_file of pair[1]) {
            if (source_file.module_name === module_name) {
                const artifact_name = pair[0];
                return project_data.artifacts.get(artifact_name);
            }
        }
    }

    return undefined;
}

export function get_artifact_of_document(
    project_data: Project_data,
    document_uri: string
): Build.Artifact | undefined {

    const document_file_path = vscode_uri.URI.parse(document_uri).fsPath;

    for (const pair of project_data.artifact_to_source_files_map) {
        for (const source_file of pair[1]) {
            if (source_file.file_path === document_file_path) {
                const artifact_name = pair[0];
                return project_data.artifacts.get(artifact_name);
            }
        }
    }

    return undefined;
}

const ignore_directory_list: string[] = [
    ".vscode",
    "build",
    "out"
];

function get_included_files(
    root_path: string,
    include_patterns: string[]
): string[] {

    const file_paths: string[] = [];

    for (const include_pattern of include_patterns) {
        const included_files = glob.sync(include_pattern, { cwd: root_path })
            .map(file_path => path.resolve(root_path, file_path));

        file_paths.push(...included_files);
    }

    return file_paths;
}

function read_files_recursively(
    directory: string,
    file_list: string[] = []
): string[] {
    const files = fs.readdirSync(directory);

    files.forEach(file => {
        const file_path = path.join(directory, file);
        const stat = fs.statSync(file_path);

        if (stat.isDirectory()) {
            const directory_name = path.basename(file_path);
            if (ignore_directory_list.find(value => value === directory_name) !== undefined) {
                return;
            }

            read_files_recursively(file_path, file_list);
        } else {
            file_list.push(file_path);
        }
    });

    return file_list;
}

function read_module_name(file_path: string): Promise<string> {
    return new Promise((resolve, reject) => {

        if (!fs.existsSync(file_path)) {
            return reject(`File '${file_path}' does not exist!`);
        }

        const file_descriptor = fs.openSync(file_path, "r");

        const buffer = Buffer.alloc(256);

        const bytes_read = fs.readSync(file_descriptor, buffer, 0, 256, 0);
        if (bytes_read <= 0) {
            reject(`Could not read module name of '${file_path}'!`);
        }

        const content = buffer.toString('utf-8', 0, bytes_read);

        const module_name = read_module_name_from_string(content);
        if (module_name !== undefined) {
            resolve(module_name);
        }
        else {
            reject(`Could not read module name of '${file_path}'!`);
        }
    });
}

function read_module_name_from_string(
    content: string
): string | undefined {

    let current_offset = 0;

    const dummy_source_location = { line: 1, column: 1 };

    while (current_offset < content.length) {

        let word_scan_result = Scanner.scan_word(content, current_offset, dummy_source_location);
        current_offset += word_scan_result.processed_characters;

        while (word_scan_result.type === Grammar.Word_type.Comment) {
            const word_scan_result = Scanner.scan_word(content, current_offset, dummy_source_location);
            current_offset += word_scan_result.processed_characters;
        }

        if (word_scan_result.word === "module") {

            let module_name_components: string[] = [];

            let scan_result = Scanner.scan_word(content, current_offset, dummy_source_location);
            current_offset += scan_result.processed_characters;

            while (scan_result.word !== ";") {
                module_name_components.push(scan_result.word);

                scan_result = Scanner.scan_word(content, current_offset, dummy_source_location);
                current_offset += scan_result.processed_characters;
            }

            if (module_name_components.length > 0) {
                return module_name_components.join("");
            }
        }
    }

    return undefined;
}

function find_file(
    file_name: string,
    search_paths: string[]
): string | undefined {

    for (const search_path of search_paths) {
        const file_path = path.join(search_path, file_name);
        if (fs.existsSync(file_path)) {
            return file_path;
        }
    }

    return undefined;
}

export async function parse_source_file_and_write_to_disk(
    module_name: string,
    source_file_path: string,
    language_description: Language.Description,
    destination_file_path: string,
    hlang_executable: string | undefined
): Promise<Core.Module | undefined> {
    const file_extension = path.extname(source_file_path);

    if (file_extension === ".h") {
        if (hlang_executable !== undefined) {
            if (!validate_input(module_name)) {
                return undefined;
            }

            const success = await execute_command(hlang_executable, "import-c-header", [module_name, normalize_path(source_file_path), normalize_path(destination_file_path)]);
            if (success) {
                return read_parsed_file(destination_file_path);
            }
        }
    }
    else if (file_extension === ".hltxt") {

        const text = fs.readFileSync(source_file_path, "utf-8");

        const document_state = Document.create_empty_state(source_file_path, language_description.production_rules);

        const text_changes: Text_change.Text_change[] = [
            {
                range: {
                    start: 0,
                    end: text.length,
                },
                text: text
            }
        ];

        try {
            const new_document_state = Text_change.update(language_description, document_state, text_changes, text);
            if (new_document_state.pending_text_changes.length === 0) {

                const core_module = Core.create_core_module(document_state.module, { major: 0, minor: 0, patch: 1 });
                const core_module_json_data = JSON.stringify(core_module);

                const destination_directory_path = path.dirname(destination_file_path);
                if (!fs.existsSync(destination_directory_path)) {
                    fs.mkdirSync(destination_directory_path, { recursive: true });
                }

                fs.writeFileSync(destination_file_path, core_module_json_data);

                return document_state.module;
            }
        }
        catch (error: any) {
            console.log(`parse_source_file_and_write_to_disk(): Exception thrown: '${error}'`);
        }
    }

    return undefined;
}

export function read_parsed_file(
    parsed_file_path: string
): Core.Module | undefined {
    try {
        const json_data = fs.readFileSync(parsed_file_path, "utf-8");
        const core_module = JSON.parse(json_data) as Core_file.Module;
        return Core.create_intermediate_representation(core_module);
    }
    catch (error: any) {
        return undefined;
    }
}

function validate_input(input: string): boolean {
    const regex = /^[a-zA-Z0-9\.]+$/;
    return regex.test(input);
}

function normalize_path(value: string): string {
    const normalized_path = path.normalize(value);
    return normalized_path.replace(/\\/g, "/");
}

async function execute_command(
    executable_file_path: string,
    command: string,
    args: string[]
): Promise<boolean> {
    return new Promise((resolve, reject) => {

        //const quoted_arguments = args.map(value => `"${value}"`);
        const process = child_process.spawn(executable_file_path, [command, ...args]);

        process.stdout.on("data", (data: any) => {
            const message = data.toString("utf-8");
            console.log(message);
        });

        process.stderr.on("data", (data: Buffer) => {
            const message = data.toString("utf-8");
            console.log(message);
        });

        process.on("close", (code: number) => {
            if (code === 0) {
                return resolve(true);
            } else {
                return resolve(false);
            }
        });
    });
}

export function map_module_name_to_parsed_file_path(
    workspace_folder_uri: string,
    artifact: Build.Artifact,
    module_name: string
): string | undefined {

    const workspace_folder_file_path = vscode_uri.URI.parse(workspace_folder_uri).fsPath;

    const artifact_build_path = path.join(workspace_folder_file_path, "build", artifact.name);
    if (!fs.existsSync(artifact_build_path)) {
        fs.mkdirSync(artifact_build_path, { recursive: true });
    }

    const module_file_name = `${module_name}.hl`;
    const module_build_path = path.join(artifact_build_path, module_file_name);

    return module_build_path;
}