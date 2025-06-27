module;

#include <lsp/types.h>

module h.language_server.core;

import h.core;

namespace h::language_server
{
    lsp::Position to_lsp_position(
        h::Source_position const& input
    )
    {
        return lsp::Position
        {
            .line = input.line - 1,
            .character = input.column - 1,
        };
    }

    lsp::Range to_lsp_range(
        h::Source_range const& input
    )
    {
        return lsp::Range
        {
            .start = to_lsp_position(input.start),
            .end = to_lsp_position(input.end),
        };
    }

    h::Source_position to_source_position(
        lsp::Position const& input
    )
    {
        return h::Source_position
        {
            .line = input.line + 1,
            .column = input.character + 1,
        };
    }

    h::Source_range to_source_range(
        lsp::Range const& input
    )
    {
        return h::Source_range
        {
            .start = to_source_position(input.start),
            .end = to_source_position(input.end),
        };
    }
}