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
    artifact_name: string;
}

export interface C_header {
    module_name: string;
    header: string;
}

export interface Executable_info {
    source: string;
    entry_point: string;
    include: string[];
}

export interface Library_info {
    c_headers: C_header[];
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
