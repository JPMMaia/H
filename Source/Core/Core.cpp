module;

#include <cstdint>
#include <compare>
#include <exception>
#include <filesystem>
#include <memory_resource>
#include <optional>
#include <ostream>
#include <span>
#include <string>
#include <string_view>
#include <unordered_map>
#include <variant>
#include <vector>

module h.core;

import h.common;

namespace h
{
    Module const& find_module(
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        std::string_view const name
    )
    {
        if (core_module.name == name)
            return core_module;

        auto const location = core_module_dependencies.find(name.data());
        if (location != core_module_dependencies.end())
            return location->second;

        h::common::print_message_and_exit(std::format("Could not find module '{}'", name));
        std::unreachable();
    }

    std::string_view find_module_name(
        Module const& core_module,
        Module_reference const& module_reference
    )
    {
        return module_reference.name;
        /*if (module_reference.name == "" || module_reference.name == core_module.name)
            return core_module.name;

        auto const location = std::find_if(
            core_module.dependencies.alias_imports.begin(),
            core_module.dependencies.alias_imports.end(),
            [&module_reference](Import_module_with_alias const& alias_import) { return alias_import.alias == module_reference.name; }
        );

        if (location == core_module.dependencies.alias_imports.end())
            h::common::print_message_and_exit(std::format("Could not find import alias '{}' in module '{}'", module_reference.name, core_module.name));

        return location->module_name;*/
    }

    Custom_type_reference const* find_declaration_type_reference(
        Type_reference const& type_reference
    )
    {
        if (std::holds_alternative<Custom_type_reference>(type_reference.data))
        {
            Custom_type_reference const& custom_type_reference = std::get<Custom_type_reference>(type_reference.data);
            return &custom_type_reference;
        }
        else if (std::holds_alternative<Type_instance>(type_reference.data))
        {
            Type_instance const& type_instance = std::get<Type_instance>(type_reference.data);
            return &type_instance.type_constructor;
        }

        return nullptr;
    }

    template<typename T>
    concept Has_name = requires(T a)
    {
        { a.name } -> std::convertible_to<std::pmr::string>;
    };

    template<Has_name Type>
    Type const* get_value(
        std::string_view const name,
        std::span<Type const> const values
    )
    {
        auto const location = std::find_if(values.begin(), values.end(), [name](Type const& value) { return value.name == name; });
        return location != values.end() ? *location : nullptr;
    }

    template<Has_name Type>
    std::optional<Type const*> get_value(
        std::string_view const name,
        std::pmr::vector<Type> const& span_0,
        std::pmr::vector<Type> const& span_1
    )
    {
        auto const find_declaration = [name](Type const& declaration) -> bool { return declaration.name == name; };

        {
            auto const location = std::find_if(span_0.begin(), span_0.end(), find_declaration);
            if (location != span_0.end())
                return &(*location);
        }

        {
            auto const location = std::find_if(span_1.begin(), span_1.end(), find_declaration);
            if (location != span_1.end())
                return &(*location);
        }

        return std::nullopt;
    }

    std::optional<Alias_type_declaration const*> find_alias_type_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.alias_type_declarations, module.internal_declarations.alias_type_declarations);
    }

    std::optional<Enum_declaration const*> find_enum_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.enum_declarations, module.internal_declarations.enum_declarations);
    }

    std::optional<Global_variable_declaration const*> find_global_variable_declaration(Module const& module, std::string_view name)
    {
        return get_value(name, module.export_declarations.global_variable_declarations, module.internal_declarations.global_variable_declarations);
    }

    std::optional<Function_declaration const*> find_function_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.function_declarations, module.internal_declarations.function_declarations);
    }

    std::optional<Struct_declaration const*> find_struct_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.struct_declarations, module.internal_declarations.struct_declarations);
    }

    std::optional<Union_declaration const*> find_union_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.union_declarations, module.internal_declarations.union_declarations);
    }
}