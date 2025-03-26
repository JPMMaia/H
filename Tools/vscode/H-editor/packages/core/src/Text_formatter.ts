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

export interface Options {
    module_name_and_imports_getter?: Type_utilities.Module_name_and_imports_getter;
}

export function format_module(core_module: Core.Module, options: Options): string {
    if (options.module_name_and_imports_getter === undefined) {
        options.module_name_and_imports_getter = Type_utilities.create_module_name_and_imports_getter_from_module(core_module);
    }

    const module_declaration = `module ${core_module.name};\n`;

    const imports = core_module.imports.map(value => format_import_module_with_alias(value, options) + "\n");
    const imports_string = imports.length > 0 ? "\n" + imports.join("") : "";

    const declarations = core_module.declarations.map(value => format_declaration(value, options));
    const declarations_string = declarations.length > 0 ? "\n" + declarations.join("\n") : "";

    const comment = core_module.comment !== undefined ? decode_comment(core_module.comment, 0, options) + "\n" : "";

    const final = `${comment}${module_declaration}${imports_string}${declarations_string}`;
    return final;
}

export function format_import_module_with_alias(import_alias: Core.Import_module_with_alias, options: Options): string {
    return `import ${import_alias.module_name} as ${import_alias.alias};`;
}

export function format_declaration(declaration: Core.Declaration, options: Options): string {

    const export_string = declaration.is_export ? "export " : "";
    const underlying_declaration_string = format_underlying_declaration(declaration, options);

    const comment = get_declaration_comment(declaration);
    const comment_string = comment !== undefined ? decode_comment(comment, 0, options) + "\n" : "";

    return `${comment_string}${export_string}${underlying_declaration_string}`;
}

function get_declaration_comment(declaration: Core.Declaration): string | undefined {
    switch (declaration.type) {
        case Core.Declaration_type.Alias: {
            const value = declaration.value as Core.Alias_type_declaration;
            return value.comment;
        }
        case Core.Declaration_type.Enum: {
            const value = declaration.value as Core.Enum_declaration;
            return value.comment;
        }
        case Core.Declaration_type.Function: {
            const value = declaration.value as Core.Function;
            return value.declaration.comment;
        }
        case Core.Declaration_type.Function_constructor: {
            const value = declaration.value as Core.Function_constructor;
            return ""; // TODO
        }
        case Core.Declaration_type.Global_variable: {
            const value = declaration.value as Core.Global_variable_declaration;
            return value.comment;
        }
        case Core.Declaration_type.Struct: {
            const value = declaration.value as Core.Struct_declaration;
            return value.comment;
        }
        case Core.Declaration_type.Type_constructor: {
            const value = declaration.value as Core.Type_constructor;
            return ""; // TODO
        }
        case Core.Declaration_type.Union: {
            const value = declaration.value as Core.Union_declaration;
            return value.comment;
        }
    }
}

export function format_underlying_declaration(declaration: Core.Declaration, options: Options): string {

    switch (declaration.type) {
        case Core.Declaration_type.Alias: {
            return format_alias_type_declaration(declaration.value as Core.Alias_type_declaration, options);
        }
        case Core.Declaration_type.Enum: {
            return format_enum_declaration(declaration.value as Core.Enum_declaration, options);
        }
        case Core.Declaration_type.Function: {
            return format_function_value(declaration.value as Core.Function, options);
        }
        case Core.Declaration_type.Function_constructor: {
            // TODO
            return "";
        }
        case Core.Declaration_type.Global_variable: {
            return format_global_variable_declaration(declaration.value as Core.Global_variable_declaration, options);
        }
        case Core.Declaration_type.Struct: {
            return format_struct_declaration(declaration.value as Core.Struct_declaration, options);
        }
        case Core.Declaration_type.Type_constructor: {
            // TODO
            return "";
        }
        case Core.Declaration_type.Union: {
            return format_union_declaration(declaration.value as Core.Union_declaration, options);
        }
    }
}

