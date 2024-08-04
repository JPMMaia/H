import * as Core from "./Core_intermediate_representation";
import * as Grammar from "./Grammar";
import * as Language from "./Language";
import * as Parse_tree_analysis from "./Parse_tree_analysis";
import * as Parser_node from "./Parser_node";
import * as Scanner from "./Scanner";

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

    const node_queue = [new_node];
    const node_position_queue = [new_node_position];

    const diagnostics: Diagnostic[] = [];

    while (node_queue.length > 0) {
        const current_node = node_queue.shift() as Parser_node.Node;
        const current_node_position = node_position_queue.shift() as number[];

        if (current_node.production_rule_index !== undefined) {
            const node_diagnostics = validate_current_parser_node(uri, { node: current_node, position: current_node_position });
            diagnostics.push(...node_diagnostics);
        }

        for (let child_index = 0; child_index < current_node.children.length; ++child_index) {
            node_queue.push(current_node.children[child_index]);
            node_position_queue.push(current_node_position);
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

    const node_queue = [new_node];
    const node_position_queue = [new_node_position];

    const diagnostics: Diagnostic[] = [];

    while (node_queue.length > 0) {
        const current_node = node_queue.shift() as Parser_node.Node;
        const current_node_position = node_position_queue.shift() as number[];

        if (current_node.production_rule_index !== undefined) {
            const node_diagnostics = await validate_current_parser_node_with_module(uri, language_description, text, core_module, root, { node: current_node, position: current_node_position }, get_core_module);
            diagnostics.push(...node_diagnostics);
        }

        for (let child_index = 0; child_index < current_node.children.length; ++child_index) {
            node_queue.push(current_node.children[child_index]);
            node_position_queue.push(current_node_position);
        }
    }

    return diagnostics;
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
        case "Enum": {
            return await validate_enum(uri, language_description, text, core_module, root, new_value, get_core_module);
        }
        case "Expression_constant": {
            return validate_constant_expression(uri, new_value.node.children[0]);
        }
    }

    return [];
}

async function validate_enum(
    uri: string,
    language_description: Language.Description,
    text: string,
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
    diagnostics.push(...await validate_enum_value_generic_expressions(uri, language_description, text, core_module, declaration, root, descendant_enum_values, get_core_module));
    diagnostics.push(...validate_member_expressions_are_computed_at_compile_time(uri, declaration.name, descendant_enum_values, "Enum_value_name", "Generic_expression"));

    return diagnostics;
}

async function validate_enum_value_generic_expressions(
    uri: string,
    language_description: Language.Description,
    text: string,
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
        if (!deep_equal(expression_type, int32_type)) {

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