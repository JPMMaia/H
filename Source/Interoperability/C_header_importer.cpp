module;

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

namespace h::c
{
    static constexpr bool g_debug = true;

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
            // TODO
            return h::Type_reference{};
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

    h::Alias_type_declaration create_alias_type_declaration(C_declarations const& declarations, CXCursor const cursor)
    {
        CXType const type = clang_getCursorType(cursor);
        String const type_spelling = { clang_getTypeSpelling(type) };
        std::string_view const type_name = type_spelling.string_view();

        CXType const canonical_type = clang_getCanonicalType(type);
        std::optional<h::Type_reference> canonical_type_reference = create_type_reference(declarations, canonical_type);

        std::pmr::vector<h::Type_reference> alias_type;
        if (canonical_type_reference.has_value())
        {
            alias_type.push_back(*canonical_type_reference);
        }

        return h::Alias_type_declaration
        {
            .name = std::pmr::string{type_name},
            .type = std::move(alias_type)
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

                values->push_back(
                    h::Enum_value
                    {
                        .name = std::pmr::string{enum_constant_name},
                        .value = enum_constant_value
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

        return h::Enum_declaration
        {
            .name = std::pmr::string{enum_type_name},
            .values = std::move(values)
        };
    }

    std::pmr::vector<std::uint64_t> generate_parameter_ids(int const number_of_arguments)
    {
        std::pmr::vector<std::uint64_t> parameter_ids;
        parameter_ids.resize(number_of_arguments);

        std::iota(parameter_ids.begin(), parameter_ids.end(), std::uint64_t{ 0 });

        return parameter_ids;
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

    h::Function_declaration create_function_declaration(C_declarations const& declarations, CXCursor const cursor)
    {
        String const cursor_spelling = { clang_getCursorSpelling(cursor) };
        std::string_view const function_name = cursor_spelling.string_view();
        if (function_name == "puts") {
            int i = 0;
        }

        CXType const function_type = clang_getCursorType(cursor);

        h::Function_type h_function_type = create_function_type(declarations, function_type);

        std::pmr::vector<std::pmr::string> input_parameter_names = create_input_parameter_names(cursor);
        std::pmr::vector<std::pmr::string> output_parameter_names = create_output_parameter_names(h_function_type.output_parameter_types.size());

        return h::Function_declaration
        {
            .name = std::pmr::string{function_name},
            .type = std::move(h_function_type),
            .input_parameter_names = std::move(input_parameter_names),
            .output_parameter_names = std::move(output_parameter_names),
            .linkage = h::Linkage::External
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
            }

            return CXChildVisit_Continue;
        };

        h::Struct_declaration struct_declaration
        {
            .name = std::pmr::string{struct_name},
            .member_types = {},
            .member_names = {},
            .is_packed = false,
            .is_literal = false,
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

    C_header import_header(std::filesystem::path const& header_path)
    {
        CXIndex index = clang_createIndex(0, 0);

        CXTranslationUnit unit;
        {
            std::string const source_filename = header_path.generic_string();

            CXErrorCode const error = clang_parseTranslationUnit2(
                index,
                source_filename.c_str(),
                nullptr,
                0,
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
        }

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
                h::Alias_type_declaration declaration = create_alias_type_declaration(*declarations, current_cursor);
                declarations->alias_type_declarations.push_back(std::move(declaration));
            }
            else if (cursor_kind == CXCursor_FunctionDecl)
            {
                declarations->function_declarations.push_back(create_function_declaration(*declarations, current_cursor));
            }
            else if (cursor_kind == CXCursor_StructDecl)
            {
                declarations->struct_declarations.push_back(create_struct_declaration(*declarations, current_cursor));
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

        C_declarations const declarations_with_fixed_width_integers = convert_fixed_width_integers_typedefs_to_integer_types(declarations);

        return C_header
        {
            .language_version = {
                .major = 0,
                .minor = 1,
                .patch = 0
            },
            .path = header_path,
            .declarations = std::move(declarations_with_fixed_width_integers)
        };
    }
}