export function format_alias_type_declaration(alias_type_declaration: Core.Alias_type_declaration, options: Options): string {
    const type_string = Type_utilities.get_type_name(alias_type_declaration.type, options.module_name_and_imports_getter);
    return `using ${alias_type_declaration.name} = ${type_string};\n`;
}

export function format_enum_declaration(enum_declaration: Core.Enum_declaration, options: Options): string {
    const lines: string[] = [];

    const inside_indentation = 4;

    lines.push(`enum ${enum_declaration.name}`);
    lines.push("{");
    for (const enum_value of enum_declaration.values) {
        const comment = enum_value.comment !== undefined ? " ".repeat(inside_indentation) + decode_comment(enum_value.comment, inside_indentation, options) + "\n" : "";
        const enum_value_string = format_enum_value(enum_value, inside_indentation, options);
        lines.push(comment + enum_value_string);
    }
    lines.push("}");
    lines.push("");

    const final = lines.join("\n");
    return final;
}

export function format_enum_value(enum_value: Core.Enum_value, indentation: number, options: Options): string {
    const indentation_string = " ".repeat(indentation);
    const value_string = enum_value.value !== undefined ? format_expression(enum_value.value.expression, 0, options) : "";
    const assignment_string = enum_value.value !== undefined ? ` = ${value_string}` : "";
    return `${indentation_string}${enum_value.name}${assignment_string},`;
}

export function format_function_value(function_value: Core.Function, options: Options): string {

    const declaration_string = format_function_declaration(function_value.declaration, options);
    const definition_string = function_value.definition !== undefined ? "\n" + format_function_definition(function_value.definition, options) : ";";

    return `${declaration_string}${definition_string}`;
}

export function format_function_declaration(function_declaration: Core.Function_declaration, options: Options): string {
    const input_parameters_string = format_function_parameters(function_declaration.input_parameter_names, function_declaration.type.input_parameter_types, function_declaration.type.is_variadic, options);
    const output_parameters_string = format_function_parameters(function_declaration.output_parameter_names, function_declaration.type.output_parameter_types, false, options);
    return `function ${function_declaration.name}${input_parameters_string} -> ${output_parameters_string}`;
}

export function format_function_parameters(names: string[], types: Core.Type_reference[], is_variadic: boolean, options: Options): string {

    const strings: string[] = [];

    for (let index = 0; index < names.length; ++index) {
        const name = names[index];
        const type = types[index];
        strings.push(format_function_parameter(name, type, options));
    }

    if (is_variadic) {
        strings.push("...");
    }

    const final = `(${strings.join(", ")})`;
    return final;
}

export function format_function_parameter(name: string, type: Core.Type_reference, options: Options): string {
    const type_string = Type_utilities.get_type_name([type], options.module_name_and_imports_getter);
    return `${name}: ${type_string}`;
}

export function format_function_definition(function_declaration: Core.Function_definition, options: Options): string {
    return format_expression_block_of_statements(function_declaration.statements, 0, options);
}

export function format_global_variable_declaration(global_variable_declaration: Core.Global_variable_declaration, options: Options): string {
    const keyword_string = global_variable_declaration.is_mutable ? "mutable" : "var";
    const value_string = format_statement(global_variable_declaration.initial_value, 0, options);
    return `${keyword_string} ${global_variable_declaration.name} = ${value_string};`;
}

