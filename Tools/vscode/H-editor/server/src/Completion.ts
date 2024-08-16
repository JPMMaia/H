import * as Project from "./Project";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";

import * as Core from "@core/Core_intermediate_representation";
import * as Document from "@core/Document";
import * as Parser from "@core/Parser";
import * as Parser_node from "@core/Parser_node";
import * as Parse_tree_analysis from "@core/Parse_tree_analysis";
import * as Parse_tree_convertor_mappings from "@core/Parse_tree_convertor_mappings";
import * as Parse_tree_text_iterator from "@core/Parse_tree_text_iterator";
import * as Scan_new_changes from "@core/Scan_new_changes";
import * as Scanner from "@core/Scanner";

export async function on_completion(
    text_document_position: vscode.TextDocumentPositionParams,
    server_data: Server_data.Server_data,
    workspace_uri: string | undefined
): Promise<vscode.CompletionItem[]> {

    const document = server_data.documents.get(text_document_position.textDocument.uri);
    if (document === undefined) {
        return [];
    }

    const document_state = server_data.document_states.get(text_document_position.textDocument.uri);
    if (document_state === undefined) {
        return [];
    }

    const project_data = workspace_uri !== undefined ? server_data.projects.get(workspace_uri) : undefined;

    const before_cursor_node_iterator =
        document_state.parse_tree !== undefined ?
            Scan_new_changes.get_node_before_text_position(
                document_state.parse_tree,
                document.getText(),
                document.offsetAt(text_document_position.position)
            ) :
            undefined;

    const after_cursor = (before_cursor_node_iterator !== undefined && before_cursor_node_iterator.node !== undefined) ? Parser_node.get_next_terminal_node(before_cursor_node_iterator.root, before_cursor_node_iterator.node, before_cursor_node_iterator.node_position) : undefined;
    const after_cursor_node_position = after_cursor !== undefined ? after_cursor.position : [];

    const allowed_labels = Parser.get_allowed_labels(
        document_state.parse_tree,
        after_cursor_node_position.length > 0 ? after_cursor_node_position : undefined,
        server_data.language_description.array_infos,
        server_data.language_description.actions_table
    );

    const can_be_identifier = is_identifier_allowed(allowed_labels);

    const items: vscode.CompletionItem[] = [];

    if (before_cursor_node_iterator !== undefined) {
        if (can_be_identifier && is_cursor_at_type(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position, after_cursor_node_position)) {
            if (is_cursor_at_import_module_type(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position)) {
                if (workspace_uri !== undefined) {
                    items.push(...await get_import_module_type_items(server_data, workspace_uri, document_state.module, before_cursor_node_iterator.root, before_cursor_node_iterator.node_position));
                }
            }
            else {
                items.push(...get_builtin_type_items());
                items.push(...get_module_type_items(document_state.module, false));
                items.push(...get_module_import_alias_items(document_state.module));
            }
        }
        else if (can_be_identifier && is_inside_statements_block(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position)) {
            if (is_cursor_at_expression_access(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position)) {
                if (workspace_uri !== undefined) {
                    items.push(...await get_expression_access_items(server_data, workspace_uri, document_state.module, before_cursor_node_iterator.root, before_cursor_node_iterator.node_position));
                }
            }
            else {
                items.push(...get_keyword_and_value_items(allowed_labels, server_data));
                items.push(...get_function_declaration_items(document_state.module, false));
                items.push(...get_function_local_variable_items(document_state, before_cursor_node_iterator));
                items.push(...get_module_import_alias_items(document_state.module));
            }
        }
        else if (is_cursor_at_import_module_name(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position)) {
            if (project_data !== undefined) {
                items.push(...get_import_module_name_items(project_data, text_document_position.textDocument.uri, document_state.module));
            }
        }
        else if (is_cursor_at_module_body(allowed_labels)) {
            items.push(...get_keyword_and_value_items(allowed_labels, server_data));
        }
    }
    else {
        items.push(...get_keyword_and_value_items(allowed_labels, server_data));
    }

    return items;
}

function get_keyword_and_value_items(
    allowed_labels: string[],
    server_data: Server_data.Server_data
): vscode.CompletionItem[] {

    const items: vscode.CompletionItem[] = [];

    for (const label of allowed_labels) {
        switch (label) {
            case "boolean":
                items.push(
                    {
                        label: "true",
                        kind: vscode.CompletionItemKind.Value,
                        data: 0
                    }
                );
                items.push(
                    {
                        label: "false",
                        kind: vscode.CompletionItemKind.Value,
                        data: 0
                    }
                );
                continue;
            case "null":
                items.push(
                    {
                        label: label,
                        kind: vscode.CompletionItemKind.Value,
                        data: 0
                    }
                );
                continue;
            case "comment":
            case "identifier":
            case "number":
            case "string":
                continue;
        }

        if (!server_data.language_description.terminals.has(label)) {
            continue;
        }

        if (!Scanner.is_alphanumeric(label)) {
            continue;
        }

        items.push(
            {
                label: label,
                kind: vscode.CompletionItemKind.Keyword,
                data: 0
            }
        );
    }

    return items;
}

