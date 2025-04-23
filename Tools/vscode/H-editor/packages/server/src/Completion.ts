import * as Project from "./Project";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";

import * as Core from "../../core/src/Core_intermediate_representation";
import * as Document from "../../core/src/Document";
import * as Parser_node from "../../core/src/Parser_node";
import * as Parse_tree_analysis from "../../core/src/Parse_tree_analysis";
import * as Parse_tree_convertor_mappings from "../../core/src/Parse_tree_convertor_mappings";
import * as Scan_new_changes from "../../core/src/Scan_new_changes";
import * as Tree_sitter_parser from "../../core/src/Tree_sitter_parser";

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
    const root = Document.get_parse_tree(document_state);

    const get_parse_tree = Server_data.create_get_parse_tree(server_data, workspace_uri);
    if (get_parse_tree === undefined) {
        return [
            {
                label: "module",
                kind: vscode.CompletionItemKind.Keyword,
                data: 0
            }
        ];
    }

    const project_data = workspace_uri !== undefined ? server_data.projects.get(workspace_uri) : undefined;

    const before_cursor_node_iterator =
        root !== undefined ?
            Scan_new_changes.get_node_before_text_position(
                root,
                document.getText(),
                document.offsetAt(text_document_position.position)
            ) :
            undefined;

    if (before_cursor_node_iterator === undefined) {
        return [
            {
                label: "module",
                kind: vscode.CompletionItemKind.Keyword,
                data: 0
            }
        ];
    }

    const after_cursor = (before_cursor_node_iterator !== undefined && before_cursor_node_iterator.node !== undefined) ? Parser_node.get_next_terminal_node(before_cursor_node_iterator.root, before_cursor_node_iterator.node, before_cursor_node_iterator.node_position) : undefined;
    const after_cursor_node_position = after_cursor !== undefined ? after_cursor.position : [];

    const tree = document_state.with_errors !== undefined ? document_state.with_errors.tree_sitter_tree : document_state.valid.tree_sitter_tree;
    const lookaheads = await Tree_sitter_parser.get_lookaheads(server_data.parser, tree, { line: before_cursor_node_iterator.line, column: before_cursor_node_iterator.column });
    //const can_be_identifier = lookaheads.find(lookahead => lookahead === "Identifier") !== undefined;
    const can_be_identifier = true;
    const allowed_keywords = lookaheads.filter(lookahead => lookahead[0] !== lookahead[0].toUpperCase() && lookahead !== "end");
    const allowed_symbols = lookaheads.filter(lookahead => lookahead[0] === lookahead[0].toUpperCase());

    const items: vscode.CompletionItem[] = [];

    if (before_cursor_node_iterator !== undefined) {
        if (can_be_identifier && is_cursor_at_type(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position, after_cursor_node_position)) {
            if (is_cursor_at_import_module_type(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position)) {
                if (workspace_uri !== undefined) {
                    items.push(...await get_import_module_type_items(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position, get_parse_tree));
                }
            }
            else {
                items.push(...get_builtin_type_items());
                items.push(...await get_module_type_items(root, false));
                items.push(...get_module_import_alias_items(root));
            }
        }
        else if (can_be_identifier && is_inside_statements_block(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position)) {
            if (is_cursor_at_expression_access(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position)) {
                if (workspace_uri !== undefined) {
                    items.push(...await get_expression_access_items(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position, get_parse_tree));
                }
            }
            else {
                items.push(...get_keyword_and_value_items(allowed_symbols, allowed_keywords));
                items.push(...await get_value_declaration_items(root, false));
                items.push(...await get_function_local_variable_items(root, before_cursor_node_iterator.node_position, get_parse_tree));
                items.push(...get_module_import_alias_items(root));
            }
        }
        else if (is_cursor_at_import_module_name(before_cursor_node_iterator.root, before_cursor_node_iterator.node_position)) {
            if (project_data !== undefined) {
                items.push(...get_import_module_name_items(project_data, text_document_position.textDocument.uri, root));
            }
        }
        else if (is_cursor_at_module_body(allowed_keywords)) {
            items.push(...get_keyword_and_value_items(allowed_symbols, allowed_keywords));
        }
    }
    else {
        items.push(...get_keyword_and_value_items(allowed_symbols, allowed_keywords));
    }

    const final_items = remove_duplicates(items);
    return final_items;
}

