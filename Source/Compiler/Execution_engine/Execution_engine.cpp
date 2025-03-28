module;

#include <exception>
#include <memory_resource>
#include <optional>
#include <span>
#include <variant>
#include <vector>

module h.compiler.execution_engine;

import h.core;
import h.core.types;

namespace h::compiler::execution_engine
{
    Value_storage create_value_storage_struct(
        Struct_declaration const& declaration,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        // TODO do copy with allocator
        return
        {
            .data = declaration
        };
    }

    Execution_engine create_execution_engine(
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        return
        {
            .allocator = allocator,
        };
    }

    Value_storage evaluate_type_constructor(
        Execution_engine& engine,
        Type_constructor const& type_constructor,
        std::span<Statement const> const arguments
    )
    {
        if (type_constructor.parameters.size() != arguments.size())
            throw std::runtime_error{ "Number of arguments of type instance do not match type constructor!" };

        engine.type_constructor = &type_constructor;
        engine.type_instance_arguments = arguments;

        for (std::size_t index = 0; index < type_constructor.parameters.size(); ++index)
        {
            Type_constructor_parameter const& parameter = type_constructor.parameters[index];
            Statement const& argument = arguments[index];

            // TODO if constant, then add variable
        }

        std::optional<Value_storage> const returned_value_optional = evaluate_statements(engine, type_constructor.statements);

        if (!returned_value_optional.has_value())
            throw std::runtime_error{ "Could not evaluate type constructor!" };

        // TODO check that value_storage type is a declaration type (not function type, or global variable type)

        Value_storage const& returned_value = returned_value_optional.value();
        return returned_value;
    }

    Function_expression evaluate_function_constructor(
        Execution_engine& engine,
        Function_constructor const& function_constructor,
        std::span<Expression const> const arguments
    )
    {
        return {};
    }

    std::optional<Value_storage> evaluate_statements(
        Execution_engine& engine,
        std::span<Statement const> const statements
    )
    {
        for (std::size_t index = 0; index < statements.size(); ++index)
        {
            Statement const& statement = statements[index];

            if (!statement.expressions.empty())
            {
                std::pair<std::optional<Value_storage>, bool> const result = evaluate_expression(engine, statement, statement.expressions[0]);
                bool const stop = result.second;
                if (stop)
                    return result.first;
            }
        }

        return std::nullopt;
    }

    bool is_compile_time_builtin_type(Type_reference const& type_reference)
    {
        if (std::holds_alternative<Builtin_type_reference>(type_reference.data))
        {
            Builtin_type_reference const& builtin_type = std::get<Builtin_type_reference>(type_reference.data);
            return builtin_type.value == "Type";
        }

        return false;
    }

    template<class T>
    void replace_parameter_types_by_instance_arguments(
        T& value,
        std::span<Type_constructor_parameter const> const type_constructor_parameters,
        std::span<Statement const> const type_instance_arguments
    )
    {
        auto const process_type = [&](Type_reference const& type_reference) -> bool
        {
            Type_reference& mutable_type_reference = const_cast<Type_reference&>(type_reference);
            if (std::holds_alternative<Parameter_type>(mutable_type_reference.data))
            {
                Parameter_type const& parameter_type = std::get<Parameter_type>(mutable_type_reference.data);

                auto const location = std::find_if(
                    type_constructor_parameters.begin(),
                    type_constructor_parameters.end(), 
                    [&](Type_constructor_parameter const& parameter) -> bool { return parameter.name == parameter_type.name; }
                );
                if (location == type_constructor_parameters.end())
                    throw std::runtime_error{ "Could not find parameter type in type constructor!"};

                Type_constructor_parameter const& parameter = *location;
                if (!is_compile_time_builtin_type(parameter.type))
                    throw std::runtime_error{ "Type constructor parameter type is not the compile time builtin type!"};

                std::size_t const parameter_index = std::distance(type_constructor_parameters.begin(), location);
                if (parameter_index >= type_instance_arguments.size())
                    throw std::runtime_error{ "Type instance does not provide all arguments!"};

                Statement const& argument_statement = type_instance_arguments[parameter_index];
                if (argument_statement.expressions.size() != 1)
                    throw std::runtime_error{ "argument_statement.expressions.size() != 1!"};

                Expression const& expression = argument_statement.expressions[0];
                if (!std::holds_alternative<Type_expression>(expression.data))
                    throw std::runtime_error{ "Expected type instance argument to by a type expression!"};

                Type_expression const& type_expression = std::get<Type_expression>(expression.data);

                // TODO use allocator to copy
                mutable_type_reference.data = type_expression.type.data;                
            }

            return false;
        };

        visit_type_references(value, process_type);
    }

    std::pair<std::optional<Value_storage>, bool> make_pair(
        std::optional<Value_storage> value_and_type,
        bool const stop
    )
    {
        return std::make_pair(std::move(value_and_type), stop);
    }

    std::pair<std::optional<Value_storage>, bool> evaluate_expression(
        Execution_engine& engine,
        Statement const& statement,
        Expression const& expression
    )
    {
        if (std::holds_alternative<Return_expression>(expression.data))
        {
            Return_expression const& return_expression = std::get<Return_expression>(expression.data);
            if (!return_expression.expression.has_value())
                return make_pair(std::nullopt, false);

            std::size_t const next_expression_index = return_expression.expression.value().expression_index;
            Expression const& next_expression = statement.expressions[next_expression_index];

            std::pair<std::optional<Value_storage>, bool> result = evaluate_expression(engine, statement, next_expression);
            result.second = true;
            return result;
        }
        else if (std::holds_alternative<Struct_expression>(expression.data))
        {
            Struct_expression const& struct_expression = std::get<Struct_expression>(expression.data);

            // TODO copy using allocator
            Struct_declaration struct_declaration = struct_expression.declaration;

            if (engine.type_constructor != nullptr)
            {
                replace_parameter_types_by_instance_arguments(
                    struct_declaration,
                    engine.type_constructor->parameters,
                    engine.type_instance_arguments
                );
            }

            return make_pair(
                create_value_storage_struct(struct_declaration, engine.allocator),
                false
            );
        }
        else
        {
            throw std::runtime_error{ "Execution_engine::evaluate_expression(): expression not implemented!" };
        }
    }
}
