module;

#include <filesystem>
#include <format>
#include <iostream>
#include <memory_resource>
#include <numeric>
#include <optional>
#include <span>
#include <string_view>
#include <variant>
#include <vector>

#include <stdio.h>

#include <clang-c/Index.h>

module h.c_header_converter;

import h.core;
import h.core.declarations;
import h.core.expressions;
import h.core.types;
import h.json_serializer;

namespace h::c
{
    static constexpr bool g_debug = false;

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
            return clang_getCString(value);
        }

        CXString value;
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

        return Header_source_location
        {
            .file = file,
            .source_location =
            {
                .line = line,
                .column = column,
            },
        };
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

    std::optional<h::Type_reference> create_type_reference(C_declarations const& declarations, CXType type);

    h::Function_type create_function_type(C_declarations const& declarations, CXType const function_type)
    {
        CXType const result_type = clang_getResultType(function_type);
        std::optional<h::Type_reference> result_type_reference = create_type_reference(declarations, result_type);
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

            std::optional<h::Type_reference> parameter_type = create_type_reference(declarations, argument_type);
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

    std::optional<h::Type_reference> create_type_reference(C_declarations const& declarations, CXType const type)
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
        case CXType_Pointer:
        {
            CXType const pointee_type = clang_getPointeeType(type);
            bool const is_const = clang_isConstQualifiedType(pointee_type);

            std::optional<Type_reference> element_type = create_type_reference(declarations, pointee_type);

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
                    return create_type_reference(declarations, canonical_type);

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
            h::Function_type function_type = create_function_type(declarations, type);
            return h::Type_reference
            {
                .data = function_type
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
            return create_type_reference(declarations, named_type);
        }
        case CXType_ConstantArray:
        {
            CXType const element_type = clang_getArrayElementType(type);
            long long const size = clang_getArraySize(type);

            std::optional<h::Type_reference> element_type_reference = create_type_reference(declarations, element_type);

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
        default:
        {
            String const type_spelling = { clang_getTypeSpelling(type) };
            String const type_kind_spelling = { clang_getTypeKindSpelling(type.kind) };

            std::cerr << "Did not recognize type.kind '" << type_kind_spelling.string_view() << "'! Type name is '" << type_spelling.string_view() << "'\n";
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

        std::optional<h::Type_reference> underlying_type_reference = create_type_reference(declarations, underlying_type);

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

    std::pmr::vector<h::Source_location> create_input_parameter_source_locations(
        CXCursor const cursor
    )
    {
        int const number_of_arguments = clang_Cursor_getNumArguments(cursor);

        std::pmr::vector<h::Source_location> parameter_source_locations;
        parameter_source_locations.reserve(number_of_arguments);

        for (int argument_index = 0; argument_index < number_of_arguments; ++argument_index)
        {
            CXCursor const argument_cursor = clang_Cursor_getArgument(cursor, argument_index);

            Header_source_location const cursor_location = get_cursor_source_location(
                argument_cursor
            );

            parameter_source_locations.push_back(cursor_location.source_location);
        }

        return parameter_source_locations;
    }

    std::pmr::vector<h::Source_location> create_output_parameter_source_locations(
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

        h::Function_type h_function_type = create_function_type(declarations, function_type);

        std::pmr::vector<std::pmr::string> input_parameter_names = create_input_parameter_names(cursor);
        std::pmr::vector<std::pmr::string> output_parameter_names = create_output_parameter_names(h_function_type.output_parameter_types.size());

        std::pmr::vector<h::Source_location> input_parameter_source_locations = create_input_parameter_source_locations(cursor);
        std::pmr::vector<h::Source_location> output_parameter_source_locations = create_output_parameter_source_locations(cursor, h_function_type.output_parameter_types.size());

        return h::Function_declaration
        {
            .name = std::pmr::string{function_name},
            .unique_name = std::pmr::string{function_name},
            .type = std::move(h_function_type),
            .input_parameter_names = std::move(input_parameter_names),
            .output_parameter_names = std::move(output_parameter_names),
            .linkage = h::Linkage::External,
            .source_location = cursor_location.source_location,
            .input_parameter_source_locations = std::move(input_parameter_source_locations),
            .output_parameter_source_locations = std::move(output_parameter_source_locations),
        };
    }

    h::Type_reference create_type_reference_from_bit_field(CXCursor const cursor, CXType const type)
    {
        CXType const canonical_type = clang_getCanonicalType(type);

        std::uint32_t const bit_field_width = static_cast<std::uint32_t>(clang_getFieldDeclBitWidth(cursor));

        switch (canonical_type.kind)
        {
        case CXType_Int:
            return h::Type_reference
            {
                .data = h::Integer_type
                {
                    .number_of_bits = bit_field_width,
                    .is_signed = true
                }
            };
        case CXType_UInt:
            return h::Type_reference
            {
                .data = h::Integer_type
                {
                    .number_of_bits = bit_field_width,
                    .is_signed = false
                }
            };
        case CXType_Bool:
            if (bit_field_width != 1)
            {
                throw std::runtime_error{ "Bit field width of bool must be 1!" };
            }

            return h::Type_reference
            {
                .data = h::Fundamental_type::Bool
            };

        default:
            throw std::runtime_error{ "Data type does not support bit field!" };
        }
    }

    h::Struct_declaration create_struct_declaration(C_declarations const& declarations, CXCursor const cursor)
    {
        struct Client_data
        {
            C_declarations const* declarations;
            h::Struct_declaration* struct_declaration;
        };

        String const cursor_spelling = { clang_getCursorSpelling(cursor) };
        std::string_view const struct_name = cursor_spelling.string_view();

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            Client_data* const data = reinterpret_cast<Client_data*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_FieldDecl)
            {
                String const member_spelling = clang_getCursorSpelling(current_cursor);
                std::string_view const member_name = member_spelling.string_view();

                CXType const member_type = clang_getCursorType(current_cursor);

                if (clang_Cursor_isBitField(current_cursor))
                {
                    h::Type_reference member_type_reference = create_type_reference_from_bit_field(current_cursor, member_type);

                    data->struct_declaration->member_names.push_back(std::pmr::string{ member_name });
                    data->struct_declaration->member_types.push_back(std::move(member_type_reference));
                }
                else
                {
                    std::optional<h::Type_reference> const member_type_reference = create_type_reference(*data->declarations, member_type);

                    if (!member_type_reference.has_value())
                    {
                        throw std::runtime_error{ "Member type of struct cannot be void!" };
                    }

                    data->struct_declaration->member_names.push_back(std::pmr::string{ member_name });
                    data->struct_declaration->member_types.push_back(std::move(*member_type_reference));
                }

                {
                    Header_source_location const cursor_location = get_cursor_source_location(
                        current_cursor
                    );

                    data->struct_declaration->member_source_locations->push_back(
                        cursor_location.source_location
                    );
                }
            }

            return CXChildVisit_Continue;
        };

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        h::Struct_declaration struct_declaration
        {
            .name = std::pmr::string{struct_name},
            .unique_name = std::pmr::string{struct_name},
            .member_types = {},
            .member_names = {},
            .member_default_values = {},
            .is_packed = false,
            .is_literal = false,
            .source_location = cursor_location.source_location,
            .member_source_locations = std::pmr::vector<h::Source_location>{}
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

        return struct_declaration;
    }

    h::Union_declaration create_union_declaration(C_declarations const& declarations, CXCursor const cursor)
    {
        struct Client_data
        {
            C_declarations const* declarations;
            h::Union_declaration* union_declaration;
        };

        String const cursor_spelling = { clang_getCursorSpelling(cursor) };
        std::string_view const union_name = cursor_spelling.string_view();

        auto const visitor = [](CXCursor current_cursor, CXCursor parent, CXClientData client_data) -> CXChildVisitResult
        {
            Client_data* const data = reinterpret_cast<Client_data*>(client_data);

            CXCursorKind const cursor_kind = clang_getCursorKind(current_cursor);

            if (cursor_kind == CXCursor_FieldDecl)
            {
                String const member_spelling = clang_getCursorSpelling(current_cursor);
                std::string_view const member_name = member_spelling.string_view();

                CXType const member_type = clang_getCursorType(current_cursor);

                if (clang_Cursor_isBitField(current_cursor))
                {
                    h::Type_reference member_type_reference = create_type_reference_from_bit_field(current_cursor, member_type);

                    data->union_declaration->member_names.push_back(std::pmr::string{ member_name });
                    data->union_declaration->member_types.push_back(std::move(member_type_reference));
                }
                else
                {
                    std::optional<h::Type_reference> const member_type_reference = create_type_reference(*data->declarations, member_type);

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

                    data->union_declaration->member_source_locations->push_back(
                        cursor_location.source_location
                    );
                }
            }

            return CXChildVisit_Continue;
        };

        Header_source_location const cursor_location = get_cursor_source_location(
            cursor
        );

        h::Union_declaration union_declaration
        {
            .name = std::pmr::string{union_name},
            .unique_name = std::pmr::string{union_name},
            .member_types = {},
            .member_names = {},
            .source_location = cursor_location.source_location,
            .member_source_locations = std::pmr::vector<h::Source_location>{}
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
        else if (std::holds_alternative<h::Function_type>(type.data))
        {
            h::Function_type& data = std::get<h::Function_type>(type.data);

            for (h::Type_reference& reference : data.input_parameter_types)
            {
                convert_typedef_to_integer_type_if_necessary(
                    reference,
                    alias_type_declarations,
                    integer_alias_names,
                    integer_alias_indices
                );
            }

            for (h::Type_reference& reference : data.output_parameter_types)
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

    h::Statement create_struct_member_default_value(
        Type_reference const& member_type,
        h::Module const& core_module,
        h::Declaration_database const& declaration_database
    )
    {
        if (std::holds_alternative<h::Builtin_type_reference>(member_type.data))
        {
            h::Builtin_type_reference const& builtin_type_reference = std::get<h::Builtin_type_reference>(member_type.data);
            // TODO
        }
        else if (std::holds_alternative<h::Constant_array_type>(member_type.data))
        {
            h::Constant_array_type const& constant_array_type = std::get<h::Constant_array_type>(member_type.data);

            h::Statement const element_default_value = create_struct_member_default_value(constant_array_type.value_type[0], core_module, declaration_database);

            std::pmr::vector<h::Statement> array_data;
            array_data.resize(constant_array_type.size);
            std::fill(array_data.begin(), array_data.end(), element_default_value);

            return h::create_statement(
                {
                    h::create_constant_array_expression(
                        constant_array_type.value_type[0],
                        std::move(array_data)
                    )
                }
            );
        }
        else if (std::holds_alternative<h::Custom_type_reference>(member_type.data))
        {
            h::Custom_type_reference const& custom_type_reference = std::get<h::Custom_type_reference>(member_type.data);

            std::optional<Declaration> const member_declaration_optional = h::find_declaration(declaration_database, core_module.name, custom_type_reference.name);
            if (member_declaration_optional.has_value())
            {
                h::Declaration const& member_declaration = member_declaration_optional.value();
                if (std::holds_alternative<h::Alias_type_declaration const*>(member_declaration.data))
                {
                    h::Alias_type_declaration const* alias_type_declaration = std::get<h::Alias_type_declaration const*>(member_declaration.data);
                    if (alias_type_declaration->type.empty())
                        throw std::runtime_error{ std::format("Alias type '{}' is void!", alias_type_declaration->name) };

                    std::optional<Type_reference> const underlying_type_optional = h::get_underlying_type(declaration_database, alias_type_declaration->type[0], core_module, {});
                    if (!underlying_type_optional.has_value())
                        throw std::runtime_error{ std::format("Alias type '{}' is void!", alias_type_declaration->name) };

                    Type_reference const& underlying_type = underlying_type_optional.value();
                    return create_struct_member_default_value(underlying_type, core_module, declaration_database);
                }
                else if (std::holds_alternative<h::Enum_declaration const*>(member_declaration.data))
                {
                    h::Enum_declaration const* enum_declaration = std::get<h::Enum_declaration const*>(member_declaration.data);

                    if (enum_declaration->values.empty())
                        throw std::runtime_error{ std::format("Enum '{}' is empty!", enum_declaration->name) };

                    return h::create_statement(
                        h::create_enum_value_expressions(enum_declaration->name, enum_declaration->values[0].name)
                    );
                }
                else if (std::holds_alternative<h::Struct_declaration const*>(member_declaration.data))
                {
                    return h::create_statement(
                        {
                            h::create_instantiate_expression(Instantiate_expression_type::Default, {})
                        }
                    );
                }
                else if (std::holds_alternative<h::Union_declaration const*>(member_declaration.data))
                {
                    h::Union_declaration const* union_declaration = std::get<h::Union_declaration const*>(member_declaration.data);

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
                        .value = create_struct_member_default_value(union_declaration->member_types[0], core_module, declaration_database)
                    };

                    return h::create_statement(
                        {
                            h::create_instantiate_expression(Instantiate_expression_type::Default, {std::move(member_value)})
                        }
                    );
                }
            }
        }
        else if (std::holds_alternative<h::Fundamental_type>(member_type.data))
        {
            h::Fundamental_type const& fundamental_type = std::get<h::Fundamental_type>(member_type.data);

            switch (fundamental_type)
            {
            case h::Fundamental_type::Bool: {
                return h::create_statement(
                    {
                        h::create_constant_expression(
                            member_type,
                            "false"
                        )
                    }
                );
            }
            case h::Fundamental_type::Float16:
            case h::Fundamental_type::Float32:
            case h::Fundamental_type::Float64: {
                return h::create_statement(
                    {
                        h::create_constant_expression(
                            member_type,
                            "0.0"
                        )
                    }
                );
            }
            case h::Fundamental_type::String: {
                return h::create_statement(
                    {
                        h::create_constant_expression(
                            member_type,
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
                            member_type,
                            "0"
                        )
                    }
                );
            }
            }
        }
        else if (std::holds_alternative<h::Function_type>(member_type.data))
        {
            h::Function_type const& function_type = std::get<h::Function_type>(member_type.data);
            return h::create_statement(
                {
                    h::create_null_pointer_expression()
                }
            );
        }
        else if (std::holds_alternative<h::Integer_type>(member_type.data))
        {
            return h::create_statement(
                {
                    h::create_constant_expression(
                        member_type,
                        "0"
                    )
                }
            );
        }
        else if (std::holds_alternative<h::Pointer_type>(member_type.data))
        {
            h::Pointer_type const& pointer_type = std::get<h::Pointer_type>(member_type.data);
            return h::create_statement(
                {
                    h::create_null_pointer_expression()
                }
            );
        }

        throw std::runtime_error{ "create_struct_member_default_value() did not handle Type_reference type!" };
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

                h::Statement default_value = create_struct_member_default_value(member_type, core_module, declaration_database);
                struct_declaration.member_default_values.push_back(std::move(default_value));
            }
        }
    }

    static CXTranslationUnit create_translation_unit(
        CXIndex const index,
        std::filesystem::path const& header_path,
        Options const& options
    )
    {
        std::string const source_filename = header_path.generic_string();

        CXTranslationUnit unit;

        std::pmr::vector<char const*> arguments;
        arguments.reserve(2);

        if (options.target_triple.has_value())
        {
            arguments.push_back("-target");
            arguments.push_back(options.target_triple->data());
        }

        CXErrorCode const error = clang_parseTranslationUnit2(
            index,
            source_filename.c_str(),
            arguments.data(),
            arguments.size(),
            nullptr,
            0,
            CXTranslationUnit_None,
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

    h::Module import_header(
        std::string_view const header_name,
        std::filesystem::path const& header_path,
        Options const& options
    )
    {
        CXIndex index = clang_createIndex(0, 0);

        CXTranslationUnit unit = create_translation_unit(index, header_path, options);

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

            // TODO generate IDs from names

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
            else if (cursor_kind == CXCursor_StructDecl)
            {
                declarations->struct_declarations.push_back(create_struct_declaration(*declarations, current_cursor));
            }
            else if (cursor_kind == CXCursor_UnionDecl)
            {
                declarations->union_declarations.push_back(create_union_declaration(*declarations, current_cursor));
            }

            return CXChildVisit_Continue;
        };

        C_declarations declarations;

        CXCursor cursor = clang_getTranslationUnitCursor(unit);

        clang_visitChildren(
            cursor,
            visitor,
            &declarations
        );

        clang_disposeTranslationUnit(unit);
        clang_disposeIndex(index);

        C_declarations declarations_with_fixed_width_integers = convert_fixed_width_integers_typedefs_to_integer_types(declarations);

        h::Declaration_database declaration_database = h::create_declaration_database();
        h::add_declarations(
            declaration_database,
            header_name,
            declarations_with_fixed_width_integers.alias_type_declarations,
            declarations_with_fixed_width_integers.enum_declarations,
            declarations_with_fixed_width_integers.struct_declarations,
            declarations_with_fixed_width_integers.union_declarations,
            declarations_with_fixed_width_integers.function_declarations
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
            .export_declarations = {
                .alias_type_declarations = std::move(declarations_with_fixed_width_integers.alias_type_declarations),
                .enum_declarations = std::move(declarations_with_fixed_width_integers.enum_declarations),
                .struct_declarations = std::move(declarations_with_fixed_width_integers.struct_declarations),
                .union_declarations = std::move(declarations_with_fixed_width_integers.union_declarations),
                .function_declarations = std::move(declarations_with_fixed_width_integers.function_declarations),
            },
            .internal_declarations = {},
            .definitions = {},
            .source_file_path = header_path
        };

        h::fix_custom_type_references(header_module);
        add_struct_member_default_values(header_module, header_module.export_declarations, declaration_database);

        return header_module;
    }

    void import_header_and_write_to_file(std::string_view const header_name, std::filesystem::path const& header_path, std::filesystem::path const& output_path, Options const& options)
    {
        h::Module const header_module = import_header(header_name, header_path, options);

        h::json::write<h::Module>(output_path, header_module);
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