function remove_duplicates(items: vscode.CompletionItem[]): vscode.CompletionItem[] {
    const output: vscode.CompletionItem[] = [];

    for (const item of items) {
        const found = output.find(value => value.label === item.label);
        if (found === undefined) {
            output.push(item);
        }
    }

    return output;
}

function get_keyword_and_value_items(
    allowed_symbols: string[],
    allowed_keywords: string[]
): vscode.CompletionItem[] {

    const items: vscode.CompletionItem[] = [];

    for (const symbol of allowed_symbols) {
        switch (symbol) {
            case "Boolean":
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
            case "Expression_null_pointer":
                items.push(
                    {
                        label: "null",
                        kind: vscode.CompletionItemKind.Value,
                        data: 0
                    }
                );
                continue;
            default:
                continue;
        }
    }

    for (const keyword of allowed_keywords) {

        const kind = keyword === "true" || keyword === "false" || keyword === "null" ? vscode.CompletionItemKind.Value : vscode.CompletionItemKind.Keyword;

        items.push(
            {
                label: keyword,
                kind: kind,
                data: 0
            }
        );
    }

    return items;
}

async function get_value_declaration_items(
    root: Parser_node.Node,
    public_only: boolean
): Promise<vscode.CompletionItem[]> {

    const declaration_symbols = await Parse_tree_analysis.get_declaration_symbols(root);
    const type_symbols = declaration_symbols.filter(symbol => symbol.symbol_type === Parse_tree_analysis.Symbol_type.Value);

    const visible_type_symbols = public_only ?
        type_symbols.filter(symbol => Parse_tree_analysis.is_export_declaration(root, symbol.node_position))
        : type_symbols;

    return visible_type_symbols
        .map(
            symbol => {
                const declaration_type = Parse_tree_analysis.get_ancestor_declaration_type(root, symbol.node_position);
                const kind = declaration_type_to_completion_item_kind(root, symbol.node_position, declaration_type);

                return {
                    label: symbol.name,
                    kind: kind,
                    data: 0
                };
            }
        );
}

