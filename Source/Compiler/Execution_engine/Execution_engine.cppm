module;

#include <cstddef>
#include <memory_resource>
#include <optional>
#include <span>
#include <variant>
#include <vector>

export module h.compiler.execution_engine;

import h.core;

namespace h::compiler::execution_engine
{
    export struct Value_storage
    {
        using Data_type = std::variant<
            Alias_type_declaration,
            Enum_declaration,
            Function_declaration,
            Global_variable_declaration,
            Struct_declaration,
            Union_declaration
        >;

        Data_type data;
    };

    Value_storage create_value_storage_struct(
        Struct_declaration const& declaration,
        std::pmr::polymorphic_allocator<> const& allocator
    );

    export struct Variable
    {
        std::pmr::string name;
        Value_storage value;
    };

    export struct Execution_engine
    {
        std::pmr::polymorphic_allocator<> allocator;
        Type_constructor const* type_constructor;
        std::span<Statement const> type_instance_arguments;
        std::pmr::vector<Variable> variables;
    };

    export Execution_engine create_execution_engine(
        std::pmr::polymorphic_allocator<> const& allocator
    );

    export Value_storage evaluate_type_constructor(
        Execution_engine& engine,
        Type_constructor const& type_constructor,
        std::span<Statement const> const arguments
    );

    export Function_expression evaluate_function_constructor(
        Execution_engine& engine,
        Function_constructor const& function_constructor,
        std::span<Expression const> const arguments
    );
    
    export std::optional<Value_storage> evaluate_statements(
        Execution_engine& engine,
        std::span<Statement const> const statements
    );

    export std::pair<std::optional<Value_storage>, bool> evaluate_expression(
        Execution_engine& engine,
        Statement const& statement,
        Expression const& expression
    );
}
