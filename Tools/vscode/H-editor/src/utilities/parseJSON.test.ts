import { deepEqual, equal } from "assert";
import 'mocha';

import { findEndOfString, fromOffsetToPosition, fromPositionToOffset, getObjectAtPosition, iterateThroughJSONString, iterateThroughJSONStringUsingPosition, JSONParserEvent, findEndOfCurrentObject } from './parseJSON';

describe("findEndOfString function", () => {

    it("should return at end of string", () => {
        const value = '"hello world!"';

        const end = findEndOfString(value, 1);
        equal(end, 13);
    });
});

describe("iterateThroughJSONString", () => {

    it("should return openObject when encountering {", () => {

        const json = '{ "foo": {"name": "bar"} }';

        {
            let state = {
                stack: [],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 0);
            equal(result.event, JSONParserEvent.openObject);

            deepEqual(state.stack, ['{']);
            equal(state.expectKey, true);
        }

        {
            let state = {
                stack: ['{'],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 7);
            equal(result.event, JSONParserEvent.openObject);
            equal(result.endIndex, 10);

            deepEqual(state.stack, ['{', '{']);
            equal(state.expectKey, true);
        }
    });

    it("should return closeObject when encountering }", () => {

        const json = '{ "foo": {"name": "bar"} }';

        {
            let state = {
                stack: ['{', '{'],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 23);
            equal(result.event, JSONParserEvent.closeObject);
            equal(result.endIndex, 24);

            deepEqual(state.stack, ['{']);
            equal(state.expectKey, false);
        }

        {
            let state = {
                stack: ['{'],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 24);
            equal(result.event, JSONParserEvent.closeObject);
            equal(result.endIndex, 26);

            deepEqual(state.stack, []);
            equal(state.expectKey, false);
        }
    });

    it("should return openArray when encountering [", () => {

        const json = '{ "foo": [1, 2, 3] }';

        {
            let state = {
                stack: ['{'],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 7);
            equal(result.event, JSONParserEvent.openArray);
            equal(result.endIndex, 10);

            deepEqual(state.stack, ['{', '[']);
            equal(state.expectKey, false);
        }
    });

    it("should return closeArray when encountering ]", () => {

        const json = '{ "foo": [1, 2, 3] }';

        {
            let state = {
                stack: ['{', '['],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 17);
            equal(result.event, JSONParserEvent.closeArray);
            equal(result.endIndex, 18);

            deepEqual(state.stack, ['{']);
            equal(state.expectKey, false);
        }
    });

    it("should return key event when encountering key", () => {

        const json = '{ "foo": [1, 2, 3] }';

        {
            let state = {
                stack: ['{'],
                expectKey: true
            };

            const result = iterateThroughJSONString(state, json, 1);
            equal(result.event, JSONParserEvent.key);
            equal(result.value, "foo");
            equal(result.endIndex, 7);

            deepEqual(state.stack, ['{']);
            equal(state.expectKey, false);
        }
    });

    it("should expect key after comma (while not inside array)", () => {

        const json = '{ "foo": [1, 2, 3], "hello": "beep" }';

        {
            let state = {
                stack: ['{'],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 18);
            equal(result.event, JSONParserEvent.key);
            equal(result.value, "hello");
            equal(result.endIndex, 27);

            deepEqual(state.stack, ['{']);
            equal(state.expectKey, false);
        }
    });

    it("should find number value after key", () => {

        const json = '{ "foo": 13.4 }';

        {
            let state = {
                stack: ['{'],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 7);
            equal(result.event, JSONParserEvent.number);
            equal(result.value, 13.4);
            equal(result.endIndex, 13);

            deepEqual(state.stack, ['{']);
            equal(state.expectKey, false);
        }
    });

    it("should find string value after key", () => {

        const json = '{ "foo": "hello" }';

        {
            let state = {
                stack: ['{'],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 7);
            equal(result.event, JSONParserEvent.string);
            equal(result.value, "hello");
            equal(result.endIndex, 16);

            deepEqual(state.stack, ['{']);
            equal(state.expectKey, false);
        }
    });

    it("should find number value inside array", () => {

        const json = '{ "foo": [12.2, 24.0, 36] }';

        {
            let state = {
                stack: ['{', '['],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 10);
            equal(result.event, JSONParserEvent.number);
            equal(result.value, 12.2);
            equal(result.endIndex, 14);

            deepEqual(state.stack, ['{', '[']);
            equal(state.expectKey, false);
        }

        {
            let state = {
                stack: ['{', '['],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 14);
            equal(result.event, JSONParserEvent.number);
            equal(result.value, 24.0);
            equal(result.endIndex, 20);

            deepEqual(state.stack, ['{', '[']);
            equal(state.expectKey, false);
        }

        {
            let state = {
                stack: ['{', '['],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 20);
            equal(result.event, JSONParserEvent.number);
            equal(result.value, 36);
            equal(result.endIndex, 24);

            deepEqual(state.stack, ['{', '[']);
            equal(state.expectKey, false);
        }
    });

    it("should find string value inside array", () => {

        const json = '{ "foo": ["hello", "world"] }';

        {
            let state = {
                stack: ['{', '['],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 10);
            equal(result.event, JSONParserEvent.string);
            equal(result.value, "hello");
            equal(result.endIndex, 17);

            deepEqual(state.stack, ['{', '[']);
            equal(state.expectKey, false);
        }

        {
            let state = {
                stack: ['{', '['],
                expectKey: false
            };

            const result = iterateThroughJSONString(state, json, 17);
            equal(result.event, JSONParserEvent.string);
            equal(result.value, "world");
            equal(result.endIndex, 26);

            deepEqual(state.stack, ['{', '[']);
            equal(state.expectKey, false);
        }
    });
});

