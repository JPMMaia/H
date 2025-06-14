import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";
import * as vscode_uri from "vscode-uri";

import * as Helpers from "./Helpers";

import * as Build from "../../core/src/Build";
import * as Core from "../../core/src/Core_intermediate_representation";
import * as Core_file from "../../core/src/Core_interface";
import * as Grammar from "../../core/src/Grammar";
import * as Language_version from "../../core/src/Language_version";
import * as Parser_node from "../../core/src/Parser_node";
import * as Scanner from "../../core/src/Scanner";
import * as Text_formatter from "../../core/src/Text_formatter";
import * as Tree_sitter_parser from "../../core/src/Tree_sitter_parser";

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

    if (artifact.library !== undefined) {
        if (artifact.library.c_headers === undefined) {
            artifact.library.c_headers = [];
        }
    }

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

    if (path.isAbsolute(file_name)) {
        return fs.existsSync(file_name) ? file_name : undefined;
    }

    for (const search_path of search_paths) {
        const file_path = path.join(search_path, file_name);
        if (fs.existsSync(file_path)) {
            return file_path;
        }
    }

    return undefined;
}

function get_c_header(
    artifact: Build.Artifact,
    module_name: string
): Build.C_header | undefined {
    if (artifact.library === undefined) {
        return undefined;
    }

    for (const header of artifact.library.c_headers) {
        if (header.name === module_name) {
            return header;
        }
    }

    return undefined;
}

function get_c_header_options(
    artifact: Build.Artifact,
    c_header: Build.C_header
): Build.C_header_options | undefined {
    if (artifact.library === undefined || c_header.options === undefined || artifact.library.c_header_options === undefined) {
        return undefined;
    }

    if (c_header.options in artifact.library.c_header_options) {
        return artifact.library.c_header_options[c_header.options];
    }

    return undefined;
}

export async function parse_source_file_and_write_to_disk(
    module_name: string,
    source_file_path: string,
    artifact: Build.Artifact,
    parser: Tree_sitter_parser.Parser,
    intermediate_file_path: string,
    intermediate_text_file_path: string,
    destination_file_path: string,
    hlang_executable: string | undefined
): Promise<Parser_node.Node | undefined> {
    const file_extension = path.extname(source_file_path);

    if (file_extension === ".h") {
        if (hlang_executable !== undefined) {
            if (!Helpers.validate_input(module_name)) {
                return undefined;
            }

            const c_header = get_c_header(artifact, module_name);
            const c_header_options = c_header !== undefined ? get_c_header_options(artifact, c_header) : undefined;

            const command_arguments: string[] = [
                module_name,
                Helpers.normalize_path(source_file_path),
                Helpers.normalize_path(intermediate_file_path),
            ];

            const search_paths = c_header_options !== undefined && c_header_options.search_paths !== undefined ? c_header_options.search_paths : [];
            const search_paths_argument = search_paths.map(path => `--header-search-path=${path}`);
            command_arguments.push(...search_paths_argument);

            const public_prefixes = c_header_options !== undefined && c_header_options.public_prefixes !== undefined ? c_header_options.public_prefixes : [];
            const public_prefixes_argument = public_prefixes.map(path => `--header-public-prefix=${path}`);
            command_arguments.push(...public_prefixes_argument);

            const remove_prefixes = c_header_options !== undefined && c_header_options.remove_prefixes !== undefined ? c_header_options.remove_prefixes : [];
            const remove_prefixes_argument = remove_prefixes.map(path => `--header-remove-prefix=${path}`);
            command_arguments.push(...remove_prefixes_argument);

            const success = await Helpers.execute_command(hlang_executable, "import-c-header", command_arguments);
            if (success) {
                const core_module = read_parsed_file(intermediate_file_path);
                const text = Text_formatter.format_module(core_module, {});
                write_to_file(text, intermediate_text_file_path);
                const tree = Tree_sitter_parser.parse(parser, text);
                const core_tree = Tree_sitter_parser.to_parser_node(tree.rootNode, true);
                write_parse_tree_to_file(core_tree, destination_file_path);
                return core_tree;
            }
        }
    }
    else if (file_extension === ".hltxt") {
        const text = fs.readFileSync(source_file_path, "utf-8");
        const tree = Tree_sitter_parser.parse(parser, text);
        const core_tree = Tree_sitter_parser.to_parser_node(tree.rootNode, true);
        write_parse_tree_to_file(core_tree, destination_file_path);
        return core_tree;
    }

    return undefined;
}

export function write_to_file(
    contents: string,
    destination_file_path: string
): void {
    const destination_directory_path = path.dirname(destination_file_path);
    if (!fs.existsSync(destination_directory_path)) {
        fs.mkdirSync(destination_directory_path, { recursive: true });
    }

    fs.writeFileSync(destination_file_path, contents);
}

function write_parse_tree_to_file(
    core_tree: Parser_node.Node,
    destination_file_path: string
): void {
    const core_tree_json_data = JSON.stringify(core_tree);
    write_to_file(core_tree_json_data, destination_file_path);
}

export function write_core_module_to_file(
    core_module: Core.Module,
    destination_file_path: string
): void {
    const compiler_module = Core.create_core_module(core_module, Language_version.language_version);
    const core_tree_json_data = JSON.stringify(compiler_module);
    write_to_file(core_tree_json_data, destination_file_path);
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

export function read_core_tree_file(
    parsed_file_path: string
): Parser_node.Node | undefined {
    try {
        const json_data = fs.readFileSync(parsed_file_path, "utf-8");
        const core_tree = JSON.parse(json_data) as Parser_node.Node;
        return core_tree;
    }
    catch (error: any) {
        return undefined;
    }
}

export function map_module_name_to_parsed_file_path(
    workspace_folder_uri: string,
    artifact: Build.Artifact | undefined,
    module_name: string,
    extension: string
): string | undefined {

    const workspace_folder_file_path = vscode_uri.URI.parse(workspace_folder_uri).fsPath;

    const artifact_name = artifact !== undefined ? artifact.name : "no_artifact";

    const artifact_build_path = path.join(workspace_folder_file_path, "build", artifact_name);
    if (!fs.existsSync(artifact_build_path)) {
        fs.mkdirSync(artifact_build_path, { recursive: true });
    }

    const module_file_name = `${module_name}.${extension}`;
    const module_build_path = path.join(artifact_build_path, module_file_name);

    return path.normalize(module_build_path).replace(/\\/g, "/");
}
