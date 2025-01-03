export interface Version {
    major: number;
    minor: number;
    patch: number;
}

export enum Artifact_type {
    Executable = "executable",
    Library = "library",
}

export interface Dependency {
    name: string;
}

export interface C_header {
    name: string;
    header: string;
    options: string;
}

export interface C_header_options {
    search_paths?: string[];
    public_prefixes?: string[];
    remove_prefixes?: string[];
}

export interface Executable_info {
    source: string;
    entry_point: string;
    include: string[];
}

export interface Library_info {
    c_headers: C_header[];
    c_header_options?: Map<string, C_header_options>;
    external_libraries: Map<string, string>;
}

export interface Artifact {
    file_path: string;
    name: string;
    version: Version;
    type: Artifact_type;
    dependencies: Dependency[];
    executable?: Executable_info;
    library?: Library_info;
}

export interface Repository {
    file_path: string;
    name: string;
    artifact_to_location: Map<string, string>;
}

export interface Source_file_info {
    file_path: string;
    module_name: string;
}
