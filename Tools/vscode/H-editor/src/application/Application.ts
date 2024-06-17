import * as fs from 'fs';

import * as Core from "../core/Core_interface";
import * as Core_intermediate_representation from "../core/Core_intermediate_representation";
import * as Language from "../core/Language";
import * as Language_version from "../core/Language_version";
import * as Parse_tree_convertor from "../core/Parse_tree_convertor";
import * as Parse_tree_text_iterator from "../core/Parse_tree_text_iterator";
import * as Parser from "../core/Parser";
import * as Scanner from "../core/Scanner";
import * as Storage_cache from "../core/Storage_cache";
import * as Text_formatter from "../core/Text_formatter";
import * as Validation from "../core/Validation";

const command = process.argv[2];

const cache = Storage_cache.create_storage_cache("out/tests/language_description_cache");

if (command === "read") {

    const input_file = process.argv[3];
    const input_json = fs.readFileSync(input_file, "utf8");

    const core_module = JSON.parse(input_json) as Core.Module;
    const module = Core_intermediate_representation.create_intermediate_representation(core_module);

    const language_description = Language.create_default_description(cache);
    const parse_tree = Parse_tree_convertor.module_to_parse_tree(module, language_description.production_rules, language_description.mappings);

    const output_text = parse_tree !== undefined ? Text_formatter.to_string(parse_tree, undefined, []) : "";

    process.stdout.write(output_text);
}
else if (command === "write") {

    const input_file_argument_index = process.argv.findIndex(argument => argument === "--input");
    const input_file = input_file_argument_index !== -1 ? process.argv[input_file_argument_index + 1] : undefined;
    const input_text = input_file !== undefined ? fs.readFileSync(input_file, "utf8") : process.stdin.read() as string;

    const language_description = Language.create_default_description(cache);
    const scanned_words = Scanner.scan(input_text, 0, input_text.length, { line: 1, column: 1 });

    const parse_tree_result = Parser.parse_incrementally(
        input_file,
        undefined,
        undefined,
        scanned_words,
        undefined,
        language_description.actions_table,
        language_description.go_to_table,
        language_description.array_infos,
        language_description.map_word_to_terminal
    );

    if (parse_tree_result.status !== Parser.Parse_status.Accept) {
        const messages = Validation.to_string(parse_tree_result.diagnostics).join("\n");
        console.log(messages);
        process.exit(-1);
    }

    const parse_tree = (parse_tree_result.changes[0].value as Parser.Modify_change).new_node;
    Parse_tree_text_iterator.add_source_locations_to_parse_tree_nodes(parse_tree, input_text);

    const module = Parse_tree_convertor.parse_tree_to_module(parse_tree, language_description.production_rules, language_description.mappings, language_description.key_to_production_rule_indices);
    const core_module = Core_intermediate_representation.create_core_module(module, Language_version.language_version);

    if (input_file !== undefined) {
        core_module.source_file_path = input_file.replace("\\", "/");
    }

    const output_json = JSON.stringify(core_module);
    const output_file = process.argv[3];

    fs.writeFileSync(output_file, output_json);
}

process.exit();
