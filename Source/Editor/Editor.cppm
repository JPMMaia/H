module;

#include <cstdint>

export module h.editor;

import h.core;

namespace h::editor
{
    export void add_statement(
        h::Function& function,
        h::Statement statement,
        std::uint64_t position
    );

    export void remove_statement(
        h::Function& function,
        std::uint64_t position
    );
}
