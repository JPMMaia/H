import { Uri, Webview } from "vscode";

export interface FindResult {
  openIndex: number,
  closeIndex: number
}

export function getObjectAtPosition(object: any, position: any[]): any {

  if (position.length === 0) {
    return object;
  }

  const firstKey = position[0];
  const child = object[firstKey];

  const remainderKeys = position.slice(1, position.length);

  return getObjectAtPosition(child, remainderKeys);
}

export function fromPositionToOffset(text: string, position: any[]): number {
  return 0;
}

export function fromOffsetToPosition(text: string, offset: number): any[] {
  return [];
}

// TODO JSON position to offset
// TODO offset to JSON position

export function findEnd(text: string, start: number): number {
  let index = start;

  let stack: string[] = [];

  while (index < text.length) {

    const current_character = text[index];

    if (stack.length === 0) {
      if (current_character === '{' || current_character === '[' || current_character === '"') {
        stack.push(current_character);
        ++index;
        continue;
      }
    }

    const last_symbol = stack[stack.length - 1];
    if (last_symbol === '{') {
      if (current_character === '{' || current_character === '[' || current_character === '"') {
        stack.push(current_character);
      }
      else if (current_character === '}') {
        stack.pop();

        if (stack.length === 0) {
          return index + 1;
        }
      }
    }
    else if (last_symbol === '[') {
      if (current_character === '{' || current_character === '[' || current_character === '"') {
        stack.push(current_character);
      }
      else if (current_character === ']') {
        stack.pop();

        if (stack.length === 0) {
          return index + 1;
        }
      }
    }
    else if (last_symbol === '"') {
      const previous_character = text[index - 1];
      if (previous_character !== '\\' && current_character === '"') {
        stack.pop();

        if (stack.length === 0) {
          return index + 1;
        }
      }
    }

    ++index;
  }

  throw "Object end not expected!";
}

export function findCharacter(text: string, start_index: number, character: string): number {
  let index = start_index;

  while (index < text.length) {
    if (text[index] === character) {
      return index;
    }
    ++index;
  }

  throw "Object end not expected!";
}

export function findKey(text: string, start_index: number): FindResult {

  const open_quote_index = findCharacter(text, start_index, '"');
  const close_quote_index = findEnd(text, open_quote_index);

  return {
    openIndex: open_quote_index,
    closeIndex: close_quote_index
  };
}

export function isNumber(character: string): boolean {

  if (character.length === 0 || character === ' ') {
    return false;
  }

  const number = Number(character);
  return !isNaN(number);
}

export function findNumber(text: string, start_index: number): FindResult {
  let index = start_index;

  while (index < text.length) {
    const current_character = text[index];

    if (!isNaN(Number(current_character))) {
      ++index;
    }
    else if (current_character === '.') {
      ++index;
    }
    else {
      return {
        openIndex: start_index,
        closeIndex: index
      };
    }
  }

  throw "Error while parsing number!";
}

export function findValue(text: string, start_index: number): FindResult {

  let index = start_index;

  while (index < text.length) {
    const current_character = text[index];

    if (current_character === '{' || current_character === '[' || current_character === '"') {
      const end_index = findEnd(text, index);
      return {
        openIndex: index,
        closeIndex: end_index
      };
    }
    else if (isNumber(current_character)) {
      return findNumber(text, index);
    }

    ++index;
  }

  throw "Object end not expected!";
}

export function getValue(text: string, result: FindResult): string {
  return text.substring(result.openIndex + 1, result.closeIndex - 1);
}

export function findKeyInJSONObject(text: string, start_index: number, key_to_find: string): FindResult {

  const open_bracket_index = findCharacter(text, start_index, '{');

  let index = open_bracket_index + 1;

  while (index < text.length) {
    const key_bounds = findKey(text, index);

    const key = getValue(text, key_bounds);

    if (key === key_to_find) {
      return {
        openIndex: key_bounds.openIndex,
        closeIndex: key_bounds.closeIndex
      };
    }

    const colon_index = findCharacter(text, key_bounds.closeIndex, ':');

    const value_bounds = findValue(text, colon_index + 1);

    index = value_bounds.closeIndex;
  }

  throw "Object end not expected!";
}

export function findInArray(text: string, startIndex: number, predicateObject: any): FindResult {

  const openBracketIndex = findCharacter(text, startIndex, '[');

  let index = openBracketIndex + 1;

  while (index < text.length) {
    const valueBounds = findValue(text, index);

    if (predicateObject.predicate(text, valueBounds)) {
      return valueBounds;
    }

    index = valueBounds.closeIndex;
  }

  throw "Object end not expected!";
}