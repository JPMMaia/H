module;

#include <memory_resource>
#include <string>

export module h.parser.formatter;

import h.core;

namespace h::parser
{
    export struct Format_options
    {
        std::pmr::polymorphic_allocator<> const& output_allocator;
        std::pmr::polymorphic_allocator<> const& temporaries_allocator;
    };

    export std::pmr::string format_module(
        h::Module const& core_module,
        Format_options const& options
    );
}
