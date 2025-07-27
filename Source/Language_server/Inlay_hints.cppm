module;

#include <memory_resource>
#include <vector>

#include <lsp/types.h>

export module h.language_server.inlay_hints;

import h.core;
import h.core.declarations;

namespace h::language_server
{
    export std::pmr::vector<lsp::InlayHint> create_function_inlay_hints(
        h::Module const& core_module,
        h::Function_declaration const& function_declaration,
        h::Function_definition const& function_definition,
        h::Declaration_database const& declaration_database,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    std::vector<lsp::InlayHintLabelPart> create_inlay_hint_variable_type_label(
        h::Module const& core_module,
        h::Declaration_database const& declaration_database,
        h::Type_reference const& type,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );
}
