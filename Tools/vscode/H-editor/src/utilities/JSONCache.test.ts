import { deepEqual, equal } from "assert";
import 'mocha';
import { JSONDelete, JSONEdit, JSONInsert } from "./editJSON";

import { addJSONCacheNode, getJSONCacheState, JSONCache, removeJSONCacheNode, updateJSONCacheAfterArrayDelete, updateJSONCacheAfterArrayInsert, updateJSONCacheAfterEdit } from './JSONCache';

describe("addJSONCacheNode function", () => {

    it("should add a cache node", () => {

        let cache: JSONCache = {
            nodes: []
        };

        {
            const state = {
                startIndex: 1,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);

            equal(cache.nodes.length, 1);
            equal(cache.nodes[0].value, "export_functions");
            equal(cache.nodes[0].state, state);
        }

        {
            const state = {
                startIndex: 50,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);

            equal(cache.nodes.length, 2);
            equal(cache.nodes[1].value, "internal_functions");
            equal(cache.nodes[1].state, state);
        }

        {
            const state = {
                startIndex: 3,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);

            equal(cache.nodes.length, 2);
            equal(cache.nodes[0].value, "export_functions");
            equal(cache.nodes[0].children.length, 1);
            equal(cache.nodes[0].children[0].value, 0);
            equal(cache.nodes[0].children[0].state, state);
        }
    });
});

describe("addJSONCacheNode function", () => {

    it("should add a cache node", () => {

        let cache: JSONCache = {
            nodes: []
        };

        {
            const state = {
                startIndex: 1,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);

            equal(cache.nodes.length, 1);
            equal(cache.nodes[0].value, "export_functions");
            equal(cache.nodes[0].state, state);
        }

        {
            const state = {
                startIndex: 50,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);

            equal(cache.nodes.length, 2);
            equal(cache.nodes[1].value, "internal_functions");
            equal(cache.nodes[1].state, state);
        }

        {
            const state = {
                startIndex: 3,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);

            equal(cache.nodes.length, 2);
            equal(cache.nodes[0].value, "export_functions");
            equal(cache.nodes[0].children.length, 1);
            equal(cache.nodes[0].children[0].value, 0);
            equal(cache.nodes[0].children[0].state, state);
        }
    });
});

describe("removeJSONCacheNode function", () => {

    it("should remove a cache node", () => {

        let cache: JSONCache = {
            nodes: []
        };

        {
            const state = {
                startIndex: 1,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                startIndex: 50,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const state = {
                startIndex: 3,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        equal(cache.nodes.length, 2);
        equal(cache.nodes[0].children.length, 1);

        removeJSONCacheNode(cache, ["export_functions", 0]);
        equal(cache.nodes[0].children.length, 0);

        removeJSONCacheNode(cache, ["export_functions"]);
        equal(cache.nodes.length, 1);

        removeJSONCacheNode(cache, ["internal_functions"]);
        equal(cache.nodes.length, 0);
    });
});

describe("updateJSONCacheAfterEdit function", () => {

    it("should update offsets after edit position", () => {

        let cache: JSONCache = {
            nodes: []
        };

        {
            const state = {
                startIndex: 1,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                startIndex: 50,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const state = {
                startIndex: 3,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        {
            const edit: JSONEdit = {
                range: {
                    startCharacter: 10,
                    endCharacter: 12
                },
                newText: "012345678"
            };

            updateJSONCacheAfterEdit(cache, edit);

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                equal(state.startIndex, 1);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                equal(state.startIndex, 3);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                equal(state.startIndex, 57);
            }
        }

        {
            const edit: JSONEdit = {
                range: {
                    startCharacter: 10,
                    endCharacter: 19
                },
                newText: "0123"
            };

            updateJSONCacheAfterEdit(cache, edit);

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                equal(state.startIndex, 1);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 0]);
                equal(state.startIndex, 3);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                equal(state.startIndex, 54);
            }
        }
    });
});

describe("updateJSONCacheAfterInsert function", () => {

    it("should update offsets after insert position", () => {

        let cache: JSONCache = {
            nodes: []
        };

        {
            const state = {
                startIndex: 1,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                startIndex: 50,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const state = {
                startIndex: 3,
                parserState: {
                    stack: ['{', '['],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions", 0], state);
        }

        {
            const insert: JSONInsert = {
                atCharacter: 3,
                newText: '{"key":"value"},'
            };

            updateJSONCacheAfterArrayInsert(cache, insert);

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                equal(state.startIndex, 1);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 1]);
                equal(state.startIndex, 3 + 16);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                equal(state.startIndex, 50 + 16);
            }
        }
    });
});

describe("updateJSONCacheAfterArrayDelete function", () => {

    it("should update offsets after delete position", () => {

        let cache: JSONCache = {
            nodes: []
        };

        {
            const state = {
                startIndex: 1,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["export_functions"], state);
        }

        {
            const state = {
                startIndex: 50,
                parserState: {
                    stack: ['{'],
                    expectKey: false
                }
            };

            addJSONCacheNode(cache, ["internal_functions"], state);
        }

        {
            const state = {
                startIndex: 3,
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
                    startCharacter: 20,
                    endCharacter: 25
                },
            };

            updateJSONCacheAfterArrayDelete(cache, change);

            {
                const state = getJSONCacheState(cache, ["export_functions"]);
                equal(state.startIndex, 1);
            }

            {
                const state = getJSONCacheState(cache, ["export_functions", 1]);
                equal(state.startIndex, 3);
            }

            {
                const state = getJSONCacheState(cache, ["internal_functions"]);
                equal(state.startIndex, 50 - 5);
            }
        }
    });
});
