import { onThrowError } from "./errors";

export interface ObjectReference {
  get value(): any;
  set value(value: any);
}

export function getObjectAtPosition(object: any, position: any[]): ObjectReference {

  if (position.length === 1) {
    return {
      get value() {
        return object[position[0]];;
      },
      set value(value: any) {
        object[position[0]] = value;
      }
    };
  }

  const firstKey = position[0];
  const child = object[firstKey];

  const remainderKeys = position.slice(1, position.length);

  return getObjectAtPosition(child, remainderKeys);
}

export enum JSONParserEvent {
  openObject,
  closeObject,
  openArray,
  closeArray,
  key,
  string,
  number,
}

export interface ParserState {
  stack: string[],
  expectKey: boolean
}

export interface ParseJSONIterateResult {
  event: JSONParserEvent,
  value: any,
  startIndex: number,
  endIndex: number
}

export function isNumber(character: string): boolean {

  if (character.length === 0 || character === ' ') {
    return false;
  }

  const number = Number(character);
  return !isNaN(number);
}

export interface FindResult {
  openIndex: number,
  closeIndex: number
}

export function findNumber(text: string, startIndex: number): FindResult {
  let index = startIndex;

  while (index < text.length) {
    const currentCharacter = text[index];

    if (isNumber(currentCharacter)) {
      ++index;
    }
    else if (currentCharacter === '.') {
      ++index;
    }
    else {
      return {
        openIndex: startIndex,
        closeIndex: index
      };
    }
  }

  const message = "Error while parsing number!";
  onThrowError(message);
  throw Error(message);
}

export function findEndOfString(text: string, startIndex: number): number {

  let index = startIndex;

  while (index < text.length) {
    const currentCharacter = text[index];
    const previousCharacter = text[index - 1];
    if (previousCharacter !== '\\' && currentCharacter === '"') {
      return index;
    }
    ++index;
  }

  const message = "Error while parsing string!";
  onThrowError(message);
  throw Error(message);
}

export function iterateThroughJSONString(state: ParserState, text: string, startIndex: number): ParseJSONIterateResult {

  let index = startIndex;

  if (state.stack.length === 0) {

    while (index < text.length) {

      const currentCharacter = text[index];

      if (currentCharacter === '{') {
        state.stack.push(currentCharacter);
        state.expectKey = true;

        return {
          event: JSONParserEvent.openObject,
          value: undefined,
          startIndex: index,
          endIndex: index + 1
        };
      }
      if (currentCharacter === '[') {
        state.stack.push(currentCharacter);
        state.expectKey = false;

        return {
          event: JSONParserEvent.openArray,
          value: undefined,
          startIndex: index,
          endIndex: index + 1
        };
      }

      ++index;
    }

    const message = "Unexpected end of string";
    onThrowError(message);
    throw Error(message);
  }

  let beginKeyIndex = -1;
  let beginValueIndex = -1;

  while (index < text.length) {
    const currentCharacter = text[index];

    const lastSymbol = state.stack[state.stack.length - 1];

    if (lastSymbol === '{') {

      if (state.expectKey) {
        if (currentCharacter === '"') {
          state.stack.push(currentCharacter);
          beginKeyIndex = index;
        }
      }
      else {
        if (currentCharacter === '{') {
          state.stack.push(currentCharacter);
          state.expectKey = true;
          return {
            event: JSONParserEvent.openObject,
            value: undefined,
            startIndex: index,
            endIndex: index + 1
          };
        }
        else if (currentCharacter === '[') {
          state.stack.push(currentCharacter);
          return {
            event: JSONParserEvent.openArray,
            value: undefined,
            startIndex: index,
            endIndex: index + 1
          };
        }
        else if (currentCharacter === '}') {
          state.stack.pop();
          return {
            event: JSONParserEvent.closeObject,
            value: undefined,
            startIndex: index,
            endIndex: index + 1
          };
        }
        else if (currentCharacter === ',') {
          state.expectKey = true;
        }
        else if (currentCharacter === '"') {
          state.stack.push(currentCharacter);
          beginValueIndex = index;
        }
        else if (isNumber(currentCharacter)) {
          const result = findNumber(text, index);
          return {
            event: JSONParserEvent.number,
            value: Number(text.substring(result.openIndex, result.closeIndex)),
            startIndex: result.openIndex,
            endIndex: result.closeIndex
          };
        }
      }
    }
    else if (lastSymbol === '[') {
      if (currentCharacter === '{') {
        state.stack.push(currentCharacter);
        state.expectKey = true;
        return {
          event: JSONParserEvent.openObject,
          value: undefined,
          startIndex: index,
          endIndex: index + 1
        };
      }
      else if (currentCharacter === '[') {
        state.stack.push(currentCharacter);
        state.expectKey = false;
        return {
          event: JSONParserEvent.openArray,
          value: undefined,
          startIndex: index,
          endIndex: index + 1
        };
      }
      else if (currentCharacter === '"') {
        state.stack.push(currentCharacter);
        state.expectKey = false;
        beginValueIndex = index;
      }
      else if (currentCharacter === ']') {
        state.stack.pop();
        state.expectKey = false;
        return {
          event: JSONParserEvent.closeArray,
          value: undefined,
          startIndex: index,
          endIndex: index + 1
        };
      }
      else if (currentCharacter === ',') {
        state.expectKey = false;
      }
      else if (isNumber(currentCharacter)) {
        const result = findNumber(text, index);
        return {
          event: JSONParserEvent.number,
          value: Number(text.substring(result.openIndex, result.closeIndex)),
          startIndex: result.openIndex,
          endIndex: result.closeIndex
        };
      }
    }
    else if (lastSymbol === '"') {

      const previousCharacter = text[index - 1];

      if (previousCharacter !== '\\' && currentCharacter === '"') {

        if (state.expectKey) {
          state.stack.pop();
          state.expectKey = false;

          return {
            event: JSONParserEvent.key,
            value: text.substring(beginKeyIndex + 1, index),
            startIndex: beginKeyIndex,
            endIndex: index + 1
          };
        }
        else {
          state.stack.pop();

          return {
            event: JSONParserEvent.string,
            value: text.substring(beginValueIndex + 1, index),
            startIndex: beginValueIndex,
            endIndex: index + 1
          };
        }
      }
    }

    if (state.stack.length === 0) {
      break;
    }

    ++index;
  }

  const message = "Error while parsing JSON";
  onThrowError(message);
  throw Error(message);
}

