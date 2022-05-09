module;

#include <cassert>
#include <cstdint>
#include <memory_resource>
#include <numeric>
#include <optional>
#include <ranges>
#include <span>
#include <sstream>
#include <string>
#include <string_view>
#include <variant>
#include <vector>

module h.editor;

import h.core;
import h.json_serializer;

namespace h::editor
{
    Fundamental_type_name_map create_default_fundamental_type_name_map(
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        Fundamental_type_name_map map = {};
        map.set(Fundamental_type::Byte, std::pmr::string{ "Byte", output_allocator });
        map.set(Fundamental_type::Uint8, std::pmr::string{ "Uint8", output_allocator });
        map.set(Fundamental_type::Uint16, std::pmr::string{ "Uint16", output_allocator });
        map.set(Fundamental_type::Uint32, std::pmr::string{ "Uint32", output_allocator });
        map.set(Fundamental_type::Uint64, std::pmr::string{ "Uint64", output_allocator });
        map.set(Fundamental_type::Int8, std::pmr::string{ "Int8", output_allocator });
        map.set(Fundamental_type::Int16, std::pmr::string{ "Int16", output_allocator });
        map.set(Fundamental_type::Int32, std::pmr::string{ "Int32", output_allocator });
        map.set(Fundamental_type::Int64, std::pmr::string{ "Int64", output_allocator });
        map.set(Fundamental_type::Float16, std::pmr::string{ "Float16", output_allocator });
        map.set(Fundamental_type::Float32, std::pmr::string{ "Float32", output_allocator });
        map.set(Fundamental_type::Float64, std::pmr::string{ "Float64", output_allocator });
        return map;
    }

    std::string_view get_type_name(
        Type_reference const& type_reference,
        Fundamental_type_name_map const& map
    )
    {
        if (std::holds_alternative<Fundamental_type>(type_reference.data))
        {
            Fundamental_type const type = std::get<Fundamental_type>(type_reference.data);
            return map.get(type);
        }
        else
        {
            throw std::runtime_error{ "Not implemented!" };
        }
    }

    std::string_view get_type_name(
        Fundamental_type const type_reference,
        Fundamental_type_name_map const& map
    )
    {
        return map.get(type_reference);
    }

    Code_format_keyword from_string(std::string_view const value)
    {
        if (value == "constant_type")
        {
            return Code_format_keyword::Constant_type;
        }
        else if (value == "constant_value")
        {
            return Code_format_keyword::Constant_value;
        }
        else if (value == "expression")
        {
            return Code_format_keyword::Expression;
        }
        else if (value == "function_name")
        {
            return Code_format_keyword::Function_name;
        }
        else if (value == "function_parameters")
        {
            return Code_format_keyword::Function_parameters;
        }
        else if (value == "parameter_type")
        {
            return Code_format_keyword::Parameter_type;
        }
        else if (value == "parameter_name")
        {
            return Code_format_keyword::Parameter_name;
        }
        else if (value == "return_type")
        {
            return Code_format_keyword::Return_type;
        }
        else if (value == "statement")
        {
            return Code_format_keyword::Statement;
        }
        else if (value == "type_name")
        {
            return Code_format_keyword::Type_name;
        }
        else if (value == "variable_name")
        {
            return Code_format_keyword::Variable_name;
        }

        throw std::runtime_error{ std::format("Code_format_keyword value '{}' not recognized!", value) };
    }

    namespace
    {
        struct to_vector
        {
            template <typename Range_type>
            auto operator()(Range_type&& range) const
            {
                std::pmr::vector<std::ranges::range_value_t<Range_type>> output{ output_allocator };

                if constexpr (requires { std::ranges::size(range); })
                {
                    output.reserve(std::ranges::size(range));
                }

                for (auto&& element : range)
                {
                    output.push_back(static_cast<decltype(element)&&>(element));
                }

                return output;
            }

