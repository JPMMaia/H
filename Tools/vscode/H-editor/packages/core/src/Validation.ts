import * as Core from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Parse_tree_analysis from "./Parse_tree_analysis";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
import * as Tree_sitter from "tree-sitter";
import * as Type_utilities from "./Type_utilities";

const g_debug = false;

export interface Position {
    line: number;
    column: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Location {
    uri: string;
    range: Range;
}

export enum Diagnostic_severity {
    Error = 1,
    Warning = 2,
    Information = 3,
    Hint = 4,
}

function severity_to_string(severity: Diagnostic_severity): string {
    switch (severity) {
        case Diagnostic_severity.Error:
            return "Error";
        case Diagnostic_severity.Warning:
            return "Warning";
        case Diagnostic_severity.Information:
            return "Information";
        case Diagnostic_severity.Hint:
            return "Hint";
    }
}

export enum Source {
    Parser = "Parser",
    Parse_tree_validation = "Parse Tree Validation",
    Scanner = "Scanner"
}

export interface Related_information {
    location: Location;
    message: string;
}

export interface Diagnostic {
    location: Location;
    source: Source;
    severity: Diagnostic_severity;
    message: string;
    related_information: Related_information[];
}

export function to_string(diagnostics: Diagnostic[]): string[] {
    const array: string[] = [];

    for (const diagnostic of diagnostics) {
        const location = `${diagnostic.location.uri}#L${diagnostic.location.range.start.line}:${diagnostic.location.range.start.column}`;
        const severity = severity_to_string(diagnostic.severity);
        const message = `${severity}: ${diagnostic.message} (${location})`;
        array.push(message);
    }

    return array;
}

export function validate_scanned_input(
    uri: string,
    scanned_input: Scanner.Scanned_word[]
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    for (const word of scanned_input) {
        if (word.type === Grammar.Word_type.Invalid) {
            diagnostics.push(
                {
                    location: get_scanned_word_source_location(uri, word),
                    source: Source.Scanner,
                    severity: Diagnostic_severity.Error,
                    message: `Invalid expression '${word.value}'.`,
                    related_information: [],
                }
            );
        }
    }

    return diagnostics;
}

export function validate_syntax_errors(
    uri: string,
    node: Tree_sitter.SyntaxNode
): Diagnostic[] {

    if (!node.hasError) {
        return [];
    }

    const diagnostics: Diagnostic[] = [];

    const process_node = (current_node: Tree_sitter.SyntaxNode) => {

        if (current_node.isError || current_node.isMissing) {
            diagnostics.push(
                {
                    location: {
                        uri: uri,
                        range: {
                            start: {
                                line: current_node.startPosition.row,
                                column: current_node.startPosition.column,
                            },
                            end: {
                                line: current_node.endPosition.row,
                                column: current_node.endPosition.column,
                            },
                        },
                    },
                    source: Source.Parser,
                    severity: Diagnostic_severity.Error,
                    message: current_node.isError ? `Did not expect expression '${current_node.grammarType}'.` : `Missing expression '${current_node.grammarType}'.`,
                    related_information: [],
                }
            );
        }

        for (const child of current_node.children) {
            process_node(child);
        }
    };

    process_node(node);

    return diagnostics;
}

export function validate_parser_node(
    uri: string,
    new_node_position: number[],
    new_node: Parser_node.Node
): Diagnostic[] {

    const node_stack = [new_node];
    const node_position_stack = [new_node_position];

    const diagnostics: Diagnostic[] = [];

    while (node_stack.length > 0) {
        const current_node = node_stack.pop() as Parser_node.Node;
        const current_node_position = node_position_stack.pop() as number[];

        if (current_node.production_rule_index !== undefined) {
            const node_diagnostics = validate_current_parser_node(uri, { node: current_node, position: current_node_position });
            diagnostics.push(...node_diagnostics);
        }

        for (let child_index = 0; child_index < current_node.children.length; ++child_index) {
            node_stack.push(current_node.children[child_index]);
            node_position_stack.push([...current_node_position, child_index]);
        }

        if (g_debug) {
            console.log(`[${node_stack.map(node => node.word.value).join(", ")}]`);
        }
    }

    return diagnostics;
}

export async function validate_module(
    uri: string,
    text: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    new_node_position: number[],
    new_node: Parser_node.Node,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const node_stack = [new_node];
    const node_position_stack = [new_node_position];

    const diagnostics: Diagnostic[] = [];

    while (node_stack.length > 0) {
        const current_node = node_stack.pop() as Parser_node.Node;
        const current_node_position = node_position_stack.pop() as number[];

        {
            const node_diagnostics = await validate_current_parser_node_with_module(uri, text, core_module, root, { node: current_node, position: current_node_position }, get_parse_tree);
            diagnostics.push(...node_diagnostics);
        }

        for (let index = 0; index < current_node.children.length; ++index) {
            const child_index = current_node.children.length - index - 1;
            node_stack.push(current_node.children[child_index]);
            node_position_stack.push([...current_node_position, child_index]);
        }

        if (g_debug) {
            console.log(`[${node_stack.map(node => node.word.value).join(", ")}]`);
        }
    }

    const unique_diagnostics = sort_and_remove_duplicates(diagnostics);

    return unique_diagnostics;
}

function sort_and_remove_duplicates(diagnostics: Diagnostic[]): Diagnostic[] {

    diagnostics.sort((a, b) => {
        if (a.location.range.start.line < b.location.range.start.line) {
            return -1;
        }
        else if (a.location.range.start.line > b.location.range.start.line) {
            return 1;
        }
        else if (a.location.range.start.column < b.location.range.start.column) {
            return -1;
        }
        else if (a.location.range.start.column > b.location.range.start.column) {
            return 1;
        }
        else {
            return 0;
        }
    });

    const unique_diagnostics: Diagnostic[] = [];

    for (const diagnostic of diagnostics) {
        const found = unique_diagnostics.findIndex(this_diagnostic => deep_equal(this_diagnostic, diagnostic));
        if (found === -1) {
            unique_diagnostics.push(diagnostic);
        }
    }

    return unique_diagnostics;
}



function validate_current_parser_node(
    uri: string,
    new_value: { node: Parser_node.Node, position: number[] },
): Diagnostic[] {

    switch (new_value.node.word.value) {
        case "Expression_constant": {
            return validate_constant_expression(uri, Parser_node.get_child(new_value, 0));
        }
        case "Expression_invalid": {
            return [
                {
                    location: get_parser_node_position_source_location(uri, new_value),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: "Invalid expression.",
                    related_information: []
                }
            ];
        }
    }

    return [];
}

async function validate_current_parser_node_with_module(
    uri: string,
    text: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    new_value: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    switch (new_value.node.word.value) {
        case "Import": {
            return await validate_import(uri, root, new_value, get_parse_tree);
        }
        case "Type": {
            return validate_type(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Declaration": {
            return validate_declaration(uri, root, new_value);
        }
        case "Enum": {
            return await validate_enum(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Global_variable": {
            return await validate_global_variable(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Struct": {
            return await validate_struct(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Union": {
            return validate_union(uri, core_module, new_value);
        }
        case "Function_precondition":
        case "Function_postcondition": {
            return await validate_function_condition(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_access": {
            return validate_access_expression(uri, root, new_value, get_parse_tree);
        }
        case "Expression_assignment": {
            return validate_assignment_expression(uri, root, new_value, get_parse_tree);
        }
        case "Expression_binary": {
            return validate_binary_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_break":
        case "break": {
            return validate_break_expression(uri, root, new_value);
        }
        case "Expression_call": {
            return validate_call_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_cast": {
            return validate_cast_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_constant": {
            return validate_constant_expression(uri, Parser_node.get_child(new_value, 0));
        }
        case "Expression_continue":
        case "continue": {
            return validate_continue_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_for_loop": {
            return validate_for_loop_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_if": {
            return validate_if_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_instantiate": {
            return validate_instantiate_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_return": {
            return validate_return_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_switch": {
            return validate_switch_expression(uri, root, new_value, get_parse_tree);
        }
        case "Expression_ternary_condition": {
            return validate_ternary_condition_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_unary": {
            return validate_unary_expression(uri, root, new_value, get_parse_tree);
        }
        case "Expression_variable": {
            return validate_variable_expression(uri, root, new_value, get_parse_tree);
        }
        case "Expression_variable_declaration": {
            return validate_variable_declaration_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_variable_declaration_with_type": {
            return validate_variable_declaration_with_type_expression(uri, core_module, root, new_value, get_parse_tree);
        }
        case "Expression_while_loop": {
            return validate_while_loop_expression(uri, core_module, root, new_value, get_parse_tree);
        }
    }

    return [];
}

async function validate_import(
    uri: string,
    root: Parser_node.Node,
    descendant_import: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_import_alias = Parser_node.find_descendant_position_if(descendant_import, descendant => descendant.word.value === "Import_alias");
    if (descendant_import_alias === undefined) {
        return diagnostics;
    }

    const import_alias = descendant_import_alias.node.children[0].word.value;

    if (is_import_alias_duplicate(root, import_alias)) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_import_alias),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Duplicate import alias '${import_alias}'.`,
            related_information: [],
        });
    }

    const descendant_import_name = Parser_node.find_descendant_position_if(descendant_import, descendant => descendant.word.value === "Import_name");
    if (descendant_import_name === undefined) {
        return diagnostics;
    }

    const import_module_name = get_identifier_with_dots_string(descendant_import_name.node.children[0]);
    const imported_root = await get_parse_tree(import_module_name);
    if (imported_root === undefined) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_import_name),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Cannot find module '${import_module_name}'.`,
            related_information: [],
        });
    }

    return diagnostics;
}

function get_identifier_with_dots_string(
    identifier_with_dots_node: Parser_node.Node
): string {
    return identifier_with_dots_node.children.map(node => node.word.value).join("");
}

function is_import_alias_duplicate(
    root: Parser_node.Node,
    import_alias: string
): boolean {

    const import_alias_symbols = Parse_tree_analysis.get_import_alias_symbols(root);

    let count = 0;
    for (const symbol of import_alias_symbols) {
        const symbol_data = symbol.data as Parse_tree_analysis.Symbol_module_alias_data;
        if (symbol_data.module_alias === import_alias) {
            ++count;
        }
    }
    return count > 1;
}

function is_boolean_type(
    type_reference: Core.Type_reference[]
): boolean {
    if (type_reference.length !== 1) {
        return false;
    }

    const data = type_reference[0].data;
    if (data.type !== Core.Type_reference_enum.Fundamental_type) {
        return false;
    }

    const fundamental_type = data.value as Core.Fundamental_type;
    return fundamental_type === Core.Fundamental_type.Bool || fundamental_type === Core.Fundamental_type.C_bool;
}

async function validate_type(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_type: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const child = Parser_node.get_child(descendant_type, 0);
    if (child === undefined) {
        return diagnostics;
    }

    if (child.node.word.value === "Pointer_type") {
        const descendant_value_type = Parser_node.find_descendant_position_if(descendant_type, descendant => descendant.word.value === "Type");
        if (descendant_value_type === undefined) {
            return diagnostics;
        }

        return validate_type(uri, core_module, root, descendant_value_type, get_parse_tree);
    }
    else if (child.node.word.value === "Type_name") {
        const type_name = child.node.children[0].word.value;

        if (type_name.startsWith("Int") || type_name.startsWith("Uint")) {
            const start_index = type_name[0] === "I" ? 3 : 4;
            const number_of_bits = Number.parseInt(type_name.substring(start_index));
            if (!Number.isNaN(number_of_bits) && number_of_bits > 64) {
                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, child),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Number of bits of integer cannot be larger than 64.`,
                    related_information: [],
                });
                return diagnostics;
            }
        }
        else if (!is_builtin_type_name(type_name)) {
            const declaration = core_module.declarations.find(declaration => declaration.name === type_name);
            if (declaration === undefined) {
                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, child),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Type '${type_name}' does not exist.`,
                    related_information: [],
                });
                return diagnostics;
            }
        }
    }
    else if (child.node.word.value === "Module_type") {
        const descendant_module_alias_name = Parser_node.find_descendant_position_if(descendant_type, descendant => descendant.word.value === "Module_type_module_name");
        const descendant_type_name = Parser_node.find_descendant_position_if(descendant_type, descendant => descendant.word.value === "Module_type_type_name");
        if (descendant_module_alias_name === undefined || descendant_type_name === undefined) {
            return diagnostics;
        }

        const module_alias_name = descendant_module_alias_name.node.children[0].word.value;
        const type_name = descendant_type_name.node.children[0].word.value;

        const module_import = core_module.imports.find(module_import => module_import.alias === module_alias_name);
        if (module_import === undefined) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_module_alias_name),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Module alias '${module_alias_name}' does not exist.`,
                related_information: [],
            });
            return diagnostics;
        }

        const imported_root = await get_parse_tree(module_import.module_name);
        if (imported_root !== undefined) {
            const declaration_symbol = await Parse_tree_analysis.get_declaration_symbol(imported_root, type_name);
            if (declaration_symbol === undefined) {
                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_type_name),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Type '${module_alias_name}.${type_name}' does not exist.`,
                    related_information: [],
                });
                return diagnostics;
            }
        }
    }

    return diagnostics;
}