export function format_struct_declaration(struct_declaration: Core.Struct_declaration, options: Options): string {
    const lines: string[] = [];

    lines.push(`struct ${struct_declaration.name}`);
    lines.push("{");

    const inside_indentation = 4;
    const inside_indentation_string = " ".repeat(inside_indentation);

    for (let member_index = 0; member_index < struct_declaration.member_names.length; ++member_index) {
        const member_name = struct_declaration.member_names[member_index];
        const member_type = struct_declaration.member_types[member_index];
        const member_value = struct_declaration.member_default_values[member_index];
        const member_comment = struct_declaration.member_comments.find(comment => comment.index === member_index);;

        const member_type_string = Type_utilities.get_type_name([member_type], options.module_name_and_imports_getter);
        const member_value_string = format_statement(member_value, 0, options);

        const comment = member_comment !== undefined ? " ".repeat(inside_indentation) + decode_comment(member_comment.comment, inside_indentation, options) + "\n" : "";

        const member_string = `${comment}${inside_indentation_string}${member_name}: ${member_type_string} = ${member_value_string};`;
        lines.push(member_string);
    }
    lines.push("}");
    lines.push("");

    const final = lines.join("\n");
    return final;
}

export function format_union_declaration(union_declaration: Core.Union_declaration, options: Options): string {
    const lines: string[] = [];

    lines.push(`union ${union_declaration.name}`);
    lines.push("{");

    const inside_indentation = 4;
    const inside_indentation_string = " ".repeat(inside_indentation);

    for (let member_index = 0; member_index < union_declaration.member_names.length; ++member_index) {
        const member_name = union_declaration.member_names[member_index];
        const member_type = union_declaration.member_types[member_index];
        const member_comment = union_declaration.member_comments.find(comment => comment.index === member_index);;

        const member_type_string = Type_utilities.get_type_name([member_type], options.module_name_and_imports_getter);

        const comment = member_comment !== undefined ? " ".repeat(inside_indentation) + decode_comment(member_comment.comment, inside_indentation, options) + "\n" : "";

        const member_string = `${comment}${inside_indentation_string}${member_name}: ${member_type_string};`;
        lines.push(member_string);
    }
    lines.push("}");
    lines.push("");

    const final = lines.join("\n");
    return final;
}

export function format_statement(statement: Core.Statement, indentation: number, options: Options): string {
    switch (statement.expression.data.type) {
        case Core.Expression_enum.Assignment_expression:
        case Core.Expression_enum.Break_expression:
        case Core.Expression_enum.Call_expression:
        case Core.Expression_enum.Compile_time_expression:
        case Core.Expression_enum.Continue_expression:
        case Core.Expression_enum.Defer_expression:
        case Core.Expression_enum.Return_expression:
        case Core.Expression_enum.Variable_declaration_expression:
        case Core.Expression_enum.Variable_declaration_with_type_expression:
            return format_expression_and_add_indentation(statement.expression, indentation, options) + ";";
        case Core.Expression_enum.Block_expression:
        case Core.Expression_enum.Comment_expression:
        case Core.Expression_enum.For_loop_expression:
        case Core.Expression_enum.If_expression:
        case Core.Expression_enum.Switch_expression:
        case Core.Expression_enum.While_loop_expression:
        default:
            return format_expression_and_add_indentation(statement.expression, indentation, options);
    }
}

export function format_expression_and_add_indentation(expression: Core.Expression, indentation: number, options: Options): string {
    const expression_string = format_expression(expression, indentation, options);
    const indentation_string = " ".repeat(indentation);
    return `${indentation_string}${expression_string}`;
}

