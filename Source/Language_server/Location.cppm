module;

#include <optional>
#include <string_view>

#include <lsp/types.h>

export module h.language_server.location;

import h.core;
import h.core.declarations;

namespace h::language_server
{
    export std::optional<Declaration> find_declaration_that_contains_source_position(
        Declaration_database const& declaration_database,
        std::string_view const& module_name,
        h::Source_position const& source_position
    );

    export std::optional<h::Function> find_function_that_contains_source_position(
        h::Module const& core_module,
        h::Source_position const& source_position
    );

    export std::optional<h::Type_reference> find_type_that_contains_source_position(
        h::Type_reference const& type,
        h::Source_position const& source_position
    );

    export std::optional<Declaration> find_value_declaration_using_expression(
        Declaration_database const& declaration_database,
        h::Module const& core_module,
        h::Statement const& statement,
        h::Expression const& expression
    );

    export h::Enum_declaration const* find_enum_declaration_using_expression(
        Declaration_database const& declaration_database,
        h::Module const& core_module,
        h::Statement const& statement,
        h::Expression const& expression
    );
}