describe("iterateThroughJSONStringUsingPosition function", () => {

    it("should find next position correctly and return start value index", () => {

        let state = {
            stack: [],
            expectKey: false
        };

        let currentPosition: any[] = [];

        let currentOffset = 0;

        const json = '{"language_version":{"major":1,"minor":2,"patch":3},"export_functions":[{"key":"value"},{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}';

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["language_version"]);
            equal(result.startValueIndex, 20);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["language_version", "major"]);
            equal(result.startValueIndex, 29);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["language_version", "minor"]);
            equal(result.startValueIndex, 39);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["language_version", "patch"]);
            equal(result.startValueIndex, 49);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["export_functions"]);
            equal(result.startValueIndex, 71);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["export_functions", 0]);
            equal(result.startValueIndex, 72);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["export_functions", 0, "key"]);
            equal(result.startValueIndex, 79);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["export_functions", 1]);
            equal(result.startValueIndex, 88);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["export_functions", 1, "key"]);
            equal(result.startValueIndex, 95);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["export_functions", 2]);
            equal(result.startValueIndex, 104);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["export_functions", 2, "key"]);
            equal(result.startValueIndex, 111);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["export_functions", 3]);
            equal(result.startValueIndex, 119);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["internal_functions"]);
            equal(result.startValueIndex, 142);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["internal_functions", 0]);
            equal(result.startValueIndex, 143);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["internal_functions", 0, "key"]);
            equal(result.startValueIndex, 150);
        }

        {
            const result = iterateThroughJSONStringUsingPosition(state, currentPosition, json, currentOffset);
            currentOffset = result.nextStartIndex;

            deepEqual(result.position, ["internal_functions", 1]);
            equal(result.startValueIndex, 158);
        }
    });
});

describe("getObjectAtPosition function", () => {

    it("should return object from object", () => {

        const object = {
            fruit: {
                name: "orange"
            }
        };

        {
            const reference = getObjectAtPosition(object, ["fruit"]);
            equal(reference.value, object.fruit);
        }

        {
            const reference = getObjectAtPosition(object, ["fruit", "name"]);
            equal(reference.value, object.fruit.name);
        }
    });

    it('should return object from array', () => {

        const object = {
            fruits: [
                {
                    name: "orange"
                },
                {
                    name: "pear"
                }
            ]
        };

        {
            const reference = getObjectAtPosition(object, ["fruits"]);
            equal(reference.value, object.fruits);
        }

        {
            const reference = getObjectAtPosition(object, ["fruits", 0]);
            equal(reference.value, object.fruits[0]);
        }

        {
            const reference = getObjectAtPosition(object, ["fruits", 1]);
            equal(reference.value, object.fruits[1]);
        }

        {
            const reference = getObjectAtPosition(object, ["fruits", 0, "name"]);
            equal(reference.value, object.fruits[0].name);
        }
    });

    it("should be possible to change value", () => {

        const object = {
            fruit: {
                name: "orange"
            }
        };

        {
            const reference = getObjectAtPosition(object, ["fruit", "name"]);
            equal(object.fruit.name, "orange");
            reference.value = "lemon";
            equal(object.fruit.name, "lemon");
        }
    });
});

