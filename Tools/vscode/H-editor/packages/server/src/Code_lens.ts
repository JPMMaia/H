import * as Helpers from "./Helpers";
import * as Project from "./Project";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";

import * as Core from "../../core/src/Core_intermediate_representation";
import * as Document from "../../core/src/Document";
import * as Parse_tree_text_iterator from "../../core/src/Parse_tree_text_iterator";
import * as Parser_node from "../../core/src/Parser_node";
import * as Tree_sitter_parser from "../../core/src/Tree_sitter_parser";

export async function create(
    parameters: vscode.CodeLensParams,
    server_data: Server_data.Server_data,
    workspace_uri: string
): Promise<vscode.CodeLens[]> {

    const document = server_data.documents.get(parameters.textDocument.uri);
    if (document === undefined) {
        return [];
    }

    const document_state = server_data.document_states.get(parameters.textDocument.uri);
    if (document_state === undefined) {
        return [];
    }
    const root = Document.get_parse_tree(document_state);
    if (root === undefined) {
        return [];
    }

    const project = server_data.projects.get(workspace_uri);
    if (project === undefined) {
        return [];
    }

    const get_core_module = Server_data.create_get_core_module(server_data, workspace_uri);
    const core_module = await get_core_module(Document.get_module_name(document_state));
    if (core_module === undefined) {
        return [];
    }

    const start_node_iterator = Parse_tree_text_iterator.begin(root, document.getText());

    const code_lens: vscode.CodeLens[] = [];

    let iterator = Parse_tree_text_iterator.go_to_next_node_position(start_node_iterator, [1]);

    while (iterator.node !== undefined) {
        const struct_ancestor = Parser_node.get_ancestor_with_name(iterator.root, iterator.node_position, "Struct");
        if (struct_ancestor !== undefined) {
            const struct_name_descendant = Parser_node.find_descendant_position_if(struct_ancestor, node => node.word.value === "Struct_name");
            if (struct_name_descendant !== undefined) {
                const struct_name = struct_name_descendant.node.children[0].word.value;
                const struct_layout = await get_struct_layout(server_data, workspace_uri, project, core_module, struct_name);
                if (struct_layout !== undefined) {
                    iterator = Parse_tree_text_iterator.go_to_next_node_position(iterator, struct_name_descendant.position);
                    code_lens.push(
                        {
                            range: Helpers.create_vscode_range(iterator.line, iterator.column, iterator.line, iterator.column + struct_name.length),
                            command: {
                                title: `Size: ${struct_layout.size} bytes | Alignment: ${struct_layout.alignment} bytes`,
                                command: ""
                            }
                        }
                    );

                    const struct_members_descendant = Parser_node.find_descendant_position_if(struct_ancestor, node => node.word.value === "Struct_members");
                    if (struct_members_descendant !== undefined) {

                        const struct_member_name_descendants = Parser_node.find_descendants_if(struct_members_descendant, node => node.word.value === "Struct_member_name");

                        for (let index = 0; index < struct_member_name_descendants.length; ++index) {
                            if (index >= struct_layout.members.length) {
                                break;
                            }

                            const struct_member_name_descendant = struct_member_name_descendants[index];

                            const struct_member_name = struct_member_name_descendant.node.children[0].word.value;
                            const struct_member_layout = struct_layout.members[index];

                            iterator = Parse_tree_text_iterator.go_to_next_node_position(iterator, struct_member_name_descendant.position);
                            code_lens.push(
                                {
                                    range: Helpers.create_vscode_range(iterator.line, iterator.column, iterator.line, iterator.column + struct_member_name.length),
                                    command: {
                                        title: `Offset: ${struct_member_layout.offset} bytes | Size: ${struct_member_layout.size} bytes | Alignment: ${struct_member_layout.alignment} bytes`,
                                        command: ""
                                    }
                                }
                            );
                        }
                    }
                }
            }
        }

        const next_declaration_position = iterator.node_position.slice(0, 2);
        next_declaration_position[1] += 1;
        iterator = Parse_tree_text_iterator.go_to_next_node_position(iterator, next_declaration_position);
    }

    return code_lens;
}

export async function resolve(
    code_lens: vscode.CodeLens
): Promise<vscode.CodeLens> {
    return code_lens;
}

interface Struct_member_layout {
    offset: number;
    size: number;
    alignment: number;
}

interface Struct_layout {
    size: number;
    alignment: number;
    members: Struct_member_layout[];
}

async function get_struct_layout(
    server_data: Server_data.Server_data,
    workspace_uri: string,
    project: Project.Project_data,
    core_module: Core.Module,
    struct_name: string
): Promise<Struct_layout | undefined> {
    if (project.hlang_executable === undefined) {
        return undefined;
    }

    if (core_module.source_file_path === undefined) {
        return undefined;
    }

    const parse_result = await Server_data.parse_source_file_and_write_to_disk_if_needed(
        server_data,
        workspace_uri,
        project,
        core_module.name,
        core_module.source_file_path
    );
    if (parse_result === undefined) {
        return undefined;
    }

    const artifact = Project.get_artifact_of_module(project, core_module.name);
    const core_module_file_path = Project.map_module_name_to_parsed_file_path(workspace_uri, artifact, core_module.name, "generated.hl");
    if (core_module_file_path === undefined) {
        return undefined;
    }

    const new_core_module = Tree_sitter_parser.to_core_module(parse_result.core_tree);
    Project.write_core_module_to_file(new_core_module, core_module_file_path);

    if (!Helpers.validate_input(struct_name)) {
        return undefined;
    }

    const args = [
        core_module_file_path,
        struct_name
    ];

    let received_data: any = undefined;

    const on_stdout = (data: any): void => {
        received_data = data;
    };

    const success = await Helpers.execute_command(project.hlang_executable, "print-struct-layout", args, on_stdout);
    if (!success || received_data === undefined) {
        return undefined;
    }

    const decoded_data = received_data.toString("utf-8");
    const json = JSON.parse(decoded_data);
    const struct_layout = json as Struct_layout;
    return struct_layout;
}
