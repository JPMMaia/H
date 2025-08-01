module;

#include <algorithm>
#include <cassert>
#include <cstdio>
#include <filesystem>
#include <format>
#include <iostream>
#include <memory_resource>
#include <numeric>
#include <optional>
#include <ranges>
#include <span>
#include <string_view>
#include <variant>
#include <vector>

#include <stdio.h>

#include <clang-c/Index.h>

module h.c_header_converter;

import h.c_header_hash;

import h.binary_serializer;
import h.core;
import h.core.declarations;
import h.core.expressions;
import h.core.types;

namespace h::c
{
    static constexpr bool g_debug = false;

    h::Statement create_default_value(
        Type_reference const& value_type,
        h::Module const& core_module,
        h::Declaration_database const& declaration_database
    );

    struct String
    {
        String(CXString&& value) noexcept :
            value{ std::move(value) }
        {
        }
        ~String() noexcept
        {
            clang_disposeString(value);
        }

        std::string_view string_view() const noexcept
        {
            if (value.data == nullptr)
                return std::string_view{};

            return clang_getCString(value);
        }

        CXString value;
    };

    struct Evaluation_result
    {
        Evaluation_result(CXEvalResult value) noexcept :
            value{ value }
        {
        }
        ~Evaluation_result() noexcept
        {
            if (value != nullptr)
                clang_EvalResult_dispose(value);
        }

        CXEvalResult value;
    };

    struct Header_source_location
    {
        CXFile file;
        h::Source_location source_location;
    };

    Header_source_location get_cursor_source_location(
        CXCursor const cursor
    )
    {
        CXSourceLocation const cursor_location = clang_getCursorLocation(cursor);

        CXFile file = {};
        unsigned line = 0;
        unsigned column = 0;
        unsigned offset = 0;
        clang_getSpellingLocation(
            cursor_location,
            &file,
            &line,
            &column,
            &offset
        );

        std::optional<String> const file_name = file != nullptr ? clang_getFileName(file) : std::optional<String>{};
        std::optional<std::filesystem::path> file_path = file_name.has_value() ? file_name->string_view() : std::optional<std::filesystem::path>{};

        return Header_source_location
        {
            .file = file,
            .source_location =
            {
                .file_path = std::move(file_path),
                .line = line,
                .column = column,
            },
        };
    }

    h::Source_position get_source_position(Header_source_location const& header_source_location)
    {
        return {.line = header_source_location.source_location.line, .column = header_source_location.source_location.column };
    }

    std::optional<h::Fundamental_type> to_fundamental_type(CXTypeKind const type_kind) noexcept
    {
        switch (type_kind)
        {
        case CXType_Bool:
            return h::Fundamental_type::C_bool;
        case CXType_Char_U:
        case CXType_Char_S:
            return h::Fundamental_type::C_char;
        case CXType_UChar:
            return h::Fundamental_type::C_uchar;
        case CXType_UShort:
            return h::Fundamental_type::C_ushort;
        case CXType_UInt:
            return h::Fundamental_type::C_uint;
        case CXType_ULong:
            return h::Fundamental_type::C_ulong;
        case CXType_ULongLong:
            return h::Fundamental_type::C_ulonglong;
        case CXType_SChar:
            return h::Fundamental_type::C_schar;
        case CXType_Short:
            return h::Fundamental_type::C_short;
        case CXType_Int:
            return h::Fundamental_type::C_int;
        case CXType_Long:
            return h::Fundamental_type::C_long;
        case CXType_LongLong:
            return h::Fundamental_type::C_longlong;
        case CXType_Float:
            return h::Fundamental_type::Float32;
        case CXType_Double:
            return h::Fundamental_type::Float64;
        case CXType_Half:
        case CXType_Float16:
            return h::Fundamental_type::Float16;
            case CXType_LongDouble:
            return h::Fundamental_type::C_longdouble;
        default:
            return std::nullopt;
        }
    }

    bool is_integer(CXTypeKind const type_kind)
    {
        switch (type_kind)
        {
        case CXType_Char16:
        case CXType_Char32:
            return true;
        default:
            return false;
        }
    }

    h::Integer_type create_integer_type(CXTypeKind const type_kind)
    {
        switch (type_kind)
        {
        case CXType_Char16:
            return h::Integer_type
            {
                .number_of_bits = 16,
                .is_signed = true
            };
        case CXType_Char32:
            return h::Integer_type
            {
                .number_of_bits = 32,
                .is_signed = true
            };
        default:
            throw std::runtime_error{ "Type is not integer!" };
        }
    }

    std::string_view find_enum_name(std::string_view const spelling)
    {
        std::size_t begin_word = 0;

        for (std::size_t i = 0; i < spelling.size(); ++i)
        {
            char const character = spelling[i];
            if (character == ' ' || (i + 1) == spelling.size())
            {
                std::size_t const end_word = character == ' ' ? i - begin_word : (i + 1) - begin_word;
                std::string_view const word = spelling.substr(begin_word, end_word);

                if (word != "enum" && word != "const")
                {
                    return word;
                }

                begin_word = i + 1;
            }
        }

        throw std::runtime_error("Could not find enum name!");
    }

    std::optional<h::Type_reference> create_type_reference(C_declarations const& declarations, CXCursor cursor, CXType type);

    h::Function_type create_function_type(C_declarations const& declarations, CXCursor const cursor, CXType const function_type)
    {
        CXType const result_type = clang_getResultType(function_type);
        std::optional<h::Type_reference> result_type_reference = create_type_reference(declarations, cursor, result_type);
        std::pmr::vector<h::Type_reference> output_parameter_types =
            result_type_reference.has_value() ?
            std::pmr::vector<h::Type_reference>{*result_type_reference} :
            std::pmr::vector<h::Type_reference>{};

        int const number_of_arguments = clang_getNumArgTypes(function_type);

        std::pmr::vector<h::Type_reference> input_parameter_types;
        input_parameter_types.reserve(number_of_arguments);

        for (int argument_index = 0; argument_index < number_of_arguments; ++argument_index)
        {
            CXType const argument_type = clang_getArgType(function_type, argument_index);

            std::optional<h::Type_reference> parameter_type = create_type_reference(declarations, cursor, argument_type);
            if (!parameter_type.has_value())
            {
                throw std::runtime_error{ "Parameter type is void which is invalid!" };
            }

            input_parameter_types.push_back(std::move(*parameter_type));
        }

        bool const is_variadic = clang_isFunctionTypeVariadic(function_type) == 1;

        h::Function_type h_function_type
        {
            .input_parameter_types = std::move(input_parameter_types),
            .output_parameter_types = std::move(output_parameter_types),
            .is_variadic = is_variadic
        };

        return h_function_type;
    }

    h::Function_pointer_type create_function_pointer_type(C_declarations const& declarations, CXCursor const cursor, CXType const function_type)
    {
        h::Function_type h_function_type = create_function_type(declarations, cursor, function_type);

        int const number_of_arguments = clang_getNumArgTypes(function_type);

        std::pmr::vector<std::pmr::string> input_parameter_names;
        input_parameter_names.reserve(number_of_arguments);

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            std::pmr::vector<std::pmr::string>* const input_parameter_names = reinterpret_cast<std::pmr::vector<std::pmr::string>*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_ParmDecl)
            {
                String const input_parameter_spelling = clang_getCursorSpelling(current_cursor);
                std::string_view const input_parameter_name = input_parameter_spelling.string_view();
                std::pmr::string name = !input_parameter_name.empty() ? std::pmr::string{ input_parameter_name } : std::pmr::string{ std::format("parameter_{}", input_parameter_names->size()) };

                input_parameter_names->push_back(std::move(name));
            }

