module;

#include <compare>
#include <memory_resource>
#include <ostream>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

export module h.core;

namespace h
{
    struct Type_reference;

    export enum class Fundamental_type
    {
        Byte,
        Uint8,
        Uint16,
        Uint32,
        Uint64,
        Int8,
        Int16,
        Int32,
        Int64,
        Float16,
        Float32,
        Float64,

        C_char,
        C_schar,
        C_uchar,
        C_short,
        C_ushort,
        C_int,
        C_uint,
        C_long,
        C_ulong,
        C_longlong,
        C_ulonglong
    };

    export std::uint16_t get_precision(Fundamental_type type);

    export struct Function_type
    {
        std::pmr::vector<Type_reference> return_types;
        std::pmr::vector<Type_reference> parameter_types;
        bool is_variadic;

        friend auto operator<=>(Function_type const& lhs, Function_type const& rhs) = default;
    };

    export struct Pointer_type
    {
        std::pmr::vector<Type_reference> element_type;
        bool is_mutable;

        friend auto operator<=>(Pointer_type const& lhs, Pointer_type const& rhs) = default;
    };

    export struct Module_reference
    {
        std::pmr::string name;

        friend auto operator<=>(Module_reference const&, Module_reference const&) = default;
    };

    export struct Struct_type_reference
    {
        Module_reference module_reference;
        std::uint64_t id;

        friend auto operator<=>(Struct_type_reference const&, Struct_type_reference const&) = default;
    };

    export struct Type_reference
    {
        using Data_type = std::variant<
            Fundamental_type,
            Function_type,
            Pointer_type,
            Struct_type_reference
        >;

        Data_type data;

        friend auto operator<=>(Type_reference const&, Type_reference const&) = default;
    };

    export struct Struct_declaration
    {
        std::uint64_t id;
        std::pmr::string name;
        std::pmr::vector<Type_reference> types;
        bool is_packed;
        bool is_literal;

        friend auto operator<=>(Struct_declaration const&, Struct_declaration const&) = default;
    };

    export enum class Variable_expression_type
    {
        Function_argument,
        Local_variable,
        Temporary
    };

    export struct Variable_expression
    {
        Variable_expression_type type;
        std::uint64_t id;

        friend auto operator<=>(Variable_expression const&, Variable_expression const&) = default;
    };

    export enum class Binary_operation
    {
        Add,
        Subtract,
        Multiply,
        Signed_divide,
        Unsigned_divide,
        Less_than
    };

    export struct Binary_expression
    {
        Variable_expression left_hand_side;
        Variable_expression right_hand_side;
        Binary_operation operation;

        friend auto operator<=>(Binary_expression const&, Binary_expression const&) = default;
    };

    export struct Call_expression
    {
        std::pmr::string function_name;
        std::pmr::vector<Variable_expression> arguments;

        friend auto operator<=>(Call_expression const&, Call_expression const&) = default;
    };

    export struct Constant_expression
    {
        Fundamental_type type;
        std::pmr::string data;

        friend auto operator<=>(Constant_expression const&, Constant_expression const&) = default;
    };

    export struct Return_expression
    {
        Variable_expression variable;

        friend auto operator<=>(Return_expression const&, Return_expression const&) = default;
    };

    export struct Expression
    {
        using Data_type = std::variant<
            Binary_expression,
            Call_expression,
            Constant_expression,
            Return_expression,
            Variable_expression
        >;

        Data_type data;

        friend auto operator<=>(Expression const&, Expression const&) = default;
    };

    export struct Statement
    {
        std::uint64_t id;
        std::pmr::string name;
        std::pmr::vector<Expression> expressions;

        friend auto operator<=>(Statement const&, Statement const&) = default;
    };

    export enum class Linkage
    {
        External,
        Private
    };

    export struct Function_declaration
    {
        std::uint64_t id;
        std::pmr::string name;
        Function_type type;
        std::pmr::vector<std::uint64_t> parameter_ids;
        std::pmr::vector<std::pmr::string> parameter_names;
        Linkage linkage;

        friend auto operator<=>(Function_declaration const&, Function_declaration const&) = default;
    };

    export struct Function_definition
    {
        std::uint64_t id;
        std::pmr::vector<Statement> statements;

        friend auto operator<=>(Function_definition const&, Function_definition const&) = default;
    };

    export struct Language_version
    {
        std::uint32_t major;
        std::uint32_t minor;
        std::uint32_t patch;

        friend auto operator<=>(Language_version const&, Language_version const&) = default;
    };

    export struct Module_declarations
    {
        std::pmr::vector<Struct_declaration> struct_declarations;
        std::pmr::vector<Function_declaration> function_declarations;

        friend auto operator<=>(Module_declarations const&, Module_declarations const&) = default;
    };

    export struct Module_definitions
    {
        std::pmr::vector<Function_definition> function_definitions;

        friend auto operator<=>(Module_definitions const&, Module_definitions const&) = default;
    };

    export struct Module
    {
        Language_version language_version;
        std::pmr::string name;
        Module_declarations export_declarations;
        Module_declarations internal_declarations;
        Module_definitions definitions;

        friend auto operator<=>(Module const&, Module const&) = default;
    };
}