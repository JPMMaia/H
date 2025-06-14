import * as Core from "./Core_intermediate_representation";
import * as Parse_tree_convertor from "./Parse_tree_convertor";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parse_tree_text_iterator from "./Parse_tree_text_iterator";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import * as Type_utilities from "./Type_utilities";

export enum Symbol_type {
    Module_alias,
    Type,
    Value,
}

export interface Symbol_module_alias_data {
    module_name: string;
    module_alias: string;
}

export interface Symbol_type_data {
    type_reference: Core.Type_reference[];
}

export interface Symbol_value_data {
    type_reference: Core.Type_reference[] | undefined;
}

export interface Symbol_information {
    symbol_type: Symbol_type;
    name: string,
    node_position: number[];
    data: Symbol_module_alias_data | Symbol_type_data | Symbol_value_data;
}

export function get_symbol_source_range(
    root: Parser_node.Node,
    symbol: Symbol_information
): Parser_node.Source_range {
    const node = Parser_node.get_node_at_position(root, symbol.node_position);
    return node.source_range;
}

export function create_module_alias_symbol(
    module_name: string,
    module_alias: string,
    node_position: number[]
): Symbol_information {
    return {
        symbol_type: Symbol_type.Module_alias,
        name: module_alias,
        node_position: node_position,
        data: {
            module_name: module_name,
            module_alias: module_alias
        }
    };
}

export function create_type_symbol(
    name: string,
    type: Core.Type_reference[],
    node_position: number[]
): Symbol_information {
    return {
        symbol_type: Symbol_type.Type,
        name: name,
        node_position: node_position,
        data: {
            type_reference: type
        }
    };
}

export function create_value_symbol(
    name: string,
    type: Core.Type_reference[] | undefined,
    node_position: number[]
): Symbol_information {
    return {
        symbol_type: Symbol_type.Value,
        name: name,
        node_position: node_position,
        data: {
            type_reference: type
        }
    };
}