async function validate_declaration(
    uri: string,
    root: Parser_node.Node,
    descendant_declaration: { node: Parser_node.Node, position: number[] }
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_declaration_name = Parser_node.find_descendant_position_if(descendant_declaration, descendant => is_declaration_name_node(descendant));
    if (descendant_declaration_name === undefined) {
        return diagnostics;
    }
    if (descendant_declaration_name.node.children.length === 0 || descendant_declaration_name.node.children[0].word.value === "") {
        const terminal_node = Parser_node.get_next_terminal_node(descendant_declaration.node, descendant_declaration.node, []);
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, { node: terminal_node.node, position: [...descendant_declaration.position, ...terminal_node.position] }),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Declaration name cannot be empty.`,
            related_information: [],
        });
        return diagnostics;
    }

    const declaration_name = descendant_declaration_name.node.children[0].word.value;

    if (is_builtin_type_name(declaration_name)) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_declaration_name),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Invalid declaration name '${declaration_name}' which is a reserved keyword.`,
            related_information: [],
        });
    }
    else if (await is_declaration_duplicate(root, declaration_name)) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_declaration_name),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Duplicate declaration name '${declaration_name}'.`,
            related_information: [],
        });
    }

    return diagnostics;
}

async function is_declaration_duplicate(
    root: Parser_node.Node,
    declaration_name: string
): Promise<boolean> {

    const declaration_symbols = await Parse_tree_analysis.get_declaration_symbols(root);

    let count = 0;
    for (const symbol of declaration_symbols) {
        if (symbol.name === declaration_name) {
            ++count;
        }
    }
    return count > 1;
}

function is_declaration_name_node(node: Parser_node.Node): boolean {
    if (node.production_rule_index === undefined) {
        return false;
    }

    switch (node.word.value) {
        case "Alias_name":
        case "Enum_name":
        case "Function_name":
        case "Struct_name":
        case "Union_name":
            return true;
        default:
            return false;
    }
}

function is_builtin_type_name(type_name: string): boolean {

    switch (type_name) {
        case "true":
        case "false":
            return true;
    }

    const type_reference = Type_utilities.parse_type_name(type_name);
    if (type_reference.length === 0) {
        return true;
    }

    return type_reference[0].data.type !== Core.Type_reference_enum.Custom_type_reference;
}

async function validate_enum(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_enum: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_enum_name = Parser_node.find_descendant_position_if(descendant_enum, descendant => descendant.word.value === "Enum_name");
    if (descendant_enum_name === undefined) {
        return diagnostics;
    }
    const enum_name = descendant_enum_name.node.children[0].word.value;
    const declaration = core_module.declarations.find(declaration => declaration.name === enum_name);
    if (declaration === undefined) {
        return diagnostics;
    }

    const descendant_enum_values = Parser_node.find_descendants_if(descendant_enum, descendant => descendant.word.value === "Enum_value");

    diagnostics.push(...validate_member_names_are_different(uri, enum_name, descendant_enum_values, "Enum_value_name"));
    diagnostics.push(...await validate_enum_value_generic_expressions(uri, core_module, declaration, root, descendant_enum_values, get_parse_tree));
    diagnostics.push(...validate_member_expressions_are_computed_at_compile_time(uri, declaration.name, descendant_enum_values, "Enum_value_name", "Generic_expression", ["Expression_variable", "Variable_name"]));
    diagnostics.push(...validate_enum_values_use_previous_values(uri, enum_name, descendant_enum_values));

    return diagnostics;
}

function validate_enum_values_use_previous_values(
    uri: string,
    enum_name: string,
    members: { node: Parser_node.Node, position: number[] }[],
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    const enum_value_names = members.map(member => {
        const enum_value_name = Parser_node.find_descendant_position_if(member, node => node.word.value === "Enum_value_name");
        if (enum_value_name === undefined) {
            return undefined;
        }

        return enum_value_name.node.children[0].word.value;
    }).filter(name => name !== undefined) as string[];

    for (let member_index = 0; member_index < members.length; ++member_index) {
        const descendant_member = members[member_index];

        const descendant_expression = Parser_node.find_descendant_position_if(descendant_member, node => node.word.value === "Generic_expression");
        if (descendant_expression === undefined) {
            continue;
        }

        const descendant_variable_names = Parser_node.find_descendants_if(descendant_expression, node => node.word.value === "Variable_name").map(node => Parser_node.get_child(node, 0));

        for (const descendant_variable_name of descendant_variable_names) {

            const enum_value_name = descendant_variable_name.node.word.value;

            const index = enum_value_names.findIndex(name => name === enum_value_name);
            if (index === -1) {
                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_variable_name),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Cannot use '${enum_value_name}' to calculate '${enum_name}.${enum_value_names[member_index]}'.`,
                    related_information: [],
                });
            }
            else if (index >= member_index) {
                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_variable_name),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `The enum value '${enum_name}.${enum_value_names[member_index]}' can only be calculated using previous enum values.`,
                    related_information: [],
                });
            }
        }
    }

    return diagnostics;
}

async function validate_global_variable(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_global_variable: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_variable_name = Parser_node.find_descendant_position_if(descendant_global_variable, descendant => descendant.word.value === "Global_variable_name");
    if (descendant_variable_name === undefined) {
        return diagnostics;
    }
    const variable_name = descendant_variable_name.node.children[0].word.value;
    const declaration = core_module.declarations.find(declaration => declaration.name === variable_name);
    if (declaration === undefined || declaration.type !== Core.Declaration_type.Global_variable) {
        return diagnostics;
    }
    const global_variable_declaration = declaration.value as Core.Global_variable_declaration;

    const descendant_expression = Parser_node.find_descendant_position_if(descendant_global_variable, descendant => descendant.word.value === "Generic_expression_or_instantiate");
    if (descendant_expression !== undefined) {
        if (!is_expression_computable_at_compile_time(descendant_expression, [])) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `The value of '${variable_name}' must be a computable at compile-time.`,
                related_information: [],
            });
        }

        if (global_variable_declaration.type !== undefined) {
            const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_expression.node);
            const expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_expression.position, expression, get_parse_tree);

            if (expression_type !== undefined && !expression_type.is_value) {
                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Expected a value, but got a type.`,
                    related_information: [],
                });
            }
            else if (expression_type === undefined || expression_type.type.length === 0 || (expression_type.type.length > 0 && !deep_equal(expression_type.type[0], global_variable_declaration.type) && !are_compatible_pointer_types(expression_type.type, [global_variable_declaration.type]))) {

                const member_type_string = Type_utilities.get_type_name([global_variable_declaration.type]);
                const expression_type_string = expression_type !== undefined ? Type_utilities.get_type_name(expression_type.type) : "<undefined>";

                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Expression type '${expression_type_string}' does not match expected type '${member_type_string}'.`,
                    related_information: [],
                });
            }
        }
    }

    return diagnostics;
}

async function validate_struct(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_struct: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_struct_name = Parser_node.find_descendant_position_if(descendant_struct, descendant => descendant.word.value === "Struct_name");
    if (descendant_struct_name === undefined || descendant_struct_name.node.children.length === 0 || descendant_struct_name.node.children[0].word.value === "") {
        return diagnostics;
    }
    const struct_name = descendant_struct_name.node.children[0].word.value;
    const declaration = core_module.declarations.find(declaration => declaration.name === struct_name);
    if (declaration === undefined || declaration.type !== Core.Declaration_type.Struct) {
        return diagnostics;
    }
    const struct_declaration = declaration.value as Core.Struct_declaration;

    const descendant_struct_values = Parser_node.find_descendants_if(descendant_struct, descendant => descendant.word.value === "Struct_member");

    diagnostics.push(...validate_member_names_are_different(uri, struct_name, descendant_struct_values, "Struct_member_name"));
    diagnostics.push(...await validate_struct_member_default_value_expressions(uri, declaration, struct_declaration, root, descendant_struct_values, get_parse_tree));
    diagnostics.push(...validate_member_expressions_are_computed_at_compile_time(uri, declaration.name, descendant_struct_values, "Struct_member_name", "Generic_expression", []));

    return diagnostics;
}

