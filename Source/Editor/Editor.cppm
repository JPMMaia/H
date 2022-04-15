module;

#include <cstdint>
#include <memory_resource>
#include <string>
#include <vector>

export module h.editor;

import h.core;

namespace h::editor
{
    export  enum class Code_format_keyword
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

    };


    export struct Function_format_options
    {
        std::pmr::string parameter_separator;
    };

    export Code_representation create_function_declaration_code(
        Code_format_segment const& function_declaration_format,
        Code_format_segment const& parameters_format,
        Function_format_options const& format_options,
        h::Function_declaration const& function_declaration
    );

    export std::pmr::string create_text(
        Code_representation const& representation
    );

    export std::pmr::string create_html(
        Code_representation const& representation
    );
}
