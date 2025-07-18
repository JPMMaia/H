module;

#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <vector>

export module h.compiler.analysis;

import h.core;
import h.core.declarations;
import h.compiler.diagnostic;

namespace h::compiler
{
    export struct Variable
    {
        std::pmr::string name;
        h::Type_reference type;
        bool is_compile_time;
    };

    export struct Scope
    {
        std::pmr::vector<Variable> variables;
    };

    export struct Analysis_result
    {
        std::pmr::vector<Diagnostic> diagnostics;
    };

    export struct Analysis_options
    {
        bool validate = true;
    };

    export Analysis_result process_module(
        h::Module& core_module,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_declarations(
        Analysis_result& result,
        h::Module& core_module,
        Module_declarations& declarations,
        Module_definitions& definitions,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_function(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration& function_declaration,
        h::Function_definition& function_definition,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_block(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration const* function_declaration,
        Scope& scope,
        std::span<Statement> const statements,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_statements(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration const* function_declaration,
        Scope& scope,
        std::span<Statement> const statements,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_statement(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration const* function_declaration,
        Scope& scope,
        h::Statement& statement,
        std::optional<h::Type_reference> const& expected_statement_type,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_expression(
        Analysis_result& result,
        h::Module& core_module,
        h::Function_declaration const* function_declaration,
        Scope& scope,
        h::Statement& statement,
        h::Expression& expression,
        h::Declaration_database& declaration_database,
        Analysis_options const& options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export std::optional<h::Type_reference> get_expression_type(
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        std::optional<h::Type_reference> const& expected_statement_type,
        h::Declaration_database const& declaration_database
    );

    export std::optional<h::Type_reference> get_expression_type(
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        h::Expression const& expression,
        std::optional<h::Type_reference> const& expected_expression_type,
        Declaration_database const& declaration_database
    );

    std::optional<std::pmr::vector<Statement>> deduce_instance_call_arguments(
        h::Declaration_database& declaration_database,
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        h::Call_expression const& call_expression,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    std::pmr::vector<Function_expression const*> get_all_possible_function_expressions(
        Function_constructor const& function_constructor,
        std::size_t const argument_count,
        std::pmr::polymorphic_allocator<> const& allocator
    );

    std::pmr::vector<Statement> create_statements_from_type_references(
        std::span<std::optional<Type_reference> const> const type_references,
        std::pmr::polymorphic_allocator<> const& allocator
    );
}