function validate_union(
    uri: string,
    core_module: Core.Module,
    descendant_union: { node: Parser_node.Node, position: number[] },
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    const descendant_union_name = Parser_node.find_descendant_position_if(descendant_union, descendant => descendant.word.value === "Union_name");
    if (descendant_union_name === undefined || descendant_union_name.node.children.length === 0 || descendant_union_name.node.children[0].word.value === "") {
        return diagnostics;
    }
    const union_name = descendant_union_name.node.children[0].word.value;
    const declaration = core_module.declarations.find(declaration => declaration.name === union_name);
    if (declaration === undefined) {
        return diagnostics;
    }

    const descendant_union_values = Parser_node.find_descendants_if(descendant_union, descendant => descendant.word.value === "Union_member");

    diagnostics.push(...validate_member_names_are_different(uri, union_name, descendant_union_values, "Union_member_name"));

    return diagnostics;
}

async function validate_function_condition(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_function_condition: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_expression = Parser_node.find_descendant_position_if(descendant_function_condition, descendant => descendant.word.value === "Generic_expression");
    if (descendant_expression === undefined) {
        return diagnostics;
    }

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    {
        const expected_type = [Parse_tree_analysis.create_boolean_type()];
        diagnostics.push(...await validate_expression_type_is(uri, core_module, root, descendant_expression, expected_type, is_boolean_type, get_parse_tree));
    }

    {
        const descendant_variable_expressions = Parser_node.find_descendants_if(descendant_function_condition, descendant => descendant.word.value === "Expression_variable");
        for (const descendant_variable_expression of descendant_variable_expressions) {
            const variable_name = descendant_variable_expression.node.children[0].children[0].word.value;
            const declaration_symbol = await Parse_tree_analysis.get_declaration_symbol(root, variable_name);
            if (declaration_symbol !== undefined && declaration_symbol.symbol_type === Parse_tree_analysis.Symbol_type.Value) {
                const ancestor_declaration = Parser_node.get_ancestor_with_name(root, declaration_symbol.node_position, "Declaration");
                if (ancestor_declaration.node.children[ancestor_declaration.node.children.length - 1].word.value === "Global_variable") {
                    const global_variable_node = ancestor_declaration.node.children[ancestor_declaration.node.children.length - 1];
                    const mutability_node = Parser_node.get_child_if({ node: global_variable_node, position: [] }, child => child.word.value === "Global_variable_mutability");
                    if (mutability_node.node.children[0].word.value === "mutable") {
                        diagnostics.push({
                            location: get_parser_node_position_source_location(uri, descendant_variable_expression),
                            source: Source.Parse_tree_validation,
                            severity: Diagnostic_severity.Error,
                            message: `Cannot use mutable global variable in function preconditions and postconditions. Consider making the global constant.`,
                            related_information: [],
                        });
                    }
                }
            }
        }
    }

    return diagnostics;
}

async function validate_enum_value_generic_expressions(
    uri: string,
    core_module: Core.Module,
    declaration: Core.Declaration,
    root: Parser_node.Node,
    members: { node: Parser_node.Node, position: number[] }[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_expressions = members.map(member => Parser_node.find_descendant_position_if(member, node => node.word.value === "Generic_expression"));

    const int32_type = Parse_tree_analysis.create_integer_type(32, true);

    for (let member_index = 0; member_index < members.length; ++member_index) {
        const descendant_member = members[member_index];
        const descendant_expression = descendant_expressions[member_index];
        if (descendant_expression === undefined) {
            continue;
        }

        const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_expression.node);
        const expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_expression.position, expression, get_parse_tree);
        if (expression_type !== undefined && expression_type.is_value && !deep_equal(expression_type.type, [int32_type])) {

            const descendant_member_name = Parser_node.find_descendant_position_if(descendant_member, node => node.word.value === "Enum_value_name");
            if (descendant_member_name !== undefined) {
                const member_name = descendant_member_name.node.children[0].word.value;

                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `The enum value assigned to '${declaration.name}.${member_name}' must be a Int32 type.`,
                    related_information: [],
                });
            }
        }
    }

    return diagnostics;
}

async function validate_struct_member_default_value_expressions(
    uri: string,
    declaration: Core.Declaration,
    struct_declaration: Core.Struct_declaration,
    root: Parser_node.Node,
    members: { node: Parser_node.Node, position: number[] }[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_expressions = members.map(member => Parser_node.find_descendant_position_if(member, node => node.word.value === "Generic_expression_or_instantiate"));

    for (let member_index = 0; member_index < members.length; ++member_index) {
        const descendant_expression = descendant_expressions[member_index];
        if (descendant_expression === undefined) {
            continue;
        }

        const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_expression.node);
        const expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_expression.position, expression, get_parse_tree);

        const member_type = struct_declaration.member_types[member_index];

        if (expression_type !== undefined && !expression_type.is_value) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Expected a value, but got a type.`,
                related_information: [],
            });
        }
        else if (expression_type === undefined && expression.data.type === Core.Expression_enum.Instantiate_expression) {
            const member_name = struct_declaration.member_names[member_index];

            const member_type_string = Type_utilities.get_type_name([member_type]);

            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Cannot initialize '${declaration.name}.${member_name}' member of type '${member_type_string}' with an instantiate expression.`,
                related_information: [],
            });
        }
        else if (expression_type === undefined || expression_type.type.length === 0 || (expression_type.type.length > 0 && !deep_equal(expression_type.type[0], member_type) && !are_compatible_pointer_types(expression_type.type, [member_type]))) {

            const member_name = struct_declaration.member_names[member_index];

            const member_type_string = Type_utilities.get_type_name([member_type]);
            const expression_type_string = expression_type !== undefined ? Type_utilities.get_type_name(expression_type.type) : "<undefined>";

            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Cannot assign expression of type '${expression_type_string}' to '${declaration.name}.${member_name}' of type '${member_type_string}'.`,
                related_information: [],
            });
        }
    }

    return diagnostics;
}

function validate_member_names_are_different(
    uri: string,
    declaration_name: string,
    members: { node: Parser_node.Node, position: number[] }[],
    member_name_node_name: string,
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    const descendant_member_names = members.map(member => Parser_node.find_descendant_position_if(member, node => node.word.value === member_name_node_name));
    const member_names = descendant_member_names.map(value => value !== undefined ? value.node.children[0].word.value : "");

    for (let member_index = 0; member_index < descendant_member_names.length; ++member_index) {
        const descendant_member_name = descendant_member_names[member_index];
        if (descendant_member_name === undefined) {
            continue;
        }

        const member_name = member_names[member_index];

        const duplicate_index = member_names.findIndex((current_name, current_index) => current_index !== member_index && current_name === member_name);
        if (duplicate_index === -1) {
            continue;
        }

        diagnostics.push({
            location: get_parser_node_position_source_location(uri, Parser_node.get_child(descendant_member_name, 0)),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Duplicate member name '${declaration_name}.${member_name}'.`,
            related_information: [],
        });
    }

    return diagnostics;
}

function validate_member_expressions_are_computed_at_compile_time(
    uri: string,
    declaration_name: string,
    members: { node: Parser_node.Node, position: number[] }[],
    member_name_node_name: string,
    expression_node_name: string,
    additional_labels_to_allow: string[],
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    for (let member_index = 0; member_index < members.length; ++member_index) {
        const descendant_member = members[member_index];

        const descendant_expression = Parser_node.find_descendant_position_if(descendant_member, node => node.word.value === expression_node_name);
        if (descendant_expression === undefined) {
            continue;
        }

        if (!is_expression_computable_at_compile_time(descendant_expression, additional_labels_to_allow)) {
            const descendant_member_name = Parser_node.find_descendant_position_if(descendant_member, node => node.word.value === member_name_node_name);
            if (descendant_member_name !== undefined) {
                const member_name = descendant_member_name.node.children[0].word.value;

                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `The value of '${declaration_name}.${member_name}' must be a computable at compile-time.`,
                    related_information: [],
                });
            }
        }
    }

    return diagnostics;
}

function is_expression_computable_at_compile_time(
    descendant_expression: { node: Parser_node.Node, position: number[] },
    additional_labels_to_allow: string[]
): boolean {

    const non_constant_descendants = Parser_node.find_descendant_position_if(descendant_expression, node => {

        if (node.production_rule_index === undefined || node.children.length === 0) {
            return false;
        }

        if (node.word.value.startsWith("Generic_expression") || node.word.value.startsWith("Expression_level")) {
            return false;
        }

        if (node.word.value.startsWith("Expression_binary")) {
            return false;
        }

        if (node.word.value === "Expression_constant") {
            return false;
        }

        if (node.word.value === "Expression_null_pointer") {
            return false;
        }

        if (additional_labels_to_allow.find(label => label === node.word.value) !== undefined) {
            return false;
        }

        return true;
    });

    return non_constant_descendants === undefined;
}

async function validate_access_expression(
    uri: string,
    root: Parser_node.Node,
    descendant_access_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_access_expression.node);
    if (expression === undefined || expression.data.type !== Core.Expression_enum.Access_expression) {
        return diagnostics;
    }

    const access_expression = expression.data.value as Core.Access_expression;;
    const access_components = await Parse_tree_analysis.get_access_expression_components(root, access_expression, descendant_access_expression.node, descendant_access_expression.position, get_parse_tree);

    if (access_components.length >= 2) {
        const last_component = access_components[access_components.length - 1];
        if (last_component.type === Parse_tree_analysis.Component_type.Invalid && last_component.value as string === access_expression.member_name) {
            const previous_component = access_components[access_components.length - 2];

            if (previous_component.type === Parse_tree_analysis.Component_type.Import_module) {

                const import_module = previous_component.value as Parse_tree_analysis.Symbol_module_alias_data;
                const declaration_name = last_component.value as string;

                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_access_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Declaration '${declaration_name}' does not exist in the module '${import_module.module_name}' ('${import_module.module_alias}').`,
                    related_information: [],
                });
            }
            else if (previous_component.type === Parse_tree_analysis.Component_type.Declaration) {

                const module_declaration = previous_component.value as { root: Parser_node.Node, declaration: Core.Declaration };
                const member_name = last_component.value as string;

                if (member_name.length > 0) {
                    diagnostics.push({
                        location: get_parser_node_position_source_location(uri, descendant_access_expression),
                        source: Source.Parse_tree_validation,
                        severity: Diagnostic_severity.Error,
                        message: `Member '${member_name}' does not exist in the type '${module_declaration.declaration.name}'.`,
                        related_information: [],
                    });
                }
            }
        }
    }

    return diagnostics;
}

async function validate_assignment_expression(
    uri: string,
    root: Parser_node.Node,
    descendant_assignment_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_assignment_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const descendant_left_hand_side = Parser_node.get_child(descendant_assignment_expression, 0);
    const descendant_right_hand_side = Parser_node.get_child(descendant_assignment_expression, 2);

    const left_hand_side_expression = Parse_tree_analysis.get_expression_from_node(root, descendant_left_hand_side.node);
    const right_hand_side_expression = Parse_tree_analysis.get_expression_from_node(root, descendant_right_hand_side.node);

    const left_hand_side_type = await Parse_tree_analysis.get_expression_type(root, descendant_left_hand_side.position, left_hand_side_expression, get_parse_tree);
    const right_hand_side_type = await Parse_tree_analysis.get_expression_type(root, descendant_right_hand_side.position, right_hand_side_expression, get_parse_tree);
    if (left_hand_side_type === undefined || right_hand_side_type === undefined || !left_hand_side_type.is_value || !right_hand_side_type.is_value) {
        return diagnostics;
    }

    if (!deep_equal(left_hand_side_type, right_hand_side_type) && !are_compatible_pointer_types(left_hand_side_type.type, right_hand_side_type.type)) {
        const left_hand_side_type_string = Type_utilities.get_type_name(left_hand_side_type.type);
        const right_hand_side_type_string = Type_utilities.get_type_name(right_hand_side_type.type);
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_right_hand_side),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Expected type is '${left_hand_side_type_string}' but got '${right_hand_side_type_string}'.`,
            related_information: [],
        });
    }

    return diagnostics;
}

