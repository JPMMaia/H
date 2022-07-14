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

function isNumber(character: string): boolean {

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

function findNumber(text: string, startIndex: number): FindResult {
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

  throw Error("Error while parsing number!");
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

  throw Error("Error while parsing string!");
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

    throw Error("Unexpected end of string");
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
            startIndex: beginKeyIndex,
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

  throw Error("Error while parsing JSON");
}

export interface ParseJSONIteratePositionResult {
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
        startValueIndex: result.endIndex + 1,
        nextStartIndex: result.endIndex
      };
    }
    else if (result.event === JSONParserEvent.openArray) {
      currentPosition.push(-1);
    }
    else if (result.event === JSONParserEvent.closeArray) {
      currentPosition.pop();
    }
    else if (result.event === JSONParserEvent.openObject) {
      if (state.stack.length > 1 && state.stack[state.stack.length - 2] === '[') {
        currentPosition[currentPosition.length - 1] += 1;

        return {
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
          startValueIndex: result.startIndex,
          nextStartIndex: result.endIndex
        };
      }
    }
    else if (result.event === JSONParserEvent.string) {
      if (state.stack[state.stack.length - 1] === '[') {
        currentPosition[currentPosition.length - 1] += 1;

        return {
          startValueIndex: result.startIndex,
          nextStartIndex: result.endIndex
        };
      }
    }

    offset = result.endIndex;
  }

  return {
    startValueIndex: text.length,
    nextStartIndex: text.length
  };
}

function areArraysEqual(array0: any[], array1: any[]): boolean {
  return array0.length === array1.length && array0.every((value, index) => value === array1[index]);
}

export enum ArrayPosition {
  begin = "array_begin",
  end = "array_end"
};

export interface OffsetResult {
  offset: number;
  newState: ParserState;
}

export function fromPositionToOffset(startState: ParserState, text: string, startIndex: number, startPosition: any[], position: any[]): OffsetResult {

  let state = JSON.parse(JSON.stringify(startState));

  if (position.length === 0) {
    return { offset: startIndex, newState: state };
  }

  let offset = startIndex;
  let currentPosition = startPosition;

  if (!isNaN(currentPosition[currentPosition.length - 1])) {
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
          return { offset: offset, newState: state };
        }
        else if (currentCharacter === '"') {
          return { offset: offset, newState: state };
        }
        ++offset;
      }
    }

    if (result.event === JSONParserEvent.openArray) {
      const positionPlusArrayBegin = currentPosition.slice(0, currentPosition.length - 1).concat(ArrayPosition.begin);
      if (areArraysEqual(positionPlusArrayBegin, position)) {
        return { offset: result.endIndex, newState: state };
      }
    }

    if (result.event === JSONParserEvent.closeArray) {
      const positionPlusArrayEnd = currentPosition.slice(0, currentPosition.length - 1).concat(ArrayPosition.end);
      if (areArraysEqual(positionPlusArrayEnd, position)) {
        return { offset: offset, newState: state };
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
      return currentPosition;
    }

    if (result.startValueIndex > targetOffset) {
      throw Error("fromOffsetToPosition() went past");
    }

    currentOffset = result.nextStartIndex;
  }

  throw Error("fromOffsetToPosition() reached end of file.");
}
