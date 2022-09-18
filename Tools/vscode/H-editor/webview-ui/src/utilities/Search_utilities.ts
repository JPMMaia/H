import * as core from "../../../src/utilities/coreModelInterface";
import * as coreInterfaceHelpers from "../../../src/utilities/coreModelInterfaceHelpers";
import type { Search_entry } from "./Search_entry";
import * as nameUtilities from "./Name_utilities";

export function get_fundamental_types_search_entries(): Search_entry[] {

    const entries = Object.keys(core.Fundamental_type).map(
        (value, index): Search_entry => {
            return {
                id: index,
                name: value,
                icon: "codicon-symbol-numeric",
                data: {
                    type: core.Type_reference_enum.Fundamental_type
                }
            };
        }
    )

    return entries;
}

export function get_byte_aligned_signed_integer_types_search_entries(): Search_entry[] {

    const signed_entries = [8, 16, 32, 64].map(
        (value): Search_entry => {
            return {
                id: -value,
                name: nameUtilities.get_integer_name({ number_of_bits: value, is_signed: true }),
                icon: "codicon-symbol-numeric",
                data: {
                    type: core.Type_reference_enum.Integer_type
                }
            };
        }
    );

    return signed_entries;
};

export function get_byte_aligned_unsigned_integer_types_search_entries(): Search_entry[] {

    const unsigned_entries = [8, 16, 32, 64].map(
        (value): Search_entry => {
            return {
                id: value,
                name: nameUtilities.get_integer_name({ number_of_bits: value, is_signed: false }),
                icon: "codicon-symbol-numeric",
                data: {
                    type: core.Type_reference_enum.Integer_type
                }
            };
        }
    );

    return unsigned_entries;
};

export function get_byte_aligned_integer_types_search_entries(): Search_entry[] {

    return [
        ...get_byte_aligned_signed_integer_types_search_entries(),
        ...get_byte_aligned_unsigned_integer_types_search_entries()
    ];
};

export function get_other_visible_types_for_module_search_entries(module: core.Module): Search_entry[] {

    const types = coreInterfaceHelpers.getVisibleOtherTypesForModule(module);

    const alias_entries = types.aliasTypes.map(
        (value): Search_entry => {
            return {
                id: value.id,
                name: value.name,
                icon: "codicon-symbol-parameter",
                data: {
                    type: core.Type_reference_enum.Alias_type_reference,
                    module_name: module.name
                }
            }
        }
    );

    const enum_entries = types.enumTypes.map(
        (value): Search_entry => {
            return {
                id: value.id,
                name: value.name,
                icon: "codicon-symbol-enum",
                data: {
                    type: core.Type_reference_enum.Enum_type_reference,
                    module_name: module.name
                }
            }
        }
    );

    const struct_entries = types.enumTypes.map(
        (value): Search_entry => {
            return {
                id: value.id,
                name: value.name,
                icon: "codicon-symbol-namespace",
                data: {
                    type: core.Type_reference_enum.Struct_type_reference,
                    module_name: module.name
                }
            }
        }
    );

    return {
        ...alias_entries,
        ...enum_entries,
        ...struct_entries
    };
}