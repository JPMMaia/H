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
#include <utility>
#include <variant>
#include <vector>

module h.core;

import h.common;

namespace h
{
    template<typename... Ts>
    std::strong_ordering operator<=>(std::variant<Ts...> const& lhs, std::variant<Ts...> const& rhs)
    {
        std::size_t const i = lhs.index();
        std::size_t const j = rhs.index();
        if (i != j)
            return i <=> j;

        std::strong_ordering result = std::strong_ordering::equal;
        
        auto const visitor = [&](auto const& lhs_value) -> void {
            using real_type = std::remove_cv_t<std::remove_reference_t<decltype(lhs_value)>>;
            auto const& rhs_value = std::get<real_type>(rhs);
            result = lhs_value <=> rhs_value;
        };

        std::visit(visitor, lhs);

        return result;
    }

    std::strong_ordering operator<=>(Type_instance const& lhs, Type_instance const& rhs) = default;
    std::strong_ordering operator<=>(Type_reference const& lhs, Type_reference const& rhs) = default;
    std::strong_ordering operator<=>(Expression const& lhs, Expression const& rhs) = default;
    std::strong_ordering operator<=>(Statement const& lhs, Statement const& rhs) = default;

    bool operator==(Statement const& lhs, Statement const& rhs)
    {
        if (lhs.expressions.size() != rhs.expressions.size())
            return false;

        for (std::size_t index = 0; index < lhs.expressions.size(); ++index)
        {
            std::strong_ordering const result = lhs.expressions[index] <=> rhs.expressions[index];
            if (result != std::strong_ordering::equal)
                return false;
        }

        return true;
    }

    bool operator==(Type_instance const& lhs, Type_instance const& rhs) = default;
    
    bool operator==(Type_reference const& lhs, Type_reference const& rhs)
    {
        return false; // TODo
    }

    h::Module const& find_module(
        h::Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, h::Module> const& core_module_dependencies,
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
        h::Module const& core_module,
        h::Module_reference const& module_reference
    )
    {
        return module_reference.name;
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

    std::optional<Alias_type_declaration const*> find_alias_type_declaration(h::Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.alias_type_declarations, module.internal_declarations.alias_type_declarations);
    }

    std::optional<Enum_declaration const*> find_enum_declaration(h::Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.enum_declarations, module.internal_declarations.enum_declarations);
    }

    std::optional<Global_variable_declaration const*> find_global_variable_declaration(h::Module const& module, std::string_view name)
    {
        return get_value(name, module.export_declarations.global_variable_declarations, module.internal_declarations.global_variable_declarations);
    }

    std::optional<Function_declaration const*> find_function_declaration(h::Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.function_declarations, module.internal_declarations.function_declarations);
    }

    std::optional<Struct_declaration const*> find_struct_declaration(h::Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.struct_declarations, module.internal_declarations.struct_declarations);
    }

    std::optional<Union_declaration const*> find_union_declaration(h::Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.union_declarations, module.internal_declarations.union_declarations);
    }
}