async function get_function_local_variable_items(
    root: Parser_node.Node,
    scope_node_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<vscode.CompletionItem[]> {

    const symbols = await Parse_tree_analysis.get_symbols_inside_function(root, scope_node_position, get_parse_tree);

    const items = symbols.map((symbol): vscode.CompletionItem => {
        return {
            label: symbol.name,
            kind: vscode.CompletionItemKind.Variable,
            data: 0
        };
    });

    return items;
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

function declaration_type_to_completion_item_kind(
    root: Parser_node.Node,
    node_position: number[],
    ancestor_declaration_type: Core.Declaration_type
): vscode.CompletionItemKind {
    switch (ancestor_declaration_type) {
        case Core.Declaration_type.Alias: {
            return vscode.CompletionItemKind.TypeParameter;
        }
        case Core.Declaration_type.Enum: {
            return vscode.CompletionItemKind.Enum;
        }
        case Core.Declaration_type.Function: {
            return vscode.CompletionItemKind.Function;
        }
        case Core.Declaration_type.Global_variable: {
            const declaration_node = root.children[node_position[0]];
            if (declaration_node === undefined) {
                return vscode.CompletionItemKind.Constant;
            }

            const underlying_declaration = Parser_node.get_child({ node: declaration_node, position: [node_position[0]] }, 0);

            const descendant_mutability = Parser_node.get_child_if(underlying_declaration, child => child.word.value === "Global_variable_mutability");
            if (descendant_mutability === undefined) {
                return vscode.CompletionItemKind.Constant;
            }

            return descendant_mutability.node.children[0].word.value === "var" ? vscode.CompletionItemKind.Constant : vscode.CompletionItemKind.Variable;
        }
        case Core.Declaration_type.Struct: {
            return vscode.CompletionItemKind.Struct;
        }
        case Core.Declaration_type.Union: {
            return vscode.CompletionItemKind.TypeParameter;
        }
    }
}

async function get_module_type_items(
    root: Parser_node.Node,
    public_only: boolean
): Promise<vscode.CompletionItem[]> {

    const declaration_symbols = await Parse_tree_analysis.get_declaration_symbols(root);
    const type_symbols = declaration_symbols.filter(symbol => symbol.symbol_type === Parse_tree_analysis.Symbol_type.Type);

    const visible_type_symbols = public_only ?
        type_symbols.filter(symbol => Parse_tree_analysis.is_export_declaration(root, symbol.node_position))
        : type_symbols;

    return visible_type_symbols
        .map(
            symbol => {
                const declaration_type = Parse_tree_analysis.get_ancestor_declaration_type(root, symbol.node_position);
                const kind = declaration_type_to_completion_item_kind(root, symbol.node_position, declaration_type);

                return {
                    label: symbol.name,
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
    root: Parser_node.Node
): vscode.CompletionItem[] {
    const symbols = Parse_tree_analysis.get_import_alias_symbols(root);
    const items = symbols.map((symbol): vscode.CompletionItem => {
        const symbol_data = symbol.data as Parse_tree_analysis.Symbol_module_alias_data;
        return {
            label: symbol_data.module_alias,
            kind: vscode.CompletionItemKind.Module,
            data: 0
        };
    });
    return items;
}

function get_module_alias_name(
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): string | undefined {
    const parent_node_position = Parser_node.get_parent_position(before_cursor_node_position);
    const parent_node = Parser_node.get_node_at_position(root, parent_node_position);
    if (parent_node.word.value === "ERROR") {
        const previous_sibling = Parser_node.get_previous_sibling(root, before_cursor_node_position);
        if (previous_sibling !== undefined) {
            if (previous_sibling.node.word.value === "Module_type_module_name") {
                const module_alias_name_node = previous_sibling.node.children[0];
                return module_alias_name_node.word.value;
            }
        }
    }

    const module_type_node = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Module_type");
    if (module_type_node !== undefined) {
        if (module_type_node.node.children.length > 0) {
            const module_alias_name_node = module_type_node.node.children[0];
            if (module_alias_name_node.children.length > 0) {
                const module_alias_name = module_alias_name_node.children[0].word.value;
                return module_alias_name;
            }
        }
    }

    return undefined;
}

async function get_import_module_type_items(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<vscode.CompletionItem[]> {

    const module_alias_name = get_module_alias_name(root, before_cursor_node_position);
    if (module_alias_name === undefined) {
        return [];
    }

    const symbol = Parse_tree_analysis.get_import_alias_symbol(root, module_alias_name);
    if (symbol === undefined || symbol.symbol_type !== Parse_tree_analysis.Symbol_type.Module_alias) {
        return undefined;
    }

    const symbol_data = symbol.data as Parse_tree_analysis.Symbol_module_alias_data;
    const parse_tree = await get_parse_tree(symbol_data.module_name);
    if (parse_tree === undefined) {
        return undefined;
    }

    return get_module_type_items(parse_tree, true);
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

function get_access_expression_in_error_node(
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): { access_expression: Core.Access_expression, node: Parser_node.Node, node_position: number[] } | undefined {
    const before_cursor_node = Parser_node.get_node_at_position(root, before_cursor_node_position);

    const parent_node_position = Parser_node.get_parent_position(before_cursor_node_position);
    const parent_node = Parser_node.get_node_at_position(root, parent_node_position);
    if (parent_node.word.value === "ERROR") {
        const previous_sibling = Parser_node.get_previous_sibling(root, before_cursor_node_position);
        if (previous_sibling !== undefined) {
            if (previous_sibling.node.word.value === "Generic_expression" && before_cursor_node.word.value === ".") {
                const previous_expression = Parse_tree_convertor_mappings.node_to_expression(root, previous_sibling.node);
                const access_expression: Core.Access_expression = {
                    expression: {
                        data: {
                            type: Core.Expression_enum.Variable_expression,
                            value: previous_expression,
                        }
                    },
                    member_name: "",
                    access_type: Core.Access_type.Read,
                };

                return {
                    access_expression: access_expression,
                    node: parent_node,
                    node_position: parent_node_position
                };
            }
        }
    }

    return undefined;
}

async function get_expression_access_items(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<vscode.CompletionItem[]> {

    const descendant = {
        node: Parser_node.get_node_at_position(root, before_cursor_node_position),
        position: before_cursor_node_position
    };

    const access_components = await Parse_tree_analysis.get_access_expression_components_using_nodes(
        root,
        descendant,
        get_parse_tree
    );

    const before_last_component = access_components[access_components.length - 2];
    if (before_last_component === undefined) {
        return [];
    }

    if (before_last_component.type === Parse_tree_analysis.Component_type.Import_module) {
        const import_symbol_data = before_last_component.value as Parse_tree_analysis.Symbol_module_alias_data;
        if (import_symbol_data !== undefined) {
            const imported_root = await get_parse_tree(import_symbol_data.module_name);
            if (imported_root !== undefined) {
                return get_value_declaration_items(imported_root, true);
            }
        }
    }
    else if (before_last_component.type === Parse_tree_analysis.Component_type.Declaration) {
        const module_declaration = before_last_component.value as { root: Parser_node.Node, declaration: Core.Declaration, declaration_name_node_position: number[] };
        if (module_declaration !== undefined) {
            const underlying_declaration = await Parse_tree_analysis.get_underlying_type_declaration_from_parse_tree(module_declaration.root, module_declaration.declaration_name_node_position, module_declaration.declaration, get_parse_tree);
            if (underlying_declaration !== undefined) {
                const declaration = underlying_declaration.declaration;
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
        }
    }

    return [];
}

async function find_core_declaration_of_expression_type(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    expression: Core.Expression,
    underlying_declaration: boolean,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, node_position: number[], declaration: Core.Declaration } | undefined> {

    const expression_type = await Parse_tree_analysis.get_expression_type(root, before_cursor_node_position, expression, get_parse_tree);
    if (expression_type !== undefined && expression_type.type.length > 0) {
        if (expression_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
            const custom_type_reference = expression_type.type[0].data.value as Core.Custom_type_reference;
            const declaration_location = await Parse_tree_analysis.get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);

            if (declaration_location !== undefined && underlying_declaration) {
                return await Parse_tree_analysis.get_underlying_type_declaration_from_parse_tree(declaration_location.root, declaration_location.node_position, declaration_location.declaration, get_parse_tree);
            }
            else {
                return declaration_location;
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
    return allowed_labels.find(label => label === "Identifier") !== undefined;
}

function is_inside_statements_block(
    root: Parser_node.Node,
    node_position: number[]
): boolean {

    let current_node_position = node_position;

    while (current_node_position.length > 0) {
        const parent_position = Parser_node.get_parent_position(current_node_position);
        const parent_node = Parser_node.get_node_at_position(root, parent_position);

        if (parent_node.word.value === "ERROR") {
            const function_declaration_child_index = parent_node.children.findIndex(child => child.word.value === "Function_declaration");
            if (function_declaration_child_index !== -1) {
                const open_block_child_index = parent_node.children.findIndex(child => child.word.value === "{");
                if (open_block_child_index !== -1) {
                    return true;
                }
            }
        }

        switch (parent_node.word.value) {
            case "Block":
            case "Expression_block_statements":
            case "Expression_for_loop_statements":
            case "Expression_if_statements":
            case "Expression_switch_case":
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
    root: Parser_node.Node
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

    const current_module_name = Parse_tree_analysis.get_module_name_from_tree(root);
    const import_symbols = Parse_tree_analysis.get_import_alias_symbols(root);

    const filtered_items = items.filter(item => {

        if (item.label === current_module_name) {
            return false;
        }

        const repeated_import = import_symbols.find(symbol => {
            const symbol_data = symbol.data as Parse_tree_analysis.Symbol_module_alias_data;
            return symbol_data.module_name === item.label;
        });
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

    const parent_node_position = Parser_node.get_parent_position(before_cursor_node_position);
    const parent_position = Parser_node.get_node_at_position(root, parent_node_position);
    if (parent_position.word.value === "ERROR") {
        const previous_sibling = Parser_node.get_previous_sibling(root, before_cursor_node_position);
        if (previous_sibling !== undefined) {
            if (previous_sibling.node.word.value === "Module_type_module_name" && before_cursor_node.word.value === ".") {
                return true;
            }
            else if (previous_sibling.node.word.value === "Alias_name" && before_cursor_node.word.value === "=") {
                return true;
            }
        }
    }

    if (before_cursor_node.word.value === ":" || before_cursor_node.word.value === "as") {
        return true;
    }

    if (before_cursor_node.word.value === "=") {
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

        if (parent_node.word.value === "Function" || parent_node.word.value === "ERROR") {
            const declaration_node = parent_node.children.find(value => value.word.value === "Function_declaration");
            if (declaration_node !== undefined) {
                const declaration_name_node = declaration_node.children.find(value => value.word.value === "Function_name") as Parser_node.Node;
                const declaration_name = declaration_name_node.children[0].word.value;
                return core_module.declarations.find(value => value.name === declaration_name);
            }
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
