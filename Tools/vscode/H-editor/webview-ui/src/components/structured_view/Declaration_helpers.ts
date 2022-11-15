import type * as Core from "../../../../src/utilities/coreModelInterface";

export enum Item_type {
    Alias,
    Enum,
    Struct,
    Function
}

export interface Item {
    type: Item_type;
    value: Core.Alias_type_declaration | Core.Enum_declaration | Core.Struct_declaration | Core.Function_declaration;
    index: number;
    is_export: boolean;
}

export function get_all_items(module: Core.Module): Item[] {

    const items: Item[] = [];

    const add_items = (type: Item_type, elements: any[], is_export: boolean) => {
        for (let index = 0; index < elements.length; ++index) {
            const value = elements[index];
            items.push({
                type: type,
                value: value,
                index: index,
                is_export: is_export
            });
        }
    };

    add_items(Item_type.Alias, module.export_declarations.alias_type_declarations.elements, true);
    add_items(Item_type.Enum, module.export_declarations.enum_declarations.elements, true);
    add_items(Item_type.Struct, module.export_declarations.struct_declarations.elements, true);
    add_items(Item_type.Function, module.export_declarations.function_declarations.elements, true);
    add_items(Item_type.Alias, module.internal_declarations.alias_type_declarations.elements, false);
    add_items(Item_type.Enum, module.internal_declarations.enum_declarations.elements, false);
    add_items(Item_type.Struct, module.internal_declarations.struct_declarations.elements, false);
    add_items(Item_type.Function, module.internal_declarations.function_declarations.elements, false);

    return items;
}

export function get_item_type_vector_name(type: Item_type): string {
    switch (type) {
        case Item_type.Alias:
            return "alias_type_declarations";
        case Item_type.Enum:
            return "enum_declarations";
        case Item_type.Struct:
            return "struct_declarations";
        case Item_type.Function:
            return "function_declarations";
    }
}