function get_function_declaration_items(
    core_module: Core.Module,
    public_only: boolean
): vscode.CompletionItem[] {

    const function_declarations = core_module.declarations.filter(value => value.type === Core.Declaration_type.Function);

    const visible_function_declarations = public_only ?
        function_declarations.filter(declaration => declaration.is_export) :
        function_declarations;

    const items = visible_function_declarations.map(
        (declaration, index): vscode.CompletionItem => {
            return {
                label: declaration.name,
                kind: vscode.CompletionItemKind.Function,
                data: index
            };
        }
    );

    return items;
}

function get_function_local_variable_items(
    document_state: Document.State,
    iterator: Parse_tree_text_iterator.Iterator
): vscode.CompletionItem[] {

    const declaration = get_current_function(document_state.module, iterator.root, iterator.node_position);
    if (declaration === undefined) {
        return [];
    }

    const function_value = declaration.value as Core.Function;

    const input_parameter_items = function_value.declaration.input_parameter_names.map(
        (input_parameter_name, index): vscode.CompletionItem => {
            return {
                label: input_parameter_name,
                kind: vscode.CompletionItemKind.Variable,
                data: index
            };
        }
    );

    const local_variable_items: vscode.CompletionItem[] = [];

    // TODO

    return [
        ...input_parameter_items,
        ...local_variable_items
    ];
}

function get_builtin_type_items(): vscode.CompletionItem[] {

    const builtin_types = [
        "Int8", "Int16", "Int32", "Int64",
        "Uint8", "Uint16", "Uint32", "Uint64",
        ...Object.keys(Core.Fundamental_type).filter((value) => isNaN(Number(value)))
    ];

    const items: vscode.CompletionItem[] = builtin_types.map(
        label => {
            return {
                label: label,
                kind: vscode.CompletionItemKind.Keyword,
                data: 0
            };
        }
    );

    return items;
}

function declaration_type_to_completion_item_kind(declaration_type: Core.Declaration_type): vscode.CompletionItemKind {
    switch (declaration_type) {
        case Core.Declaration_type.Alias:
            return vscode.CompletionItemKind.TypeParameter;
        case Core.Declaration_type.Enum:
            return vscode.CompletionItemKind.Enum;
        case Core.Declaration_type.Function:
            return vscode.CompletionItemKind.Function;
        case Core.Declaration_type.Struct:
            return vscode.CompletionItemKind.Struct;
        case Core.Declaration_type.Union:
            return vscode.CompletionItemKind.TypeParameter;
    }
}

function get_module_type_items(
    core_module: Core.Module,
    public_only: boolean
): vscode.CompletionItem[] {

    const type_declarations = core_module.declarations.filter(declaration => declaration.type !== Core.Declaration_type.Function);

    const visible_type_declarations = public_only ?
        type_declarations.filter(declaration => declaration.is_export)
        : type_declarations;

    return visible_type_declarations
        .map(
            declaration => {
                const kind = declaration_type_to_completion_item_kind(declaration.type);

                return {
                    label: declaration.name,
                    kind: kind,
                    data: 0
                };
            }
        );
}

function is_cursor_at_import_module_type(
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): boolean {

    const before_cursor_node = Parser_node.get_node_at_position(root, before_cursor_node_position);
    if (before_cursor_node.word.value === "." || Parser_node.has_ancestor_with_name(root, before_cursor_node_position, ["Module_type_type_name"])) {
        return true;
    }

    return false;
}

function get_module_import_alias_items(
    core_module: Core.Module
): vscode.CompletionItem[] {
    return core_module.imports.map((value): vscode.CompletionItem => {
        return {
            label: value.alias,
            kind: vscode.CompletionItemKind.Module,
            data: 0
        };
    });
}

async function get_import_module_type_items(
    server_data: Server_data.Server_data,
    workspace_folder_uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): Promise<vscode.CompletionItem[]> {

    const module_type_node = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Module_type");
    if (module_type_node === undefined) {
        return [];
    }

    if (module_type_node.node.children.length === 0) {
        return [];
    }

    const module_alias_name_node = module_type_node.node.children[0];
    if (module_alias_name_node.children.length === 0) {
        return [];
    }

    const module_alias_name = module_alias_name_node.children[0].word.value;

    const import_alias = core_module.imports.find(value => value.alias === module_alias_name);
    if (import_alias === undefined) {
        return [];
    }

    const imported_module = await Server_data.get_core_module(server_data, workspace_folder_uri, import_alias.module_name);
    if (imported_module === undefined) {
        return [];
    }

    return get_module_type_items(imported_module, true);
}

