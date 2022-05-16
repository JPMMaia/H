import { equal } from "assert";
import 'mocha';

import { fromOffsetToPosition, fromPositionToOffset, getObjectAtPosition } from './parseJSON';

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
    it("should return offset of value specified by position", () => {

        {
            const json = '{"fruit":{"name":"orange"}}';

            {
                const actualValue = fromPositionToOffset(json, ["fruit"]);
                const expectedValue = json.search('{"name"');
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, ["fruit", "name"]);
                const expectedValue = json.search('"orange"');
                equal(actualValue, expectedValue);
            }
        }

        {
            const json = '{"fruits":[{"name":"orange"},{"name":"pear"}]}';

            {
                const actualValue = fromPositionToOffset(json, ["fruits"]);
                const expectedValue = json.search("[");
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, ["fruits", 0]);
                const expectedValue = json.search('{"name":"orange"}');
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, ["fruits", 1]);
                const expectedValue = json.search('{"name":"pear"}');
                equal(actualValue, expectedValue);
            }

            {
                const actualValue = fromPositionToOffset(json, ["fruits", 1, "name"]);
                const expectedValue = json.search('"pear"');
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
