module;

#include <compare>
#include <memory_resource>
#include <optional>
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
        Bool,
        Byte,
        Float16,
        Float32,
        Float64,
        String,
        Any_type,

        C_bool,
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

    export struct Integer_type
    {
        std::uint32_t number_of_bits;
        bool is_signed;

        friend auto operator<=>(Integer_type const& lhs, Integer_type const& rhs) = default;
    };

    export struct Builtin_type_reference
    {
        std::pmr::string value;

        friend auto operator<=>(Builtin_type_reference const& lhs, Builtin_type_reference const& rhs) = default;
    };

    export struct Function_type
    {
        std::pmr::vector<Type_reference> input_parameter_types;
        std::pmr::vector<Type_reference> output_parameter_types;
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

    export struct Constant_array_type
    {
        std::pmr::vector<Type_reference> value_type;
        std::uint64_t size;

        friend auto operator<=>(Constant_array_type const&, Constant_array_type const&) = default;
    };

    export struct Custom_type_reference
    {
        Module_reference module_reference;
        std::pmr::string name;

        friend auto operator<=>(Custom_type_reference const&, Custom_type_reference const&) = default;
    };

    export struct Type_reference
    {
        using Data_type = std::variant<
            Builtin_type_reference,
            Constant_array_type,
            Custom_type_reference,
            Fundamental_type,
            Function_type,
            Integer_type,
            Pointer_type
        >;

        Data_type data;

        friend auto operator<=>(Type_reference const&, Type_reference const&) = default;
    };

    export struct Alias_type_declaration
    {
        std::pmr::string name;
        std::pmr::vector<Type_reference> type;

        friend auto operator<=>(Alias_type_declaration const& lhs, Alias_type_declaration const& rhs) = default;
    };

    export struct Enum_value
    {
        std::pmr::string name;
        std::uint64_t value;

        friend auto operator<=>(Enum_value const& lhs, Enum_value const& rhs) = default;
    };

    export struct Enum_declaration
    {
        std::pmr::string name;
        std::pmr::vector<Enum_value> values;

        friend auto operator<=>(Enum_declaration const& lhs, Enum_declaration const& rhs) = default;
    };

    export struct Struct_declaration
    {
        std::pmr::string name;
        std::pmr::vector<Type_reference> member_types;
        std::pmr::vector<std::pmr::string> member_names;
        bool is_packed;
        bool is_literal;

        friend auto operator<=>(Struct_declaration const&, Struct_declaration const&) = default;
    };

    export struct Variable_expression
    {
        std::pmr::string name;

        friend auto operator<=>(Variable_expression const&, Variable_expression const&) = default;
    };

    export struct Expression_index
    {
        std::uint64_t expression_index;

        friend auto operator<=>(Expression_index const&, Expression_index const&) = default;
    };

    export enum class Binary_operation
    {
        Add,
        Subtract,
        Multiply,
        Divide,
        Modulus,

        Equal,
        Not_equal,
        Less_than,
        Less_than_or_equal_to,
        Greater_than,
        Greater_than_or_equal_to,

        Logical_and,
        Logical_or,

        Bitwise_and,
        Bitwise_or,
        Bitwise_xor,

        Bit_shift_left,
        Bit_shift_right
    };

    export struct Assignment_expression
    {
        Expression_index left_hand_side;
        Expression_index right_hand_side;
        std::optional<Binary_operation> additional_operation;

        friend auto operator<=>(Assignment_expression const&, Assignment_expression const&) = default;
    };

    export struct Binary_expression
    {
        Expression_index left_hand_side;
        Expression_index right_hand_side;
        Binary_operation operation;

        friend auto operator<=>(Binary_expression const&, Binary_expression const&) = default;
    };

    export struct Call_expression
    {
        Module_reference module_reference;
        std::pmr::string function_name;
        std::pmr::vector<Expression_index> arguments;

        friend auto operator<=>(Call_expression const&, Call_expression const&) = default;
    };

    export enum class Cast_type
    {
        Numeric,
        BitCast
    };

    export struct Cast_expression
    {
        Expression_index source;
        Type_reference destination_type;
        Cast_type cast_type;

        friend auto operator<=>(Cast_expression const&, Cast_expression const&) = default;
    };

    export struct Constant_expression
    {
        Type_reference type;
        std::pmr::string data;

        friend auto operator<=>(Constant_expression const&, Constant_expression const&) = default;
    };

    export struct Invalid_expression
    {
        std::pmr::string value;

        friend auto operator<=>(Invalid_expression const&, Invalid_expression const&) = default;
    };

    export struct Parenthesis_expression
    {
        Expression_index expression;

        friend auto operator<=>(Parenthesis_expression const&, Parenthesis_expression const&) = default;
    };

    export struct Return_expression
    {
        Expression_index expression;

        friend auto operator<=>(Return_expression const&, Return_expression const&) = default;
    };

    export struct Struct_member_expression
    {
        Expression_index instance;
        std::pmr::string member_name;

        friend auto operator<=>(Struct_member_expression const&, Struct_member_expression const&) = default;
    };

    export enum class Unary_operation
    {
        Not,
        Bitwise_not,
        Minus,
        Pre_increment,
        Post_increment,
        Pre_decrement,
        Post_decrement,
        Indirection,
        Address_of,
        Size_of
    };

    export struct Unary_expression
    {
        Expression_index expression;
        Unary_operation operation;

        friend auto operator<=>(Unary_expression const&, Unary_expression const&) = default;
    };

    export struct Variable_declaration_expression
    {
        std::pmr::string name;
        bool is_mutable;
        Expression_index right_hand_side;

        friend auto operator<=>(Variable_declaration_expression const&, Variable_declaration_expression const&) = default;
    };

    export struct Expression
    {
        using Data_type = std::variant<
            Assignment_expression,
            Binary_expression,
            Call_expression,
            Cast_expression,
            Constant_expression,
            Invalid_expression,
            Parenthesis_expression,
            Return_expression,
            Struct_member_expression,
            Unary_expression,
            Variable_declaration_expression,
            Variable_expression
        >;

        Data_type data;

        friend auto operator<=>(Expression const&, Expression const&) = default;
    };

    export struct Statement
    {
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
        std::pmr::string name;
        Function_type type;
        std::pmr::vector<std::pmr::string> input_parameter_names;
        std::pmr::vector<std::pmr::string> output_parameter_names;
        Linkage linkage;

        friend auto operator<=>(Function_declaration const&, Function_declaration const&) = default;
    };

    export struct Function_definition
    {
        std::pmr::string name;
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

    export struct Import_module_with_alias
    {
        std::pmr::string module_name;
        std::pmr::string alias;
        std::pmr::vector<std::pmr::string> usages;

        friend auto operator<=>(Import_module_with_alias const&, Import_module_with_alias const&) = default;
    };

    export struct Module_dependencies
    {
        std::pmr::vector<Import_module_with_alias> alias_imports;

        friend auto operator<=>(Module_dependencies const&, Module_dependencies const&) = default;
    };

    export struct Module_declarations
    {
        std::pmr::vector<Alias_type_declaration> alias_type_declarations;
        std::pmr::vector<Enum_declaration> enum_declarations;
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
        Module_dependencies dependencies;
        Module_declarations export_declarations;
        Module_declarations internal_declarations;
        Module_definitions definitions;

        friend auto operator<=>(Module const&, Module const&) = default;
    };
}