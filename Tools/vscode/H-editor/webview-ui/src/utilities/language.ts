export function get_type_name(type: any): String {
    if ("fundamental_type" in type) {
        return type.fundamental_type;
    }
    else {
        throw "Invalid type";
    }
}
