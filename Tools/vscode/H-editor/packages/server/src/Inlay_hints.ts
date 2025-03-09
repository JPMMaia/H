import * as Helpers from "./Helpers";
import * as Server_data from "./Server_data";

import * as vscode from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Core from "../../core/src/Core_intermediate_representation";
import * as Document from "../../core/src/Document";
import * as Parse_tree_analysis from "../../core/src/Parse_tree_analysis";
import * as Parse_tree_text_iterator from "../../core/src/Parse_tree_text_iterator";
import * as Parser_node from "../../core/src/Parser_node";
import * as Scan_new_changes from "../../core/src/Scan_new_changes";
import * as Type_utilities from "../../core/src/Type_utilities";

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
    const root = Document.get_parse_tree(document_state);
    if (root === undefined) {
        return [];
    }

    const start_node_iterator = get_start_iterator(document, parameters.range, root);

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

    const get_core_module = Server_data.create_get_core_module(server_data, workspace_uri);
    const core_module = await get_core_module(Document.get_module(document_state).name);
    if (core_module === undefined) {
        return [];
    }

    while (is_within_range(iterator)) {

        if (iterator.node !== undefined) {
            if (Parser_node.has_ancestor_with_name(iterator.root, iterator.node_position, ["Statement"])) {
                const result = Parse_tree_analysis.find_statement(core_module, iterator.root, iterator.node_position);
                if (result !== undefined) {
                    const descendants = Parser_node.find_descendants_if({ node: result.node, position: result.node_position }, node => node.word.value === "Expression_variable_declaration" || node.word.value === "Expression_call");
                    for (const descendant of descendants) {

                        const function_value = result.function_value;
                        const statement = result.statement;
                        const statement_node_position = result.node_position;
                        const statement_node = result.node;

                        if (descendant.node.word.value === "Expression_variable_declaration" && statement.expression.data.type === Core.Expression_enum.Variable_declaration_expression) {
                            const expression = statement.expression.data.value as Core.Variable_declaration_expression;
                            const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value);
                            const right_hand_side_type = await Parse_tree_analysis.get_expression_type(core_module, scope_declaration, iterator.root, statement_node_position, expression.right_hand_side, get_core_module);
                            if (right_hand_side_type !== undefined && right_hand_side_type.type.length > 0) {
                                const variable_name_descendant = Parser_node.find_descendant_position_if({ node: statement_node, position: statement_node_position }, node => node.word.value === "Variable_name") as { node: Parser_node.Node, position: number[] };
                                const variable_name_source_location = Parse_tree_text_iterator.get_node_source_location(iterator.root, iterator.text, [...variable_name_descendant.position, 0]) as Parser_node.Source_location;
                                const variable_name = variable_name_descendant.node.children[0].word.value;
                                const position: vscode.Position = {
                                    line: variable_name_source_location.line - 1,
                                    character: variable_name_source_location.column - 1 + variable_name.length
                                };

                                const label_parts = await create_label_parts_for_type(right_hand_side_type.type[0], core_module, get_core_module);

                                inlay_hints.push(
                                    {
                                        label: label_parts,
                                        position: position,
                                        kind: vscode.InlayHintKind.Type,
                                    }
                                );
                            }
                        }
                        else if (descendant.node.word.value === "Expression_call") {
                            const expression = Parse_tree_analysis.get_expression_from_node(core_module, descendant.node);
                            if (expression.data.type === Core.Expression_enum.Call_expression) {
                                const call_expression = expression.data.value as Core.Call_expression;
                                const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value);
                                const left_hand_side_type = await Parse_tree_analysis.get_expression_type(core_module, scope_declaration, iterator.root, statement_node_position, call_expression.expression, get_core_module);
                                if (left_hand_side_type !== undefined && left_hand_side_type.is_value && left_hand_side_type.type.length > 0 && left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                                    const custom_type_reference = left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
                                    const declaration = await Parse_tree_analysis.get_custom_type_reference_declaration(custom_type_reference, get_core_module);
                                    if (declaration !== undefined && declaration.declaration.type === Core.Declaration_type.Function) {
                                        const call_function_value = declaration.declaration.value as Core.Function;

                                        const arguments_node = descendant.node.children[2];
                                        const arguments_node_position = [...descendant.position, 2];
                                        for (let child_index = 0; child_index < arguments_node.children.length; child_index += 2) {

                                            const argument_index = child_index / 2;

                                            const argument_source_location = Parse_tree_text_iterator.get_node_source_location(iterator.root, iterator.text, [...arguments_node_position, child_index]) as Parser_node.Source_location;
                                            const position: vscode.Position = {
                                                line: argument_source_location.line - 1,
                                                character: argument_source_location.column - 1
                                            };

                                            const label_parts = create_label_parts_for_parameter(declaration.core_module, declaration.declaration, call_function_value.declaration, argument_index);

                                            inlay_hints.push(
                                                {
                                                    label: label_parts,
                                                    position: position,
                                                    kind: vscode.InlayHintKind.Parameter,
                                                }
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }

                    const rightmost_descendant = Parser_node.get_rightmost_descendant(result.node, result.node_position);
                    iterator = Parse_tree_text_iterator.go_to_next_node_position(iterator, rightmost_descendant.position);
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

function create_label_parts_for_parameter(
    core_module: Core.Module,
    declaration: Core.Declaration,
    function_declaration: Core.Function_declaration,
    input_parameter_index: number
): vscode.InlayHintLabelPart[] {

    if (input_parameter_index >= function_declaration.input_parameter_names.length) {
        return [];
    }

    const parts: vscode.InlayHintLabelPart[] = [];

    const input_parameter_name = function_declaration.input_parameter_names[input_parameter_index];

    const location = Helpers.location_to_vscode_location(Helpers.get_function_input_parameter_source_location(core_module, function_declaration, input_parameter_index));
    const tooltip = Helpers.get_tooltip_of_function_input_parameter(function_declaration, input_parameter_index);

    parts.push({
        value: input_parameter_name,
        location: location,
        tooltip: tooltip
    });

    parts.push({ value: ": " });

    return parts;
}

async function create_label_parts_for_type(
    type: Core.Type_reference,
    current_core_module: Core.Module,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<vscode.InlayHintLabelPart[]> {

    const parts: vscode.InlayHintLabelPart[] = [];
    parts.push({ value: ": " });

    await create_label_parts_for_type_recursively(type, current_core_module, parts, get_core_module);

    return parts;
}

export async function create_label_parts_for_type_recursively(
    type: Core.Type_reference,
    current_core_module: Core.Module,
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
            await create_label_parts_for_type_recursively(value.value_type[0], current_core_module, parts, get_core_module);
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

            if (module_name !== current_core_module.name) {
                const import_module = current_core_module.imports.find(import_module => import_module.module_name === module_name);
                if (import_module === undefined) {
                    return;
                }

                const imported_core_module = await get_core_module(import_module.module_name);
                if (imported_core_module === undefined) {
                    return;
                }

                const location = Helpers.location_to_vscode_location(Helpers.get_module_source_location(imported_core_module));
                const tooltip = Helpers.get_tooltip_of_module(imported_core_module);

                parts.push(
                    {
                        value: import_module.alias,
                        location: location,
                        tooltip: tooltip
                    }
                );

                parts.push(
                    {
                        value: "."
                    }
                );
            }

            const declaration = await Parse_tree_analysis.get_custom_type_reference_declaration(value, get_core_module);
            const location = declaration !== undefined ? Helpers.location_to_vscode_location(Helpers.get_declaration_source_location(declaration.core_module, declaration.declaration)) : undefined;

            parts.push(
                {
                    value: value.name,
                    location: location
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
        case Core.Type_reference_enum.Function_pointer_type: {
            const value = type.data.value as Core.Function_pointer_type;
            const input_parameter_parts: vscode.InlayHintLabelPart[] = [];
            for (const type of value.type.input_parameter_types) {
                await create_label_parts_for_type_recursively(type, current_core_module, input_parameter_parts, get_core_module);
            }
            if (value.type.is_variadic) {
                input_parameter_parts.push({ value: "..." });
            }
            add_comma_label_parts(input_parameter_parts);

            const output_parameter_parts: vscode.InlayHintLabelPart[] = [];
            for (const type of value.type.output_parameter_types) {
                await create_label_parts_for_type_recursively(type, current_core_module, output_parameter_parts, get_core_module);
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
                await create_label_parts_for_type_recursively(value.element_type[0], current_core_module, parts, get_core_module);
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