export interface ParseJSONIteratePositionResult {
  position: any[],
  startValueIndex: number,
  nextStartIndex: number
}

export function iterateThroughJSONStringUsingPosition(state: ParserState, currentPosition: any[], text: string, startIndex: number): ParseJSONIteratePositionResult {

  let offset = startIndex;

  while (offset < text.length) {

    const result = iterateThroughJSONString(state, text, offset);

    if (result.event === JSONParserEvent.key) {
      if (currentPosition.length < state.stack.length) {
        currentPosition.push(result.value);
      }
      else {
        currentPosition[currentPosition.length - 1] = result.value;
      }

      return {
        position: [...currentPosition],
        startValueIndex: result.endIndex + 1,
        nextStartIndex: result.endIndex
      };
    }
    else if (result.event === JSONParserEvent.openArray) {
      currentPosition.push(-1);
    }
    else if (result.event === JSONParserEvent.closeArray) {

      currentPosition[currentPosition.length - 1] += 1;
      const position = [...currentPosition];
      currentPosition.pop();

      return {
        position: position,
        startValueIndex: result.startIndex,
        nextStartIndex: result.endIndex
      };
    }
    else if (result.event === JSONParserEvent.openObject) {
      if (state.stack.length > 1 && state.stack[state.stack.length - 2] === '[') {
        currentPosition[currentPosition.length - 1] += 1;

        return {
          position: [...currentPosition],
          startValueIndex: result.startIndex,
          nextStartIndex: result.endIndex
        };
      }
    }
    else if (result.event === JSONParserEvent.closeObject) {
      if (currentPosition.length > state.stack.length) {
        currentPosition.pop();
      }
    }
    else if (result.event === JSONParserEvent.number) {
      if (state.stack[state.stack.length - 1] === '[') {
        currentPosition[currentPosition.length - 1] += 1;

        return {
          position: [...currentPosition],
          startValueIndex: result.startIndex,
          nextStartIndex: result.endIndex
        };
      }
    }
    else if (result.event === JSONParserEvent.string) {
      if (state.stack[state.stack.length - 1] === '[') {
        currentPosition[currentPosition.length - 1] += 1;

        return {
          position: [...currentPosition],
          startValueIndex: result.startIndex,
          nextStartIndex: result.endIndex
        };
      }
    }

    offset = result.endIndex;
  }

  return {
    position: [...currentPosition],
    startValueIndex: text.length,
    nextStartIndex: text.length
  };
}

function areArraysEqual(array0: any[], array1: any[]): boolean {
  return array0.length === array1.length && array0.every((value, index) => value === array1[index]);
}

export interface OffsetResult {
  offset: number;
  newState: ParserState;
}

