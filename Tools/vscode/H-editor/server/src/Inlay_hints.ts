import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Core from "@core/Core_intermediate_representation";
import * as Parse_tree_analysis from "@core/Parse_tree_analysis";
import * as Parse_tree_text_iterator from "@core/Parse_tree_text_iterator";
import * as Parser_node from "@core/Parser_node";
import * as Scan_new_changes from "@core/Scan_new_changes";
import * as Type_utilities from "@core/Type_utilities";

export async function create(
    parameters: vscode.InlayHintParams,
    server_data: Server_data.Server_data,
    workspace_uri: string | undefined
): Promise<vscode.InlayHint[]> {

    const document = server_data.documents.get(parameters.textDocument.uri);
    if (document === undefined) {
        return [];
    }

    const document_state = server_data.document_states.get(parameters.textDocument.uri);
    if (document_state === undefined) {
        return [];
    }

    if (document_state.parse_tree === undefined) {
        return [];
    }

    const start_node_iterator = get_start_iterator(document, parameters.range, document_state.parse_tree);

    const is_within_range = (iterator: Parse_tree_text_iterator.Iterator): boolean => {

        if (iterator.line === -1 || iterator.column === -1) {
            return false;
        }

        if (iterator.line - 1 < parameters.range.end.line) {
            return true;
        }

        if (iterator.line - 1 > parameters.range.end.line) {
            return false;
        }

        return iterator.column - 1 < parameters.range.end.character;
    };

    let iterator = start_node_iterator;

    const inlay_hints: vscode.InlayHint[] = [];

    const get_core_module = (module_name: string): Promise<Core.Module | undefined> => {
        return Server_data.get_core_module(server_data, workspace_uri, module_name);
    };

    while (is_within_range(iterator)) {

        if (iterator.node !== undefined) {
            if (Parser_node.has_ancestor_with_name(iterator.root, iterator.node_position, ["Expression_variable_declaration"])) {
                const result = Parse_tree_analysis.find_statement(document_state.module, iterator.root, iterator.node_position);
                if (result !== undefined) {
                    const function_value = result.function_value;
                    const statement = result.statement;
                    const statement_node_position = result.node_position;
                    const statement_node = result.node;
                    if (statement.expression.data.type === Core.Expression_enum.Variable_declaration_expression) {
                        const expression = statement.expression.data.value as Core.Variable_declaration_expression;
                        const right_hand_side_type = await Parse_tree_analysis.get_expression_type(document_state.module, function_value, iterator.root, statement_node_position, expression.right_hand_side, get_core_module);
                        if (right_hand_side_type !== undefined) {
                            const variable_name_descendant = Parser_node.find_descendant_position_if(statement_node, node => node.word.value === "Variable_name") as { node: Parser_node.Node, position: number[] };
                            const variable_name_source_location = Parse_tree_text_iterator.get_node_source_location(iterator.root, iterator.text, [...statement_node_position, ...variable_name_descendant.position, 0]) as Parser_node.Source_location;
                            const variable_name = variable_name_descendant.node.children[0].word.value;
                            const position: vscode.Position = {
                                line: variable_name_source_location.line - 1,
                                character: variable_name_source_location.column - 1 + variable_name.length
                            };

                            const label_parts = await create_label_parts(right_hand_side_type, document_state.module.name, get_core_module);

                            inlay_hints.push(
                                {
                                    label: label_parts,
                                    position: position,
                                    kind: vscode.InlayHintKind.Type,
                                }
                            );

                            const rightmost_descendant = Parser_node.get_rightmost_descendant(statement_node, statement_node_position);
                            iterator = Parse_tree_text_iterator.go_to_next_node_position(iterator, rightmost_descendant.position);
                        }
                    }
                }
            }
        }

        iterator = Parse_tree_text_iterator.next(iterator);
    }

    return inlay_hints;
}

function get_start_iterator(
    document: TextDocument,
    range: vscode.Range,
    parse_tree: Parser_node.Node
): Parse_tree_text_iterator.Iterator {
    const start_node_iterator = Scan_new_changes.get_node_before_text_position(
        parse_tree,
        document.getText(),
        document.offsetAt(range.start)
    );
    if (start_node_iterator !== undefined) {
        return start_node_iterator;
    }

    return Parse_tree_text_iterator.begin(parse_tree, document.getText());
}

