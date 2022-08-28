import { JSONDelete, JSONEdit, JSONInsert } from "./editJSON";
import { onThrowError } from "./errors";
import { iterateThroughJSONStringUsingPosition, ParserState } from "./parseJSON";

interface StateCache {
    offsetFromParent: number;
    size: number,
    parserState: ParserState;
}

interface CacheNode {
    value: number | string;
    children: CacheNode[];
    state: StateCache
}

export interface JSONCache {
    rootNode: CacheNode;
}

export function createEmptyJSONCache(): JSONCache {
    return {
        rootNode: {
            value: "root",
            children: [],
            state: {
                offsetFromParent: 0,
                size: 2,
                parserState: {
                    stack: [],
                    expectKey: false
                }
            }
        }
    };
}

function areArraysEqual(array0: any[], array1: any[]): boolean {
    return array0.length === array1.length && array0.every((value, index) => value === array1[index]);
}

function calculateOffsetFromParent(cache: JSONCache, position: any[], currentOffset: number): number {

    if (position.length === 1) {
        return currentOffset;
    }

    const parentState = getJSONCacheState(cache, position.slice(0, position.length - 1));

    if (parentState === undefined) {
        const message = "Parent is missing from cache!";
        onThrowError(message);
        throw Error(message);
    }

    return currentOffset - parentState.offsetFromParent;
}

export function createJSONCache(text: string, keysToCache: any[]): JSONCache {

    const cache = createEmptyJSONCache();

    let currentKeyIndex = 0;

    let parserState = {
        stack: [],
        expectKey: false
    };

    let currentOffset = 0;

    let currentPosition: any[] = [];

    while (currentKeyIndex < keysToCache.length && currentOffset < text.length) {

        const result = iterateThroughJSONStringUsingPosition(parserState, currentPosition, text, currentOffset);

        if (areArraysEqual(keysToCache[currentKeyIndex], currentPosition)) {

            const offsetFromParent = calculateOffsetFromParent(cache, currentPosition, currentOffset);

            const cacheState = {
                offsetFromParent: offsetFromParent,
                size: 2,
                parserState: JSON.parse(JSON.stringify(parserState))
            };

            addJSONCacheNode(cache, currentPosition, cacheState);

            currentKeyIndex += 1;
        }

        const textSize = result.nextStartIndex - currentOffset;
        updateJSONCacheStateOffsetsAndSizes(cache, currentPosition, textSize);

        currentOffset = result.nextStartIndex;
    }

    return cache;
}

function updateJSONCacheStateOffsetsAndSizes(cache: JSONCache, position: any[], deltaSize: number): void {

    cache.rootNode.state.size += deltaSize;

    let currentNode = cache.rootNode;

    for (let index = 0; index < position.length; ++index) {

        const currentPosition = position[index];

        const nextNodeIndex = currentNode.children.findIndex(childNode => childNode.value === currentPosition);

        if (nextNodeIndex !== -1) {
            const nextNode = currentNode.children[nextNodeIndex];
            nextNode.state.size += deltaSize;

            for (let siblingNodeIndex = nextNodeIndex + 1; siblingNodeIndex < currentNode.children.length; ++siblingNodeIndex) {
                const siblingNode = currentNode.children[siblingNodeIndex];
                siblingNode.state.offsetFromParent += deltaSize;
            }

            currentNode = nextNode;
        }
    }

}

export function addJSONCacheNode(cache: JSONCache, position: any[], state: StateCache): void {

    if (position.length === 0) {
        return;
    }

    const lastPosition = position[position.length - 1];
    const isArrayInsert = typeof lastPosition === "number";

    let currentNode = cache.rootNode;

    for (let index = 0; index < position.length; ++index) {

        const currentPosition = position[index];

        const nextNode = currentNode.children.find(childNode => childNode.value === currentPosition);

        if (nextNode === undefined && ((index + 1) !== position.length)) {
            const message = "Parent not found in cache";
            onThrowError(message);
            throw Error(message);
        }

        if ((nextNode === undefined) || (isArrayInsert && ((index + 1) === position.length))) {
            const newCacheNode: CacheNode = {
                value: position[index],
                children: [],
                state: state
            };

            const newCacheNodeIndex = currentNode.children.findIndex(childNode => childNode.state.offsetFromParent >= state.offsetFromParent);

            if (newCacheNodeIndex === -1) {
                currentNode.children.push(newCacheNode);
            }
            else {
                currentNode.children.splice(newCacheNodeIndex, 0, newCacheNode);

                if (isArrayInsert) {
                    for (let childNodeIndex = newCacheNodeIndex + 1; childNodeIndex < currentNode.children.length; ++childNodeIndex) {
                        let childNode = currentNode.children[childNodeIndex];
                        if (typeof childNode.value === "number") {
                            childNode.value += 1;
                        }
                    }
                }
            }

            {
                const lastPosition = position[position.length - 1];

                const sizeOfBlock = typeof lastPosition === "number" ?
                    state.size :
                    1 + lastPosition.length + 1 + 1 + state.size;

                const sizeOfBlockPlusPossibleComma = currentNode.children.length > 1 ? sizeOfBlock + 1 : sizeOfBlock;

                //updateJSONCacheStateOffsetsAndSizes(cache, position.slice(0, position.length - 1), sizeOfBlockPlusPossibleComma);
            }
            return;
        }

        currentNode = nextNode;
    }
}

