import * as Core_intermediate_representation from "../core/Core_intermediate_representation";
import * as Language from "../core/Language";
import * as Language_version from "../core/Language_version";
import * as Parse_tree_convertor from "../core/Parse_tree_convertor";
import * as Parser from "../core/Parser";
import * as Scanner from "../core/Scanner";

export function parse(input_text: string): string {
    const language_description = Language.create_default_description();
    const scanned_words = Scanner.scan(input_text, 0, input_text.length);

    const parse_tree_result = Parser.parse_incrementally(
        undefined,
        undefined,
        scanned_words,
        undefined,
        language_description.actions_table,
        language_description.go_to_table,
        language_description.array_infos,
        language_description.map_word_to_terminal
    );

    if (parse_tree_result.status === Parser.Parse_status.Accept) {
        const messages = parse_tree_result.messages.join("\n");
        throw Error(`Failed to parse:\n${messages}`);
    }

    const parse_tree = (parse_tree_result.changes[0].value as Parser.Modify_change).new_node;

    const module = Parse_tree_convertor.parse_tree_to_module(parse_tree, language_description.production_rules, language_description.mappings, language_description.key_to_production_rule_indices);
    const core_module = Core_intermediate_representation.create_core_module(module, Language_version.language_version);

    const output_json = JSON.stringify(core_module);
    return output_json;
}
