module;

#include <cstdlib>
#include <memory_resource>
#include <optional>
#include <string_view>
#include <vector>

module h.parser.type_name_parser;

import h.core;
import h.core.types;

namespace h::parser
{
    static std::optional<Type_reference> parse_integer_type_name(
        std::string_view const type_name
    )
    {
        if (type_name.starts_with("Int"))
        {
            std::string_view const number_of_bits_string = type_name.substr(2);
            int const number_of_bits = std::atoi(number_of_bits_string.data());
            return create_integer_type_type_reference(
                static_cast<std::uint32_t>(number_of_bits),
                true
            );
        }
        else if (type_name.starts_with("Uint"))
        {
            std::string_view const number_of_bits_string = type_name.substr(3);
            int const number_of_bits = std::atoi(number_of_bits_string.data());
            return create_integer_type_type_reference(
                static_cast<std::uint32_t>(number_of_bits),
                false
            );
        }
        else
        {
            return std::nullopt;
        }
    }

    static std::optional<Fundamental_type> parse_fundamental_type_name(
        std::string_view const type_name
    )
    {   
        if (type_name == "Bool")
            return h::Fundamental_type::Bool;
        if (type_name == "Byte")
            return h::Fundamental_type::Byte;
        if (type_name == "Float16")
            return h::Fundamental_type::Float16;
        if (type_name == "Float32")
            return h::Fundamental_type::Float32;
        if (type_name == "Float64")
            return h::Fundamental_type::Float64;
        if (type_name == "String")
            return h::Fundamental_type::String;
        if (type_name == "Any_type")
            return h::Fundamental_type::Any_type;
        if (type_name == "C_bool")
            return h::Fundamental_type::C_bool;
        if (type_name == "C_char")
            return h::Fundamental_type::C_char;
        if (type_name == "C_schar")
            return h::Fundamental_type::C_schar;
        if (type_name == "C_uchar")
            return h::Fundamental_type::C_uchar;
        if (type_name == "C_short")
            return h::Fundamental_type::C_short;
        if (type_name == "C_ushort")
            return h::Fundamental_type::C_ushort;
        if (type_name == "C_int")
            return h::Fundamental_type::C_int;
        if (type_name == "C_uint")
            return h::Fundamental_type::C_uint;
        if (type_name == "C_long")
            return h::Fundamental_type::C_long;
        if (type_name == "C_ulong")
            return h::Fundamental_type::C_ulong;
        if (type_name == "C_longlong")
            return h::Fundamental_type::C_longlong;
        if (type_name == "C_ulonglong")
            return h::Fundamental_type::C_ulonglong;
        if (type_name == "C_longdouble")
            return h::Fundamental_type::C_longdouble;
        else
            return std::nullopt;
    }

    std::optional<Type_reference> parse_type_name(
        std::string_view const module_name,
        std::string_view const type_name,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::optional<Type_reference> const integer_type = parse_integer_type_name(type_name);
        if (integer_type.has_value())
            return integer_type.value();

        std::optional<Fundamental_type> const fundamental_type = parse_fundamental_type_name(type_name);
        if (fundamental_type.has_value())
            return create_fundamental_type_type_reference(fundamental_type.value());
        
        if (type_name == "void")
            return std::nullopt;
        
        return create_custom_type_reference(module_name, type_name);
    }
}
