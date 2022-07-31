module;

#include <format>
#include <iostream>
#include <memory_resource>
#include <numeric>
#include <optional>
#include <string_view>
#include <vector>

#include <stdio.h>

#include <clang-c/Index.h>

module h.c_header_converter;

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

    std::optional<h::Fundamental_type> to_fundamental_type(CXTypeKind const type_kind) noexcept
    {
        switch (type_kind)
        {
        case CXType_Char_U:
        case CXType_Char_S:
            return h::Fundamental_type::C_char;
        case CXType_UChar:
            return h::Fundamental_type::C_uchar;
        case CXType_Char16:
            return h::Fundamental_type::Int16;
        case CXType_Char32:
            return h::Fundamental_type::Int32;
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
        case CXType_Bool:
            return h::Fundamental_type::Bool;
        default:
            return std::nullopt;
        }
    }

    std::optional<h::Type_reference> create_type_reference(C_declarations const& declarations, CXType type);

    h::Function_type create_function_type(C_declarations const& declarations, CXType const function_type)
    {
        CXType const result_type = clang_getResultType(function_type);
        std::optional<h::Type_reference> result_type_reference = create_type_reference(declarations, result_type);
        std::pmr::vector<h::Type_reference> return_types =
            result_type_reference.has_value() ?
            std::pmr::vector<h::Type_reference>{*result_type_reference} :
            std::pmr::vector<h::Type_reference>{};

        int const number_of_arguments = clang_getNumArgTypes(function_type);

        std::pmr::vector<h::Type_reference> parameter_types;
        parameter_types.reserve(number_of_arguments);

        for (int argument_index = 0; argument_index < number_of_arguments; ++argument_index)
        {
            CXType const argument_type = clang_getArgType(function_type, argument_index);

            std::optional<h::Type_reference> parameter_type = create_type_reference(declarations, argument_type);
            if (!parameter_type.has_value())
            {
                throw std::runtime_error{ "Parameter type is void which is invalid!" };
            }

            parameter_types.push_back(std::move(*parameter_type));
        }

        bool const is_variadic = clang_isFunctionTypeVariadic(function_type) == 1;

        h::Function_type h_function_type
        {
            .return_types = std::move(return_types),
            .parameter_types = std::move(parameter_types),
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
            // TODO
            return {};
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

            h::Alias_type_reference reference
            {
                .module_reference = {
                    .name = {}
                },
                .id = declaration.id
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
        default:
        {
            String const type_spelling = { clang_getTypeSpelling(type) };
            String const type_kind_spelling = { clang_getTypeKindSpelling(type.kind) };

            std::cerr << "Did not recognize type.kind '" << type_kind_spelling.string_view() << "'! Type name is '" << type_spelling.string_view() << "'\n";
            throw std::runtime_error{ "Did not recognize type.kind!" };
        }
        }
    }

    h::Alias_type_declaration create_alias_type_declaration(C_declarations const& declarations, std::uint64_t const id, CXCursor const cursor)
    {
        CXType const type = clang_getCursorType(cursor);
        String const type_spelling = { clang_getTypeSpelling(type) };

        CXType const canonical_type = clang_getCanonicalType(type);
        std::optional<h::Type_reference> canonical_type_reference = create_type_reference(declarations, canonical_type);

        std::pmr::vector<h::Type_reference> alias_type;
        if (canonical_type_reference.has_value())
        {
            alias_type.push_back(*canonical_type_reference);
        }

        return h::Alias_type_declaration
        {
            .id = id,
            .name = std::pmr::string{type_spelling.string_view()},
            .type = std::move(alias_type)
        };
    }

    std::pmr::vector<std::uint64_t> generate_parameter_ids(int const number_of_arguments)
    {
        std::pmr::vector<std::uint64_t> parameter_ids;
        parameter_ids.resize(number_of_arguments);

        std::iota(parameter_ids.begin(), parameter_ids.end(), std::uint64_t{ 0 });

        return parameter_ids;
    }

    std::pmr::vector<std::pmr::string> create_parameter_names(CXCursor const cursor)
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

    h::Function_declaration create_function_declaration(C_declarations const& declarations, std::uint64_t const id, CXCursor const cursor)
    {
        String const cursor_spelling = { clang_getCursorSpelling(cursor) };
        std::string_view const function_name = cursor_spelling.string_view();

        CXType const function_type = clang_getCursorType(cursor);

        h::Function_type h_function_type = create_function_type(declarations, function_type);

        int const number_of_arguments = clang_getNumArgTypes(function_type);

        return h::Function_declaration
        {
            .id = id,
            .name = std::pmr::string{function_name},
            .type = std::move(h_function_type),
            .parameter_ids = generate_parameter_ids(number_of_arguments),
            .parameter_names = create_parameter_names(cursor),
            .linkage = h::Linkage::External
        };
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

            if (cursor_kind == CXCursor_TypedefDecl)
            {
                std::uint64_t const alias_type_id = declarations->alias_type_declarations.size();
                h::Alias_type_declaration declaration = create_alias_type_declaration(*declarations, alias_type_id, current_cursor);
                declarations->alias_type_declarations.push_back(std::move(declaration));
            }
            else if (cursor_kind == CXCursor_FunctionDecl)
            {
                std::uint64_t const function_id = declarations->function_declarations.size();
                declarations->function_declarations.push_back(create_function_declaration(*declarations, function_id, current_cursor));
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

        return C_header
        {
            .language_version = {
                .major = 0,
                .minor = 1,
                .patch = 0
            },
            .path = header_path,
            .declarations = std::move(declarations)
        };
    }
}