async function validate_binary_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_binary_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_binary_expression.node);
    if (expression.data.type !== Core.Expression_enum.Binary_expression) {
        return diagnostics;
    }

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_binary_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value_info.function_value);

    const binary_expression = expression.data.value as Core.Binary_expression;

    const descendant_left_operand = Parser_node.get_child(descendant_binary_expression, 0);
    const descendant_right_operand = Parser_node.get_child(descendant_binary_expression, 2);

    const left_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_left_operand.position, binary_expression.left_hand_side, get_parse_tree);
    const right_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_right_operand.position, binary_expression.right_hand_side, get_parse_tree);

    const descendant_symbol = Parser_node.get_child(descendant_binary_expression, 1);
    const operation = binary_expression.operation;
    const operation_string = descendant_symbol.node.word.value;

    if (left_expression_type === undefined || !left_expression_type.is_value || right_expression_type === undefined || !right_expression_type.is_value) {
        return diagnostics;
    }

    if (is_bit_shift_binary_operation(operation)) {

        const bytes_type = [Parse_tree_analysis.create_fundamental_type(Core.Fundamental_type.Byte)];
        if (!is_integer_type(left_expression_type.type) && !deep_equal(left_expression_type.type, bytes_type)) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_left_operand),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `The left hand side type of a '${operation_string}' binary operation must be an integer or a byte.`,
                related_information: [],
            });
            return diagnostics;
        }

        if (!is_integer_type(right_expression_type.type)) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_right_operand),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `The right hand side type of a '${operation_string}' binary operation must be an integer.`,
                related_information: [],
            });
            return diagnostics;
        }
    }

    if (!deep_equal(left_expression_type, right_expression_type) && !are_compatible_pointer_types(left_expression_type.type, right_expression_type.type)) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_binary_expression),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Left and right hand side types do not match.`,
            related_information: [],
        });
        return diagnostics;
    }

    if (is_numeric_binary_operation(operation)) {
        if (!is_numeric_type(left_expression_type.type)) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_binary_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Binary operation '${operation_string}' can only be applied to numeric types.`,
                related_information: [],
            });
            return diagnostics;
        }
    }
    else if (is_logical_binary_operation(operation)) {
        if (!is_boolean_type(left_expression_type.type)) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_binary_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Binary operation '${operation_string}' can only be applied to a boolean value.`,
                related_information: [],
            });
            return diagnostics;
        }
    }
    else if (is_comparison_binary_operation(operation)) {
        if (!await is_comparable_type(left_expression_type.type, get_parse_tree)) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_binary_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Binary operation '${operation_string}' cannot be applied to types '${Type_utilities.get_type_name(left_expression_type.type)}' and '${Type_utilities.get_type_name(right_expression_type.type)}'.`,
                related_information: [],
            });
            return diagnostics;
        }
    }
    else if (is_bitwise_binary_operation(operation)) {
        const bytes_type = [Parse_tree_analysis.create_fundamental_type(Core.Fundamental_type.Byte)];
        if (!is_integer_type(left_expression_type.type) && !deep_equal(left_expression_type.type, bytes_type)) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_binary_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Binary operation '${operation_string}' can only be applied to integers or bytes.`,
                related_information: [],
            });
            return diagnostics;
        }
    }
    else if (operation === Core.Binary_operation.Has) {
        const is_enum_value = await Parse_tree_analysis.is_enum_value_expression(left_expression_type, get_parse_tree);
        if (!is_enum_value) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_binary_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Binary operation '${operation_string}' can only be applied to enum values.`,
                related_information: [],
            });
            return diagnostics;
        }
    }

    return diagnostics;
}

function is_numeric_binary_operation(operation: Core.Binary_operation): boolean {
    switch (operation) {
        case Core.Binary_operation.Add:
        case Core.Binary_operation.Subtract:
        case Core.Binary_operation.Multiply:
        case Core.Binary_operation.Divide:
        case Core.Binary_operation.Modulus:
            return true;
        default:
            return false;
    }
}

function is_logical_binary_operation(operation: Core.Binary_operation): boolean {
    switch (operation) {
        case Core.Binary_operation.Logical_and:
        case Core.Binary_operation.Logical_or:
            return true;
        default:
            return false;
    }
}

function is_comparison_binary_operation(operation: Core.Binary_operation): boolean {
    switch (operation) {
        case Core.Binary_operation.Equal:
        case Core.Binary_operation.Not_equal:
        case Core.Binary_operation.Less_than:
        case Core.Binary_operation.Less_than_or_equal_to:
        case Core.Binary_operation.Greater_than:
        case Core.Binary_operation.Greater_than_or_equal_to:
            return true;
        default:
            return false;
    }
}

function is_bitwise_binary_operation(operation: Core.Binary_operation): boolean {
    switch (operation) {
        case Core.Binary_operation.Bitwise_and:
        case Core.Binary_operation.Bitwise_or:
        case Core.Binary_operation.Bitwise_xor:
            return true;
        default:
            return false;
    }
}

function is_bit_shift_binary_operation(operation: Core.Binary_operation): boolean {
    switch (operation) {
        case Core.Binary_operation.Bit_shift_left:
        case Core.Binary_operation.Bit_shift_right:
            return true;
        default:
            return false;
    }
}

async function validate_break_expression(
    uri: string,
    root: Parser_node.Node,
    descendant_break_expression: { node: Parser_node.Node, position: number[] }
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const parent_names = [
        "Expression_for_loop_statements",
        "Expression_switch_case",
        "Expression_while_loop_statements"
    ];

    const first_ancestor = Parser_node.get_first_ancestor_with_name(root, descendant_break_expression.position, parent_names);
    if (first_ancestor === undefined) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_break_expression),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `'break' can only be placed inside for loops, while loops and switch cases.`,
            related_information: [],
        });
        return diagnostics;
    }

    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_break_expression.node);
    if (expression.data.type === Core.Expression_enum.Break_expression) {
        const break_expression = expression.data.value as Core.Break_expression;

        if (break_expression.loop_count !== 1) {
            let counter = 0;
            let current_ancestor: { node: Parser_node.Node, position: number[] } | undefined = first_ancestor;
            while (current_ancestor !== undefined) {
                counter += 1;
                current_ancestor = Parser_node.get_first_ancestor_with_name(root, current_ancestor.position, parent_names);
            }

            if (break_expression.loop_count === 0 || break_expression.loop_count > counter) {
                const loop_count_descendant = Parser_node.find_descendant_position_if(descendant_break_expression, node => node.word.value === "Expression_break_loop_count");
                if (loop_count_descendant !== undefined) {
                    diagnostics.push({
                        location: get_parser_node_position_source_location(uri, loop_count_descendant),
                        source: Source.Parse_tree_validation,
                        severity: Diagnostic_severity.Error,
                        message: `'break' loop count of ${break_expression.loop_count} is invalid.`,
                        related_information: [],
                    });
                    return diagnostics;
                }
            }
        }
    }

    return diagnostics;
}

async function validate_call_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_call_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const descendant_callable = Parser_node.get_child(descendant_call_expression, 0);

    const module_function_value = await Parse_tree_analysis.get_function_value_from_node(root, descendant_callable.node, get_parse_tree);
    if (module_function_value === undefined) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_callable),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Expression does not evaluate to a callable expression.`,
            related_information: [],
        });
        return diagnostics;
    }

    const function_declaration = module_function_value.function_value.declaration;

    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_call_expression.node);
    if (expression === undefined || expression.data.type !== Core.Expression_enum.Call_expression) {
        return diagnostics;
    }

    const call_expression = expression.data.value as Core.Call_expression;
    if (call_expression.arguments.length !== function_declaration.input_parameter_names.length) {

        if (function_declaration.type.is_variadic) {
            if (call_expression.arguments.length < function_declaration.input_parameter_names.length) {
                diagnostics.push({
                    location: get_parser_node_position_source_location(uri, descendant_call_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Function '${function_declaration.name}' expects at least ${function_declaration.input_parameter_names.length} arguments, but ${call_expression.arguments.length} were provided.`,
                    related_information: [],
                });
                return diagnostics;
            }
        }
        else {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, descendant_call_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Function '${function_declaration.name}' expects ${function_declaration.input_parameter_names.length} arguments, but ${call_expression.arguments.length} were provided.`,
                related_information: [],
            });
            return diagnostics;
        }
    }

    const scope_function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_call_expression.position);
    if (scope_function_value_info === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(scope_function_value_info.function_value);
    if (scope_declaration === undefined) {
        return diagnostics;
    }

    const descedant_call_arguments = Parser_node.find_descendant_position_if(descendant_call_expression, node => node.word.value === "Expression_call_arguments");
    if (descedant_call_arguments === undefined) {
        return diagnostics;
    }

    for (let parameter_index = 0; parameter_index < function_declaration.input_parameter_names.length; parameter_index++) {
        const parameter_name = function_declaration.input_parameter_names[parameter_index];
        const parameter_type = [function_declaration.type.input_parameter_types[parameter_index]];

        const argument_expression = call_expression.arguments[parameter_index];
        const argument_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_call_expression.position, argument_expression, get_parse_tree);
        if (argument_expression_type === undefined) {
            continue;
        }

        const argument_descendant = Parser_node.get_child(descedant_call_arguments, 1 + parameter_index * 2);

        if (!deep_equal(argument_expression_type.type, parameter_type) && !are_compatible_pointer_types(argument_expression_type.type, parameter_type)) {
            diagnostics.push({
                location: get_parser_node_position_source_location(uri, argument_descendant),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Argument '${parameter_name}' expects type '${Type_utilities.get_type_name(parameter_type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root))}', but '${Type_utilities.get_type_name(argument_expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root))}' was provided.`,
                related_information: [],
            });
        }
    }

    return diagnostics;
}

