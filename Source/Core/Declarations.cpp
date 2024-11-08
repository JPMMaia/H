module;

#include <memory_resource>
#include <optional>
#include <string>
#include <span>
#include <unordered_map>
#include <utility>
#include <variant>

module h.core.declarations;

import h.common;
import h.core;
import h.core.types;

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
        auto const declaration_map_location = database.map.find(module_name);
        if (declaration_map_location == database.map.end())
            return std::nullopt;

        Declaration_map const& declaration_map = declaration_map_location->second;
        auto const declaration_location = declaration_map.find(declaration_name);
        if (declaration_location == declaration_map.end())
            return std::nullopt;

        return declaration_location->second;
    }

    std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        Type_reference const& type_reference,
        Module const& current_core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies
    )
    {
        if (std::holds_alternative<Custom_type_reference>(type_reference.data))
        {
            Custom_type_reference const& data = std::get<Custom_type_reference>(type_reference.data);
            std::string_view const module_name = find_module_name(current_core_module, data.module_reference);

            std::optional<Declaration> const declaration = find_declaration(declaration_database, module_name, data.name);

            if (declaration.has_value() && std::holds_alternative<Alias_type_declaration const*>(declaration->data))
            {
                Alias_type_declaration const* alias_declaration = std::get<Alias_type_declaration const*>(declaration->data);

                Module const& found_module = find_module(current_core_module, core_module_dependencies, module_name);
                std::optional<Type_reference> alias_type = get_underlying_type(declaration_database, *alias_declaration, found_module, core_module_dependencies);
                return alias_type;
            }
            else
            {
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
        Alias_type_declaration const& declaration,
        Module const& current_core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies
    )
    {
        if (declaration.type.empty())
            return std::nullopt;

        return get_underlying_type(declaration_database, declaration.type[0], current_core_module, core_module_dependencies);
    }

    std::optional<Declaration> get_underlying_declaration(
        Declaration_database const& declaration_database,
        Alias_type_declaration const& declaration,
        Module const& current_core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies
    )
    {
        std::optional<Type_reference> const type_reference = get_underlying_type(declaration_database, declaration, current_core_module, core_module_dependencies);
        if (type_reference.has_value())
        {
            if (std::holds_alternative<Custom_type_reference>(type_reference.value().data))
            {
                Custom_type_reference const& data = std::get<Custom_type_reference>(type_reference.value().data);
                std::string_view const module_name = find_module_name(current_core_module, data.module_reference);

                std::optional<Declaration> const underlying_declaration = find_declaration(declaration_database, module_name, data.name);
                if (underlying_declaration.has_value())
                {
                    Declaration const& underlying_declaration_value = underlying_declaration.value();
                    if (std::holds_alternative<Alias_type_declaration const*>(underlying_declaration_value.data))
                    {
                        Alias_type_declaration const* underlying_alias = std::get<Alias_type_declaration const*>(underlying_declaration_value.data);

                        Module const& found_module = find_module(current_core_module, core_module_dependencies, module_name);
                        return get_underlying_declaration(declaration_database, *underlying_alias, found_module, core_module_dependencies);
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