export function format_expression(expression: Core.Expression, indentation: number, options: Options): string {
    switch (expression.data.type) {
        case Core.Expression_enum.Access_expression:
            return format_expression_access(expression.data.value as Core.Access_expression, options);
        case Core.Expression_enum.Access_array_expression:
            return format_expression_access_array(expression.data.value as Core.Access_array_expression, options);
        case Core.Expression_enum.Assignment_expression:
            return format_expression_assignment(expression.data.value as Core.Assignment_expression, options);
        case Core.Expression_enum.Binary_expression:
            return format_expression_binary(expression.data.value as Core.Binary_expression, options);
        case Core.Expression_enum.Block_expression:
            return format_expression_block(expression.data.value as Core.Block_expression, indentation, options);
        case Core.Expression_enum.Break_expression:
            return format_expression_break(expression.data.value as Core.Break_expression, options);
        case Core.Expression_enum.Call_expression:
            return format_expression_call(expression.data.value as Core.Call_expression, options);
        case Core.Expression_enum.Cast_expression:
            return format_expression_cast(expression.data.value as Core.Cast_expression, options);
        case Core.Expression_enum.Comment_expression:
            return format_expression_comment(expression.data.value as Core.Comment_expression, indentation, options);
        case Core.Expression_enum.Compile_time_expression:
            return format_expression_compile_time(expression.data.value as Core.Compile_time_expression, options);
        case Core.Expression_enum.Constant_expression:
            return format_expression_constant(expression.data.value as Core.Constant_expression, options);
        case Core.Expression_enum.Constant_array_expression:
            return format_expression_constant_array(expression.data.value as Core.Constant_array_expression, options);
        case Core.Expression_enum.Continue_expression:
            return format_expression_continue(expression.data.value as Core.Continue_expression, options);
        case Core.Expression_enum.Defer_expression:
            return format_expression_defer(expression.data.value as Core.Defer_expression, options);
        case Core.Expression_enum.For_loop_expression:
            return format_expression_for_loop(expression.data.value as Core.For_loop_expression, indentation, options);
        case Core.Expression_enum.Function_expression:
            return format_expression_function(expression.data.value as Core.Function_expression, options);
        case Core.Expression_enum.If_expression:
            return format_expression_if(expression.data.value as Core.If_expression, indentation, options);
        case Core.Expression_enum.Instance_call_expression:
            return format_expression_instance_call(expression.data.value as Core.Instance_call_expression, options);
        case Core.Expression_enum.Instantiate_expression:
            return format_expression_instantiate(expression.data.value as Core.Instantiate_expression, indentation, options);
        case Core.Expression_enum.Invalid_expression:
            return format_expression_invalid(expression.data.value as Core.Invalid_expression, options);
        case Core.Expression_enum.Null_pointer_expression:
            return format_expression_null_pointer(expression.data.value as Core.Null_pointer_expression, options);
        case Core.Expression_enum.Parenthesis_expression:
            return format_expression_parenthesis(expression.data.value as Core.Parenthesis_expression, options);
        case Core.Expression_enum.Return_expression:
            return format_expression_return(expression.data.value as Core.Return_expression, options);
        case Core.Expression_enum.Struct_expression:
            return format_expression_struct(expression.data.value as Core.Struct_expression, options);
        case Core.Expression_enum.Switch_expression:
            return format_expression_switch(expression.data.value as Core.Switch_expression, indentation, options);
        case Core.Expression_enum.Ternary_condition_expression:
            return format_expression_ternary_condition(expression.data.value as Core.Ternary_condition_expression, options);
        case Core.Expression_enum.Type_expression:
            return format_expression_type(expression.data.value as Core.Type_expression, options);
        case Core.Expression_enum.Unary_expression:
            return format_expression_unary(expression.data.value as Core.Unary_expression, options);
        case Core.Expression_enum.Union_expression:
            return format_expression_union(expression.data.value as Core.Union_expression, options);
        case Core.Expression_enum.Variable_declaration_expression:
            return format_expression_variable_declaration(expression.data.value as Core.Variable_declaration_expression, options);
        case Core.Expression_enum.Variable_declaration_with_type_expression:
            return format_expression_variable_declaration_with_type(expression.data.value as Core.Variable_declaration_with_type_expression, indentation, options);
        case Core.Expression_enum.Variable_expression:
            return format_expression_variable(expression.data.value as Core.Variable_expression, options);
        case Core.Expression_enum.While_loop_expression:
            return format_expression_while_loop(expression.data.value as Core.While_loop_expression, indentation, options);
        default: {
            const message = `format_expression: Not implemented for '${expression.data.type}'!`;
            onThrowError(message);
            throw new Error(message);
        }
    }
}