async function validate_cast_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_cast_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_cast_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value_info.function_value);

    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_cast_expression.node);
    if (expression === undefined || expression.data.type !== Core.Expression_enum.Cast_expression) {
        return diagnostics;
    }

    const cast_expression = expression.data.value as Core.Cast_expression;
    const destination_type = [cast_expression.destination_type];
    const underlying_destination_type = await Parse_tree_analysis.get_underlying_type(destination_type, get_parse_tree);

    const descendant_source_expression = Parser_node.find_descendant_position_if(descendant_cast_expression, node => node.word.value === "Generic_expression");
    if (descendant_source_expression === undefined) {
        return diagnostics;
    }

    const source_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_source_expression.position, cast_expression.source, get_parse_tree);
    if (source_expression_type === undefined) {
        return diagnostics;
    }

    if (!is_numeric_type(underlying_destination_type) && !await Parse_tree_analysis.is_enum_type(underlying_destination_type, get_parse_tree)) {
        const source_type_string = Type_utilities.get_type_name(source_expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        const destination_type_string = Type_utilities.get_type_name(destination_type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_cast_expression),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Cannot apply numeric cast from '${source_type_string}' to '${destination_type_string}'.`,
            related_information: [],
        });
    }

    const underlying_source_type = await Parse_tree_analysis.get_underlying_type(source_expression_type.type, get_parse_tree);
    if (!source_expression_type.is_value || (!is_numeric_type(underlying_source_type) && !await Parse_tree_analysis.is_enum_type(underlying_source_type, get_parse_tree))) {
        const source_type_string = Type_utilities.get_type_name(source_expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        const destination_type_string = Type_utilities.get_type_name(destination_type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_cast_expression),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Cannot apply numeric cast from '${source_type_string}' to '${destination_type_string}'.`,
            related_information: [],
        });
    }

    if (deep_equal(source_expression_type.type, destination_type)) {
        const source_type_string = Type_utilities.get_type_name(source_expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        const destination_type_string = Type_utilities.get_type_name(destination_type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_cast_expression),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Warning,
            message: `Numeric cast from '${source_type_string}' to '${destination_type_string}'.`,
            related_information: [],
        });
    }

    return diagnostics;
}

function validate_constant_expression(
    uri: string,
    descendant: { node: Parser_node.Node, position: number[] },
): Diagnostic[] {
    const word = descendant.node.word;
    switch (word.type) {
        case Grammar.Word_type.Alphanumeric: {
            if (word.value !== "true" && word.value !== "false") {
                return [
                    {
                        location: get_parser_node_position_source_location(uri, descendant),
                        source: Source.Parse_tree_validation,
                        severity: Diagnostic_severity.Error,
                        message: `'${word.value}' is not a constant.`,
                        related_information: [],
                    }
                ];
            }
            return [];
        }
        case Grammar.Word_type.Number: {
            const suffix = Scanner.get_suffix(word);
            const first_character = suffix.charAt(0);

            const is_integer = suffix.length === 0 || first_character === "i" || first_character === "u";
            if (is_integer) {
                const number_of_bits = suffix.length > 0 ? Number(suffix.substring(1, suffix.length)) : 32;
                if (Number.isNaN(number_of_bits)) {
                    return [
                        {
                            location: get_parser_node_position_source_location(uri, descendant),
                            source: Source.Parse_tree_validation,
                            severity: Diagnostic_severity.Error,
                            message: `Did not expect '${suffix}' as number suffix. Did you mean '${first_character}32'?`,
                            related_information: [],
                        }
                    ];
                }
                else if (number_of_bits < 1 || number_of_bits > 64) {
                    return [
                        {
                            location: get_parser_node_position_source_location(uri, descendant),
                            source: Source.Parse_tree_validation,
                            severity: Diagnostic_severity.Error,
                            message: `Did not expect '${suffix}' as number suffix. The number of bits needs to be >= 1 and <= 64.`,
                            related_information: [],
                        }
                    ];
                }

                const number_value = descendant.node.word.value.substring(0, descendant.node.word.value.length - suffix.length);
                const point_index = number_value.indexOf(".");
                if (point_index !== -1) {
                    const integer_value = number_value.substring(0, point_index);
                    return [
                        {
                            location: get_parser_node_position_source_location(uri, descendant),
                            source: Source.Parse_tree_validation,
                            severity: Diagnostic_severity.Error,
                            message: `Fractionary part is not allowed for integers. Did you mean '${integer_value}${suffix}'?`,
                            related_information: [],
                        }
                    ];
                }

                return [];
            }

            const is_float = first_character === "f";
            if (is_float) {
                const number_of_bits = Number(suffix.substring(1, suffix.length));
                if (number_of_bits !== 16 && number_of_bits !== 32 && number_of_bits !== 64) {
                    return [
                        {
                            location: get_parser_node_position_source_location(uri, descendant),
                            source: Source.Parse_tree_validation,
                            severity: Diagnostic_severity.Error,
                            message: `Did not expect '${suffix}' as number suffix. Did you mean 'f16', 'f32' or 'f64'?`,
                            related_information: [],
                        }
                    ];
                }
                return [];
            }

            const is_c_type = first_character === "c";
            if (is_c_type) {
                switch (suffix) {
                    case "cc":
                    case "cs":
                    case "ci":
                    case "cl":
                    case "cll":
                    case "cuc":
                    case "cus":
                    case "cui":
                    case "cul":
                    case "cull":
                    case "cb":
                        return [];
                    default:
                        break;
                }
            }

            return [
                {
                    location: get_parser_node_position_source_location(uri, descendant),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Did not expect '${suffix}' as number suffix.`,
                    related_information: [],
                }
            ];
        }
        case Grammar.Word_type.String: {
            const suffix = Scanner.get_suffix(word);

            if (suffix.length && suffix !== "c") {
                return [
                    {
                        location: get_parser_node_position_source_location(uri, descendant),
                        source: Source.Parse_tree_validation,
                        severity: Diagnostic_severity.Error,
                        message: `Did not expect '${suffix}' as string suffix. Consider removing it, or replacing it by 'c' to convert the string constant to a C-string.`,
                        related_information: [],
                    }
                ];
            }

            return [];
        }
    }

    return [];
}

async function validate_continue_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_continue_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const parent_names = [
        "Expression_for_loop_statements",
        "Expression_while_loop_statements"
    ];

    const first_ancestor = Parser_node.get_first_ancestor_with_name(root, descendant_continue_expression.position, parent_names);
    if (first_ancestor === undefined) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_continue_expression),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `'continue' can only be placed inside for loops and while loops.`,
            related_information: [],
        });
        return diagnostics;
    }

    return diagnostics;
}

async function get_return_expression_type(
    root: Parser_node.Node,
    descendant_return_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Core.Type_reference[] | undefined> {

    const descendant_expression = Parser_node.find_descendant_position_if(descendant_return_expression, node => node.word.value === "Generic_expression_or_instantiate");
    if (descendant_expression === undefined) {
        return [];
    }

    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_expression.node);
    const expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_expression.position, expression, get_parse_tree);
    if (expression_type === undefined || !expression_type.is_value) {
        return undefined;
    }

    return expression_type.type;
}

async function validate_for_loop_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_for_loop_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_for_loop_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value_info.function_value);

    const descendant_range_begin = Parser_node.find_descendant_position_if(descendant_for_loop_expression, node => node.word.value === "Expression_for_loop_range_begin");
    const descendant_range_end = Parser_node.find_descendant_position_if(descendant_for_loop_expression, node => node.word.value === "Expression_for_loop_range_end");
    const descendant_step = Parser_node.find_descendant_position_if(descendant_for_loop_expression, node => node.word.value === "Expression_for_loop_step");
    if (descendant_range_begin === undefined || descendant_range_end === undefined || descendant_step === undefined) {
        return diagnostics;
    }

    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_for_loop_expression.node);
    if (expression.data.type !== Core.Expression_enum.For_loop_expression) {
        return diagnostics;
    }

    const for_loop_expression = expression.data.value as Core.For_loop_expression;
    const range_begin_expression = for_loop_expression.range_begin;
    const range_end_expression = for_loop_expression.range_end.expression;

    const range_begin_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_range_begin.position, range_begin_expression, get_parse_tree);
    const range_end_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_range_end.position, range_end_expression, get_parse_tree);

    if (range_begin_expression_type === undefined || !range_begin_expression_type.is_value || range_end_expression_type === undefined || !range_end_expression_type.is_value) {
        return diagnostics;
    }

    if (!deep_equal(range_begin_expression_type, range_end_expression_type)) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, Parser_node.get_child(descendant_for_loop_expression, 0)),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `The range begin, end and step_by expression types must all match.`,
            related_information: [],
        });
        return diagnostics;
    }

    if (for_loop_expression.step_by !== undefined) {
        const step_by_expression = for_loop_expression.step_by;

        const descendant_step_by_number_expression = Parser_node.find_descendant_position_if(descendant_step, node => node.word.value === "Expression_for_loop_number_expression");
        if (descendant_step_by_number_expression !== undefined) {
            const step_by_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_step_by_number_expression.position, step_by_expression, get_parse_tree);
            if (step_by_expression_type !== undefined && step_by_expression_type.is_value) {
                if (!deep_equal(range_begin_expression_type, step_by_expression_type)) {
                    diagnostics.push({
                        location: get_parser_node_position_source_location(uri, Parser_node.get_child(descendant_for_loop_expression, 0)),
                        source: Source.Parse_tree_validation,
                        severity: Diagnostic_severity.Error,
                        message: `The range begin, end and step_by expression types must all match.`,
                        related_information: [],
                    });
                }
            }
        }
    }

    if (!is_numeric_type(range_begin_expression_type.type)) {
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, Parser_node.get_child(descendant_for_loop_expression, 0)),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `The range begin, end and step_by expression must evaluate to numbers.`,
            related_information: [],
        });
    }

    return diagnostics;
}

async function validate_if_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_if_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_if_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value_info.function_value);

    const descendant_condition = Parser_node.find_descendant_position_if(descendant_if_expression, node => node.word.value === "Generic_expression");
    if (descendant_condition === undefined) {
        return diagnostics;
    }

    const condition_expession = Parse_tree_analysis.get_expression_from_node(root, descendant_condition.node);
    const condition_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_condition.position, condition_expession, get_parse_tree);

    if (condition_expression_type === undefined || !condition_expression_type.is_value) {
        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_condition),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Cannot deduce type of condition expression.`,
                related_information: [],
            }
        );
        return diagnostics;
    }
    else if (!is_boolean_type(condition_expression_type.type)) {
        const condition_expression_type_string = Type_utilities.get_type_name(condition_expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));

        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_condition),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Condition expression type '${condition_expression_type_string}' is not 'bool'.`,
                related_information: [],
            }
        );
        return diagnostics;
    }

    return diagnostics;
}

async function validate_instantiate_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_instantiate_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_instantiate_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const instantiate_expression_type = get_instantiate_expression_type(descendant_instantiate_expression);

    const type_to_instantiate = await Parse_tree_analysis.find_instantiate_declaration_from_node(root, descendant_instantiate_expression.position, get_parse_tree);
    if (type_to_instantiate === undefined) {
        return diagnostics;
    }
    const expected_members = await Parse_tree_analysis.get_declaration_member_types(type_to_instantiate.root, type_to_instantiate.declaration, type_to_instantiate.node_position, get_parse_tree);

    const descendant_members_array = Parser_node.find_descendant_position_if(descendant_instantiate_expression, node => node.word.value === "Expression_instantiate_members");
    if (descendant_members_array === undefined) {
        return diagnostics;
    }

    const descendant_members = descendant_members_array.node.children
        .filter((_, index) => index % 2 !== 0)
        .map((_, index) => Parser_node.get_child(descendant_members_array, 1 + 2 * index));

    const descendant_member_names = descendant_members.map(descendant => Parser_node.find_descendant_position_if(descendant, node => node.word.value === "Expression_instantiate_member_name"));
    const descendant_member_value_expressions = descendant_members.map(descendant => Parser_node.find_descendant_position_if(descendant, node => node.word.value === "Generic_expression_or_instantiate"));

    diagnostics.push(...validate_that_instantiate_members_exist(uri, type_to_instantiate.declaration, expected_members, descendant_member_names));
    diagnostics.push(...validate_that_instantiate_members_are_not_duplicated(uri, descendant_member_names));
    if (diagnostics.length > 0) {
        return diagnostics;
    }

    if (instantiate_expression_type === Core.Instantiate_expression_type.Explicit) {
        diagnostics.push(...validate_that_instantiate_members_are_all_set(uri, type_to_instantiate.declaration, expected_members, descendant_instantiate_expression, descendant_member_names));
    }

    diagnostics.push(...validate_that_instantiate_members_are_sorted(uri, expected_members, descendant_instantiate_expression, descendant_member_names));

    diagnostics.push(...await validate_that_instantiate_members_types_match(uri, core_module, root, type_to_instantiate.declaration, expected_members, descendant_member_names, descendant_member_value_expressions, get_parse_tree));

    return diagnostics;
}

function get_instantiate_expression_type(
    descendant_instantiate_expression: { node: Parser_node.Node, position: number[] }
): Core.Instantiate_expression_type {
    const explicit_node = descendant_instantiate_expression.node.children.find(child => child.word.value === "explicit");
    return explicit_node !== undefined ? Core.Instantiate_expression_type.Explicit : Core.Instantiate_expression_type.Default;
}

function validate_that_instantiate_members_are_not_duplicated(
    uri: string,
    descendant_member_names: ({ node: Parser_node.Node, position: number[] } | undefined)[],
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    for (let index = 0; index < descendant_member_names.length; index++) {
        const descendant_member_name = descendant_member_names[index];
        if (descendant_member_name === undefined) {
            continue;
        }

        const member_name = descendant_member_name.node.children[0].word.value;

        const found_index = descendant_member_names.findIndex(
            (descendant, current_index) => {
                if (current_index === index) {
                    return false;
                }

                if (descendant === undefined) {
                    return false;
                }

                return descendant.node.children[0].word.value === member_name;
            }
        );

        if (found_index !== -1) {
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_member_name),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Duplicate instantiate member '${member_name}'.`,
                    related_information: [],
                }
            );
        }
    }

    return diagnostics;
}

