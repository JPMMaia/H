module;

#include <compare>
#include <filesystem>
#include <memory_resource>
#include <optional>
#include <ostream>
#include <span>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

export module h.core;

namespace h
{
    export struct Source_location
    {
        std::optional<std::filesystem::path> file_path;
        std::uint32_t line = 0;
        std::uint32_t column = 0;

        friend auto operator<=>(Source_location const& lhs, Source_location const& rhs) = default;
    };

    export struct Source_position
    {
        std::uint32_t line = 0;
        std::uint32_t column = 0;

        friend auto operator<=>(Source_position const& lhs, Source_position const& rhs) = default;
    };

    struct Function_declaration;
    struct Statement;
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
        C_ulonglong,
        C_longdouble
    };

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

    export struct Function_pointer_type
    {
        Function_type type;
        std::pmr::vector<std::pmr::string> input_parameter_names;
        std::pmr::vector<std::pmr::string> output_parameter_names;

        friend auto operator<=>(Function_pointer_type const& lhs, Function_pointer_type const& rhs) = default;
    };

    export struct Null_pointer_type
    {
        friend auto operator<=>(Null_pointer_type const& lhs, Null_pointer_type const& rhs) = default;
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

    export struct Type_instance
    {
        Custom_type_reference type_constructor;
        std::pmr::vector<Statement> arguments;

        friend auto operator<=>(Type_instance const&, Type_instance const&) = default;
    };

    export struct Parameter_type
    {
        std::pmr::string name;

        friend auto operator<=>(Parameter_type const&, Parameter_type const&) = default;
    };

    export struct Type_reference
    {
        using Data_type = std::variant<
            Builtin_type_reference,
            Constant_array_type,
            Custom_type_reference,
            Fundamental_type,
            Function_pointer_type,
            Integer_type,
            Null_pointer_type,
            Parameter_type,
            Pointer_type,
            Type_instance
        >;

        Data_type data;

        friend auto operator<=>(Type_reference const&, Type_reference const&) = default;
    };

    export struct Indexed_comment
    {
        std::uint64_t index;
        std::pmr::string comment;

        friend auto operator<=>(Indexed_comment const&, Indexed_comment const&) = default;
    };

    struct Expression;

    export struct Statement
    {
        std::pmr::vector<Expression> expressions;

        friend auto operator<=>(Statement const&, Statement const&) = default;
    };

    export struct Global_variable_declaration
    {
        std::pmr::string name;
        std::optional<std::pmr::string> unique_name;
        std::optional<Type_reference> type;
        Statement initial_value;
        bool is_mutable;
        std::optional<std::pmr::string> comment;
        std::optional<Source_location> source_location;

        friend auto operator<=>(Global_variable_declaration const& lhs, Global_variable_declaration const& rhs) = default;
    };

    export struct Alias_type_declaration
    {
        std::pmr::string name;
        std::optional<std::pmr::string> unique_name;
        std::pmr::vector<Type_reference> type;
        std::optional<std::pmr::string> comment;
        std::optional<Source_location> source_location;

        friend auto operator<=>(Alias_type_declaration const& lhs, Alias_type_declaration const& rhs) = default;
    };

    export struct Enum_value
    {
        std::pmr::string name;
        std::optional<Statement> value;
        std::optional<std::pmr::string> comment;
        std::optional<Source_location> source_location;

        friend auto operator<=>(Enum_value const& lhs, Enum_value const& rhs) = default;
    };

    export struct Enum_declaration
    {
        std::pmr::string name;
        std::optional<std::pmr::string> unique_name;
        std::pmr::vector<Enum_value> values;
        std::optional<std::pmr::string> comment;
        std::optional<Source_location> source_location;

        friend auto operator<=>(Enum_declaration const& lhs, Enum_declaration const& rhs) = default;
    };

    export struct Struct_declaration
    {
        std::pmr::string name;
        std::optional<std::pmr::string> unique_name;
        std::pmr::vector<Type_reference> member_types;
        std::pmr::vector<std::pmr::string> member_names;
        std::pmr::vector<Statement> member_default_values;
        bool is_packed;
        bool is_literal;
        std::optional<std::pmr::string> comment;
        std::pmr::vector<Indexed_comment> member_comments;
        std::optional<Source_location> source_location;
        std::optional<std::pmr::vector<Source_position>> member_source_positions;

        friend auto operator<=>(Struct_declaration const&, Struct_declaration const&) = default;
    };

    export struct Union_declaration
    {
        std::pmr::string name;
        std::optional<std::pmr::string> unique_name;
        std::pmr::vector<Type_reference> member_types;
        std::pmr::vector<std::pmr::string> member_names;
        std::optional<std::pmr::string> comment;
        std::pmr::vector<Indexed_comment> member_comments;
        std::optional<Source_location> source_location;
        std::optional<std::pmr::vector<Source_position>> member_source_positions;

        friend auto operator<=>(Union_declaration const&, Union_declaration const&) = default;
    };

    export struct Function_condition
    {
        std::pmr::string description;
        Statement condition;

        friend auto operator<=>(Function_condition const&, Function_condition const&) = default;
    };

    export enum class Linkage
    {
        External,
        Private
    };

    export struct Function_declaration
    {
        std::pmr::string name;
        std::optional<std::pmr::string> unique_name;
        Function_type type;
        std::pmr::vector<std::pmr::string> input_parameter_names;
        std::pmr::vector<std::pmr::string> output_parameter_names;
        Linkage linkage;
        std::pmr::vector<Function_condition> preconditions;
        std::pmr::vector<Function_condition> postconditions;
        std::optional<std::pmr::string> comment;
        std::optional<Source_location> source_location;
        std::optional<std::pmr::vector<Source_position>> input_parameter_source_positions;
        std::optional<std::pmr::vector<Source_position>> output_parameter_source_positions;

        friend auto operator<=>(Function_declaration const&, Function_declaration const&) = default;
    };

    export struct Function_definition
    {
        std::pmr::string name;
        std::pmr::vector<Statement> statements;
        std::optional<Source_location> source_location;

        friend auto operator<=>(Function_definition const&, Function_definition const&) = default;
    };

    export enum Access_type
    {
        Read = 1,
        Write = 2,
        Read_write = 3
    };

    export struct Variable_expression
    {
        std::pmr::string name;
        Access_type access_type = Access_type::Read;

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
        Bit_shift_right,

        Has
    };

    export struct Access_expression
    {
        Expression_index expression;
        std::pmr::string member_name;
        Access_type access_type;

        friend auto operator<=>(Access_expression const&, Access_expression const&) = default;
    };

    export struct Access_array_expression
    {
        Expression_index expression;
        Expression_index index;

        friend auto operator<=>(Access_array_expression const&, Access_array_expression const&) = default;
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

    export struct Block_expression
    {
        std::pmr::vector<Statement> statements;

        friend auto operator<=>(Block_expression const&, Block_expression const&) = default;
    };

    export struct Break_expression
    {
        std::uint64_t loop_count;

        friend auto operator<=>(Break_expression const&, Break_expression const&) = default;
    };

    export struct Call_expression
    {
        Expression_index expression;
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

    export struct Comment_expression
    {
        std::pmr::string comment;

        friend auto operator<=>(Comment_expression const&, Comment_expression const&) = default;
    };

    export struct Compile_time_expression
    {
        Expression_index expression;

        friend auto operator<=>(Compile_time_expression const&, Compile_time_expression const&) = default;
    };

    export struct Constant_expression
    {
        Type_reference type;
        std::pmr::string data;

        friend auto operator<=>(Constant_expression const&, Constant_expression const&) = default;
    };

    export struct Constant_array_expression
    {
        std::pmr::vector<Statement> array_data;

        friend auto operator<=>(Constant_array_expression const&, Constant_array_expression const&) = default;
    };

    export struct Continue_expression
    {
        friend auto operator<=>(Continue_expression const&, Continue_expression const&) = default;
    };

    export struct Defer_expression
    {
        Expression_index expression_to_defer;
        
        friend auto operator<=>(Defer_expression const&, Defer_expression const&) = default;
    };

    export struct Dereference_and_access_expression
    {
        Expression_index expression;
        std::pmr::string member_name;

        friend auto operator<=>(Dereference_and_access_expression const&, Dereference_and_access_expression const&) = default;
    };

    export struct For_loop_expression
    {
        std::pmr::string variable_name;
        Expression_index range_begin;
        Statement range_end;
        Binary_operation range_comparison_operation;
        std::optional<Expression_index> step_by;
        std::pmr::vector<Statement> then_statements;

        friend auto operator<=>(For_loop_expression const&, For_loop_expression const&) = default;
    };

    export struct Function_expression
    {
        Function_declaration declaration;
        Function_definition definition;

        friend auto operator<=>(Function_expression const&, Function_expression const&) = default;
    };

    export struct Instance_call_expression
    {
        Expression_index left_hand_side;
        std::pmr::vector<Expression_index> arguments;

        friend auto operator<=>(Instance_call_expression const&, Instance_call_expression const&) = default;
    };

    export struct Condition_statement_pair
    {
        std::optional<Statement> condition;
        std::pmr::vector<Statement> then_statements;
        std::optional<Source_position> block_source_position;

        friend auto operator<=>(Condition_statement_pair const&, Condition_statement_pair const&) = default;
    };

    export struct If_expression
    {
        std::pmr::vector<Condition_statement_pair> series;

        friend auto operator<=>(If_expression const&, If_expression const&) = default;
    };

    export enum class Instantiate_expression_type
    {
        Default,
        Explicit
    };

    export struct Instantiate_member_value_pair
    {
        std::pmr::string member_name;
        Statement value;

        friend auto operator<=>(Instantiate_member_value_pair const&, Instantiate_member_value_pair const&) = default;
    };

    export struct Instantiate_expression
    {
        Instantiate_expression_type type;
        std::pmr::vector<Instantiate_member_value_pair> members;

        friend auto operator<=>(Instantiate_expression const&, Instantiate_expression const&) = default;
    };

    export struct Invalid_expression
    {
        std::pmr::string value;

        friend auto operator<=>(Invalid_expression const&, Invalid_expression const&) = default;
    };

    export struct Null_pointer_expression
    {
        friend auto operator<=>(Null_pointer_expression const&, Null_pointer_expression const&) = default;
    };

    export struct Parenthesis_expression
    {
        Expression_index expression;

        friend auto operator<=>(Parenthesis_expression const&, Parenthesis_expression const&) = default;
    };

    export struct Return_expression
    {
        std::optional<Expression_index> expression;

        friend auto operator<=>(Return_expression const&, Return_expression const&) = default;
    };

    export struct Struct_expression
    {
        Struct_declaration declaration;

        friend auto operator<=>(Struct_expression const&, Struct_expression const&) = default;
    };

    export struct Switch_case_expression_pair
    {
        std::optional<Expression_index> case_value;
        std::pmr::vector<Statement> statements;

        friend auto operator<=>(Switch_case_expression_pair const&, Switch_case_expression_pair const&) = default;
    };

    export struct Switch_expression
    {
        Expression_index value;
        std::pmr::vector<Switch_case_expression_pair> cases;

        friend auto operator<=>(Switch_expression const&, Switch_expression const&) = default;
    };

    export struct Ternary_condition_expression
    {
        Expression_index condition;
        Statement then_statement;
        Statement else_statement;

        friend auto operator<=>(Ternary_condition_expression const&, Ternary_condition_expression const&) = default;
    };

    export struct Type_expression
    {
        Type_reference type;

        friend auto operator<=>(Type_expression const&, Type_expression const&) = default;
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
        Address_of
    };

    export struct Unary_expression
    {
        Expression_index expression;
        Unary_operation operation;

        friend auto operator<=>(Unary_expression const&, Unary_expression const&) = default;
    };

    export struct Union_expression
    {
        Union_declaration declaration;

        friend auto operator<=>(Union_expression const&, Union_expression const&) = default;
    };

    export struct Variable_declaration_expression
    {
        std::pmr::string name;
        bool is_mutable;
        Expression_index right_hand_side;

        friend auto operator<=>(Variable_declaration_expression const&, Variable_declaration_expression const&) = default;
    };

    export struct Variable_declaration_with_type_expression
    {
        std::pmr::string name;
        bool is_mutable;
        Type_reference type;
        Statement right_hand_side;

        friend auto operator<=>(Variable_declaration_with_type_expression const&, Variable_declaration_with_type_expression const&) = default;
    };

    export struct While_loop_expression
    {
        Statement condition;
        std::pmr::vector<Statement> then_statements;

        friend auto operator<=>(While_loop_expression const&, While_loop_expression const&) = default;
    };

    export struct Expression
    {
        using Data_type = std::variant <
            Access_expression,
            Access_array_expression,
            Assignment_expression,
            Binary_expression,
            Block_expression,
            Break_expression,
            Call_expression,
            Cast_expression,
            Comment_expression,
            Compile_time_expression,
            Constant_expression,
            Constant_array_expression,
            Continue_expression,
            Defer_expression,
            Dereference_and_access_expression,
            For_loop_expression,
            Function_expression,
            Instance_call_expression,
            If_expression,
            Instantiate_expression,
            Invalid_expression,
            Null_pointer_expression,
            Parenthesis_expression,
            Return_expression,
            Struct_expression,
            Switch_expression,
            Ternary_condition_expression,
            Type_expression,
            Unary_expression,
            Union_expression,
            Variable_declaration_expression,
            Variable_declaration_with_type_expression,
            Variable_expression,
            While_loop_expression
        > ;

        Data_type data;
        std::optional<Source_position> source_position;

        friend auto operator<=>(Expression const&, Expression const&) = default;
    };

    export struct Type_constructor_parameter
    {
        std::pmr::string name;
        Type_reference type;

        friend auto operator<=>(Type_constructor_parameter const&, Type_constructor_parameter const&) = default;
    };

    export struct Type_constructor
    {
        std::pmr::string name;
        std::pmr::vector<Type_constructor_parameter> parameters;
        std::pmr::vector<Statement> statements;
        std::optional<std::pmr::string> comment;
        std::optional<Source_location> source_location;

        friend auto operator<=>(Type_constructor const&, Type_constructor const&) = default;
    };

    export struct Function_constructor_parameter
    {
        std::pmr::string name;
        Type_reference type;

        friend auto operator<=>(Function_constructor_parameter const&, Function_constructor_parameter const&) = default;
    };

    export struct Function_constructor
    {
        std::pmr::string name;
        std::pmr::vector<Function_constructor_parameter> parameters;
        std::pmr::vector<Statement> statements;
        std::optional<std::pmr::string> comment;
        std::optional<Source_location> source_location;

        friend auto operator<=>(Function_constructor const&, Function_constructor const&) = default;
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
        std::pmr::vector<Global_variable_declaration> global_variable_declarations;
        std::pmr::vector<Struct_declaration> struct_declarations;
        std::pmr::vector<Union_declaration> union_declarations;
        std::pmr::vector<Function_declaration> function_declarations;
        std::pmr::vector<Function_constructor> function_constructors;
        std::pmr::vector<Type_constructor> type_constructors;

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
        std::optional<std::uint64_t> content_hash;
        Module_dependencies dependencies;
        Module_declarations export_declarations;
        Module_declarations internal_declarations;
        Module_definitions definitions;
        std::optional<std::pmr::string> comment;
        std::optional<std::filesystem::path> source_file_path;

        friend auto operator<=>(Module const&, Module const&) = default;
    };

    export Module const& find_module(
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies,
        std::string_view name
    );

    export std::string_view find_module_name(
        Module const& core_module,
        Module_reference const& module_reference
    );
}