module;

#include <memory_resource>
#include <string>
#include <string_view>

#include <lsp/types.h>

export module h.language_server.core;

import h.core;

namespace h::language_server
{
    export lsp::Position to_lsp_position(
        h::Source_position const& input
    );

    export lsp::Range to_lsp_range(
        h::Source_range const& input
    );

    export h::Source_position to_source_position(
        lsp::Position const& input
    );

    export h::Source_range to_source_range(
        lsp::Range const& input
    );

    export std::pmr::u8string convert_to_utf_8_string(
        std::string_view const& input,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );
}
