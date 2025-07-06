module;

#include <cstddef>
#include <memory_resource>
#include <optional>
#include <span>
#include <vector>

export module h.compiler.validation;

import h.compiler.analysis;
import h.compiler.diagnostic;
import h.core;
import h.core.declarations;

namespace h::compiler
{
    export std::pmr::vector<h::compiler::Diagnostic> validate_statement(
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export struct Validate_expression_parameters
    {
        h::Module const& core_module;
        Scope const& scope;
        h::Statement const& statement;
        std::span<std::optional<h::Type_reference> const> expression_types;
        std::size_t expression_index;
        Declaration_database const& declaration_database;
        std::pmr::polymorphic_allocator<> const& temporaries_allocator;
    };

    export std::pmr::vector<h::compiler::Diagnostic> validate_expression(
        Validate_expression_parameters const& parameters
    );

    std::pmr::vector<h::compiler::Diagnostic> validate_access_expression(
        Validate_expression_parameters const& parameters,
        h::Access_expression const& expression,
        std::optional<h::Source_range> const& source_range
    );

    std::pmr::vector<h::compiler::Diagnostic> validate_binary_expression(
        Validate_expression_parameters const& parameters,
        h::Binary_expression const& expression,
        std::optional<h::Source_range> const& source_range
    );

    std::pmr::vector<h::compiler::Diagnostic> validate_variable_expression(
        Validate_expression_parameters const& parameters,
        h::Variable_expression const& expression,
        std::optional<h::Source_range> const& source_range
    );

    Import_module_with_alias const* find_import_module_with_alias(
        h::Module const& core_module,
        std::string_view const alias_name
    );

    Variable const* find_variable_from_scope(
        Scope const& scope,
        std::string_view const name
    );
}
