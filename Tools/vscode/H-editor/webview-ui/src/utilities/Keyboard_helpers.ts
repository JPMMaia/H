export function is_letter(key: string): boolean {
    return (key >= 'a' && key <= 'z') || (key >= 'A' && key <= 'Z');
}

export function is_number(key: string): boolean {
    return (key >= '0' && key <= '9');
}