export function removeJSONCacheNode(cache: JSONCache, position: any[]): void {

    if (position.length === 0) {
        return;
    }

    let currentNode = cache.rootNode;

    for (let index = 0; index < position.length - 1; ++index) {

        const currentPosition = position[index];

        const nextNode = currentNode.children.find(childNode => childNode.value === currentPosition);

        if (nextNode === undefined) {
            return;
        }

        currentNode = nextNode;
    }

    const lastPosition = position[position.length - 1];
    const cacheNodeToDeleteIndex = currentNode.children.findIndex(childNode => childNode.value === lastPosition);

    if (cacheNodeToDeleteIndex !== -1) {

        const isArrayDelete = typeof lastPosition === "number";

        {
            const state = currentNode.children[cacheNodeToDeleteIndex].state;

            const sizeOfBlock = isArrayDelete ?
                state.size :
                1 + lastPosition.length + 1 + 1 + state.size;

            const sizeOfBlockPlusPossibleComma = currentNode.children.length > 1 ? sizeOfBlock + 1 : sizeOfBlock;

            updateJSONCacheStateOffsetsAndSizes(cache, position.slice(0, position.length - 1), -sizeOfBlockPlusPossibleComma);
        }

        currentNode.children.splice(cacheNodeToDeleteIndex, 1);

        if (isArrayDelete) {
            for (let childNodeIndex = cacheNodeToDeleteIndex; childNodeIndex < currentNode.children.length; ++childNodeIndex) {
                let childNode = currentNode.children[childNodeIndex];
                if (typeof childNode.value === "number") {
                    childNode.value -= 1;
                }
            }
        }
    }
}

export function hasJSONCacheNode(cache: JSONCache, position: any[]): boolean {
    return getJSONCacheState(cache, position) !== undefined;
}

export function getJSONCacheState(cache: JSONCache, position: any[]): StateCache | undefined {

    if (position.length === 0) {
        return cache.rootNode.state;
    }

    let currentNode = cache.rootNode;

    for (let index = 0; index < position.length; ++index) {

        const currentPosition = position[index];

        const nextNode = currentNode.children.find(childNode => childNode.value === currentPosition);

        if (nextNode === undefined) {
            return undefined;
        }

        currentNode = nextNode;
    }

    return currentNode.state;
}

export function updateJSONCacheAfterEdit(cache: JSONCache, edit: JSONEdit): void {

    const editIndexDifference = edit.newText.length - (edit.range.endCharacter - edit.range.startCharacter);

    let currentNode = cache.rootNode;
    let currentOffset = cache.rootNode.state.offsetFromParent;

    while (true) {
        const startNodeIndex = currentNode.children.findIndex(childNode => (currentOffset + childNode.state.offsetFromParent) > edit.range.startCharacter);

        if (startNodeIndex === -1) {
            return;
        }

        for (let nodeIndex = startNodeIndex; nodeIndex < currentNode.children.length; ++nodeIndex) {
            const childNode = currentNode.children[nodeIndex];
            childNode.state.offsetFromParent += editIndexDifference;
        }

        if (startNodeIndex === 0) {
            return;
        }

        currentNode = currentNode.children[startNodeIndex - 1];
        currentOffset += currentNode.state.offsetFromParent;
    }
}