export function format_expression_access(expression: Core.Access_expression, options: Options): string {
    const left_hand_side = format_expression(expression.expression, 0, options);
    return `${left_hand_side}.${expression.member_name}`;
}

export function format_expression_access_array(expression: Core.Access_array_expression, options: Options): string {
    const left_hand_side = format_expression(expression.expression, 0, options);
    const index = format_expression(expression.index, 0, options);
    return `${left_hand_side}[${index}]`;
}

export function format_expression_assignment(expression: Core.Assignment_expression, options: Options): string {
    const left_hand_side = format_expression(expression.left_hand_side, 0, options);
    const right_hand_side = format_expression(expression.right_hand_side, 0, options);
    const symbol = Parse_tree_convertor_mappings.assignment_binary_operation_to_string(expression.additional_operation);
    return `${left_hand_side} ${symbol} ${right_hand_side}`;
}

export function format_expression_binary(expression: Core.Binary_expression, options: Options): string {
    const left_hand_side = format_expression(expression.left_hand_side, 0, options);
    const right_hand_side = format_expression(expression.right_hand_side, 0, options);
    const symbol = Parse_tree_convertor_mappings.binary_operation_to_string(expression.operation);
    return `${left_hand_side} ${symbol} ${right_hand_side}`;
}

export function format_expression_block(expression: Core.Block_expression, outside_indentation: number, options: Options): string {
    return format_expression_block_of_statements(expression.statements, outside_indentation, options);
}

export function format_expression_break(expression: Core.Break_expression, options: Options): string {
    return (expression.loop_count > 1) ? `break ${expression.loop_count}` : "break";
}

export function format_expression_call(expression: Core.Call_expression, options: Options): string {
    const left_hand_side = format_expression(expression.expression, 0, options);
    const argument_strings = expression.arguments.map(argument => format_expression(argument, 0, options));
    const arguments_string = argument_strings.join(", ");
    return `${left_hand_side}(${arguments_string})`;
}

export function format_expression_cast(expression: Core.Cast_expression, options: Options): string {
    const source = format_expression(expression.source, 0, options);
    const type = Type_utilities.get_type_name([expression.destination_type], options.module_name_and_imports_getter);
    return `${source} as ${type}`;
}

export function format_expression_comment(expression: Core.Comment_expression, indentation: number, options: Options): string {
    return decode_comment(expression.comment, indentation, options);
}

export function format_expression_compile_time(expression: Core.Compile_time_expression, options: Options): string {
    const right_hand_side = format_expression(expression.expression, 0, options);
    return `comptime ${right_hand_side}`;
}

export function format_expression_constant(expression: Core.Constant_expression, options: Options): string {
    const word = Parse_tree_convertor_mappings.constant_expression_to_word(expression);
    return word.value;
}

export function format_expression_constant_array(expression: Core.Constant_array_expression, options: Options): string {
    const elements = expression.array_data.map(element => format_expression(element.expression, 0, options));
    const array = `[${elements.join(", ")}]`;
    return array;
}

export function format_expression_continue(expression: Core.Continue_expression, options: Options): string {
    return "continue";
}

export function format_expression_defer(expression: Core.Defer_expression, options: Options): string {
    const right_hand_side = format_expression(expression.expression_to_defer, 0, options);
    return `defer ${right_hand_side}`;
}

export function format_expression_for_loop(expression: Core.For_loop_expression, outside_indentation: number, options: Options): string {
    const range_begin = format_expression(expression.range_begin, 0, options);
    const range_end = format_expression(expression.range_end.expression, 0, options);

    const step_by = expression.step_by !== undefined ? format_expression(expression.step_by, 0, options) : "";
    const step_by_string = step_by.length > 0 ? ` step_by ${step_by}` : "";

    const is_reverse = expression.range_comparison_operation === Core.Binary_operation.Greater_than;
    const reverse_string = is_reverse ? " reverse" : "";

    const for_head = `for ${expression.variable_name} in ${range_begin} to ${range_end}${step_by_string}${reverse_string}\n`;
    const block = format_expression_block_of_statements(expression.then_statements, outside_indentation, options);
    return `${for_head}${block}`;
}

