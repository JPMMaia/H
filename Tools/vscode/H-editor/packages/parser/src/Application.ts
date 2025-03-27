import * as fs from 'fs';

import * as Core from "../../core/src/Core_interface";
import * as Core_intermediate_representation from "../../core/src/Core_intermediate_representation";
import * as Language_version from "../../core/src/Language_version";
import * as Text_change from "../../core/src/Text_change";
import * as Text_formatter from "../../core/src/Text_formatter";
import * as Tree_sitter_parser from "../../core/src/Tree_sitter_parser";
import * as Validation from "../../core/src/Validation";

const command = process.argv[2];

if (command === "read") {

    const input_file = process.argv[3];
    const input_json = fs.readFileSync(input_file, "utf8");

    const core_module = JSON.parse(input_json) as Core.Module;
    const module = Core_intermediate_representation.create_intermediate_representation(core_module);

    const output_text = Text_formatter.format_module(module, {});

    process.stdout.write(output_text);
    process.exit(0);
}
else if (command === "write") {

    const input_file_argument_index = process.argv.findIndex(argument => argument === "--input");
    const input_file = input_file_argument_index !== -1 ? process.argv[input_file_argument_index + 1] : undefined;
    const input_text = input_file !== undefined ? fs.readFileSync(input_file, "utf8") : process.stdin.read() as string;

    const output_file = process.argv[3];

    Tree_sitter_parser.create_parser().then(
        (parser: Tree_sitter_parser.Parser) => {
            const parse_result = Text_change.full_parse_with_source_locations(parser, input_file !== undefined ? input_file : "", input_text);
            if (parse_result.module === undefined) {
                const messages = Validation.to_string(parse_result.diagnostics).join("\n");
                console.log(messages);
                process.exit(-1);
            }

            const core_module = Core_intermediate_representation.create_core_module(parse_result.module, Language_version.language_version);

            const output_json = JSON.stringify(core_module);

            fs.writeFileSync(output_file, output_json);
            console.log(`Created '${output_file}'`);
            process.exit(0);
        }
    ).catch((error) => {
        console.log(`Failed to write to '${output_file}': Error ${error}`);
        process.exit(-1);
    });
}
else {
    process.exit(-1);
}
