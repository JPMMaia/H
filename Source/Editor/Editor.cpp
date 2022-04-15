module;

#include <cassert>
#include <cstdint>
#include <memory_resource>
#include <ranges>
#include <span>
#include <string>
#include <variant>
#include <vector>

module h.editor;

import h.core;

namespace h::editor
{
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

    Code_representation create_function_declaration_code(
        Code_format_segment const& function_declaration_format,
        Code_format_segment const& parameters_format,
        Function_format_options const& format_options,
        h::Function_declaration const& function_declaration
    )
    {
        return {};
    }

    std::pmr::string create_text(
        Code_representation const& representation
    )
    {
        return {};
    }

    std::pmr::string create_html(
        Code_representation const& representation
    )
    {
        return {};
    }
}
