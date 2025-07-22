module;

#include <algorithm>
#include <cassert>
#include <format>
#include <memory_resource>
#include <optional>
#include <span>
#include <stdexcept>
#include <string>
#include <variant>
#include <vector>

module h.compiler.analysis;

import h.compiler.diagnostic;
import h.compiler.validation;
import h.core;
import h.core.declarations;
import h.core.types;

namespace h::compiler
{
    Analysis_result process_module(
        h::Module& core_module,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Analysis_result result;

        if (options.validate)
        {
            std::pmr::vector<h::compiler::Diagnostic> const diagnostics = validate_module(
                core_module,
                declaration_database,
                temporaries_allocator
            );
            if (!diagnostics.empty())
            {
                result.diagnostics.insert(result.diagnostics.end(), diagnostics.begin(), diagnostics.end());
                return result;
            }
        }

        process_declarations(result, core_module, core_module.export_declarations, core_module.definitions, declaration_database, options, temporaries_allocator);
        process_declarations(result, core_module, core_module.internal_declarations, core_module.definitions, declaration_database, options, temporaries_allocator);
        return result;
    }

    void process_declarations(
        Analysis_result& result,
        h::Module& core_module,
        Module_declarations& declarations,
        Module_definitions& definitions,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (h::Function_declaration& declaration : declarations.function_declarations)
        {
            auto location = std::find_if(
                definitions.function_definitions.begin(),
                definitions.function_definitions.end(),
                [&declaration](Function_definition const& definition) {
                    return definition.name == declaration.name;
                });

            if (location != definitions.function_definitions.end())
                process_function(result, core_module, declaration, *location, declaration_database, options, temporaries_allocator);
        }
    }

    void add_parameters_to_scope(
        Scope& scope,
        std::span<std::pmr::string const> const parameter_names,
        std::span<h::Type_reference const> const parameter_types
    )
    {
        for (std::size_t parameter_index = 0; parameter_index < parameter_names.size(); ++parameter_index)
        {
            scope.variables.push_back(
                {
                    .name = parameter_names[parameter_index],
                    .type = parameter_types[parameter_index],
                    .is_compile_time = false,
                }
            );
        }
    }

    void process_function(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration& function_declaration,
        h::Function_definition& function_definition,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Scope scope{ .variables = std::pmr::vector<Variable>{temporaries_allocator} };
        scope.variables.reserve(64);

        add_parameters_to_scope(scope, function_declaration.input_parameter_names, function_declaration.type.input_parameter_types);

        for (h::Function_condition& condition : function_declaration.preconditions)
        {
            process_statement(
                result,
                core_module,
                &function_declaration,
                scope,
                condition.condition,
                std::nullopt,
                declaration_database,
                options,
                temporaries_allocator
            );
        }

        {
            add_parameters_to_scope(scope, function_declaration.output_parameter_names, function_declaration.type.output_parameter_types);

            for (h::Function_condition& condition : function_declaration.postconditions)
            {
                process_statement(
                    result,
                    core_module,
                    &function_declaration,
                    scope,
                    condition.condition,
                    std::nullopt,
                    declaration_database,
                    options,
                    temporaries_allocator
                );
            }

            for (std::size_t index = 0; index < function_declaration.output_parameter_names.size(); ++index)
            {
                scope.variables.pop_back();
            }
        }

        process_block(
            result,
            core_module,
            &function_declaration,
            scope,
            function_definition.statements,
            declaration_database,
            options,
            temporaries_allocator
        );
    }

    void process_block(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration const* const function_declaration,
        Scope& scope,
        std::span<Statement> const statements,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::size_t const original_count = scope.variables.size();

        for (Statement& statement : statements)
        {
            process_statement(
                result,
                core_module,
                function_declaration,
                scope,
                statement,
                std::nullopt,
                declaration_database,
                options,
                temporaries_allocator
            );
        }

        while (scope.variables.size() > original_count)
        {
            scope.variables.pop_back();
        }
    }

    void process_statements(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration const* const function_declaration,
        Scope& scope,
        std::span<Statement> const statements,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (Statement& statement : statements)
        {
            process_statement(
                result,
                core_module,
                function_declaration,
                scope,
                statement,
                std::nullopt,
                declaration_database,
                options,
                temporaries_allocator
            );
        }
    }

