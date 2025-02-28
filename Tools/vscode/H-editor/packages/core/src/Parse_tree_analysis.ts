import * as Core from "./Core_intermediate_representation";
import * as Document from "./Document";
import * as Language from "./Language";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";
import * as Parse_tree_text_position_cache from "./Parse_tree_text_position_cache";
import * as Parser from "./Parser";
import * as Parser_node from "./Parser_node";
import * as Scan_new_changes from "./Scan_new_changes";
import * as Scanner from "./Scanner";
import * as Text_formatter from "./Text_formatter";
import * as Type_utilities from "./Type_utilities";

export function find_statement(
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[]
): { function_value: Core.Function, statement: Core.Statement, node_position: number[], node: Parser_node.Node } | undefined {

    const statement_ancestor = get_statement_node_or_ancestor(root, node_position);
    if (statement_ancestor === undefined) {
        return undefined;
    }

    const function_ancestor = Parser_node.get_ancestor_with_name(root, statement_ancestor.position, "Function");
    if (function_ancestor === undefined) {
        return undefined;
    }

    const declaration_index = function_ancestor.position[1];
    const declaration = core_module.declarations[declaration_index];
    if (declaration === undefined || declaration.type !== Core.Declaration_type.Function) {
        return undefined;
    }

    const function_value = declaration.value as Core.Function;
    if (function_value.definition === undefined) {
        return undefined;
    }

    let current_block = function_value.definition.statements;
    let current_statement_node_position = statement_ancestor.position.slice(0, 7);
    let current_statement_node = Parser_node.get_node_at_position(root, current_statement_node_position);

    while (true) {
        const current_statement_index = current_statement_node_position[current_statement_node_position.length - 1];
        const current_statement = current_block[current_statement_index];

        const result = go_to_next_block_with_expression(current_statement, root, node_position, current_statement_node, current_statement_node_position);
        if (result === undefined) {
            return { function_value: function_value, statement: current_statement, node_position: current_statement_node_position, node: current_statement_node };
        }

        current_statement_node_position = result.position;
        current_statement_node = result.node;
        current_block = result.statements;
    }
}

export function go_to_next_statement(
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[]
): { function_value: Core.Function, statement: Core.Statement, node_position: number[], node: Parser_node.Node } | undefined {

    const statement_ancestor = get_statement_node_or_ancestor(root, node_position);
    if (statement_ancestor === undefined) {
        return undefined;
    }

    const next_statment_index = statement_ancestor.position[statement_ancestor.position.length - 1] + 1;
    const next_statement_node_position = [...statement_ancestor.position.slice(0, statement_ancestor.position.length - 1), next_statment_index];

    return find_statement(core_module, root, next_statement_node_position);
}

function get_statement_node_or_ancestor(
    root: Parser_node.Node,
    node_position: number[]
): { node: Parser_node.Node, position: number[] } | undefined {
    const node = Parser_node.get_node_at_position(root, node_position);
    if (node === undefined) {
        return undefined;
    }

    if (node.word.value === "Statement") {
        return { node: node, position: node_position };
    }

    return Parser_node.get_ancestor_with_name(root, node_position, "Statement");
}

export interface Function_input_variable_info {
    function_value: Core.Function;
    input_index: number;
}

export interface Function_output_variable_info {
    function_value: Core.Function;
    output_index: number;
}

export interface Variable_declaration_info {
    statement: Core.Statement;
    statement_node_position: number[];
}

export interface For_loop_variable_info {
    statement: Core.Statement;
    statement_node_position: number[];
}

export interface Import_alias_variable_info {
    core_module: Core.Module;
    import_module_with_alias: Core.Import_module_with_alias;
}

export interface Declaration_variable_info {
    core_module: Core.Module;
    declaration: Core.Declaration;
}

export enum Variable_info_type {
    Import_alias,
    Declaration,
    Function_input_variable,
    Function_output_variable,
    Variable_declaration,
    For_loop_variable
}

export interface Variable_info {
    type: Variable_info_type;
    value: Function_input_variable_info | Function_output_variable_info | Variable_declaration_info | For_loop_variable_info | Declaration_variable_info | Import_alias_variable_info;
}

function is_inside_function_post_condition(
    root: Parser_node.Node,
    scope_node_position: number[]
): boolean {

    const ancestor = Parser_node.get_ancestor_with_name(root, scope_node_position, "Function_postcondition");
    return ancestor != undefined;
}

export function find_variable_info(
    core_module: Core.Module,
    function_value: Core.Function,
    root: Parser_node.Node,
    scope_node_position: number[],
    variable_name: string,
): Variable_info | undefined {

    if (function_value.definition === undefined) {
        return undefined;
    }

    {
        const index = function_value.declaration.input_parameter_names.findIndex(name => name === variable_name);
        if (index !== -1) {
            return {
                type: Variable_info_type.Function_input_variable,
                value: {
                    function_value: function_value,
                    input_index: index
                }
            };
        }
    }

    if (is_inside_function_post_condition(root, scope_node_position)) {
        const index = function_value.declaration.output_parameter_names.findIndex(name => name === variable_name);
        if (index !== -1) {
            return {
                type: Variable_info_type.Function_output_variable,
                value: {
                    function_value: function_value,
                    output_index: index
                }
            };
        }
    }

    const function_definition_ancestor = Parser_node.get_ancestor_with_name(root, scope_node_position, "Function_definition");
    if (function_definition_ancestor !== undefined) {
        let current_statements_block: Core.Statement[] | undefined = function_value.definition.statements;
        let current_statements_block_node = function_definition_ancestor.node.children[0];
        let current_statements_block_position = [...function_definition_ancestor.position, 0];
        let current_statement_index = scope_node_position[current_statements_block_position.length] - 1;

        while (current_statements_block !== undefined && current_statement_index < current_statements_block.length) {
            for (let index = 0; index < current_statement_index; ++index) {
                const core_statement = current_statements_block[index];
                const core_statement_node_position = [...current_statements_block_position, index + 1];

                if (core_statement.expression.data.type === Core.Expression_enum.Variable_declaration_expression) {
                    const expression = core_statement.expression.data.value as Core.Variable_declaration_expression;
                    if (expression.name === variable_name) {
                        return {
                            type: Variable_info_type.Variable_declaration,
                            value: {
                                statement: core_statement,
                                statement_node_position: core_statement_node_position
                            }
                        };
                    }
                }
                else if (core_statement.expression.data.type === Core.Expression_enum.Variable_declaration_with_type_expression) {
                    const expression = core_statement.expression.data.value as Core.Variable_declaration_with_type_expression;
                    if (expression.name === variable_name) {
                        return {
                            type: Variable_info_type.Variable_declaration,
                            value: {
                                statement: core_statement,
                                statement_node_position: core_statement_node_position
                            }
                        };
                    }
                }
                else if (core_statement.expression.data.type === Core.Expression_enum.For_loop_expression) {
                    const expression = core_statement.expression.data.value as Core.For_loop_expression;
                    if (expression.variable_name === variable_name) {
                        return {
                            type: Variable_info_type.For_loop_variable,
                            value: {
                                statement: core_statement,
                                statement_node_position: core_statement_node_position
                            }
                        };
                    }
                }
            }

            const core_statement = current_statements_block[current_statement_index];
            const result = go_to_next_block_with_expression(core_statement, root, scope_node_position, current_statements_block_node, current_statements_block_position);
            if (result === undefined) {
                break;
            }
            current_statements_block_node = result.node;
            current_statements_block_position = result.position;
            current_statements_block = result.statements;
            current_statement_index = scope_node_position[current_statements_block_position.length] - 1;
        }
    }

    {
        const declaration = core_module.declarations.find(declaration => declaration.name === variable_name);
        if (declaration !== undefined) {
            return {
                type: Variable_info_type.Declaration,
                value: {
                    core_module: core_module,
                    declaration: declaration
                }
            };
        }
    }

    {
        const import_module = core_module.imports.find(import_module => import_module.alias === variable_name);
        if (import_module !== undefined) {
            return {
                type: Variable_info_type.Import_alias,
                value: {
                    core_module: core_module,
                    import_module_with_alias: import_module
                }
            };
        }
    }

    return undefined;
}