function insertCacheNode(cache: JSONCache, position: any[], parent: CacheNode, index: number, node: CacheNode, textSize: number): void {

    if (index < parent.children.length) {
        parent.children.splice(index, 0, node);
    }
    else {
        parent.children.push(node);
    }

    for (let childNodeIndex = index + 1; childNodeIndex < parent.children.length; ++childNodeIndex) {
        let childNode = parent.children[childNodeIndex];
        if (typeof childNode.value === "number") {
            childNode.value += 1;
        }

        childNode.state.offsetFromParent += textSize;
    }

    updateJSONCacheStateOffsetsAndSizes(cache, position, textSize);
}

function deleteCacheNode(cache: JSONCache, position: any[], parent: CacheNode, indexToDelete: number, textSize: number): void {

    parent.children.splice(indexToDelete, 1);

    for (let childNodeIndex = indexToDelete; childNodeIndex < parent.children.length; ++childNodeIndex) {
        let childNode = parent.children[childNodeIndex];
        if (typeof childNode.value === "number") {
            childNode.value -= 1;
        }

        childNode.state.offsetFromParent -= textSize;
    }

    updateJSONCacheStateOffsetsAndSizes(cache, position, -textSize);
}

export function updateJSONCacheAfterArrayInsert(cache: JSONCache, edit: JSONInsert): void {

    let currentNode = cache.rootNode;
    let currentOffset = cache.rootNode.state.offsetFromParent;
    let currentPosition: any[] = [];

    while (true) {

        const nextNodeIndex = currentNode.children.findIndex(childNode => ((currentOffset + childNode.state.offsetFromParent) <= edit.atCharacter) && (edit.atCharacter < (currentOffset + childNode.state.offsetFromParent + childNode.state.size)));

        // Insert to the end:
        if (nextNodeIndex === -1) {

            const childIndex = currentNode.children.length;

            const newOffsetFromParent =
                currentNode.children.length === 0 ?
                    1 :
                    currentNode.children[currentNode.children.length - 1].state.offsetFromParent + currentNode.children[currentNode.children.length - 1].state.size + ','.length;

            const blockSizeWithoutPossibleComma = currentNode.children.length === 0 ? edit.newText.length : edit.newText.length - 1;

            const newCacheNode: CacheNode = {
                value: childIndex,
                children: [],
                state: {
                    offsetFromParent: newOffsetFromParent,
                    size: blockSizeWithoutPossibleComma,
                    parserState: {
                        stack: currentNode.state.parserState.stack.concat(['[']),
                        expectKey: false
                    }
                }
            };

            insertCacheNode(cache, currentPosition, currentNode, childIndex, newCacheNode, edit.newText.length);
            return;
        }

        const nextNode = currentNode.children[nextNodeIndex];

        // Insert at:
        if ((currentOffset + nextNode.state.offsetFromParent) === edit.atCharacter) {

            const childIndex = nextNodeIndex;

            const blockSizeWithoutComma = edit.newText.length - 1;

            const newCacheNode: CacheNode = {
                value: childIndex,
                children: [],
                state: {
                    offsetFromParent: nextNode.state.offsetFromParent,
                    size: blockSizeWithoutComma,
                    parserState: {
                        stack: currentNode.state.parserState.stack.concat(['[']),
                        expectKey: false
                    }
                }
            };

            insertCacheNode(cache, currentPosition, currentNode, childIndex, newCacheNode, edit.newText.length);
            return;
        }

        currentNode = nextNode;
        currentOffset += currentNode.state.offsetFromParent;
        currentPosition.push(currentNode.value);
    }
}

export function updateJSONCacheAfterArrayDelete(cache: JSONCache, edit: JSONDelete): void {

    let currentNode = cache.rootNode;
    let currentOffset = cache.rootNode.state.offsetFromParent;
    let currentPosition: any[] = [];

    while (true) {

        const nextNodeIndex = currentNode.children.findIndex(childNode => ((currentOffset + childNode.state.offsetFromParent) <= edit.range.startCharacter) && (edit.range.startCharacter < (currentOffset + childNode.state.offsetFromParent + childNode.state.size)));

        if (nextNodeIndex === -1) {
            const message = "Could not find which element to delete!";
            onThrowError(message);
            throw Error(message);
        }

        const nextNode = currentNode.children[nextNodeIndex];

        // Delete at:
        if ((currentOffset + nextNode.state.offsetFromParent) === edit.range.startCharacter) {

            const nodeIndexToDelete = nextNodeIndex;

            deleteCacheNode(cache, currentPosition, currentNode, nodeIndexToDelete, edit.range.endCharacter - edit.range.startCharacter);
            return;
        }

        currentNode = nextNode;
        currentOffset += currentNode.state.offsetFromParent;
        currentPosition.push(currentNode.value);
    }
}
