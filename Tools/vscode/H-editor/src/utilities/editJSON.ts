import { fromPositionToOffset, ParserState } from "./parseJSON";

export interface JSONRange {
    startCharacter: number;
    endCharacter: number;
}

export interface JSONInsert {
    atCharacter: number,
    newText: string
}

export interface JSONDelete {
    range: JSONRange
}

export interface JSONEdit {
    range: JSONRange;
    newText: string;
}

export function createUpdateValueEdit(parserState: ParserState, text: string, startIndex: number, startPosition: any[], position: any[], newText: string): JSONEdit {

    const result = fromPositionToOffset(parserState, text, startIndex, startPosition, position);

    result.offset;

    return {
        range: {
            startCharacter: 0,
            endCharacter: 0
        },
        newText: newText
    };
}