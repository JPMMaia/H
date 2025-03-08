import * as Core from "./Core_intermediate_representation";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parser_node from "./Parser_node";
import * as Type_utilities from "./Type_utilities";
import { onThrowError } from "./errors";

export function to_unformatted_text(
    node: Parser_node.Node
): string {

    const buffer: string[] = [];

    let iterator: Parser_node.Forward_repeat_iterator | undefined = {
        root: node,
        current_node: node,
        current_position: [],
        current_direction: Parser_node.Iterate_direction.Down
    };

    while (iterator !== undefined) {

        if (iterator.current_node.production_rule_index === undefined && iterator.current_node.word.value.length > 0) {
            buffer.push(iterator.current_node.word.value);
        }

        iterator = Parser_node.next_iterator(iterator);
    }

    return buffer.join(" ");
}

export function node_to_string(
    root: Parser_node.Node,
    value: { node: Parser_node.Node, position: number[] },
    before_character: string | undefined,
    after_character: string | undefined
): string {
    return to_unformatted_text(value.node);
}

/*export function format_function_declaration(node: Parser_node.Node): string {
    const input_parameters_node = node.children.find(child => child.word.value === "Function_input_parameters");
    const input_parameters_string = format_function_parameters(input_parameters_node);

    const output_parameters_node = node.children.find(child => child.word.value === "Function_output_parameters");
    const output_parameters_string = format_function_parameters(output_parameters_node);

    const function_name_node = node.children.find(child => child.word.value === "Function_name");
    const function_name = function_name_node.children[0];

    return `function ${function_name}${input_parameters_string} -> ${output_parameters_string}`;
}*/

function format_function_parameters(node: Parser_node.Node): string {
    const parameters = node.children.slice(1, node.children.length - 1).filter(node => node.word.value !== ",");
    const parameters_string = parameters.map(parameter => format_function_parameter(parameter)).join(", ");
    return `(${parameters_string})`;
}

function format_function_parameter(node: Parser_node.Node): string {

    if (node.children[0].word.value === "...") {
        return "...";
    }

    const name = node.children[0].word.value;
    const type = get_type_string(node.children[2]);

    return `${name}: ${type}`;
}

function get_type_string(node: Parser_node.Node): string {
    return "";
}

export function format_module(core_module: Core.Module): string {

    // TODO add comment
    const module_declaration = `module ${core_module.name};\n`;

    const imports = core_module.imports.map(value => format_import_module_with_alias(value) + "\n");
    const imports_string = imports.length > 0 ? "\n" + imports.join("") : "";

    const declarations = core_module.declarations.map(value => format_declaration(value));
    const declarations_string = declarations.length > 0 ? "\n" + declarations.join("\n") : "";

    const final = `${module_declaration}${imports_string}${declarations_string}`;
    return final;
}

export function format_import_module_with_alias(import_alias: Core.Import_module_with_alias): string {
    return `import ${import_alias.module_name} as ${import_alias.alias};`;
}

export function format_declaration(declaration: Core.Declaration): string {

    const export_string = declaration.is_export ? "export " : "";
    const underlying_declaration_string = format_underlying_declaration(declaration);

    // TODO comment
    return `${export_string}${underlying_declaration_string}`;
}

export function format_underlying_declaration(declaration: Core.Declaration): string {

    switch (declaration.type) {
        case Core.Declaration_type.Alias: {
            return format_alias_type_declaration(declaration.value as Core.Alias_type_declaration);
        }
        case Core.Declaration_type.Enum: {
            return format_enum_declaration(declaration.value as Core.Enum_declaration);
        }
        case Core.Declaration_type.Function: {
            return format_function_value(declaration.value as Core.Function);
        }
        case Core.Declaration_type.Function_constructor: {
            // TODO
            return "";
        }
        case Core.Declaration_type.Global_variable: {
            return format_global_variable_declaration(declaration.value as Core.Global_variable_declaration);
        }
        case Core.Declaration_type.Struct: {
            return format_struct_declaration(declaration.value as Core.Struct_declaration);
        }
        case Core.Declaration_type.Type_constructor: {
            // TODO
            return "";
        }
        case Core.Declaration_type.Union: {
            return format_union_declaration(declaration.value as Core.Union_declaration);
        }
    }
}

export function format_alias_type_declaration(alias_type_declaration: Core.Alias_type_declaration): string {
    const type_string = Type_utilities.get_type_name(alias_type_declaration.type);
    return `using ${alias_type_declaration.name} = ${type_string};\n`;
}

export function format_enum_declaration(enum_declaration: Core.Enum_declaration): string {
    const lines: string[] = [];

    lines.push(`enum ${enum_declaration.name}`);
    lines.push("{");
    for (const enum_value of enum_declaration.values) {
        const enum_value_string = format_enum_value(enum_value, 4);
        lines.push(enum_value_string);
    }
    lines.push("}");
    lines.push("");

    const final = lines.join("\n");
    return final;
}

export function format_enum_value(enum_value: Core.Enum_value, indentation: number): string {
    const indentation_string = " ".repeat(indentation);
    const value_string = enum_value.value !== undefined ? format_expression(enum_value.value.expression, 0) : "";
    const assignment_string = enum_value.value !== undefined ? ` = ${value_string}` : "";
    return `${indentation_string}${enum_value.name}${assignment_string},`;
}

