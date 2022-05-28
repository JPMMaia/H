import { getObjectAtPosition } from './parseJSON';
import type { ObjectReference } from './parseJSON';

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
}
