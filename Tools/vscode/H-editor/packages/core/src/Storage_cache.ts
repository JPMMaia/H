import * as objectHash from 'object-hash';
import * as fs from 'fs';

export interface Storage_cache {
    path: string;
}

function create_directory(path: string): void {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
}

export function create_storage_cache(path: string): Storage_cache {

    create_directory(path);

    return {
        path: path
    };
}

export function clear_storage_cache(cache: Storage_cache): void {
    fs.rmdirSync(cache.path, { recursive: true });
    fs.mkdirSync(cache.path);
}

export function write(cache: Storage_cache, group: string, key: any, value: string): void {
    const hash = objectHash(key);

    const group_path = `${cache.path}/${group}`;
    const file_path = `${group_path}/${hash}.json`;

    create_directory(group_path);

    const buffer = Buffer.from(value, "utf-8");
    fs.writeFileSync(file_path, buffer);
}

export function read(cache: Storage_cache, group: string, key: any): string | undefined {
    const hash = objectHash(key);

    const group_path = `${cache.path}/${group}`;
    const file_path = `${group_path}/${hash}.json`;

    if (!fs.existsSync(file_path)) {
        return undefined;
    }

    const buffer = fs.readFileSync(file_path);
    const value = buffer.toString("utf-8");
    return value;
}