async function create_label_parts(
    type: Core.Type_reference,
    current_module_name: string,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<vscode.InlayHintLabelPart[]> {

    const parts: vscode.InlayHintLabelPart[] = [];
    parts.push({ value: ": " });

    await create_label_part_recursively(type, current_module_name, parts, get_core_module);

    return parts;
}

export async function create_label_part_recursively(
    type: Core.Type_reference,
    current_module_name: string,
    parts: vscode.InlayHintLabelPart[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<void> {

    switch (type.data.type) {
        case Core.Type_reference_enum.Builtin_type_reference: {
            const value = type.data.value as Core.Builtin_type_reference;
            parts.push(
                {
                    value: value.value
                }
            );
            return;
        }
        case Core.Type_reference_enum.Constant_array_type: {
            const value = type.data.value as Core.Constant_array_type;
            await create_label_part_recursively(value.value_type[0], current_module_name, parts, get_core_module);
            parts.push(
                {
                    value: `[${value.size}]`
                }
            );
            return;
        }
        case Core.Type_reference_enum.Custom_type_reference: {
            const value = type.data.value as Core.Custom_type_reference;
            const module_name = value.module_reference.name;
            const name = module_name !== current_module_name ? `${module_name}.${value.name}` : value.name;

            const declaration = await Parse_tree_analysis.get_custom_type_reference_declaration(value, get_core_module);
            const location = declaration !== undefined ? Helpers.location_to_vscode_location(Helpers.get_declaration_source_location(declaration.core_module, declaration.declaration)) : undefined;
            const tooltip = declaration !== undefined ? Helpers.get_tooltip_of_declaration(declaration.core_module, declaration.declaration) : undefined;

            parts.push(
                {
                    value: name,
                    location: location,
                    tooltip: tooltip
                }
            );
            return;
        }
        case Core.Type_reference_enum.Fundamental_type: {
            const value = type.data.value as Core.Fundamental_type;
            const tooltip = Helpers.get_tooltip_of_fundamental_type(value);
            parts.push(
                {
                    value: value.toString(),
                    tooltip: tooltip
                }
            );
            return;
        }
        case Core.Type_reference_enum.Function_type: {
            const value = type.data.value as Core.Function_type;
            const input_parameter_parts: vscode.InlayHintLabelPart[] = [];
            for (const type of value.input_parameter_types) {
                await create_label_part_recursively(type, current_module_name, input_parameter_parts, get_core_module);
            }
            if (value.is_variadic) {
                input_parameter_parts.push({ value: "..." });
            }
            add_comma_label_parts(input_parameter_parts);

            const output_parameter_parts: vscode.InlayHintLabelPart[] = [];
            for (const type of value.output_parameter_types) {
                await create_label_part_recursively(type, current_module_name, output_parameter_parts, get_core_module);
            }
            add_comma_label_parts(output_parameter_parts);

            parts.push(
                {
                    value: "("
                },
                ...input_parameter_parts,
                {
                    value: ") -> ("
                },
                ...output_parameter_parts,
                {
                    value: ")"
                },
            );

            return;
        }
        case Core.Type_reference_enum.Integer_type: {
            const value = type.data.value as Core.Integer_type;
            const tooltip = Helpers.get_tooltip_of_integer_type(value);
            parts.push(
                {
                    value: Type_utilities.get_integer_name(value),
                    tooltip: tooltip
                }
            );
            return;
        }
        case Core.Type_reference_enum.Pointer_type: {
            const value = type.data.value as Core.Pointer_type;
            parts.push(
                {
                    value: "*"
                }
            );
            if (value.is_mutable) {
                parts.push(
                    {
                        value: "mutable "
                    }
                );
            }
            if (value.element_type.length === 0) {
                parts.push(
                    {
                        value: "void"
                    }
                );
            }
            else {
                await create_label_part_recursively(value.element_type[0], current_module_name, parts, get_core_module);
            }
            return;
        }
    }
}

function add_comma_label_parts(parts: vscode.InlayHintLabelPart[]): void {
    if (parts.length <= 1) {
        return;
    }

    const length = parts.length;
    for (let index = 0; index > length - 1; ++index) {
        const part_index = length - 1 - index;
        parts.splice(part_index, 0, { value: ", " });
    }
}