function validate_that_instantiate_members_exist(
    uri: string,
    declaration: Core.Declaration,
    expected_members: { index: number, name: string, type: Core.Type_reference }[],
    descendant_member_names: ({ node: Parser_node.Node, position: number[] } | undefined)[]
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const descendant_member_name of descendant_member_names) {
        if (descendant_member_name === undefined) {
            continue;
        }

        const member_name = descendant_member_name.node.children[0].word.value;

        const foundIndex = expected_members.findIndex(expected_member => expected_member.name === member_name);
        if (foundIndex === -1) {
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_member_name),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `'${declaration.name}.${member_name}' does not exist.`,
                    related_information: [],
                }
            );
        }
    }

    return diagnostics;
}

function validate_that_instantiate_members_are_all_set(
    uri: string,
    declaration: Core.Declaration,
    expected_members: { index: number, name: string, type: Core.Type_reference }[],
    descendant_instantiate_expression: { node: Parser_node.Node, position: number[] },
    descendant_member_names: ({ node: Parser_node.Node, position: number[] } | undefined)[]
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const expected_member of expected_members) {

        const found_index = descendant_member_names.findIndex(
            descendant_member_name => {
                if (descendant_member_name === undefined) {
                    return false;
                }

                return descendant_member_name.node.children[0].word.value === expected_member.name;
            }
        );

        if (found_index === -1) {
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_instantiate_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `'${declaration.name}.${expected_member.name}' is not set. Explicit instantiate expression requires all members to be set.`,
                    related_information: [],
                }
            );
        }
    }

    return diagnostics;
}

function validate_that_instantiate_members_are_sorted(
    uri: string,
    expected_members: { index: number, name: string, type: Core.Type_reference }[],
    descendant_instantiate_expression: { node: Parser_node.Node, position: number[] },
    descendant_member_names: ({ node: Parser_node.Node, position: number[] } | undefined)[],
): Diagnostic[] {

    let current_index = 0;

    for (const descendant_member_name of descendant_member_names) {
        if (descendant_member_name === undefined) {
            return [];
        }

        const member_name = descendant_member_name.node.children[0].word.value;

        const foundIndex = expected_members.findIndex(expected_member => expected_member.name === member_name);
        if (foundIndex === -1) {
            return [];
        }

        if (foundIndex < current_index) {
            return [
                {
                    location: get_parser_node_position_source_location(uri, descendant_instantiate_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Instantiate members are not sorted. They must appear in the order they were declarated in the struct declaration.`,
                    related_information: [],
                }
            ];
        }

        current_index = foundIndex;
    }

    return [];
}

async function validate_that_instantiate_members_types_match(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    declaration: Core.Declaration,
    expected_members: { index: number, name: string, type: Core.Type_reference }[],
    descendant_member_names: ({ node: Parser_node.Node, position: number[] } | undefined)[],
    descendant_member_value_expressions: ({ node: Parser_node.Node, position: number[] } | undefined)[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    for (let index = 0; index < descendant_member_names.length; index++) {
        const descendant_member_name = descendant_member_names[index];
        const descendant_member_value_expression = descendant_member_value_expressions[index];
        if (descendant_member_name === undefined || descendant_member_value_expression === undefined) {
            continue;
        }

        const member_name = descendant_member_name.node.children[0].word.value;

        const expected_member = expected_members.find(expected_member => expected_member.name === member_name);
        if (expected_member === undefined) {
            continue;
        }

        const value_expression = Parse_tree_analysis.get_expression_from_node(root, descendant_member_value_expression.node);
        const value_expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_member_value_expression.position, value_expression, get_parse_tree);
        if (value_expression_type === undefined) {
            continue;
        }

        if (!value_expression_type.is_value || (!deep_equal(value_expression_type.type, [expected_member.type]) && !are_compatible_pointer_types(value_expression_type.type, [expected_member.type]))) {
            const expected_member_type_string = Type_utilities.get_type_name([expected_member.type], Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
            const actual_member_type_string = Type_utilities.get_type_name(value_expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_member_value_expression),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Cannot assign value of type '${actual_member_type_string}' to member '${declaration.name}.${member_name}' of type '${expected_member_type_string}'.`,
                    related_information: [],
                }
            );
        }
    }

    return diagnostics;
}

async function validate_return_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_return_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_return_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const return_expression_type = await get_return_expression_type(root, descendant_return_expression, get_parse_tree);

    if (return_expression_type === undefined) {
        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_return_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Cannot deduce return type.`,
                related_information: [],
            }
        );
        return diagnostics;
    }
    else if (!deep_equal(return_expression_type, function_value_info.function_value.declaration.type.output_parameter_types) && !are_compatible_pointer_types(return_expression_type, function_value_info.function_value.declaration.type.output_parameter_types)) {
        const return_expression_type_string = Type_utilities.get_type_name(return_expression_type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        const function_output_type_string = Type_utilities.get_type_name(function_value_info.function_value.declaration.type.output_parameter_types, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));

        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_return_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Return expression type '${return_expression_type_string}' does not match function return type '${function_output_type_string}'.`,
                related_information: [],
            }
        );
    }

    return diagnostics;
}

