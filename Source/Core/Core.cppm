module;

#include <memory_resource>
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
    };

    export struct Float_type
    {
        std::uint8_t precision = 64;
    };

    export struct Type
    {
        using Data_type = std::variant<
            Float_type,
            Integer_type
        >;

        Data_type data;
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
        std::size_t index;
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
    };

    export struct Call_expression
    {
        std::pmr::string function_name;
        std::pmr::vector<Variable_expression> arguments;
    };

    export struct Integer_constant
    {
        unsigned int number_of_bits;
        bool is_signed;
        std::uint64_t value;
    };

    export struct Half_constant
    {
        float value;
    };

    export struct Float_constant
    {
        float value;
    };

    export struct Double_constant
    {
        double value;
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
    };

    export struct Return_expression
    {
        Variable_expression variable;
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
    };

    export struct Statement
    {
        std::pmr::string name;
        std::pmr::vector<Expression> expressions;
    };

    export struct Function_type
    {
        Type return_type;
        std::pmr::vector<Type> parameter_types;
    };

    export enum class Linkage
    {
        External,
        Private
    };

    export struct Function
    {
        Function_type type;
        std::pmr::string name;
        std::pmr::vector<std::pmr::string> argument_names;
        Linkage linkage;
        std::pmr::vector<Statement> statements;
    };
}