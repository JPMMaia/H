import { deepEqual, equal, notEqual } from "assert";
import 'mocha';
import { JSONDelete, JSONEdit, JSONInsert } from "./editJSON";

import { createEmptyJSONCache, createJSONCache, addJSONCacheNode, getJSONCacheState, hasJSONCacheNode, JSONCache, removeJSONCacheNode, updateJSONCacheAfterArrayDelete, updateJSONCacheAfterArrayInsert, updateJSONCacheAfterEdit } from './JSONCache';

describe("createJSONCache function", () => {

    it("should create cache nodes for each key to cache", () => {

        const text = '{"language_version":{"major":1,"minor":2,"patch":3},"export_functions":[{"key":"value"},{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}';

        const keysToCache: any[] = [
            ["language_version"],
            ["export_functions"],
            ["export_functions", "all_array_elements"],
            ["internal_functions"],
            ["internal_functions", "all_array_elements"],
        ];

        const cache = createJSONCache(text, keysToCache);

        equal(cache.rootNode.state.offsetFromParent, 0);
        equal(cache.rootNode.state.size, 160);
        equal(cache.rootNode.children.length, 3);

        {
            const node = cache.rootNode.children[0];

            equal(node.value, "language_version");
            equal(node.state.offsetFromParent, 20);
            equal(node.state.size, 31);
            equal(node.state.parserState.expectKey, false);
            deepEqual(node.state.parserState.stack, ["{"]);
            equal(node.children.length, 0);
        }

        {
            const node = cache.rootNode.children[1];

            equal(node.value, "export_functions");
            equal(node.state.offsetFromParent, 71);
            equal(node.state.size, 49);
            equal(node.state.parserState.expectKey, false);
            deepEqual(node.state.parserState.stack, ["{"]);
            equal(node.children.length, 3);
        }

        {
            const node = cache.rootNode.children[1].children[0];

            equal(node.value, 0);
            equal(node.state.offsetFromParent, 1);
            equal(node.state.size, 15);
            equal(node.state.parserState.expectKey, false);
            deepEqual(node.state.parserState.stack, ["{", "["]);
            equal(node.children.length, 0);
        }

        {
            const node = cache.rootNode.children[1].children[1];

            equal(node.value, 1);
            equal(node.state.offsetFromParent, 17);
            equal(node.state.size, 15);
            equal(node.state.parserState.expectKey, false);
            deepEqual(node.state.parserState.stack, ["{", "["]);
            equal(node.children.length, 0);
        }

        {
            const node = cache.rootNode.children[1].children[2];

            equal(node.value, 2);
            equal(node.state.offsetFromParent, 33);
            equal(node.state.size, 15);
            equal(node.state.parserState.expectKey, false);
            deepEqual(node.state.parserState.stack, ["{", "["]);
            equal(node.children.length, 0);
        }

        {
            const node = cache.rootNode.children[2];

            equal(node.value, "import_functions");
            equal(node.state.offsetFromParent, 142);
            equal(node.state.size, 17);
            equal(node.state.parserState.expectKey, false);
            deepEqual(node.state.parserState.stack, ["{"]);
            equal(node.children.length, 1);
        }

        {
            const node = cache.rootNode.children[2].children[0];

            equal(node.value, 0);
            equal(node.state.offsetFromParent, 1);
            equal(node.state.size, 15);
            equal(node.state.parserState.expectKey, false);
            deepEqual(node.state.parserState.stack, ["{", "["]);
            equal(node.children.length, 0);
        }
    });
});