export function find_variable_name_node_from_variable_info(
    root: Parser_node.Node,
    variable_info: Variable_info,
): { node: Parser_node.Node, position: number[] } | undefined {

    if (variable_info.type === Variable_info_type.Variable_declaration) {
        const value = variable_info.value as Variable_declaration_info;
        const statement_node = Parser_node.get_node_at_position(root, value.statement_node_position);
        return Parser_node.find_descendant_position_if({ node: statement_node, position: value.statement_node_position }, node => node.word.value === "Variable_name");
    }
    else if (variable_info.type === Variable_info_type.For_loop_variable) {
        const value = variable_info.value as For_loop_variable_info;
        const statement_node = Parser_node.get_node_at_position(root, value.statement_node_position);
        return Parser_node.find_descendant_position_if({ node: statement_node, position: value.statement_node_position }, node => node.word.value === "Expression_for_loop_variable");
    }
    else if (variable_info.type === Variable_info_type.Function_input_variable) {
        const value = variable_info.value as Function_input_variable_info;
        const descendant_declaration_name = find_declaration_name_node(root, value.function_value.declaration.name);
        if (descendant_declaration_name !== undefined) {
            const ancestor_function_declaration = Parser_node.get_ancestor_with_name(root, descendant_declaration_name.position, "Function_declaration");
            if (ancestor_function_declaration !== undefined) {
                const descendant_function_parameters_parent = Parser_node.find_descendant_position_if(ancestor_function_declaration, node => node.word.value === "Function_input_parameters");
                if (descendant_function_parameters_parent !== undefined) {
                    const descendant_function_parameter = Parser_node.get_child(descendant_function_parameters_parent, 1 + value.input_index);
                    const descendant_function_parameter_name = Parser_node.find_descendant_position_if(descendant_function_parameter, node => node.word.value === "Function_parameter_name");
                    return descendant_function_parameter_name;
                }
            }
        }
    }
    else if (variable_info.type === Variable_info_type.Declaration) {
        const value = variable_info.value as Declaration_variable_info;
        return find_declaration_name_node(root, value.declaration.name);
    }
    else if (variable_info.type === Variable_info_type.Import_alias) {
        const value = variable_info.value as Import_alias_variable_info;
        const descendant_imports_parent = Parser_node.find_descendant_position_if({ node: root, position: [] }, node => node.word.value === "Imports");
        if (descendant_imports_parent !== undefined) {
            const descendant_imports = Parser_node.get_children(descendant_imports_parent);
            for (const descendant_import of descendant_imports) {
                const descendant_import_alias_name = Parser_node.find_descendant_position_if(descendant_import, node => node.word.value === "Import_alias");
                if (descendant_import_alias_name !== undefined) {
                    const import_alias_name = descendant_import_alias_name.node.children[0].word.value;
                    if (import_alias_name === value.import_module_with_alias.alias) {
                        return descendant_import_alias_name;
                    }
                }
            }
        }
    }

    return undefined;
}

export function find_declaration_name_node(
    root: Parser_node.Node,
    declaration_name: string
): { node: Parser_node.Node, position: number[] } | undefined {
    const descendant_declarations = Parser_node.find_descendants_if({ node: root, position: [] }, node => node.word.value === "Declaration");
    for (const descendant_declaration of descendant_declarations) {
        const descendant_declaration_name = Parser_node.find_descendant_position_if(descendant_declaration, node => {
            switch (node.word.value) {
                case "Alias_name":
                case "Enum_name":
                case "Function_name":
                case "Struct_name":
                case "Union_name":
                    return true;
                default: return false;
            }
        });

        if (descendant_declaration_name !== undefined) {
            const this_declaration_name = descendant_declaration_name.node.children[0].word.value;
            if (this_declaration_name === declaration_name) {
                return descendant_declaration_name;
            }
        }
    }

    return undefined;
}

export function get_variable_name_node_from_statement(
    statement: Core.Statement,
    statement_node: Parser_node.Node,
    statement_node_position: number[]
): { node: Parser_node.Node, position: number[] } | undefined {

    if (statement.expression.data.type === Core.Expression_enum.Variable_declaration_expression) {
        return Parser_node.find_descendant_position_if({ node: statement_node, position: statement_node_position }, node => node.word.value === "Variable_name");
    }
    else if (statement.expression.data.type === Core.Expression_enum.Variable_declaration_with_type_expression) {
        return Parser_node.find_descendant_position_if({ node: statement_node, position: statement_node_position }, node => node.word.value === "Variable_name");
    }
    else if (statement.expression.data.type === Core.Expression_enum.For_loop_expression) {
        return Parser_node.find_descendant_position_if({ node: statement_node, position: statement_node_position }, node => node.word.value === "Expression_for_loop_variable");
    }

    return undefined;
}

export async function find_variable_type(
    language_description: Language.Description,
    core_module: Core.Module,
    function_value: Core.Function,
    root: Parser_node.Node,
    scope_node_position: number[],
    variable_name: string,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Core.Type_reference | undefined> {

    if (function_value.definition === undefined) {
        return undefined;
    }

    const matches: Core.Type_reference[] = [];

    {
        const index = function_value.declaration.input_parameter_names.findIndex(name => name === variable_name);
        if (index !== -1) {
            const type = function_value.declaration.type.input_parameter_types[index];
            return type;
        }
    }

    if (is_inside_function_post_condition(root, scope_node_position)) {
        const index = function_value.declaration.output_parameter_names.findIndex(name => name === variable_name);
        if (index !== -1) {
            const type = function_value.declaration.type.output_parameter_types[index];
            return type;
        }
    }

    const function_definition_ancestor = Parser_node.get_ancestor_with_name(root, scope_node_position, "Function_definition");
    if (function_definition_ancestor === undefined) {
        return undefined;
    }

    let current_statements_block: Core.Statement[] | undefined = function_value.definition.statements;
    let current_statements_block_node = function_definition_ancestor.node.children[0];
    let current_statements_block_position = [...function_definition_ancestor.position, 0];
    let current_statement_index = scope_node_position[current_statements_block_position.length] - 1;

    while (current_statements_block !== undefined && current_statement_index >= 0 && current_statement_index < current_statements_block.length) {
        for (let index = 0; index <= current_statement_index; ++index) {
            const core_statement = current_statements_block[index];
            const next_scope_node_position = [...current_statements_block_position, index];

            if (core_statement.expression.data.type === Core.Expression_enum.Variable_declaration_expression) {
                const expression = core_statement.expression.data.value as Core.Variable_declaration_expression;
                if (expression.name === variable_name) {
                    const declaration = create_declaration_from_function_value(function_value);
                    const expression_type = await get_expression_type(language_description, core_module, declaration, root, next_scope_node_position, expression.right_hand_side, get_core_module);
                    if (expression_type !== undefined && expression_type.is_value && expression_type.type.length > 0) {
                        matches.push(expression_type.type[0]);
                    }
                }
            }
            else if (core_statement.expression.data.type === Core.Expression_enum.Variable_declaration_with_type_expression) {
                const expression = core_statement.expression.data.value as Core.Variable_declaration_with_type_expression;
                if (expression.name === variable_name) {
                    matches.push(expression.type);
                }
            }
            else if (core_statement.expression.data.type === Core.Expression_enum.For_loop_expression) {
                const expression = core_statement.expression.data.value as Core.For_loop_expression;
                if (expression.variable_name === variable_name) {
                    const declaration = create_declaration_from_function_value(function_value);
                    const expression_type = await get_expression_type(language_description, core_module, declaration, root, next_scope_node_position, expression.range_begin, get_core_module);
                    if (expression_type !== undefined && expression_type.is_value && expression_type.type.length > 0) {
                        matches.push(expression_type.type[0]);
                    }
                }
            }
        }

        const core_statement = current_statements_block[current_statement_index];
        const result = go_to_next_block_with_expression(core_statement, root, scope_node_position, current_statements_block_node, current_statements_block_position);
        if (result === undefined) {
            break;
        }
        current_statements_block_node = result.node;
        current_statements_block_position = result.position;
        current_statements_block = result.statements;
        current_statement_index = scope_node_position[current_statements_block_position.length] - 1;
    }

    return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

function go_to_next_block_with_expression(
    core_statement: Core.Statement,
    root: Parser_node.Node,
    scope_node_position: number[],
    current_node: Parser_node.Node,
    current_node_position: number[]
): { node: Parser_node.Node, position: number[], statements: Core.Statement[] } | undefined {
    switch (core_statement.expression.data.type) {
        case Core.Expression_enum.Block_expression: {
            const expression = core_statement.expression.data.value as Core.Block_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_block_statements");
            if (result !== undefined) {
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.statements
                };
            }
            break;
        }
        case Core.Expression_enum.For_loop_expression: {
            const expression = core_statement.expression.data.value as Core.For_loop_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_for_loop_statements");
            if (result !== undefined) {
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.then_statements
                };
            }
            break;
        }
        case Core.Expression_enum.If_expression: {
            const expression = core_statement.expression.data.value as Core.If_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_if_statements");
            if (result !== undefined) {
                const serie_index = get_if_serie_index(root, result.position);
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.series[serie_index].then_statements
                };
            }
            break;
        }
        case Core.Expression_enum.Switch_expression: {
            const expression = core_statement.expression.data.value as Core.Switch_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_switch_case_statements");
            if (result !== undefined) {
                const switch_case_index = result.position[result.position.length - 2];
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.cases[switch_case_index].statements
                };
            }
            break;
        }
        case Core.Expression_enum.While_loop_expression: {
            const expression = core_statement.expression.data.value as Core.While_loop_expression;
            const result = go_to_next_block(scope_node_position, current_node, current_node_position, "Expression_while_loop_statements");
            if (result !== undefined) {
                return {
                    node: result.node,
                    position: result.position,
                    statements: expression.then_statements
                };
            }
            break;
        }
    }

    return undefined;
}

