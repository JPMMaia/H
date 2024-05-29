module;

#include <functional>
#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <unordered_map>
#include <utility>
#include <variant>
#include <vector>

module h.core.types;

import h.common;
import h.core;

namespace h
{
    Type_reference create_bool_type_reference()
    {
        return create_fundamental_type_type_reference(Fundamental_type::Bool);
    }

    bool is_bool(Type_reference const& type)
    {
        if (std::holds_alternative<Fundamental_type>(type.data))
        {
            Fundamental_type const data = std::get<Fundamental_type>(type.data);
            return data == Fundamental_type::Bool;
        }

        return false;
    }


    Type_reference create_custom_type_reference(std::string_view const module_name, std::string_view const name)
    {
        return Type_reference
        {
            .data = Custom_type_reference
            {
                .module_reference =
                {
                    .name = std::pmr::string{ module_name },
                },
                .name = std::pmr::string{ name }
            }
        };
    }

    bool is_custom_type_reference(Type_reference const& type)
    {
        return std::holds_alternative<Custom_type_reference>(type.data);
    }

    Custom_type_reference fix_custom_type_reference(
        Custom_type_reference type,
        Module const& core_module
    )
    {
        if (type.module_reference.name.empty() || type.module_reference.name == core_module.name)
        {
            type.module_reference.name = core_module.name;
        }
        else
        {
            auto const location = std::find_if(
                core_module.dependencies.alias_imports.begin(),
                core_module.dependencies.alias_imports.end(),
                [&](Import_module_with_alias const& alias_import) { return alias_import.alias == type.module_reference.name; }
            );

            if (location == core_module.dependencies.alias_imports.end())
                h::common::print_message_and_exit(std::format("Could not find import alias '{}' in module '{}'", type.module_reference.name, core_module.name));

            type.module_reference.name = location->module_name;
        }

        return type;
    }

    Type_reference fix_custom_type_reference(
        Type_reference type,
        Module const& core_module
    )
    {
        if (std::holds_alternative<Custom_type_reference>(type.data))
        {
            type.data = fix_custom_type_reference(std::get<Custom_type_reference>(type.data), core_module);
        }

        return type;
    }

    void fix_custom_type_references(
        Module& core_module
    )
    {
        auto const process_type_reference = [&](std::string_view const declaration_name, Type_reference const& type_reference) -> bool
        {
            Type_reference* const reference = const_cast<Type_reference*>(&type_reference);
            *reference = fix_custom_type_reference(type_reference, core_module);
            return false;
        };

        visit_type_references(core_module.export_declarations, process_type_reference);
        visit_type_references(core_module.internal_declarations, process_type_reference);
    }


    Type_reference create_function_type_type_reference(Function_type const& function_type)
    {
        return Type_reference
        {
            .data = function_type
        };
    }

    std::optional<Type_reference> get_function_output_type_reference(Function_type const& function_type, Module const& core_module)
    {
        if (function_type.output_parameter_types.empty())
            return std::nullopt;

        if (function_type.output_parameter_types.size() == 1)
            return function_type.output_parameter_types.front();

        // TODO function with multiple output arguments
        return std::nullopt;
    }

    std::optional<Type_reference> get_function_output_type_reference(Type_reference const& type, Module const& core_module)
    {
        if (std::holds_alternative<Function_type>(type.data))
        {
            Function_type const& function_type = std::get<Function_type>(type.data);
            return get_function_output_type_reference(function_type, core_module);
        }

        throw std::runtime_error{ "Type is not a function type!" };
    }


    Type_reference create_fundamental_type_type_reference(Fundamental_type const value)
    {
        return Type_reference
        {
            .data = value
        };
    }

    bool is_c_string(Type_reference const& type_reference)
    {
        if (std::holds_alternative<Pointer_type>(type_reference.data))
        {
            Pointer_type const& pointer_type = std::get<Pointer_type>(type_reference.data);

            if (!pointer_type.element_type.empty())
            {
                Type_reference const& value_type = pointer_type.element_type[0];
                if (std::holds_alternative<Fundamental_type>(value_type.data))
                {
                    Fundamental_type const fundamental_type = std::get<Fundamental_type>(value_type.data);
                    if (fundamental_type == Fundamental_type::C_char)
                    {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    bool is_floating_point(Type_reference const& type)
    {
        if (std::holds_alternative<Fundamental_type>(type.data))
        {
            Fundamental_type const data = std::get<Fundamental_type>(type.data);
            return (data == Fundamental_type::Float16) || (data == Fundamental_type::Float32) || (data == Fundamental_type::Float64);
        }

        return false;
    }


    Type_reference create_integer_type_type_reference(std::uint32_t const number_of_bits, bool const is_signed)
    {
        return Type_reference
        {
            .data = Integer_type
            {
                .number_of_bits = number_of_bits,
                .is_signed = is_signed
            }
        };
    }

    bool is_integer(Type_reference const& type)
    {
        return std::holds_alternative<Integer_type>(type.data);
    }

    bool is_signed_integer(Type_reference const& type)
    {
        if (std::holds_alternative<Integer_type>(type.data))
        {
            Integer_type const& data = std::get<Integer_type>(type.data);
            return data.is_signed;
        }

        return false;
    }

    bool is_unsigned_integer(Type_reference const& type)
    {
        return !is_signed_integer(type);
    }


    Type_reference create_pointer_type_type_reference(std::pmr::vector<Type_reference> element_type, bool const is_mutable)
    {
        Pointer_type pointer_type
        {
            .element_type = std::move(element_type),
            .is_mutable = is_mutable
        };

        return Type_reference
        {
            .data = std::move(pointer_type)
        };
    }

    std::optional<Type_reference> remove_pointer(Type_reference const& type)
    {
        if (std::holds_alternative<Pointer_type>(type.data))
        {
            Pointer_type const& pointer_type = std::get<Pointer_type>(type.data);
            if (pointer_type.element_type.empty())
                return {};

            return pointer_type.element_type.front();
        }

        throw std::runtime_error("Type is not a pointer type!");
    }

    bool is_pointer(Type_reference const& type)
    {
        return std::holds_alternative<Pointer_type>(type.data);
    }

    bool is_non_void_pointer(Type_reference const& type)
    {
        if (std::holds_alternative<Pointer_type>(type.data))
        {
            Pointer_type const& pointer_type = std::get<Pointer_type>(type.data);
            return !pointer_type.element_type.empty();
        }

        return false;
    }
}