export function format_expression_function(expression: Core.Function_expression, options: Options): string {
    const declaration = format_function_declaration(expression.declaration, options);
    const definition = format_function_definition(expression.definition, options);
    return `${declaration}${definition}`;
}

export function format_expression_if(expression: Core.If_expression, outside_indendation: number, options: Options): string {

    const outside_indentation_string = " ".repeat(outside_indendation);

    const series = expression.series.map((serie, index) => {
        const block = format_expression_block_of_statements(serie.then_statements, outside_indendation, options);
        if (serie.condition === undefined) {
            return `${outside_indentation_string}else\n${block}`;
        }

        const condition = format_expression(serie.condition.expression, 0, options);
        const keyword = index > 0 ? `${outside_indentation_string}else if` : "if";

        return `${keyword} ${condition}\n${block}`;
    });

    const series_string = series.join("");
    return series_string;
}

export function format_expression_instance_call(expression: Core.Instance_call_expression, options: Options): string {
    const left_hand_side = format_expression(expression.left_hand_side, 0, options);
    const argument_strings = expression.arguments.map(argument => format_expression(argument, 0, options));
    const arguments_string = argument_strings.join(", ");
    return `${left_hand_side}<${arguments_string}>`;
}

export function format_expression_instantiate(expression: Core.Instantiate_expression, outside_indentation: number, options: Options): string {

    const type_string = expression.type === Core.Instantiate_expression_type.Explicit ? "explicit " : "";

    if (expression.members.length === 0) {
        return `${type_string}{}`;
    }

    const members_strings: string[] = [];

    const inside_indentation = outside_indentation + 4;
    const inside_indentation_string = " ".repeat(inside_indentation);
    const outside_indentation_string = " ".repeat(outside_indentation);

    for (const member of expression.members) {
        const value_string = format_expression(member.value.expression, inside_indentation, options);
        members_strings.push(`${inside_indentation_string}${member.member_name}: ${value_string}`)
    }

    const members_string = members_strings.join(",\n");

    return `${type_string}{\n${members_string}\n${outside_indentation_string}}`;
}

export function format_expression_invalid(expression: Core.Invalid_expression, options: Options): string {
    return expression.value;
}

export function format_expression_null_pointer(expression: Core.Null_pointer_expression, options: Options): string {
    return "null";
}

export function format_expression_parenthesis(expression: Core.Parenthesis_expression, options: Options): string {
    const inside = format_expression(expression.expression, 0, options);
    return `(${inside})`;
}

export function format_expression_return(expression: Core.Return_expression, options: Options): string {
    const right_hand_side = format_expression(expression.expression, 0, options);
    return `return ${right_hand_side}`;
}

export function format_expression_struct(expression: Core.Struct_expression, options: Options): string {
    return format_struct_declaration(expression.declaration, options);
}

export function format_expression_switch(expression: Core.Switch_expression, outside_indendation: number, options: Options): string {
    const series = expression.cases.map(serie => {

        const block = serie.statements.map(statement => format_statement(statement, outside_indendation + 4, options));
        if (serie.case_value === undefined) {
            return `default:\n${block}`;
        }

        const case_value = format_expression(serie.case_value, 0, options);
        return `case ${case_value}:\n${block}`;
    });

    const series_string = series.join("\n");
    return series_string;
}

export function format_expression_ternary_condition(expression: Core.Ternary_condition_expression, options: Options): string {
    const condition = format_expression(expression.condition, 0, options);
    const then_string = format_expression(expression.then_statement.expression, 0, options);
    const else_string = format_expression(expression.else_statement.expression, 0, options);
    return `${condition} ? ${then_string} : ${else_string}`;
}

