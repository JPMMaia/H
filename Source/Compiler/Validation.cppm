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

    export std::pmr::vector<h::compiler::Diagnostic> validate_expression(
        h::Module const& core_module,
        Scope const& scope,
        h::Statement const& statement,
        std::span<std::optional<h::Type_reference> const> const expression_types,
        std::size_t const expression_index,
        Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );
}
