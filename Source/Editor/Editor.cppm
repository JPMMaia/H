module;

#include <array>
#include <cassert>
#include <cstdint>
#include <memory_resource>
#include <string>
#include <string_view>
#include <vector>

export module h.editor;

import h.core;

namespace h::editor
{
    export struct Fundamental_type_name_map
    {
        std::array<std::pmr::string, 12> values;

        constexpr std::pmr::string const& get(Fundamental_type const type) const
        {
            assert(static_cast<std::size_t>(type) < values.size());
            return this->values[static_cast<std::size_t>(type)];
        }

        constexpr void set(Fundamental_type const type, std::pmr::string value)
        {
            assert(static_cast<std::size_t>(type) < values.size());
            this->values[static_cast<std::size_t>(type)] = std::move(value);
        }
    };

    std::string_view get_type_name(
        Type_reference const& type_reference,
        Fundamental_type_name_map const& map
    );

    export Fundamental_type_name_map create_default_fundamental_type_name_map(
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    export enum class Code_format_keyword
    {
        Function_name,
        Function_parameters,
        Parameter_type,
        Parameter_name,
        Return_type,
    };

    export  struct Code_format_segment
    {
        enum class Type
        {
            Keyword,
            String
        };

        std::pmr::vector<Type> types;
        std::pmr::vector<Code_format_keyword> keywords;
        std::pmr::vector<std::pmr::string> strings;
    };

    export Code_format_segment create_code_format_segment(
        std::string_view format_string,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export struct Code_representation
    {
        std::pmr::vector<std::pmr::string> text;
    };


    export struct Function_format_options
    {
        std::pmr::string parameter_separator;
    };

    export Code_representation create_function_parameters_code(
        Code_format_segment const& parameters_format,
        Function_format_options const& format_options,
        h::Function_declaration const& function_declaration,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export Code_representation create_function_declaration_code(
        Code_format_segment const& function_declaration_format,
        Code_format_segment const& parameters_format,
        Function_format_options const& format_options,
        h::Function_declaration const& function_declaration,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export std::pmr::string create_text(
        Code_representation const& representation,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    export std::pmr::string create_html(
        Code_representation const& representation,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );
}
