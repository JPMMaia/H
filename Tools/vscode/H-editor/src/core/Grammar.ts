export enum Word_type {
    Alphanumeric,
    Number,
    String,
    Symbol,
    Invalid
}

export enum Token {
    Identifier,
    Invalid,
    Keyword,
    Number,
    Operator,
    String
}

export interface Grammar {
}

export function create_grammar(keywords: string[], operators: string[]): Grammar {
    return {
    };
}

export function create_default_grammar(): Grammar {

    const keywords = [
        "defer",
        "for",
        "function",
        "if",
        "mutable",
        "return",
        "switch",
        "var",
        "while"
    ];

    const operators = [
        "&",
        "&=",
        "|",
        "|=",
        "^",
        "^=",
        "~",
        "&&",
        "||",
        "=",
        "+",
        "++",
        "+=",
        "-",
        "-=",
        "--",
        "*",
        "*=",
        "/",
        "/=",
        "%",
        "%=",
        "!",
        "==",
        "!=",
        "<",
        "<=",
        ">",
        ">=",
        "?",
        ".",
        ',',
        ';',
        "\"",
        "\'",
        '(',
        ')',
        '{',
        '}',
        '[',
        ']',
    ];

    return create_grammar(keywords, operators);
}
