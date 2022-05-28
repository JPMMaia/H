import { deepEqual, equal } from "assert";
import 'mocha';

import { fromOffsetToPosition, fromPositionToOffset, getObjectAtPosition, iterateThroughJSONString, JSONParserEvent } from './parseJSON';

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

describe("getObjectAtPosition function", () => {

    it("should return object from object", () => {

        const object = {
            fruit: {
                name: "orange"
            }
        };

        {
            const actualValue = getObjectAtPosition(object, ["fruit"]);
            equal(actualValue, object.fruit);
        }

        {
            const actualValue = getObjectAtPosition(object, ["fruit", "name"]);
            equal(actualValue, object.fruit.name);
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
            const actualValue = getObjectAtPosition(object, ["fruits"]);
            equal(actualValue, object.fruits);
        }

        {
            const actualValue = getObjectAtPosition(object, ["fruits", 0]);
            equal(actualValue, object.fruits[0]);
        }

        {
            const actualValue = getObjectAtPosition(object, ["fruits", 1]);
            equal(actualValue, object.fruits[1]);
        }

        {
            const actualValue = getObjectAtPosition(object, ["fruits", 0, "name"]);
            equal(actualValue, object.fruits[0].name);
        }
    });
});

describe("fromPositionToOffset function", () => {
    it("should return offset of value in an object", () => {

        {
            const json = '{"fruit": {"name": "orange"}}';

            {
                const actualValue = fromPositionToOffset(json, ["fruit"]);
                const expectedValue = 10;
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, ["fruit", "name"]);
                const expectedValue = 20;
                equal(actualValue, expectedValue);
            }
        }
    });

    it("should return offset of object in an array", () => {
        {
            const json = '[ {"name":"orange"}, {"name":"pear"} ]';

            {
                const actualValue = fromPositionToOffset(json, [0]);
                const expectedValue = 2;
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, [1]);
                const expectedValue = 21;
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, [1, "name"]);
                const expectedValue = 30;
                equal(actualValue, expectedValue);
            }
        }
    });

    it("should return offset of number in an array", () => {
        {
            const json = '[ 1, 2, 3 ]';

            {
                const actualValue = fromPositionToOffset(json, [0]);
                const expectedValue = 2;
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, [1]);
                const expectedValue = 5;
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, [2]);
                const expectedValue = 8;
                equal(actualValue, expectedValue);
            }
        }
    });

    it("should return offset of string in an array", () => {
        {
            const json = '[ "hello", "world" ]';

            {
                const actualValue = fromPositionToOffset(json, [0]);
                const expectedValue = 3;
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, [1]);
                const expectedValue = 12;
                equal(actualValue, expectedValue);
            }
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
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 9);
                const expectedValue = ["fruit"];
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 17);
                const expectedValue: any[] = ["fruit", "name"];
                equal(actualValue, expectedValue);
            }
        }

        {
            const json = '{"fruits":[{"name":"orange"},{"name":"pear"}]}';

            {
                const actualValue = fromOffsetToPosition(json, 10);
                const expectedValue: any[] = ["fruits"];
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 11);
                const expectedValue = ["fruits", 0];
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 29);
                const expectedValue = ["fruits", 1];
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromOffsetToPosition(json, 37);
                const expectedValue = ["fruits", 1, "name"];
                equal(actualValue, expectedValue);
            }
        }
    });
});
