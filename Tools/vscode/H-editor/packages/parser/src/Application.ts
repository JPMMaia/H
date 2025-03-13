import * as fs from 'fs';

import * as Core from "../../core/src/Core_interface";
import * as Core_intermediate_representation from "../../core/src/Core_intermediate_representation";
import * as Language from "../../core/src/Language";
import * as Language_version from "../../core/src/Language_version";
import * as Parse_tree_convertor from "../../core/src/Parse_tree_convertor";
import * as Storage_cache from "../../core/src/Storage_cache";
import * as Text_change from "../../core/src/Text_change";
import * as Text_formatter from "../../core/src/Text_formatter";
import * as Tree_sitter_parser from "../../core/src/Tree_sitter_parser";
import * as Validation from "../../core/src/Validation";

const command = process.argv[2];

const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");

if (command === "read") {

    const input_file = process.argv[3];
    const input_json = fs.readFileSync(input_file, "utf8");

    const core_module = JSON.parse(input_json) as Core.Module;
    const module = Core_intermediate_representation.create_intermediate_representation(core_module);

    Language.create_default_description(cache).then(
        (language_description: Language.Description) => {
            const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, language_description.production_rules, language_description.mappings);

            const output_text = parse_tree !== undefined ? Text_formatter.to_unformatted_text(parse_tree) : "";

            process.stdout.write(output_text);
            process.exit();
        }
    ).catch(() => process.exit(-1));
}
else if (command === "write") {

    const input_file_argument_index = process.argv.findIndex(argument => argument === "--input");
    const input_file = input_file_argument_index !== -1 ? process.argv[input_file_argument_index + 1] : undefined;
    const input_text = input_file !== undefined ? fs.readFileSync(input_file, "utf8") : process.stdin.read() as string;

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
            const output_file = process.argv[3];

            fs.writeFileSync(output_file, output_json);
            process.exit();
        }
    ).catch(() => process.exit(-1));
}
else {
    process.exit(-1);
}