function get_if_serie_index(
    root: Parser_node.Node,
    node_position: number[]
): number {
    let serie_index = 0;

    let current_node_position = Parser_node.get_parent_position(node_position);

    for (let position_index = 0; position_index < node_position.length; ++position_index) {

        const current_node = Parser_node.get_node_at_position(root, current_node_position);

        if (current_node.word.value === "Expression_if_else") {
            serie_index += 1;
        }
        else if (current_node.word.value === "Statement") {
            break;
        }

        current_node_position = Parser_node.get_parent_position(current_node_position);
    }

    return serie_index;
}

function go_to_next_block(
    before_cursor_node_position: number[],
    current_node: Parser_node.Node,
    current_node_position: number[],
    statements_label: string
): { node: Parser_node.Node, position: number[] } | undefined {

    while (current_node_position.length < before_cursor_node_position.length) {
        const child_index = before_cursor_node_position[current_node_position.length];
        current_node = current_node.children[child_index];
        current_node_position = [...current_node_position, child_index];

        if (current_node.word.value === statements_label) {
            return { node: current_node, position: current_node_position };
        }
    }

    return undefined;
}

export interface Expression_type_reference {
    type: Core.Type_reference[];
    is_value: boolean;
}

export async function get_expression_type(
    language_description: Language.Description,
    core_module: Core.Module,
    scope_declaration: Core.Declaration | undefined,
    root: Parser_node.Node,
    scope_node_position: number[],
    expression: Core.Expression,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Expression_type_reference | undefined> {

    switch (expression.data.type) {
        case Core.Expression_enum.Access_expression: {
            const value = expression.data.value as Core.Access_expression;

            if (value.expression.data.type === Core.Expression_enum.Variable_expression) {
                const variable_expression = value.expression.data.value as Core.Variable_expression;
                const import_module = core_module.imports.find(import_module => import_module.alias === variable_expression.name);
                if (import_module !== undefined) {
                    const custom_type_reference = {
                        module_reference: {
                            name: import_module.module_name
                        },
                        name: value.member_name
                    };
                    const module_declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
                    if (module_declaration !== undefined) {
                        const declaration = module_declaration.declaration;
                        if (declaration.type === Core.Declaration_type.Function) {
                            const function_value = declaration.value as Core.Function;
                            return {
                                type: [Type_utilities.create_function_pointer_type_from_declaration(function_value.declaration)],
                                is_value: true
                            };
                        }
                        else if (declaration.type === Core.Declaration_type.Global_variable) {
                            const global_variable = declaration.value as Core.Global_variable_declaration;
                            return get_global_variable_type(language_description, core_module, global_variable, root, get_core_module);
                        }
                        else {
                            return {
                                type: [create_custom_type_reference(import_module.module_name, declaration.name)],
                                is_value: false
                            };
                        }
                    }
                }
            }

            const left_hand_side_type = await get_expression_type(language_description, core_module, scope_declaration, root, scope_node_position, value.expression, get_core_module);
            if (left_hand_side_type !== undefined && left_hand_side_type.type.length > 0) {
                if (left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                    const custom_type_reference = left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
                    const module_declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
                    if (module_declaration !== undefined) {
                        const underlying_module_declaration = await get_underlying_type_declaration(module_declaration.core_module, module_declaration.declaration, get_core_module);
                        if (underlying_module_declaration !== undefined) {
                            const underlying_declaration = underlying_module_declaration.declaration;
                            if (underlying_declaration.type === Core.Declaration_type.Enum) {
                                const enum_declaration = underlying_declaration.value as Core.Enum_declaration;
                                const member_index = enum_declaration.values.findIndex(member => member.name === value.member_name);
                                const enum_type_reference = [create_custom_type_reference(underlying_module_declaration.core_module.name, enum_declaration.name)];
                                if (member_index !== -1) {
                                    return {
                                        type: enum_type_reference,
                                        is_value: true
                                    };
                                }
                                else {
                                    return {
                                        type: enum_type_reference,
                                        is_value: false
                                    };
                                }
                            }
                            else if (underlying_declaration.type === Core.Declaration_type.Struct) {
                                const struct_declaration = underlying_declaration.value as Core.Struct_declaration;
                                const member_index = struct_declaration.member_names.findIndex(member_name => member_name === value.member_name);
                                if (member_index !== -1) {
                                    return {
                                        type: [struct_declaration.member_types[member_index]],
                                        is_value: true
                                    };
                                }
                                else {
                                    return {
                                        type: [create_custom_type_reference(underlying_module_declaration.core_module.name, struct_declaration.name)],
                                        is_value: false
                                    };
                                }
                            }
                            else if (underlying_declaration.type === Core.Declaration_type.Union) {
                                const union_declaration = underlying_declaration.value as Core.Union_declaration;
                                const member_index = union_declaration.member_names.findIndex(member_name => member_name === value.member_name);
                                if (member_index !== -1) {
                                    return {
                                        type: [union_declaration.member_types[member_index]],
                                        is_value: true
                                    };
                                }
                                else {
                                    return {
                                        type: [create_custom_type_reference(underlying_module_declaration.core_module.name, union_declaration.name)],
                                        is_value: false
                                    };
                                }
                            }
                            else if (underlying_declaration.type === Core.Declaration_type.Function) {
                                const function_value = underlying_declaration.value as Core.Function;
                                return {
                                    type: [
                                        {
                                            data: {
                                                type: Core.Type_reference_enum.Function_pointer_type,
                                                value: Type_utilities.create_function_pointer_type_from_declaration(function_value.declaration)
                                            }
                                        }
                                    ],
                                    is_value: true
                                };
                            }
                        }
                    }
                }
            }
            break;
        }
        case Core.Expression_enum.Binary_expression: {
            const value = expression.data.value as Core.Binary_expression;

            switch (value.operation) {
                case Core.Binary_operation.Equal:
                case Core.Binary_operation.Not_equal:
                case Core.Binary_operation.Less_than:
                case Core.Binary_operation.Less_than_or_equal_to:
                case Core.Binary_operation.Greater_than:
                case Core.Binary_operation.Greater_than_or_equal_to:
                case Core.Binary_operation.Logical_and:
                case Core.Binary_operation.Logical_or:
                case Core.Binary_operation.Has:
                    return {
                        type: [create_boolean_type()],
                        is_value: true
                    };
            }

            return get_expression_type(language_description, core_module, scope_declaration, root, scope_node_position, value.left_hand_side, get_core_module);
        }
        case Core.Expression_enum.Call_expression: {
            const value = expression.data.value as Core.Call_expression;
            const left_hand_side_type = await get_expression_type(language_description, core_module, scope_declaration, root, scope_node_position, value.expression, get_core_module);
            if (left_hand_side_type !== undefined && left_hand_side_type.is_value && left_hand_side_type.type.length > 0) {
                if (left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                    const custom_type_reference = left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
                    const declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
                    if (declaration !== undefined && declaration.declaration.type === Core.Declaration_type.Function) {
                        const function_value = declaration.declaration.value as Core.Function;
                        // TODO handle multiple return values
                        return {
                            type: function_value.declaration.type.output_parameter_types,
                            is_value: true
                        };
                    }
                }
                else if (left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Function_pointer_type) {
                    const function_pointer_type = left_hand_side_type.type[0].data.value as Core.Function_pointer_type;
                    // TODO handle multiple return values
                    return {
                        type: function_pointer_type.type.output_parameter_types,
                        is_value: true
                    };
                }
            }
            return undefined;
        }
        case Core.Expression_enum.Cast_expression: {
            const value = expression.data.value as Core.Cast_expression;
            return {
                type: [value.destination_type],
                is_value: true
            };
        }
        case Core.Expression_enum.Constant_array_expression: {
            const value = expression.data.value as Core.Constant_array_expression;
            if (value.array_data.length === 0) {
                const array_type: Core.Constant_array_type = {
                    value_type: [],
                    size: value.array_data.length
                };
                return {
                    type: [{ data: { type: Core.Type_reference_enum.Constant_array_type, value: array_type } }],
                    is_value: true
                };
            }

            const element_type = await get_expression_type(language_description, core_module, scope_declaration, root, scope_node_position, value.array_data[0].expression, get_core_module);
            if (element_type === undefined || !element_type.is_value) {
                return undefined;
            }

            const array_type: Core.Constant_array_type = {
                value_type: element_type.type,
                size: value.array_data.length
            };

            return {
                type: [{ data: { type: Core.Type_reference_enum.Constant_array_type, value: array_type } }],
                is_value: true
            };
        }
        case Core.Expression_enum.Constant_expression: {
            const value = expression.data.value as Core.Constant_expression;
            return {
                type: [value.type],
                is_value: true
            };
        }
        case Core.Expression_enum.Instantiate_expression: {
            const custom_type_reference = await find_instantiate_custom_type_reference_from_node(language_description, core_module, root, scope_node_position, get_core_module);
            if (custom_type_reference === undefined) {
                return undefined;
            }
            return {
                type: [
                    {
                        data: {
                            type: Core.Type_reference_enum.Custom_type_reference,
                            value: custom_type_reference
                        }
                    }
                ],
                is_value: true
            };
        }
        case Core.Expression_enum.Null_pointer_expression: {
            return {
                type: [
                    Type_utilities.create_null_type()
                ],
                is_value: true
            };
        }
        case Core.Expression_enum.Parenthesis_expression: {
            const value = expression.data.value as Core.Parenthesis_expression;
            return get_expression_type(language_description, core_module, scope_declaration, root, scope_node_position, value.expression, get_core_module);
        }
        case Core.Expression_enum.Ternary_condition_expression: {
            const value = expression.data.value as Core.Ternary_condition_expression;
            return get_expression_type(language_description, core_module, scope_declaration, root, scope_node_position, value.then_statement.expression, get_core_module);
        }
        case Core.Expression_enum.Unary_expression: {
            const value = expression.data.value as Core.Unary_expression;
            const expression_type = await get_expression_type(language_description, core_module, scope_declaration, root, scope_node_position, value.expression, get_core_module);
            if (expression_type !== undefined && expression_type.is_value && expression_type.type.length > 0) {
                if (value.operation === Core.Unary_operation.Address_of) {
                    return {
                        type: [create_pointer_type(expression_type.type, false)],
                        is_value: true
                    };
                }
                else if (value.operation === Core.Unary_operation.Indirection) {
                    if (expression_type.type[0].data.type === Core.Type_reference_enum.Pointer_type) {
                        const pointer_type = expression_type.type[0].data.value as Core.Pointer_type;
                        if (pointer_type.element_type.length > 0) {
                            return {
                                type: [pointer_type.element_type[0]],
                                is_value: true
                            };
                        }
                    }
                }
                else {
                    return expression_type;
                }
            }
            break;
        }
        case Core.Expression_enum.Variable_expression: {
            const value = expression.data.value as Core.Variable_expression;

            if (scope_declaration !== undefined && scope_declaration.type === Core.Declaration_type.Function) {
                const variable_type = await find_variable_type(language_description, core_module, scope_declaration.value as Core.Function, root, scope_node_position, value.name, get_core_module);
                if (variable_type !== undefined) {
                    return {
                        type: [variable_type],
                        is_value: true
                    };
                }
            }

            const declaration = core_module.declarations.find(declaration => declaration.name === value.name);
            if (declaration !== undefined) {
                if (declaration.type === Core.Declaration_type.Global_variable) {
                    const global_variable = declaration.value as Core.Global_variable_declaration;
                    return get_global_variable_type(language_description, core_module, global_variable, root, get_core_module);
                }

                return {
                    type: [create_custom_type_reference(core_module.name, declaration.name)],
                    is_value: declaration.type === Core.Declaration_type.Function
                };
            }
        }
    }

    return undefined;
}

export async function get_global_variable_type(
    language_description: Language.Description,
    core_module: Core.Module,
    global_variable: Core.Global_variable_declaration,
    root: Parser_node.Node,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Expression_type_reference | undefined> {

    if (global_variable.type !== undefined) {
        return {
            type: [global_variable.type],
            is_value: true
        };
    }

    const type = await get_expression_type(language_description, core_module, undefined, root, [], global_variable.initial_value.expression, get_core_module);
    return type;;
}

export async function get_global_variable(
    core_module: Core.Module,
    module_name: string,
    global_variable_name: string,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ module: Core.Module, declaration: Core.Declaration } | undefined> {

    const declaration_module = core_module.name === module_name ? core_module : await get_core_module(module_name);
    if (declaration_module === undefined) {
        return undefined;
    }

    const declaration = declaration_module.declarations.find(declaration => declaration.name === global_variable_name);
    if (declaration === undefined || declaration.type !== Core.Declaration_type.Global_variable) {
        return undefined;
    }

    return {
        module: declaration_module,
        declaration: declaration
    };
}

export async function get_global_variable_from_expression(
    core_module: Core.Module,
    expression: Core.Expression,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ module: Core.Module, declaration: Core.Declaration } | undefined> {
    switch (expression.data.type) {
        case Core.Expression_enum.Access_expression: {
            const access_expression = expression.data.value as Core.Access_expression;
            if (access_expression.expression.data.type !== Core.Expression_enum.Variable_expression) {
                return undefined;
            }

            const left_hand_side = access_expression.expression.data.value as Core.Variable_expression;
            const module_name = left_hand_side.name;
            return get_global_variable(core_module, module_name, access_expression.member_name, get_core_module);
        }
        case Core.Expression_enum.Variable_expression: {
            const variable_expression = expression.data.value as Core.Variable_expression;
            return get_global_variable(core_module, core_module.name, variable_expression.name, get_core_module);
        }
        default: {
            return undefined;
        }
    }
}

export function get_type_reference_from_node(
    language_description: Language.Description,
    core_module: Core.Module,
    node: Parser_node.Node
): Core.Type_reference[] {
    const type_reference = Parse_tree_convertor_mappings.node_to_type_reference(node);

    for (const type of type_reference) {
        fix_custom_type_reference(core_module, type);
    }

    return type_reference;
}

export function get_expression_from_node(
    language_description: Language.Description,
    core_module: Core.Module,
    node: Parser_node.Node
): Core.Expression {
    const expression = Parse_tree_convertor_mappings.node_to_expression(node);

    const visitor = (type: Core.Type_reference) => {
        fix_custom_type_reference(core_module, type);
    };

    Parse_tree_convertor.visit_types_of_expression(expression, visitor);

    return expression;
}

function fix_custom_type_reference(
    core_module: Core.Module,
    type: Core.Type_reference
) {
    const visitor = (type: Core.Type_reference) => {
        if (type.data.type === Core.Type_reference_enum.Custom_type_reference) {
            const value = type.data.value as Core.Custom_type_reference;
            if (value.module_reference.name.length === 0) {
                value.module_reference.name = core_module.name;
            }
            else {
                const import_module = core_module.imports.find(import_module => import_module.alias === value.module_reference.name);
                if (import_module !== undefined) {
                    value.module_reference.name = import_module.module_name;
                }
            }
        }
    };

    Parse_tree_convertor.visit_types(type, visitor);
}

export async function get_type_reference_declaration(
    type_reference: Core.Type_reference[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ core_module: Core.Module, declaration: Core.Declaration } | undefined> {

    if (type_reference.length === 0) {
        return undefined;
    }

    if (type_reference[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
        const custom_type_reference = type_reference[0].data.value as Core.Custom_type_reference;
        return get_custom_type_reference_declaration(custom_type_reference, get_core_module);
    }

    return undefined;
}

export async function get_custom_type_reference_declaration(
    custom_type_reference: Core.Custom_type_reference,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ core_module: Core.Module, declaration: Core.Declaration } | undefined> {

    const core_module = await get_core_module(custom_type_reference.module_reference.name);
    if (core_module === undefined) {
        return undefined;
    }

    const declaration = core_module.declarations.find(declaration => declaration.name === custom_type_reference.name);
    if (declaration === undefined) {
        return undefined;
    }

    return {
        core_module: core_module,
        declaration: declaration
    };
}

export async function get_underlying_type(
    type_reference: Core.Type_reference[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Core.Type_reference[]> {

    const module_declaration = await get_type_reference_declaration(type_reference, get_core_module);
    if (module_declaration !== undefined) {
        if (module_declaration.declaration.type === Core.Declaration_type.Alias) {
            const alias_type_declaration = module_declaration.declaration.value as Core.Alias_type_declaration;
            return get_underlying_type(alias_type_declaration.type, get_core_module);
        }
    }

    return type_reference;
}

export async function get_underlying_type_declaration(
    core_module: Core.Module,
    declaration: Core.Declaration,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ core_module: Core.Module, declaration: Core.Declaration } | undefined> {

    if (declaration.type !== Core.Declaration_type.Alias) {
        return {
            core_module: core_module,
            declaration: declaration
        };
    }

    let current_core_module = core_module;
    let current_declaration = declaration;

    while (current_declaration.type === Core.Declaration_type.Alias) {
        const alias_type_declaration = current_declaration.value as Core.Alias_type_declaration;
        if (alias_type_declaration.type.length === 0 || alias_type_declaration.type[0].data.type !== Core.Type_reference_enum.Custom_type_reference) {
            return { core_module: core_module, declaration: declaration };
        }

        const custom_type_reference = alias_type_declaration.type[0].data.value as Core.Custom_type_reference;

        const next_declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
        if (next_declaration === undefined) {
            return undefined;
        }

        current_core_module = next_declaration.core_module;
        current_declaration = next_declaration.declaration;
    }

    return {
        core_module: current_core_module,
        declaration: current_declaration
    };
}

export async function get_function_value_from_node(
    language_description: Language.Description,
    core_module: Core.Module,
    node: Parser_node.Node,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ core_module: Core.Module, function_value: Core.Function } | undefined> {
    const expression = get_expression_from_node(language_description, core_module, node);
    if (expression.data.type === Core.Expression_enum.Access_expression) {
        const access_expression = expression.data.value as Core.Access_expression;
        const left_hand_side_expression = access_expression.expression;
        if (left_hand_side_expression.data.type === Core.Expression_enum.Variable_expression) {
            const module_alias_expression = left_hand_side_expression.data.value as Core.Variable_expression;
            const import_module = core_module.imports.find(value => value.alias === module_alias_expression.name);
            if (import_module !== undefined) {
                const imported_core_module = await get_core_module(import_module.module_name);
                if (imported_core_module !== undefined) {
                    const declaration = imported_core_module.declarations.find(declaration => declaration.name === access_expression.member_name);
                    if (declaration !== undefined && declaration.type === Core.Declaration_type.Function) {
                        const function_value = declaration.value as Core.Function;
                        return {
                            core_module: imported_core_module,
                            function_value: function_value
                        };
                    }
                }
            }
        }
    }
    else if (expression.data.type === Core.Expression_enum.Variable_expression) {
        const variable_expression = expression.data.value as Core.Variable_expression;
        const function_name = variable_expression.name;
        const declaration = core_module.declarations.find(declaration => declaration.name === function_name);
        if (declaration !== undefined && declaration.type === Core.Declaration_type.Function) {
            const function_value = declaration.value as Core.Function;
            return {
                core_module: core_module,
                function_value: function_value
            };
        }
    }

    return undefined;
}

export function get_struct_declaration_that_contains_node_position(
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[]
): Core.Struct_declaration | undefined {
    const ancestor_struct = Parser_node.get_ancestor_with_name(root, node_position, "Struct");
    if (ancestor_struct === undefined) {
        return undefined;
    }

    const descendant_struct_name = Parser_node.find_descendant_position_if(ancestor_struct, node => node.word.value === "Struct_name");
    if (descendant_struct_name === undefined) {
        return undefined;
    }

    const child = descendant_struct_name.node.children[0];
    if (child === undefined) {
        return undefined;
    }

    const struct_name = child.word.value;
    const declaration = core_module.declarations.find(declaration => declaration.name === struct_name);
    if (declaration === undefined || declaration.type !== Core.Declaration_type.Struct) {
        return undefined;
    }

    return declaration.value as Core.Struct_declaration;
}

export function get_function_value_that_contains_node_position(
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[]
): Core.Function | undefined {
    const ancestor_function = Parser_node.get_ancestor_with_name(root, node_position, "Function");
    if (ancestor_function === undefined) {
        return undefined;
    }

    const descendant_function_name = Parser_node.find_descendant_position_if(ancestor_function, node => node.word.value === "Function_name");
    if (descendant_function_name === undefined) {
        return undefined;
    }

    const child = descendant_function_name.node.children[0];
    if (child === undefined) {
        return undefined;
    }

    const function_name = child.word.value;
    const declaration = core_module.declarations.find(declaration => declaration.name === function_name);
    if (declaration === undefined || declaration.type !== Core.Declaration_type.Function) {
        return undefined;
    }

    return declaration.value as Core.Function;
}

export async function get_function_value_and_parameter_index_from_expression_call(
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ core_module: Core.Module, function_value: Core.Function, input_parameter_index: number, expression_call_node_position: number[] } | undefined> {

    const ancestor_expression_call = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Expression_call");
    if (ancestor_expression_call !== undefined) {

        const active_input_parameter_index = get_cursor_parameter_index_at_expression(
            ancestor_expression_call.position,
            before_cursor_node_position
        );

        if (active_input_parameter_index !== -1) {
            const left_hand_side_node = ancestor_expression_call.node.children[0];
            const module_function = await get_function_value_from_node(language_description, core_module, left_hand_side_node, get_core_module);
            if (module_function !== undefined) {
                return {
                    core_module: module_function.core_module,
                    function_value: module_function.function_value,
                    input_parameter_index: active_input_parameter_index,
                    expression_call_node_position: ancestor_expression_call.position
                };
            }
        }
    }

    return undefined;
}

export function get_cursor_parameter_index_at_expression(
    expression_call_node_position: number[],
    before_cursor_node_position: number[]
): number {
    const child_index = before_cursor_node_position[expression_call_node_position.length];
    if (child_index === 1) {
        return 0;
    }
    else if (child_index === 2) {
        const argument_index = before_cursor_node_position[expression_call_node_position.length + 1];
        return Math.ceil(argument_index / 2);
    }
    else {
        return -1;
    }
}

export function get_function_value_and_parameter_index_at_declaration(
    core_module: Core.Module,
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): { function_value: Core.Function, parameter_index: number, is_input: boolean } | undefined {

    const ancestor_function_declaration = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Function_declaration");
    if (ancestor_function_declaration === undefined) {
        return undefined;
    }

    const first_index = before_cursor_node_position[ancestor_function_declaration.position.length];
    if (first_index === undefined) {
        return undefined;
    }

    const function_value = get_function_value_that_contains_node_position(core_module, root, before_cursor_node_position);
    if (function_value === undefined) {
        return undefined;
    }

    const get_parameter_index = (begin_parameter_index: number): number | undefined => {
        if (first_index === begin_parameter_index) {
            return 0;
        }

        const second_index = before_cursor_node_position[ancestor_function_declaration.position.length + 1];
        if (second_index === undefined) {
            return undefined;
        }

        const parameter_index = Math.ceil(second_index / 2);
        return parameter_index;
    };

    const begin_input_parameter_index = ancestor_function_declaration.node.children.findIndex(node => node.word.value === "(");
    const end_input_parameter_index = ancestor_function_declaration.node.children.findIndex(node => node.word.value === ")");
    const is_input_parameter = begin_input_parameter_index <= first_index && first_index < end_input_parameter_index;

    if (is_input_parameter) {
        const parameter_index = get_parameter_index(begin_input_parameter_index);
        if (parameter_index !== undefined) {
            return {
                function_value: function_value,
                parameter_index: parameter_index,
                is_input: true
            };
        }
    }

    const begin_output_parameter_index = ancestor_function_declaration.node.children.findIndex((node, index) => node.word.value === "(" && index > end_input_parameter_index);
    const end_output_parameter_index = ancestor_function_declaration.node.children.findIndex((node, index) => node.word.value === ")" && index > begin_output_parameter_index);
    const is_output_parameter = begin_output_parameter_index <= first_index && first_index < end_output_parameter_index;

    if (is_output_parameter) {
        const parameter_index = get_parameter_index(begin_output_parameter_index);
        if (parameter_index !== undefined) {
            return {
                function_value: function_value,
                parameter_index: parameter_index,
                is_input: false
            };
        }
    }

    return undefined;
}

export async function find_instantiate_custom_type_reference_from_node(
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Core.Custom_type_reference | undefined> {

    const ancestor_expression_instantiate = Parser_node.get_ancestor_with_name(root, node_position, "Expression_instantiate");
    if (ancestor_expression_instantiate !== undefined) {
        const custom_type_reference = await find_instantiate_custom_type_reference_from_node(language_description, core_module, root, ancestor_expression_instantiate.position, get_core_module);
        if (custom_type_reference !== undefined) {
            const declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
            if (declaration !== undefined && declaration.declaration.type === Core.Declaration_type.Struct) {
                const struct_declaration = declaration.declaration.value as Core.Struct_declaration;

                const instantiate_member_index = node_position[node_position.length - 3];
                const instantiate_member_name_position = [0, instantiate_member_index, 0, 0];
                if (Parser_node.is_valid_position(ancestor_expression_instantiate.node, instantiate_member_name_position)) {
                    const instantiate_member_name_node = Parser_node.get_node_at_position(ancestor_expression_instantiate.node, instantiate_member_name_position);
                    const instantiate_member_name = instantiate_member_name_node.word.value;

                    const struct_member_index = struct_declaration.member_names.findIndex(name => name === instantiate_member_name);
                    if (struct_member_index !== -1) {
                        const type = struct_declaration.member_types[struct_member_index];
                        if (type.data.type === Core.Type_reference_enum.Custom_type_reference) {
                            return type.data.value as Core.Custom_type_reference;
                        }
                    }
                }
            }
        }
    }

    const ancestor_variable_declaration_with_type = Parser_node.get_ancestor_with_name(root, node_position, "Expression_variable_declaration_with_type");
    if (ancestor_variable_declaration_with_type !== undefined) {
        const declaration_type_node = ancestor_variable_declaration_with_type.node.children[3];
        const type_reference = get_type_reference_from_node(language_description, core_module, declaration_type_node.children[0]);
        if (type_reference.length > 0) {
            if (type_reference[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                return type_reference[0].data.value as Core.Custom_type_reference;
            }
        }
    }

    const ancestor_struct_member = Parser_node.get_ancestor_with_name(root, node_position, "Struct_member");
    if (ancestor_struct_member !== undefined) {
        const struct_declaration = get_struct_declaration_that_contains_node_position(core_module, root, node_position);
        if (struct_declaration !== undefined) {
            const member_index = ancestor_struct_member.position[ancestor_struct_member.position.length - 1] - 1;
            const member_type = struct_declaration.member_types[member_index];
            if (member_type !== undefined) {
                if (member_type.data.type === Core.Type_reference_enum.Custom_type_reference) {
                    return member_type.data.value as Core.Custom_type_reference;
                }
            }
        }
    }

    const ancestor_return_expression = Parser_node.get_ancestor_with_name(root, node_position, "Expression_return");
    if (ancestor_return_expression !== undefined) {
        const function_value = get_function_value_that_contains_node_position(core_module, root, node_position);
        if (function_value !== undefined) {
            if (function_value.declaration.type.output_parameter_types.length > 0) {
                // TODO multiple return types
                const return_type = function_value.declaration.type.output_parameter_types[0];
                if (return_type.data.type === Core.Type_reference_enum.Custom_type_reference) {
                    return return_type.data.value as Core.Custom_type_reference;
                }
            }
        }
    }

    const ancestor_assignment_expression = Parser_node.get_ancestor_with_name(root, node_position, "Expression_assignment");
    if (ancestor_assignment_expression !== undefined) {
        const function_value = get_function_value_that_contains_node_position(core_module, root, node_position);
        if (function_value !== undefined) {
            const left_hand_side_node = ancestor_assignment_expression.node.children[0];
            const left_hand_side_expression = get_expression_from_node(language_description, core_module, left_hand_side_node);
            const declaration = create_declaration_from_function_value(function_value);
            const left_hand_side_type = await get_expression_type(language_description, core_module, declaration, root, node_position, left_hand_side_expression, get_core_module);
            if (left_hand_side_type !== undefined && left_hand_side_type.is_value && left_hand_side_type.type.length > 0 && left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                return left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
            }
        }
    }

    const expression_call_info = await get_function_value_and_parameter_index_from_expression_call(
        language_description, core_module, root, node_position, get_core_module
    );
    if (expression_call_info !== undefined) {
        const function_declaration = expression_call_info.function_value.declaration;
        const parameter_type = function_declaration.type.input_parameter_types[expression_call_info.input_parameter_index];
        if (parameter_type !== undefined && parameter_type.data.type === Core.Type_reference_enum.Custom_type_reference) {
            return parameter_type.data.value as Core.Custom_type_reference;
        }
    }

    return undefined;
}

export async function find_instantiate_declaration_from_node(
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    node_position: number[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ core_module: Core.Module, declaration: Core.Declaration } | undefined> {
    const custom_type_reference = await find_instantiate_custom_type_reference_from_node(language_description, core_module, root, node_position, get_core_module);
    if (custom_type_reference === undefined) {
        return undefined;
    }

    const module_declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
    if (module_declaration === undefined) {
        return undefined;
    }

    const underlying_type_module_declaration = await get_underlying_type_declaration(module_declaration.core_module, module_declaration.declaration, get_core_module);
    if (underlying_type_module_declaration === undefined) {
        return undefined;
    }

    return underlying_type_module_declaration;
}

export async function find_instantiate_member_from_node(
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    find_best_match: boolean,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ core_module: Core.Module, declaration: Core.Declaration, member_index: number, member_name: string } | undefined> {

    const ancestor_expression_instantiate = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Expression_instantiate");
    if (ancestor_expression_instantiate === undefined) {
        return undefined;
    }

    const previous_member_name = get_previous_instantiate_member_name_at_cursor(root, before_cursor_node_position, ancestor_expression_instantiate.position);

    const custom_type_reference = await find_instantiate_custom_type_reference_from_node(language_description, core_module, root, ancestor_expression_instantiate.position, get_core_module);
    if (custom_type_reference === undefined) {
        return undefined;
    }

    const module_declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
    if (module_declaration === undefined) {
        return undefined;
    }

    const declaration_member_names = get_member_names(module_declaration.declaration);
    if (declaration_member_names.length === 0) {
        return undefined;
    }

    const members_node = ancestor_expression_instantiate.node.children[2];
    const current_node_index = before_cursor_node_position[ancestor_expression_instantiate.position.length + 1];
    const current_member_node_index =
        current_node_index === undefined ? 0 :
            current_node_index % 2 === 0 ? current_node_index : current_node_index + 1;
    if (current_member_node_index < members_node.children.length) {
        const current_member_node = members_node.children[current_member_node_index].children[0];
        const current_member_name = current_member_node.children[0].word.value;
        if (current_member_name.length > 0) {
            {
                const member_index = declaration_member_names.findIndex(value => value === current_member_name);
                if (member_index !== -1) {
                    return {
                        core_module: module_declaration.core_module,
                        declaration: module_declaration.declaration,
                        member_index: member_index,
                        member_name: declaration_member_names[member_index]
                    };
                }
            }

            // Try to match what the user wrote with the struct members to find the best match:
            if (find_best_match) {
                const existent_member_names: string[] = Parser_node.find_descendants_if({ node: members_node, position: [...ancestor_expression_instantiate.position, 2] }, node => node.word.value === "Expression_instantiate_member_name").map(value => value.node.children[0].word.value);
                const inexistent_member_names = declaration_member_names.filter(member_name => existent_member_names.find(value => value === member_name) === undefined);
                const best_member_name_match = find_best_string_match(current_member_name, inexistent_member_names);
                const member_index = declaration_member_names.findIndex(member_name => member_name === best_member_name_match);
                return {
                    core_module: module_declaration.core_module,
                    declaration: module_declaration.declaration,
                    member_index: member_index,
                    member_name: declaration_member_names[member_index]
                };
            }
        }
    }

    const previous_member_index =
        previous_member_name !== undefined ?
            declaration_member_names.findIndex(member_name => member_name === previous_member_name) :
            -1;

    const member_index = previous_member_index + 1;

    return {
        core_module: module_declaration.core_module,
        declaration: module_declaration.declaration,
        member_index: member_index,
        member_name: declaration_member_names[member_index]
    };
}

function get_member_names(declaration: Core.Declaration): string[] {
    if (declaration.type === Core.Declaration_type.Enum) {
        const enum_declaration = declaration.value as Core.Enum_declaration;
        return enum_declaration.values.map(value => value.name);
    }
    else if (declaration.type === Core.Declaration_type.Struct) {
        const struct_declaration = declaration.value as Core.Struct_declaration;
        return struct_declaration.member_names;
    }
    else if (declaration.type === Core.Declaration_type.Union) {
        const union_declaration = declaration.value as Core.Union_declaration;
        return union_declaration.member_names;
    }
    else {
        return [];
    }
}

function find_best_string_match(
    target: string,
    options: string[]
): string {

    let best_match = options[0];
    let smallest_distance = get_levenshtein_distance(target, best_match);

    for (let i = 1; i < options.length; i++) {
        const distance = get_levenshtein_distance(target, options[i]);
        if (distance < smallest_distance) {
            smallest_distance = distance;
            best_match = options[i];
        }
    }

    return best_match;
}

function get_levenshtein_distance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

function get_previous_instantiate_member_name_at_cursor(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    expression_instantiate_node_position: number[]
): string | undefined {
    const first_index = before_cursor_node_position[expression_instantiate_node_position.length];
    if (first_index === 2) {
        const member_node_index = before_cursor_node_position[expression_instantiate_node_position.length + 1];
        if (member_node_index === 0) {
            return undefined;
        }

        const previous_member_node_position = [
            ...before_cursor_node_position.slice(0, expression_instantiate_node_position.length + 1),
            (member_node_index % 2 === 0) ? member_node_index - 2 : member_node_index - 1
        ];

        const previous_member_node = Parser_node.get_node_at_position(root, previous_member_node_position);
        const descendant_member_name = Parser_node.find_descendant_position_if({ node: previous_member_node, position: previous_member_node_position }, node => node.word.value === "Expression_instantiate_member_name");
        if (descendant_member_name === undefined) {
            return undefined;
        }

        const previous_member_name = descendant_member_name.node.children[0].word.value;
        return previous_member_name;
    }
    else {
        return undefined;
    }
}

export enum Component_type {
    Import_module,
    Declaration,
    Member_name,
    Invalid
}

export interface Access_expression_component {
    type: Component_type;
    value: Core.Import_module_with_alias | { core_module: Core.Module, declaration: Core.Declaration } | string;
    node: Parser_node.Node;
    node_position: number[];
}

export async function get_access_expression_components(
    language_description: Language.Description,
    core_module: Core.Module,
    access_expression: Core.Access_expression,
    root: Parser_node.Node,
    access_expression_node: Parser_node.Node,
    access_expression_node_position: number[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Access_expression_component[]> {

    const components: Access_expression_component[] = [];

    const left_hand_side_expression = access_expression.expression;
    if (left_hand_side_expression.data.type === Core.Expression_enum.Access_expression) {
        const descendant_left_hand_side = Parser_node.find_descendant_position_if({ node: access_expression_node.children[0], position: [...access_expression_node_position, 0] }, child => child.word.value === "Expression_access");
        if (descendant_left_hand_side !== undefined) {
            const left_hand_side_components = await get_access_expression_components(language_description, core_module, left_hand_side_expression.data.value as Core.Access_expression, root, descendant_left_hand_side.node, descendant_left_hand_side.position, get_core_module);
            components.push(...left_hand_side_components);
        }
    }
    else if (left_hand_side_expression.data.type === Core.Expression_enum.Variable_expression) {
        const variable_expression = left_hand_side_expression.data.value as Core.Variable_expression;
        const descendant_variable_expression = Parser_node.find_descendant_position_if({ node: access_expression_node.children[0], position: [...access_expression_node_position, 0] }, child => child.word.value === "Expression_variable");
        if (descendant_variable_expression !== undefined) {
            const import_module = core_module.imports.find(import_module => import_module.alias === variable_expression.name);
            if (import_module !== undefined) {
                components.push(
                    {
                        type: Component_type.Import_module,
                        value: import_module,
                        node: descendant_variable_expression.node,
                        node_position: [...access_expression_node_position, ...descendant_variable_expression.position]
                    }
                );
            }
            else {
                const function_value = get_function_value_that_contains_node_position(core_module, root, access_expression_node_position);
                if (function_value !== undefined) {
                    const declaration = create_declaration_from_function_value(function_value);
                    const left_hand_side_type = await get_expression_type(language_description, core_module, declaration, root, access_expression_node_position, left_hand_side_expression, get_core_module);
                    if (left_hand_side_type !== undefined && left_hand_side_type.type.length > 0) {
                        if (left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                            const custom_type_reference = left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
                            const module_declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
                            if (module_declaration !== undefined) {
                                components.push(
                                    {
                                        type: Component_type.Declaration,
                                        value: { core_module: module_declaration.core_module, declaration: module_declaration.declaration },
                                        node: descendant_variable_expression.node,
                                        node_position: [...access_expression_node_position, ...descendant_variable_expression.position]
                                    }
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    if (components.length > 0) {
        const last_component = components[components.length - 1];
        if (last_component.type === Component_type.Import_module) {
            const import_module = last_component.value as Core.Import_module_with_alias;
            const imported_module = await get_core_module(import_module.module_name);
            if (imported_module !== undefined) {
                const declaration = imported_module.declarations.find(declaration => declaration.name === access_expression.member_name);
                if (declaration !== undefined) {
                    components.push(
                        {
                            type: Component_type.Declaration,
                            value: { core_module: imported_module, declaration: declaration },
                            node: access_expression_node.children[2],
                            node_position: [...access_expression_node_position, 2]
                        }
                    );
                }
            }

            if (components[components.length - 1].type !== Component_type.Declaration) {
                components.push(
                    {
                        type: Component_type.Invalid,
                        value: access_expression.member_name,
                        node: access_expression_node.children[2],
                        node_position: [...access_expression_node_position, 2]
                    }
                );
            }
        }
        else if (last_component.type === Component_type.Declaration) {

            const module_declaration = last_component.value as { core_module: Core.Module, declaration: Core.Declaration };
            const member_names = get_member_names(module_declaration.declaration);
            const member_index = member_names.findIndex(member_name => member_name === access_expression.member_name);

            components.push(
                {
                    type: member_index !== -1 ? Component_type.Member_name : Component_type.Invalid,
                    value: access_expression.member_name,
                    node: access_expression_node.children[2],
                    node_position: [...access_expression_node_position, 2]
                }
            );
        }
    }

    return components;
}

export function select_access_expression_component(
    components: Access_expression_component[],
    before_cursor_node: Parser_node.Node | undefined,
    before_cursor_node_position: number[],
    after_cursor_node_position: number[],
): Access_expression_component {
    const cursor_position = before_cursor_node !== undefined && before_cursor_node.word.value === "." ? after_cursor_node_position : before_cursor_node_position;

    const selected_component = components.reduce((previous_value, current_value) => {
        const previous_length = Parser_node.find_node_common_root(previous_value.node_position, cursor_position).length;
        const current_length = Parser_node.find_node_common_root(current_value.node_position, cursor_position).length;
        return previous_length >= current_length ? previous_value : current_value;
    });

    return selected_component;
}

export function get_first_ancestor_with_name_at_cursor_position(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    after_cursor_node_position: number[],
    names: string[]
): { node: Parser_node.Node, position: number[] } | undefined {
    const before_ancestor = Parser_node.get_first_ancestor_with_name(root, before_cursor_node_position, names);

    const after_ancestor = Parser_node.get_first_ancestor_with_name(root, after_cursor_node_position, names);

    if (before_ancestor === undefined) {
        return after_ancestor;
    }
    else if (after_ancestor === undefined) {
        return before_ancestor;
    }

    if (before_ancestor.position.length >= after_ancestor.position.length) {
        return before_ancestor;
    }
    else {
        return after_ancestor;
    }
}

export function create_member_default_value_text(
    statement: Core.Statement
): string | undefined {
    if (statement.expression.data.type === Core.Expression_enum.Constant_expression) {
        const word = Parse_tree_convertor_mappings.constant_expression_to_word(statement.expression.data.value as Core.Constant_expression);
        return word.value;
    }
    else if (statement.expression.data.type === Core.Expression_enum.Instantiate_expression) {
        const instantiate_expression = statement.expression.data.value as Core.Instantiate_expression;

        const type_text = instantiate_expression.type === Core.Instantiate_expression_type.Explicit ? "explicit " : "";

        const members_text: string[] = [];

        for (const member of instantiate_expression.members) {
            const member_default_value_text = create_member_default_value_text(member.value);
            if (member_default_value_text === undefined) {
                return undefined;
            }

            const member_text = `${member.member_name}: ${member_default_value_text}`;
            members_text.push(member_text);
        }

        const text = `${type_text}{${members_text.join(", ")}}`;
        return text;
    }

    return undefined;
}

export interface Text_position {
    line: number;
    column: number;
    offset: number;
}

export interface Text_range {
    start: Text_position;
    end: Text_position;
}

export function find_node_range(
    root: Parser_node.Node,
    node: Parser_node.Node,
    node_position: number[],
    text: string
): Text_range | undefined {

    const begin_iterator = Parse_tree_text_iterator.begin(root, text);

    const start_iterator = Parse_tree_text_iterator.go_to_next_node_position(begin_iterator, node_position);
    if (start_iterator.node === undefined) {
        return undefined;
    }

    const right_most_descendant = Parser_node.get_rightmost_descendant_terminal_node(node, node_position);
    if (right_most_descendant === undefined) {
        return {
            start: {
                line: start_iterator.line,
                column: start_iterator.column,
                offset: start_iterator.offset
            },
            end: {
                line: start_iterator.line,
                column: start_iterator.column,
                offset: start_iterator.offset
            }
        };
    }

    const end_iterator = Parse_tree_text_iterator.go_to_next_node_position(start_iterator, right_most_descendant.position);
    if (end_iterator.node === undefined) {
        return undefined;
    }

    return {
        start: {
            line: start_iterator.line,
            column: start_iterator.column,
            offset: start_iterator.offset
        },
        end: {
            line: end_iterator.line,
            column: end_iterator.column + end_iterator.node.word.value.length,
            offset: end_iterator.offset + end_iterator.node.word.value.length
        }
    };
}

export function find_node_range_using_scanned_word_source_location(
    node: Parser_node.Node
): { start: Scanner.Source_location, end: Scanner.Source_location } {

    if (node.children.length === 0) {
        return {
            start: {
                line: node.word.source_location.line,
                column: node.word.source_location.column
            },
            end: {
                line: node.word.source_location.line,
                column: node.word.source_location.column + node.word.value.length
            }
        };
    }

    const left_most_descedant = Parser_node.get_leftmost_descendant(node, []) as { node: Parser_node.Node, position: number[] };
    const right_most_descendant = Parser_node.get_rightmost_descendant_terminal_node(node, []) as { node: Parser_node.Node, position: number[] };

    return {
        start: {
            line: left_most_descedant.node.word.source_location.line,
            column: left_most_descedant.node.word.source_location.column
        },
        end: {
            line: right_most_descendant.node.word.source_location.line,
            column: right_most_descendant.node.word.source_location.column + right_most_descendant.node.word.value.length
        }
    };
}

export function find_node_range_using_text_position_cache(
    cache: Parse_tree_text_position_cache.Cache,
    descendant: { node: Parser_node.Node, position: number[] }
): { start: Scanner.Source_location, end: Scanner.Source_location } {

    if (descendant.node.children.length === 0) {

        const text_position = Parse_tree_text_position_cache.get_node_text_position(cache, descendant.position);

        return {
            start: {
                line: text_position.line,
                column: text_position.column
            },
            end: {
                line: text_position.line,
                column: text_position.column + descendant.node.word.value.length
            }
        };
    }

    const left_most_descedant = Parser_node.get_leftmost_descendant(descendant.node, []) as { node: Parser_node.Node, position: number[] };
    const right_most_descendant = Parser_node.get_rightmost_descendant_terminal_node(descendant.node, []) as { node: Parser_node.Node, position: number[] };

    const left_most_text_position = Parse_tree_text_position_cache.get_node_text_position(cache, [...descendant.position, ...left_most_descedant.position]);
    const right_most_text_position = Parse_tree_text_position_cache.get_node_text_position(cache, [...descendant.position, ...right_most_descendant.position]);

    return {
        start: {
            line: left_most_text_position.line,
            column: left_most_text_position.column
        },
        end: {
            line: right_most_text_position.line,
            column: right_most_text_position.column + right_most_descendant.node.word.value.length
        }
    };
}

export interface Text_change_2 {
    range: Text_range;
    text: string;
}

export function format_text(
    language_description: Language.Description,
    state: Document.State,
    text_change: Text_change_2
): Text_change_2 | undefined {

    // TODO parse text as is

    // 1. Get current indentation
    // 2. (optional) if inside {} or (), check if there are any newlines. If there is, use newlines, otherwise use spaces
    // 3. Newline approach:
    //    a) always add newline after ';'
    //    a) if inside {} use newlines and indentation after every ';' and ','
    //    b) if inside () use spaces after ','
    //    a) if { is followed by }, then don't add newline, otherwise add
    //    c) add space after 'if', 'for', 'switch' and 'while'
    //    d) add spaces between identifiers
    //    e) add spaces before and after '->'

    const parse_tree = state.diagnostics.length === 0 ? state.valid.parse_tree : state.with_errors?.parse_tree;
    if (parse_tree === undefined) {
        return undefined;
    }

    const text = state.diagnostics.length === 0 ? state.valid.text : state.with_errors?.text;
    if (text === undefined) {
        return undefined;
    }

    const scanned_input_change = Scan_new_changes.scan_new_change(
        parse_tree,
        text,
        text_change.range.start.offset,
        text_change.range.end.offset,
        text_change.text
    );

    if (Scan_new_changes.has_meaningful_content(scanned_input_change)) {

        const start_change_node_position = (scanned_input_change.start_change !== undefined && scanned_input_change.start_change.node !== undefined) ? scanned_input_change.start_change.node_position : undefined;
        const after_change_node_position = (scanned_input_change.after_change !== undefined && scanned_input_change.after_change.node !== undefined) ? scanned_input_change.after_change.node_position : undefined;

        const parse_result = Parser.parse_incrementally(
            state.document_file_path,
            parse_tree,
            start_change_node_position,
            scanned_input_change.new_words,
            after_change_node_position,
            language_description.actions_table,
            language_description.go_to_table,
            language_description.array_infos,
            language_description.map_word_to_terminal
        );

        if (parse_result.status === Parser.Parse_status.Accept) {

            const simplified_changes = Parser.simplify_parser_changes(parse_tree, parse_result.changes);

            const ancestor_position = Parser.get_changes_common_ancestor(simplified_changes);
            if (ancestor_position === undefined) {
                return undefined;
            }
            const ancestor_node = Parser_node.get_node_at_position(parse_tree, ancestor_position);

            const original_text_range = find_node_range(parse_tree, ancestor_node, ancestor_position, text);
            if (original_text_range === undefined) {
                return undefined;
            }

            const ancestor_node_clone = Parser_node.deep_clone_node(Parser_node.get_node_at_position(parse_tree, ancestor_position));
            Parser.apply_changes(ancestor_node_clone, ancestor_position, simplified_changes);

            const before_character: string | undefined = text[original_text_range.start.offset - 1];
            const after_character: string | undefined = text[original_text_range.end.offset];

            const formatted_text = Text_formatter.node_to_string(
                parse_tree,
                { node: ancestor_node_clone, position: ancestor_position },
                before_character,
                after_character
            );

            return {
                range: original_text_range,
                text: formatted_text
            };
        }
    }

    return undefined;
}

export async function get_declaration_members(
    core_module: Core.Module,
    declaration: Core.Declaration,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ index: number, name: string }[]> {
    if (declaration.type === Core.Declaration_type.Alias) {
        const underlying_declaration = await get_underlying_type_declaration(core_module, declaration, get_core_module);
        if (underlying_declaration === undefined) {
            return [];
        }
        return get_declaration_members(core_module, underlying_declaration.declaration, get_core_module);
    }
    else if (declaration.type === Core.Declaration_type.Enum) {
        const enum_declaration = declaration.value as Core.Enum_declaration;
        return enum_declaration.values.map((member, index) => {
            return {
                index: index,
                name: member.name
            };
        });
    }
    else if (declaration.type === Core.Declaration_type.Struct) {
        const struct_declaration = declaration.value as Core.Struct_declaration;
        return struct_declaration.member_names.map((member_name, index) => {
            return {
                index: index,
                name: member_name
            };
        });
    }
    else if (declaration.type === Core.Declaration_type.Union) {
        const union_declaration = declaration.value as Core.Union_declaration;
        return union_declaration.member_names.map((member_name, index) => {
            return {
                index: index,
                name: member_name
            };
        });
    }
    else {
        return [];
    }
}

export async function get_declaration_member_types(
    core_module: Core.Module,
    declaration: Core.Declaration,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<{ index: number, name: string, type: Core.Type_reference }[]> {
    if (declaration.type === Core.Declaration_type.Alias) {
        const underlying_declaration = await get_underlying_type_declaration(core_module, declaration, get_core_module);
        if (underlying_declaration === undefined) {
            return [];
        }
        return get_declaration_member_types(core_module, underlying_declaration.declaration, get_core_module);
    }
    else if (declaration.type === Core.Declaration_type.Struct) {
        const struct_declaration = declaration.value as Core.Struct_declaration;
        return struct_declaration.member_names.map((member_name, index) => {
            return {
                index: index,
                name: member_name,
                type: struct_declaration.member_types[index]
            };
        });
    }
    else if (declaration.type === Core.Declaration_type.Union) {
        const union_declaration = declaration.value as Core.Union_declaration;
        return union_declaration.member_names.map((member_name, index) => {
            return {
                index: index,
                name: member_name,
                type: union_declaration.member_types[index]
            };
        });
    }
    else {
        return [];
    }
}

export function create_declaration_from_enum_declaration(enum_declaration: Core.Enum_declaration): Core.Declaration {
    const declaration: Core.Declaration = {
        name: enum_declaration.name,
        type: Core.Declaration_type.Function,
        is_export: false,
        value: enum_declaration
    };
    return declaration;
}

export function create_declaration_from_function_value(function_value: Core.Function): Core.Declaration {
    const declaration: Core.Declaration = {
        name: function_value.declaration.name,
        type: Core.Declaration_type.Function,
        is_export: false,
        value: function_value
    };
    return declaration;
}

export async function is_enum_type(
    type_reference: Core.Type_reference[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<boolean> {

    if (type_reference.length !== 1 || type_reference[0].data.type !== Core.Type_reference_enum.Custom_type_reference) {
        return false;
    }

    const custom_type_reference = type_reference[0].data.value as Core.Custom_type_reference;
    const module_declaration = await get_custom_type_reference_declaration(custom_type_reference, get_core_module);
    if (module_declaration === undefined) {
        return false;
    }

    return module_declaration.declaration.type === Core.Declaration_type.Enum;
}

export async function is_enum_value_expression(
    expression_type: Expression_type_reference,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<boolean> {
    if (expression_type.type === undefined || !expression_type.is_value) {
        return false;
    }

    return is_enum_type(expression_type.type, get_core_module);
}

function create_pointer_type(element_type: Core.Type_reference[], is_mutable: boolean): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Pointer_type,
            value: {
                element_type: element_type,
                is_mutable: is_mutable
            }
        }
    };
}

export function create_boolean_type(): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Fundamental_type,
            value: Core.Fundamental_type.Bool
        }
    };
}

export function create_custom_type_reference(module_name: string, name: string): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Custom_type_reference,
            value: {
                module_reference: {
                    name: module_name
                },
                name: name
            }
        }
    };
}

export function create_integer_type(number_of_bits: number, is_signed: boolean): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Integer_type,
            value: {
                number_of_bits: number_of_bits,
                is_signed: is_signed
            }
        }
    };
}

export function create_fundamental_type(fundamental_type: Core.Fundamental_type): Core.Type_reference {
    return {
        data: {
            type: Core.Type_reference_enum.Fundamental_type,
            value: fundamental_type
        }
    };
}