function is_cursor_at_expression_access(
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): boolean {

    const before_cursor_node = Parser_node.get_node_at_position(root, before_cursor_node_position);
    if (before_cursor_node.word.value === "." || Parser_node.has_ancestor_with_name(root, before_cursor_node_position, ["Expression_access"])) {
        return true;
    }

    return false;
}

async function get_expression_access_items(
    server_data: Server_data.Server_data,
    workspace_folder_uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): Promise<vscode.CompletionItem[]> {

    const ancestor = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Expression_access");
    if (ancestor === undefined) {
        return [];
    }

    const expression_access = Parse_tree_convertor_mappings.node_to_expression_access(ancestor.node, server_data.language_description.key_to_production_rule_indices);
    const expression: Core.Expression = {
        data: {
            type: Core.Expression_enum.Access_expression,
            value: expression_access
        }
    };

    const module_declaration = await find_core_declaration_of_expression_type(server_data, workspace_folder_uri, core_module, root, before_cursor_node_position, expression, true);
    if (module_declaration !== undefined) {
        const declaration = module_declaration.declaration;
        if (declaration.type === Core.Declaration_type.Enum) {
            const enum_declaration = declaration.value as Core.Enum_declaration;
            return get_enum_value_completion_items(enum_declaration);
        }
        else if (declaration.type === Core.Declaration_type.Struct) {
            const struct_declaration = declaration.value as Core.Struct_declaration;
            return get_struct_member_completion_items(struct_declaration);
        }
        else if (declaration.type === Core.Declaration_type.Union) {
            const union_declaration = declaration.value as Core.Union_declaration;
            return get_union_member_completion_items(union_declaration);
        }
    }
    else {
        const components = ancestor.node.children
            .filter((_, index) => index % 2 === 0)
            .map(node => get_terminal_value(node));

        if (components.length === 0) {
            return [];
        }

        const first_component = components[0];

        const import_module = core_module.imports.find(value => value.alias === first_component);
        if (import_module !== undefined) {
            const imported_module = await Server_data.get_core_module(server_data, workspace_folder_uri, import_module.module_name);
            if (imported_module === undefined) {
                return [];
            }

            if (components.length <= 2) {
                return get_function_declaration_items(imported_module, true);
            }
        }
    }

    return [];
}

async function find_core_declaration_of_expression_type(
    server_data: Server_data.Server_data,
    workspace_folder_uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    expression: Core.Expression,
    underlying_declaration: boolean
): Promise<{ core_module: Core.Module, declaration: Core.Declaration } | undefined> {
    const declaration = get_current_function(core_module, root, before_cursor_node_position);
    if (declaration !== undefined) {

        const get_core_module = (module_name: string): Promise<Core.Module | undefined> => {

            if (core_module.name === module_name) {
                return Promise.resolve(core_module);
            }

            return Server_data.get_core_module(server_data, workspace_folder_uri, module_name);
        };

        const expression_type = await Parse_tree_analysis.get_expression_type(core_module, declaration, root, before_cursor_node_position, expression, get_core_module);
        if (expression_type !== undefined && expression_type.length > 0) {
            if (expression_type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                const custom_type_reference = expression_type[0].data.value as Core.Custom_type_reference;
                const module_declaration = await Parse_tree_analysis.get_custom_type_reference_declaration(custom_type_reference, get_core_module);

                if (module_declaration !== undefined && underlying_declaration) {
                    return await Parse_tree_analysis.get_underlying_type_declaration(module_declaration.core_module, module_declaration.declaration, get_core_module);
                }
                else {
                    return module_declaration;
                }
            }
        }
    }

    return undefined;
}

function get_enum_value_completion_items(
    enum_declaration: Core.Enum_declaration
): vscode.CompletionItem[] {

    const items: vscode.CompletionItem[] = [];

    for (let index = 0; index < enum_declaration.values.length; ++index) {
        const member = enum_declaration.values[index];

        items.push(
            {
                label: member.name,
                kind: vscode.CompletionItemKind.EnumMember,
                data: 0
            }
        );
    }

    return items;
}

function get_struct_member_completion_items(
    struct_declaration: Core.Struct_declaration
): vscode.CompletionItem[] {

    const items: vscode.CompletionItem[] = [];

    for (let index = 0; index < struct_declaration.member_names.length; ++index) {
        const member_name = struct_declaration.member_names[index];

        items.push(
            {
                label: member_name,
                kind: vscode.CompletionItemKind.Property,
                data: 0
            }
        );
    }

    return items;
}