    void process_statement(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration const* const function_declaration,
        Scope& scope,
        h::Statement& statement,
        std::optional<h::Type_reference> const& expected_statement_type,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {

        std::size_t count = statement.expressions.size();
        for (std::size_t index = 0; index < count; ++index)
        {
            std::size_t reverse_index = count - index - 1;
            h::Expression& expression = statement.expressions[reverse_index];

            process_expression(
                result,
                core_module,
                function_declaration,
                scope,
                statement,
                expression,
                declaration_database,
                options,
                temporaries_allocator
            );
        }
    }

    void process_expression(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration const* const function_declaration,
        Scope& scope,
        h::Statement& statement,
        h::Expression& expression,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        if (std::holds_alternative<h::Block_expression>(expression.data))
        {
            h::Block_expression& data = std::get<h::Block_expression>(expression.data);
            process_block(
                result,
                core_module,
                function_declaration,
                scope,
                data.statements,
                declaration_database,
                options,
                temporaries_allocator
            );
        }
        else if (std::holds_alternative<h::Call_expression>(expression.data))
        {
            h::Call_expression& data = std::get<h::Call_expression>(expression.data);

            std::optional<std::pmr::vector<Statement>> const instance_call_arguments = deduce_instance_call_arguments(
                declaration_database,
                core_module,
                scope,
                statement,
                data,
                temporaries_allocator
            );

            if (instance_call_arguments.has_value())
            {
                h::Instance_call_expression instance_call_expression =
                {
                    .left_hand_side = { data.expression.expression_index },
                    .arguments = instance_call_arguments.value()
                };

                data.expression.expression_index = statement.expressions.size();
                statement.expressions.push_back(h::Expression{.data = instance_call_expression, .source_range = expression.source_range});
            }
        }
        else if (std::holds_alternative<h::Constant_array_expression>(expression.data))
        {
            h::Constant_array_expression& data = std::get<h::Constant_array_expression>(expression.data);
            process_statements(
                result,
                core_module,
                function_declaration,
                scope,
                data.array_data,
                declaration_database,
                options,
                temporaries_allocator
            );
        }
        else if (std::holds_alternative<h::For_loop_expression>(expression.data))
        {
            h::For_loop_expression& data = std::get<h::For_loop_expression>(expression.data);

            std::optional<h::Type_reference> const type_reference = get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.range_begin.expression_index], std::nullopt, declaration_database);
            if (type_reference.has_value())
            {
                scope.variables.push_back(
                    {
                        .name = data.variable_name, .type = type_reference.value(), .is_compile_time = false
                    }
                );
            }

            process_statement(
                result,
                core_module,
                function_declaration,
                scope,
                data.range_end,
                std::nullopt,
                declaration_database,
                options,
                temporaries_allocator
            );
            process_block(
                result,
                core_module,
                function_declaration,
                scope,
                data.then_statements,
                declaration_database,
                options,
                temporaries_allocator
            );
        }
        else if (std::holds_alternative<h::Function_expression>(expression.data))
        {
            h::Function_expression& data = std::get<h::Function_expression>(expression.data);
            process_function(
                result,
                core_module,
                data.declaration,
                data.definition, // TODO pass scope?
                declaration_database,
                options,
                temporaries_allocator
            );
        }
        else if (std::holds_alternative<h::Instance_call_expression>(expression.data))
        {
            h::Instance_call_expression& data = std::get<h::Instance_call_expression>(expression.data);
            process_statements(
                result,
                core_module,
                function_declaration,
                scope,
                data.arguments,
                declaration_database,
                options,
                temporaries_allocator
            );
        }
        else if (std::holds_alternative<h::If_expression>(expression.data))
        {
            h::If_expression& data = std::get<h::If_expression>(expression.data);
            for (h::Condition_statement_pair& serie : data.series)
            {
                if (serie.condition.has_value())
                {
                    process_statement(
                        result,
                        core_module,
                        function_declaration,
                        scope,
                        serie.condition.value(),
                        std::nullopt,
                        declaration_database,
                        options,
                        temporaries_allocator
                    );
                }

                process_block(
                    result,
                    core_module,
                    function_declaration,
                    scope,
                    serie.then_statements,
                    declaration_database,
                    options,
                    temporaries_allocator
                );
            }
        }
        else if (std::holds_alternative<h::Instantiate_expression>(expression.data))
        {
            h::Instantiate_expression& data = std::get<h::Instantiate_expression>(expression.data);
            for (h::Instantiate_member_value_pair& member : data.members)
            {
                process_statement(
                    result,
                    core_module,
                    function_declaration,
                    scope,
                    member.value,
                    std::nullopt,
                    declaration_database,
                    options,
                    temporaries_allocator
                );
            }
        }
        else if (std::holds_alternative<h::Switch_expression>(expression.data))
        {
            h::Switch_expression& data = std::get<h::Switch_expression>(expression.data);
            for (h::Switch_case_expression_pair& serie : data.cases)
            {
                process_block(
                    result,
                    core_module,
                    function_declaration,
                    scope,
                    serie.statements,
                    declaration_database,
                    options,
                    temporaries_allocator
                );
            }
        }
        else if (std::holds_alternative<h::Ternary_condition_expression>(expression.data))
        {
            h::Ternary_condition_expression& data = std::get<h::Ternary_condition_expression>(expression.data);
            process_statement(
                result,
                core_module,
                function_declaration,
                scope,
                data.then_statement,
                std::nullopt,
                declaration_database,
                options,
                temporaries_allocator
            );
            process_statement(
                result,
                core_module,
                function_declaration,
                scope,
                data.else_statement,
                std::nullopt,
                declaration_database,
                options,
                temporaries_allocator
            );
        }
        else if (std::holds_alternative<h::Variable_declaration_expression>(expression.data))
        {
            h::Variable_declaration_expression& data = std::get<h::Variable_declaration_expression>(expression.data);
            std::optional<h::Type_reference> const type_reference = get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.right_hand_side.expression_index], std::nullopt, declaration_database);
            if (type_reference.has_value())
                scope.variables.push_back({.name = data.name, .type = type_reference.value(), .is_compile_time = false});
            
            // TODO error if type is nullopt
        }
        else if (std::holds_alternative<h::Variable_declaration_with_type_expression>(expression.data))
        {
            h::Variable_declaration_with_type_expression& data = std::get<h::Variable_declaration_with_type_expression>(expression.data);
            scope.variables.push_back({.name = data.name, .type = data.type, .is_compile_time = false});
        }
        else if (std::holds_alternative<h::While_loop_expression>(expression.data))
        {
            h::While_loop_expression& data = std::get<h::While_loop_expression>(expression.data);
            process_statement(
                result,
                core_module,
                function_declaration,
                scope,
                data.condition,
                std::nullopt,
                declaration_database,
                options,
                temporaries_allocator
            );
            process_block(
                result,
                core_module,
                function_declaration,
                scope,
                data.then_statements,
                declaration_database,
                options,
                temporaries_allocator
            );
        }
    }

    std::optional<h::Type_reference> get_expression_type(
        h::Module const& core_module,
        h::Function_declaration const* const function_declaration,
        Scope const& scope,
        h::Statement const& statement,
        std::optional<h::Type_reference> const& expected_statement_type,
        h::Declaration_database const& declaration_database
    )
    {
        if (statement.expressions.empty())
            return std::nullopt;

        return get_expression_type(
            core_module,
            function_declaration,
            scope,
            statement,
            statement.expressions[0],
            expected_statement_type,
            declaration_database
        );
    }

    
    h::Function_declaration const* get_function_declaration_to_call(
        h::Module const& core_module,
        h::Statement const& statement,
        h::Expression const& expression,
        h::Declaration_database const& declaration_database
    )
    {
        if (std::holds_alternative<h::Access_expression>(expression.data))
        {
            //h::Access_expression const& access_expression = std::get<h::Access_expression>(expression.data); // TODO
            assert(false);
        }
        else if (std::holds_alternative<h::Variable_expression>(expression.data))
        {
            h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(expression.data);

            std::optional<Declaration> const declaration = find_declaration(declaration_database, core_module.name, variable_expression.name);
            if (declaration.has_value() && std::holds_alternative<h::Function_declaration const*>(declaration->data))
                return std::get<h::Function_declaration const*>(declaration->data);
        }

        return nullptr;
    }

    std::optional<h::Type_reference> get_type_to_instantiate(
        h::Module const& core_module,
        h::Function_declaration const* const function_declaration,
        Scope const& scope,
        h::Statement const& statement,
        h::Expression const& expression,
        h::Instantiate_expression const& instantiate_expression,
        h::Declaration_database const& declaration_database
    )
    {
        std::uint64_t expression_index = statement.expressions.size();
        for (std::size_t index = 0; index < statement.expressions.size(); ++index)
        {
            if (&statement.expressions[index] == &expression)
            {
                expression_index = index;
                break;
            }
        }

        if (expression_index == statement.expressions.size())
            return std::nullopt;

        for (std::size_t index = 0; index < statement.expressions.size(); ++index)
        {
            h::Expression const& current_expression = statement.expressions[index];
            
            if (std::holds_alternative<h::Assignment_expression>(current_expression.data))
            {
                h::Assignment_expression const& assignment_expression = std::get<h::Assignment_expression>(current_expression.data);

                if (assignment_expression.right_hand_side.expression_index == expression_index)
                {
                    std::optional<h::Type_reference> const left_hand_side_type = get_expression_type(
                        core_module,
                        function_declaration,
                        scope,
                        statement,
                        statement.expressions[assignment_expression.left_hand_side.expression_index],
                        std::nullopt,
                        declaration_database
                    );
                    return left_hand_side_type;
                }
            }
            else if (std::holds_alternative<h::Call_expression>(current_expression.data))
            {
                h::Call_expression const& call_expression = std::get<h::Call_expression>(current_expression.data);

                for (std::size_t argument_index = 0; argument_index < call_expression.arguments.size(); ++argument_index)
                {
                    h::Expression_index const& argument_expression = call_expression.arguments[argument_index];
                    if (argument_expression.expression_index == expression_index)
                    {
                        h::Function_declaration const* const function_declaration_to_call = get_function_declaration_to_call(
                            core_module,
                            statement,
                            statement.expressions[call_expression.expression.expression_index],
                            declaration_database
                        );
                        if (function_declaration_to_call != nullptr && argument_index < function_declaration_to_call->type.input_parameter_types.size())
                            return function_declaration_to_call->type.input_parameter_types[argument_index];
                        else
                            return std::nullopt;
                    }
                }
            }
            else if (std::holds_alternative<h::Return_expression>(current_expression.data))
            {
                h::Return_expression const& return_expression = std::get<h::Return_expression>(current_expression.data);
                if (return_expression.expression.has_value() && return_expression.expression->expression_index == expression_index)
                {
                    if (function_declaration != nullptr && !function_declaration->type.output_parameter_types.empty())
                        return function_declaration->type.output_parameter_types[0];
                    else
                        return std::nullopt;
                }
            }
            else if (std::holds_alternative<h::Variable_declaration_with_type_expression>(current_expression.data))
            {
                h::Variable_declaration_with_type_expression const& declaration_expression = std::get<h::Variable_declaration_with_type_expression>(current_expression.data);
                if (declaration_expression.right_hand_side.expression_index == expression_index)
                    return declaration_expression.type;
            }
        }

        return std::nullopt;
    }

    std::optional<h::Type_reference> get_expression_type(
        h::Module const& core_module,
        h::Function_declaration const* const function_declaration,
        Scope const& scope,
        h::Statement const& statement,
        h::Expression const& expression,
        std::optional<h::Type_reference> const& expected_expression_type,
        h::Declaration_database const& declaration_database
    )
    {
        if (std::holds_alternative<h::Access_expression>(expression.data))
        {
            Access_expression const& data = std::get<h::Access_expression>(expression.data);
            
            std::optional<h::Type_reference> const type_reference = get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression.expression_index], std::nullopt, declaration_database);

            bool const is_import_alias_or_enum_name = !type_reference.has_value();
            if (is_import_alias_or_enum_name)
            {
                h::Expression const& left_hand_side_expression = statement.expressions[data.expression.expression_index];
                
                if (std::holds_alternative<h::Variable_expression>(left_hand_side_expression.data))
                {
                    h::Variable_expression const& variable_expression = std::get<h::Variable_expression>(left_hand_side_expression.data);

                    // Try import alias:
                    {
                        std::optional<Declaration> const declaration_optional = find_declaration_using_import_alias(
                            declaration_database,
                            core_module,
                            variable_expression.name,
                            data.member_name
                        );

                        if (declaration_optional.has_value())
                        {
                            std::optional<Declaration> const underling_declaration_optional = get_underlying_declaration(declaration_database, declaration_optional.value());
                            if (underling_declaration_optional.has_value())
                            {
                                Declaration const& declaration = underling_declaration_optional.value();

                                if (std::holds_alternative<Function_declaration const*>(declaration.data))
                                {
                                    Function_declaration const& function_declaration = *std::get<Function_declaration const*>(declaration.data);
                                    return create_function_type_type_reference(function_declaration.type, function_declaration.input_parameter_names, function_declaration.output_parameter_names);
                                }

                                Import_module_with_alias const* import_alias = find_import_module_with_alias(
                                    core_module,
                                    variable_expression.name
                                );
                                assert(import_alias != nullptr);

                                return create_custom_type_reference(import_alias->module_name, data.member_name);
                            }
                        }
                    }

                    // Try enum
                    {
                        std::optional<Declaration> const declaration_optional = find_underlying_declaration(
                            declaration_database,
                            core_module.name,
                            variable_expression.name
                        );

                        if (declaration_optional.has_value())
                        {
                            if (std::holds_alternative<Enum_declaration const*>(declaration_optional->data))
                                return create_custom_type_reference(core_module.name, variable_expression.name);
                        }
                    }
                }

                return std::nullopt;
            }
            else if (std::holds_alternative<h::Custom_type_reference>(type_reference.value().data))
            {
                std::optional<Declaration> const declaration = find_underlying_declaration(
                    declaration_database,
                    type_reference.value()
                );
                if (!declaration.has_value())
                    return std::nullopt;

                std::optional<Type_reference> const member_type = get_declaration_member_type(
                    declaration.value(),
                    data.member_name
                );
                if (member_type.has_value())
                    return member_type;

                std::optional<Declaration> const implicit_declaration = find_underlying_declaration(
                    declaration_database,
                    declaration->module_name,
                    data.member_name
                );
                if (!implicit_declaration.has_value())
                    return std::nullopt;

                if (std::holds_alternative<h::Function_declaration const*>(implicit_declaration->data))
                {
                    h::Function_declaration const& implicit_function_declaration = *std::get<h::Function_declaration const*>(implicit_declaration->data);
                    return create_function_type_type_reference(implicit_function_declaration.type, implicit_function_declaration.input_parameter_names, implicit_function_declaration.output_parameter_names);
                }

                return std::nullopt;
            }
            else if (std::holds_alternative<h::Type_instance>(type_reference.value().data))
            {
                Type_instance const& type_instance = std::get<h::Type_instance>(type_reference.value().data);
                Declaration_instance_storage const& storage = declaration_database.instances.at(type_instance);
                if (std::holds_alternative<h::Struct_declaration>(storage.data))
                {
                    Struct_declaration const& struct_declaration = std::get<h::Struct_declaration>(storage.data);
                    
                    auto const location = std::find_if(
                        struct_declaration.member_names.begin(),
                        struct_declaration.member_names.end(),
                        [&](std::pmr::string const& member_name) -> bool {
                            return member_name == data.member_name;
                        }
                    );
                    if (location != struct_declaration.member_names.end())
                    {
                        std::size_t const member_index = std::distance(struct_declaration.member_names.begin(), location);
                        return struct_declaration.member_types[member_index];
                    }
                    
                    // If member is not found, then try to find function in the module
                    h::Type_reference const& custom_type_reference = create_custom_type_reference(type_instance.type_constructor.module_reference.name, data.member_name);
                    std::optional<Declaration> const declaration = find_declaration(
                        declaration_database,
                        custom_type_reference
                    );
                    if (!declaration.has_value())
                        return std::nullopt;

                    return custom_type_reference;
                }
            }

            return std::nullopt; // TODO
        }
        else if (std::holds_alternative<h::Access_array_expression>(expression.data))
        {
            h::Access_array_expression const& data = std::get<h::Access_array_expression>(expression.data);

            std::optional<h::Type_reference> const lhs_type_reference = get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression.expression_index], std::nullopt, declaration_database);
            if (!lhs_type_reference.has_value())
                return std::nullopt;

            if (std::holds_alternative<h::Constant_array_type>(lhs_type_reference->data))
            {
                h::Constant_array_type const& array_type = std::get<h::Constant_array_type>(lhs_type_reference->data);
                if (array_type.value_type.empty())
                    return std::nullopt;

                return array_type.value_type[0];
            }

            return std::nullopt;
        }
        else if (std::holds_alternative<h::Binary_expression>(expression.data))
        {
            Binary_expression const& data = std::get<h::Binary_expression>(expression.data);

            switch (data.operation)
            {
                case h::Binary_operation::Equal:
                case h::Binary_operation::Not_equal:
                case h::Binary_operation::Less_than:
                case h::Binary_operation::Less_than_or_equal_to:
                case h::Binary_operation::Greater_than:
                case h::Binary_operation::Greater_than_or_equal_to:
                case h::Binary_operation::Logical_and:
                case h::Binary_operation::Logical_or:
                case h::Binary_operation::Has: {
                    return create_bool_type_reference();
                }
                case h::Binary_operation::Add:
                case h::Binary_operation::Subtract:
                case h::Binary_operation::Multiply:
                case h::Binary_operation::Divide:
                case h::Binary_operation::Modulus:
                case h::Binary_operation::Bitwise_and:
                case h::Binary_operation::Bitwise_or:
                case h::Binary_operation::Bitwise_xor:
                case h::Binary_operation::Bit_shift_left:
                case h::Binary_operation::Bit_shift_right:
                default: {
                    return get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.left_hand_side.expression_index], std::nullopt, declaration_database);
                }
            }
        }
        else if (std::holds_alternative<h::Call_expression>(expression.data))
        {
            Call_expression const& data = std::get<h::Call_expression>(expression.data);

            std::optional<h::Type_reference> const type_reference = get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression.expression_index], std::nullopt, declaration_database);
            if (!type_reference.has_value() || !std::holds_alternative<h::Function_pointer_type>(type_reference.value().data))
                return std::nullopt;

            h::Function_pointer_type const& function_pointer_type = std::get<h::Function_pointer_type>(type_reference.value().data);

            if (function_pointer_type.type.output_parameter_types.empty())
                return std::nullopt;

            return function_pointer_type.type.output_parameter_types[0];
        }
        else if (std::holds_alternative<h::Cast_expression>(expression.data))
        {
            Cast_expression const& data = std::get<h::Cast_expression>(expression.data);
            return data.destination_type;
        }
        else if (std::holds_alternative<h::Constant_expression>(expression.data))
        {
            Constant_expression const& data = std::get<h::Constant_expression>(expression.data);
            return data.type;
        }
        else if (std::holds_alternative<h::Constant_array_expression>(expression.data))
        {
            Constant_array_expression const& data = std::get<h::Constant_array_expression>(expression.data);
            if (data.array_data.empty())
            {
                if (expected_expression_type.has_value())
                    return expected_expression_type.value();

                // For empty array and no expected type, we assume it's an empty array of Int32:
                return create_constant_array_type_reference({create_integer_type_type_reference(32, true)}, data.array_data.size());
            }

            std::optional<h::Type_reference> const element_type = get_expression_type(core_module, nullptr, scope, data.array_data[0], std::nullopt, declaration_database);
            if (!element_type.has_value())
                return std::nullopt;

            return create_constant_array_type_reference({element_type.value()}, data.array_data.size());
        }
        else if (std::holds_alternative<h::Defer_expression>(expression.data))
        {
            Defer_expression const& data = std::get<h::Defer_expression>(expression.data);
            return get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression_to_defer.expression_index], std::nullopt, declaration_database);
        }
        else if (std::holds_alternative<h::Dereference_and_access_expression>(expression.data))
        {
            Dereference_and_access_expression const& data = std::get<h::Dereference_and_access_expression>(expression.data);

            std::optional<Type_reference> const left_side_type = get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression.expression_index], std::nullopt, declaration_database);
            if (!left_side_type.has_value() || !is_non_void_pointer(left_side_type.value()))
                return std::nullopt;

            std::optional<Type_reference> const left_side_value_type = remove_pointer(left_side_type.value());
            if (!left_side_value_type.has_value())
                return std::nullopt;

            std::optional<Declaration> const declaration = find_declaration(declaration_database, left_side_value_type.value());
            if (!declaration.has_value())
                return std::nullopt;

            std::optional<h::Type_reference> const member_type = get_declaration_member_type(
                declaration.value(),
                data.member_name
            );

            return member_type;
        }
        else if (std::holds_alternative<h::Instance_call_expression>(expression.data))
        {
            Instance_call_expression const& data = std::get<h::Instance_call_expression>(expression.data);

            std::optional<Custom_type_reference> custom_type_reference = get_function_constructor_type_reference(
                declaration_database,
                statement.expressions[data.left_hand_side.expression_index],
                statement,
                core_module.name
            );
            if (!custom_type_reference.has_value())
                return std::nullopt;

            Instance_call_key const key = {
                .module_name = custom_type_reference->module_reference.name,
                .function_constructor_name = custom_type_reference->name,
                .arguments = data.arguments
            };

            Function_expression const* const function_expression = get_instance_call_function_expression(
                declaration_database,
                key
            );
            if (function_expression == nullptr)
                return std::nullopt;

            return create_function_type_type_reference(function_expression->declaration.type, function_expression->declaration.input_parameter_names, function_expression->declaration.output_parameter_names);
        }
        else if (std::holds_alternative<h::Instantiate_expression>(expression.data))
        {
            h::Instantiate_expression const& instantiate_expression = std::get<h::Instantiate_expression>(expression.data);

            std::optional<h::Type_reference> const type_to_instantiate =
                expected_expression_type.has_value() ?
                expected_expression_type.value() :            
                get_type_to_instantiate(
                    core_module,
                    function_declaration,
                    scope,
                    statement,
                    expression,
                    instantiate_expression,
                    declaration_database
                );

            if (!type_to_instantiate.has_value())
                return std::nullopt;

            std::optional<Declaration> const declaration = find_underlying_declaration(
                declaration_database,
                type_to_instantiate.value()
            );
            if (!declaration.has_value())
                return std::nullopt;

            if (std::holds_alternative<h::Struct_declaration const*>(declaration->data) || std::holds_alternative<h::Union_declaration const*>(declaration->data))
                return type_to_instantiate.value();

            return std::nullopt;
        }
        else if (std::holds_alternative<h::Null_pointer_expression>(expression.data))
        {
            return create_null_pointer_type_type_reference();
        }
        else if (std::holds_alternative<h::Parenthesis_expression>(expression.data))
        {
            Parenthesis_expression const& data = std::get<h::Parenthesis_expression>(expression.data);
            return get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression.expression_index], std::nullopt, declaration_database);
        }
        else if (std::holds_alternative<h::Ternary_condition_expression>(expression.data))
        {
            Ternary_condition_expression const& data = std::get<h::Ternary_condition_expression>(expression.data);
            return get_expression_type(core_module, nullptr, scope, data.then_statement, std::nullopt, declaration_database);
        }
        else if (std::holds_alternative<h::Unary_expression>(expression.data))
        {
            Unary_expression const& data = std::get<h::Unary_expression>(expression.data);

            switch (data.operation)
            {
                case h::Unary_operation::Not:
                {
                    return create_bool_type_reference();
                }
                case h::Unary_operation::Bitwise_not:
                case h::Unary_operation::Minus:
                case h::Unary_operation::Pre_increment:
                case h::Unary_operation::Post_increment:
                case h::Unary_operation::Pre_decrement:
                case h::Unary_operation::Post_decrement:
                {
                    return get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression.expression_index], std::nullopt, declaration_database);
                }
                case h::Unary_operation::Indirection:
                {
                    std::optional<h::Type_reference> const expression_type = get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression.expression_index], std::nullopt, declaration_database);
                    if (!expression_type.has_value())
                        return std::nullopt;

                    if (is_pointer(expression_type.value()))
                    {
                        Pointer_type const& pointer_type = std::get<Pointer_type>(expression_type.value().data);
                        if (pointer_type.element_type.empty())
                            return std::nullopt;

                        return pointer_type.element_type[0];
                    }
                    else
                    {
                        return std::nullopt;
                    }
                }
                case h::Unary_operation::Address_of:
                {
                    std::optional<h::Type_reference> const expression_type = get_expression_type(core_module, nullptr, scope, statement, statement.expressions[data.expression.expression_index], std::nullopt, declaration_database);
                    if (!expression_type.has_value())
                        return create_pointer_type_type_reference({}, true);

                    return create_pointer_type_type_reference({expression_type.value()}, true);
                }
            }

            return std::nullopt;
        }
        else if (std::holds_alternative<h::Variable_expression>(expression.data))
        {
            Variable_expression const& data = std::get<h::Variable_expression>(expression.data);

            // Try variable:
            {
                auto const location = std::find_if(
                    scope.variables.begin(),
                    scope.variables.end(),
                    [&](Variable const& variable) -> bool {
                        return variable.name == data.name;
                    }
                );
                if (location != scope.variables.end())
                    return location->type;
            }

            // Try declarations:
            {
                std::optional<Declaration> const declaration_optional = find_declaration(
                    declaration_database,
                    core_module.name,
                    data.name
                );
                if (declaration_optional.has_value())
                {
                    if (std::holds_alternative<Global_variable_declaration const*>(declaration_optional->data))
                    {
                        Global_variable_declaration const& global_variable_declaration = *std::get<Global_variable_declaration const*>(declaration_optional->data);
                        if (global_variable_declaration.type.has_value())
                            return global_variable_declaration.type.value();
                    
                        return get_expression_type(core_module, nullptr, scope, global_variable_declaration.initial_value, std::nullopt, declaration_database);
                    }
                    else if (std::holds_alternative<Function_declaration const*>(declaration_optional->data))
                    {
                        Function_declaration const& function_declaration = *std::get<Function_declaration const*>(declaration_optional->data);
                        return create_function_type_type_reference(
                            function_declaration.type,
                            function_declaration.input_parameter_names,
                            function_declaration.output_parameter_names
                        );
                    }
                }
            }

            return std::nullopt;
        }
        else
        {
            return std::nullopt;
        }
    }

    std::optional<Custom_type_reference> get_function_constructor_type_reference_using_scope(
        Declaration_database const& declaration_database,
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        h::Expression const& expression
    )
    {
        std::optional<h::Type_reference> const expression_type = get_expression_type(
            core_module,
            nullptr,
            scope,
            statement,
            expression,
            std::nullopt,
            declaration_database
        );
        if (expression_type.has_value() && std::holds_alternative<h::Custom_type_reference>(expression_type.value().data))
        {
            return std::get<h::Custom_type_reference>(expression_type.value().data);
        }

        return get_function_constructor_type_reference(
            declaration_database,
            expression,
            statement,
            core_module.name
        );
    }

    std::optional<h::Type_reference> get_instance_call_implicit_first_argument(
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        h::Expression const& left_hand_side,
        h::Declaration_database const& declaration_database
    )
    {
        if (std::holds_alternative<h::Access_expression>(left_hand_side.data))
        {
            Access_expression const& data = std::get<h::Access_expression>(left_hand_side.data);
            std::optional<h::Type_reference> const type_reference = get_expression_type(
                core_module,
                nullptr,
                scope,
                statement,
                statement.expressions[data.expression.expression_index],
                std::nullopt,
                declaration_database
            );
            if (!type_reference.has_value())
                return std::nullopt;
            
            Type_reference pointer_type = create_pointer_type_type_reference({type_reference.value()}, true);
            return pointer_type;
        }

        return std::nullopt;
    }

    void deduce_type(
        h::Function_constructor const& function_constructor,
        h::Type_reference const& parameter_type,
        h::Type_reference const& argument_type,
        std::pmr::vector<std::optional<Type_reference>>& deduced_parameters
    )
    {
        if (std::holds_alternative<Parameter_type>(parameter_type.data))
        {
            Parameter_type const& value = std::get<Parameter_type>(parameter_type.data);

            auto const is_parameter = [&](h::Function_constructor_parameter const& parameter) -> bool {
                return parameter.name == value.name;
            };

            auto const location = std::find_if(function_constructor.parameters.begin(), function_constructor.parameters.end(), is_parameter);
            if (location == function_constructor.parameters.end())
                throw std::runtime_error{ std::format("Could not find parameter type '{}'", value.name) };
            
            std::size_t const parameter_index = std::distance(function_constructor.parameters.begin(), location);
            deduced_parameters[parameter_index] = argument_type;
        }
        else if (std::holds_alternative<Pointer_type>(parameter_type.data) && std::holds_alternative<Pointer_type>(argument_type.data))
        {
            Pointer_type const& parameter_pointer_type = std::get<Pointer_type>(parameter_type.data);
            Pointer_type const& argument_pointer_type = std::get<Pointer_type>(argument_type.data);
            if (!parameter_pointer_type.element_type.empty() && !argument_pointer_type.element_type.empty())
            {
                deduce_type(
                    function_constructor,
                    parameter_pointer_type.element_type[0],
                    argument_pointer_type.element_type[0],
                    deduced_parameters
                );
            }
        }
        else if (std::holds_alternative<Type_instance>(parameter_type.data) && std::holds_alternative<Type_instance>(argument_type.data))
        {
            Type_instance const& parameter_type_instance = std::get<Type_instance>(parameter_type.data);
            Type_instance const& argument_type_instance = std::get<Type_instance>(argument_type.data);

            if (parameter_type_instance.type_constructor.module_reference.name == argument_type_instance.type_constructor.module_reference.name)
            {
                for (std::size_t index = 0; index < parameter_type_instance.arguments.size(); ++index)
                {
                    Statement const& parameter_statement = parameter_type_instance.arguments[index];
                    Statement const& argument_statement = argument_type_instance.arguments[index];

                    if (parameter_statement.expressions.size() == argument_statement.expressions.size())
                    {
                        Expression const& parameter_expression = parameter_statement.expressions[0];
                        Expression const& argument_expression = argument_statement.expressions[0];

                        if (std::holds_alternative<Type_expression>(parameter_expression.data) && std::holds_alternative<Type_expression>(argument_expression.data))
                        {
                            Type_expression const& parameter_type_expression = std::get<Type_expression>(parameter_expression.data);
                            Type_expression const& argument_type_expression = std::get<Type_expression>(argument_expression.data);

                            deduce_type(
                                function_constructor,
                                parameter_type_expression.type,
                                argument_type_expression.type,
                                deduced_parameters
                            );
                        }
                    }
                }
            }
        }
        else if (parameter_type == argument_type)
        {

        }
    }

    std::optional<std::pmr::vector<Statement>> deduce_instance_call_arguments(
        h::Declaration_database& declaration_database,
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        h::Call_expression const& call_expression,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::Expression const& left_hand_side = statement.expressions[call_expression.expression.expression_index];

        std::optional<Custom_type_reference> const custom_type_reference = get_function_constructor_type_reference_using_scope(
            declaration_database,
            core_module,
            scope,
            statement,
            left_hand_side
        );
        if (!custom_type_reference.has_value())
            return std::nullopt;

        Function_constructor const* function_constructor = get_function_constructor(
            declaration_database,
            *custom_type_reference
        );
        if (function_constructor == nullptr)
            return std::nullopt;

        std::optional<h::Type_reference> const implicit_first_argument_type = get_instance_call_implicit_first_argument(
            core_module,
            scope,
            statement,
            left_hand_side,
            declaration_database
        );

        std::pmr::vector<Type_reference> argument_types{ temporaries_allocator };
        argument_types.resize(call_expression.arguments.size() + (implicit_first_argument_type.has_value() ? 1 : 0));

        if (implicit_first_argument_type.has_value())
            argument_types[0] = implicit_first_argument_type.value();

        for (std::size_t argument_index = 0; argument_index < call_expression.arguments.size(); ++argument_index)
        {
            h::Expression const& argument_expression = statement.expressions[call_expression.arguments[argument_index].expression_index];

            std::optional<h::Type_reference> argument_type = get_expression_type(
                core_module,
                nullptr,
                scope,
                statement,
                argument_expression,
                std::nullopt,
                declaration_database
            );
            if (!argument_type.has_value())
                throw std::runtime_error("Argument type is not valid.");

            std::size_t const output_argument_index = implicit_first_argument_type.has_value() ? argument_index + 1 : argument_index;
            argument_types[output_argument_index] = argument_type.value();
        }

        std::pmr::vector<Function_expression const*> const function_expressions = get_all_possible_function_expressions(
            *function_constructor,
            argument_types.size(),
            temporaries_allocator
        );

        std::pmr::vector<std::optional<Type_reference>> deduced_parameters;

        auto const has_value = [](std::optional<Type_reference> const& type) -> bool {
            return type.has_value();
        };

        for (Function_expression const* function_expression : function_expressions)
        {
            deduced_parameters.clear();
            deduced_parameters.resize(function_constructor->parameters.size());

            if (std::holds_alternative<h::Instance_call_expression>(left_hand_side.data))
            {
                h::Instance_call_expression const& instance_call_expression = std::get<h::Instance_call_expression>(left_hand_side.data);
                for (std::size_t index = 0; index < instance_call_expression.arguments.size(); ++index)
                {
                    h::Statement const& argument_statement = instance_call_expression.arguments[index];
                    if (argument_statement.expressions.size() == 1)
                    {
                        h::Expression const& argument_expression = argument_statement.expressions[0];
                        if (std::holds_alternative<h::Type_expression>(argument_expression.data))
                        {
                            h::Type_expression const& type_expression = std::get<h::Type_expression>(argument_expression.data);
                            deduced_parameters[index] = type_expression.type;
                        }
                    }
                }
            }

            for (std::size_t index = 0; index < function_expression->declaration.type.input_parameter_types.size(); ++index)
            {
                Type_reference const& parameter_type = function_expression->declaration.type.input_parameter_types[index];
                Type_reference const& argument_type = argument_types[index];
                
                deduce_type(
                    *function_constructor,
                    parameter_type,
                    argument_type,
                    deduced_parameters
                );

                if (std::all_of(deduced_parameters.begin(), deduced_parameters.end(), has_value))
                {
                    std::pmr::vector<Statement> const deduced_parameter_statements = create_statements_from_type_references(
                        deduced_parameters,
                        temporaries_allocator
                    );

                    Instance_call_key key = {
                        .module_name = custom_type_reference->module_reference.name,
                        .function_constructor_name = custom_type_reference->name,
                        .arguments = deduced_parameter_statements
                    };

                    Function_expression call_instance = create_instance_call_expression_value(
                        *function_constructor,
                        deduced_parameter_statements,
                        key
                    );

                    bool const success = true; // TODO for now we either succeed or throw exception. We should change this so that if it fails we continue trying.
                    if (success)
                    {
                        add_instantiated_type_instances(declaration_database, call_instance);
                        declaration_database.call_instances.emplace(std::move(key), std::move(call_instance));
                        return deduced_parameter_statements;
                    }
                    else
                    {
                        index = function_expression->declaration.type.input_parameter_types.size();
                    }
                }
            }
        }

        throw std::runtime_error("Could not deduce instance call arguments.");
    }

    std::pmr::vector<Function_expression const*> get_all_possible_function_expressions(
        Function_constructor const& function_constructor,
        std::size_t const argument_count,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        std::pmr::vector<Function_expression const*> output{ allocator };
        output.reserve(1);

        auto const process_expression = [&](Expression const& expression, Statement const& statement) -> bool {

            if (std::holds_alternative<Function_expression>(expression.data))
            {
                Function_expression const& function_expression = std::get<Function_expression>(expression.data);
                if (function_expression.declaration.type.input_parameter_types.size() == argument_count)
                    output.push_back(&function_expression);
            }

            return false;
        };

        visit_expressions(function_constructor.statements, process_expression);

        return output;
    }

    std::pmr::vector<Statement> create_statements_from_type_references(
        std::span<std::optional<Type_reference> const> const type_references,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        std::pmr::vector<Statement> statements{allocator};
        statements.reserve(type_references.size());

        for (std::optional<Type_reference> const& type_reference : type_references)
        {
            if (type_reference.has_value())
            {
                std::pmr::vector<Expression> expressions;
                expressions.push_back(
                    Expression
                    {
                        .data = Type_expression{ .type = type_reference.value() },
                        .source_range = std::nullopt
                    }
                );

                statements.push_back(
                    Statement
                    {
                        .expressions = std::move(expressions)
                    }
                );
            }
        }

        return statements;
    }

    std::optional<h::Type_reference> get_declaration_member_type(
        Declaration const& declaration,
        std::string_view const member_name
    )
    {
        if (std::holds_alternative<h::Enum_declaration const*>(declaration.data))
        {
            return h::create_integer_type_type_reference(32, true);
        }
        else if (std::holds_alternative<h::Struct_declaration const*>(declaration.data))
        {
            h::Struct_declaration const& struct_declaration = *std::get<h::Struct_declaration const*>(declaration.data);

            auto const location = std::find_if(
                struct_declaration.member_names.begin(),
                struct_declaration.member_names.end(),
                [&](std::pmr::string const& current_member_name) -> bool
                {
                    return current_member_name == member_name;
                }
            );
            if (location == struct_declaration.member_names.end())
                return std::nullopt;

            std::size_t const member_index = std::distance(struct_declaration.member_names.begin(), location);
            return struct_declaration.member_types[member_index];
        }
        else if (std::holds_alternative<h::Union_declaration const*>(declaration.data))
        {
            h::Union_declaration const& union_declaration = *std::get<h::Union_declaration const*>(declaration.data);
            
            auto const location = std::find_if(
                union_declaration.member_names.begin(),
                union_declaration.member_names.end(),
                [&](std::pmr::string const& current_member_name) -> bool
                {
                    return current_member_name == member_name;
                }
            );
            if (location == union_declaration.member_names.end())
                return std::nullopt;

            std::size_t const member_index = std::distance(union_declaration.member_names.begin(), location);
            return union_declaration.member_types[member_index];
        }
        else
        {
            return std::nullopt;
        }
    }
}