            template <typename Range_type>
            friend auto operator|(Range_type&& range, to_vector& c)
                -> decltype(c(std::forward<Range_type>(range)))
            {
                return c(std::forward<Range_type>(range));
            }

            template <typename Range_type>
            friend auto operator|(Range_type&& range, to_vector const& c)
                -> decltype(c(std::forward<Range_type>(range)))
            {
                return c(std::forward<Range_type>(range));
            }

            template <typename Range_type>
            friend auto operator|(Range_type&& range, to_vector&& c) -> decltype(std::move(c)(std::forward<Range_type>(range)))
            {
                return std::move(c)(std::forward<Range_type>(range));
            }

            std::pmr::polymorphic_allocator<> output_allocator;
        };
    }

    Code_format_segment create_code_format_segment(
        std::string_view format_string,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        auto const is_dollar_sign = [&](std::size_t const index) -> bool
        {
            return format_string[index] == '$';
        };

        auto const is_next_to_open_bracket = [&](std::size_t const index) -> bool
        {
            if (index + 1 >= format_string.size())
                return false;

            return format_string[index + 1] == '{';
        };

        auto const find_next_close_bracket = [&](std::size_t const index) -> std::size_t
        {
            auto const close_bracket_location = std::find(format_string.begin() + index + 2, format_string.end(), '}');

            return std::distance(format_string.begin(), close_bracket_location);
        };

        auto const begin_indices =
            std::views::iota(std::size_t{ 0 }, static_cast<std::size_t>(format_string.size())) |
            std::views::filter(is_dollar_sign) |
            std::views::filter(is_next_to_open_bracket) |
            to_vector{ temporaries_allocator };

        auto const end_indices =
            std::views::iota(std::size_t{ 0 }, static_cast<std::size_t>(format_string.size())) |
            std::views::filter(is_dollar_sign) |
            std::views::filter(is_next_to_open_bracket) |
            std::views::transform(find_next_close_bracket) |
            to_vector{ temporaries_allocator };

        std::pmr::vector<Code_format_segment::Type> types{ temporaries_allocator };
        std::pmr::vector<Code_format_keyword> keywords{ temporaries_allocator };
        std::pmr::vector<std::string_view> strings{ temporaries_allocator };

        if (begin_indices.begin() == begin_indices.end())
        {
            types.push_back(Code_format_segment::Type::String);
            strings.push_back(format_string);
        }
        else
        {
            auto begin_index = begin_indices.begin();
            auto end_index = end_indices.begin();

            if (*begin_index != 0)
            {
                types.push_back(Code_format_segment::Type::String);

                std::string_view const string{ format_string.begin(), format_string.begin() + *begin_index };
                strings.push_back(string);
            }

            while ((begin_index != begin_indices.end()) && (end_index != end_indices.end()))
            {
                {
                    types.push_back(Code_format_segment::Type::Keyword);

                    std::string_view const string{ format_string.begin() + *begin_index + 2, format_string.begin() + *end_index };
                    Code_format_keyword const keyword = from_string(string);
                    keywords.push_back(keyword);
                }

                ++begin_index;

                if (begin_index != begin_indices.end())
                {
                    types.push_back(Code_format_segment::Type::String);

                    std::string_view const string{ format_string.begin() + *end_index + 1, format_string.begin() + *begin_index };
                    strings.push_back(string);
                }
                else
                {
                    types.push_back(Code_format_segment::Type::String);

                    std::string_view const string{ format_string.begin() + *end_index + 1, format_string.end() };
                    strings.push_back(string);
                }

                ++end_index;
            }
        }

        std::pmr::vector<Code_format_segment::Type> output_types{ types.begin(), types.end(), output_allocator };
        std::pmr::vector<Code_format_keyword> output_keywords{ keywords.begin(), keywords.end(), output_allocator };

        std::pmr::vector<std::pmr::string> output_strings{ output_allocator };
        output_strings.reserve(strings.size());

        for (std::string_view string : strings)
        {
            output_strings.push_back(std::pmr::string{ string.begin(), string.end(), output_allocator });
        }

        return Code_format_segment
        {
            .types = std::move(output_types),
            .keywords = std::move(output_keywords),
            .strings = std::move(output_strings),
        };
    }

