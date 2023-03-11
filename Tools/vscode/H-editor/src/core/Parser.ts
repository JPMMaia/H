import { onThrowError } from "../utilities/errors";
import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Grammar from "./Grammar";
import * as Scanner from "./Scanner";

export interface Parse_result {
    node: Abstract_syntax_tree.Node;
    processed_words: number;
}

function parse_variable_declaration_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const variable_declaration_token = Abstract_syntax_tree.Token.Expression_variable_declaration;

    const variable_keyword_word = words[start_offset];

    if (variable_keyword_word === undefined || variable_keyword_word.value !== "var") {
        return {
            node: create_list_node(variable_declaration_token, []),
            processed_words: 0
        };
    }

    const variable_keyword_node: Abstract_syntax_tree.Node = {
        value: variable_keyword_word.value,
        token: Abstract_syntax_tree.Token.Expression_variable_declaration_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const name_word = words[start_offset + 1];

    if (name_word === undefined || name_word.type !== Grammar.Word_type.Alphanumeric) {
        return {
            node: create_list_node(variable_declaration_token, [variable_keyword_node]),
            processed_words: 1
        };
    }

    const name_node: Abstract_syntax_tree.Node = {
        value: name_word.value,
        token: Abstract_syntax_tree.Token.Expression_variable_declaration_name,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const assigment_operator_word = words[start_offset + 2];

    if (assigment_operator_word === undefined || assigment_operator_word.value !== "=") {
        return {
            node: create_list_node(variable_declaration_token, [variable_keyword_node, name_node]),
            processed_words: 2
        };
    }

    const assignment_operator_node: Abstract_syntax_tree.Node = {
        value: assigment_operator_word.value,
        token: Abstract_syntax_tree.Token.Expression_variable_declaration_assignment,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const expression_parse_result = parse_expression(words, start_offset + 3, words.length, grammar);

    if (expression_parse_result.processed_words === 0) {
        return {
            node: create_list_node(variable_declaration_token, [variable_keyword_node, name_node, assignment_operator_node]),
            processed_words: 3
        };
    }

    const variable_declaration_node = create_list_node(variable_declaration_token, [variable_keyword_node, name_node, assignment_operator_node, expression_parse_result.node]);

    return {
        node: variable_declaration_node,
        processed_words: 3 + expression_parse_result.processed_words
    };
}

function parse_return_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const return_keyword_value = words[start_offset].value;

    const expression_parse_result = parse_expression(words, start_offset + 1, words.length, grammar);

    const return_keyword_node: Abstract_syntax_tree.Node = {
        value: return_keyword_value,
        token: Abstract_syntax_tree.Token.Expression_return_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const return_expression_node: Abstract_syntax_tree.Node = {
        value: "",
        token: Abstract_syntax_tree.Token.Expression_return,
        children: [
            return_keyword_node,
            expression_parse_result.node
        ],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: return_expression_node,
        processed_words: 1 + expression_parse_result.processed_words
    };
}

function parse_defer_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const defer_keyword_value = words[start_offset].value;

    const expression_parse_result = parse_expression(words, start_offset + 1, words.length, grammar);

    const defer_keyword_node: Abstract_syntax_tree.Node = {
        value: defer_keyword_value,
        token: Abstract_syntax_tree.Token.Expression_defer_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const defer_expression_node: Abstract_syntax_tree.Node = {
        value: "",
        token: Abstract_syntax_tree.Token.Expression_defer,
        children: [
            defer_keyword_node,
            expression_parse_result.node
        ],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: defer_expression_node,
        processed_words: 1 + expression_parse_result.processed_words
    };
}

function is_constant_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): boolean {
    const word = words[start_offset];
    return word !== undefined && word.type === Grammar.Word_type.Number;
}

function parse_constant_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const constant_value = words[start_offset].value;

    const constant_expression_node: Abstract_syntax_tree.Node = {
        value: constant_value,
        token: Abstract_syntax_tree.Token.Expression_constant,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: constant_expression_node,
        processed_words: 1
    };
}