describe("addJSONCacheNode function", () => {

    it("should add a cache node", () => {

        let cache = createEmptyJSONCache();

        {
            const state = {
                offsetFromParent: 20,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);

            equal(cache.rootNode.children.length, 1);
            equal(cache.rootNode.children[0].value, "export_functions");
            equal(cache.rootNode.children[0].state, state);
        }

        {
            const state = {
                offsetFromParent: 59,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);

            equal(cache.rootNode.children.length, 2);
            equal(cache.rootNode.children[1].value, "internal_functions");
            equal(cache.rootNode.children[1].state, state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);

            equal(cache.rootNode.children.length, 2);
            equal(cache.rootNode.children[0].value, "export_functions");
            equal(cache.rootNode.children[0].children.length, 1);
            equal(cache.rootNode.children[0].children[0].value, 0);
            equal(cache.rootNode.children[0].children[0].state, state);
        }
    });

    it("should add a cache node ordered by offsetFromParent", () => {

        let cache = createEmptyJSONCache();

        {
            const state = {
                offsetFromParent: 42,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 20,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        equal(cache.rootNode.children.length, 2);
        equal(cache.rootNode.children[0].value, "export_functions");
        equal(cache.rootNode.children[1].value, "internal_functions");
    });

    it("should update array indices of siblings", () => {

        let cache = createEmptyJSONCache();
        {
            const state = {
                offsetFromParent: 20,
                size: '[]'.length,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: '{"key":"value"}'.length,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: '{"key":"value"}'.length,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);

            equal(cache.rootNode.children[0].children.length, 2);
            equal(cache.rootNode.children[0].children[0].value, 0);
            equal(cache.rootNode.children[0].children[1].value, 1);
        }
    });

    it("should update size of parent node", () => {

        let cache = createEmptyJSONCache();

        {
            equal(cache.rootNode.state.size, '{}'.length);
        }

        {
            const state = {
                offsetFromParent: 20,
                size: '[]'.length,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);

            equal(cache.rootNode.state.size, '{"export_functions":[]}'.length);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: '{"key":"value"}'.length,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);

            equal(cache.rootNode.children[0].state.size, '[{"key":"value"}]'.length);
            equal(cache.rootNode.state.size, '{"export_functions":[{"key":"value"}]}'.length);
        }

        {
            const state = {
                offsetFromParent: 17,
                size: '{"key":"value"}'.length,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 1], state);

            equal(cache.rootNode.children[0].state.size, '[{"key":"value"},{"key":"value"}]'.length);
            equal(cache.rootNode.state.size, '{"export_functions":[{"key":"value"},{"key":"value"}]}'.length);
        }

        {
            const state = {
                offsetFromParent: 75,
                size: '[]'.length,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);

            equal(cache.rootNode.state.size, '{"export_functions":[{"key":"value"},{"key":"value"}],"internal_functions":[]}'.length);
        }
    });
});

describe("removeJSONCacheNode function", () => {

    it("should remove a cache node", () => {

        let cache = createEmptyJSONCache();

        {
            const state = {
                offsetFromParent: 20,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 59,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        equal(cache.rootNode.children.length, 2);
        equal(cache.rootNode.children[0].children.length, 1);

        removeJSONCacheNode(cache, ["export_functions", 0]);
        equal(cache.rootNode.children[0].children.length, 0);

        removeJSONCacheNode(cache, ["export_functions"]);
        equal(cache.rootNode.children.length, 1);

        removeJSONCacheNode(cache, ["internal_functions"]);
        equal(cache.rootNode.children.length, 0);
    });

    it("should update size of parent node", () => {

        let cache = createEmptyJSONCache();

        {
            equal(cache.rootNode.state.size, '{}'.length);
        }

        {
            const state = {
                offsetFromParent: 20,
                size: '[]'.length,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);

            equal(cache.rootNode.state.size, '{"export_functions":[]}'.length);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: '{"key":"value"}'.length,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);

            equal(cache.rootNode.children[0].state.size, '[{"key":"value"}]'.length);
            equal(cache.rootNode.state.size, '{"export_functions":[{"key":"value"}]}'.length);
        }

        {
            const state = {
                offsetFromParent: 17,
                size: '{"key":"value"}'.length,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 1], state);

            equal(cache.rootNode.children[0].state.size, '[{"key":"value"},{"key":"value"}]'.length);
            equal(cache.rootNode.state.size, '{"export_functions":[{"key":"value"},{"key":"value"}]}'.length);
        }

        {
            const state = {
                offsetFromParent: 75,
                size: '[]'.length,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);

            equal(cache.rootNode.state.size, '{"export_functions":[{"key":"value"},{"key":"value"}],"internal_functions":[]}'.length);
        }

        equal(cache.rootNode.children.length, 2);
        equal(cache.rootNode.children[0].children.length, 2);
        equal(cache.rootNode.children[0].state.size, '[{"key":"value"},{"key":"value"}]'.length);
        equal(cache.rootNode.state.size, '{"export_functions":[{"key":"value"},{"key":"value"}],"internal_functions":[]}'.length);

        removeJSONCacheNode(cache, ["export_functions", 0]);
        equal(cache.rootNode.children[0].state.size, '[{"key":"value"}]'.length);
        equal(cache.rootNode.state.size, '{"export_functions":[{"key":"value"}],"internal_functions":[]}'.length);

        removeJSONCacheNode(cache, ["export_functions", 0]);
        equal(cache.rootNode.children[0].state.size, '[]'.length);
        equal(cache.rootNode.state.size, '{"export_functions":[],"internal_functions":[]}'.length);

        removeJSONCacheNode(cache, ["export_functions"]);
        equal(cache.rootNode.state.size, '{"internal_functions":[]}'.length);

        removeJSONCacheNode(cache, ["internal_functions"]);
        equal(cache.rootNode.state.size, '{}'.length);
    });
});