            return CXChildVisit_Continue;
        };

        clang_visitChildren(
            cursor,
            visitor,
            &input_parameter_names
        );

        CXType const result_type = clang_getResultType(function_type);
        std::optional<h::Type_reference> result_type_reference = create_type_reference(declarations, cursor, result_type);
        std::pmr::vector<std::pmr::string> output_parameter_names;
        if (result_type_reference.has_value())
            output_parameter_names.emplace_back("result");

        h::Function_pointer_type h_function_pointer_type
        {
            .type = std::move(h_function_type),
            .input_parameter_names = std::move(input_parameter_names),
            .output_parameter_names = std::move(output_parameter_names),
        };

        return h_function_pointer_type;
    }

    std::string_view remove_type(std::string_view const string)
    {
        if (string.starts_with("enum "))
        {
            return string.substr(5);
        }
        else if (string.starts_with("struct "))
        {
            return string.substr(7);
        }
        else if (string.starts_with("union "))
        {
            return string.substr(6);
        }
        else
        {
            return string;
        }
    }

    std::optional<h::Type_reference> create_type_reference(C_declarations const& declarations, CXCursor const cursor, CXType const type)
    {
        {
            std::optional<h::Fundamental_type> const fundamental_type =
                to_fundamental_type(type.kind);

            if (fundamental_type)
            {
                return h::Type_reference
                {
                    .data = *fundamental_type
                };
            }

            if (is_integer(type.kind))
            {
                h::Integer_type const integer_type = create_integer_type(type.kind);

                return h::Type_reference
                {
                    .data = integer_type
                };
            }
        }

        switch (type.kind)
        {
        case CXType_Auto:
        {
            CXCursor const initializer_cursor = clang_Cursor_getVarDeclInitializer(cursor);

            if (clang_Cursor_isNull(initializer_cursor))
                return std::nullopt;

            CXType const result_type = clang_getCursorType(initializer_cursor);
            if (result_type.kind == CXType_Auto)
                return std::nullopt;
            
            return create_type_reference(declarations, initializer_cursor, result_type);
        }
        case CXType_Complex:
        {
            std::cerr << "Warning: ignoring _Complex type\n";
            return std::nullopt;
        }
        case CXType_IncompleteArray:
        case CXType_Pointer:
        {
            CXType const pointee_type = type.kind == CXType_Pointer ? clang_getPointeeType(type) : clang_getArrayElementType(type);
            bool const is_const = clang_isConstQualifiedType(pointee_type);

            std::optional<Type_reference> element_type = create_type_reference(declarations, cursor, pointee_type);

            h::Pointer_type pointer_type
            {
                .element_type = element_type.has_value() ? std::pmr::vector<Type_reference>{std::move(*element_type)} : std::pmr::vector<Type_reference>{},
                .is_mutable = !is_const
            };

            return h::Type_reference
            {
                .data = std::move(pointer_type)
            };
        }
        case CXType_Enum:
        {
            String const enum_type_spelling = clang_getTypeSpelling(type);
            std::string_view const enum_type_name = find_enum_name(enum_type_spelling.string_view());

            auto const location = std::find_if(
                declarations.enum_declarations.begin(),
                declarations.enum_declarations.end(),
                [enum_type_name](h::Enum_declaration const& declaration) -> bool { return declaration.name == enum_type_name; }
            );

            if (location == declarations.enum_declarations.end())
            {
                std::string const message = std::format("Could not find enum with name '{}'\n", enum_type_name);
                std::cerr << message;
                throw std::runtime_error{ message };
            }

            h::Enum_declaration const& declaration = *location;

            h::Custom_type_reference reference
            {
                .module_reference = {
                    .name = {}
                },
                .name = declaration.name
            };

            return h::Type_reference
            {
                .data = std::move(reference)
            };
        }
        case CXType_Typedef:
        {
            String const type_spelling = { clang_getTypedefName(type) };
            std::string_view const typedef_name = type_spelling.string_view();

            if (typedef_name.starts_with("__builtin_"))
            {
                h::Builtin_type_reference reference
                {
                    .value = std::pmr::string{typedef_name}
                };

                return h::Type_reference
                {
                    .data = std::move(reference)
                };
            }

            auto const location = std::find_if(
                declarations.alias_type_declarations.begin(),
                declarations.alias_type_declarations.end(),
                [typedef_name](h::Alias_type_declaration const& declaration) -> bool { return declaration.name == typedef_name; }
            );

            if (location == declarations.alias_type_declarations.end())
            {
                CXType const canonical_type = clang_getCanonicalType(type);
                if (canonical_type.kind == CXType_Enum || canonical_type.kind == CXType_Record)
                    return create_type_reference(declarations, cursor, canonical_type);

                std::string const message = std::format("Could not find typedef with name '{}'\n", typedef_name);
                std::cerr << message;
                throw std::runtime_error{ message };
            }

            h::Alias_type_declaration const& declaration = *location;

            h::Custom_type_reference reference
            {
                .module_reference = {
                    .name = {}
                },
                .name = declaration.name
            };

            return h::Type_reference
            {
                .data = std::move(reference)
            };
        }
        case CXType_FunctionProto:
        {
            h::Function_pointer_type function_pointer_type = create_function_pointer_type(declarations, cursor, type);
            return h::Type_reference
            {
                .data = std::move(function_pointer_type)
            };
        }
        case CXType_Record:
        {
            String const type_spelling = { clang_getTypeSpelling(type) };
            std::string_view const type_spelling_string = type_spelling.string_view();
            std::string_view type_name = remove_type(type_spelling_string);

            return h::create_custom_type_reference("", type_name);
        }
        case CXType_Void:
        {
            return std::nullopt;
        }
        case CXType_Elaborated:
        {
            CXType const named_type = clang_Type_getNamedType(type);
            return create_type_reference(declarations, cursor, named_type);
        }
        case CXType_ConstantArray:
        {
            CXType const element_type = clang_getArrayElementType(type);
            long long const size = clang_getArraySize(type);

            std::optional<h::Type_reference> element_type_reference = create_type_reference(declarations, cursor, element_type);

            if (!element_type_reference.has_value())
            {
                std::string const message = "Element type of an array cannot be void!";
                std::cerr << message << '\n';
                throw std::runtime_error{ message };
            }

            h::Constant_array_type reference
            {
                .value_type = {std::move(*element_type_reference)},
                .size = static_cast<std::uint64_t>(size)
            };

            return h::Type_reference
            {
                .data = std::move(reference)
            };
        }
        case CXType_Float128:
        {
            std::cerr << "Warning: ignoring Float128 type\n";
            return std::nullopt;
        }
        default:
        {
            Header_source_location const source_location = get_cursor_source_location(cursor);
            String const file_path = { clang_getFileName(source_location.file) };

            String const type_spelling = { clang_getTypeSpelling(type) };
            String const type_kind_spelling = { clang_getTypeKindSpelling(type.kind) };

            std::cerr << std::format("{}: Line {} Column {} Did not recognize type.kind '{}'! Type name is '{}\n", file_path.string_view(), source_location.source_location.line, source_location.source_location.column, type_kind_spelling.string_view(), type_spelling.string_view());
            throw std::runtime_error{ "Did not recognize type.kind!" };
        }
        }
    }

    std::optional<h::Alias_type_declaration> create_alias_type_declaration(C_declarations const& declarations, CXCursor const cursor)
    {
        CXType const type = clang_getCursorType(cursor);
        String const type_spelling = { clang_getTypeSpelling(type) };
        std::string_view const type_name = type_spelling.string_view();

        CXType const underlying_type = clang_getTypedefDeclUnderlyingType(cursor);
        String const underlying_type_spelling = { clang_getTypeSpelling(underlying_type) };
        std::string_view const underlying_type_name = remove_type(underlying_type_spelling.string_view());

        if (type_name == underlying_type_name)
            return std::nullopt;

        std::optional<h::Type_reference> underlying_type_reference = create_type_reference(declarations, cursor, underlying_type);

        std::pmr::vector<h::Type_reference> alias_type;
        if (underlying_type_reference.has_value())
        {
            alias_type.push_back(*underlying_type_reference);
        }

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        return h::Alias_type_declaration
        {
            .name = std::pmr::string{type_name},
            .unique_name = std::pmr::string{type_name},
            .type = std::move(alias_type),
            .source_location = cursor_location.source_location,
        };
    }

    h::Enum_declaration create_enum_declaration(C_declarations const& declarations, CXCursor const cursor)
    {
        using Enum_values = std::pmr::vector<h::Enum_value>;

        CXType const enum_type = clang_getCursorType(cursor);

        String const enum_type_spelling = clang_getTypeSpelling(enum_type);
        std::string_view const enum_type_name = find_enum_name(enum_type_spelling.string_view());

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            Enum_values* const values = reinterpret_cast<Enum_values*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_EnumConstantDecl)
            {
                String const enum_constant_spelling = clang_getCursorSpelling(current_cursor);
                std::string_view const enum_constant_name = enum_constant_spelling.string_view();

                std::uint64_t const enum_constant_value = static_cast<std::uint64_t>(clang_getEnumConstantDeclUnsignedValue(current_cursor));

                h::Statement statement_value
                {
                    .expressions = {
                        h::Expression
                        {
                            .data = h::Constant_expression
                            {
                                .type = {
                                    .data = h::Integer_type
                                    {
                                        .number_of_bits = 32,
                                        .is_signed = true
                                    }
                                },
                                .data = std::pmr::string{std::to_string(enum_constant_value)}
                            }
                        }
                    }
                };

                values->push_back(
                    h::Enum_value
                    {
                        .name = std::pmr::string{enum_constant_name},
                        .value = std::move(statement_value)
                    }
                );
            }

            return CXChildVisit_Continue;
        };

        Enum_values values;

        clang_visitChildren(
            cursor,
            visitor,
            &values
        );

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        return h::Enum_declaration
        {
            .name = std::pmr::string{enum_type_name},
            .unique_name = std::pmr::string{enum_type_name},
            .values = std::move(values),
            .source_location = cursor_location.source_location,
        };
    }

    std::pmr::vector<std::pmr::string> create_input_parameter_names(CXCursor const cursor)
    {
        int const number_of_arguments = clang_Cursor_getNumArguments(cursor);

        std::pmr::vector<std::pmr::string> parameter_names;
        parameter_names.reserve(number_of_arguments);

        for (int argument_index = 0; argument_index < number_of_arguments; ++argument_index)
        {
            CXCursor const argument_cursor = clang_Cursor_getArgument(cursor, argument_index);
            String const argument_name = { clang_getCursorSpelling(argument_cursor) };

            parameter_names.push_back(std::pmr::string{ argument_name.string_view() });
        }

        return parameter_names;
    }

    std::pmr::vector<std::pmr::string> create_output_parameter_names(std::size_t const number_of_outputs)
    {
        if (number_of_outputs == 0)
        {
            return {};
        }

        return std::pmr::vector<std::pmr::string>{"result"};
    }

    std::pmr::vector<h::Source_position> create_input_parameter_source_positions(
        CXCursor const cursor
    )
    {
        int const number_of_arguments = clang_Cursor_getNumArguments(cursor);

        std::pmr::vector<h::Source_position> parameter_source_positions;
        parameter_source_positions.reserve(number_of_arguments);

        for (int argument_index = 0; argument_index < number_of_arguments; ++argument_index)
        {
            CXCursor const argument_cursor = clang_Cursor_getArgument(cursor, argument_index);

            Header_source_location const cursor_location = get_cursor_source_location(
                argument_cursor
            );

            parameter_source_positions.push_back(get_source_position(cursor_location));
        }

        return parameter_source_positions;
    }

    std::pmr::vector<h::Source_position> create_output_parameter_source_positions(
        CXCursor const cursor,
        std::size_t const number_of_outputs
    )
    {
        if (number_of_outputs == 0)
            return {};

        CXType const return_type = clang_getResultType(clang_getCursorType(cursor));
        CXCursor const return_type_cursor = clang_getTypeDeclaration(return_type);

        CXSourceRange const cursor_extent = clang_getCursorExtent(cursor);
        CXSourceLocation const start_location = clang_getRangeStart(cursor_extent);

        CXFile file = {};
        unsigned line = 0;
        unsigned column = 0;
        clang_getFileLocation(
            start_location,
            &file,
            &line,
            &column,
            nullptr
        );

        return
        {
            {
                .line = line,
                .column = column,
            }
        };
    }

    std::string_view get_line_without_comments(std::string_view const line, bool const is_multi_line_comment)
    {
        std::size_t begin_index = 0;

        if (is_multi_line_comment && line.size() >= 2)
        {
            if (line.starts_with("/**"))
                begin_index = 3;
            else if (line.starts_with("/*"))
                begin_index = 2;
            else if (line.starts_with(" */"))
                begin_index = 3;
            else if (line.starts_with(" *"))
                begin_index = 2;
        }

        std::string_view const rest_of_line{line.begin() + begin_index, line.end()};
        if (rest_of_line.starts_with(" "))
            return rest_of_line.substr(1);

        return rest_of_line;
    }

    bool is_whitespace_or_newline(char const character)
    {
        switch (character)
        {
        case ' ':
        case '\t':
        case '\r':
        case '\n':
            return true;
        default:
            return false;
        }
    }
    
    bool is_empty_line(std::string_view const line)
    {
        return std::ranges::all_of(line, is_whitespace_or_newline);
    }

    std::pmr::string remove_whitespace_or_new_line_characters(std::string_view const text)
    {
        std::size_t start_index = 0;
        if (text.starts_with(" "))
            start_index += 1;

        std::pmr::string output;
        output.reserve(text.size());

        for (std::size_t index = start_index; index < text.size(); ++index)
        {
            char const character = text[index];

            if (character == '\n' || character == '\r')
            {
                if (index + 1 < text.size() && text[index + 1] != ' ')
                    output.push_back(' ');
                
                continue;
            }
            
            output.push_back(character);
        }

        return output;
    }

    bool is_input_parameter_line_comment(std::string_view const line)
    {
        return line.starts_with("\\param") || line.starts_with("@param");
    }

    bool is_output_parameter_line_comment(std::string_view const line)
    {
        return line.starts_with("\\return") || line.starts_with("@return");
    }

    bool is_parameter_line_comment(std::string_view const line)
    {
        return is_input_parameter_line_comment(line) || is_output_parameter_line_comment(line);
    }

    std::pmr::string format_input_parameter_line_comment(std::string_view const line)
    {
        constexpr std::size_t begin_parameter_name_index = 7;
        std::size_t const end_parameter_name_index = line.find_first_of(" ", begin_parameter_name_index);
        std::string_view const parameter_name = line.substr(begin_parameter_name_index, end_parameter_name_index - begin_parameter_name_index);

        std::string_view const rest_of_line = line.substr(end_parameter_name_index + 1);

        std::string const formatted_line = std::format("@input_parameter {}: {}", parameter_name, rest_of_line);
        return std::pmr::string{formatted_line};
    }

    std::pmr::string format_output_parameter_line_comment(std::string_view const line)
    {
        std::string_view const rest_of_line = line.substr(8);

        std::string const formatted_line = std::format("@output_parameter result: {}", rest_of_line);
        return std::pmr::string{formatted_line};
    }

    std::pair<std::optional<std::pmr::string>, std::size_t> get_continuous_text(
        std::span<std::pmr::string const> const lines,
        std::size_t const line_index,
        bool const is_multi_line_comment
    )
    {
        std::stringstream stream;

        std::size_t current_line_index = line_index;
        while (current_line_index < lines.size())
        {
            std::pmr::string const& line = lines[current_line_index];
            std::string_view const line_without_comments = get_line_without_comments(line, is_multi_line_comment);

            if (is_empty_line(line_without_comments))
            {
                current_line_index += 1;    
                break;
            }
            else if (is_parameter_line_comment(line_without_comments) && current_line_index > line_index)
            {
                break;
            }

            stream << line_without_comments;

            current_line_index += 1;
        }

        std::string const result = stream.str();
        if (result.empty())
            return std::make_pair(std::optional<std::pmr::string>{}, current_line_index);

        std::pmr::string const clean_line = remove_whitespace_or_new_line_characters(result);

        return std::make_pair(std::optional<std::pmr::string>{std::pmr::string{clean_line}}, current_line_index);
    }

    std::optional<std::pmr::string> create_function_comment(
        CXCursor const cursor
    )
    {
        String const raw_comment_string = clang_Cursor_getRawCommentText(cursor);
        std::string_view const raw_comment = raw_comment_string.string_view();
        if (raw_comment.empty())
            return std::nullopt;

        bool const is_multi_line_comment = raw_comment.starts_with("/*");

        std::pmr::string short_description;
        std::pmr::string long_description;
        std::pmr::vector<std::pmr::string> input_parameter_descriptions;
        std::pmr::vector<std::pmr::string> output_parameter_descriptions;

        std::size_t new_lines = 0;

        std::pmr::vector<std::pmr::string> lines;
        for (auto const& line : std::views::split(raw_comment, '\n'))
            lines.push_back(std::pmr::string{line.begin(), line.end()});

        std::size_t line_index = 0;
        while (line_index < lines.size())
        {
            std::pair<std::optional<std::pmr::string>, std::size_t> const result = get_continuous_text(lines, line_index, is_multi_line_comment);

            std::optional<std::pmr::string> const continuous_text = result.first;
            if (continuous_text.has_value())
            {
                if (short_description.empty())
                {
                    short_description = *continuous_text;
                }
                else if (is_input_parameter_line_comment(*continuous_text))
                {
                    input_parameter_descriptions.push_back(*continuous_text);
                }
                else if (is_output_parameter_line_comment(*continuous_text))
                {
                    output_parameter_descriptions.push_back(*continuous_text);
                }
                else
                {
                    if (!long_description.empty())
                        long_description += "\n\n";
                    long_description += *continuous_text;
                }
            }
            
            line_index = result.second;
        }

        std::stringstream stream;

        if (!short_description.empty())
        {
            stream << short_description << '\n';
            if (!long_description.empty() || (input_parameter_descriptions.size() + output_parameter_descriptions.size()) > 0)
                stream << '\n';
        }

        if (!long_description.empty())
        {
            stream << long_description << '\n';
            if ((input_parameter_descriptions.size() + output_parameter_descriptions.size()) > 0)
                stream << '\n';
        }

        for (std::pmr::string const& comment : input_parameter_descriptions)
        {
            if (!comment.empty())
            {
                std::pmr::string formatted_comment = format_input_parameter_line_comment(comment);
                stream << formatted_comment << '\n';
            }
        }

        for (std::pmr::string const& comment : output_parameter_descriptions)
        {
            if (!comment.empty())
            {
                std::pmr::string formatted_comment = format_output_parameter_line_comment(comment);
                stream << formatted_comment << '\n';
            }
        }

        return std::pmr::string{stream.str()};
    }

    h::Function_declaration create_function_declaration(C_declarations const& declarations, CXCursor const cursor)
    {
        String const cursor_spelling = { clang_getCursorSpelling(cursor) };
        std::string_view const function_name = cursor_spelling.string_view();
        if (function_name == "puts") {
            int i = 0;
        }

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        CXType const function_type = clang_getCursorType(cursor);

        h::Function_type h_function_type = create_function_type(declarations, cursor, function_type);

        std::pmr::vector<std::pmr::string> input_parameter_names = create_input_parameter_names(cursor);
        std::pmr::vector<std::pmr::string> output_parameter_names = create_output_parameter_names(h_function_type.output_parameter_types.size());

        std::pmr::vector<h::Source_position> input_parameter_source_positions = create_input_parameter_source_positions(cursor);
        std::pmr::vector<h::Source_position> output_parameter_source_positions = create_output_parameter_source_positions(cursor, h_function_type.output_parameter_types.size());

        std::optional<std::pmr::string> comment = create_function_comment(cursor);

        return h::Function_declaration
        {
            .name = std::pmr::string{function_name},
            .unique_name = std::pmr::string{function_name},
            .type = std::move(h_function_type),
            .input_parameter_names = std::move(input_parameter_names),
            .output_parameter_names = std::move(output_parameter_names),
            .linkage = h::Linkage::External,
            .comment = std::move(comment),
            .source_location = cursor_location.source_location,
            .input_parameter_source_positions = std::move(input_parameter_source_positions),
            .output_parameter_source_positions = std::move(output_parameter_source_positions),
        };
    }

    C_macro_declaration create_macro_declaration(CXCursor const cursor)
    {
        String const macro_spelling = { clang_getCursorSpelling(cursor) };
        std::string_view const macro_name = macro_spelling.string_view();

        bool const is_function_like = clang_Cursor_isMacroFunctionLike(cursor) != 0;

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        C_macro_declaration macro
        {
            .name = std::pmr::string{ macro_name },
            .is_function_like = false,
            .source_location = cursor_location.source_location,
        };

        return macro;
    }

    std::optional<h::Statement> get_global_variable_initial_value(CXCursor const cursor, h::Type_reference const& type)
    {
        CXCursor const initializer_cursor = clang_Cursor_getVarDeclInitializer(cursor);

        if (!clang_Cursor_isNull(initializer_cursor))
        {
            Evaluation_result const evaluation_result = clang_Cursor_Evaluate(initializer_cursor);
            if (evaluation_result.value != nullptr)
            {
                switch (clang_EvalResult_getKind(evaluation_result.value))
                {
                case CXEval_Int:
                {
                    if (clang_EvalResult_isUnsignedInt(evaluation_result.value) != 0)
                    {
                        unsigned long long const value = clang_EvalResult_getAsUnsigned(evaluation_result.value);
                        return h::create_statement(
                            {
                                h::create_constant_expression(
                                    type,
                                    std::to_string(value)
                                )
                            }
                        );
                    }
                    else
                    {
                        long long const value = clang_EvalResult_getAsLongLong(evaluation_result.value);
                        return h::create_statement(
                            {
                                h::create_constant_expression(
                                    type,
                                    std::to_string(value)
                                )
                            }
                        );
                    }
                }
                case CXEval_Float:
                {
                    double const value = clang_EvalResult_getAsDouble(evaluation_result.value);
                    return h::create_statement(
                        {
                            h::create_constant_expression(
                                type,
                                std::to_string(value)
                            )
                        }
                    );
                    break;
                }
                case CXEval_StrLiteral:
                {
                    char const* const value = clang_EvalResult_getAsStr(evaluation_result.value);
                    return h::create_statement(
                        {
                            h::create_constant_expression(
                                type,
                                value
                            )
                        }
                    );
                    break;
                }
                default:
                {
                    break;
                }
                }
            }
        }

        return std::nullopt;
    }

    void set_global_variable_default_values(
        h::Module const& core_module,
        h::Module_declarations& declarations,
        h::Declaration_database const& declaration_database
    )
    {
        for (h::Global_variable_declaration& global_variable_declaration : declarations.global_variable_declarations)
        {
            if (global_variable_declaration.initial_value == h::Statement{})
            {
                if (!global_variable_declaration.type.has_value())
                    throw std::runtime_error{std::format("Cannot deduce type of global variable '{}'", global_variable_declaration.name)};

                h::Statement default_value = create_default_value(*global_variable_declaration.type, core_module, declaration_database);
                global_variable_declaration.initial_value = std::move(default_value);
            }
        }
    }

    std::optional<h::Global_variable_declaration> create_global_variable_declaration(C_declarations const& declarations, CXCursor const cursor)
    {
        String const cursor_spelling = { clang_getCursorSpelling(cursor) };
        std::string_view const variable_name = cursor_spelling.string_view();

        CXType const variable_type = clang_getCursorType(cursor);
        bool const is_const = clang_isConstQualifiedType(variable_type);

        std::optional<h::Type_reference> const type_reference = create_type_reference(declarations, cursor, variable_type);
        if (!type_reference.has_value())
            return std::nullopt;

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        std::optional<h::Statement> initial_value = get_global_variable_initial_value(cursor, type_reference.value());

        return h::Global_variable_declaration
        {
            .name = std::pmr::string{variable_name},
            .unique_name = std::pmr::string{variable_name},
            .type = std::move(*type_reference),
            .initial_value = initial_value.has_value() ? std::move(*initial_value) : h::Statement{},
            .is_mutable = !is_const,
            .comment = std::nullopt,
            .source_location = cursor_location.source_location,
        };
    }

    bool is_unnamed_type(CXType const type)
    {
        if (type.kind == CXType_Elaborated)
        {
            CXType const named_type = clang_Type_getNamedType(type);
            CXCursor const declaration_cursor = clang_getTypeDeclaration(named_type);
            
            return clang_Cursor_isAnonymous(declaration_cursor);
        }

        CXCursor const cursor = clang_getTypeDeclaration(type);
        return clang_Cursor_isAnonymous(cursor);
    }

    bool is_unnamed_type(CXCursor const cursor)
    {
        return is_unnamed_type(clang_getCursorType(cursor));
    }

    bool is_unnamed_or_anonymous_type(CXCursor const cursor)
    {
        return clang_Cursor_isAnonymousRecordDecl(cursor) || is_unnamed_type(cursor);
    }

    std::pmr::string create_declaration_name(C_declarations const& declarations, CXCursor const cursor)
    {
        bool const is_anonymous = clang_Cursor_isAnonymousRecordDecl(cursor);
        if (is_anonymous || is_unnamed_type(cursor))
        {
            std::pmr::string module_name_prefix = declarations.module_name;
            std::replace(module_name_prefix.begin(), module_name_prefix.end(), '.', '_');

            std::uint32_t const anonymous_id = declarations.unnamed_count;

            return std::pmr::string{ std::format("_{}_Anonymous_{}", module_name_prefix, anonymous_id) };
        }

        String const cursor_spelling = { clang_getCursorSpelling(cursor) };
        std::string_view const declaration_name = cursor_spelling.string_view();
        return std::pmr::string{ declaration_name };
    }

    std::optional<std::pmr::string> find_named_field_with_type(CXCursor const cursor, CXType const anonymous_type)
    {
        struct Client_data
        {
            CXType type_to_find;
            bool found = false;
            std::pmr::string found_field_name;
        };

        Client_data client_data
        {
            .type_to_find = anonymous_type,
        };

        auto const visitor = [](CXCursor const current_cursor, CXCursor const parent, CXClientData const client_data) -> CXChildVisitResult
        {
            Client_data* const data = reinterpret_cast<Client_data*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);
            if (cursor_kind == CXCursor_FieldDecl)
            {
                CXType const cursor_type = clang_getCursorType(current_cursor);
                if (cursor_type.kind == CXType_Elaborated)
                {
                    CXType const named_type = clang_Type_getNamedType(cursor_type);

                    if (clang_equalTypes(named_type, data->type_to_find) != 0)
                    {
                        String const field_spelling = clang_getCursorSpelling(current_cursor);
                        std::string_view const field_name = field_spelling.string_view();

                        data->found = true;
                        data->found_field_name = std::pmr::string{ field_name };
                        return CXChildVisit_Break;
                    }
                }
            }

            return CXChildVisit_Continue;
        };

        clang_visitChildren(
            cursor,
            visitor,
            &client_data
        );

        if (client_data.found)
            return std::move(client_data.found_field_name);
        else
            return std::nullopt;
    }

    std::pmr::string create_member_name_that_has_unnamed_type(CXCursor current_cursor, CXCursor parent, std::span<std::pmr::string const> const member_names)
    {
        /*CXType const unnamed_type = clang_getCursorType(current_cursor);
        std::optional<std::pmr::string> named_field = find_named_field_with_type(parent, unnamed_type);
        if (named_field.has_value())
            return *named_field;*/

        std::size_t anonymous_member_count = std::count_if(member_names.begin(), member_names.end(), [](std::string_view const member_name) -> bool { return member_name.starts_with("anonymous_"); });
        return std::pmr::string{ std::format("anonymous_{}", anonymous_member_count) };
    }

    h::Union_declaration create_union_declaration(C_declarations& declarations, CXCursor const cursor);

    h::Struct_declaration create_struct_declaration(C_declarations& declarations, CXCursor const cursor)
    {
        struct Client_data
        {
            C_declarations* declarations;
            h::Struct_declaration* struct_declaration;
        };

        std::pmr::string const struct_name = create_declaration_name(declarations, cursor);

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            Client_data* const data = reinterpret_cast<Client_data*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_FieldDecl)
            {
                String const member_spelling = clang_getCursorSpelling(current_cursor);
                std::string_view const member_name = member_spelling.string_view();

                CXType const member_type = clang_getCursorType(current_cursor);

                if (is_unnamed_type(member_type))
                {
                    data->struct_declaration->member_names.push_back(std::pmr::string{ member_name });
                }
                else if (clang_Cursor_isBitField(current_cursor))
                {
                    std::optional<h::Type_reference> member_type_reference = create_type_reference(*data->declarations, current_cursor, member_type);

                    std::uint32_t const bit_field_width = static_cast<std::uint32_t>(clang_getFieldDeclBitWidth(current_cursor));

                    data->struct_declaration->member_names.push_back(std::pmr::string{ member_name });
                    data->struct_declaration->member_types.push_back(std::move(member_type_reference.value()));
                    data->struct_declaration->member_bit_fields.push_back(bit_field_width);
                }
                else
                {
                    std::optional<h::Type_reference> const member_type_reference = create_type_reference(*data->declarations, current_cursor, member_type);

                    if (!member_type_reference.has_value())
                    {
                        throw std::runtime_error{ "Member type of struct cannot be void!" };
                    }

                    data->struct_declaration->member_names.push_back(std::pmr::string{ member_name });
                    data->struct_declaration->member_types.push_back(std::move(*member_type_reference));
                    data->struct_declaration->member_bit_fields.push_back(std::nullopt);
                }

                {
                    Header_source_location const cursor_location = get_cursor_source_location(
                        current_cursor
                    );

                    data->struct_declaration->member_source_positions->push_back(
                        get_source_position(cursor_location)
                    );
                }
            }
            else if (cursor_kind == CXCursor_StructDecl && is_unnamed_or_anonymous_type(current_cursor))
            {
                data->declarations->unnamed_count += 1;
                h::Struct_declaration nested_struct_declaration = create_struct_declaration(*data->declarations, current_cursor);

                if (clang_Cursor_isAnonymousRecordDecl(current_cursor))
                {
                    std::pmr::string member_name = create_member_name_that_has_unnamed_type(current_cursor, parent, data->struct_declaration->member_names);
                    data->struct_declaration->member_names.push_back(std::move(member_name));
                }

                h::Custom_type_reference reference
                {
                    .module_reference = {
                        .name = {}
                    },
                    .name = nested_struct_declaration.name
                };
                data->struct_declaration->member_types.push_back({ .data = std::move(reference) });
                data->struct_declaration->member_bit_fields.push_back(std::nullopt);

                data->declarations->struct_declarations.push_back(std::move(nested_struct_declaration));
            }
            else if (cursor_kind == CXCursor_UnionDecl && is_unnamed_or_anonymous_type(current_cursor))
            {
                data->declarations->unnamed_count += 1;
                h::Union_declaration nested_union_declaration = create_union_declaration(*data->declarations, current_cursor);

                if (clang_Cursor_isAnonymousRecordDecl(current_cursor))
                {
                    std::pmr::string member_name = create_member_name_that_has_unnamed_type(current_cursor, parent, data->struct_declaration->member_names);
                    data->struct_declaration->member_names.push_back(std::move(member_name));
                }

                h::Custom_type_reference reference
                {
                    .module_reference = {
                        .name = {}
                    },
                    .name = nested_union_declaration.name
                };
                data->struct_declaration->member_types.push_back({ .data = std::move(reference) });
                data->struct_declaration->member_bit_fields.push_back(std::nullopt);
    
                data->declarations->union_declarations.push_back(std::move(nested_union_declaration));
            }

            return CXChildVisit_Continue;
        };

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        h::Struct_declaration struct_declaration
        {
            .name = struct_name,
            .unique_name = struct_name,
            .member_types = {},
            .member_names = {},
            .member_bit_fields = {},
            .member_default_values = {},
            .is_packed = false,
            .is_literal = false,
            .source_location = cursor_location.source_location,
            .member_source_positions = std::pmr::vector<h::Source_position>{}
        };

        Client_data client_data
        {
            .declarations = &declarations,
            .struct_declaration = &struct_declaration
        };

        clang_visitChildren(
            cursor,
            visitor,
            &client_data
        );

        assert(struct_declaration.member_names.size() == struct_declaration.member_types.size());
        assert(struct_declaration.member_names.size() == struct_declaration.member_bit_fields.size());

        return struct_declaration;
    }

    h::Union_declaration create_union_declaration(C_declarations& declarations, CXCursor const cursor)
    {
        struct Client_data
        {
            C_declarations* declarations;
            h::Union_declaration* union_declaration;
        };
        
        std::pmr::string const union_name = create_declaration_name(declarations, cursor);

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            Client_data* const data = reinterpret_cast<Client_data*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_FieldDecl)
            {
                String const member_spelling = clang_getCursorSpelling(current_cursor);
                std::string_view const member_name = member_spelling.string_view();

                CXType const member_type = clang_getCursorType(current_cursor);

                if (is_unnamed_type(member_type))
                {
                    data->union_declaration->member_names.push_back(std::pmr::string{ member_name });
                }
                else
                {
                    std::optional<h::Type_reference> const member_type_reference = create_type_reference(*data->declarations, current_cursor, member_type);

                    if (!member_type_reference.has_value())
                    {
                        throw std::runtime_error{ "Member type of union cannot be void!" };
                    }

                    data->union_declaration->member_names.push_back(std::pmr::string{ member_name });
                    data->union_declaration->member_types.push_back(std::move(*member_type_reference));
                }

                {
                    Header_source_location const cursor_location = get_cursor_source_location(
                        current_cursor
                    );

                    data->union_declaration->member_source_positions->push_back(
                        get_source_position(cursor_location)
                    );
                }
            }
            else if (cursor_kind == CXCursor_StructDecl && is_unnamed_or_anonymous_type(current_cursor))
            {
                data->declarations->unnamed_count += 1;
                h::Struct_declaration nested_struct_declaration = create_struct_declaration(*data->declarations, current_cursor);

                if (clang_Cursor_isAnonymousRecordDecl(current_cursor))
                {
                    std::pmr::string member_name = create_member_name_that_has_unnamed_type(current_cursor, parent, data->union_declaration->member_names);
                    data->union_declaration->member_names.push_back(std::move(member_name));
                }

                h::Custom_type_reference reference
                {
                    .module_reference = {
                        .name = {}
                    },
                    .name = nested_struct_declaration.name
                };
                data->union_declaration->member_types.push_back({ .data = std::move(reference) });

                data->declarations->struct_declarations.push_back(std::move(nested_struct_declaration));
            }
            else if (cursor_kind == CXCursor_UnionDecl && is_unnamed_or_anonymous_type(current_cursor))
            {
                data->declarations->unnamed_count += 1;
                h::Union_declaration nested_union_declaration = create_union_declaration(*data->declarations, current_cursor);

                if (clang_Cursor_isAnonymousRecordDecl(current_cursor))
                {
                    std::pmr::string member_name = create_member_name_that_has_unnamed_type(current_cursor, parent, data->union_declaration->member_names);
                    data->union_declaration->member_names.push_back(std::move(member_name));
                }
                
                h::Custom_type_reference reference
                {
                    .module_reference = {
                        .name = {}
                    },
                    .name = nested_union_declaration.name
                };
                data->union_declaration->member_types.push_back({ .data = std::move(reference) });

                data->declarations->union_declarations.push_back(std::move(nested_union_declaration));
            }

            return CXChildVisit_Continue;
        };

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        h::Union_declaration union_declaration
        {
            .name = union_name,
            .unique_name = union_name,
            .member_types = {},
            .member_names = {},
            .source_location = cursor_location.source_location,
            .member_source_positions = std::pmr::vector<h::Source_position>{}
        };

        Client_data client_data
        {
            .declarations = &declarations,
            .union_declaration = &union_declaration
        };

        clang_visitChildren(
            cursor,
            visitor,
            &client_data
        );

        assert(union_declaration.member_names.size() == union_declaration.member_types.size());

        return union_declaration;
    }

    bool is_fixed_width_integer_typedef_name(std::string_view const name)
    {
        return
            name == "int8_t" ||
            name == "int16_t" ||
            name == "int32_t" ||
            name == "int64_t" ||
            name == "uint8_t" ||
            name == "uint16_t" ||
            name == "uint32_t" ||
            name == "uint64_t";
    }

    bool is_fixed_width_integer_typedef_reference(h::Custom_type_reference const& reference, std::span<std::string_view const> const integer_alias_names)
    {
        if (!reference.module_reference.name.empty())
        {
            return false;
        }

        auto const location = std::find(
            integer_alias_names.begin(),
            integer_alias_names.end(),
            reference.name
        );

        return location != integer_alias_names.end();
    }

    h::Integer_type create_integer_type_from_fixed_width_integer_typedef_name(std::string_view const name)
    {
        if (name == "int8_t")
        {
            return h::Integer_type
            {
                .number_of_bits = 8,
                .is_signed = true
            };
        }
        else if (name == "int16_t")
        {
            return h::Integer_type
            {
                .number_of_bits = 16,
                .is_signed = true
            };
        }
        else if (name == "int32_t")
        {
            return h::Integer_type
            {
                .number_of_bits = 32,
                .is_signed = true
            };
        }
        else if (name == "int64_t")
        {
            return h::Integer_type
            {
                .number_of_bits = 64,
                .is_signed = true
            };
        }
        else if (name == "uint8_t")
        {
            return h::Integer_type
            {
                .number_of_bits = 8,
                .is_signed = false
            };
        }
        else if (name == "uint16_t")
        {
            return h::Integer_type
            {
                .number_of_bits = 16,
                .is_signed = false
            };
        }
        else if (name == "uint32_t")
        {
            return h::Integer_type
            {
                .number_of_bits = 32,
                .is_signed = false
            };
        }
        else if (name == "uint64_t")
        {
            return h::Integer_type
            {
                .number_of_bits = 64,
                .is_signed = false
            };
        }

        std::string const message = std::format("Unrecognized fixed width integer typedef name '{}'", name);
        throw std::runtime_error{ message };
    }

    void convert_typedef_to_integer_type_if_necessary(
        h::Type_reference& type,
        std::span<h::Alias_type_declaration const> const alias_type_declarations,
        std::span<std::string_view const> const integer_alias_names,
        std::span<std::size_t const> const integer_alias_indices
    )
    {
        if (std::holds_alternative<h::Custom_type_reference>(type.data))
        {
            h::Custom_type_reference const& reference = std::get<h::Custom_type_reference>(type.data);

            if (is_fixed_width_integer_typedef_reference(reference, integer_alias_names))
            {
                auto const name_location = std::find(integer_alias_names.begin(), integer_alias_names.end(), reference.name);
                auto const name_index = std::distance(integer_alias_names.begin(), name_location);
                std::size_t integer_alias_index = integer_alias_indices[name_index];
                h::Alias_type_declaration const& integer_alias_declaration = alias_type_declarations[integer_alias_index];

                type.data = create_integer_type_from_fixed_width_integer_typedef_name(integer_alias_declaration.name);
            }
        }
        else if (std::holds_alternative<h::Constant_array_type>(type.data))
        {
            h::Constant_array_type& data = std::get<h::Constant_array_type>(type.data);

            for (h::Type_reference& reference : data.value_type)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    alias_type_declarations,
                    integer_alias_names,
                    integer_alias_indices
                );
            }
        }
        else if (std::holds_alternative<h::Function_pointer_type>(type.data))
        {
            h::Function_pointer_type& data = std::get<h::Function_pointer_type>(type.data);

            for (h::Type_reference& reference : data.type.input_parameter_types)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    alias_type_declarations,
                    integer_alias_names,
                    integer_alias_indices
                );
            }

            for (h::Type_reference& reference : data.type.output_parameter_types)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    alias_type_declarations,
                    integer_alias_names,
                    integer_alias_indices
                );
            }
        }
        else if (std::holds_alternative<h::Pointer_type>(type.data))
        {
            h::Pointer_type& data = std::get<h::Pointer_type>(type.data);

            for (h::Type_reference& reference : data.element_type)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    alias_type_declarations,
                    integer_alias_names,
                    integer_alias_indices
                );
            }
        }
    }

    C_declarations convert_fixed_width_integers_typedefs_to_integer_types(C_declarations const& input)
    {
        std::pmr::vector<std::size_t> indices;
        indices.reserve(8);

        for (std::size_t index = 0; index < input.alias_type_declarations.size(); ++index)
        {
            h::Alias_type_declaration const& alias_type_declaration = input.alias_type_declarations[index];

            if (is_fixed_width_integer_typedef_name(alias_type_declaration.name))
            {
                indices.push_back(index);

                if (indices.size() == indices.capacity())
                {
                    break;
                }
            }
        }

        std::pmr::vector<std::string_view> names;
        names.reserve(indices.size());

        for (std::size_t const index : indices)
        {
            names.push_back(input.alias_type_declarations[index].name);
        }

        C_declarations output = input;

        for (std::size_t i = indices.size(); i > 0; --i)
        {
            std::size_t const index = indices[i - 1];
            output.alias_type_declarations.erase(output.alias_type_declarations.begin() + index);
        }

        for (h::Alias_type_declaration& declaration : output.alias_type_declarations)
        {
            for (h::Type_reference& reference : declaration.type)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    input.alias_type_declarations,
                    names,
                    indices
                );
            }
        }

        for (h::Struct_declaration& declaration : output.struct_declarations)
        {
            for (h::Type_reference& reference : declaration.member_types)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    input.alias_type_declarations,
                    names,
                    indices
                );
            }
        }

        for (h::Union_declaration& declaration : output.union_declarations)
        {
            for (h::Type_reference& reference : declaration.member_types)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    input.alias_type_declarations,
                    names,
                    indices
                );
            }
        }

        for (h::Function_declaration& declaration : output.function_declarations)
        {
            for (h::Type_reference& reference : declaration.type.input_parameter_types)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    input.alias_type_declarations,
                    names,
                    indices
                );
            }

            for (h::Type_reference& reference : declaration.type.output_parameter_types)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    input.alias_type_declarations,
                    names,
                    indices
                );
            }
        }

        return output;
    }

    h::Statement create_default_value(
        Type_reference const& value_type,
        h::Module const& core_module,
        h::Declaration_database const& declaration_database
    )
    {
        if (std::holds_alternative<h::Builtin_type_reference>(value_type.data))
        {
            h::Builtin_type_reference const& builtin_type_reference = std::get<h::Builtin_type_reference>(value_type.data);
            // TODO
        }
        else if (std::holds_alternative<h::Constant_array_type>(value_type.data))
        {
            h::Constant_array_type const& constant_array_type = std::get<h::Constant_array_type>(value_type.data);

            h::Statement const element_default_value = create_default_value(constant_array_type.value_type[0], core_module, declaration_database);

            std::pmr::vector<h::Statement> array_data;
            array_data.resize(constant_array_type.size);
            std::fill(array_data.begin(), array_data.end(), element_default_value);

            return h::create_statement(
                {
                    h::create_constant_array_expression(
                        std::move(array_data)
                    )
                }
            );
        }
        else if (std::holds_alternative<h::Custom_type_reference>(value_type.data))
        {
            h::Custom_type_reference const& custom_type_reference = std::get<h::Custom_type_reference>(value_type.data);

            std::optional<Declaration> const declaration_optional = h::find_declaration(declaration_database, core_module.name, custom_type_reference.name);
            if (declaration_optional.has_value())
            {
                h::Declaration const& declaration = declaration_optional.value();
                if (std::holds_alternative<h::Alias_type_declaration const*>(declaration.data))
                {
                    h::Alias_type_declaration const* alias_type_declaration = std::get<h::Alias_type_declaration const*>(declaration.data);
                    if (alias_type_declaration->type.empty())
                        throw std::runtime_error{ std::format("Alias type '{}' is void!", alias_type_declaration->name) };

                    std::optional<Type_reference> const underlying_type_optional = h::get_underlying_type(declaration_database, alias_type_declaration->type[0]);
                    if (!underlying_type_optional.has_value())
                        throw std::runtime_error{ std::format("Alias type '{}' is void!", alias_type_declaration->name) };

                    Type_reference const& underlying_type = underlying_type_optional.value();
                    return create_default_value(underlying_type, core_module, declaration_database);
                }
                else if (std::holds_alternative<h::Enum_declaration const*>(declaration.data))
                {
                    h::Enum_declaration const* enum_declaration = std::get<h::Enum_declaration const*>(declaration.data);

                    if (enum_declaration->values.empty())
                        throw std::runtime_error{ std::format("Enum '{}' is empty!", enum_declaration->name) };

                    return h::create_statement(
                        h::create_enum_value_expressions(enum_declaration->name, enum_declaration->values[0].name)
                    );
                }
                else if (std::holds_alternative<h::Struct_declaration const*>(declaration.data))
                {
                    return h::create_statement(
                        {
                            h::create_instantiate_expression(Instantiate_expression_type::Default, {})
                        }
                    );
                }
                else if (std::holds_alternative<h::Union_declaration const*>(declaration.data))
                {
                    h::Union_declaration const* union_declaration = std::get<h::Union_declaration const*>(declaration.data);

                    if (union_declaration->member_types.empty()) {
                        return h::create_statement(
                            {
                                h::create_instantiate_expression(Instantiate_expression_type::Default, {})
                            }
                        );
                    }

                    h::Instantiate_member_value_pair member_value
                    {
                        .member_name = union_declaration->member_names[0],
                        .value = create_default_value(union_declaration->member_types[0], core_module, declaration_database)
                    };

                    return h::create_statement(
                        {
                            h::create_instantiate_expression(Instantiate_expression_type::Default, {std::move(member_value)})
                        }
                    );
                }
            }
        }
        else if (std::holds_alternative<h::Fundamental_type>(value_type.data))
        {
            h::Fundamental_type const& fundamental_type = std::get<h::Fundamental_type>(value_type.data);

            switch (fundamental_type)
            {
            case h::Fundamental_type::Bool: {
                return h::create_statement(
                    {
                        h::create_constant_expression(
                            value_type,
                            "false"
                        )
                    }
                );
            }
            case h::Fundamental_type::Float16:
            case h::Fundamental_type::Float32:
            case h::Fundamental_type::Float64:
            case h::Fundamental_type::C_longdouble: {
                return h::create_statement(
                    {
                        h::create_constant_expression(
                            value_type,
                            "0.0"
                        )
                    }
                );
            }
            case h::Fundamental_type::String: {
                return h::create_statement(
                    {
                        h::create_constant_expression(
                            value_type,
                            ""
                        )
                    }
                );
            }
            case h::Fundamental_type::Byte:
            case h::Fundamental_type::C_bool:
            case h::Fundamental_type::C_char:
            case h::Fundamental_type::C_schar:
            case h::Fundamental_type::C_uchar:
            case h::Fundamental_type::C_short:
            case h::Fundamental_type::C_ushort:
            case h::Fundamental_type::C_int:
            case h::Fundamental_type::C_uint:
            case h::Fundamental_type::C_long:
            case h::Fundamental_type::C_ulong:
            case h::Fundamental_type::C_longlong:
            case h::Fundamental_type::C_ulonglong: {
                return h::create_statement(
                    {
                        h::create_constant_expression(
                            value_type,
                            "0"
                        )
                    }
                );
            }
            }
        }
        else if (std::holds_alternative<h::Function_pointer_type>(value_type.data))
        {
            h::Function_pointer_type const& function_type = std::get<h::Function_pointer_type>(value_type.data);
            return h::create_statement(
                {
                    h::create_null_pointer_expression()
                }
            );
        }
        else if (std::holds_alternative<h::Integer_type>(value_type.data))
        {
            return h::create_statement(
                {
                    h::create_constant_expression(
                        value_type,
                        "0"
                    )
                }
            );
        }
        else if (std::holds_alternative<h::Pointer_type>(value_type.data))
        {
            h::Pointer_type const& pointer_type = std::get<h::Pointer_type>(value_type.data);
            return h::create_statement(
                {
                    h::create_null_pointer_expression()
                }
            );
        }

        throw std::runtime_error{ "create_default_value() did not handle Type_reference type!" };
    }

    void add_struct_member_default_values(
        h::Module const& core_module,
        h::Module_declarations& declarations,
        h::Declaration_database const& declaration_database
    )
    {
        for (h::Struct_declaration& struct_declaration : declarations.struct_declarations)
        {
            struct_declaration.member_default_values.reserve(struct_declaration.member_types.size());

            for (std::size_t index = 0; index < struct_declaration.member_types.size(); ++index)
            {
                Type_reference const& member_type = struct_declaration.member_types[index];

                h::Statement default_value = create_default_value(member_type, core_module, declaration_database);
                struct_declaration.member_default_values.push_back(std::move(default_value));
            }
        }
    }

    static std::pmr::vector<char const*> convert_to_c_string(
        std::span<std::pmr::string const> strings
    )
    {
        std::pmr::vector<char const*> c_strings;
        c_strings.reserve(strings.size());

        for (std::pmr::string const& string : strings)
        {
            c_strings.push_back(string.data());
        }

        return c_strings;
    }

    static CXTranslationUnit create_translation_unit(
        CXIndex const index,
        std::filesystem::path const& header_path,
        Options const& options
    )
    {
        std::string const source_filename = header_path.generic_string();

        CXTranslationUnit unit;

        std::pmr::vector<std::pmr::string> arguments_storage;
        arguments_storage.reserve(3 + options.include_directories.size());

        arguments_storage.push_back("-std=c23");

        if (options.target_triple.has_value())
        {
            arguments_storage.push_back("-target");
            arguments_storage.push_back(options.target_triple->data());
        }

        for (std::filesystem::path const& include_directory : options.include_directories)
        {
            std::string argument = std::format("-I{}", include_directory.generic_string());
            arguments_storage.push_back(std::pmr::string{argument});
        }

        std::pmr::vector<char const*> arguments = convert_to_c_string(arguments_storage);

        unsigned const flags =
            CXTranslationUnit_DetailedPreprocessingRecord |
            CXTranslationUnit_KeepGoing |
            CXTranslationUnit_SkipFunctionBodies;

        CXErrorCode const error = clang_parseTranslationUnit2(
            index,
            source_filename.c_str(),
            arguments.data(),
            arguments.size(),
            nullptr,
            0,
            flags,
            &unit
        );

        if (error != CXError_Success)
        {
            constexpr char const* message = "Unable to parse translation unit. Quitting.";
            std::cerr << message << std::endl;
            throw std::runtime_error{ message };
        }

        CXTargetInfo targetInfo = clang_getTranslationUnitTargetInfo(unit);
        String triple = { clang_TargetInfo_getTriple(targetInfo) };
        auto v = triple.string_view();

        return unit;
    }

    bool is_public_declaration(std::string_view const declaration_name, std::span<std::pmr::string const> const public_prefixes)
    {
        if (public_prefixes.empty())
        {
            if (declaration_name.size() > 0 && declaration_name[0] == '_')
                return false;

            return true;
        }

        for (std::string_view const public_prefix : public_prefixes)
        {
            if (declaration_name.starts_with(public_prefix))
                return true;
        }

        return false;
    }

    void group_declarations_by_visibility(
        C_declarations const& declarations,
        h::Module_declarations& export_declarations,
        h::Module_declarations& internal_declarations,
        std::span<std::pmr::string const> const public_prefixes
    )
    {
        for (h::Alias_type_declaration const& declaration : declarations.alias_type_declarations)
        {
            if (is_public_declaration(*declaration.unique_name, public_prefixes))
                export_declarations.alias_type_declarations.push_back(declaration);
            else
                internal_declarations.alias_type_declarations.push_back(declaration);
        }

        for (h::Enum_declaration const& declaration : declarations.enum_declarations)
        {
            if (is_public_declaration(*declaration.unique_name, public_prefixes))
                export_declarations.enum_declarations.push_back(declaration);
            else
                internal_declarations.enum_declarations.push_back(declaration);
        }

        for (h::Global_variable_declaration const& declaration : declarations.global_variable_declarations)
        {
            if (is_public_declaration(*declaration.unique_name, public_prefixes))
                export_declarations.global_variable_declarations.push_back(declaration);
            else
                internal_declarations.global_variable_declarations.push_back(declaration);
        }

        for (h::Struct_declaration const& declaration : declarations.struct_declarations)
        {
            if (is_public_declaration(*declaration.unique_name, public_prefixes))
                export_declarations.struct_declarations.push_back(declaration);
            else
                internal_declarations.struct_declarations.push_back(declaration);
        }

        for (h::Union_declaration const& declaration : declarations.union_declarations)
        {
            if (is_public_declaration(*declaration.unique_name, public_prefixes))
                export_declarations.union_declarations.push_back(declaration);
            else
                internal_declarations.union_declarations.push_back(declaration);
        }

        for (h::Function_declaration const& declaration : declarations.function_declarations)
        {
            if (is_public_declaration(*declaration.unique_name, public_prefixes))
                export_declarations.function_declarations.push_back(declaration);
            else
                internal_declarations.function_declarations.push_back(declaration);
        }
    }

    template <typename Function_t>
        bool visit_type_references(
            C_declarations const& declarations,
            Function_t predicate
        )
    {
        for (Alias_type_declaration const& declaration : declarations.alias_type_declarations)
        {
            auto const predicate_with_name = [&](h::Type_reference const& type_reference) -> bool
            {
                return predicate(declaration.name, type_reference);
            };

            if (h::visit_type_references_recursively(declaration, predicate_with_name))
                return true;
        }

        for (Global_variable_declaration const& declaration : declarations.global_variable_declarations)
        {
            auto const predicate_with_name = [&](h::Type_reference const& type_reference) -> bool
            {
                return predicate(declaration.name, type_reference);
            };

            if (h::visit_type_references_recursively(declaration, predicate_with_name))
                return true;
        }

        for (Struct_declaration const& declaration : declarations.struct_declarations)
        {
            auto const predicate_with_name = [&](h::Type_reference const& type_reference) -> bool
            {
                return predicate(declaration.name, type_reference);
            };

            if (h::visit_type_references_recursively(declaration, predicate_with_name))
                return true;
        }

        for (Union_declaration const& declaration : declarations.union_declarations)
        {
            auto const predicate_with_name = [&](h::Type_reference const& type_reference) -> bool
            {
                return predicate(declaration.name, type_reference);
            };

            if (h::visit_type_references_recursively(declaration, predicate_with_name))
                return true;
        }

        for (Function_declaration const& declaration : declarations.function_declarations)
        {
            auto const predicate_with_name = [&](h::Type_reference const& type_reference) -> bool
            {
                return predicate(declaration.name, type_reference);
            };

            if (h::visit_type_references_recursively(declaration, predicate_with_name))
                return true;
        }

        return false;
    }

    template <typename Declaration_type>
    void transform_name(
        Declaration_type& declaration,
        std::span<std::pmr::string const> const remove_prefixes
    )
    {
        for (std::string_view const remove_prefix : remove_prefixes)
        {
            if (declaration.name.starts_with(remove_prefix))
                declaration.name.erase(0, remove_prefix.size());
        }
    }

    void transform_names(
        C_declarations& declarations,
        std::span<std::pmr::string const> const remove_prefixes
    )
    {
        if (remove_prefixes.empty())
            return;

        for (h::Alias_type_declaration& declaration : declarations.alias_type_declarations)
            transform_name(declaration, remove_prefixes);
    
        for (h::Enum_declaration& declaration : declarations.enum_declarations)
            transform_name(declaration, remove_prefixes);

        for (h::Global_variable_declaration& declaration : declarations.global_variable_declarations)
            transform_name(declaration, remove_prefixes);

        for (h::Struct_declaration& declaration : declarations.struct_declarations)
            transform_name(declaration, remove_prefixes);

        for (h::Union_declaration& declaration : declarations.union_declarations)
            transform_name(declaration, remove_prefixes);

        for (h::Function_declaration& declaration : declarations.function_declarations)
            transform_name(declaration, remove_prefixes);

        auto const process_type_reference = [&](std::string_view const declaration_name, h::Type_reference const& type_reference) -> bool
        {
            h::Type_reference* const reference = const_cast<h::Type_reference*>(&type_reference);
            if (std::holds_alternative<h::Custom_type_reference>(reference->data))
            {
                h::Custom_type_reference& custom_type_reference = std::get<h::Custom_type_reference>(reference->data);
                transform_name(custom_type_reference, remove_prefixes);
            }
            return false;
        };

        visit_type_references(declarations, process_type_reference);
    }

    bool ignore_macro(std::string_view const name)
    {
        if (name == "va_start" || name == "va_arg" || name == "va_copy" || name == "va_end" || name == "va_list")
            return true;

        return false;
    }

    void convert_macro_constants_to_global_constant_variables(
        std::string_view const header_name,
        CXIndex const index,
        std::filesystem::path const& header_path,
        Options const& options,
        C_declarations& declarations
    )
    {
        std::filesystem::path const generated_headers_directory = std::filesystem::current_path() / "build" / "generated";

        if (!std::filesystem::exists(generated_headers_directory))
            std::filesystem::create_directories(generated_headers_directory);

        std::filesystem::path const generated_header_path = generated_headers_directory / std::format("{}.h", header_name);
        char const* special_prefix = "__h_global_variable_";

        {
            auto const filename = generated_header_path.generic_string();
            std::FILE* const file = std::fopen(filename.c_str(), "w");
            if (file == nullptr)
                throw std::runtime_error{std::format("Cannot write to file {}\n", filename)};

            std::fputs("#include \"", file);
            std::fputs(header_path.generic_string().c_str(), file);
            std::fputs("\"\n\n", file);

            for (C_macro_declaration const& macro_declaration : declarations.macro_declarations)
            {
                if (!macro_declaration.name.starts_with("_") && !macro_declaration.is_function_like && !ignore_macro(macro_declaration.name))
                {
                    std::fputs("auto const ", file);
                    std::fputs(special_prefix, file);
                    std::fputs(macro_declaration.name.c_str(), file);
                    std::fputs(" = ", file);
                    std::fputs(macro_declaration.name.c_str(), file);
                    std::fputs(";\n", file);
                }
            }

            std::fclose(file);
        }

        CXTranslationUnit unit = create_translation_unit(index, generated_header_path, options);

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            C_declarations* const declarations = reinterpret_cast<C_declarations*>(client_data);
            std::string_view const special_prefix = "__h_global_variable_";

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_VarDecl)
            {
                String const variable_spelling = { clang_getCursorSpelling(current_cursor) };
                std::string_view const variable_name = variable_spelling.string_view();

                if (variable_name.starts_with(special_prefix))
                {
                    std::optional<h::Global_variable_declaration> declaration = create_global_variable_declaration(*declarations, current_cursor);
                    if (declaration.has_value())
                    {
                        declaration->name = variable_name.substr(special_prefix.size());
                        declaration->unique_name = declaration->name;

                        auto const macro_location = std::find_if(declarations->macro_declarations.begin(), declarations->macro_declarations.end(), [&](C_macro_declaration const& macro_declaration) -> bool { return macro_declaration.name == declaration->name; });
                        if (macro_location != declarations->macro_declarations.end())
                            declaration->source_location = macro_location->source_location;

                        declarations->global_variable_declarations.push_back(std::move(*declaration));
                    }
                }
            }

            return CXChildVisit_Continue;
        };

        CXCursor cursor = clang_getTranslationUnitCursor(unit);

        clang_visitChildren(
            cursor,
            visitor,
            &declarations
        );

        clang_disposeTranslationUnit(unit);
    }

    h::Module import_header(
        std::string_view const header_name,
        std::filesystem::path const& header_path,
        Options const& options,
        CXIndex const index,
        CXTranslationUnit const unit
    )
    {
        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            C_declarations* const declarations = reinterpret_cast<C_declarations*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (g_debug)
            {
                String const cursor_spelling = { clang_getCursorSpelling(current_cursor) };
                String const cursor_kind_spelling = { clang_getCursorKindSpelling(cursor_kind) };
                std::cout << "Cursor '" << cursor_spelling.string_view() << "' of kind '" << cursor_kind_spelling.string_view() << "'\n";

                /*if (cursor_spelling.string_view() == "puts")
                {
                    int i = 0;
                }*/
            }

            // TODO add builtin typedefs?
            
            if (cursor_kind == CXCursor_EnumDecl)
            {
                h::Enum_declaration declaration = create_enum_declaration(*declarations, current_cursor);
                declarations->enum_declarations.push_back(std::move(declaration));
            }
            else if (cursor_kind == CXCursor_TypedefDecl)
            {
                std::optional<h::Alias_type_declaration> declaration = create_alias_type_declaration(*declarations, current_cursor);
                if (declaration.has_value())
                    declarations->alias_type_declarations.push_back(std::move(declaration.value()));
            }
            else if (cursor_kind == CXCursor_FunctionDecl)
            {
                declarations->function_declarations.push_back(create_function_declaration(*declarations, current_cursor));
            }
            else if (cursor_kind == CXCursor_MacroDefinition)
            {
                declarations->macro_declarations.push_back(create_macro_declaration(current_cursor));
            }
            else if (cursor_kind == CXCursor_StructDecl)
            {
                declarations->struct_declarations.push_back(create_struct_declaration(*declarations, current_cursor));
            }
            else if (cursor_kind == CXCursor_UnionDecl)
            {
                declarations->union_declarations.push_back(create_union_declaration(*declarations, current_cursor));
            }
            else if (cursor_kind == CXCursor_VarDecl)
            {
                std::optional<h::Global_variable_declaration> declaration = create_global_variable_declaration(*declarations, current_cursor);
                if (declaration.has_value())
                    declarations->global_variable_declarations.push_back(std::move(*declaration));
            }

            return CXChildVisit_Continue;
        };

        C_declarations declarations;
        declarations.module_name = header_name;

        CXCursor cursor = clang_getTranslationUnitCursor(unit);

        clang_visitChildren(
            cursor,
            visitor,
            &declarations
        );

        convert_macro_constants_to_global_constant_variables(
            header_name,
            index,
            header_path,
            options,
            declarations
        );

        C_declarations declarations_with_fixed_width_integers = convert_fixed_width_integers_typedefs_to_integer_types(declarations);
        transform_names(declarations_with_fixed_width_integers, options.remove_prefixes);

        h::Declaration_database declaration_database = h::create_declaration_database();
        h::add_declarations(
            declaration_database,
            header_name,
            declarations_with_fixed_width_integers.alias_type_declarations,
            declarations_with_fixed_width_integers.enum_declarations,
            declarations_with_fixed_width_integers.global_variable_declarations,
            declarations_with_fixed_width_integers.struct_declarations,
            declarations_with_fixed_width_integers.union_declarations,
            declarations_with_fixed_width_integers.function_declarations,
            {},
            {}
        );
        
        h::Module header_module
        {
            .language_version = {
                .major = 0,
                .minor = 1,
                .patch = 0
            },
            .name = std::pmr::string{ header_name },
            .dependencies = {},
            .export_declarations = {},
            .internal_declarations = {},
            .definitions = {},
            .source_file_path = header_path
        };

        group_declarations_by_visibility(declarations_with_fixed_width_integers, header_module.export_declarations, header_module.internal_declarations, options.public_prefixes);

        h::fix_custom_type_references(header_module);
        add_struct_member_default_values(header_module, header_module.export_declarations, declaration_database);
        add_struct_member_default_values(header_module, header_module.internal_declarations, declaration_database);

        set_global_variable_default_values(header_module, header_module.export_declarations, declaration_database);
        set_global_variable_default_values(header_module, header_module.internal_declarations, declaration_database);

        return header_module;
    }

    h::Module import_header(
        std::string_view const header_name,
        std::filesystem::path const& header_path,
        Options const& options
    )
    {
        CXIndex index = clang_createIndex(0, 0);
        CXTranslationUnit unit = create_translation_unit(index, header_path, options);

        h::Module header_module = import_header(header_name, header_path, options, index, unit);

        clang_disposeTranslationUnit(unit);
        clang_disposeIndex(index);

        return header_module;
    }

    h::Module import_header_and_write_to_file(std::string_view const header_name, std::filesystem::path const& header_path, std::filesystem::path const& output_path, Options const& options)
    {
        /*std::optional<std::uint64_t> current_header_hash = calculate_header_file_hash(header_path, options.target_triple, options.include_directories);

        if (current_header_hash.has_value() && std::filesystem::exists(output_path))
        {
            std::optional<h::json::Header> const core_header = h::json::read_header(output_path);
            if (core_header.has_value())
            {
                std::optional<std::uint64_t> const cached_header_hash = core_header->content_hash;
                if (cached_header_hash.has_value())
                {
                    if (current_header_hash.value() == cached_header_hash.value())
                        return;
                }
            }
        }*/

        h::Module header_module = import_header(header_name, header_path, options);
        //header_module.content_hash = current_header_hash;
        h::binary_serializer::write_module_to_file(output_path, header_module, {});

        return header_module;
    }

    h::Struct_layout calculate_struct_layout(
        CXCursor const current_cursor
    )
    {
        struct Client_Data
        {
            CXType struct_type = {};
            h::Struct_layout struct_layout = {};
        };

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            Client_Data* const data = reinterpret_cast<Client_Data*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_FieldDecl)
            {
                String const member_name = { clang_getCursorSpelling(current_cursor) };
                long long const member_offset_in_bits = clang_Type_getOffsetOf(data->struct_type, clang_getCString(member_name.value));

                CXType const member_type = clang_getCursorType(current_cursor);
                long long const member_size = clang_Type_getSizeOf(member_type);
                long long const member_alignment = clang_Type_getAlignOf(member_type);

                data->struct_layout.members.push_back(
                    {
                        .offset = static_cast<std::uint64_t>(member_offset_in_bits / 8),
                        .size = static_cast<std::uint64_t>(member_size),
                        .alignment = static_cast<std::uint64_t>(member_alignment)
                    }
                );
            }

            return CXChildVisit_Continue;
        };

        CXType const struct_type = clang_getCursorType(current_cursor);
        long long const struct_size = clang_Type_getSizeOf(struct_type);
        long long const struct_alignment = clang_Type_getAlignOf(struct_type);

        Client_Data client_data
        {
            .struct_type = struct_type,
            .struct_layout =
            {
                .size = static_cast<std::uint64_t>(struct_size),
                .alignment = static_cast<std::uint64_t>(struct_alignment),
                .members = {}
            }
        };

        clang_visitChildren(
            current_cursor,
            visitor,
            &client_data
        );

        return client_data.struct_layout;
    }

    h::Struct_layout calculate_struct_layout(
        std::filesystem::path const& header_path,
        std::string_view const struct_name,
        Options const& options
    )
    {
        CXIndex index = clang_createIndex(0, 0);
        CXTranslationUnit unit = create_translation_unit(index, header_path, options);

        struct Client_data
        {
            std::string_view struct_name;
            h::Struct_layout struct_layout = {};
        };

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            Client_data* const data = reinterpret_cast<Client_data*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_StructDecl)
            {
                String const cursor_spelling = { clang_getCursorSpelling(current_cursor) };
                std::string_view const struct_name = cursor_spelling.string_view();

                if (struct_name == data->struct_name)
                {
                    data->struct_layout = calculate_struct_layout(current_cursor);
                    return CXChildVisit_Break;
                }
            }

            return CXChildVisit_Continue;
        };

        CXCursor cursor = clang_getTranslationUnitCursor(unit);

        Client_data client_data
        {
            .struct_name = struct_name,
            .struct_layout = {}
        };

        clang_visitChildren(
            cursor,
            visitor,
            &client_data
        );

        clang_disposeTranslationUnit(unit);
        clang_disposeIndex(index);

        return client_data.struct_layout;
    }
}