    using Polymorphic_stringstream = std::basic_stringstream<char, std::char_traits<char>, std::pmr::polymorphic_allocator<char>>;

    std::pmr::string generate_string(
        Polymorphic_stringstream const& stream,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::string output{ output_allocator };
        std::pmr::string const generated = stream.str();
        output.assign(generated.begin(), generated.end());
        return output;
    }

    HTML_template create_template(
        std::string_view const name,
        Code_format_segment const& format_segment,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Polymorphic_stringstream stream{ std::ios::out, temporaries_allocator };

        stream << "<template id=\"" << name << "\">";
        {
            std::size_t keyword_index = 0;
            std::size_t string_index = 0;

            for (std::size_t segment_type_index = 0; segment_type_index < format_segment.types.size(); ++segment_type_index)
            {
                Code_format_segment::Type const segment_type = format_segment.types[segment_type_index];

                if (segment_type == Code_format_segment::Type::Keyword)
                {
                    Code_format_keyword const keyword = format_segment.keywords[keyword_index];
                    ++keyword_index;

                    if (keyword == Code_format_keyword::Constant_type)
                    {
                        stream << "<h_type_reference><span slot=\"type_name\"><slot name=\"type\"></slot></span></h_type_reference>";
                    }
                    else if (keyword == Code_format_keyword::Constant_value)
                    {
                        stream << "<slot name=\"value\"></slot>";
                    }
                    else if (keyword == Code_format_keyword::Expression)
                    {
                        stream << "<h_expression><slot name=\"expression\"></slot></h_expression>";
                    }
                    else if (keyword == Code_format_keyword::Function_name)
                    {
                        stream << "<slot name=\"name\"></slot>";
                    }
                    else if (keyword == Code_format_keyword::Function_parameters)
                    {
                        stream << "<slot name=\"parameters\"></slot>";
                    }
                    else if (keyword == Code_format_keyword::Parameter_name)
                    {
                        stream << "<slot name=\"name\"></slot>";
                    }
                    else if (keyword == Code_format_keyword::Parameter_type)
                    {
                        stream << "<h_type_reference><span slot=\"type_name\"><slot name=\"type\"></slot></span></h_type_reference>";
                    }
                    else if (keyword == Code_format_keyword::Return_type)
                    {
                        stream << "<h_type_reference><span slot=\"type_name\"><slot name=\"return_type\"></slot></span></h_type_reference>";
                    }
                    else if (keyword == Code_format_keyword::Statement)
                    {
                        stream << "<slot name=\"id\"></slot>";
                        stream << "<slot name=\"name\"></slot>";
                        stream << "<slot name=\"expression\"></slot>";
                    }
                    else if (keyword == Code_format_keyword::Type_name)
                    {
                        stream << "<slot name=\"type_name\"></slot>";
                    }
                    else if (keyword == Code_format_keyword::Variable_name)
                    {
                        stream << "<slot name=\"type\"></slot>";
                        stream << "<slot name=\"id\"></slot>";
                        stream << "<slot name=\"temporary\"></slot>";
                    }
                    else
                    {
                        throw std::runtime_error{ std::format("Could not handle code format keyword '{}'.", static_cast<int>(keyword)) };
                    }
                }
                else if (segment_type == Code_format_segment::Type::String)
                {
                    std::string_view const string = format_segment.strings[string_index];
                    ++string_index;

                    stream << string;
                }
            }
        }
        stream << "</template>";

        return HTML_template{ .value = generate_string(stream, output_allocator) };
    }