describe("updateJSONCacheAfterEdit function", () => {

    it("should update offsets after edit position", () => {

        let cache = createEmptyJSONCache();

        {
            const state = {
                offsetFromParent: 20,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        {
            const state = {
                offsetFromParent: 59,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const edit: JSONEdit = {
                range: {
                    startCharacter: 29,
                    endCharacter: 34
                },
                newText: "012345678"
            };

            updateJSONCacheAfterEdit(cache, edit);

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 59 + 4);
            }
        }

        {
            const edit: JSONEdit = {
                range: {
                    startCharacter: 29,
                    endCharacter: 38
                },
                newText: "0123"
            };

            updateJSONCacheAfterEdit(cache, edit);

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 63 - 5);
            }
        }
    });
});

describe("updateJSONCacheAfterArrayInsert function", () => {

    it("should update offsets and sizes after insert position", () => {

        // {"export_functions":[{"key":"value"},{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}

        let cache = createEmptyJSONCache();

        {
            const state = {
                offsetFromParent: 20,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
            // {"export_functions":[]}
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
            // {"export_functions":[{"key":"value"}]}
        }

        {
            const state = {
                offsetFromParent: 59,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
            // {"export_functions":[{"key":"value"}],"internal_functions":[]}
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions", 0], state);
            // {"export_functions":[{"key":"value"}],"internal_functions":[{"key":"value"}]}
        }

        {
            const insert: JSONInsert = {
                atCharacter: 21,
                newText: '{"key":"value"},'
            };

            updateJSONCacheAfterArrayInsert(cache, insert);
            // {"export_functions":[{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
                equal(state?.size, 33);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 1]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1 + 16);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 59 + 16);
                equal(state?.size, 17);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }
        }

        {
            const insert: JSONInsert = {
                atCharacter: 52,
                newText: ',{"key":"value"}'
            };

            updateJSONCacheAfterArrayInsert(cache, insert);
            // {"export_functions":[{"key":"value"},{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
                equal(state?.size, 33 + 16);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 1]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1 + 16);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 2]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1 + 16 + 16);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 59 + 16 + 16);
                equal(state?.size, 17);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }
        }

        {
            const insert: JSONInsert = {
                atCharacter: 37,
                newText: '{"key":"value"},'
            };

            updateJSONCacheAfterArrayInsert(cache, insert);
            // {"export_functions":[{"key":"value"},{"key":"value"},{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
                equal(state?.size, 65);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 1]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 17);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 2]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 33);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 3]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 49);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 107);
                equal(state?.size, 17);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }
        }
    });

    it("should update position after array insert position", () => {

        let cache = createEmptyJSONCache();

        {
            const state = {
                offsetFromParent: 20,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
            // {"export_functions":[]}
        }

        equal(hasJSONCacheNode(cache, ["export_functions", 0]), false);

        {
            const insert: JSONInsert = {
                atCharacter: 21,
                newText: '{"key":"value0"}'
            };

            updateJSONCacheAfterArrayInsert(cache, insert);
            // {"export_functions":[{"key":"value0"}]}

            equal(hasJSONCacheNode(cache, ["export_functions", 0]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 1]), false);
        }

        {
            const insert: JSONInsert = {
                atCharacter: 37,
                newText: ',{"key":"value2"}'
            };

            updateJSONCacheAfterArrayInsert(cache, insert);
            // {"export_functions":[{"key":"value0"},{"key":"value2"}]}

            equal(hasJSONCacheNode(cache, ["export_functions", 0]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 1]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 2]), false);
        }

        {
            const insert: JSONInsert = {
                atCharacter: 38,
                newText: '{"key":"value1"},'
            };

            updateJSONCacheAfterArrayInsert(cache, insert);
            // {"export_functions":[{"key":"value0"},{"key":"value1"},{"key":"value2"}]}

            equal(hasJSONCacheNode(cache, ["export_functions", 0]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 1]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 2]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 3]), false);
        }
    });
});