export function format_function_value(function_value: Core.Function): string {

    const declaration_string = format_function_declaration(function_value.declaration);
    const definition_string = function_value.definition !== undefined ? "\n" + format_function_definition(function_value.definition) : ";";

    return `${declaration_string}${definition_string}`;
}

export function format_function_declaration(function_declaration: Core.Function_declaration): string {
    return "";
}

export function format_function_definition(function_declaration: Core.Function_definition): string {
    return format_expression_block_of_statements(function_declaration.statements, 0);
}

export function format_global_variable_declaration(global_variable_declaration: Core.Global_variable_declaration): string {
    const keyword_string = global_variable_declaration.is_mutable ? "mutable" : "var";
    const value_string = format_statement(global_variable_declaration.initial_value, 0);
    return `${keyword_string} ${global_variable_declaration.name} = ${value_string};`;
}

export function format_struct_declaration(struct_declaration: Core.Struct_declaration): string {
    const lines: string[] = [];

    lines.push(`struct ${struct_declaration.name}`);
    lines.push("{");

    const indentation_string = " ".repeat(4);

    for (let member_index = 0; member_index < struct_declaration.member_names.length; ++member_index) {
        const member_name = struct_declaration.member_names[member_index];
        const member_type = struct_declaration.member_types[member_index];
        const member_value = struct_declaration.member_default_values[member_index];

        const member_type_string = Type_utilities.get_type_name([member_type]);
        const member_value_string = format_statement(member_value, 0);

        // TODO comment
        const member_string = `${indentation_string}${member_name}: ${member_type_string} = ${member_value_string};`;
        lines.push(member_string);
    }
    lines.push("}");
    lines.push("");

    const final = lines.join("\n");
    return final;
}

export function format_union_declaration(union_declaration: Core.Union_declaration): string {
    const lines: string[] = [];

    lines.push(`struct ${union_declaration.name}`);
    lines.push("{");

    const indentation_string = " ".repeat(4);

    for (let member_index = 0; member_index < union_declaration.member_names.length; ++member_index) {
        const member_name = union_declaration.member_names[member_index];
        const member_type = union_declaration.member_types[member_index];

        const member_type_string = Type_utilities.get_type_name([member_type]);

        // TODO comment
        const member_string = `${indentation_string}${member_name}: ${member_type_string};`;
        lines.push(member_string);
    }
    lines.push("}");
    lines.push("");

    const final = lines.join("\n");
    return final;
}

export function format_statement(statement: Core.Statement, indentation: number): string {
    return format_expression(statement.expression, indentation);
}

export function format_expression(expression: Core.Expression, indentation: number): string {
    switch (expression.data.type) {
        case Core.Expression_enum.Constant_expression: {
            return format_expression_constant(expression.data.value as Core.Constant_expression);
        }
        case Core.Expression_enum.Instantiate_expression: {
            return format_expression_instantiate(expression.data.value as Core.Instantiate_expression, indentation);
        }
        default: {
            const message = "format_expression: Not implemented!"
            onThrowError(message);
            throw new Error(message);
        }
    }
}

export function format_expression_constant(expression: Core.Constant_expression): string {
    const word = Parse_tree_convertor_mappings.constant_expression_to_word(expression);
    return word.value;
}

export function format_expression_block_of_statements(statements: Core.Statement[], outside_indentation: number): string {
    const inside_indentation = outside_indentation + 4;
    const outside_indentation_string = " ".repeat(outside_indentation);
    const statement_strings = statements.map(statement => format_statement(statement, inside_indentation));
    const statements_string = statement_strings.join();
    return `${outside_indentation_string}{\n${statements_string}}\n`;
}

export function format_expression_instantiate(expression: Core.Instantiate_expression, outside_indentation: number): string {

    const type_string = expression.type === Core.Instantiate_expression_type.Explicit ? "explicit " : "";

    if (expression.members.length === 0) {
        return `${type_string}{}`;
    }

    const members_strings: string[] = [];

    const inside_indentation = outside_indentation + 4;
    const inside_indentation_string = " ".repeat(inside_indentation);
    const outside_indentation_string = " ".repeat(outside_indentation);

    for (const member of expression.members) {
        const value_string = format_statement(member.value, inside_indentation);
        members_strings.push(`${inside_indentation_string}${member.member_name}: ${value_string}`)
    }

    const members_string = members_strings.join(",\n");

    return `${type_string}{\n${members_string}\n${outside_indentation_string}}`;
}

export function calculate_current_indentation(text: string, offset: number): number {
    let current_offset = offset;

    while (current_offset >= 0) {
        const character = text[current_offset];
        if (character === "\n" || character === "\r") {
            break;
        }

        current_offset -= 1;
    }

    if (current_offset < 0) {
        return 0;
    }

    let indentation = 0;

    current_offset += 1;

    while (current_offset < text.length) {
        const character = text[current_offset];
        if (character === " ") {
            indentation += 1;
        }
        else if (character === "\t") {
            indentation += 4;
        }
        else {
            break;
        }

        current_offset += 1;
    }

    return indentation;
}
