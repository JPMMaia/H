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
        std::optional<h::Type_reference> const& expected_statement_type,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export struct Validate_expression_parameters
    {
        h::Module const& core_module;
        Scope const& scope;
        h::Statement const& statement;
        std::optional<h::Type_reference> const& expected_statement_type;
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

    std::pmr::vector<h::compiler::Diagnostic> validate_call_expression(
        Validate_expression_parameters const& parameters,
        h::Call_expression const& expression,
        std::optional<h::Source_range> const& source_range
    );

    std::pmr::vector<h::compiler::Diagnostic> validate_instantiate_expression(
        Validate_expression_parameters const& parameters,
        h::Instantiate_expression const& expression,
        std::optional<h::Source_range> const& source_range
    );

    std::pmr::vector<h::compiler::Diagnostic> validate_unary_expression(
        Validate_expression_parameters const& parameters,
        h::Unary_expression const& expression,
        std::optional<h::Source_range> const& source_range
    );

    std::pmr::vector<h::compiler::Diagnostic> validate_variable_expression(
        Validate_expression_parameters const& parameters,
        h::Variable_expression const& expression,
        std::optional<h::Source_range> const& source_range
    );

    bool is_enum_type(
        Declaration_database const& declaration_database,
        Type_reference const& type
    );

    std::optional<h::Source_range> get_statement_source_range(
        h::Statement const& statement
    );

    std::optional<h::Source_range> create_sub_source_range(
        std::optional<h::Source_range> const& source_range,
        std::uint32_t const start_index,
        std::uint32_t const count
    );

    std::optional<h::Type_reference> get_type_to_instantiate(
        Validate_expression_parameters const& parameters,
        h::Instantiate_expression const& expression
    );

    struct Declaration_member_info
    {
        std::string_view member_name;
        h::Type_reference member_type;
    };

    std::pmr::vector<Declaration_member_info> get_declaration_member_infos(
        Declaration const& declaration,
        std::pmr::polymorphic_allocator<> const& output_allocator
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
