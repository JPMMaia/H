import { onThrowError } from "../utilities/errors";
import * as Abstract_syntax_tree from "./Abstract_syntax_tree";
import * as Grammar from "./Grammar";
import * as Scanner from "./Scanner";

export interface Parse_result {
    node: Abstract_syntax_tree.Node;
    processed_words: number;
}

function parse_variable_declaration_expression(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const variable_keyword_value = words[start_offset].value;
    const name_value = words[start_offset + 1].value;
    const assigment_operator_value = words[start_offset + 2].value;

    const expression_parse_result = parse_expression(words, start_offset + 3, words.length, grammar);

    const variable_keyword_node: Abstract_syntax_tree.Node = {
        value: variable_keyword_value,
        token: Abstract_syntax_tree.Token.Expression_variable_declaration_keyword,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const name_node: Abstract_syntax_tree.Node = {
        value: name_value,
        token: Abstract_syntax_tree.Token.Expression_variable_declaration_name,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const assignment_operator_node: Abstract_syntax_tree.Node = {
        value: assigment_operator_value,
        token: Abstract_syntax_tree.Token.Expression_variable_declaration_assignment,
        children: [],
        cache: {
            relative_start: 0
        }
    };

    const variable_declaration_node: Abstract_syntax_tree.Node = {
        value: "",
        token: Abstract_syntax_tree.Token.Expression_variable_declaration,
        children: [
            variable_keyword_node,
            name_node,
            assignment_operator_node,
            expression_parse_result.node
        ],
        cache: {
            relative_start: 0
        }
    };

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
    return word.type === Grammar.Word_type.Number;
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
    // TODO check for parenthesis, call expression or variable expression
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
    if (right_operand_processed_words === 0 || (start_offset + left_operand_processed_words + 1 + right_operand_processed_words) >= end_offset) {
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
    else {
        const message = "Not implemented!";
        onThrowError(message);
        throw Error(message);
    }
}

function parse_statement_body(words: Scanner.Scanned_word[], start_offset: number, grammar: Grammar.Grammar): Parse_result {

    const first_word = words[start_offset];

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

    if (words[start_offset].value === ";") {
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

    const semicolon_offset = start_offset + statement_body_parse_result.processed_words;
    const semicolon_value = words[semicolon_offset].value;

    const semicolon_node: Abstract_syntax_tree.Node = {
        value: semicolon_value,
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
            statement_body_parse_result.node,
            semicolon_node
        ],
        cache: {
            relative_start: 0
        }
    };

    return {
        node: statement_node,
        processed_words: statement_body_parse_result.processed_words + 1
    };
}