async function validate_switch_expression(
    uri: string,
    root: Parser_node.Node,
    descendant_switch_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_switch_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value_info.function_value);

    const descendant_condition = Parser_node.get_child(descendant_switch_expression, 1);
    const condition_expression = Parse_tree_analysis.get_expression_from_node(root, descendant_condition.node);
    const condition_type = await Parse_tree_analysis.get_expression_type(root, descendant_switch_expression.position, condition_expression, get_parse_tree);

    if (!await is_valid_switch_condition(condition_type, get_parse_tree)) {
        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_condition),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Expression must evaluate to an integer or an enum value.`,
                related_information: [],
            }
        );
        return diagnostics;
    }

    const descendant_switch_cases_parent = Parser_node.find_descendant_position_if(descendant_switch_expression, node => node.word.value === "Expression_switch_cases");
    if (descendant_switch_cases_parent === undefined) {
        return diagnostics;
    }

    const descendant_switch_cases = Parser_node.get_children(descendant_switch_cases_parent);

    for (const descendant_switch_case of descendant_switch_cases) {
        const descendant_switch_case_condition = Parser_node.find_descendant_position_if(descendant_switch_case, node => node.word.value === "Expression_switch_case_value");
        if (descendant_switch_case_condition === undefined) {
            continue;
        }

        const switch_case_condition_expression = Parse_tree_analysis.get_expression_from_node(root, descendant_switch_case_condition.node.children[0]);
        const switch_case_condition_type = await Parse_tree_analysis.get_expression_type(root, descendant_switch_expression.position, switch_case_condition_expression, get_parse_tree);

        if (!await is_valid_switch_case(switch_case_condition_expression, switch_case_condition_type, get_parse_tree)) {
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_switch_case_condition),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Switch case expression must be computable at compile-time, and evaluate to an integer or an enum value.`,
                    related_information: [],
                }
            );
            return diagnostics;
        }
        else if (!deep_equal(switch_case_condition_type, condition_type)) {
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_switch_case_condition),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Expression type must match the switch case input type.`,
                    related_information: [],
                }
            );
        }
    }

    return diagnostics;
}

async function is_valid_switch_condition(
    expression_type: Parse_tree_analysis.Expression_type_reference | undefined,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<boolean> {
    if (expression_type === undefined || !expression_type.is_value || expression_type.type.length !== 1) {
        return false;
    }

    const type = expression_type.type[0];

    switch (type.data.type) {
        case Core.Type_reference_enum.Integer_type: {
            return true;
        }
        case Core.Type_reference_enum.Custom_type_reference: {
            const custom_type_reference = expression_type.type[0].data.value as Core.Custom_type_reference;
            const module_declaration = await Parse_tree_analysis.get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
            if (module_declaration === undefined) {
                return false;
            }

            return module_declaration.declaration.type === Core.Declaration_type.Enum;
        }
        default: {
            return false;
        }
    }
}

async function is_valid_switch_case(
    expression: Core.Expression,
    expression_type: Parse_tree_analysis.Expression_type_reference | undefined,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<boolean> {

    if (!is_valid_switch_condition(expression_type, get_parse_tree)) {
        return false;
    }

    if (expression.data.type === Core.Expression_enum.Variable_expression) {
        return false;
    }

    return true;
}

async function validate_ternary_condition_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_ternary_condition_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_ternary_condition_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value_info.function_value);

    const descendant_condition = Parser_node.get_child(descendant_ternary_condition_expression, 0);
    const descendant_then = Parser_node.get_child(descendant_ternary_condition_expression, 2);
    const descendant_else = Parser_node.get_child(descendant_ternary_condition_expression, 4);

    {
        const expected_type = [Parse_tree_analysis.create_boolean_type()];
        diagnostics.push(...await validate_expression_type_is(uri, core_module, root, descendant_condition, expected_type, is_boolean_type, get_parse_tree));
    }

    {
        const create_message = (first_string: string, second_string: string): string => {
            return `The expression types of the then ('${first_string}') and else ('${second_string}') part of a ternary expression must match.`;
        };

        diagnostics.push(...await validate_expression_types_are_equal(uri, core_module, root, descendant_then, descendant_else, create_message, get_parse_tree));
    }

    return diagnostics;
}

async function validate_unary_expression(
    uri: string,
    root: Parser_node.Node,
    descendant_unary_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant_unary_expression.node);
    if (expression.data.type !== Core.Expression_enum.Unary_expression) {
        return diagnostics;
    }

    const unary_expression = expression.data.value as Core.Unary_expression;

    const descendant_operand = Parser_node.find_descendant_position_if(descendant_unary_expression, node => node.word.value === "Generic_expression");
    if (descendant_operand === undefined) {
        return diagnostics;
    }

    const descendant_symbol = Parser_node.find_descendant_position_if(descendant_unary_expression, node => node.word.value === "Expression_unary_symbol");
    if (descendant_symbol === undefined) {
        return diagnostics;
    }

    const operand_expression = Parse_tree_analysis.get_expression_from_node(root, descendant_operand.node);
    const expression_type = await Parse_tree_analysis.get_expression_type(root, descendant_operand.position, operand_expression, get_parse_tree);

    if (expression_type === undefined || !expression_type.is_value) {
        const symbol = map_unary_operation_to_symbol(unary_expression.operation);
        diagnostics.push({
            location: get_parser_node_position_source_location(uri, descendant_symbol),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Cannot apply unary operation '${symbol}' to expression.`,
            related_information: [],
        });
        return diagnostics;
    }

    if (is_numeric_unary_operation(unary_expression.operation)) {
        if (!is_numeric_type(expression_type.type)) {
            const symbol = map_unary_operation_to_symbol(unary_expression.operation);
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_symbol),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Cannot apply unary operation '${symbol}' to expression.`,
                    related_information: [],
                }
            );
        }
    }
    else if (is_logical_unary_operation(unary_expression.operation)) {
        if (!is_boolean_type(expression_type.type)) {
            const symbol = map_unary_operation_to_symbol(unary_expression.operation);
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_symbol),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Cannot apply unary operation '${symbol}' to expression.`,
                    related_information: [],
                }
            );
        }
    }
    else if (unary_expression.operation === Core.Unary_operation.Bitwise_not) {
        const is_integer_type = expression_type.type[0].data.type === Core.Type_reference_enum.Integer_type;
        if (!is_integer_type) {
            const symbol = map_unary_operation_to_symbol(unary_expression.operation);
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_symbol),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Cannot apply unary operation '${symbol}' to expression.`,
                    related_information: [],
                }
            );
        }
    }
    else if (unary_expression.operation === Core.Unary_operation.Address_of) {
        const global_variable_declaration = await Parse_tree_analysis.get_global_variable_from_expression(root, operand_expression, get_parse_tree);
        if (global_variable_declaration !== undefined && global_variable_declaration.declaration.type === Core.Declaration_type.Global_variable) {
            const global_variable = global_variable_declaration.declaration.value as Core.Global_variable_declaration;
            if (!global_variable.is_mutable) {
                diagnostics.push(
                    {
                        location: get_parser_node_position_source_location(uri, descendant_symbol),
                        source: Source.Parse_tree_validation,
                        severity: Diagnostic_severity.Error,
                        message: `Cannot take address of a global constant.`,
                        related_information: [],
                    }
                );
            }
        }
        else {
            const is_variable_expression = operand_expression.data.type === Core.Expression_enum.Variable_expression;
            if (!is_variable_expression) {
                const symbol = map_unary_operation_to_symbol(unary_expression.operation);
                diagnostics.push(
                    {
                        location: get_parser_node_position_source_location(uri, descendant_symbol),
                        source: Source.Parse_tree_validation,
                        severity: Diagnostic_severity.Error,
                        message: `Cannot apply unary operation '${symbol}' to expression.`,
                        related_information: [],
                    }
                );
            }
        }
    }
    else if (unary_expression.operation === Core.Unary_operation.Indirection) {
        const is_pointer_type = expression_type.type[0].data.type === Core.Type_reference_enum.Pointer_type;
        if (!is_pointer_type) {
            const symbol = map_unary_operation_to_symbol(unary_expression.operation);
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_symbol),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Cannot apply unary operation '${symbol}' to expression.`,
                    related_information: [],
                }
            );
        }
    }

    return diagnostics;
}

function map_unary_operation_to_symbol(
    operation: Core.Unary_operation
): string {
    switch (operation) {
        case Core.Unary_operation.Not:
            return "!";
        case Core.Unary_operation.Bitwise_not:
            return "~";
        case Core.Unary_operation.Minus:
            return "-";
        case Core.Unary_operation.Pre_increment:
            return "++";
        case Core.Unary_operation.Post_increment:
            return "++";
        case Core.Unary_operation.Pre_decrement:
            return "--";
        case Core.Unary_operation.Post_decrement:
            return "--";
        case Core.Unary_operation.Indirection:
            return "*";
        case Core.Unary_operation.Address_of:
            return "&";
    }
}

