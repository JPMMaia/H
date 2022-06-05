import { JSONDelete, JSONEdit, JSONInsert } from "./editJSON";
import { ParserState } from "./parseJSON";

interface StateCache {
    startIndex: number;
    parserState: ParserState;
}

interface CacheNode {
    value: number | string;
    children: CacheNode[];
    state: StateCache
}

export interface JSONCache {
    nodes: CacheNode[];
}

export function addJSONCacheNode(cache: JSONCache, position: any[], state: StateCache): void {

}

export function removeJSONCacheNode(cache: JSONCache, position: any[]): void {

}

export function getJSONCacheState(cache: JSONCache, position: any[]): StateCache {
    return {
        startIndex: 0,
        parserState: {
            stack: [],
            expectKey: false
        }
    };
}

export function updateJSONCacheAfterEdit(cache: JSONCache, edit: JSONEdit): void {

}

export function updateJSONCacheAfterArrayInsert(cache: JSONCache, edit: JSONInsert): void {

}

export function updateJSONCacheAfterArrayDelete(cache: JSONCache, edit: JSONDelete): void {

}
