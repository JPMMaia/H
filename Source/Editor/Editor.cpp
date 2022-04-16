module;

#include <cassert>
#include <cstdint>
#include <memory_resource>
#include <numeric>
#include <ranges>
#include <span>
#include <string>
#include <string_view>
#include <variant>
#include <vector>

module h.editor;

import h.core;

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

    Code_format_keyword from_string(std::string_view const value)
    {
        if (value == "function_name")
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

    Code_representation create_function_parameters_code(
        Code_format_segment const& parameters_format,
        Function_format_options const& format_options,
        h::Function_declaration const& function_declaration,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::size_t const parameter_count = function_declaration.parameter_types.size();

        if (parameter_count == 0)
        {
            return Code_representation{};
        }

        std::pmr::vector<std::pmr::string> text{ temporaries_allocator };
        text.reserve(parameter_count * parameters_format.types.size() * 2 - 1);

        for (std::size_t parameter_index = 0; parameter_index < parameter_count; ++parameter_index)
        {
            std::size_t keyword_index = 0;
            std::size_t string_index = 0;

            for (std::size_t segment_type_index = 0; segment_type_index < parameters_format.types.size(); ++segment_type_index)
            {
                Code_format_segment::Type const segment_type = parameters_format.types[segment_type_index];

                if (segment_type == Code_format_segment::Type::Keyword)
                {
                    Code_format_keyword const keyword = parameters_format.keywords[keyword_index];
                    ++keyword_index;

                    if (keyword == Code_format_keyword::Parameter_name)
                    {
                        std::string_view const function_name = function_declaration.parameter_names[parameter_index];
                        text.push_back({ function_name.begin(), function_name.end(), output_allocator });
                    }
                    else if (keyword == Code_format_keyword::Parameter_type)
                    {
                        Type_reference const& parameter_type = function_declaration.parameter_types[parameter_index];
                        std::string_view const name = get_type_name(parameter_type, fundamental_type_name_map);
                        text.push_back({ name.begin(), name.end(), output_allocator });
                    }
                    else
                    {
                        throw std::runtime_error{ std::format("Could not handle code format keyword '{}'.", static_cast<int>(keyword)) };
                    }
                }
                else if (segment_type == Code_format_segment::Type::String)
                {
                    std::string_view const string = parameters_format.strings[string_index];
                    ++string_index;

                    text.push_back({ string.begin(), string.end(), output_allocator });
                }
            }

            if ((parameter_index + 1) != parameter_count)
            {
                text.push_back({ format_options.parameter_separator.begin(), format_options.parameter_separator.end(), output_allocator });
            }
        }

        return Code_representation
        {
            .text = std::pmr::vector<std::pmr::string>{ text.begin(), text.end(), output_allocator }
        };
    }

    Code_representation create_function_declaration_code(
        Code_format_segment const& function_declaration_format,
        Code_format_segment const& parameters_format,
        Function_format_options const& format_options,
        h::Function_declaration const& function_declaration,
        Fundamental_type_name_map const& fundamental_type_name_map,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<std::pmr::string> text{ temporaries_allocator };
        text.reserve(function_declaration_format.types.size() + function_declaration.parameter_types.size() * parameters_format.types.size() * 2);

        {
            std::size_t keyword_index = 0;
            std::size_t string_index = 0;

            for (std::size_t segment_type_index = 0; segment_type_index < function_declaration_format.types.size(); ++segment_type_index)
            {
                Code_format_segment::Type const segment_type = function_declaration_format.types[segment_type_index];

                if (segment_type == Code_format_segment::Type::Keyword)
                {
                    Code_format_keyword const keyword = function_declaration_format.keywords[keyword_index];
                    ++keyword_index;

                    if (keyword == Code_format_keyword::Function_name)
                    {
                        std::string_view const function_name = function_declaration.name;
                        text.push_back({ function_name.begin(), function_name.end(), output_allocator });
                    }
                    else if (keyword == Code_format_keyword::Return_type)
                    {
                        Type_reference const& return_type = function_declaration.return_type;
                        std::string_view const name = get_type_name(return_type, fundamental_type_name_map);
                        text.push_back({ name.begin(), name.end(), output_allocator });
                    }
                    else if (keyword == Code_format_keyword::Function_parameters)
                    {
                        Code_representation const function_parameters_code = create_function_parameters_code(
                            parameters_format,
                            format_options,
                            function_declaration,
                            fundamental_type_name_map,
                            temporaries_allocator,
                            temporaries_allocator
                        );

                        text.insert(text.end(), function_parameters_code.text.begin(), function_parameters_code.text.end());
                    }
                    else
                    {
                        throw std::runtime_error{ std::format("Could not handle code format keyword '{}'.", static_cast<int>(keyword)) };
                    }
                }
                else if (segment_type == Code_format_segment::Type::String)
                {
                    std::string_view const string = function_declaration_format.strings[string_index];
                    ++string_index;

                    text.push_back({ string.begin(), string.end(), output_allocator });
                }
            }
        }

        return Code_representation
        {
            .text = std::pmr::vector<std::pmr::string>{ text.begin(), text.end(), output_allocator }
        };
    }

    std::pmr::string create_text(
        Code_representation const& representation,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        auto const sum_sizes = [](std::size_t const lhs, std::pmr::string const& rhs) -> std::size_t
        {
            return lhs + rhs.size();
        };

        std::size_t const size_to_reserve = std::reduce(representation.text.begin(), representation.text.end(), std::size_t{ 0 }, sum_sizes);

        std::pmr::string output{ output_allocator };
        output.reserve(size_to_reserve);

        for (std::pmr::string const& string : representation.text)
        {
            output.append(string);
        }

        return output;
    }

    std::pmr::string create_html(
        Code_representation const& representation,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        return {};
    }
}
