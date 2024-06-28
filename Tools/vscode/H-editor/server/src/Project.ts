import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import * as vscode_uri from "vscode-uri";

import * as Build from "@core/Build";
import * as Grammar from "@core/Grammar";
import * as Scanner from "@core/Scanner";

export interface Project_data {
    repositories: Build.Repository[];
    artifacts: Map<string, Build.Artifact>;
    artifact_to_source_files_map: Map<string, Build.Source_file_info[]>;
}

export async function create_project_data(
    root_path: string,
    repository_paths: string[],
    header_search_paths: string[]
): Promise<Project_data> {

    const repositories = read_repositories(repository_paths);
    const artifacts = read_artifacts(root_path, repositories);
    const artifact_to_source_files_map = await create_artifact_to_source_files(artifacts, header_search_paths);

    return {
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