describe("fromPositionToOffset function", () => {

    const startParserState = {
        stack: [],
        expectKey: false
    };

    it("should return offset of value in an object", () => {

        {
            const json = '{"fruit":{"name":"orange"}}';

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], ["fruit"]);
                const expectedValue = 9;
                equal(actualValue.offset, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], ["fruit", "name"]);
                const expectedValue = 17;
                equal(actualValue.offset, expectedValue);
            }
        }
    });

    it("should return offset of object in an array", () => {
        {
            const json = '[{"name":"orange"},{"name":"pear"}]';

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], [0]);
                const expectedValue = 1;
                equal(actualValue.offset, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], [1]);
                const expectedValue = 19;
                equal(actualValue.offset, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], [1, "name"]);
                const expectedValue = 27;
                equal(actualValue.offset, expectedValue);
            }
        }
    });

    it("should return offset of number in an array", () => {
        {
            const json = '[1,2,3]';

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], [0]);
                const expectedValue = 1;
                equal(actualValue.offset, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], [1]);
                const expectedValue = 3;
                equal(actualValue.offset, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], [2]);
                const expectedValue = 5;
                equal(actualValue.offset, expectedValue);
            }
        }
    });

    it("should return offset of string in an array", () => {
        {
            const json = '["hello","world"]';

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], [0]);
                const expectedValue = 1;
                equal(actualValue.offset, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(startParserState, json, 0, [], [1]);
                const expectedValue = 9;
                equal(actualValue.offset, expectedValue);
            }
        }
    });

    it("should return offset of last element in an array", () => {
        {
            const json = '[]';

            const actualValue = fromPositionToOffset(startParserState, json, 0, [], [0]);
            const expectedValue = 1;
            equal(actualValue.offset, expectedValue);
        }

        {
            const json = '[1,2]';

            const actualValue = fromPositionToOffset(startParserState, json, 0, [], [2]);
            const expectedValue = 4;
            equal(actualValue.offset, expectedValue);
        }
    });

    it("should return correct offset given initial state", () => {

        const json = '[{"name":"orange"},{"name":"pear"}]';

        {
            const parserState = {
                stack: ['['],
                expectKey: false
            };

            const actualValue = fromPositionToOffset(parserState, json, 19, [1], [1, "name"]);
            const expectedValue = 27;
            equal(actualValue.offset, expectedValue);
        }

    });
});

describe("fromOffsetToPosition function", () => {
    it("should return position specified by offset", () => {

        {
            const json = '{"fruit":{"name":"orange"}}';

            {
                const actualValue = fromOffsetToPosition(json, 0);
                const expectedValue: any[] = [];
                deepEqual(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 9);
                const expectedValue = ["fruit"];
                deepEqual(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 17);
                const expectedValue: any[] = ["fruit", "name"];
                deepEqual(actualValue, expectedValue);
            }
        }

        {
            const json = '{"fruits":[{"name":"orange"},{"name":"pear"}]}';

            {
                const actualValue = fromOffsetToPosition(json, 10);
                const expectedValue: any[] = ["fruits"];
                deepEqual(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 11);
                const expectedValue = ["fruits", 0];
                deepEqual(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 29);
                const expectedValue = ["fruits", 1];
                deepEqual(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 37);
                const expectedValue = ["fruits", 1, "name"];
                deepEqual(actualValue, expectedValue);
            }
        }
    });
});

describe("findEndOfCurrentObject function", () => {
    it("should return offset of curly brace that closes the object", () => {

        {
            const json = '{"fruits":{"name":"orange"}}';

            {
                const parserState = {
                    stack: [],
                    expectKey: false
                };

                const actualValue = findEndOfCurrentObject(parserState, json, 0).offset;
                const expectedValue = 28;
                equal(actualValue, expectedValue);
            }

            {
                const parserState = {
                    stack: ['{'],
                    expectKey: false
                };

                const actualValue = findEndOfCurrentObject(parserState, json, 10).offset;
                const expectedValue = 27;
                equal(actualValue, expectedValue);
            }
        }
    });

    it("should return offset at end of string", () => {

        {
            const json = '{"name":"orange"}';

            {
                const parserState = {
                    stack: [],
                    expectKey: false
                };

                const actualValue = findEndOfCurrentObject(parserState, json, 8).offset;
                const expectedValue = 16;
                equal(actualValue, expectedValue);
            }
        }
    });

    it("should return offset at end of number", () => {

        {
            const json = '{"name":123}';

            {
                const parserState = {
                    stack: [],
                    expectKey: false
                };

                const actualValue = findEndOfCurrentObject(parserState, json, 8).offset;
                const expectedValue = 11;
                equal(actualValue, expectedValue);
            }
        }
    });
});