function find_operand(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): number {
    if (is_constant_expression(words, start_offset, grammar)) {
        return 1;
    }
    else if (is_variable_reference_expression(words, start_offset, grammar)) {
        return 1;
    }
    // TODO check for parenthesis or call expression
    else {
        return 0;
    }
}

function is_binary_operation_expression(words: Scanner.Scanned_word[], start_offset: number, end_offset: number, grammar: Grammar.Grammar): boolean {

    const left_operand_processed_words = find_operand(words, start_offset, grammar);
    if (left_operand_processed_words === 0 || (start_offset + left_operand_processed_words) >= end_offset) {
        return false;
    }

    const operator_word = words[start_offset + left_operand_processed_words];
    if (!grammar.is_binary_operator(operator_word.value) || (start_offset + left_operand_processed_words + 1) >= end_offset) {
        return false;
    }

    const right_operand_processed_words = find_operand(words, start_offset + left_operand_processed_words + 1, grammar);
    if (right_operand_processed_words === 0) {
        return false;
    }

    return true;
}

function parse_binary_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const left_operand_start = start_offset;
    const left_operand_processed_words = find_operand(words, left_operand_start, grammar);
    const left_operand_expression = parse_expression(words, left_operand_start, left_operand_start + left_operand_processed_words, grammar);

    const operator_start = start_offset + left_operand_processed_words;
    const operator_word = words[operator_start];

    const right_operand_start = start_offset + left_operand_expression.processed_words + 1;
    const right_operand_processed_words = find_operand(words, right_operand_start, grammar);
    const right_operand_expression = parse_expression(words, right_operand_start, right_operand_start + right_operand_processed_words, grammar);

    const binary_operation_keyword_node: Abstract_syntax_tree.Node = {
        value: operator_word.value,
        token: Abstract_syntax_tree.Token.Expression_binary_operation_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const binary_operation_expression_node: Abstract_syntax_tree.Node = {
        value: "",
        token: Abstract_syntax_tree.Token.Expression_binary_operation,
        children: [
            left_operand_expression.node,
            binary_operation_keyword_node,
            right_operand_expression.node
        ],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: binary_operation_expression_node,
        processed_words: left_operand_expression.processed_words + right_operand_expression.processed_words + 1
    };
}

function is_variable_reference_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): boolean {
    const word = words[start_offset];
    return word !== undefined && word.type === Grammar.Word_type.Alphanumeric;
}

function parse_variable_reference_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const variable_reference = words[start_offset].value;

    const variable_reference_expression_node: Abstract_syntax_tree.Node = {
        value: variable_reference,
        token: Abstract_syntax_tree.Token.Expression_variable_reference,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: variable_reference_expression_node,
        processed_words: 1
    };
}

function parse_expression(words: Scanner.Scanned_word[], start_offset: number, end_offset: number, grammar: Grammar.Grammar): Parse_result {

    if (is_binary_operation_expression(words, start_offset, end_offset, grammar)) {
        const parse_result = parse_binary_expression(words, start_offset, grammar);
        return {
            node: parse_result.node,
            processed_words: parse_result.processed_words
        };
    }
    else if (is_constant_expression(words, start_offset, grammar)) {
        const parse_result = parse_constant_expression(words, start_offset, grammar);
        return {
            node: parse_result.node,
            processed_words: parse_result.processed_words
        };
    }
    else if (is_variable_reference_expression(words, start_offset, grammar)) {
        const parse_result = parse_variable_reference_expression(words, start_offset, grammar);
        return {
            node: parse_result.node,
            processed_words: parse_result.processed_words
        };
    }
    else if (start_offset >= words.length) {
        return {
            node: create_list_node(Abstract_syntax_tree.Token.Expression_empty, []),
            processed_words: 0
        };
    }
    else {
        const message = "Not implemented!";
        onThrowError(message);
        throw Error(message);
    }
}

