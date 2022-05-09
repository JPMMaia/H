module;

#include <array>
#include <cassert>
#include <cstdint>
#include <memory_resource>
#include <optional>
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
        Constant_type,
        Constant_value,
        Expression,
        Function_name,
        Function_parameters,
        Parameter_type,
        Parameter_name,
        Return_type,
        Statement,
        Type_name,
        Variable_name
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

    export struct HTML_template
    {
        std::pmr::string value;
    };

    export struct HTML_template_instance
    {
        std::pmr::string value;
    };

    export HTML_template create_template(
        std::string_view name,
        Code_format_segment const& format_segment,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export struct Function_format_options
    {
        std::pmr::string parameter_separator;
    };

    export HTML_template_instance create_function_declaration_instance(
        h::Function_declaration const& function_declaration,
        Fundamental_type_name_map const& fundamental_type_name_map,
        Function_format_options const& options,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export HTML_template_instance create_constant_expression_instance(
        h::Constant_expression const& expression,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export HTML_template_instance create_variable_expression_instance(
        h::Variable_expression const& expression,
        std::optional<HTML_template_instance> const& temporary_expression,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export HTML_template_instance create_statement_instance(
        h::Statement const& statement,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );
}