export function format_expression_type(expression: Core.Type_expression, options: Options): string {
    return Type_utilities.get_type_name([expression.type], options.module_name_and_imports_getter);
}

export function format_expression_unary(expression: Core.Unary_expression, options: Options): string {
    const right_hand_side = format_expression(expression.expression, 0, options);
    const symbol = Parse_tree_convertor_mappings.unary_operation_to_string(expression.operation);
    return `${symbol}${right_hand_side}`;
}

export function format_expression_union(expression: Core.Union_expression, options: Options): string {
    return format_union_declaration(expression.declaration, options);
}

export function format_expression_variable_declaration(expression: Core.Variable_declaration_expression, options: Options): string {
    const keyword = expression.is_mutable ? "mutable" : "var";
    const right_hand_side = format_expression(expression.right_hand_side, 0, options);
    return `${keyword} ${expression.name} = ${right_hand_side}`;
}

export function format_expression_variable_declaration_with_type(expression: Core.Variable_declaration_with_type_expression, indentation: number, options: Options): string {
    const keyword = expression.is_mutable ? "mutable" : "var";
    const type = Type_utilities.get_type_name([expression.type], options.module_name_and_imports_getter);
    const right_hand_side = format_expression(expression.right_hand_side.expression, indentation, options);
    return `${keyword} ${expression.name}: ${type} = ${right_hand_side}`;
}

export function format_expression_variable(expression: Core.Variable_expression, options: Options): string {
    return `${expression.name}`;
}

export function format_expression_while_loop(expression: Core.While_loop_expression, outside_indentation: number, options: Options): string {
    const condition = format_expression(expression.condition.expression, 0, options);
    const block = format_expression_block_of_statements(expression.then_statements, outside_indentation, options);
    return `while ${condition}\n${block}`;
}

function find_newlines_outside_strings(code: string): number[] {
    const result: number[] = [];
    let in_string = false;
    let escaped = false;

    for (let i = 0; i < code.length; i++) {
        const char = code[i];

        if (char === '"' && !escaped) {
            in_string = !in_string;
        }
        if (char === '\\' && in_string) {
            escaped = !escaped;
        } else {
            escaped = false;
        }
        if (char === '\n' && !in_string) {
            result.push(i);
        }
    }

    return result;
}

export function format_expression_block_of_statements(statements: Core.Statement[], outside_indentation: number, options: Options): string {
    const inside_indentation = outside_indentation + 4;
    const outside_indentation_string = " ".repeat(outside_indentation);

    const statement_strings = statements.map(statement => format_statement(statement, inside_indentation, options));

    for (let index = 1; index < statement_strings.length; ++index) {
        const previous_statement = statements[index - 1];
        const current_statement = statements[index];

        if (previous_statement.expression.source_position !== undefined && current_statement.expression.source_position !== undefined) {
            const difference = current_statement.expression.source_position.line - previous_statement.expression.source_position.line;
            const new_lines_in_previous_statement = find_newlines_outside_strings(statement_strings[index - 1]);
            const new_lines_to_add = difference - new_lines_in_previous_statement.length;
            if (new_lines_to_add > 0) {
                statement_strings[index - 1] = statement_strings[index - 1] + "\n".repeat(new_lines_to_add);
            }
        }
        else {
            statement_strings[index - 1] = statement_strings[index - 1] + "\n";
        }
    }

    const statements_string = statement_strings.join("");
    const final_new_line = statements_string.length > 0 && statements_string[statements_string.length - 1] !== "\n" ? "\n" : "";

    return `${outside_indentation_string}{\n${statements_string}${final_new_line}${outside_indentation_string}}\n`;
}

export function decode_comment(value: string, indentation: number, options: Options): string {
    const lines = value.split("\n");
    const comment = lines.map(line => `// ${line}`).join("\n" + " ".repeat(indentation));
    return comment;
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