describe("updateJSONCacheAfterArrayDelete function", () => {

    it("should update offsets after delete position", () => {

        // {"export_functions":[{"key":"value"},{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}

        let cache = createEmptyJSONCache();

        {
            const state = {
                offsetFromParent: 20,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        {
            const state = {
                offsetFromParent: 17,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 1], state);
        }

        {
            const state = {
                offsetFromParent: 33,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 2], state);
        }

        {
            const state = {
                offsetFromParent: 91,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions", 0], state);
        }

        {
            // Delete [export_functions, 1]

            const change: JSONDelete = {
                range: {
                    startCharacter: 37,
                    endCharacter: 53
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);
            // {"export_functions":[{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
                equal(state?.size, 33);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 1]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 17);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 2]);
                equal(state, undefined);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 75);
                equal(state?.size, 17);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }
        }

        {
            // Delete [export_functions, 0]

            const change: JSONDelete = {
                range: {
                    startCharacter: 21,
                    endCharacter: 37
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);
            // {"export_functions":[{"key":"value"}],"internal_functions":[{"key":"value"}]}

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
                equal(state?.size, 17);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 1]);
                equal(state, undefined);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 59);
                equal(state?.size, 17);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }
        }

        {
            // Delete [export_functions, 0]

            const change: JSONDelete = {
                range: {
                    startCharacter: 21,
                    endCharacter: 36
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);
            // {"export_functions":[],"internal_functions":[{"key":"value"}]}

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
                equal(state?.size, 2);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                equal(state, undefined);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 44);
                equal(state?.size, 17);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions", 0]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 1);
                equal(state?.size, 15);
            }
        }
    });

    it("should update array index after delete", () => {

        // {"export_functions":[{"key":"value"},{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}

        let cache = createEmptyJSONCache();

        {
            const state = {
                offsetFromParent: 20,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        {
            const state = {
                offsetFromParent: 17,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 1], state);
        }

        {
            const state = {
                offsetFromParent: 33,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 2], state);
        }

        {
            const state = {
                offsetFromParent: 91,
                size: 2,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const state = {
                offsetFromParent: 1,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions", 0], state);
        }

        equal(hasJSONCacheNode(cache, ["export_functions", 0]), true);
        equal(hasJSONCacheNode(cache, ["export_functions", 1]), true);
        equal(hasJSONCacheNode(cache, ["export_functions", 2]), true);
        equal(hasJSONCacheNode(cache, ["internal_functions", 0]), true);

        {
            // Delete [export_functions, 1]

            const change: JSONDelete = {
                range: {
                    startCharacter: 37,
                    endCharacter: 53
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);
            // {"export_functions":[{"key":"value"},{"key":"value"}],"internal_functions":[{"key":"value"}]}

            equal(hasJSONCacheNode(cache, ["export_functions", 0]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 1]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 2]), false);
        }

        {
            // Delete [export_functions, 0]

            const change: JSONDelete = {
                range: {
                    startCharacter: 21,
                    endCharacter: 37
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);
            // {"export_functions":[{"key":"value"}],"internal_functions":[{"key":"value"}]}

            equal(hasJSONCacheNode(cache, ["export_functions", 0]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 1]), false);
        }

        {
            // Delete [export_functions, 0]

            const change: JSONDelete = {
                range: {
                    startCharacter: 21,
                    endCharacter: 36
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);
            // {"export_functions":[],"internal_functions":[{"key":"value"}]}

            equal(hasJSONCacheNode(cache, ["export_functions", 0]), false);
        }
    });
});
