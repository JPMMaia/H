import type * as Core from "../../../../src/utilities/coreModelInterface";

export enum Item_type {
    Alias,
    Enum,
    Struct,
    Function
}

export interface Item {
    is_export: boolean;
    type: Item_type;
    index: number;
}

export function get_all_items(module: Core.Module): Item[] {

    const items: Item[] = [];

    const add_items = (type: Item_type, elements: any[], is_export: boolean) => {
        for (let index = 0; index < elements.length; ++index) {
            items.push({
                is_export: is_export,
                type: type,
                index: index
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

export function get_item_type_vector(module: Core.Module, item: Item): Core.Vector<Core.Alias_type_declaration | Core.Enum_declaration | Core.Struct_declaration | Core.Function_declaration> {
    switch (item.type) {
        case Item_type.Alias:
            return item.is_export ? module.export_declarations.alias_type_declarations : module.internal_declarations.alias_type_declarations;
        case Item_type.Enum:
            return item.is_export ? module.export_declarations.enum_declarations : module.internal_declarations.enum_declarations;
        case Item_type.Struct:
            return item.is_export ? module.export_declarations.struct_declarations : module.internal_declarations.struct_declarations;
        case Item_type.Function:
            return item.is_export ? module.export_declarations.function_declarations : module.internal_declarations.function_declarations;
    }
}

export function get_item_value(module: Core.Module, item: Item): Core.Alias_type_declaration | Core.Enum_declaration | Core.Struct_declaration | Core.Function_declaration {
    const vector = get_item_type_vector(module, item);
    return vector.elements[item.index];
}

export function get_declaration_id_name(module: Core.Module, item: Item): string {
    const value = get_item_value(module, item);
    return item.type.toString() + "." + value.id;
}

export function find_item_index(module: Core.Module, items: Item[], item_id: number): number | undefined {
    const item_index = items.findIndex(current_item => get_item_value(module, current_item).id === item_id);
    return item_index >= 0 ? item_index : undefined;
} 
