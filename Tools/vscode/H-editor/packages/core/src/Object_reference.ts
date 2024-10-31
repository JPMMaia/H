export interface Object_reference {
    get value(): any;
    set value(value: any);
    is_valid(): boolean;
}

export function get_object_reference_at_position(object: any, position: any[]): Object_reference {

    if (position.length === 1) {
        return {
            get value() {
                return object[position[0]];;
            },
            set value(value: any) {
                object[position[0]] = value;
            },
            is_valid() {
                return object.hasOwnProperty(position[0]);
            }
        };
    }

    const first_key = position[0];
    const child = object[first_key];

    const remainder_keys = position.slice(1, position.length);

    return get_object_reference_at_position(child, remainder_keys);
}