export function fromPositionToOffset(startState: ParserState, text: string, startIndex: number, startPosition: any[], position: any[]): OffsetResult {

  let state: ParserState = JSON.parse(JSON.stringify(startState));

  if (position.length === 0) {
    return { offset: startIndex, newState: state };
  }

  let offset = startIndex;
  let currentPosition = startPosition;

  const isPositionAVectorIndex = !isNaN(position[position.length - 1]);
  const isCurrentPositionAVectorIndex = !isNaN(currentPosition[currentPosition.length - 1]);

  if (isCurrentPositionAVectorIndex) {
    currentPosition[currentPosition.length - 1] -= 1;
  }

  while (offset < text.length) {

    const result = iterateThroughJSONString(state, text, offset);

    if (result.event === JSONParserEvent.key) {
      if (currentPosition.length < state.stack.length) {
        currentPosition.push(result.value);
      }
      else {
        currentPosition[currentPosition.length - 1] = result.value;
      }
    }
    else if (result.event === JSONParserEvent.openArray) {
      currentPosition.push(-1);
    }
    else if (result.event === JSONParserEvent.closeArray) {

      {
        currentPosition[currentPosition.length - 1] += 1;

        if (areArraysEqual(currentPosition, position)) {
          currentPosition.pop();
          return { offset: offset, newState: state };
        }
      }

      currentPosition.pop();
    }
    else if (result.event === JSONParserEvent.openObject) {
      if (state.stack.length > 1 && state.stack[state.stack.length - 2] === '[') {
        currentPosition[currentPosition.length - 1] += 1;
      }
    }
    else if (result.event === JSONParserEvent.closeObject) {
      if (currentPosition.length > state.stack.length) {
        currentPosition.pop();
      }
    }
    else if (result.event === JSONParserEvent.number) {
      if (state.stack[state.stack.length - 1] === '[') {
        currentPosition[currentPosition.length - 1] += 1;
      }
    }
    else if (result.event === JSONParserEvent.string) {
      if (state.stack[state.stack.length - 1] === '[') {
        currentPosition[currentPosition.length - 1] += 1;
      }
    }

    if (areArraysEqual(currentPosition, position)) {

      if (result.event === JSONParserEvent.key) {
        offset = result.endIndex;
      }
      else if (result.event === JSONParserEvent.openArray) {
        offset = result.endIndex;
      }

      while (offset < text.length) {
        const currentCharacter = text[offset];
        if (currentCharacter === '{' || currentCharacter === '[' || isNumber(currentCharacter)) {

          if (isPositionAVectorIndex) {
            state.expectKey = false;
            state.stack.splice(state.stack.length - 1, 1);
            return { offset: offset, newState: state };
          }
          else {
            return { offset: offset, newState: state };
          }
        }
        else if (currentCharacter === '"') {
          return { offset: offset, newState: state };
        }
        ++offset;
      }
    }

    offset = result.endIndex;
  }

  return { offset: -1, newState: state };
}

export function fromOffsetToPosition(text: string, targetOffset: number): any[] {

  if (targetOffset === 0) {
    return [];
  }

  let state = {
    stack: [],
    expectKey: false
  };

  let currentOffset = 0;
  let currentPosition: any[] = [];

  while (currentOffset < text.length) {

    const result = iterateThroughJSONStringUsingPosition(state, currentPosition, text, currentOffset);

    if (result.startValueIndex === targetOffset) {
      return result.position;
    }

    if (result.startValueIndex > targetOffset) {
      const message = "fromOffsetToPosition() went past";
      onThrowError(message);
      throw Error(message);
    }

    currentOffset = result.nextStartIndex;
  }

  const message = "fromOffsetToPosition() reached end of file.";
  onThrowError(message);
  throw Error(message);
}

export function findEndOfCurrentObject(startState: ParserState, text: string, startIndex: number): OffsetResult {

  let state = JSON.parse(JSON.stringify(startState));

  let currentOffset = startIndex;

  if (text[currentOffset] === '"') {
    const offset = findEndOfString(text, currentOffset + 1) + 1;
    return {
      offset: offset,
      newState: state
    };
  }
  else if (isNumber(text[currentOffset])) {
    const result = findNumber(text, currentOffset);
    return {
      offset: result.closeIndex,
      newState: state
    };
  }

  if (text[currentOffset] !== '{' && text[currentOffset] !== '[') {
    const message = "Expected open object/array";
    onThrowError(message);
    throw Error(message);
  }

  let stack: any[] = [];

  while (currentOffset < text.length) {

    const result = iterateThroughJSONString(state, text, currentOffset);

    if (result.event === JSONParserEvent.openObject) {
      stack.push('{');
    }
    else if (result.event === JSONParserEvent.closeObject) {
      stack.pop();
    }
    else if (result.event === JSONParserEvent.openArray) {
      stack.push('[');
    }
    else if (result.event === JSONParserEvent.closeArray) {
      stack.pop();
    }

    if (stack.length === 0) {
      return {
        offset: result.endIndex,
        newState: state
      };
    }

    currentOffset = result.endIndex;
  }

  const message = "findEndOfCurrentObject() reached end of file.";
  onThrowError(message);
  throw Error(message);
}