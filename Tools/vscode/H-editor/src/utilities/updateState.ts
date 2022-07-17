import { getObjectAtPosition } from './parseJSON';
import type { ObjectReference } from './parseJSON';

function copyArrayWithoutLastElement(array: any[]): any[] {
    const newArray = [...array];
    newArray.splice(newArray.length - 1, 1);
    return newArray;
}

export function updateState(stateReference: ObjectReference, message: any) {

    if (message.command === "initialize") {
        stateReference.value = message.data;
    }
    else if (message.command === "update") {
        const data = message.data;
        const position = data.hPosition;

        let reference = getObjectAtPosition(stateReference.value, position);
        reference.value = data.text;
    }
    else if (message.command === "insert") {
        const data = message.data;
        const position = data.hPosition;

        const indexInArray: number = position[position.length - 1];
        const arrayPosition = copyArrayWithoutLastElement(position);

        let reference = getObjectAtPosition(stateReference.value, arrayPosition);
        reference.value.splice(indexInArray, 0, data.value);
    }
    else if (message.command === "delete") {
        const data = message.data;
        const position = data.hPosition;

        const indexInArray: number = position[position.length - 1];
        const arrayPosition = copyArrayWithoutLastElement(position);

        let reference = getObjectAtPosition(stateReference.value, arrayPosition);
        reference.value.splice(indexInArray, 1);
    }
}
