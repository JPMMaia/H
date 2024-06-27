import * as fs from "fs";
import * as path from "path";

export function get_default_c_header_search_paths(): string[] {
    const platform = process.platform;
    if (platform === 'win32') {

        const paths: string[] = [];

        const windows_kit_include_path = "C:/Program Files (x86)/Windows Kits/10/Include/";
        if (fs.existsSync(windows_kit_include_path)) {
            const entries = fs.readdirSync(windows_kit_include_path);
            if (entries.length > 0) {
                entries.sort();
                const version = entries[entries.length - 1];

                const ucrt_path = path.join(windows_kit_include_path, version, "ucrt");

                if (fs.existsSync(ucrt_path)) {
                    paths.push(ucrt_path);
                }
            }
        }

        return paths;
    } else if (platform === 'linux') {
        return [
            "/usr/include",
            "/usr/local/include"
        ];
    }
    else {
        return [];
    }
}
