import * as Core from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Language from "./Language";
import * as Parse_tree_analysis from "./Parse_tree_analysis";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";
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
    language_description: Language.Description,
    text: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    new_node_position: number[],
    new_node: Parser_node.Node,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {

    const node_stack = [new_node];
    const node_position_stack = [new_node_position];

    const diagnostics: Diagnostic[] = [];

    while (node_stack.length > 0) {
        const current_node = node_stack.pop() as Parser_node.Node;
        const current_node_position = node_position_stack.pop() as number[];

        if (current_node.production_rule_index !== undefined) {
            const node_diagnostics = await validate_current_parser_node_with_module(uri, language_description, text, core_module, root, { node: current_node, position: current_node_position }, get_core_module);
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
    new_value: { node: Parser_node.Node, position: number[] }
): Diagnostic[] {

    switch (new_value.node.word.value) {
        case "Expression_constant": {
            return validate_constant_expression(uri, new_value.node.children[0]);
        }
    }

    return [];
}

async function validate_current_parser_node_with_module(
    uri: string,
    language_description: Language.Description,
    text: string,
    core_module: Core.Module,
    root: Parser_node.Node,
    new_value: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {

    switch (new_value.node.word.value) {
        case "Import": {
            return await validate_import(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Type": {
            return validate_type(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Declaration": {
            return validate_declaration(uri, language_description, core_module, new_value);
        }
        case "Enum": {
            return await validate_enum(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Struct": {
            return await validate_struct(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Union": {
            return validate_union(uri, core_module, new_value);
        }
        case "Expression_access": {
            return validate_access_expression(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Expression_call": {
            return validate_call_expression(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Expression_constant": {
            return validate_constant_expression(uri, new_value.node.children[0]);
        }
        case "Expression_variable": {
            return validate_variable_expression(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Expression_variable_declaration": {
            return validate_variable_declaration_expression(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Expression_variable_declaration_with_type": {
            return validate_variable_declaration_with_type_expression(uri, language_description, core_module, root, new_value, get_core_module);
        }
        case "Expression_while_loop": {
            return validate_while_loop_expression(uri, language_description, core_module, root, new_value, get_core_module);
        }
    }

    return [];
}

async function validate_import(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_import: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_import_alias = Parser_node.find_descendant_position_if(descendant_import, descendant => descendant.word.value === "Import_alias");
    if (descendant_import_alias === undefined) {
        return diagnostics;
    }

    const import_alias = descendant_import_alias.node.children[0].word.value;

    if (is_import_alias_duplicate(core_module, import_alias)) {
        diagnostics.push({
            location: get_parser_node_source_location(uri, descendant_import_alias.node),
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
    const imported_module = await get_core_module(import_module_name);
    if (imported_module === undefined) {
        diagnostics.push({
            location: get_parser_node_source_location(uri, descendant_import_name.node),
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
    core_module: Core.Module,
    import_alias: string
): boolean {
    let count = 0;
    for (const import_module of core_module.imports) {
        if (import_module.alias === import_alias) {
            ++count;
        }
    }
    return count > 1;
}

async function validate_type(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_type: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
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

        return validate_type(uri, language_description, core_module, root, descendant_value_type, get_core_module);
    }
    else if (child.node.word.value === "Type_name") {
        const type_name = child.node.children[0].word.value;

        if (type_name.startsWith("Int") || type_name.startsWith("Uint")) {
            const start_index = type_name[0] === "I" ? 3 : 4;
            const number_of_bits = Number.parseInt(type_name.substring(start_index));
            if (!Number.isNaN(number_of_bits) && number_of_bits > 64) {
                diagnostics.push({
                    location: get_parser_node_source_location(uri, child.node),
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
                    location: get_parser_node_source_location(uri, child.node),
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
                location: get_parser_node_source_location(uri, descendant_module_alias_name.node),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Module alias '${module_alias_name}' does not exist.`,
                related_information: [],
            });
            return diagnostics;
        }

        const imported_module = await get_core_module(module_import.module_name);
        if (imported_module !== undefined) {
            const declaration = imported_module.declarations.find(declaration => declaration.name === type_name);
            if (declaration === undefined) {
                diagnostics.push({
                    location: get_parser_node_source_location(uri, descendant_type_name.node),
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

function validate_declaration(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    descendant_declaration: { node: Parser_node.Node, position: number[] }
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    const descendant_declaration_name = Parser_node.find_descendant_position_if(descendant_declaration, descendant => is_declaration_name_node(descendant));
    if (descendant_declaration_name === undefined) {
        return diagnostics;
    }
    const declaration_name = descendant_declaration_name.node.children[0].word.value;

    if (is_builtin_type_name(declaration_name) || Language.is_keyword(language_description, declaration_name)) {
        diagnostics.push({
            location: get_parser_node_source_location(uri, descendant_declaration_name.node),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Invalid declaration name '${declaration_name}' which is a reserved keyword.`,
            related_information: [],
        });
    }
    else if (is_declaration_duplicate(core_module, declaration_name)) {
        diagnostics.push({
            location: get_parser_node_source_location(uri, descendant_declaration_name.node),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Duplicate declaration name '${declaration_name}'.`,
            related_information: [],
        });
    }

    return diagnostics;
}

function is_declaration_duplicate(
    core_module: Core.Module,
    declaration_name: string
): boolean {
    let count = 0;
    for (const declaration of core_module.declarations) {
        if (declaration.name === declaration_name) {
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

    const type_reference = Type_utilities.parse_type_name(type_name);
    if (type_reference.length === 0) {
        return true;
    }

    return type_reference[0].data.type !== Core.Type_reference_enum.Custom_type_reference;
}

async function validate_enum(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_enum: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
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
    diagnostics.push(...await validate_enum_value_generic_expressions(uri, language_description, core_module, declaration, root, descendant_enum_values, get_core_module));
    diagnostics.push(...validate_member_expressions_are_computed_at_compile_time(uri, declaration.name, descendant_enum_values, "Enum_value_name", "Generic_expression"));

    return diagnostics;
}

async function validate_struct(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_struct: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_struct_name = Parser_node.find_descendant_position_if(descendant_struct, descendant => descendant.word.value === "Struct_name");
    if (descendant_struct_name === undefined) {
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
    diagnostics.push(...await validate_struct_member_default_value_expressions(uri, language_description, core_module, declaration, struct_declaration, root, descendant_struct_values, get_core_module));
    diagnostics.push(...validate_member_expressions_are_computed_at_compile_time(uri, declaration.name, descendant_struct_values, "Struct_member_name", "Generic_expression"));

    return diagnostics;
}

function validate_union(
    uri: string,
    core_module: Core.Module,
    descendant_union: { node: Parser_node.Node, position: number[] }
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    const descendant_union_name = Parser_node.find_descendant_position_if(descendant_union, descendant => descendant.word.value === "Union_name");
    if (descendant_union_name === undefined) {
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

async function validate_enum_value_generic_expressions(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    declaration: Core.Declaration,
    root: Parser_node.Node,
    members: { node: Parser_node.Node, position: number[] }[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
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

        const expression = Parse_tree_analysis.get_expression_from_node(language_description, core_module, descendant_expression.node);
        const expression_type = await Parse_tree_analysis.get_expression_type(core_module, declaration, root, descendant_expression.position, expression, get_core_module);
        if (!deep_equal(expression_type, [int32_type])) {

            const descendant_member_name = Parser_node.find_descendant_position_if(descendant_member, node => node.word.value === "Enum_value_name");
            if (descendant_member_name !== undefined) {
                const member_name = descendant_member_name.node.children[0].word.value;

                diagnostics.push({
                    location: get_parser_node_source_location(uri, descendant_expression.node),
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
    language_description: Language.Description,
    core_module: Core.Module,
    declaration: Core.Declaration,
    struct_declaration: Core.Struct_declaration,
    root: Parser_node.Node,
    members: { node: Parser_node.Node, position: number[] }[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_expressions = members.map(member => Parser_node.find_descendant_position_if(member, node => node.word.value === "Generic_expression_or_instantiate"));

    for (let member_index = 0; member_index < members.length; ++member_index) {
        const descendant_expression = descendant_expressions[member_index];
        if (descendant_expression === undefined) {
            continue;
        }

        const expression = Parse_tree_analysis.get_expression_from_node(language_description, core_module, descendant_expression.node);
        const expression_type = await Parse_tree_analysis.get_expression_type(core_module, declaration, root, descendant_expression.position, expression, get_core_module);

        const member_type = struct_declaration.member_types[member_index];

        if (expression_type === undefined || expression_type.length === 0 || (expression_type.length > 0 && !deep_equal(expression_type[0], member_type))) {

            const member_name = struct_declaration.member_names[member_index];

            const member_type_string = Type_utilities.get_type_name([member_type]);
            const expression_type_string = expression_type !== undefined ? Type_utilities.get_type_name(expression_type) : "<undefined>";

            diagnostics.push({
                location: get_parser_node_source_location(uri, descendant_expression.node),
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
    member_name_node_name: string
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
            location: get_parser_node_source_location(uri, descendant_member_name.node.children[0]),
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
    expression_node_name: string
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    for (let member_index = 0; member_index < members.length; ++member_index) {
        const descendant_member = members[member_index];

        const descendant_expression = Parser_node.find_descendant_position_if(descendant_member, node => node.word.value === expression_node_name);
        if (descendant_expression === undefined) {
            continue;
        }

        const non_constant_descendants = Parser_node.find_descendant_position_if(descendant_expression, node => {

            if (node.production_rule_index === undefined) {
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

            return true;
        });

        if (non_constant_descendants !== undefined) {

            const descendant_member_name = Parser_node.find_descendant_position_if(descendant_member, node => node.word.value === member_name_node_name);
            if (descendant_member_name !== undefined) {
                const member_name = descendant_member_name.node.children[0].word.value;

                diagnostics.push({
                    location: get_parser_node_source_location(uri, descendant_expression.node),
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

async function validate_access_expression(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_access_expression: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const expression = Parse_tree_analysis.get_expression_from_node(language_description, core_module, descendant_access_expression.node);
    if (expression === undefined || expression.data.type !== Core.Expression_enum.Access_expression) {
        return diagnostics;
    }

    const access_expression = expression.data.value as Core.Access_expression;;
    const access_components = await Parse_tree_analysis.get_access_expression_components(core_module, access_expression, root, descendant_access_expression.node, descendant_access_expression.position, get_core_module);

    if (access_components.length >= 2) {
        const last_component = access_components[access_components.length - 1];
        if (last_component.type === Parse_tree_analysis.Component_type.Invalid && last_component.value as string === access_expression.member_name) {
            const previous_component = access_components[access_components.length - 2];

            if (previous_component.type === Parse_tree_analysis.Component_type.Import_module) {

                const import_module = previous_component.value as Core.Import_module_with_alias;
                const declaration_name = last_component.value as string;

                diagnostics.push({
                    location: get_parser_node_source_location(uri, descendant_access_expression.node),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Declaration '${declaration_name}' does not exist in the module '${import_module.module_name}' ('${import_module.alias}').`,
                    related_information: [],
                });
            }
            else if (previous_component.type === Parse_tree_analysis.Component_type.Declaration) {

                const module_declaration = previous_component.value as { core_module: Core.Module, declaration: Core.Declaration };
                const member_name = last_component.value as string;

                diagnostics.push({
                    location: get_parser_node_source_location(uri, descendant_access_expression.node),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Member '${member_name}' does not exist in the type '${module_declaration.declaration.name}'.`,
                    related_information: [],
                });
            }
        }
    }

    return diagnostics;
}

async function validate_call_expression(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_call_expression: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const descendant_callable = Parser_node.find_descendant_position_if(descendant_call_expression, node => node.word.value === "Expression_level_1");
    if (descendant_callable === undefined) {
        return diagnostics;
    }

    const module_function_value = await Parse_tree_analysis.get_function_value_from_node(language_description, core_module, descendant_callable.node, get_core_module);
    if (module_function_value === undefined) {
        diagnostics.push({
            location: get_parser_node_source_location(uri, descendant_callable.node),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Expression does not evaluate to a callable expression.`,
            related_information: [],
        });
        return diagnostics;
    }

    const function_declaration = module_function_value.function_value.declaration;

    const expression = Parse_tree_analysis.get_expression_from_node(language_description, core_module, descendant_call_expression.node);
    if (expression === undefined || expression.data.type !== Core.Expression_enum.Call_expression) {
        return diagnostics;
    }

    const call_expression = expression.data.value as Core.Call_expression;
    if (call_expression.arguments.length !== function_declaration.input_parameter_names.length) {
        diagnostics.push({
            location: get_parser_node_source_location(uri, descendant_call_expression.node),
            source: Source.Parse_tree_validation,
            severity: Diagnostic_severity.Error,
            message: `Function '${function_declaration.name}' expects ${function_declaration.input_parameter_names.length} arguments, but ${call_expression.arguments.length} were provided.`,
            related_information: [],
        });
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(module_function_value.function_value);

    const descedant_call_arguments = Parser_node.find_descendant_position_if(descendant_call_expression, node => node.word.value === "Expression_call_arguments");
    if (descedant_call_arguments === undefined) {
        return diagnostics;
    }

    for (let parameter_index = 0; parameter_index < function_declaration.input_parameter_names.length; parameter_index++) {
        const parameter_name = function_declaration.input_parameter_names[parameter_index];
        const parameter_type = function_declaration.type.input_parameter_types[parameter_index];

        const argument_expression = call_expression.arguments[parameter_index];
        const argument_expression_type = await Parse_tree_analysis.get_expression_type(core_module, scope_declaration, root, descendant_call_expression.position, argument_expression, get_core_module);
        if (argument_expression_type === undefined) {
            continue;
        }

        if (!deep_equal(argument_expression_type, parameter_type)) {
            const argument_node = descedant_call_arguments.node.children[parameter_index * 2];

            diagnostics.push({
                location: get_parser_node_source_location(uri, argument_node),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Argument '${parameter_name}' expects type '${Type_utilities.get_type_name([parameter_type], core_module)}', but '${Type_utilities.get_type_name(argument_expression_type, core_module)}' was provided.`,
                related_information: [],
            });
        }
    }

    return diagnostics;
}

function validate_constant_expression(
    uri: string,
    node: Parser_node.Node
): Diagnostic[] {
    const word = node.word;
    switch (word.type) {
        case Grammar.Word_type.Alphanumeric: {
            if (word.value !== "true" && word.value !== "false") {
                return [
                    {
                        location: get_parser_node_source_location(uri, node),
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
                            location: get_parser_node_source_location(uri, node),
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
                            location: get_parser_node_source_location(uri, node),
                            source: Source.Parse_tree_validation,
                            severity: Diagnostic_severity.Error,
                            message: `Did not expect '${suffix}' as number suffix. The number of bits needs to be >= 1 and <= 64.`,
                            related_information: [],
                        }
                    ];
                }

                const number_value = node.word.value.substring(0, node.word.value.length - suffix.length);
                const point_index = number_value.indexOf(".");
                if (point_index !== -1) {
                    const integer_value = number_value.substring(0, point_index);
                    return [
                        {
                            location: get_parser_node_source_location(uri, node),
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
                            location: get_parser_node_source_location(uri, node),
                            source: Source.Parse_tree_validation,
                            severity: Diagnostic_severity.Error,
                            message: `Did not expect '${suffix}' as number suffix. Did you mean 'f16', 'f32' or 'f64'?`,
                            related_information: [],
                        }
                    ];
                }
                return [];
            }

            return [
                {
                    location: get_parser_node_source_location(uri, node),
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
                        location: get_parser_node_source_location(uri, node),
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

async function validate_variable_expression(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_variable_expression: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const variable_name = descendant_variable_expression.node.children[0].children[0].word.value;
    const function_value = Parse_tree_analysis.get_function_value_that_contains_node_position(core_module, root, descendant_variable_expression.position);
    if (function_value === undefined) {
        return diagnostics;
    }

    const variable_info = Parse_tree_analysis.find_variable_info(core_module, function_value, root, descendant_variable_expression.position, variable_name);
    if (variable_info === undefined) {
        diagnostics.push(
            {
                location: get_parser_node_source_location(uri, descendant_variable_expression.node),
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
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value = Parse_tree_analysis.get_function_value_that_contains_node_position(core_module, root, descendant_variable_declaration_expression.position);
    if (function_value === undefined) {
        return diagnostics;
    }

    const descendant_variable_name = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, (node) => node.word.value === "Variable_name");
    if (descendant_variable_name === undefined) {
        return diagnostics;
    }

    const variable_name = descendant_variable_name.node.children[0].word.value;

    diagnostics.push(...validate_variable_declaration_duplicates(uri, core_module, function_value, root, descendant_variable_declaration_expression, variable_name, descendant_variable_name));
    diagnostics.push(...await validate_variable_declaration_type(uri, language_description, core_module, function_value, root, descendant_variable_declaration_expression, variable_name, undefined, get_core_module));

    return diagnostics;
}

async function validate_variable_declaration_with_type_expression(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value = Parse_tree_analysis.get_function_value_that_contains_node_position(core_module, root, descendant_variable_declaration_expression.position);
    if (function_value === undefined) {
        return diagnostics;
    }

    const descendant_variable_name = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, (node) => node.word.value === "Variable_name");
    if (descendant_variable_name === undefined) {
        return diagnostics;
    }

    const variable_name = descendant_variable_name.node.children[0].word.value;

    diagnostics.push(...validate_variable_declaration_duplicates(uri, core_module, function_value, root, descendant_variable_declaration_expression, variable_name, descendant_variable_name));

    const descendant_variable_type = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, (node) => node.word.value === "Expression_variable_declaration_type");
    if (descendant_variable_type !== undefined) {
        const descendant_type = Parser_node.get_child(descendant_variable_type, 0);
        const type_reference = Parse_tree_analysis.get_type_reference_from_node(language_description, core_module, descendant_type.node);
        if (type_reference.length > 0) {
            diagnostics.push(...await validate_variable_declaration_type(uri, language_description, core_module, function_value, root, descendant_variable_declaration_expression, variable_name, type_reference[0], get_core_module));
        }
    }

    return diagnostics;
}

function validate_variable_declaration_duplicates(
    uri: string,
    core_module: Core.Module,
    function_value: Core.Function,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node; position: number[]; },
    variable_name: string,
    descendant_variable_name: { node: Parser_node.Node; position: number[]; }
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const variable_info = Parse_tree_analysis.find_variable_info(core_module, function_value, root, descendant_variable_declaration_expression.position, variable_name);
    if (variable_info !== undefined) {

        const descendant_duplicate_variable_name = Parse_tree_analysis.find_variable_name_node_from_variable_info(root, variable_info);
        if (descendant_duplicate_variable_name !== undefined) {
            diagnostics.push(
                {
                    location: get_parser_node_source_location(uri, descendant_duplicate_variable_name.node),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Duplicate variable name '${variable_name}'.`,
                    related_information: [],
                }
            );
        }

        diagnostics.push(
            {
                location: get_parser_node_source_location(uri, descendant_variable_name.node),
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
    language_description: Language.Description,
    core_module: Core.Module,
    function_value: Core.Function,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node; position: number[]; },
    variable_name: string,
    expected_variable_type: Core.Type_reference | undefined,
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {

    const diagnostics: Diagnostic[] = [];

    const descendant_right_hand_side = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, node => node.word.value === "Generic_expression" || node.word.value === "Generic_expression_or_instantiate");
    if (descendant_right_hand_side === undefined) {
        return diagnostics;
    }

    const declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value);
    const right_hand_side_expression = Parse_tree_analysis.get_expression_from_node(language_description, core_module, descendant_right_hand_side.node);
    const right_hand_side_type = await Parse_tree_analysis.get_expression_type(core_module, declaration, root, descendant_variable_declaration_expression.position, right_hand_side_expression, get_core_module);
    if (right_hand_side_type !== undefined && right_hand_side_type.length === 0) {
        diagnostics.push(
            {
                location: get_parser_node_source_location(uri, descendant_right_hand_side.node),
                source: Source.Parse_tree_validation,
                severity: Diagnostic_severity.Error,
                message: `Cannot assign expression of type 'void' to variable '${variable_name}'.`,
                related_information: [],
            }
        );
    }

    if (right_hand_side_type !== undefined && right_hand_side_type.length > 0 && expected_variable_type !== undefined && !deep_equal(expected_variable_type, right_hand_side_type[0])) {
        const right_hand_side_type_string = Type_utilities.get_type_name(right_hand_side_type, core_module);
        const expected_variable_type_string = Type_utilities.get_type_name([expected_variable_type], core_module);
        diagnostics.push(
            {
                location: get_parser_node_source_location(uri, descendant_right_hand_side.node),
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
    language_description: Language.Description,
    core_module: Core.Module,
    root: Parser_node.Node,
    descendant_variable_declaration_expression: { node: Parser_node.Node, position: number[] },
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    const function_value = Parse_tree_analysis.get_function_value_that_contains_node_position(core_module, root, descendant_variable_declaration_expression.position);
    if (function_value === undefined) {
        return diagnostics;
    }

    const descendant_condition = Parser_node.find_descendant_position_if(descendant_variable_declaration_expression, (node) => node.word.value === "Generic_expression");
    if (descendant_condition === undefined) {
        return diagnostics;
    }

    const scope_declaration = Parse_tree_analysis.create_declaration_from_function_value(function_value);
    const boolean_type = Parse_tree_analysis.create_boolean_type();
    diagnostics.push(
        ...await validate_expression_type_is(uri, language_description, core_module, scope_declaration, root, descendant_condition, [boolean_type], get_core_module)
    );

    return diagnostics;
}

async function validate_expression_type_is(
    uri: string,
    language_description: Language.Description,
    core_module: Core.Module,
    scope_declaration: Core.Declaration,
    root: Parser_node.Node,
    descendant: { node: Parser_node.Node, position: number[] },
    expected_type: Core.Type_reference[],
    get_core_module: (module_name: string) => Promise<Core.Module | undefined>
): Promise<Diagnostic[]> {
    const expression = Parse_tree_analysis.get_expression_from_node(language_description, core_module, descendant.node);
    const expression_type = await Parse_tree_analysis.get_expression_type(core_module, scope_declaration, root, descendant.position, expression, get_core_module);

    if (expression_type === undefined || !deep_equal(expression_type, expected_type)) {
        const expression_type_string = expression_type !== undefined ? Type_utilities.get_type_name(expression_type, core_module) : "<undefined>";
        const expected_type_string = Type_utilities.get_type_name(expected_type, core_module);
        if (expression_type_string !== expected_type_string) {
            return [
                {
                    location: get_parser_node_source_location(uri, descendant.node),
                    source: Source.Parse_tree_validation,
                    severity: Diagnostic_severity.Error,
                    message: `Expression type '${expression_type_string}' does not match expected type '${expected_type_string}'.`,
                    related_information: [],
                }
            ];
        }
    }

    return [];
}

function get_parser_node_source_location(
    uri: string,
    node: Parser_node.Node
): Location {
    const range = Parse_tree_analysis.find_node_range_using_scanned_word_source_location(node);

    return {
        uri: uri,
        range: {
            start: {
                line: range.start.line,
                column: range.start.column,
            },
            end: {
                line: range.end.line,
                column: range.end.column,
            },
        }
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