function parse_statement_body(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const first_word = words[start_offset];

    if (first_word === undefined) {
        return {
            node: create_list_node(Abstract_syntax_tree.Token.Expression_empty, []),
            processed_words: 0
        };
    }

    if (first_word.value === "var") {
        return parse_variable_declaration_expression(words, start_offset, grammar);
    }
    else if (first_word.value === "return") {
        return parse_return_expression(words, start_offset, grammar);
    }
    else if (first_word.value === "defer") {
        return parse_defer_expression(words, start_offset, grammar);
    }
    else {
        return parse_expression(words, start_offset, words.length, grammar);
    }
}

export function parse_statement(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const statement_token = Abstract_syntax_tree.Token.Statement;

    const first_word = words[start_offset];

    if (first_word !== undefined && first_word.value === ";") {
        const semicolon = {
            value: ";",
            token: Abstract_syntax_tree.Token.Statement_end,
            children: [],
            cache: {
                relative_start: 0
            }
        };

        const statement_node: Abstract_syntax_tree.Node = {
            value: "",
            token: Abstract_syntax_tree.Token.Statement,
            children: [
                semicolon
            ],
            cache: {
                relative_start: 0
            }
        };

        return {
            node: statement_node,
            processed_words: 1
        };
    }

    const statement_body_parse_result = parse_statement_body(words, start_offset, grammar);

    if (statement_body_parse_result.processed_words === 0) {
        return {
            node: create_list_node(statement_token, []),
            processed_words: 0
        };
    }

    const semicolon_offset = start_offset + statement_body_parse_result.processed_words;
    const semicolon_word = words[semicolon_offset];

    if (semicolon_word === undefined || semicolon_word.value !== ";") {
        return {
            node: create_list_node(statement_token, [statement_body_parse_result.node]),
            processed_words: statement_body_parse_result.processed_words
        };
    }

    const semicolon_node: Abstract_syntax_tree.Node = {
        value: semicolon_word.value,
        token: Abstract_syntax_tree.Token.Statement_end,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const statement_node = create_list_node(statement_token, [statement_body_parse_result.node, semicolon_node]);

    return {
        node: statement_node,
        processed_words: statement_body_parse_result.processed_words + 1
    };
}

export function parse_code_block(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const code_block_token = Abstract_syntax_tree.Token.Code_block;
    const open_code_block_keyword = "{";
    const close_code_block_keyword = "}";

    const first_word = words[start_offset];

    if (first_word === undefined || first_word.value !== open_code_block_keyword) {
        return {
            node: create_list_node(code_block_token, []),
            processed_words: 0
        };
    }

    const open_block_node: Abstract_syntax_tree.Node = {
        value: open_code_block_keyword,
        token: Abstract_syntax_tree.Token.Code_block_open_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const statement_nodes: Abstract_syntax_tree.Node[] = [];

    let current_offset = start_offset + 1;

    while (current_offset < words.length && words[current_offset].value !== close_code_block_keyword) {
        const result = parse_statement(words, current_offset, grammar);
        statement_nodes.push(result.node);

        current_offset += result.processed_words;
    }

    const close_word = words[current_offset];

    if (close_word === undefined || close_word.value !== close_code_block_keyword) {
        return {
            node: create_list_node(code_block_token, [open_block_node, ...statement_nodes]),
            processed_words: (current_offset - start_offset)
        };
    }

    const close_block_node: Abstract_syntax_tree.Node = {
        value: close_code_block_keyword,
        token: Abstract_syntax_tree.Token.Code_block_close_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const code_block_node = create_list_node(code_block_token, [open_block_node, ...statement_nodes, close_block_node]);

    return {
        node: code_block_node,
        processed_words: (current_offset - start_offset) + 1
    };
}

export function parse_function_parameter(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const function_parameter_token = Abstract_syntax_tree.Token.Function_parameter;

    const name_word = words[start_offset];

    if (name_word === undefined) {
        return {
            node: create_list_node(Abstract_syntax_tree.Token.Function_parameter, []),
            processed_words: 0
        };
    }

    const name_node: Abstract_syntax_tree.Node = {
        value: name_word.value,
        token: Abstract_syntax_tree.Token.Function_parameter_name,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const separator_word = words[start_offset + 1];

    if (separator_word === undefined) {
        return {
            node: create_list_node(function_parameter_token, [name_node]),
            processed_words: 1
        };
    }

    const separator_node: Abstract_syntax_tree.Node = {
        value: separator_word.value,
        token: Abstract_syntax_tree.Token.Function_parameter_separator,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const type_word = words[start_offset + 2];

    if (type_word === undefined) {
        return {
            node: create_list_node(function_parameter_token, [name_node, separator_node]),
            processed_words: 2
        };
    }

    const type_node: Abstract_syntax_tree.Node = {
        value: type_word.value,
        token: Abstract_syntax_tree.Token.Function_parameter_type,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: create_list_node(function_parameter_token, [name_node, separator_node, type_node]),
        processed_words: 3
    };
}

export function parse_function_declaration_parameters(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar, is_input_parameters: boolean): Parse_result {

    const function_parameter_token = is_input_parameters ? Abstract_syntax_tree.Token.Function_declaration_input_parameters : Abstract_syntax_tree.Token.Function_declaration_output_parameters;

    const open_keyword = "(";
    const close_keyword = ")";
    const separator_keyword = ",";

    const open_parameter_word = words[start_offset];

    if (open_parameter_word === undefined || open_parameter_word.value !== open_keyword) {
        return {
            node: create_list_node(function_parameter_token, []),
            processed_words: 0
        };
    }

    const open_parameters_node: Abstract_syntax_tree.Node = {
        value: open_parameter_word.value,
        token: Abstract_syntax_tree.Token.Function_parameters_open_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const parameter_nodes: Abstract_syntax_tree.Node[] = [];

    let current_offset = start_offset + 1;

    while (current_offset < words.length && words[current_offset].value !== close_keyword) {
        const result = parse_function_parameter(words, current_offset, grammar);
        parameter_nodes.push(result.node);

        current_offset += result.processed_words;

        if (current_offset < words.length && words[current_offset].value === separator_keyword) {
            const separator_node: Abstract_syntax_tree.Node = {
                value: words[current_offset].value,
                token: Abstract_syntax_tree.Token.Function_parameters_separator,
                children: [],
                cache: {
                    relative_start: 0
                }
            };

            parameter_nodes.push(separator_node);

            current_offset += 1;
        }
    }

    const close_parameter_word = words[current_offset];

    if (close_parameter_word === undefined || close_parameter_word.value !== close_keyword) {
        return {
            node: create_list_node(function_parameter_token, [open_parameters_node, ...parameter_nodes]),
            processed_words: (current_offset - start_offset)
        };
    }

    const close_parameters_node: Abstract_syntax_tree.Node = {
        value: words[current_offset].value,
        token: Abstract_syntax_tree.Token.Function_parameters_close_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const function_parameters_node: Abstract_syntax_tree.Node = {
        value: "",
        token: is_input_parameters ? Abstract_syntax_tree.Token.Function_declaration_input_parameters : Abstract_syntax_tree.Token.Function_declaration_output_parameters,
        children: [
            open_parameters_node,
            ...parameter_nodes,
            close_parameters_node
        ],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: function_parameters_node,
        processed_words: (current_offset - start_offset) + 1
    };
}

function create_list_node(token: Abstract_syntax_tree.Token, children: Abstract_syntax_tree.Node[]): Abstract_syntax_tree.Node {
    const node: Abstract_syntax_tree.Node = {
        value: "",
        token: token,
        children: children,
        cache: {
            relative_start: 0
        }
    };

    return node;
}

export function parse_function_declaration(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const function_declaration_token = Abstract_syntax_tree.Token.Function_declaration;

    const function_declaration_keyword = "function";
    const separator_keyword = "->";

    const first_word = words[start_offset].value;

    if (first_word !== function_declaration_keyword) {
        const message = "parse_function_declaration expects 'function' as first word!";
        onThrowError(message);
        throw Error(message);
    }

    const function_keyword_node: Abstract_syntax_tree.Node = {
        value: first_word,
        token: Abstract_syntax_tree.Token.Function_declaration_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const function_name_word = words[start_offset + 1];
    if (function_name_word === undefined) {
        return {
            node: create_list_node(function_declaration_token, [function_keyword_node]),
            processed_words: 1
        };
    }

    const function_name_node: Abstract_syntax_tree.Node = {
        value: function_name_word.value,
        token: Abstract_syntax_tree.Token.Function_declaration_name,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const input_parameters_start_offset = start_offset + 2;
    const input_parameters_parse_result = parse_function_declaration_parameters(words, input_parameters_start_offset, grammar, true);

    if (input_parameters_parse_result.processed_words === 0) {
        return {
            node: create_list_node(function_declaration_token, [function_keyword_node, function_name_node]),
            processed_words: 2
        };
    }

    const parameters_separator_offset = input_parameters_start_offset + input_parameters_parse_result.processed_words;
    const parameters_separator_word = words[parameters_separator_offset];

    if (parameters_separator_word === undefined || parameters_separator_word.value !== separator_keyword) {
        return {
            node: create_list_node(function_declaration_token, [function_keyword_node, function_name_node, input_parameters_parse_result.node]),
            processed_words: 2 + input_parameters_parse_result.processed_words
        };
    }

    const parameters_separator_node: Abstract_syntax_tree.Node = {
        value: parameters_separator_word.value,
        token: Abstract_syntax_tree.Token.Function_declaration_parameters_separator,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const output_parameters_start_offset = parameters_separator_offset + 1;
    const output_parameters_parse_result = parse_function_declaration_parameters(words, output_parameters_start_offset, grammar, false);

    if (output_parameters_parse_result.processed_words === 0) {
        return {
            node: create_list_node(function_declaration_token, [function_keyword_node, function_name_node, input_parameters_parse_result.node, parameters_separator_node]),
            processed_words: 2 + input_parameters_parse_result.processed_words + 1
        };
    }

    const function_declaration_node: Abstract_syntax_tree.Node = {
        value: "",
        token: Abstract_syntax_tree.Token.Function_declaration,
        children: [
            function_keyword_node,
            function_name_node,
            input_parameters_parse_result.node,
            parameters_separator_node,
            output_parameters_parse_result.node
        ],
        cache: {
            relative_start: 0
        }
    };

    const current_offset = output_parameters_start_offset + output_parameters_parse_result.processed_words;

    return {
        node: function_declaration_node,
        processed_words: (current_offset - start_offset)
    };
}

function count_next_function_words(words: Scanner.Scanned_word[]): number {

    const total_words = 9;

    for (let index = 1; index < total_words; ++index) {

        if (index >= words.length) {
            return index;
        }

        const word = words[index];
        if (word.value === "enum" || word.value === "function" || word.value === "struct" || word.value === "using") {
            return index;
        }
    }

    return total_words;
}

export function parse_function(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const function_token = Abstract_syntax_tree.Token.Function;

    const function_declaration_keyword = "function";

    const first_word = words[start_offset];

    if (first_word === undefined || first_word.value !== function_declaration_keyword) {
        const message = "parse_function_declaration expects 'function' as first word!";
        onThrowError(message);
        throw Error(message);
    }

    let current_offset = start_offset;

    const declaration_parse_result = parse_function_declaration(words, current_offset, grammar);
    current_offset += declaration_parse_result.processed_words;

    const definition_parse_result = parse_code_block(words, current_offset, grammar);
    current_offset += definition_parse_result.processed_words;

    if (definition_parse_result.processed_words === 0) {
        return {
            node: create_list_node(function_token, [declaration_parse_result.node]),
            processed_words: declaration_parse_result.processed_words
        };
    }

    const function_node = create_list_node(function_token, [declaration_parse_result.node, definition_parse_result.node]);

    return {
        node: function_node,
        processed_words: (current_offset - start_offset)
    };
}

export function parse_invalid(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const invalid_node: Abstract_syntax_tree.Node = {
        value: words[start_offset].value,
        token: Abstract_syntax_tree.Token.Invalid,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: invalid_node,
        processed_words: 1
    };
}

export function parse_n_invalid(words: Scanner.Scanned_word[], start_offset: number, count: number, grammar: Grammar.Grammar): Abstract_syntax_tree.Node[] {

    const nodes: Abstract_syntax_tree.Node[] = [];

    for (let index = 0; index < count; ++index) {
        const offset = start_offset + index;

        const invalid_node: Abstract_syntax_tree.Node = {
            value: words[offset].value,
            token: Abstract_syntax_tree.Token.Invalid,
            children: [],
            cache: {
                relative_start: 0
            }
        };

        nodes.push(invalid_node);
    }

    return nodes;
}

export function parse_module_body(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const content_nodes: Abstract_syntax_tree.Node[] = [];

    let current_offset = start_offset;

    while (current_offset < words.length) {

        const word = words[current_offset];

        if (word.value === "function") {
            const result = parse_function(words, current_offset, grammar);
            content_nodes.push(result.node);

            current_offset += result.processed_words;
        }
        // TODO
        else {
            const result = parse_invalid(words, current_offset, grammar);
            content_nodes.push(result.node);

            current_offset += result.processed_words;
        }
    }

    const body_node: Abstract_syntax_tree.Node = {
        value: "",
        token: Abstract_syntax_tree.Token.Module_body,
        children: [
            ...content_nodes
        ],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: body_node,
        processed_words: (current_offset - start_offset)
    };
}

export function parse_module_head(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const head_nodes: Abstract_syntax_tree.Node[] = [];

    let current_offset = start_offset;

    while (current_offset < words.length) {

        const word = words[current_offset];

        if (word.value === "module") {
            // TODO
            current_offset += 1;
        }
        else if (word.value === "import") {
            // TODO
            current_offset += 1;
        }
        else if (word.value === "enum" || word.value === "function" || word.value === "struct" || word.value === "using") {
            break;
        }
        else {
            const result = parse_invalid(words, current_offset, grammar);
            head_nodes.push(result.node);

            current_offset += result.processed_words;
        }
    }

    const module_head: Abstract_syntax_tree.Node = {
        value: "",
        token: Abstract_syntax_tree.Token.Module_head,
        children: [
            ...head_nodes
        ],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: module_head,
        processed_words: (current_offset - start_offset)
    };
}

export function parse_module(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    let current_offset = start_offset;

    const head_result = parse_module_head(words, start_offset, grammar);
    current_offset += head_result.processed_words;

    const body_result = parse_module_body(words, current_offset, grammar);
    current_offset += body_result.processed_words;

    const module_head = head_result.node;
    const module_body = body_result.node;

    const module_node: Abstract_syntax_tree.Node = {
        value: "",
        token: Abstract_syntax_tree.Token.Module,
        children: [
            module_head,
            module_body
        ],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: module_node,
        processed_words: (current_offset - start_offset)
    };
}

export function parse(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar, token: Abstract_syntax_tree.Token): Parse_result {

    if (token === Abstract_syntax_tree.Token.Module) {
        return parse_module(words, start_offset, grammar);
    }
    else if (token === Abstract_syntax_tree.Token.Module_head) {
        return parse_module_head(words, start_offset, grammar);
    }
    else if (token === Abstract_syntax_tree.Token.Module_body) {
        return parse_module_body(words, start_offset, grammar);
    }
    else if (token === Abstract_syntax_tree.Token.Function) {
        return parse_function(words, start_offset, grammar);
    }
    else if (token === Abstract_syntax_tree.Token.Statement) {
        return parse_statement(words, start_offset, grammar);
    }
    else {
        const message = "Not implemented!";
        onThrowError(message);
        throw Error(message);
    }
}
