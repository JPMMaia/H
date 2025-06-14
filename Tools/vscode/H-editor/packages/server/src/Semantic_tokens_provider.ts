import * as vscode_node from "vscode-languageserver/node";

import * as Document from "../../core/src/Document";
import * as Grammar from "../../core/src/Grammar";
import * as Parse_tree_text_iterator from "../../core/src/Parse_tree_text_iterator";
import * as Parser_node from "../../core/src/Parser_node";

export const token_types = [
    "namespace", "enum", "struct", "type", "parameter", "variable", "property",
    "enumMember", "function", "comment", "string", "keyword", "number", "operator"
];

export const token_modifiers = [
    "declaration", "readonly", "modification", "defaultLibrary"
];

export const selector: vscode_node.DocumentSelector = [
    {
        language: "hlang",
        scheme: "file"
    }
];

function get_token(iterator: Parse_tree_text_iterator.Iterator): { type: string, modifiers: string[] } | undefined {

    const node = iterator.node;
    if (node === undefined) {
        return undefined;
    }

    switch (node.word.type) {
        case Grammar.Word_type.Comment:
            return { type: "comment", modifiers: [] };
        case Grammar.Word_type.Number:
            return { type: "number", modifiers: [] };
        case Grammar.Word_type.String:
            return { type: "string", modifiers: [] };
    }

    const parent_position = Parser_node.get_parent_position(iterator.node_position);
    const parent_node = Parser_node.get_node_at_position(iterator.root, parent_position);

    switch (parent_node.word.value) {
        case "Module_name":
        case "Import_alias":
        case "Identifier_with_dots": {
            const is_declaration = is_namespace_declaration(iterator.root, parent_position);
            const modifiers: string[] = [];
            if (is_declaration) {
                modifiers.push("declaration");
            }
            return { type: "namespace", modifiers: modifiers };
        }
        case "Type":
        case "Type_name":
        case "Module_type_type_name":
        case "Pointer_type":
            return { type: "type", modifiers: [] };
        case "Alias_name":
            return { type: "type", modifiers: ["declaration"] };
        case "Enum_name":
            return { type: "enum", modifiers: ["declaration"] };
        case "Enum_value_name":
            return { type: "enumMember", modifiers: ["declaration"] };
        case "Global_variable_name":
            return get_variable_token(iterator.root, parent_position);
        case "Struct_name":
            return { type: "struct", modifiers: ["declaration"] };
        case "Struct_member_name":
            return { type: "property", modifiers: ["declaration"] };
        case "Union_name":
            return { type: "type", modifiers: ["declaration"] };
        case "Union_member_name":
            return { type: "property", modifiers: ["declaration"] };
        case "Function_name":
            return { type: "function", modifiers: ["declaration"] };
        case "Function_parameter_name":
            return { type: "parameter", modifiers: ["readonly"] };
        case "Variable_name": {
            return get_variable_token(iterator.root, parent_position);
        }
        case "Expression_for_loop_variable": {
            return { type: "variable", modifiers: ["declaration"] };
        }
    }

    switch (node.word.type) {
        case Grammar.Word_type.Alphanumeric: {
            return { type: "keyword", modifiers: [""] };
        }
    }

    return undefined;
}

function is_namespace_declaration(
    root: Parser_node.Node,
    node_position: number[]
): boolean {

    let current_node_position = node_position;

    while (current_node_position.length > 0) {

        const parent_node_position = Parser_node.get_parent_position(current_node_position);
        const parent_node = Parser_node.get_node_at_position(root, parent_node_position);

        if (parent_node.word.value === "Module_name") {
            return true;
        }

        current_node_position = parent_node_position;
    }

    return false;

}

function is_left_side_of_expression_assignment(
    root: Parser_node.Node,
    node_position: number[]
): boolean {

    let current_node_position = node_position;

    while (current_node_position.length > 0) {

        const parent_node_position = Parser_node.get_parent_position(current_node_position);
        const parent_node = Parser_node.get_node_at_position(root, parent_node_position);

        if (parent_node.word.value === "Expression_assignment") {
            const is_left_side_of_assignment = current_node_position[current_node_position.length - 1] === 0;
            if (is_left_side_of_assignment) {
                return true;
            }
        }

        current_node_position = parent_node_position;
    }

    return false;
}

function get_variable_token(
    root: Parser_node.Node,
    node_position: number[]
): { type: string, modifiers: string[] } | undefined {

    const parent_position = Parser_node.get_parent_position(node_position);
    const parent_node = Parser_node.get_node_at_position(root, parent_position);

    switch (parent_node.word.value) {
        case "Expression_variable": {
            const is_modified = is_left_side_of_expression_assignment(root, node_position);

            const modifiers: string[] = [];
            if (is_modified) {
                modifiers.push("modification");
            }

            return { type: "variable", modifiers: modifiers };
        }
        case "Global_variable":
        case "Expression_variable_declaration":
        case "Expression_variable_declaration_with_type": {
            const mutability_node = parent_node.children.find(value => value.word.value === "Expression_variable_mutability" || value.word.value === "Global_variable_mutability");
            const is_read_only = mutability_node !== undefined && mutability_node.children[0].word.value !== "mutable";

            const modifiers: string[] = ["declaration"];
            if (is_read_only) {
                modifiers.push("readonly");
            }

            return { type: "variable", modifiers: modifiers };
        }
    }

    return undefined;
}

export const provider =
    async (parameters: vscode_node.SemanticTokensRangeParams, document_state: Document.State): Promise<vscode_node.SemanticTokens> => {

        const root = Document.get_parse_tree(document_state);
        if (root === undefined) {
            return { data: [] };
        }
        const text = Document.get_text(document_state);

        const tokens_builder = new vscode_node.SemanticTokensBuilder();

        let iterator = Parse_tree_text_iterator.begin(root, text);

        while (iterator.node !== undefined && ((iterator.line - 1) < parameters.range.start.line || ((iterator.line - 1) === parameters.range.start.line && (iterator.column - 1) < parameters.range.start.character))) {
            iterator = Parse_tree_text_iterator.next(iterator);
        }

        while (iterator.node !== undefined && ((iterator.line - 1) < parameters.range.end.line || ((iterator.line - 1) === parameters.range.end.line && (iterator.column - 1) < parameters.range.end.character))) {

            const token = get_token(iterator);
            if (token !== undefined) {
                const token_type = encode_token_type(token.type);
                const token_modifiers = encode_token_modifiers(token.modifiers);

                tokens_builder.push(iterator.line - 1, iterator.column - 1, iterator.node.word.value.length, token_type, token_modifiers);
            }

            iterator = Parse_tree_text_iterator.next(iterator);
        }

        return tokens_builder.build();
    };

function encode_token_type(type: string): number {
    return token_types.findIndex(value => value === type);
}

function encode_token_modifiers(modifiers: string[]): number {
    let result = 0;

    for (let index = 0; index < modifiers.length; index++) {
        const token_modifier = modifiers[index];

        const found_index = token_modifiers.findIndex(value => value === token_modifier);

        if (found_index !== -1) {
            result = result | (1 << found_index!);
        }
        else {
            result = result | (1 << token_modifiers.length + 2);
        }
    }
    return result;
}