async function is_comparable_type(
    type_reference: Core.Type_reference[],
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<boolean> {
    if (type_reference.length === 0) {
        return false;
    }

    switch (type_reference[0].data.type) {
        case Core.Type_reference_enum.Custom_type_reference: {
            const custom_type_reference = type_reference[0].data.value as Core.Custom_type_reference;
            const module_declaration = await Parse_tree_analysis.get_custom_type_reference_declaration_using_parse_tree(custom_type_reference, get_parse_tree);
            if (module_declaration !== undefined) {
                const underlying_declaration = await Parse_tree_analysis.get_underlying_type_declaration(module_declaration.root, module_declaration.declaration, module_declaration.node_position, get_parse_tree);
                if (underlying_declaration.declaration.type === Core.Declaration_type.Alias) {
                    const alias_type_declaration = underlying_declaration.declaration.value as Core.Alias_type_declaration;
                    return is_comparable_type(alias_type_declaration.type, get_parse_tree);
                }
            }
            return false;
        }
        case Core.Type_reference_enum.Fundamental_type: {
            const fundamental_type = type_reference[0].data.value as Core.Fundamental_type;
            switch (fundamental_type) {
                case Core.Fundamental_type.String:
                case Core.Fundamental_type.Any_type:
                    return false;
                default:
                    return true;
            }
        }
        case Core.Type_reference_enum.Integer_type:
        case Core.Type_reference_enum.Pointer_type: {
            return true;
        }
        default: {
            return false;
        }
    }
}

function is_numeric_type(
    type_reference: Core.Type_reference[]
): boolean {
    if (type_reference.length === 0) {
        return false;
    }

    switch (type_reference[0].data.type) {
        case Core.Type_reference_enum.Fundamental_type: {
            const fundamental_type = type_reference[0].data.value as Core.Fundamental_type;
            switch (fundamental_type) {
                case Core.Fundamental_type.Float16:
                case Core.Fundamental_type.Float32:
                case Core.Fundamental_type.Float64:
                case Core.Fundamental_type.C_int:
                case Core.Fundamental_type.C_uint:
                case Core.Fundamental_type.C_short:
                case Core.Fundamental_type.C_ushort:
                case Core.Fundamental_type.C_longlong:
                case Core.Fundamental_type.C_ulonglong:
                    return true;
                case Core.Fundamental_type.Bool:
                case Core.Fundamental_type.Byte:
                case Core.Fundamental_type.String:
                case Core.Fundamental_type.Any_type:
                case Core.Fundamental_type.C_bool:
                case Core.Fundamental_type.C_char:
                case Core.Fundamental_type.C_schar:
                case Core.Fundamental_type.C_uchar:
                case Core.Fundamental_type.C_long:
                case Core.Fundamental_type.C_ulong:
                    return false;
            }
        }
        case Core.Type_reference_enum.Integer_type: {
            return true;
        }
        case Core.Type_reference_enum.Builtin_type_reference:
        case Core.Type_reference_enum.Constant_array_type:
        case Core.Type_reference_enum.Custom_type_reference:
        case Core.Type_reference_enum.Function_pointer_type:
        case Core.Type_reference_enum.Null_pointer_type:
        case Core.Type_reference_enum.Pointer_type: {
            return false;
        }
    }
}

function is_integer_type(
    type_reference: Core.Type_reference[]
): boolean {
    if (type_reference.length === 0) {
        return false;
    }

    switch (type_reference[0].data.type) {
        case Core.Type_reference_enum.Fundamental_type: {
            const fundamental_type = type_reference[0].data.value as Core.Fundamental_type;
            switch (fundamental_type) {
                case Core.Fundamental_type.C_int:
                case Core.Fundamental_type.C_uint:
                case Core.Fundamental_type.C_short:
                case Core.Fundamental_type.C_ushort:
                case Core.Fundamental_type.C_longlong:
                case Core.Fundamental_type.C_ulonglong:
                    return true;
                default:
                    return false;
            }
        }
        case Core.Type_reference_enum.Integer_type: {
            return true;
        }
        default:
            return false;
    }
}

function are_compatible_pointer_types(
    first: Core.Type_reference[],
    second: Core.Type_reference[]
): boolean {
    const is_first_pointer = is_pointer_type(first) || is_null_pointer_type(first);
    const is_second_pointer = is_pointer_type(second) || is_null_pointer_type(second);

    if (!is_first_pointer || !is_second_pointer) {
        return false;
    }

    if (deep_equal(first, second)) {
        return true;
    }

    return is_null_pointer_type(first) || is_null_pointer_type(second);
}

function is_pointer_type(
    type_reference: Core.Type_reference[]
): boolean {
    if (type_reference.length === 0) {
        return false;
    }

    return type_reference[0].data.type === Core.Type_reference_enum.Pointer_type;
}

function is_null_pointer_type(
    type_reference: Core.Type_reference[]
): boolean {
    if (type_reference.length === 0) {
        return false;
    }

    return type_reference[0].data.type === Core.Type_reference_enum.Null_pointer_type;
}

function is_numeric_unary_operation(
    operation: Core.Unary_operation
): boolean {
    switch (operation) {
        case Core.Unary_operation.Minus:
        case Core.Unary_operation.Pre_increment:
        case Core.Unary_operation.Post_increment:
        case Core.Unary_operation.Pre_decrement:
        case Core.Unary_operation.Post_decrement:
            return true;
        default:
            return false;
    }
}

function is_logical_unary_operation(
    operation: Core.Unary_operation
): boolean {
    return operation === Core.Unary_operation.Not;
}

async function validate_variable_expression(
    uri: string,
    root: Parser_node.Node,
    descendant_variable_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const variable_name = descendant_variable_expression.node.children[0].children[0].word.value;
    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_variable_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const symbol = await Parse_tree_analysis.get_symbol(root, descendant_variable_expression.position, variable_name, get_parse_tree);
    if (symbol === undefined) {
        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_variable_expression),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Variable '${variable_name}' does not exist.`,
                related_information: [],
            }
        );
    }

    return diagnostics;
}

async function validate_variable_declaration_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_variable_declaration_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const descendant_variable_name = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, (node) => node.word.value === "Variable_name");
    if (descendant_variable_name === undefined) {
        return diagnostics;
    }

    const variable_name = descendant_variable_name.node.children[0].word.value;

    diagnostics.push(...await validate_variable_declaration_duplicates(uri, root, descendant_variable_declaration_expression, variable_name, descendant_variable_name, get_parse_tree));
    diagnostics.push(...await validate_variable_declaration_type(uri, core_module, function_value_info.function_value, root, descendant_variable_declaration_expression, variable_name, undefined, get_parse_tree));

    return diagnostics;
}

async function validate_variable_declaration_with_type_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_variable_declaration_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const descendant_variable_name = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, (node) => node.word.value === "Variable_name");
    if (descendant_variable_name === undefined) {
        return diagnostics;
    }

    const variable_name = descendant_variable_name.node.children[0].word.value;

    diagnostics.push(...await validate_variable_declaration_duplicates(uri, root, descendant_variable_declaration_expression, variable_name, descendant_variable_name, get_parse_tree));

    const descendant_variable_type = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, (node) => node.word.value === "Expression_variable_declaration_type");
    if (descendant_variable_type !== undefined) {
        const descendant_type = Parser_node.get_child(descendant_variable_type, 0);
        const type_reference = Parse_tree_analysis.get_type_reference_from_node(root, descendant_type.node);
        if (type_reference.length > 0) {
            diagnostics.push(...await validate_variable_declaration_type(uri, core_module, function_value_info.function_value, root, descendant_variable_declaration_expression, variable_name, type_reference[0], get_parse_tree));
        }
    }

    return diagnostics;
}

async function validate_variable_declaration_duplicates(
    uri: string,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node; position: number[]; },
    variable_name: string,
    descendant_variable_name: { node: Parser_node.Node; position: number[]; },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const symbol = await Parse_tree_analysis.get_symbol_inside_function(root, descendant_variable_declaration_expression.position, variable_name, get_parse_tree);
    if (symbol !== undefined) {

        const symbol_node = Parser_node.get_node_at_position(root, symbol.node_position);
        const descendant_duplicate_variable_name = { node: symbol_node, position: symbol.node_position };
        if (descendant_duplicate_variable_name !== undefined) {
            diagnostics.push(
                {
                    location: get_parser_node_position_source_location(uri, descendant_duplicate_variable_name),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Duplicate variable name '${variable_name}'.`,
                    related_information: [],
                }
            );
        }

        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_variable_name),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Duplicate variable name '${variable_name}'.`,
                related_information: [],
            }
        );
    }

    return diagnostics;
}

async function validate_variable_declaration_type(
    uri: string,
    core_module: Core.Module,
    function_value: Core.Function,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node; position: number[]; },
    variable_name: string,
    expected_variable_type: Core.Type_reference | undefined,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_right_hand_side = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, node => node.word.value === "Generic_expression" || node.word.value === "Generic_expression_or_instantiate");
    if (descendant_right_hand_side === undefined) {
        return diagnostics;
    }

    const right_hand_side_expression = Parse_tree_analysis.get_expression_from_node(root, descendant_right_hand_side.node);
    const right_hand_side_type = await Parse_tree_analysis.get_expression_type(root, descendant_variable_declaration_expression.position, right_hand_side_expression, get_parse_tree);
    if (right_hand_side_type !== undefined && right_hand_side_type.type !== undefined && right_hand_side_type.type.length === 0) {
        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_right_hand_side),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Cannot assign expression of type 'void' to variable '${variable_name}'.`,
                related_information: [],
            }
        );
    }
    else if (right_hand_side_type !== undefined && right_hand_side_type.type !== undefined && right_hand_side_type.type.length > 0 && expected_variable_type !== undefined && !deep_equal(expected_variable_type, right_hand_side_type.type[0])) {
        const right_hand_side_type_string = Type_utilities.get_type_name(right_hand_side_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        const expected_variable_type_string = Type_utilities.get_type_name([expected_variable_type], Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        diagnostics.push(
            {
                location: get_parser_node_position_source_location(uri, descendant_right_hand_side),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Expression type '${right_hand_side_type_string}' does not match expected type '${expected_variable_type_string}'.`,
                related_information: [],
            }
        );
    }

    return diagnostics;
}

async function validate_while_loop_expression(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node, position: number[] },
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value_info = await Parse_tree_analysis.get_function_value_that_contains_node_position(root, descendant_variable_declaration_expression.position);
    if (function_value_info === undefined) {
        return diagnostics;
    }

    const descendant_condition = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, (node) => node.word.value === "Generic_expression");
    if (descendant_condition === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value_info.function_value);
    const boolean_type = Parse_tree_analysis.create_boolean_type();
    diagnostics.push(
        ...await validate_expression_type_is(uri, core_module, root, descendant_condition, [boolean_type], is_boolean_type, get_parse_tree)
    );

    return diagnostics;
}

async function validate_expression_type_is(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant: { node: Parser_node.Node, position: number[] },
    expected_type: Core.Type_reference[],
    predicate: (expression_type: Core.Type_reference[]) => boolean,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const expression = Parse_tree_analysis.get_expression_from_node(root, descendant.node);
    const expression_type = await Parse_tree_analysis.get_expression_type(root, descendant.position, expression, get_parse_tree);

    if (expression_type === undefined || !predicate(expression_type.type)) {
        const expression_type_string = expression_type !== undefined ? Type_utilities.get_type_name(expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root)) : "<undefined>";
        const expected_type_string = Type_utilities.get_type_name(expected_type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root));
        if (expression_type_string !== expected_type_string) {
            return [
                {
                    location: get_parser_node_position_source_location(uri, descendant),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Expression type '${expression_type_string}' does not match expected type '${expected_type_string}'.`,
                    related_information: [],
                }
            ];
        }
    }

    // TODO check if expression is a value, and not a type?

    return [];
}

async function validate_expression_types_are_equal(
    uri: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    first_descendant: { node: Parser_node.Node, position: number[] },
    second_descendant: { node: Parser_node.Node, position: number[] },
    create_message: ((first_type: string, second_type: string) => string) | undefined,
    get_parse_tree: (module_name: string) => Promise<Parser_node.Node | undefined>
): Promise<Diagnostic[]> {
    const first_expression = Parse_tree_analysis.get_expression_from_node(root, first_descendant.node);
    const second_expression = Parse_tree_analysis.get_expression_from_node(root, second_descendant.node);

    const first_expression_type = await Parse_tree_analysis.get_expression_type(root, first_descendant.position, first_expression, get_parse_tree);
    const second_expression_type = await Parse_tree_analysis.get_expression_type(root, second_descendant.position, second_expression, get_parse_tree);

    // TODO check if expression is a value, and not a type?

    if (!deep_equal(first_expression_type, second_expression_type)) {
        const first_expression_type_string = first_expression_type !== undefined ? Type_utilities.get_type_name(first_expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root)) : "<undefined>";
        const second_expression_type_string = second_expression_type !== undefined ? Type_utilities.get_type_name(second_expression_type.type, Parse_tree_analysis.create_module_name_and_imports_getter_from_root(root)) : "<undefined>";
        const common_root_position = Parser_node.find_node_common_root(first_descendant.position, second_descendant.position);
        const common_root_node = Parser_node.get_node_at_position(root, common_root_position);

        const message =
            create_message !== undefined ?
                create_message(first_expression_type_string, second_expression_type_string) :
                `Expression type '${first_expression_type_string}' does not match type '${second_expression_type_string}'.`;

        return [
            {
                location: get_parser_node_position_source_location(uri, { node: common_root_node, position: common_root_position }),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: message,
                related_information: [],
            }
        ];
    }

    return [];
}

function get_parser_node_position_source_location(
    uri: string,
    descendant: { node: Parser_node.Node, position: number[] }
): Location {

    const node = descendant.node;

    return {
        uri: uri,
        range: node.source_range
    };
}

function get_scanned_word_source_location(
    uri: string,
    word: Scanner.Scanned_word
): Location {
    const source_location = word.source_location;

    return {
        uri: uri,
        range: {
            start: {
                line: source_location.line,
                column: source_location.column,
            },
            end: {
                line: source_location.line,
                column: source_location.column + word.value.length,
            },
        }
    };
}

function deep_equal(obj1: any, obj2: any): boolean {

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        return obj1 === obj2;
    }

    if (obj1 === null && obj2 === null) {
        return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (key === "source_location") {
            continue;
        }

        if (!deep_equal(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}
