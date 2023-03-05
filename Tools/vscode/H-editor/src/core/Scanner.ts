import { onThrowError } from "../utilities/errors";
import * as Grammar from "./Grammar";

export function is_whitespace_or_new_line(character: string): boolean {
    return character === " " || character === "\n" || character === "\t";
}

function ignore_whitespace_or_new_lines(code: string, current_offset: number): number {

    for (let index = current_offset; index < code.length; ++index) {
        const character = code[index];
        if (!is_whitespace_or_new_line(character)) {
            return index - current_offset;
        }
    }

    return code.length - current_offset;
}

function is_number(character: string): boolean {
    return character >= '0' && character <= '9';
}

function is_letter(character: string): boolean {
    return (character >= 'A' && character <= 'Z') || (character >= 'a' && character <= 'z') || (character === '_');
}

function is_alphanumeric(character: string): boolean {
    return is_number(character) || is_letter(character);
}

function is_parenthesis(character: string): boolean {
    switch (character) {
        case '(':
        case ')':
        case '{':
        case '}':
        case '[':
        case ']':
            return true;
        default:
            return false;
    }
}

function is_symbol(character: string): boolean {
    switch (character) {
        case '"':
        case '\'':
        case '&':
        case '|':
        case '^':
        case '~':
        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
        case '=':
        case '!':
        case '<':
        case '>':
        case '.':
        case ',':
        case ';':
            return true;
        default:
            return false;
    }
}

function is_quote(character: string): boolean {
    return character === "\"";
}

function scan_number(code: string, start_offset: number): { word: string, type: Grammar.Word_type, processed_characters: number } {

    let current_offset = start_offset;

    let dot_count = 0;

    while (current_offset < code.length) {

        const character = code[current_offset];

        if (!is_number(character)) {
            if (character === ".") {
                dot_count += 1;
            }
            else {
                break;
            }
        }

        current_offset += 1;
    }

    return {
        word: code.substring(start_offset, current_offset),
        type: dot_count <= 1 ? Grammar.Word_type.Number : Grammar.Word_type.Invalid,
        processed_characters: current_offset - start_offset
    };
}

function scan_alphanumeric(code: string, start_offset: number): { word: string, processed_characters: number } {

    let current_offset = start_offset;

    while (current_offset < code.length) {

        const character = code[current_offset];

        if (!is_alphanumeric(character)) {
            break;
        }

        current_offset += 1;
    }

    return {
        word: code.substring(start_offset, current_offset),
        processed_characters: current_offset - start_offset
    };
}

function scan_parenthesis(code: string, start_offset: number): { word: string, processed_characters: number } {
    return {
        word: code.substring(start_offset, start_offset + 1),
        processed_characters: 1
    };
}

function scan_symbol(code: string, start_offset: number): { word: string, processed_characters: number } {

    let current_offset = start_offset;

    while (current_offset < code.length) {

        const character = code[current_offset];

        if (!is_symbol(character)) {
            break;
        }

        current_offset += 1;
    }

    return {
        word: code.substring(start_offset, current_offset),
        processed_characters: current_offset - start_offset
    };
}

function scan_string(code: string, start_offset: number): { word: string, processed_characters: number } {

    let current_offset = start_offset;

    const quote = code[current_offset];
    current_offset += 1;

    while (current_offset < code.length) {

        const character = code[current_offset];
        current_offset += 1;

        if (character === quote && (code[current_offset - 2] !== "\\")) {
            break;
        }
    }

    return {
        word: code.substring(start_offset + 1, current_offset - 1),
        processed_characters: current_offset - start_offset
    };
}

function scan_word(code: string, current_offset: number): { word: string, type: Grammar.Word_type, processed_characters: number } {

    const ignored_characters = ignore_whitespace_or_new_lines(code, current_offset);
    current_offset += ignored_characters;

    const first_character = code[current_offset];

    // If it starts by a number, it can only be a number
    if (is_number(first_character)) {
        const scan_result = scan_number(code, current_offset);
        return {
            word: scan_result.word,
            type: scan_result.type,
            processed_characters: ignored_characters + scan_result.processed_characters
        };
    }
    // If it starts by a letter, it can be alphanumeric
    else if (is_letter(first_character)) {
        const scan_result = scan_alphanumeric(code, current_offset);
        return {
            word: scan_result.word,
            type: Grammar.Word_type.Alphanumeric,
            processed_characters: ignored_characters + scan_result.processed_characters
        };
    }
    // If it starts by a quote, then it can have anything and then end as a quote
    else if (is_quote(first_character)) {
        const scan_result = scan_string(code, current_offset);
        return {
            word: scan_result.word,
            type: Grammar.Word_type.String,
            processed_characters: ignored_characters + scan_result.processed_characters
        };
    }
    // If it starts by parenthesis, then it only read one character at a time
    else if (is_parenthesis(first_character)) {
        const scan_result = scan_parenthesis(code, current_offset);
        return {
            word: scan_result.word,
            type: Grammar.Word_type.Symbol,
            processed_characters: ignored_characters + scan_result.processed_characters
        };
    }
    // If it starts by a symbol, then it can be only symbols
    else if (is_symbol(first_character)) {
        const scan_result = scan_symbol(code, current_offset);
        return {
            word: scan_result.word,
            type: Grammar.Word_type.Symbol,
            processed_characters: ignored_characters + scan_result.processed_characters
        };
    }
    // Unrecognized token
    else {
        return {
            word: code.substring(current_offset, current_offset + 1),
            type: Grammar.Word_type.Invalid,
            processed_characters: ignored_characters + 1
        };
    }
}

export interface Scanned_word {
    value: string;
    type: Grammar.Word_type;
}

export function scan(code: string, start_offset: number, end_offset: number): Scanned_word[] {

    const scanned_words: Scanned_word[] = [];

    let current_offset = start_offset;

    while (current_offset < end_offset) {
        const word_scan_result = scan_word(code, current_offset);

        if (word_scan_result.word.length > 0) {
            scanned_words.push({ value: word_scan_result.word, type: word_scan_result.type });
        }

        current_offset += word_scan_result.processed_characters;
    }

    return scanned_words;
}

export function is_same_word(current_character: string, next_character: string): boolean {
    if (is_whitespace_or_new_line(current_character) || is_whitespace_or_new_line(next_character)) {
        return false;
    }
    if (is_alphanumeric(current_character) && is_alphanumeric(next_character)) {
        return true;
    }
    if (is_symbol(current_character) && is_symbol(next_character)) {
        return true;
    }
    if (is_symbol(current_character) && !is_symbol(next_character)) {
        return false;
    }
    if (!is_symbol(current_character) && is_symbol(next_character)) {
        return false;
    }

    const message = "is_same_word: case not handled!";
    onThrowError(message);
    throw Error(message);
}

export function count_words(text: string, start_offset: number, end_offset: number): number {
    const scanned_words = scan(text, start_offset, end_offset);
    return scanned_words.length;
}

export function get_next_word_range(text: string, offset: number): { start: number, end: number } {

    const word_scan_result = scan_word(text, offset);

    const end = offset + word_scan_result.processed_characters;
    const start = end - word_scan_result.word.length;

    return {
        start: start,
        end: end
    };
}