export async function get_symbol(
    root: Parser_node.Node,
    scope_node_position: number[] | undefined,
    variable_name: string,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Symbol_information | undefined> {

    {
        const symbol = await get_symbol_inside_function(root, scope_node_position, variable_name, get_parse_tree);
        if (symbol !== undefined) {
            return symbol;
        }
    }

    {
        const symbol = await get_declaration_symbol(root, variable_name);
        if (symbol !== undefined) {
            return symbol;
        }
    }

    {
        const symbol = get_import_alias_symbol(root, variable_name);
        if (symbol !== undefined) {
            return symbol;
        }
    }

    return undefined;
}

export async function get_symbols(
    root: Parser_node.Node,
    scope_node_position: number[] | undefined,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Symbol_information[]> {
    const symbols: Symbol_information[] = [];
    symbols.push(...await get_symbols_inside_function(root, scope_node_position, get_parse_tree));
    symbols.push(...await get_declaration_symbols(root));
    symbols.push(...get_import_alias_symbols(root));
    return symbols;
}

export async function get_symbol_inside_function(
    root: Parser_node.Node,
    scope_node_position: number[] | undefined,
    variable_name: string,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Symbol_information | undefined> {
    if (scope_node_position !== undefined && scope_node_position.length >= 1) {
        const declaration_node_position = [scope_node_position[0]];
        const declaration_node = Parser_node.get_node_at_position(root, declaration_node_position);

        const descendant_function = Parser_node.get_child_if({ node: declaration_node, position: declaration_node_position }, child => child.word.value === "Function");
        if (descendant_function !== undefined) {
            const function_declaration = Parser_node.get_child_if(descendant_function, child => child.word.value === "Function_declaration");

            {
                const function_input_parameters = Parser_node.get_child_if(function_declaration, child => child.word.value === "Function_input_parameters");
                const symbol = get_symbol_inside_function_parameters(root, function_input_parameters, variable_name);
                if (symbol !== undefined) {
                    return symbol;
                }
            }

            if (is_inside_function_post_condition(root, scope_node_position)) {
                const function_output_parameters = Parser_node.get_child_if(function_declaration, child => child.word.value === "Function_output_parameters");
                const symbol = get_symbol_inside_function_parameters(root, function_output_parameters, variable_name);
                if (symbol !== undefined) {
                    return symbol;
                }
            }

            const function_definition = Parser_node.find_descendant_position_if(descendant_function, child => child.word.value === "Function_definition");

            const block = Parser_node.get_child(function_definition, 0);
            return get_symbol_inside_block(root, block, scope_node_position, variable_name, get_parse_tree);
        }
    }

    return undefined;
}

export async function get_symbols_inside_function(
    root: Parser_node.Node,
    scope_node_position: number[] | undefined,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Symbol_information[]> {
    const symbols: Symbol_information[] = [];

    if (scope_node_position !== undefined && scope_node_position.length >= 1) {
        const declaration_node_position = [scope_node_position[0]];
        const declaration_node = Parser_node.get_node_at_position(root, declaration_node_position);

        const descendant_function = Parser_node.get_child_if({ node: declaration_node, position: declaration_node_position }, child => child.word.value === "Function");
        if (descendant_function !== undefined) {
            const function_declaration = Parser_node.get_child_if(descendant_function, child => child.word.value === "Function_declaration");

            const function_input_parameters = Parser_node.get_child_if(function_declaration, child => child.word.value === "Function_input_parameters");
            const function_input_parameters_symbols = get_symbols_inside_function_parameters(root, function_input_parameters);
            symbols.push(...function_input_parameters_symbols);

            if (is_inside_function_post_condition(root, scope_node_position)) {
                const function_output_parameters = Parser_node.get_child_if(function_declaration, child => child.word.value === "Function_output_parameters");
                const function_output_parameters_symbols = get_symbols_inside_function_parameters(root, function_output_parameters);
                symbols.push(...function_output_parameters_symbols);
            }

            const function_definition = Parser_node.find_descendant_position_if(descendant_function, child => child.word.value === "Function_definition");

            const block = Parser_node.get_child(function_definition, 0);
            const new_symbols = await get_symbols_inside_block(root, block, scope_node_position, get_parse_tree);
            symbols.push(...new_symbols);
        }
    }

    return symbols;
}

export function get_symbol_inside_function_parameters(
    root: Parser_node.Node,
    parameters_node: { node: Parser_node.Node, position: number[] },
    variable_name: string
): Symbol_information | undefined {
    const parameters = Parser_node.get_children_if(parameters_node, child => child.word.value === "Function_parameter");

    for (const parameter of parameters) {
        const parameter_name = Parser_node.get_child_if(parameter, child => child.word.value === "Function_parameter_name");
        const parameter_name_value = parameter_name.node.children[0].word.value;

        if (parameter_name_value === variable_name) {
            const parameter_type = Parser_node.get_child_if(parameter, child => child.word.value === "Function_parameter_type");
            const parameter_type_value = Parse_tree_convertor_mappings.node_to_type_reference(root, parameter_type.node.children[0]);
            return create_value_symbol(parameter_name_value, parameter_type_value, parameter_name.position);
        }
    }

    return undefined;
}

export function get_symbols_inside_function_parameters(
    root: Parser_node.Node,
    parameters_node: { node: Parser_node.Node, position: number[] }
): Symbol_information[] {

    const parameters = Parser_node.get_children_if(parameters_node, child => child.word.value === "Function_parameter");

    return parameters.map(parameter => {
        const parameter_name = Parser_node.get_child_if(parameter, child => child.word.value === "Function_parameter_name");
        const parameter_name_value = parameter_name.node.children[0].word.value;

        const parameter_type = Parser_node.get_child_if(parameter, child => child.word.value === "Function_parameter_type");
        const parameter_type_value = Parse_tree_convertor_mappings.node_to_type_reference(root, parameter_type.node.children[0]);

        return create_value_symbol(parameter_name_value, parameter_type_value, parameter_name.position);
    });
}

async function get_symbol_inside_block(
    root: Parser_node.Node,
    block: { node: Parser_node.Node, position: number[] },
    scope_node_position: number[] | undefined,
    variable_name: string,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Symbol_information | undefined> {

    const end_scope_statement_index = scope_node_position[block.position.length];
    if (end_scope_statement_index === undefined) {
        return undefined;
    }

    const statements = Parser_node.get_children_if(block, child => child.word.value === "Statement");

    for (const statement of statements) {

        if (statement.position[block.position.length] === end_scope_statement_index) {
            const child = Parser_node.get_child(statement, 0);
            if (child.node.word.value === "Expression_block") {
                const new_block = child;
                return get_symbol_inside_block(root, new_block, scope_node_position, variable_name, get_parse_tree);
            }
            else if (child.node.word.value === "Expression_if") {
                let index = block.position.length + 2;
                while (index < scope_node_position.length) {
                    const candidate_node_position = scope_node_position.slice(0, index + 1);
                    const candidate_node = Parser_node.get_node_at_position(root, candidate_node_position);
                    if (candidate_node === undefined) {
                        break;
                    }

                    if (candidate_node.word.value === "Expression_if_statements") {
                        return get_symbol_inside_block(root, { node: candidate_node, position: candidate_node_position }, scope_node_position, variable_name, get_parse_tree);
                    }

                    index += 1;
                }
            }
            else if (child.node.word.value === "Expression_for_loop") {

                {
                    const loop_variable_name = Parser_node.find_descendant_position_if(child, node => node.word.value === "Expression_for_loop_variable");
                    const loop_variable_name_value = loop_variable_name.node.children[0].word.value;
                    if (loop_variable_name_value === variable_name) {
                        const loop_range_begin = Parser_node.find_descendant_position_if(child, node => node.word.value === "Expression_for_loop_range_begin");
                        const loop_range_begin_expression = Parse_tree_convertor_mappings.node_to_expression(root, loop_range_begin.node.children[0].children[0]);
                        const loop_range_begin_expression_type = await get_expression_type(root, loop_variable_name.position, loop_range_begin_expression, get_parse_tree);
                        if (loop_range_begin_expression_type.is_value) {
                            const type_reference = loop_range_begin_expression_type.type;
                            return create_value_symbol(loop_variable_name_value, type_reference, loop_variable_name.position);
                        }
                        else {
                            return undefined;
                        }
                    }
                }

                const new_block = Parser_node.find_descendant_position_if(child, node => node.word.value === "Expression_for_loop_statements");
                return get_symbol_inside_block(root, new_block, scope_node_position, variable_name, get_parse_tree);
            }
            else if (child.node.word.value === "Expression_switch") {
                let index = block.position.length + 2;
                while (index < scope_node_position.length) {
                    const candidate_node_position = scope_node_position.slice(0, index + 1);
                    const candidate_node = Parser_node.get_node_at_position(root, candidate_node_position);
                    if (candidate_node === undefined) {
                        break;
                    }

                    if (candidate_node.word.value === "Expression_switch_case") {
                        return get_symbol_inside_block(root, { node: candidate_node, position: candidate_node_position }, scope_node_position, variable_name, get_parse_tree);
                    }

                    index += 1;
                }
            }
            else if (child.node.word.value === "Expression_while_loop") {
                const new_block = Parser_node.find_descendant_position_if(child, node => node.word.value === "Expression_while_loop_statements");
                return await get_symbol_inside_block(root, new_block, scope_node_position, variable_name, get_parse_tree);
            }
        }

        if (statement.position[block.position.length] >= end_scope_statement_index) {
            return undefined;
        }

        const variable_declaration = Parser_node.get_child_if(statement, child => child.word.value === "Expression_variable_declaration" || child.word.value === "Expression_variable_declaration_with_type");
        if (variable_declaration !== undefined) {
            const descendant_variable_name = Parser_node.get_child_if(variable_declaration, child => child.word.value === "Variable_name");
            const variable_name_value = descendant_variable_name.node.children[0].word.value;
            if (variable_name_value === variable_name) {
                const declaration_type = Parser_node.get_child_if(variable_declaration, child => child.word.value === "Expression_variable_declaration_type");
                if (declaration_type !== undefined) {
                    const type_reference = Parse_tree_convertor_mappings.node_to_type_reference(root, declaration_type.node.children[0]);
                    return create_value_symbol(variable_name_value, type_reference, descendant_variable_name.position);
                }
                else {
                    const right_hand_side = Parser_node.get_child_if(variable_declaration, child => child.word.value === "Generic_expression");
                    const right_hand_side_expression = Parse_tree_convertor_mappings.node_to_expression(root, right_hand_side.node);
                    const type_information = await get_expression_type(root, variable_declaration.position, right_hand_side_expression, get_parse_tree);
                    if (type_information === undefined || type_information.is_value) {
                        const type_reference = type_information !== undefined ? type_information.type : undefined;
                        return create_value_symbol(variable_name_value, type_reference, descendant_variable_name.position);
                    }
                    else {
                        return create_type_symbol(variable_name_value, type_information.type, descendant_variable_name.position);
                    }
                }
            }
        }
    }

    return undefined;
}

async function get_symbols_inside_block(
    root: Parser_node.Node,
    block: { node: Parser_node.Node, position: number[] },
    scope_node_position: number[] | undefined,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Symbol_information[]> {

    const symbols: Symbol_information[] = [];

    const end_scope_statement_index = scope_node_position[block.position.length];
    if (end_scope_statement_index === undefined) {
        return symbols;
    }

    const statements = Parser_node.get_children_if(block, child => child.word.value === "Statement");

    for (const statement of statements) {

        if (statement.position[block.position.length] === end_scope_statement_index) {
            const child = Parser_node.get_child(statement, 0);
            if (child.node.word.value === "Expression_block") {
                const new_block = child;
                const new_symbols = await get_symbols_inside_block(root, new_block, scope_node_position, get_parse_tree);
                symbols.push(...new_symbols);
                return symbols;
            }
            else if (child.node.word.value === "Expression_if") {
                let index = block.position.length + 2;
                while (index < scope_node_position.length) {
                    const candidate_node_position = scope_node_position.slice(0, index + 1);
                    const candidate_node = Parser_node.get_node_at_position(root, candidate_node_position);
                    if (candidate_node === undefined) {
                        break;
                    }

                    if (candidate_node.word.value === "Expression_if_statements") {
                        const new_symbols = await get_symbols_inside_block(root, { node: candidate_node, position: candidate_node_position }, scope_node_position, get_parse_tree);
                        symbols.push(...new_symbols);
                        return symbols;
                    }

                    index += 1;
                }
            }
            else if (child.node.word.value === "Expression_for_loop") {

                {
                    const loop_variable_name = Parser_node.find_descendant_position_if(child, node => node.word.value === "Expression_for_loop_variable");
                    const loop_range_begin = Parser_node.find_descendant_position_if(child, node => node.word.value === "Expression_for_loop_range_begin");
                    const loop_range_begin_expression = Parse_tree_convertor_mappings.node_to_expression(root, loop_range_begin.node.children[0].children[0]);
                    const loop_range_begin_expression_type = await get_expression_type(root, loop_variable_name.position, loop_range_begin_expression, get_parse_tree);
                    if (loop_range_begin_expression_type.is_value) {
                        const type_reference = loop_range_begin_expression_type.type;
                        symbols.push(create_value_symbol(loop_variable_name.node.children[0].word.value, type_reference, loop_variable_name.position));
                    }
                }

                const new_block = Parser_node.find_descendant_position_if(child, node => node.word.value === "Expression_for_loop_statements");
                const new_symbols = await get_symbols_inside_block(root, new_block, scope_node_position, get_parse_tree);
                symbols.push(...new_symbols);
                return symbols;
            }
            else if (child.node.word.value === "Expression_switch") {
                let index = block.position.length + 2;
                while (index < scope_node_position.length) {
                    const candidate_node_position = scope_node_position.slice(0, index + 1);
                    const candidate_node = Parser_node.get_node_at_position(root, candidate_node_position);
                    if (candidate_node === undefined) {
                        break;
                    }

                    if (candidate_node.word.value === "Expression_switch_case") {
                        const new_symbols = await get_symbols_inside_block(root, { node: candidate_node, position: candidate_node_position }, scope_node_position, get_parse_tree);
                        symbols.push(...new_symbols);
                        return symbols;
                    }

                    index += 1;
                }
            }
            else if (child.node.word.value === "Expression_while_loop") {
                const new_block = Parser_node.find_descendant_position_if(child, node => node.word.value === "Expression_while_loop_statements");
                const new_symbols = await get_symbols_inside_block(root, new_block, scope_node_position, get_parse_tree);
                symbols.push(...new_symbols);
                return symbols;
            }
        }

        if (statement.position[block.position.length] >= end_scope_statement_index) {
            return symbols;
        }

        const variable_declaration = Parser_node.get_child_if(statement, child => child.word.value === "Expression_variable_declaration" || child.word.value === "Expression_variable_declaration_with_type");
        if (variable_declaration !== undefined) {
            const descendant_variable_name = Parser_node.get_child_if(variable_declaration, child => child.word.value === "Variable_name");
            const variable_name_value = descendant_variable_name.node.children[0].word.value;
            const declaration_type = Parser_node.get_child_if(variable_declaration, child => child.word.value === "Expression_variable_declaration_type");
            if (declaration_type !== undefined) {
                const type_reference = Parse_tree_convertor_mappings.node_to_type_reference(root, declaration_type.node.children[0]);
                symbols.push(create_value_symbol(variable_name_value, type_reference, descendant_variable_name.position));
            }
            else {
                const right_hand_side = Parser_node.get_child_if(variable_declaration, child => child.word.value === "Generic_expression");
                const right_hand_side_expression = Parse_tree_convertor_mappings.node_to_expression(root, right_hand_side.node);
                const type_information = await get_expression_type(root, variable_declaration.position, right_hand_side_expression, get_parse_tree);
                if (type_information === undefined || type_information.is_value) {
                    const type_reference = type_information !== undefined ? type_information.type : undefined;
                    symbols.push(create_value_symbol(variable_name_value, type_reference, descendant_variable_name.position));
                }
                else {
                    symbols.push(create_type_symbol(variable_name_value, type_information.type, descendant_variable_name.position));
                }
            }
        }
    }

    return symbols;
}

function is_declaration_name_grammar_word(value: string): boolean {
    switch (value) {
        case "Alias_name":
        case "Enum_name":
        case "Global_variable_name":
        case "Function_constructor_name":
        case "Function_name":
        case "Struct_name":
        case "Type_constructor_name":
        case "Union_name":
            return true;
        default:
            return false;
    }
}

export async function get_declaration_symbol(
    root: Parser_node.Node,
    declaration_name_to_find: string
): Promise<Symbol_information | undefined> {

    for (let index = 1; index < root.children.length; ++index) {
        const declaration = Parser_node.get_child({ node: root, position: [] }, index);
        if (declaration === undefined) {
            continue;
        }

        const underlying_declaration = Parser_node.get_child(declaration, declaration.node.children.length - 1);
        if (underlying_declaration === undefined) {
            continue;
        }

        const declaration_name = Parser_node.find_descendant_position_if(underlying_declaration, child => is_declaration_name_grammar_word(child.word.value));
        if (declaration_name === undefined) {
            continue;
        }

        const declaration_name_value = declaration_name.node.children[0].word.value;

        if (declaration_name_value === declaration_name_to_find) {
            return await create_symbol_declaration_from_node(root, declaration.node, underlying_declaration.node, declaration_name_value, declaration_name.position);
        }
    }

    return undefined;
}

export async function get_declaration_symbols(
    root: Parser_node.Node
): Promise<Symbol_information[]> {
    const symbols: Symbol_information[] = [];

    for (let index = 1; index < root.children.length; ++index) {
        const declaration = Parser_node.get_child({ node: root, position: [] }, index);
        if (declaration === undefined) {
            continue;
        }

        const underlying_declaration = Parser_node.get_child(declaration, declaration.node.children.length - 1);
        if (underlying_declaration === undefined) {
            continue;
        }

        const declaration_name = Parser_node.find_descendant_position_if(underlying_declaration, child => is_declaration_name_grammar_word(child.word.value));
        if (declaration_name === undefined) {
            continue;
        }

        const declaration_name_value = declaration_name.node.children[0].word.value;

        const symbol = await create_symbol_declaration_from_node(root, declaration.node, underlying_declaration.node, declaration_name_value, declaration_name.position);
        symbols.push(symbol);
    }

    return symbols;
}

async function create_symbol_declaration_from_node(
    root: Parser_node.Node,
    declaration_node: Parser_node.Node,
    underlying_declaration_node: Parser_node.Node,
    declaration_name_value: string,
    declaration_name_position: number[]
): Promise<Symbol_information> {
    if (underlying_declaration_node.word.value === "Function") {

        const linkage = Parse_tree_convertor_mappings.is_export_declaration(underlying_declaration_node) ? Core.Linkage.External : Core.Linkage.Private;
        const declaration_node = underlying_declaration_node.children[0];

        const function_declaration_value = Parse_tree_convertor_mappings.node_to_function_declaration(root, declaration_node, linkage, undefined);

        const type_reference = Type_utilities.create_function_pointer_type_from_declaration(function_declaration_value);
        return create_value_symbol(declaration_name_value, [type_reference], declaration_name_position);
    }
    else if (underlying_declaration_node.word.value === "Global_variable") {
        const global_variable = Parse_tree_convertor_mappings.node_to_global_variable_declaration(root, declaration_node);

        if (global_variable.type !== undefined) {
            return create_value_symbol(declaration_name_value, [global_variable.type], declaration_name_position);
        }
        else {
            const current_module_name = get_module_name_from_tree(root);
            const get_parse_tree = (module_name: string): Promise<Parser_node.Node | undefined> => {
                if (module_name === current_module_name) {
                    return Promise.resolve(root);
                }
                return Promise.resolve(undefined);
            };

            const type_reference = await get_expression_type(root, undefined, global_variable.initial_value.expression, get_parse_tree);
            if (type_reference.is_value) {
                return create_value_symbol(declaration_name_value, type_reference.type, declaration_name_position);
            }
            else {
                return create_type_symbol(declaration_name_value, type_reference.type, declaration_name_position);
            }
        }
    }
    else {
        const module_name_value = get_module_name_from_tree(root);
        const type_reference = Type_utilities.create_custom_type_reference(module_name_value, declaration_name_value);
        return create_type_symbol(declaration_name_value, [type_reference], declaration_name_position);
    }
}

export function get_import_alias_symbol(
    root: Parser_node.Node,
    import_alias_name_to_find: string
): Symbol_information | undefined {

    const module_head = Parser_node.get_child_if({ node: root, position: [] }, child => child.word.value === "Module_head");
    const imports = Parser_node.get_children_if(module_head, child => child.word.value === "Import");

    for (const import_declaration of imports) {
        const import_alias_name = Parser_node.get_child_if(import_declaration, child => child.word.value === "Import_alias");
        if (import_alias_name !== undefined) {
            const import_alias_name_value = import_alias_name.node.children[0].word.value;
            if (import_alias_name_value === import_alias_name_to_find) {
                const import_value = Parse_tree_convertor_mappings.node_to_import_module_with_alias(import_declaration.node);
                return create_module_alias_symbol(import_value.module_name, import_value.alias, import_alias_name.position);
            }
        }
    }

    return undefined;
}

export function get_import_alias_symbols(
    root: Parser_node.Node
): Symbol_information[] {

    const symbols: Symbol_information[] = [];

    const module_head = Parser_node.get_child_if({ node: root, position: [] }, child => child.word.value === "Module_head");
    const imports = Parser_node.get_children_if(module_head, child => child.word.value === "Import");

    for (const import_declaration of imports) {
        const import_alias_name = Parser_node.get_child_if(import_declaration, child => child.word.value === "Import_alias");
        if (import_alias_name !== undefined) {
            const import_value = Parse_tree_convertor_mappings.node_to_import_module_with_alias(import_declaration.node);
            symbols.push(create_module_alias_symbol(import_value.module_name, import_value.alias, import_alias_name.position));
        }
    }

    return symbols;
}

export function is_export_declaration(
    root: Parser_node.Node,
    node_position: number[]
): boolean {
    const ancestor_declaration = Parser_node.get_first_ancestor_with_name(root, node_position, ["Declaration"]);
    if (ancestor_declaration === undefined) {
        return false;
    }
    const export_node = Parser_node.get_child_if(ancestor_declaration, child => child.word.value === "export");
    return export_node !== undefined;
}

export function create_declaration_from_symbol(
    root: Parser_node.Node,
    symbol: Symbol_information
): Core.Declaration | undefined {
    const declaration = Parser_node.get_ancestor_with_name(root, symbol.node_position, "Declaration");
    if (declaration === undefined) {
        return undefined;
    }

    const declaration_value = Parse_tree_convertor_mappings.node_to_declaration(root, declaration.node);
    return declaration_value;
}

export function get_ancestor_declaration_type(root: Parser_node.Node, node_position: number[]): Core.Declaration_type | undefined {

    if (node_position.length === 0 || node_position[0] === 0) {
        return undefined;
    }

    const declaration_node = root.children[node_position[0]];
    if (declaration_node === undefined) {
        return undefined;
    }

    const underlying_declaration_node = declaration_node.children[declaration_node.children.length - 1];
    if (underlying_declaration_node === undefined) {
        return undefined;
    }

    return Core.Declaration_type[underlying_declaration_node.word.value];
}

export async function get_expression_type(
    root: Parser_node.Node,
    scope_node_position: number[] | undefined,
    expression: Core.Expression,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Expression_type_reference | undefined> {

    switch (expression.data.type) {
        case Core.Expression_enum.Access_expression: {
            const value = expression.data.value as Core.Access_expression;

            if (value.expression.data.type === Core.Expression_enum.Variable_expression) {
                const variable_expression = value.expression.data.value as Core.Variable_expression;
                const left_hand_side_symbol = await get_symbol(root, scope_node_position, variable_expression.name, get_parse_tree);

                if (left_hand_side_symbol !== undefined && left_hand_side_symbol.symbol_type === Symbol_type.Module_alias) {
                    const import_module_data = left_hand_side_symbol.data as Symbol_module_alias_data;
                    const custom_type_reference: Core.Custom_type_reference = {
                        module_reference: {
                            name: import_module_data.module_name
                        },
                        name: value.member_name
                    };
                    const declaration_location = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
                    if (declaration_location !== undefined) {
                        const declaration = declaration_location.declaration;
                        if (declaration.type === Core.Declaration_type.Function) {
                            const function_value = declaration.value as Core.Function;
                            return {
                                type: [Type_utilities.create_function_pointer_type_from_declaration(function_value.declaration)],
                                is_value: true
                            };
                        }
                        else if (declaration.type === Core.Declaration_type.Global_variable) {
                            const global_variable = declaration.value as Core.Global_variable_declaration;
                            return get_global_variable_type_from_parse_tree(root, global_variable, get_parse_tree);
                        }
                        else {
                            return {
                                type: [create_custom_type_reference(import_module_data.module_name, declaration.name)],
                                is_value: false
                            };
                        }
                    }
                }
            }

            const left_hand_side_type = await get_expression_type(root, scope_node_position, value.expression, get_parse_tree);
            if (left_hand_side_type !== undefined && left_hand_side_type.type.length > 0) {
                if (left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                    const custom_type_reference = left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
                    const declaration_location = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
                    if (declaration_location !== undefined) {
                        const underlying_declaration_location = await get_underlying_type_declaration_from_parse_tree(declaration_location.root, declaration_location.node_position, declaration_location.declaration, get_parse_tree);
                        if (underlying_declaration_location !== undefined) {
                            const underlying_declaration = underlying_declaration_location.declaration;
                            const underlying_declaration_module_name = get_module_name_from_tree(underlying_declaration_location.root);
                            if (underlying_declaration.type === Core.Declaration_type.Enum) {
                                const enum_declaration = underlying_declaration.value as Core.Enum_declaration;
                                const member_index = enum_declaration.values.findIndex(member => member.name === value.member_name);
                                const enum_type_reference = [create_custom_type_reference(underlying_declaration_module_name, enum_declaration.name)];
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
                                        type: [create_custom_type_reference(underlying_declaration_module_name, struct_declaration.name)],
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
                                        type: [create_custom_type_reference(underlying_declaration_module_name, union_declaration.name)],
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

            return get_expression_type(root, scope_node_position, value.left_hand_side, get_parse_tree);
        }
        case Core.Expression_enum.Call_expression: {
            const value = expression.data.value as Core.Call_expression;
            const left_hand_side_type = await get_expression_type(root, scope_node_position, value.expression, get_parse_tree);
            if (left_hand_side_type !== undefined && left_hand_side_type.is_value && left_hand_side_type.type.length > 0) {
                if (left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                    const custom_type_reference = left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
                    const declaration_location = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
                    if (declaration_location !== undefined && declaration_location.declaration.type === Core.Declaration_type.Function) {
                        const function_value = declaration_location.declaration.value as Core.Function;
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

            const element_type = await get_expression_type(root, scope_node_position, value.array_data[0].expression, get_parse_tree);
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
            const custom_type_reference = await find_instantiate_custom_type_reference_from_node_using_parse_tree(root, scope_node_position, get_parse_tree);
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
            return get_expression_type(root, scope_node_position, value.expression, get_parse_tree);
        }
        case Core.Expression_enum.Ternary_condition_expression: {
            const value = expression.data.value as Core.Ternary_condition_expression;
            return get_expression_type(root, scope_node_position, value.then_statement.expression, get_parse_tree);
        }
        case Core.Expression_enum.Unary_expression: {
            const value = expression.data.value as Core.Unary_expression;
            const expression_type = await get_expression_type(root, scope_node_position, value.expression, get_parse_tree);
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

            const symbol = await get_symbol(root, scope_node_position, value.name, get_parse_tree);
            if (symbol !== undefined) {
                if (symbol.symbol_type === Symbol_type.Type) {
                    const symbol_data = symbol.data as Symbol_type_data;
                    return {
                        type: symbol_data.type_reference,
                        is_value: false
                    };
                }
                else if (symbol.symbol_type === Symbol_type.Value) {
                    const symbol_data = symbol.data as Symbol_value_data;
                    return {
                        type: symbol_data.type_reference,
                        is_value: true
                    };
                }
            }
        }
    }

    return undefined;
}

export function get_module_name_from_tree(
    root: Parser_node.Node
): string {

    const module_name = Parser_node.find_descendant_position_if({ node: root, position: [] }, child => child.word.value === "Module_name");
    if (module_name === undefined) {
        return "<undefined>";
    }

    const module_name_value = Parser_node.join_all_child_node_values(module_name.node);
    return module_name_value;
}

export function find_statement(
    root: Parser_node.Node,
    node_position: number[]
): { statement: Core.Statement, node_position: number[], node: Parser_node.Node } | undefined {

    const statement_ancestor = get_statement_node_or_ancestor(root, node_position);
    if (statement_ancestor === undefined) {
        return undefined;
    }

    const statement = Parse_tree_convertor_mappings.node_to_statement(root, statement_ancestor.node);

    return {
        statement: statement,
        node_position: statement_ancestor.position,
        node: statement_ancestor.node
    };
}

export function go_to_next_statement(
    root: Parser_node.Node,
    node_position: number[]
): { statement: Core.Statement, node_position: number[], node: Parser_node.Node } | undefined {

    const statement_ancestor = get_statement_node_or_ancestor(root, node_position);
    if (statement_ancestor === undefined) {
        return undefined;
    }

    const next_statment_index = statement_ancestor.position[statement_ancestor.position.length - 1] + 1;
    const next_statement_node_position = [...statement_ancestor.position.slice(0, statement_ancestor.position.length - 1), next_statment_index];

    return find_statement(root, next_statement_node_position);
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
                case "Declaration_name":
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

export async function get_global_variable_type_from_parse_tree(
    root: Parser_node.Node,
    global_variable: Core.Global_variable_declaration,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Expression_type_reference | undefined> {

    if (global_variable.type !== undefined) {
        return {
            type: [global_variable.type],
            is_value: true
        };
    }

    const type = await get_expression_type(root, undefined, global_variable.initial_value.expression, get_parse_tree);
    return type;;
}

export async function get_global_variable(
    root: Parser_node.Node,
    module_name: string,
    global_variable_name: string,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, declaration: Core.Declaration } | undefined> {

    const root_module_name = get_module_name_from_tree(root);
    const declaration_root = root_module_name === module_name ? root : await get_parse_tree(module_name);
    if (declaration_root === undefined) {
        return undefined;
    }

    const symbol = await get_declaration_symbol(declaration_root, global_variable_name);
    if (symbol === undefined || symbol.symbol_type !== Symbol_type.Value) {
        return undefined;
    }

    const ancestor_declaration = Parser_node.get_ancestor_with_name(declaration_root, symbol.node_position, "Declaration");
    const declaration = Parse_tree_convertor_mappings.node_to_declaration(declaration_root, ancestor_declaration.node);
    if (declaration === undefined || declaration.type !== Core.Declaration_type.Global_variable) {
        return undefined;
    }

    return {
        root: declaration_root,
        declaration: declaration
    };
}

export async function get_global_variable_from_expression(
    root: Parser_node.Node,
    expression: Core.Expression,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, declaration: Core.Declaration } | undefined> {
    switch (expression.data.type) {
        case Core.Expression_enum.Access_expression: {
            const access_expression = expression.data.value as Core.Access_expression;
            if (access_expression.expression.data.type !== Core.Expression_enum.Variable_expression) {
                return undefined;
            }

            const left_hand_side = access_expression.expression.data.value as Core.Variable_expression;
            const module_name = left_hand_side.name;
            return get_global_variable(root, module_name, access_expression.member_name, get_parse_tree);
        }
        case Core.Expression_enum.Variable_expression: {
            const variable_expression = expression.data.value as Core.Variable_expression;
            const module_name = get_module_name_from_tree(root);
            return get_global_variable(root, module_name, variable_expression.name, get_parse_tree);
        }
        default: {
            return undefined;
        }
    }
}

export function get_type_reference_from_node(
    root: Parser_node.Node,
    node: Parser_node.Node
): Core.Type_reference[] {
    return Parse_tree_convertor_mappings.node_to_type_reference(root, node);
}

export function get_expression_from_node(
    root: Parser_node.Node,
    node: Parser_node.Node
): Core.Expression {
    const expression = Parse_tree_convertor_mappings.node_to_expression(root, node);

    const visitor = (type: Core.Type_reference) => {
        fix_custom_type_reference_2(root, type);
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

function fix_custom_type_reference_2(
    root: Parser_node.Node,
    type: Core.Type_reference
) {
    const module_name = get_module_name_from_tree(root);

    const visitor = (type: Core.Type_reference) => {
        if (type.data.type === Core.Type_reference_enum.Custom_type_reference) {
            const value = type.data.value as Core.Custom_type_reference;
            if (value.module_reference.name.length === 0) {
                value.module_reference.name = module_name;
            }
            else {
                const import_module_symbol = get_import_alias_symbol(root, value.module_reference.name);
                if (import_module_symbol !== undefined) {
                    const data = import_module_symbol.data as Symbol_module_alias_data;
                    value.module_reference.name = data.module_name;
                }
            }
        }
    };

    Parse_tree_convertor.visit_types(type, visitor);
}

export async function get_type_reference_declaration(
    type_reference: Core.Type_reference[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, node_position: number[], declaration: Core.Declaration } | undefined> {

    if (type_reference.length === 0) {
        return undefined;
    }

    if (type_reference[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
        const custom_type_reference = type_reference[0].data.value as Core.Custom_type_reference;
        return get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
    }

    return undefined;
}

export async function get_custom_type_reference_declaration(
    custom_type_reference: Core.Custom_type_reference,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, declaration: Core.Declaration, declaration_name_position: number[] } | undefined> {

    const root = await get_parse_tree(custom_type_reference.module_reference.name);
    if (root === undefined) {
        return undefined;
    }

    const declaration_symbol = await get_declaration_symbol(root, custom_type_reference.name);
    if (declaration_symbol === undefined) {
        return undefined;
    }

    const ancestor_declaration = Parser_node.get_ancestor_with_name(root, declaration_symbol.node_position, "Declaration");
    const declaration = Parse_tree_convertor_mappings.node_to_declaration(root, ancestor_declaration.node);

    return {
        root: root,
        declaration: declaration,
        declaration_name_position: declaration_symbol.node_position
    };
}

export async function get_declaration_location_using_parse_tree(
    root: Parser_node.Node,
    declaration_name: string
): Promise<{ root: Parser_node.Node, node_position: number[] } | undefined> {
    const symbol = await get_declaration_symbol(root, declaration_name);
    if (symbol === undefined || (symbol.symbol_type !== Symbol_type.Type && symbol.symbol_type !== Symbol_type.Value)) {
        return undefined;
    }

    const symbol_node = Parser_node.get_node_at_position(root, symbol.node_position);
    if (!is_declaration_name_grammar_word(symbol_node.word.value)) {
        return undefined;
    }

    const ancestor_declaration = Parser_node.get_first_ancestor_with_name(root, symbol.node_position, ["Declaration"]);
    if (ancestor_declaration === undefined) {
        return undefined;
    }

    const declaration = Parse_tree_convertor_mappings.node_to_declaration(root, ancestor_declaration.node);
    if (declaration === undefined) {
        return undefined;
    }

    return {
        root: root,
        node_position: ancestor_declaration.position
    };
}

export async function get_custom_type_reference_declaration_location_using_parse_tree(
    custom_type_reference: Core.Custom_type_reference,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, node_position: number[] } | undefined> {

    const root = await get_parse_tree(custom_type_reference.module_reference.name);
    if (root === undefined) {
        return undefined;
    }

    return get_declaration_location_using_parse_tree(root, custom_type_reference.name);
}

export async function get_declaration_using_parse_tree(
    root: Parser_node.Node,
    declaration_name: string
): Promise<{ root: Parser_node.Node, node_position: number[], declaration: Core.Declaration } | undefined> {

    const location = await get_declaration_location_using_parse_tree(root, declaration_name);
    if (location === undefined) {
        return undefined;
    }

    const declaration_node = Parser_node.get_node_at_position(location.root, location.node_position);
    const declaration = Parse_tree_convertor_mappings.node_to_declaration(location.root, declaration_node);
    if (declaration === undefined) {
        return undefined;
    }

    return {
        root: location.root,
        node_position: location.node_position,
        declaration: declaration
    };
}


export async function get_custom_type_reference_declaration_using_parse_tree(
    custom_type_reference: Core.Custom_type_reference,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, node_position: number[], declaration: Core.Declaration } | undefined> {

    const root = await get_parse_tree(custom_type_reference.module_reference.name);
    if (root === undefined) {
        return undefined;
    }

    return get_declaration_using_parse_tree(root, custom_type_reference.name);
}

export async function get_underlying_type(
    type_reference: Core.Type_reference[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Core.Type_reference[]> {

    const module_declaration = await get_type_reference_declaration(type_reference, get_parse_tree);
    if (module_declaration !== undefined) {
        if (module_declaration.declaration.type === Core.Declaration_type.Alias) {
            const alias_type_declaration = module_declaration.declaration.value as Core.Alias_type_declaration;
            return get_underlying_type(alias_type_declaration.type, get_parse_tree);
        }
    }

    return type_reference;
}

export async function get_underlying_type_declaration(
    root: Parser_node.Node,
    declaration: Core.Declaration,
    declaration_name_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, declaration: Core.Declaration, declaration_name_position: number[] } | undefined> {

    if (declaration.type !== Core.Declaration_type.Alias) {
        return {
            root: root,
            declaration: declaration,
            declaration_name_position: declaration_name_position
        };
    }

    let current_root = root;
    let current_declaration = declaration;
    let current_declaration_name_position = declaration_name_position;

    while (current_declaration.type === Core.Declaration_type.Alias) {
        const alias_type_declaration = current_declaration.value as Core.Alias_type_declaration;
        if (alias_type_declaration.type.length === 0 || alias_type_declaration.type[0].data.type !== Core.Type_reference_enum.Custom_type_reference) {
            return { root: current_root, declaration: current_declaration, declaration_name_position: current_declaration_name_position };
        }

        const custom_type_reference = alias_type_declaration.type[0].data.value as Core.Custom_type_reference;

        const next_declaration = await get_custom_type_reference_declaration(custom_type_reference, get_parse_tree);
        if (next_declaration === undefined) {
            return undefined;
        }

        current_root = next_declaration.root;
        current_declaration = next_declaration.declaration;
        current_declaration_name_position = next_declaration.declaration_name_position;
    }

    return {
        root: current_root,
        declaration: current_declaration,
        declaration_name_position: current_declaration_name_position
    };
}

export async function get_underlying_type_declaration_from_parse_tree(
    root: Parser_node.Node,
    declaration_node_position: number[],
    declaration: Core.Declaration,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, node_position: number[], declaration: Core.Declaration } | undefined> {

    let current_root = root;
    let current_declaration_node_position = declaration_node_position;
    let current_declaration = declaration;

    while (current_declaration.type === Core.Declaration_type.Alias) {
        const alias_type_declaration = current_declaration.value as Core.Alias_type_declaration;
        if (alias_type_declaration.type.length === 0 || alias_type_declaration.type[0].data.type !== Core.Type_reference_enum.Custom_type_reference) {
            return {
                root: current_root,
                node_position: current_declaration_node_position,
                declaration: current_declaration
            };
        }

        const custom_type_reference = alias_type_declaration.type[0].data.value as Core.Custom_type_reference;

        const next_declaration_location = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
        if (next_declaration_location === undefined) {
            return undefined;
        }

        current_root = next_declaration_location.root;
        current_declaration_node_position = next_declaration_location.node_position;
        current_declaration = next_declaration_location.declaration;
    }

    return {
        root: current_root,
        node_position: current_declaration_node_position,
        declaration: current_declaration
    };
}

export async function get_function_value_from_node(
    root: Parser_node.Node,
    node: Parser_node.Node,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, node_position: number[], function_value: Core.Function } | undefined> {
    const expression = get_expression_from_node(root, node);
    if (expression.data.type === Core.Expression_enum.Access_expression) {
        const access_expression = expression.data.value as Core.Access_expression;
        const left_hand_side_expression = access_expression.expression;
        if (left_hand_side_expression.data.type === Core.Expression_enum.Variable_expression) {
            const module_alias_expression = left_hand_side_expression.data.value as Core.Variable_expression;
            const import_symbol = get_import_alias_symbol(root, module_alias_expression.name);
            if (import_symbol !== undefined) {
                const import_symbol_data = import_symbol.data as Symbol_module_alias_data;
                const function_value_location = await get_function_value_from_external_parse_tree(import_symbol_data.module_name, access_expression.member_name, get_parse_tree);
                if (function_value_location !== undefined) {
                    return {
                        root: function_value_location.root,
                        node_position: function_value_location.node_position,
                        function_value: function_value_location.function_value,
                    };
                }
            }
        }
    }
    else if (expression.data.type === Core.Expression_enum.Variable_expression) {
        const variable_expression = expression.data.value as Core.Variable_expression;
        const function_name = variable_expression.name;
        const function_location = await get_function_value_from_parse_tree(root, function_name);
        if (function_location !== undefined) {
            return {
                root: root,
                node_position: function_location.node_position,
                function_value: function_location.function_value
            };
        }
    }

    return undefined;
}

export async function get_struct_declaration_that_contains_node_position(
    root: Parser_node.Node,
    node_position: number[]
): Promise<Core.Struct_declaration | undefined> {
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
    const declaration_location = await get_declaration_using_parse_tree(root, struct_name);
    if (declaration_location === undefined) {
        return undefined;
    }

    if (declaration_location.declaration.type !== Core.Declaration_type.Struct) {
        return undefined;
    }

    return declaration_location.declaration.value as Core.Struct_declaration;
}

export async function get_function_value_that_contains_node_position(
    root: Parser_node.Node,
    node_position: number[]
): Promise<{ node_position: number[], function_value: Core.Function | undefined }> {
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
    return await get_function_value_from_parse_tree(root, function_name);
}

export async function get_function_value_from_parse_tree(
    root: Parser_node.Node,
    declaration_name: string
): Promise<{ node_position: number[], function_value: Core.Function | undefined }> {
    const declaration_location = await get_declaration_using_parse_tree(root, declaration_name);
    if (declaration_location === undefined) {
        return undefined;
    }

    if (declaration_location.declaration.type !== Core.Declaration_type.Function) {
        return undefined;
    }

    return {
        node_position: declaration_location.node_position,
        function_value: declaration_location.declaration.value as Core.Function
    };
}

export async function get_function_value_from_external_parse_tree(
    module_name: string,
    declaration_name: string,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{
    root: Parser_node.Node,

    node_position: number[], function_value: Core.Function | undefined
}> {
    const root = await get_parse_tree(module_name);
    if (root === undefined) {
        return undefined;
    }

    const funcion_location = await get_function_value_from_parse_tree(root, declaration_name);
    return {
        root: root,
        node_position: funcion_location.node_position,
        function_value: funcion_location.function_value
    };
}

function count_commas(
    parent: Parser_node.Node,
    begin_child_index: number,
    end_child_index: number
): number {
    let counter = 0;
    for (let index = begin_child_index; index < end_child_index; ++index) {
        const child = parent.children[index];
        if (child.word.value === ",") {
            counter += 1;
        }
        else if (child.word.value === "ERROR") {
            const found_comma = child.children.find(grand_child => grand_child.word.value === ",");
            if (found_comma !== undefined) {
                counter += 1;
            }
        }
    }
    return counter;
}

export async function get_function_value_and_parameter_index_from_expression_call(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, function_value: Core.Function, input_parameter_index: number, expression_call_node_position: number[] } | undefined> {

    const parent = Parser_node.get_parent(root, before_cursor_node_position);
    if (parent !== undefined && parent.node.word.value === "ERROR") {
        let current_child = Parser_node.get_previous_sibling(root, before_cursor_node_position);
        while (current_child !== undefined && current_child.node.word.value !== "(") {
            current_child = Parser_node.get_previous_sibling(root, current_child.position);
        }

        if (current_child === undefined || current_child.node.word.value !== "(") {
            return undefined;
        }

        const open_parenthesis = current_child;

        const left_hand_side_child = Parser_node.get_previous_sibling(root, current_child.position);
        const function_location = await get_function_value_from_node(root, left_hand_side_child.node, get_parse_tree);
        if (function_location !== undefined) {
            const comma_count = count_commas(parent.node, open_parenthesis.position[parent.position.length], before_cursor_node_position[parent.position.length] + 1);
            return {
                root: function_location.root,
                function_value: function_location.function_value,
                input_parameter_index: comma_count,
                expression_call_node_position: left_hand_side_child.position
            };
        }
    }

    const ancestor_expression_call = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Expression_call");
    if (ancestor_expression_call !== undefined) {
        const left_hand_side_node = ancestor_expression_call.node.children[0];
        const function_location = await get_function_value_from_node(root, left_hand_side_node, get_parse_tree);
        if (function_location !== undefined) {
            const ancestor_expression_call_arguments = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Expression_call_arguments");
            if (ancestor_expression_call_arguments !== undefined) {
                const comma_count = count_commas(ancestor_expression_call_arguments.node, 0, before_cursor_node_position[ancestor_expression_call_arguments.position.length] + 1);
                return {
                    root: function_location.root,
                    function_value: function_location.function_value,
                    input_parameter_index: comma_count,
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

export async function get_function_value_and_parameter_index_at_declaration(
    root: Parser_node.Node,
    before_cursor_node_position: number[]
): Promise<{ function_value: Core.Function, parameter_index: number, is_input: boolean, parameter_name_node_position: number[] } | undefined> {

    const ancestor_function_declaration = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Function_declaration");
    if (ancestor_function_declaration === undefined) {
        return undefined;
    }

    const function_parameters = Parser_node.get_child(ancestor_function_declaration, before_cursor_node_position[ancestor_function_declaration.position.length]);
    if (function_parameters === undefined) {
        return undefined;
    }

    const function_value_info = await get_function_value_that_contains_node_position(root, before_cursor_node_position);
    if (function_value_info === undefined) {
        return undefined;
    }

    const get_parameter_index = (): number | undefined => {
        const node_index = before_cursor_node_position[function_parameters.position.length];
        if (node_index === undefined) {
            return undefined;
        }

        const parameter_index = Math.floor(node_index / 2);
        return parameter_index;
    };

    const separator = Parser_node.get_child_if(ancestor_function_declaration, node => node.word.value === "->");

    const is_input_parameter = separator.position[separator.position.length - 1] === before_cursor_node_position[separator.position.length - 1] + 1;
    if (is_input_parameter) {
        const parameter_index = get_parameter_index();
        if (parameter_index !== undefined) {
            const parameters = Parser_node.get_children_if(function_parameters, node => node.word.value === "Function_parameter");
            const parameter = parameters[parameter_index];
            const parameter_name = Parser_node.get_child_if(parameter, node => node.word.value === "Function_parameter_name");
            return {
                function_value: function_value_info.function_value,
                parameter_index: parameter_index,
                is_input: true,
                parameter_name_node_position: parameter_name.position
            };
        }
    }

    const is_output_parameter = separator.position[separator.position.length - 1] + 1 === before_cursor_node_position[separator.position.length - 1];
    if (is_output_parameter) {
        const parameter_index = get_parameter_index();
        if (parameter_index !== undefined) {
            const parameters = Parser_node.get_children_if(function_parameters, node => node.word.value === "Function_parameter");
            const parameter = parameters[parameter_index];
            const parameter_name = Parser_node.get_child_if(parameter, node => node.word.value === "Function_parameter_name");
            return {
                function_value: function_value_info.function_value,
                parameter_index: parameter_index,
                is_input: false,
                parameter_name_node_position: parameter_name.position
            };
        }
    }

    return undefined;
}

export async function find_instantiate_custom_type_reference_from_node_using_parse_tree(
    root: Parser_node.Node,
    node_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Core.Custom_type_reference | undefined> {

    const ancestor_expression_instantiate = Parser_node.get_ancestor_with_name(root, node_position, "Expression_instantiate");
    if (ancestor_expression_instantiate !== undefined) {
        const custom_type_reference = await find_instantiate_custom_type_reference_from_node_using_parse_tree(root, ancestor_expression_instantiate.position, get_parse_tree);
        if (custom_type_reference !== undefined) {
            const declaration = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
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
        const type_reference = get_type_reference_from_node(root, declaration_type_node.children[0]);
        if (type_reference.length > 0) {
            if (type_reference[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                return type_reference[0].data.value as Core.Custom_type_reference;
            }
        }
    }

    const ancestor_struct_member = Parser_node.get_ancestor_with_name(root, node_position, "Struct_member");
    if (ancestor_struct_member !== undefined) {
        const struct_declaration = await get_struct_declaration_that_contains_node_position(root, node_position);
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
        const function_value_location = await get_function_value_that_contains_node_position(root, node_position);
        if (function_value_location !== undefined) {
            const function_declaration = function_value_location.function_value.declaration;
            if (function_declaration.type.output_parameter_types.length > 0) {
                // TODO multiple return types
                const return_type = function_declaration.type.output_parameter_types[0];
                if (return_type.data.type === Core.Type_reference_enum.Custom_type_reference) {
                    return return_type.data.value as Core.Custom_type_reference;
                }
            }
        }
    }

    const ancestor_assignment_expression = Parser_node.get_ancestor_with_name(root, node_position, "Expression_assignment");
    if (ancestor_assignment_expression !== undefined) {
        const function_value = get_function_value_that_contains_node_position(root, node_position);
        if (function_value !== undefined) {
            const left_hand_side_node = ancestor_assignment_expression.node.children[0];
            const left_hand_side_expression = get_expression_from_node(root, left_hand_side_node);
            const left_hand_side_type = await get_expression_type(root, node_position, left_hand_side_expression, get_parse_tree);
            if (left_hand_side_type !== undefined && left_hand_side_type.is_value && left_hand_side_type.type.length > 0 && left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                return left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
            }
        }
    }

    const expression_call_info = await get_function_value_and_parameter_index_from_expression_call(root, node_position, get_parse_tree);
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
    root: Parser_node.Node,
    node_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, node_position: number[], declaration: Core.Declaration } | undefined> {
    const custom_type_reference = await find_instantiate_custom_type_reference_from_node_using_parse_tree(root, node_position, get_parse_tree);
    if (custom_type_reference === undefined) {
        return undefined;
    }

    const module_declaration = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
    if (module_declaration === undefined) {
        return undefined;
    }

    const underlying_type_module_declaration = await get_underlying_type_declaration_from_parse_tree(module_declaration.root, module_declaration.node_position, module_declaration.declaration, get_parse_tree);
    if (underlying_type_module_declaration === undefined) {
        return undefined;
    }

    return underlying_type_module_declaration;
}

export async function find_instantiate_member_from_node(
    root: Parser_node.Node,
    before_cursor_node_position: number[],
    find_best_match: boolean,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ root: Parser_node.Node, declaration: Core.Declaration, member_index: number, member_name: string, member_name_node_position: number[] } | undefined> {

    /*const parent = Parser_node.get_parent(root, before_cursor_node_position);
    if (parent !== undefined && parent.node.word.value === "ERROR") {
        let current_child = Parser_node.get_previous_sibling(root, before_cursor_node_position);
        while (current_child !== undefined && current_child.node.word.value !== "{") {
            current_child = Parser_node.get_previous_sibling(root, current_child.position);
        }

        if (current_child === undefined || current_child.node.word.value !== "{") {
            return undefined;
        }

        const open_braces = current_child;

        const left_hand_side_child = Parser_node.get_previous_sibling(root, current_child.position);
        const function_location = await get_function_value_from_node(root, left_hand_side_child.node, get_parse_tree);
        if (function_location !== undefined) {
            const comma_count = count_commas(parent.node, open_braces.position[parent.position.length], before_cursor_node_position[parent.position.length] + 1);
            return {
                root: function_location.root,
                function_value: function_location.function_value,
                input_parameter_index: comma_count,
                expression_call_node_position: left_hand_side_child.position
            };
        }
    }*/

    const ancestor_expression_instantiate = Parser_node.get_ancestor_with_name(root, before_cursor_node_position, "Expression_instantiate");
    if (ancestor_expression_instantiate === undefined) {
        return undefined;
    }

    const custom_type_reference = await find_instantiate_custom_type_reference_from_node_using_parse_tree(root, ancestor_expression_instantiate.position, get_parse_tree);
    if (custom_type_reference === undefined) {
        return undefined;
    }

    const module_declaration = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
    if (module_declaration === undefined) {
        return undefined;
    }

    const declaration_member_names = get_member_names(module_declaration.declaration);
    if (declaration_member_names.length === 0) {
        return undefined;
    }

    const descendant_members_array = Parser_node.get_child_if(ancestor_expression_instantiate, node => node.word.value === "Expression_instantiate_members");
    const descendant_members = Parser_node.get_children_if(descendant_members_array, node => node.word.value === "Expression_instantiate_member" || node.word.value === "ERROR");

    const comma_count = count_commas(descendant_members_array.node, 0, before_cursor_node_position[descendant_members_array.position.length] + 1);

    if (comma_count < descendant_members.length) {
        const current_member = descendant_members[comma_count];
        const current_member_name = Parser_node.get_child_if(current_member, node => node.word.value === "Expression_instantiate_member_name");
        const current_member_name_value = current_member_name !== undefined ? current_member_name.node.children[0].word.value : "";
        if (current_member_name_value.length > 0) {
            {
                const member_index = declaration_member_names.findIndex(value => value === current_member_name_value);
                if (member_index !== -1) {
                    const declaration = { node: Parser_node.get_node_at_position(module_declaration.root, module_declaration.node_position), position: module_declaration.node_position };
                    const declaration_member_name = Parser_node.find_descendant_position_if(declaration, node => node.word.value === current_member_name_value);
                    return {
                        root: module_declaration.root,
                        declaration: module_declaration.declaration,
                        member_index: member_index,
                        member_name: current_member_name_value,
                        member_name_node_position: declaration_member_name.position
                    };
                }
            }

            // Try to match what the user wrote with the struct members to find the best match:
            if (find_best_match) {
                const existing_members = Parser_node.get_children_if(descendant_members_array, node => node.word.value === "Expression_instantiate_member" || node.word.value === "ERROR");
                const existing_member_names = existing_members.map(node => Parser_node.get_child_if(node, child => child.word.value === "Expression_instantiate_member_name"));
                const existing_member_name_values = existing_member_names.map(node => node.node.children[0].word.value);
                const non_existing_member_names = declaration_member_names.filter(member_name => existing_member_name_values.find(value => value === member_name) === undefined);
                const best_member_name_match = find_best_string_match(current_member_name_value, non_existing_member_names);
                const member_index = declaration_member_names.findIndex(member_name => member_name === best_member_name_match);
                const declaration = { node: Parser_node.get_node_at_position(module_declaration.root, module_declaration.node_position), position: module_declaration.node_position };
                const declaration_member_name = Parser_node.find_descendant_position_if(declaration, node => node.word.value === best_member_name_match);
                return {
                    root: module_declaration.root,
                    declaration: module_declaration.declaration,
                    member_index: member_index,
                    member_name: declaration_member_names[member_index],
                    member_name_node_position: declaration_member_name.position
                };
            }
        }
    }

    const previous_member_name = comma_count > 0 ? get_instantiate_member_name(descendant_members_array, comma_count - 1) : undefined;
    const previous_member_name_value = previous_member_name !== undefined ? previous_member_name.node.children[0].word.value : "";

    const previous_member_index =
        previous_member_name !== undefined ?
            declaration_member_names.findIndex(member_name => member_name === previous_member_name_value) :
            -1;

    const member_index = previous_member_index + 1;

    const member_name_value = declaration_member_names[member_index];
    const declaration = { node: Parser_node.get_node_at_position(module_declaration.root, module_declaration.node_position), position: module_declaration.node_position };
    const declaration_member_name = Parser_node.find_descendant_position_if(declaration, node => node.word.value === member_name_value);

    return {
        root: module_declaration.root,
        declaration: module_declaration.declaration,
        member_index: member_index,
        member_name: member_name_value,
        member_name_node_position: declaration_member_name.position
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

function get_instantiate_member_name(
    instantiate_members: { node: Parser_node.Node, position: number[] },
    parameter_index: number
): { node: Parser_node.Node, position: number[] } | undefined {
    let counter = 0;

    for (let index = 0; index < instantiate_members.node.children.length; ++index) {
        const member = Parser_node.get_child(instantiate_members, index);

        if (counter === parameter_index) {
            if (member.node.word.value === "Expression_instantiate_member") {
                const member_name = Parser_node.get_child_if(member, node => node.word.value === "Expression_instantiate_member_name");
                return member_name;
            }
            continue;
        }

        if (counter > parameter_index) {
            return undefined;
        }

        if (member.node.word.value === ",") {
            counter += 1;
        }
        else if (member.node.word.value === "ERROR") {
            const found_comma = member.node.children.find(grand_child => grand_child.word.value === ",");
            if (found_comma !== undefined) {
                counter += 1;
            }
        }
    }

    return undefined;
}

export enum Component_type {
    Import_module,
    Declaration,
    Member_name,
    Invalid
}

export interface Access_expression_component {
    type: Component_type;
    value: Symbol_module_alias_data | { root: Parser_node.Node, declaration: Core.Declaration, declaration_name_node_position: number[] } | string;
    node: Parser_node.Node;
    node_position: number[];
}

export function get_declaration_name_node_position(root: Parser_node.Node, node_position: number[]): number[] | undefined {
    const declaration_node = Parser_node.get_node_at_position(root, node_position);
    const descendant_declaration_name = Parser_node.find_descendant_position_if({ node: declaration_node, position: node_position }, child => is_declaration_name_grammar_word(child.word.value));
    if (descendant_declaration_name === undefined) {
        return undefined;
    }

    return descendant_declaration_name.position;
}

export async function get_access_expression_components_using_nodes(
    root: Parser_node.Node,
    descendant: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Access_expression_component[]> {

    const components: Access_expression_component[] = [];

    if (descendant.node.word.value === "Expression_access") {
        const left_hand_side = Parser_node.get_child_if(descendant, node => node.word.value === "Generic_expression");
        components.push(...await get_access_expression_components_using_nodes(root, left_hand_side, get_parse_tree));

        const member_name = Parser_node.get_child_if(descendant, node => node.word.value === "Expression_access_member_name");
        const member_name_value = member_name.node.children[0].word.value;

        const last_component = components[components.length - 1];
        if (last_component !== undefined && last_component.type === Component_type.Import_module) {
            const import_module = last_component.value as Symbol_module_alias_data;
            const import_module_name = import_module.module_name;
            const imported_root = await get_parse_tree(import_module_name);
            if (imported_root !== undefined) {
                const declaration_info = await get_declaration_using_parse_tree(imported_root, member_name_value);
                if (declaration_info !== undefined) {
                    const declaration_name_node_position = get_declaration_name_node_position(declaration_info.root, declaration_info.node_position);
                    components.push(
                        {
                            type: Component_type.Declaration,
                            value: {
                                root: imported_root,
                                declaration: declaration_info.declaration,
                                declaration_name_node_position: declaration_name_node_position
                            },
                            node: member_name.node,
                            node_position: member_name.position
                        }
                    );
                }
            }
        }
        else if (last_component !== undefined && last_component.type === Component_type.Declaration) {
            components.push(
                {
                    type: Component_type.Member_name,
                    value: member_name_value,
                    node: member_name.node,
                    node_position: member_name.position
                }
            );
        }
    }
    else if (descendant.node.word.value === "Generic_expression") {
        const child = Parser_node.get_child(descendant, 0);
        if (child.node.word.value === "Expression_variable") {
            const variable_name = child.node.children[0].children[0].word.value;
            const import_symbol = get_import_alias_symbol(root, variable_name);
            if (import_symbol !== undefined) {
                components.push(
                    {
                        type: Component_type.Import_module,
                        value: import_symbol.data as Symbol_module_alias_data,
                        node: child.node,
                        node_position: child.position
                    }
                );
                return components;
            }
        }

        const left_hand_side_expression = Parse_tree_convertor_mappings.node_to_expression(root, descendant.node);
        const left_hand_side_type = await get_expression_type(root, descendant.position, left_hand_side_expression, get_parse_tree);
        if (left_hand_side_type !== undefined && left_hand_side_type.type.length > 0) {
            if (left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                const custom_type_reference = left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
                const module_declaration = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
                if (module_declaration !== undefined) {
                    const declaration_name_node_position = get_declaration_name_node_position(module_declaration.root, module_declaration.node_position);
                    components.push(
                        {
                            type: Component_type.Declaration,
                            value: {
                                root: module_declaration.root,
                                declaration: module_declaration.declaration,
                                declaration_name_node_position: declaration_name_node_position
                            },
                            node: descendant.node,
                            node_position: descendant.position
                        }
                    );
                }
            }
        }
    }
    else if (descendant.node.word.value === ".") {
        const parent = Parser_node.get_parent(root, descendant.position);

        if (parent.node.word.value === "ERROR") {
            const dot_children = Parser_node.get_children_if(parent, node => node.word.value === ".");
            const last_dot_child = dot_children[dot_children.length - 1];
            if (last_dot_child !== undefined) {
                const dot_child_index = last_dot_child.position[last_dot_child.position.length - 1];
                const before_dot_child_index = dot_child_index - 1;
                const before_dot = Parser_node.get_child(parent, before_dot_child_index);
                const before_dot_components = await get_access_expression_components_using_nodes(root, { node: before_dot.node, position: before_dot.position }, get_parse_tree);
                components.push(...before_dot_components);

                const after_dot_child_index = dot_child_index + 1;
                const after_dot = Parser_node.get_child(parent, after_dot_child_index);
                if (after_dot.node !== undefined) {
                    const after_dot_components = await get_access_expression_components_using_nodes(root, { node: after_dot.node, position: after_dot.position }, get_parse_tree);
                    components.push(...after_dot_components);
                }
                else {
                    components.push(
                        {
                            type: Component_type.Invalid,
                            value: "",
                            node: undefined,
                            node_position: after_dot.position
                        }
                    );
                }

                return components;
            }
        }
    }

    return components;
}

export async function get_access_expression_components(
    root: Parser_node.Node,
    access_expression: Core.Access_expression,
    access_expression_node: Parser_node.Node,
    access_expression_node_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Access_expression_component[]> {

    const components: Access_expression_component[] = [];

    const left_hand_side_expression = access_expression.expression;
    if (left_hand_side_expression.data.type === Core.Expression_enum.Access_expression) {
        const descendant_left_hand_side = Parser_node.find_descendant_position_if({ node: access_expression_node.children[0], position: [...access_expression_node_position, 0] }, child => child.word.value === "Expression_access");
        if (descendant_left_hand_side !== undefined) {
            const left_hand_side_components = await get_access_expression_components(root, left_hand_side_expression.data.value as Core.Access_expression, descendant_left_hand_side.node, descendant_left_hand_side.position, get_parse_tree);
            components.push(...left_hand_side_components);
        }
    }
    else if (left_hand_side_expression.data.type === Core.Expression_enum.Variable_expression) {
        const variable_expression = left_hand_side_expression.data.value as Core.Variable_expression;
        const descendant_variable_expression = Parser_node.find_descendant_position_if({ node: access_expression_node.children[0], position: [...access_expression_node_position, 0] }, child => child.word.value === "Expression_variable");
        if (descendant_variable_expression !== undefined) {
            const import_symbol = get_import_alias_symbol(root, variable_expression.name);
            if (import_symbol !== undefined) {
                components.push(
                    {
                        type: Component_type.Import_module,
                        value: import_symbol.data as Symbol_module_alias_data,
                        node: descendant_variable_expression.node,
                        node_position: [...access_expression_node_position, ...descendant_variable_expression.position]
                    }
                );
            }
            else {
                const left_hand_side_type = await get_expression_type(root, access_expression_node_position, left_hand_side_expression, get_parse_tree);
                if (left_hand_side_type !== undefined && left_hand_side_type.type.length > 0) {
                    if (left_hand_side_type.type[0].data.type === Core.Type_reference_enum.Custom_type_reference) {
                        const custom_type_reference = left_hand_side_type.type[0].data.value as Core.Custom_type_reference;
                        const module_declaration = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
                        if (module_declaration !== undefined) {
                            const declaration_name_node_position = get_declaration_name_node_position(module_declaration.root, module_declaration.node_position);
                            components.push(
                                {
                                    type: Component_type.Declaration,
                                    value: {
                                        root: module_declaration.root,
                                        declaration: module_declaration.declaration,
                                        declaration_name_node_position: declaration_name_node_position
                                    },
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

    if (components.length > 0) {
        const last_component = components[components.length - 1];
        if (last_component.type === Component_type.Import_module) {
            const import_module_symbol_data = last_component.value as Symbol_module_alias_data;
            const imported_root = await get_parse_tree(import_module_symbol_data.module_name);
            if (imported_root !== undefined) {
                const declaration_info = await get_declaration_using_parse_tree(imported_root, access_expression.member_name);
                if (declaration_info !== undefined) {
                    const declaration_name_node_position = get_declaration_name_node_position(declaration_info.root, declaration_info.node_position);
                    components.push(
                        {
                            type: Component_type.Declaration,
                            value: {
                                root: declaration_info.root,
                                declaration: declaration_info.declaration,
                                declaration_name_node_position: declaration_name_node_position
                            },
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

            const module_declaration = last_component.value as { root: Parser_node.Node, declaration: Core.Declaration };
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

export interface Text_change_2 {
    range: Text_range;
    text: string;
}

export async function get_declaration_members(
    root: Parser_node.Node,
    declaration: Core.Declaration,
    declaration_name_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ index: number, name: string }[]> {
    if (declaration.type === Core.Declaration_type.Alias) {
        const underlying_declaration = await get_underlying_type_declaration(root, declaration, declaration_name_position, get_parse_tree);
        if (underlying_declaration === undefined) {
            return [];
        }
        return get_declaration_members(root, underlying_declaration.declaration, underlying_declaration.declaration_name_position, get_parse_tree);
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
    root: Parser_node.Node,
    declaration: Core.Declaration,
    declaration_name_position: number[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<{ index: number, name: string, type: Core.Type_reference }[]> {
    if (declaration.type === Core.Declaration_type.Alias) {
        const underlying_declaration = await get_underlying_type_declaration(root, declaration, declaration_name_position, get_parse_tree);
        if (underlying_declaration === undefined) {
            return [];
        }
        return get_declaration_member_types(root, underlying_declaration.declaration, underlying_declaration.declaration_name_position, get_parse_tree);
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
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<boolean> {

    if (type_reference.length !== 1 || type_reference[0].data.type !== Core.Type_reference_enum.Custom_type_reference) {
        return false;
    }

    const custom_type_reference = type_reference[0].data.value as Core.Custom_type_reference;
    const module_declaration = await get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
    if (module_declaration === undefined) {
        return false;
    }

    return module_declaration.declaration.type === Core.Declaration_type.Enum;
}

export async function is_enum_value_expression(
    expression_type: Expression_type_reference,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<boolean> {
    if (expression_type.type === undefined || !expression_type.is_value) {
        return false;
    }

    return is_enum_type(expression_type.type, get_parse_tree);
}

export function create_module_name_and_imports_getter_from_root(
    root: Parser_node.Node
): Type_utilities.Module_name_and_imports_getter {
    return {
        get_module_name: () => {
            return get_module_name_from_tree(root)
        },
        get_imports: () => {
            const import_symbols = get_import_alias_symbols(root);
            const data = import_symbols.map(value => value.data as Symbol_module_alias_data);
            return data.map(value => {
                return {
                    module_name: value.module_name,
                    alias: value.module_alias,
                    usages: []
                };
            })
        }
    };
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