function get_union_member_completion_items(
    union_declaration: Core.Union_declaration
): vscode.CompletionItem[] {

    const items: vscode.CompletionItem[] = [];

    for (let index = 0; index < union_declaration.member_names.length; ++index) {
        const member_name = union_declaration.member_names[index];

        items.push(
            {
                label: member_name,
                kind: vscode.CompletionItemKind.Property,
                data: 0
            }
        );
    }

    return items;
}

function is_identifier_allowed(
    allowed_labels: string[]
): boolean {
    return allowed_labels.find(label => label === "identifier") !== undefined;
}

function is_inside_statements_block(
    root: Parser_node.Node,
    node_position: number[]
): boolean {

    let current_node_position = node_position;

    while (current_node_position.length > 0) {
        const parent_position = Parser_node.get_parent_position(current_node_position);
        const parent_node = Parser_node.get_node_at_position(root, parent_position);

        switch (parent_node.word.value) {
            case "Statements":
            case "Expression_block_statements":
            case "Expression_for_loop_statements":
            case "Expression_if_statements":
            case "Expression_switch_case_statements":
            case "Expression_while_loop_statements":
                return true;
            case "Function":
            case "Module_body":
                return false;
        }

        current_node_position = parent_position;
    }

    return false;
}

function is_cursor_at_import_module_name(
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): boolean {

    const before_cursor_node = Parser_node.get_node_at_position(root, before_cursor_node_position);
    if (before_cursor_node.word.value === "import" || Parser_node.has_ancestor_with_name(root, before_cursor_node_position, ["Import_name"])) {
        return true;
    }

    return false;
}

function is_cursor_at_module_body(
    allowed_labels: string[]
): boolean {
    return allowed_labels.find(label => label === "struct") !== undefined;
}

function get_import_module_name_items(
    project_data: Project.Project_data,
    document_uri: string,
    core_module: Core.Module
): vscode.CompletionItem[] {

    const artifact = Project.get_artifact_of_document(project_data, document_uri);
    if (artifact === undefined) {
        return [];
    }

    const items: vscode.CompletionItem[] = [];

    const artifact_source_files = project_data.artifact_to_source_files_map.get(artifact.name);
    if (artifact_source_files !== undefined) {
        for (const source_file of artifact_source_files) {
            items.push(
                {
                    label: source_file.module_name,
                    kind: vscode.CompletionItemKind.Module,
                    data: 0
                }
            );
        }
    }

    for (const dependency of artifact.dependencies) {
        const dependency_source_files = project_data.artifact_to_source_files_map.get(dependency.name);
        if (dependency_source_files !== undefined) {
            for (const source_file of dependency_source_files) {
                items.push(
                    {
                        label: source_file.module_name,
                        kind: vscode.CompletionItemKind.Module,
                        data: 0
                    }
                );
            }
        }
    }

    const filtered_items = items.filter(item => {
        if (item.label === core_module.name) {
            return false;
        }

        const repeated_import = core_module.imports.find(value => value.module_name === item.label);
        if (repeated_import !== undefined) {
            return false;
        }

        return true;
    });

    return filtered_items;
}

function is_cursor_at_type(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    after_cursor_node_position: number[]
): boolean {

    const before_cursor_node = Parser_node.get_node_at_position(root, before_cursor_node_position);

    if (before_cursor_node.word.value === ":" || before_cursor_node.word.value === "as" || before_cursor_node.word.value === "=") {
        if (Parser_node.has_ancestor_with_name(root, after_cursor_node_position, ["Type"])) {
            return true;
        }
    }
    else if (Parser_node.has_ancestor_with_name(root, before_cursor_node_position, ["Type"])) {
        return true;
    }

    return false;
}

function get_current_function(
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[]
): Core.Declaration | undefined {

    let current_node_position = node_position;

    while (current_node_position.length > 0) {
        const parent_position = Parser_node.get_parent_position(current_node_position);
        const parent_node = Parser_node.get_node_at_position(root, parent_position);

        if (parent_node.word.value === "Function") {
            const declaration_node = parent_node.children.find(value => value.word.value === "Function_declaration") as Parser_node.Node;
            const declaration_name_node = declaration_node.children.find(value => value.word.value === "Function_name") as Parser_node.Node;
            const declaration_name = declaration_name_node.children[0].word.value;

            return core_module.declarations.find(value => value.name === declaration_name);
        }

        current_node_position = parent_position;
    }

    return undefined;
}

function get_terminal_value(node: Parser_node.Node): string {
    let current_node = node;

    while (current_node.children.length > 0) {
        current_node = current_node.children[0];
    }

    return current_node.word.value;
}