    HTML_template_instance create_function_declaration_instance(
        h::Function_declaration const& function_declaration,
        Fundamental_type_name_map const& fundamental_type_name_map,
        Function_format_options const& options,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Polymorphic_stringstream stream{ std::ios::out, temporaries_allocator };

        stream << "<h_function_declaration>";
        {
            stream << "<span slot=\"name\">" << function_declaration.name << "</span>";
            stream << "<span slot=\"return_type\">" << get_type_name(function_declaration.return_type, fundamental_type_name_map) << "</span>";

            stream << "<span slot=\"parameters\">";
            for (std::size_t parameter_index = 0; parameter_index < function_declaration.parameter_types.size(); ++parameter_index)
            {
                stream << "<h_function_parameter>";
                {
                    stream << "<span slot=\"type\">" << get_type_name(function_declaration.parameter_types[parameter_index], fundamental_type_name_map) << "</span>";
                    stream << "<span slot=\"name\">" << function_declaration.parameter_names[parameter_index] << "</span>";
                }
                stream << "</h_function_parameter>";

                if ((parameter_index + 1) != function_declaration.parameter_types.size())
                {
                    stream << options.parameter_separator;
                }
            }
            stream << "</span>";
        }
        stream << "</h_function_declaration>";

        return HTML_template_instance{ .value = generate_string(stream, output_allocator) };
    }

    HTML_template_instance create_constant_expression_instance(
        h::Constant_expression const& expression,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Polymorphic_stringstream stream{ std::ios::out, temporaries_allocator };

        stream << "<h_constant_expression>";
        {
            stream << "<span slot=\"type\">" << get_type_name(expression.type, fundamental_type_name_map) << "</span>";
            stream << "<span slot=\"value\">" << expression.data << "</span>";
        }
        stream << "</h_constant_expression>";

        return HTML_template_instance{ .value = generate_string(stream, output_allocator) };
    }

    HTML_template_instance create_variable_expression_instance(
        h::Variable_expression const& expression,
        std::optional<HTML_template_instance> const& temporary_expression,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        assert(temporary_expression.has_value() || expression.type != h::Variable_expression_type::Temporary);

        Polymorphic_stringstream stream{ std::ios::out, temporaries_allocator };

        stream << "<h_variable_expression>";
        {
            stream << "<span slot=\"type\">" << h::json::write_enum(expression.type) << "</span>";
            stream << "<span slot=\"id\">" << expression.id << "</span>";

            if (expression.type == h::Variable_expression_type::Temporary)
            {
                stream << "<span slot=\"temporary\">" << temporary_expression->value << "</span>";
            }
        }
        stream << "</h_variable_expression>";

        return HTML_template_instance{ .value = generate_string(stream, output_allocator) };
    }

    HTML_template_instance create_statement_instance(
        h::Statement const& statement,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Polymorphic_stringstream stream{ std::ios::out, temporaries_allocator };

        stream << "<h_statement>";
        {
            stream << "<span slot=\"id\">" << statement.id << "</span>";
            stream << "<span slot=\"name\">" << statement.name << "</span>";

            stream << "<span slot=\"expression\">";
            {
                std::pmr::vector<HTML_template_instance> instances{ temporaries_allocator };
                instances.reserve(statement.expressions.size());

                for (h::Expression const& expression : statement.expressions)
                {
                    auto const visitor = [&](auto&& expression_data)
                    {
                        using T = std::decay_t<decltype(expression_data)>;

                        if constexpr (std::is_same_v<T, Binary_expression>)
                        {

                        }
                        else if constexpr (std::is_same_v<T, Call_expression>)
                        {

                        }
                        else if constexpr (std::is_same_v<T, Constant_expression>)
                        {

                        }
                        else if constexpr (std::is_same_v<T, Return_expression>)
                        {

                        }
                        else if constexpr (std::is_same_v<T, Variable_expression>)
                        {

                        }
                        else
                        {
                            static_assert(always_false_v<T>, "non-exhaustive visitor!");
                        }
                    };

                    std::visit(visitor, expression.data);
                }

                stream << instances.back().value;
            }
            stream << "</span>";
        }
        stream << "</h_statement>";

        return HTML_template_instance{ .value = generate_string(stream, output_allocator) };
    }
}
