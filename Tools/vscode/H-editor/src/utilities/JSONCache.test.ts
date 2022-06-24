import { deepEqual, equal, notEqual } from "assert";
import 'mocha';
import { JSONDelete, JSONEdit, JSONInsert } from "./editJSON";

import { createJSONCache, addJSONCacheNode, getJSONCacheState, hasJSONCacheNode, JSONCache, removeJSONCacheNode, updateJSONCacheAfterArrayDelete, updateJSONCacheAfterArrayInsert, updateJSONCacheAfterEdit } from './JSONCache';

describe("addJSONCacheNode function", () => {

    it("should add a cache node", () => {

        let cache = createJSONCache();

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

        let cache = createJSONCache();

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

        let cache = createJSONCache();
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

        let cache = createJSONCache();

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

        let cache = createJSONCache();

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

        let cache = createJSONCache();

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

        let cache = createJSONCache();

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

        let cache = createJSONCache();

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

        let cache = createJSONCache();

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

        let cache = createJSONCache();

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
                offsetFromParent: 38,
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
                offsetFromParent: 21,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        {
            const change: JSONDelete = {
                range: {
                    startCharacter: 21,
                    endCharacter: 36
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 20);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                notEqual(state, undefined);
                equal(state?.offsetFromParent, 23);
            }
        }
    });

    it("should update array index after delete", () => {

        let cache = createJSONCache();

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
                offsetFromParent: 21,
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
                offsetFromParent: 36,
                size: 15,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 1], state);
        }

        equal(hasJSONCacheNode(cache, ["export_functions", 0]), true);
        equal(hasJSONCacheNode(cache, ["export_functions", 1]), true);

        {
            const change: JSONDelete = {
                range: {
                    startCharacter: 21,
                    endCharacter: 36
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);

            equal(hasJSONCacheNode(cache, ["export_functions", 0]), true);
            equal(hasJSONCacheNode(cache, ["export_functions", 1]), false);
        }

        {
            const change: JSONDelete = {
                range: {
                    startCharacter: 21,
                    endCharacter: 36
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);

            equal(hasJSONCacheNode(cache, ["export_functions", 0]), false);
        }
    });
});
