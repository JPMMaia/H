module;

#include <memory_resource>
#include <optional>
#include <string>
#include <span>
#include <unordered_map>
#include <utility>
#include <variant>

module h.core.declarations;

import h.core;

namespace h
{
    Declaration_database create_declaration_database()
    {
        return {};
    }

    void add_declarations(
        Declaration_database& database,
        std::string_view const module_name,
        std::span<h::Alias_type_declaration const> const alias_type_declarations,
        std::span<h::Enum_declaration const> const enum_declarations,
        std::span<h::Struct_declaration const> const struct_declarations,
        std::span<h::Union_declaration const> const union_declarations,
        std::span<h::Function_declaration const> const function_declarations
    )
    {
        Declaration_map& map = database.map[module_name.data()];

        for (Alias_type_declaration const& declaration : alias_type_declarations)
        {
            map.insert(std::make_pair(declaration.name, Declaration{ .data = &declaration }));
        }

        for (Enum_declaration const& declaration : enum_declarations)
        {
            map.insert(std::make_pair(declaration.name, Declaration{ .data = &declaration }));
        }

        for (Function_declaration const& declaration : function_declarations)
        {
            map.insert(std::make_pair(declaration.name, Declaration{ .data = &declaration }));
        }

        for (Struct_declaration const& declaration : struct_declarations)
        {
            map.insert(std::make_pair(declaration.name, Declaration{ .data = &declaration }));
        }

        for (Union_declaration const& declaration : union_declarations)
        {
            map.insert(std::make_pair(declaration.name, Declaration{ .data = &declaration }));
        }
    }

    void add_declarations(
        Declaration_database& database,
        Module const& module
    )
    {
        add_declarations(
            database,
            module.name,
            module.export_declarations.alias_type_declarations,
            module.export_declarations.enum_declarations,
            module.export_declarations.struct_declarations,
            module.export_declarations.union_declarations,
            module.export_declarations.function_declarations
        );

        add_declarations(
            database,
            module.name,
            module.internal_declarations.alias_type_declarations,
            module.internal_declarations.enum_declarations,
            module.internal_declarations.struct_declarations,
            module.internal_declarations.union_declarations,
            module.internal_declarations.function_declarations
        );
    }

    std::optional<Declaration> find_declaration(
        Declaration_database const& database,
        std::string_view const module_name,
        std::string_view const declaration_name
    )
    {
        auto const declaration_map_location = database.map.find(module_name.data());
        if (declaration_map_location == database.map.end())
            return std::nullopt;

        Declaration_map const& declaration_map = declaration_map_location->second;
        auto const declaration_location = declaration_map.find(declaration_name.data());
        if (declaration_location == declaration_map.end())
            return std::nullopt;

        return declaration_location->second;
    }

    void set_custom_type_reference_module_name_if_not_set(
        Type_reference& type_reference,
        std::string_view const module_name
    )
    {
        if (std::holds_alternative<Custom_type_reference>(type_reference.data))
        {
            Custom_type_reference& data = std::get<Custom_type_reference>(type_reference.data);
            if (data.module_reference.name.empty())
                data.module_reference.name = module_name;
        }
    }

    std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        std::string_view const current_module_name,
        Type_reference const& type_reference
    )
    {
        if (std::holds_alternative<Custom_type_reference>(type_reference.data))
        {
            Custom_type_reference const& data = std::get<Custom_type_reference>(type_reference.data);
            std::string_view const module_name = data.module_reference.name.empty() ? current_module_name : std::string_view{ data.module_reference.name };
            Declaration_map const& declaration_map = declaration_database.map.at(module_name.data());
            Declaration const& declaration = declaration_map.at(data.name);
            if (std::holds_alternative<Alias_type_declaration const*>(declaration.data))
            {
                Alias_type_declaration const* alias_declaration = std::get<Alias_type_declaration const*>(declaration.data);
                std::optional<Type_reference> alias_type = get_underlying_type(declaration_database, module_name, *alias_declaration);
                return alias_type;
            }
            else
            {
                Type_reference fixed_type_reference = type_reference;
                set_custom_type_reference_module_name_if_not_set(fixed_type_reference, module_name);
                return type_reference;
            }
        }
        else
        {
            return type_reference;
        }
    }

    std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        std::string_view const current_module_name,
        Alias_type_declaration const& declaration
    )
    {
        if (declaration.type.empty())
            return std::nullopt;

        return get_underlying_type(declaration_database, current_module_name, declaration.type[0]);
    }

    std::optional<Declaration> get_underlying_declaration(
        Declaration_database const& declaration_database,
        std::string_view current_module_name,
        Alias_type_declaration const& declaration
    )
    {
        std::optional<Type_reference> const type_reference = get_underlying_type(declaration_database, current_module_name, declaration);
        if (type_reference.has_value())
        {
            if (std::holds_alternative<Custom_type_reference>(type_reference.value().data))
            {
                Custom_type_reference const& data = std::get<Custom_type_reference>(type_reference.value().data);
                std::string_view const module_name = data.module_reference.name.empty() ? current_module_name : std::string_view{ data.module_reference.name };
                std::optional<Declaration> const underlying_declaration = find_declaration(declaration_database, module_name, data.name);
                if (underlying_declaration.has_value())
                {
                    Declaration const& underlying_declaration_value = underlying_declaration.value();
                    if (std::holds_alternative<Alias_type_declaration const*>(underlying_declaration_value.data))
                    {
                        Alias_type_declaration const* underlying_alias = std::get<Alias_type_declaration const*>(underlying_declaration_value.data);
                        return get_underlying_declaration(declaration_database, module_name, *underlying_alias);
                    }
                    else
                    {
                        return underlying_declaration;
                    }
                }
            }
        }

        return std::nullopt;
    }
}
