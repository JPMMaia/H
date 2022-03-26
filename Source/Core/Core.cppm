module;

#include <memory_resource>
#include <ostream>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

export module h.core;

namespace h
{
    export struct Integer_type
    {
        std::uint8_t precision = 64;

        friend auto operator<=>(Integer_type const&, Integer_type const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Integer_type value);
    };

    export struct Float_type
    {
        std::uint8_t precision = 64;
        
        friend auto operator<=>(Float_type const&, Float_type const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Float_type value);
    };

    export struct Type
    {
        using Data_type = std::variant<
            Float_type,
            Integer_type
        >;

        Data_type data;

        friend auto operator<=>(Type const&, Type const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Type const& value);
    };

    export struct Variable_expression
    {
        enum class Type
        {
            Function_argument,
            Local_variable,
            Temporary
        };

        Type type;
        std::uint64_t id;

        friend auto operator<=>(Variable_expression const&, Variable_expression const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Variable_expression::Type value);
        friend std::ostream& operator<<(std::ostream& output_stream, Variable_expression value);
    };

    export struct Binary_expression
    {
        enum class Operation
        {
            Add,
            Subtract,
            Multiply,
            Signed_divide,
            Unsigned_divide,
            Less_than
        };

        Variable_expression left_hand_side;
        Variable_expression right_hand_side;
        Operation operation;

        friend auto operator<=>(Binary_expression const&, Binary_expression const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Binary_expression::Operation value);
        friend std::ostream& operator<<(std::ostream& output_stream, Binary_expression const& value);
    };

    export struct Call_expression
    {
        std::pmr::string function_name;
        std::pmr::vector<Variable_expression> arguments;

        friend auto operator<=>(Call_expression const&, Call_expression const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Call_expression const& value);
    };

    export struct Integer_constant
    {
        unsigned int number_of_bits;
        bool is_signed;
        std::uint64_t value;

        friend auto operator<=>(Integer_constant const&, Integer_constant const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Integer_constant const& value);
    };

    export struct Half_constant
    {
        float value;
        
        friend auto operator<=>(Half_constant const&, Half_constant const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Half_constant value);
    };

    export struct Float_constant
    {
        float value;
        
        friend auto operator<=>(Float_constant const&, Float_constant const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Float_constant value);
    };

    export struct Double_constant
    {
        double value;
        
        friend auto operator<=>(Double_constant const&, Double_constant const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Double_constant value);
    };

    export struct Constant_expression
    {
        using Data_type = std::variant<
            Integer_constant,
            Half_constant,
            Float_constant,
            Double_constant
        >;

        Type type;
        Data_type data;
        
        friend auto operator<=>(Constant_expression const&, Constant_expression const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Constant_expression const& value);
    };

    export struct Return_expression
    {
        Variable_expression variable;
        
        friend auto operator<=>(Return_expression const&, Return_expression const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Return_expression const& value);
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
        friend std::ostream& operator<<(std::ostream& output_stream, Expression const& value);
    };

    export struct Statement
    {
        std::uint64_t id;
        std::pmr::string name;
        std::pmr::vector<Expression> expressions;
        
        friend auto operator<=>(Statement const&, Statement const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Statement const& value);
    };

    export struct Function_type
    {
        Type return_type;
        std::pmr::vector<Type> parameter_types;
        
        friend auto operator<=>(Function_type const&, Function_type const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Function_type const& value);
    };

    export enum class Linkage
    {
        External,
        Private
    };

    std::ostream& operator<<(std::ostream& output_stream, Linkage value);

    export struct Function
    {
        Function_type type;
        std::pmr::string name;
        std::pmr::vector<std::uint64_t> argument_ids;
        std::pmr::vector<std::pmr::string> argument_names;
        Linkage linkage;
        std::pmr::vector<Statement> statements;
        
        friend auto operator<=>(Function const&, Function const&) = default;
        friend std::ostream& operator<<(std::ostream& output_stream, Function const& value);
    };
}