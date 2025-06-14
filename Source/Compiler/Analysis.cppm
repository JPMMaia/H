module;

#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <vector>

export module h.compiler.analysis;

import h.core;
import h.core.declarations;

namespace h::compiler
{
    struct Variable
    {
        std::pmr::string name;
        h::Type_reference type;
    };

    struct Scope
    {
        std::pmr::vector<Variable> variables;
    };

    export void process_module(
        h::Module& core_module,
        h::Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_declarations(
        h::Module& core_module,
        Module_declarations& declarations,
        Module_definitions& definitions,
        h::Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_function(
        h::Module& core_module,
        h::Function_declaration& function_declaration,
        h::Function_definition& function_definition,
        h::Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_block(
        h::Module& core_module,
        Scope& scope,
        std::span<Statement> const statements,
        h::Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_statements(
        h::Module& core_module,
        Scope& scope,
        std::span<Statement> const statements,
        h::Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_statement(
        h::Module& core_module,
        Scope& scope,
        h::Statement& statement,
        h::Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    void process_expression(
        h::Module& core_module,
        Scope& scope,
        h::Statement& statement,
        h::Expression& expression,
        h::Declaration_database& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    std::optional<h::Type_reference> get_expression_type(
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        h::Expression const& expression,
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
