import * as Core from "./Core_intermediate_representation";
import * as Parse_tree_convertor_mappings from "./Parse_tree_convertor_mappings";
import * as Parser_node from "./Parser_node";
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

export function format_function_declaration(node: Parser_node.Node): string {
    const input_parameters_node = node.children.find(child => child.word.value === "Function_input_parameters");
    const input_parameters_string = format_function_parameters(input_parameters_node);

    const output_parameters_node = node.children.find(child => child.word.value === "Function_output_parameters");
    const output_parameters_string = format_function_parameters(output_parameters_node);

    const function_name_node = node.children.find(child => child.word.value === "Function_name");
    const function_name = function_name_node.children[0];

    return `function ${function_name}${input_parameters_string} -> ${output_parameters_string}`;
}

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
